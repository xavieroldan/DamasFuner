<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['from']) || !isset($input['to']) || !isset($input['player_id']) || !isset($input['game_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

$from = $input['from'];
$to = $input['to'];
$playerId = $input['player_id'];
$gameId = $input['game_id'];

try {
    $conn = getDBConnection();
    
    // Obtener el estado actual del juego
    $game = fetchOne("SELECT board_state, current_player FROM games WHERE id = ?", [$gameId]);
    if (!$game) {
        throw new Exception('Game not found');
    }
    
    $board = json_decode($game['board_state'], true);
    $currentPlayer = $game['current_player'];
    
    // Verificar que es el turno del jugador
    if ($currentPlayer !== $playerId) {
        echo json_encode(['valid' => false, 'message' => 'No es tu turno']);
        exit;
    }
    
    $fromRow = $from['row'];
    $fromCol = $from['col'];
    $toRow = $to['row'];
    $toCol = $to['col'];
    
    // Verificar que la pieza existe y pertenece al jugador
    if (!$board[$fromRow][$fromCol] || $board[$fromRow][$fromCol]['player'] !== $playerId) {
        echo json_encode(['valid' => false, 'message' => 'Pieza inválida']);
        exit;
    }
    
    // Verificar que la posición de destino está vacía
    if ($board[$toRow][$toCol]) {
        echo json_encode(['valid' => false, 'message' => 'La posición de destino está ocupada']);
        exit;
    }
    
    // Validación básica: solo verificar que es un movimiento diagonal
    $rowDiff = abs($toRow - $fromRow);
    $colDiff = abs($toCol - $fromCol);
    
    if ($rowDiff !== $colDiff) {
        echo json_encode(['valid' => false, 'message' => 'Solo se permiten movimientos diagonales']);
        exit;
    }
    
    $piece = $board[$fromRow][$fromCol];
    $newBoard = $board;
    
    // Mover la pieza
    $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
    $newBoard[$fromRow][$fromCol] = null;
    
    // Si es un movimiento de más de 1 casilla, procesar capturas
    $capturedPieces = [];
    if ($rowDiff > 1) {
        $rowStep = $toRow > $fromRow ? 1 : -1;
        $colStep = $toCol > $fromCol ? 1 : -1;
        
        $currentRow = $fromRow + $rowStep;
        $currentCol = $fromCol + $colStep;
        
        while ($currentRow !== $toRow && $currentCol !== $toCol) {
            if ($board[$currentRow][$currentCol]) {
                $capturedPieces[] = [
                    'captured_row' => $currentRow,
                    'captured_col' => $currentCol
                ];
                $newBoard[$currentRow][$currentCol] = null;
            }
            $currentRow += $rowStep;
            $currentCol += $colStep;
        }
    }
    
    // Verificar promoción a rey
    if (!$piece['isKing']) {
        if (($piece['player'] === 1 && $toRow === 0) || ($piece['player'] === 2 && $toRow === 7)) {
            $newBoard[$toRow][$toCol]['isKing'] = true;
        }
    }
    
    // Calcular piezas capturadas
    $capturedBlack = 0;
    $capturedWhite = 0;
    
    foreach ($capturedPieces as $captured) {
        if ($board[$captured['captured_row']][$captured['captured_col']]['player'] === 1) {
            $capturedWhite++;
        } else {
            $capturedBlack++;
        }
    }
    
    // Actualizar base de datos
    $stmt = $conn->prepare("UPDATE games SET board_state = ?, captured_pieces_black = captured_pieces_black + ?, captured_pieces_white = captured_pieces_white + ?, current_player = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([json_encode($newBoard), $capturedBlack, $capturedWhite, $playerId, $gameId]);
    
    // Registrar el movimiento
    $stmt = $conn->prepare("INSERT INTO moves (game_id, player_id, from_row, from_col, to_row, to_col, captured_row, captured_col, move_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$gameId, $playerId, $fromRow, $fromCol, $toRow, $toCol, 
                   !empty($capturedPieces) ? $capturedPieces[0]['captured_row'] : null,
                   !empty($capturedPieces) ? $capturedPieces[0]['captured_col'] : null,
                   !empty($capturedPieces) ? 'capture' : 'move']);
    
    echo json_encode([
        'valid' => true,
        'new_board' => $newBoard,
        'captured_row' => !empty($capturedPieces) ? $capturedPieces[0]['captured_row'] : null,
        'captured_col' => !empty($capturedPieces) ? $capturedPieces[0]['captured_col'] : null,
        'move_type' => !empty($capturedPieces) ? 'capture' : 'move',
        'captured_black' => $capturedBlack,
        'captured_white' => $capturedWhite,
        'next_player' => $playerId
    ]);
    
} catch (Exception $e) {
    error_log("Error in make_move: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>


