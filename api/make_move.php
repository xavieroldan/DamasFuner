<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

/**
 * Calculate captured pieces by comparing old and new board states
 * @param array $oldBoard Previous board state
 * @param array $newBoard New board state
 * @param int $playerNumber Player who made the move (1 or 2)
 * @return array Array of captured pieces with row, col, and piece info
 */
function calculateCaptures($oldBoard, $newBoard, $playerNumber) {
    $capturedPieces = [];
    $enemyPlayer = $playerNumber === 1 ? 2 : 1;
    
    // Compare each position to find missing pieces
    for ($row = 0; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            $oldPiece = $oldBoard[$row][$col];
            $newPiece = $newBoard[$row][$col];
            
            // If there was an enemy piece before and it's gone now, it was captured
            if ($oldPiece && $oldPiece['player'] == $enemyPlayer && !$newPiece) {
                $capturedPieces[] = [
                    'row' => $row,
                    'col' => $col,
                    'piece' => $oldPiece['isQueen'] ? 'queen' : 'pawn',
                    'player' => $enemyPlayer
                ];
                error_log("Captured piece at ($row, $col): " . ($oldPiece['isQueen'] ? 'queen' : 'pawn'));
            }
        }
    }
    
    return $capturedPieces;
}

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
$debugMode = isset($input['debug']) ? (bool)$input['debug'] : false;

try {
    $conn = getDBConnection();
    
    // Obtener el estado actual del juego
    $game = fetchOne("SELECT board_state, current_player FROM games WHERE id = ?", [$gameId]);
    if (!$game) {
        throw new Exception('Game not found');
    }
    
    $board = json_decode($game['board_state'], true);
    $currentPlayer = $game['current_player'];
    
    // Obtener el número del jugador (1 o 2) basado en su ID
    $player = fetchOne("SELECT player_number FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    if (!$player) {
        echo json_encode(['valid' => false, 'message' => 'Jugador no encontrado']);
        exit;
    }
    
    $playerNumber = $player['player_number'];
    
    // Verificar que es el turno del jugador (CRÍTICO para juegos online)
    // Skip turn validation in debug mode
    if (!$debugMode && $currentPlayer !== $playerNumber) {
        echo json_encode(['success' => false, 'message' => 'No es tu turno']);
        exit;
    }
    
    $fromRow = $from['row'];
    $fromCol = $from['col'];
    $toRow = $to['row'];
    $toCol = $to['col'];
    
    // NO VALIDAR NADA - El cliente maneja todas las reglas del juego
    // Solo verificar que las coordenadas están en el tablero (skip in debug mode)
    if (!$debugMode && ($fromRow < 0 || $fromRow >= 8 || $fromCol < 0 || $fromCol >= 8 ||
        $toRow < 0 || $toRow >= 8 || $toCol < 0 || $toCol >= 8)) {
        echo json_encode(['valid' => false, 'message' => 'Coordenadas fuera del tablero']);
        exit;
    }
    
    $piece = $board[$fromRow][$fromCol];
    $newBoard = $board;
    
    // SERVIDOR CALCULA CAPTURAS - ÚNICA FUENTE DE VERDAD
    $capturedPieces = [];
    $captureCount = 0;
    
    // Si el cliente envía el tablero completo, usarlo directamente
    if (isset($input['board_state'])) {
        $newBoard = $input['board_state'];
        error_log("Using complete board state from client");
        
        // Calcular capturas comparando el tablero anterior con el nuevo
        $capturedPieces = calculateCaptures($board, $newBoard, $playerNumber);
        $captureCount = count($capturedPieces);
        error_log("Server calculated captures: " . $captureCount . " pieces");
    } else {
        // Fallback: procesar movimiento básico (para compatibilidad)
        $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
        $newBoard[$fromRow][$fromCol] = null;
        error_log("Using fallback movement processing");
        
        // Calcular capturas para movimiento básico
        $capturedPieces = calculateCaptures($board, $newBoard, $playerNumber);
        $captureCount = count($capturedPieces);
    }
    
    // SERVIDOR CALCULA TOTALES DE CAPTURAS - ÚNICA FUENTE DE VERDAD
    // Obtener capturas actuales de la base de datos
    $currentGame = fetchOne("SELECT captured_pieces_black, captured_pieces_white FROM games WHERE id = ?", [$gameId]);
    $totalCapturedBlack = (int)($currentGame['captured_pieces_black'] ?? 0);
    $totalCapturedWhite = (int)($currentGame['captured_pieces_white'] ?? 0);
    
    // Actualizar totales con las capturas calculadas por el servidor
    if ($captureCount > 0) {
        if ($playerNumber === 1) {
            // Jugador 1 (blancas) capturó piezas del jugador 2 (negras)
            $totalCapturedWhite += $captureCount;
        } else {
            // Jugador 2 (negras) capturó piezas del jugador 1 (blancas)
            $totalCapturedBlack += $captureCount;
        }
    }
    
    error_log("Server calculated total captures - Black: $totalCapturedBlack, White: $totalCapturedWhite");
    
    // Determinar el siguiente jugador (cambiar de 1 a 2 o viceversa)
    // En modo debug, mantener el turno actual
    $nextPlayer = $debugMode ? $currentPlayer : ($playerNumber === 1 ? 2 : 1);
    
    // Actualizar base de datos (tablero, turno y capturas)
    $stmt = $conn->prepare("UPDATE games SET board_state = ?, captured_pieces_black = ?, captured_pieces_white = ?, current_player = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([json_encode($newBoard), $totalCapturedBlack, $totalCapturedWhite, $nextPlayer, $gameId]);
    
    // Registrar el movimiento (sin capturas - el cliente maneja las reglas)
    $stmt = $conn->prepare("INSERT INTO moves (game_id, player_id, from_row, from_col, to_row, to_col, move_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$gameId, $playerId, $fromRow, $fromCol, $toRow, $toCol, 'move']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Movimiento realizado exitosamente',
        'board_state' => $newBoard,
        'captured_pieces' => $capturedPieces,
        'capture_count' => $captureCount,
        'current_player' => $nextPlayer,
        'game_data' => [
            'board' => $newBoard,
            'current_player' => $nextPlayer,
            'captured_pieces' => [
                'black' => $totalCapturedBlack,
                'white' => $totalCapturedWhite
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in make_move: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>
