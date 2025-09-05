<?php
/**
 * API para realizar un movimiento en el juego
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_id']) || !isset($input['player_id']) || 
        !isset($input['from']) || !isset($input['to'])) {
        throw new Exception('Datos de movimiento requeridos');
    }
    
    $gameId = (int)$input['game_id'];
    $playerId = (int)$input['player_id'];
    $from = $input['from'];
    $to = $input['to'];
    
    // Validar coordenadas
    if (!isValidPosition($from['row'], $from['col']) || 
        !isValidPosition($to['row'], $to['col'])) {
        throw new Exception('Coordenadas inválidas');
    }
    
    // Get game information
    $game = fetchOne("SELECT * FROM games WHERE id = ? AND game_status = 'playing'", [$gameId]);
    if (!$game) {
        throw new Exception('Partida no encontrada o no está en juego');
    }
    
    // Verificar que es el turno del jugador
    if ($game['current_player'] != getPlayerNumber($playerId, $gameId)) {
        throw new Exception('No es tu turno');
    }
    
    // Obtener el estado actual del tablero
    $board = json_decode($game['board_state'], true);
    if (!$board) {
        throw new Exception('Estado del tablero inválido');
    }
    
    // Validar y realizar el movimiento
    $moveResult = validateAndMakeMove($board, $from, $to, $playerId, $gameId);
    
    if (!$moveResult['valid']) {
        throw new Exception($moveResult['message']);
    }
    
    // Actualizar la base de datos
    $conn = getDBConnection();
    $conn->beginTransaction();
    
    try {
        // Actualizar el estado del tablero
        error_log("=== UPDATING CAPTURE COUNTERS ===");
        error_log("Game ID: " . $gameId);
        error_log("Captured Black: " . $moveResult['captured_black']);
        error_log("Captured White: " . $moveResult['captured_white']);
        error_log("Next Player: " . $moveResult['next_player']);
        
        $sql = "UPDATE games SET board_state = ?, current_player = ?, 
                captured_pieces_black = ?, captured_pieces_white = ?,
                updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            json_encode($moveResult['new_board']),
            $moveResult['next_player'],
            $moveResult['captured_black'],
            $moveResult['captured_white'],
            $gameId
        ]);
        
        // Registrar el movimiento
        $sql = "INSERT INTO moves (game_id, player_id, from_row, from_col, to_row, to_col, 
                captured_row, captured_col, move_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            $gameId, $playerId, $from['row'], $from['col'], $to['row'], $to['col'],
            $moveResult['captured_row'], $moveResult['captured_col'], $moveResult['move_type']
        ]);
        
        // Verificar si el juego ha terminado
        $gameEnded = checkGameEnd($moveResult['new_board']);
        if ($gameEnded['ended']) {
            $sql = "UPDATE games SET game_status = 'finished', winner = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$gameEnded['winner'], $gameId]);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Movimiento realizado exitosamente',
            'game_ended' => $gameEnded['ended'],
            'winner' => $gameEnded['winner'] ?? null
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Valida y realiza un movimiento en el tablero
 */
function validateAndMakeMove($board, $from, $to, $playerId, $gameId) {
    $fromRow = $from['row'];
    $fromCol = $from['col'];
    $toRow = $to['row'];
    $toCol = $to['col'];
    
    // Verify there is a piece at the source position
    if (!$board[$fromRow][$fromCol]) {
        return ['valid' => false, 'message' => 'No hay pieza en la posición de origen'];
    }
    
    $piece = $board[$fromRow][$fromCol];
    $playerNumber = getPlayerNumber($playerId, $gameId);
    
    // Verificar que la pieza pertenece al jugador
    if ($piece['player'] !== $playerNumber) {
        return ['valid' => false, 'message' => 'La pieza no te pertenece'];
    }
    
    // Verify that the destination position is empty
    if ($board[$toRow][$toCol]) {
        return ['valid' => false, 'message' => 'La posición de destino está ocupada'];
    }
    
    // Validación básica: solo verificar que es un movimiento diagonal
    $rowDiff = abs($toRow - $fromRow);
    $colDiff = abs($toCol - $fromCol);
    
    // El cliente maneja toda la lógica del juego, el servidor solo valida diagonalidad básica
    if ($rowDiff !== $colDiff) {
        error_log("Not diagonal movement: rowDiff=$rowDiff, colDiff=$colDiff");
        return ['valid' => false, 'message' => 'Solo se permiten movimientos diagonales'];
    }
    
    // Si es un movimiento de más de 1 casilla, asumir que es una captura múltiple
    if ($rowDiff > 1) {
        error_log("Multiple capture detected: from ($fromRow, $fromCol) to ($toRow, $toCol)");
        
        // El cliente ya validó la secuencia, solo procesamos el resultado
        return processMultipleCaptureFromClient($board, $fromRow, $fromCol, $toRow, $toCol, $piece, $gameId);
    }
    
    // Verify movement direction for normal pieces
    if (!$piece['isKing']) {
        if ($piece['player'] === 1 && $toRow >= $fromRow) {
            return ['valid' => false, 'message' => 'Las piezas blancas solo pueden moverse hacia arriba'];
        }
        if ($piece['player'] === 2 && $toRow <= $fromRow) {
            return ['valid' => false, 'message' => 'Las piezas negras solo pueden moverse hacia abajo'];
        }
    }
    
    // Crear una copia del tablero para el nuevo estado
    $newBoard = $board;
    $capturedRow = null;
    $capturedCol = null;
    $moveType = 'move';
    
    // Obtener contadores actuales de capturas (persisten durante toda la partida)
    $game = fetchOne("SELECT captured_pieces_black, captured_pieces_white FROM games WHERE id = ?", [$gameId]);
    $capturedBlack = $game['captured_pieces_black'] ?? 0;
    $capturedWhite = $game['captured_pieces_white'] ?? 0;
    
    // Verificar si es una captura
    if ($rowDiff === 2) {
        $middleRow = ($fromRow + $toRow) / 2;
        $middleCol = ($fromCol + $toCol) / 2;
        
        if ($board[$middleRow][$middleCol] && 
            $board[$middleRow][$middleCol]['player'] !== $piece['player']) {
            
            // It is a valid capture
            $newBoard[$middleRow][$middleCol] = null;
            $capturedRow = $middleRow;
            $capturedCol = $middleCol;
            $moveType = 'capture';
            
            // Actualizar contador de piezas capturadas
            if ($piece['player'] === 1) {
                $capturedWhite++;
                error_log("Player 1 (whites) captured a piece. New count: " . $capturedWhite);
            } else {
                $capturedBlack++;
                error_log("Player 2 (blacks) captured a piece. New count: " . $capturedBlack);
            }
        } else {
            return ['valid' => false, 'message' => 'Movimiento de captura inválido'];
        }
    } else if ($rowDiff !== 1) {
        return ['valid' => false, 'message' => 'Movimiento inválido'];
    }
    
    // Mover la pieza
    $newBoard[$toRow][$toCol] = $piece;
    $newBoard[$fromRow][$fromCol] = null;
    
    // Verify promotion to king
    if (!$piece['isKing']) {
        if (($piece['player'] === 1 && $toRow === 7) || 
            ($piece['player'] === 2 && $toRow === 0)) {
            $newBoard[$toRow][$toCol]['isKing'] = true;
            $moveType = 'king_promotion';
        }
    }
    
    // Determinar el siguiente jugador
    $nextPlayer = $piece['player'] === 1 ? 2 : 1;
    
    return [
        'valid' => true,
        'new_board' => $newBoard,
        'next_player' => $nextPlayer,
        'captured_row' => $capturedRow,
        'captured_col' => $capturedCol,
        'move_type' => $moveType,
        'captured_black' => $capturedBlack,
        'captured_white' => $capturedWhite
    ];
}

/**
 * Verifica si el juego ha terminado
 */
function checkGameEnd($board) {
    $blackPieces = 0;
    $whitePieces = 0;
    
    for ($row = 0; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if ($board[$row][$col]) {
                if ($board[$row][$col]['player'] === 1) {
                    $blackPieces++;
                } else {
                    $whitePieces++;
                }
            }
        }
    }
    
    if ($blackPieces === 0) {
        return ['ended' => true, 'winner' => 2];
    } else if ($whitePieces === 0) {
        return ['ended' => true, 'winner' => 1];
    }
    
    return ['ended' => false];
}

/**
 * Gets the player number (1 or 2) based on the ID
 */
function getPlayerNumber($playerId, $gameId) {
    $player = fetchOne("SELECT player_number FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    return $player ? $player['player_number'] : null;
}

/**
 * Validates that a position is within the board
 */
function isValidPosition($row, $col) {
    return $row >= 0 && $row < 8 && $col >= 0 && $col < 8;
}

/**
 * Validates a multiple capture sequence (same logic as client)
 */
function isValidMultipleCapture($board, $fromRow, $fromCol, $toRow, $toCol, $piece) {
    error_log("=== VALIDATE MULTIPLE CAPTURE DEBUG ===");
    error_log("From: ($fromRow, $fromCol) To: ($toRow, $toCol)");
    error_log("Piece: " . json_encode($piece));
    
    if (!$piece) {
        error_log("No piece at source");
        return false;
    }

    // Use the same logic as client's findCaptureSequences
    $captureSequences = findCaptureSequences($board, $fromRow, $fromCol, $piece, []);
    error_log("Found " . count($captureSequences) . " capture sequences");
    
    // Check if any sequence ends at the target position
    foreach ($captureSequences as $sequence) {
        if (!empty($sequence)) {
            $lastCapture = end($sequence);
            if ($lastCapture['row'] == $toRow && $lastCapture['col'] == $toCol) {
                error_log("Valid multiple capture sequence found");
                return true;
            }
        }
    }

    error_log("No valid capture sequence found");
    error_log("=== END VALIDATE MULTIPLE CAPTURE DEBUG ===");
    
    return false;
}

/**
 * Find capture sequences (same logic as client)
 */
function findCaptureSequences($board, $row, $col, $piece, $capturedPieces) {
    $sequences = [];
    $directions = $piece['isKing'] ? 
        [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
        ($piece['player'] === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

    foreach ($directions as $direction) {
        $dr = $direction[0];
        $dc = $direction[1];
        $newRow = $row + $dr;
        $newCol = $col + $dc;

        // Check if there's an enemy piece to capture
        if (isValidPosition($newRow, $newCol) && 
            $board[$newRow][$newCol] && 
            $board[$newRow][$newCol]['player'] !== $piece['player']) {
            
            $jumpRow = $newRow + $dr;
            $jumpCol = $newCol + $dc;
            
            if (isValidPosition($jumpRow, $jumpCol) && !$board[$jumpRow][$jumpCol]) {
                // Simulate the capture
                $simulatedBoard = simulateCapture($board, $row, $col, $newRow, $newCol, $jumpRow, $jumpCol);
                
                // Create current capture
                $currentCapture = [
                    'row' => $jumpRow,
                    'col' => $jumpCol,
                    'capturedRow' => $newRow,
                    'capturedCol' => $newCol,
                    'pieceType' => $piece['isKing'] ? 'dama' : 'peon'
                ];
                
                // Check if can make more captures from new position
                $moreCaptures = findCaptureSequences($simulatedBoard, $jumpRow, $jumpCol, $piece, array_merge($capturedPieces, [$currentCapture]));
                
                if (!empty($moreCaptures)) {
                    // Add all sequences that continue from here
                    foreach ($moreCaptures as $sequence) {
                        $sequences[] = array_merge([$currentCapture], $sequence);
                    }
                } else {
                    // This is a simple capture
                    $sequences[] = [$currentCapture];
                }
            }
        }
    }

    return $sequences;
}

/**
 * Simulate a capture (same logic as client)
 */
function simulateCapture($board, $fromRow, $fromCol, $capturedRow, $capturedCol, $toRow, $toCol) {
    $newBoard = [];
    foreach ($board as $row => $rowData) {
        $newBoard[$row] = [];
        foreach ($rowData as $col => $cell) {
            $newBoard[$row][$col] = $cell ? array_merge($cell) : null;
        }
    }
    
    // Move piece
    $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
    $newBoard[$fromRow][$fromCol] = null;
    
    // Remove captured piece
    $newBoard[$capturedRow][$capturedCol] = null;
    
    return $newBoard;
}

/**
 * Processes a multiple capture move
 */
function processMultipleCaptureFromClient($board, $fromRow, $fromCol, $toRow, $toCol, $piece, $gameId) {
    // El cliente ya validó la secuencia, solo procesamos el movimiento final
    $newBoard = $board;
    
    // Mover la pieza a la posición final
    $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
    $newBoard[$fromRow][$fromCol] = null;
    
    // Calcular las piezas capturadas en el camino
    $capturedPieces = [];
    $rowStep = $toRow > $fromRow ? 1 : -1;
    $colStep = $toCol > $fromCol ? 1 : -1;
    
    $currentRow = $fromRow + $rowStep;
    $currentCol = $fromCol + $colStep;
    
    while ($currentRow !== $toRow && $currentCol !== $toCol) {
        if ($newBoard[$currentRow][$currentCol]) {
            $capturedPieces[] = [
                'captured_row' => $currentRow,
                'captured_col' => $currentCol
            ];
            $newBoard[$currentRow][$currentCol] = null;
        }
        $currentRow += $rowStep;
        $currentCol += $colStep;
    }
    
    // Actualizar contadores de piezas capturadas
    $totalCapturedBlack = 0;
    $totalCapturedWhite = 0;
    
    foreach ($capturedPieces as $captured) {
        if ($board[$captured['captured_row']][$captured['captured_col']]['player'] === 1) {
            $totalCapturedWhite++;
        } else {
            $totalCapturedBlack++;
        }
    }
    
    // Verificar promoción a rey
    if (!$piece['isKing']) {
        if (($piece['player'] === 1 && $toRow === 0) || ($piece['player'] === 2 && $toRow === 7)) {
            $newBoard[$toRow][$toCol]['isKing'] = true;
        }
    }
    
    // Actualizar base de datos
    $stmt = $conn->prepare("UPDATE games SET board_state = ?, captured_pieces_black = captured_pieces_black + ?, captured_pieces_white = captured_pieces_white + ?, current_player = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([json_encode($newBoard), $totalCapturedBlack, $totalCapturedWhite, $piece['player'], $gameId]);
    
    // Registrar el movimiento
    $stmt = $conn->prepare("INSERT INTO moves (game_id, player_id, from_row, from_col, to_row, to_col, captured_row, captured_col, move_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$gameId, $piece['player'], $fromRow, $fromCol, $toRow, $toCol, 
                   !empty($capturedPieces) ? $capturedPieces[0]['captured_row'] : null,
                   !empty($capturedPieces) ? $capturedPieces[0]['captured_col'] : null,
                   'capture']);
    
    return [
        'valid' => true,
        'new_board' => $newBoard,
        'captured_row' => !empty($capturedPieces) ? $capturedPieces[0]['captured_row'] : null,
        'captured_col' => !empty($capturedPieces) ? $capturedPieces[0]['captured_col'] : null,
        'move_type' => 'capture',
        'captured_black' => $totalCapturedBlack,
        'captured_white' => $totalCapturedWhite,
        'next_player' => $piece['player']
    ];
}

function processMultipleCapture($board, $fromRow, $fromCol, $toRow, $toCol, $piece, $captureSequence, $gameId) {
    // Crear una copia del tablero
    $newBoard = $board;
    
    // Mover la pieza a la posición final
    $newBoard[$toRow][$toCol] = $piece;
    $newBoard[$fromRow][$fromCol] = null;
    
    // Eliminar todas las piezas capturadas
    $capturedBlack = 0;
    $capturedWhite = 0;
    
    foreach ($captureSequence as $capture) {
        $capturedPiece = $newBoard[$capture['captured_row']][$capture['captured_col']];
        $newBoard[$capture['captured_row']][$capture['captured_col']] = null;
        
        if ($capturedPiece['player'] === 1) {
            $capturedWhite++;
        } else {
            $capturedBlack++;
        }
    }
    
    // Obtener contadores actuales de capturas
    $game = fetchOne("SELECT captured_pieces_black, captured_pieces_white FROM games WHERE id = ?", [$gameId]);
    $totalCapturedBlack = $game['captured_pieces_black'] + $capturedBlack;
    $totalCapturedWhite = $game['captured_pieces_white'] + $capturedWhite;
    
    // Verificar si la pieza debe ser promovida a rey
    if (!$piece['isKing']) {
        if (($piece['player'] === 1 && $toRow === 7) || ($piece['player'] === 2 && $toRow === 0)) {
            $newBoard[$toRow][$toCol]['isKing'] = true;
        }
    }
    
    // Determinar el siguiente jugador
    $nextPlayer = $piece['player'] === 1 ? 2 : 1;
    
    return [
        'valid' => true,
        'new_board' => $newBoard,
        'captured_row' => $captureSequence[0]['captured_row'],
        'captured_col' => $captureSequence[0]['captured_col'],
        'move_type' => 'capture',
        'captured_black' => $totalCapturedBlack,
        'captured_white' => $totalCapturedWhite,
        'next_player' => $nextPlayer
    ];
}
?>
