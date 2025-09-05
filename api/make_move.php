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
    
    // Obtener el número del jugador (1 o 2) basado en su ID
    $player = fetchOne("SELECT player_number FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    if (!$player) {
        echo json_encode(['valid' => false, 'message' => 'Jugador no encontrado']);
        exit;
    }
    
    $playerNumber = $player['player_number'];
    
    // Verificar que es el turno del jugador (CRÍTICO para juegos online)
    if ($currentPlayer !== $playerNumber) {
        echo json_encode(['success' => false, 'message' => 'No es tu turno']);
        exit;
    }
    
    $fromRow = $from['row'];
    $fromCol = $from['col'];
    $toRow = $to['row'];
    $toCol = $to['col'];
    
    // NO VALIDAR NADA - El cliente maneja todas las reglas del juego
    // Solo verificar que las coordenadas están en el tablero
    if ($fromRow < 0 || $fromRow >= 8 || $fromCol < 0 || $fromCol >= 8 ||
        $toRow < 0 || $toRow >= 8 || $toCol < 0 || $toCol >= 8) {
        echo json_encode(['valid' => false, 'message' => 'Coordenadas fuera del tablero']);
        exit;
    }
    
    $piece = $board[$fromRow][$fromCol];
    $newBoard = $board;
    
    // Mover la pieza
    $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
    $newBoard[$fromRow][$fromCol] = null;
    
    // Procesar capturas enviadas por el cliente
    $capturedPieces = isset($input['captured_pieces']) ? $input['captured_pieces'] : [];
    $capturedBlack = 0;
    $capturedWhite = 0;
    
    // Procesar cada captura enviada por el cliente
    foreach ($capturedPieces as $captured) {
        if (isset($captured['row']) && isset($captured['col']) && isset($captured['player'])) {
            $capturedRow = $captured['row'];
            $capturedCol = $captured['col'];
            $capturedPlayer = $captured['player'];
            
            // Eliminar la pieza capturada del tablero
            if ($capturedRow >= 0 && $capturedRow < 8 && $capturedCol >= 0 && $capturedCol < 8) {
                $newBoard[$capturedRow][$capturedCol] = null;
                
                // Asignar capturas al jugador que las realiza (no al que las recibe)
                // Si el jugador actual es 1 (blancas), suma a blancas
                // Si el jugador actual es 2 (negras), suma a negras
                if ($playerNumber === 1) {
                    $capturedWhite++;
                } else {
                    $capturedBlack++;
                }
            }
        }
    }
    
    // Verificar promoción a rey
    if (!$piece['isKing']) {
        if (($piece['player'] === 1 && $toRow === 0) || ($piece['player'] === 2 && $toRow === 7)) {
            $newBoard[$toRow][$toCol]['isKing'] = true;
        }
    }
    
    // Obtener capturas actuales de la base de datos y sumar las nuevas
    $currentCaptured = fetchOne("SELECT captured_pieces_black, captured_pieces_white FROM games WHERE id = ?", [$gameId]);
    $totalCapturedBlack = $currentCaptured['captured_pieces_black'] + $capturedBlack;
    $totalCapturedWhite = $currentCaptured['captured_pieces_white'] + $capturedWhite;
    
    // Determinar el siguiente jugador (cambiar de 1 a 2 o viceversa)
    $nextPlayer = $playerNumber === 1 ? 2 : 1;
    
    // Actualizar base de datos (tablero, turno y capturas)
    $stmt = $conn->prepare("UPDATE games SET board_state = ?, captured_pieces_black = ?, captured_pieces_white = ?, current_player = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([json_encode($newBoard), $totalCapturedBlack, $totalCapturedWhite, $nextPlayer, $gameId]);
    
    // Registrar el movimiento (sin capturas - el cliente maneja las reglas)
    $stmt = $conn->prepare("INSERT INTO moves (game_id, player_id, from_row, from_col, to_row, to_col, move_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$gameId, $playerId, $fromRow, $fromCol, $toRow, $toCol, 'move']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Movimiento realizado exitosamente',
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
