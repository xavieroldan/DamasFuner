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
    
    // EL CLIENTE MANEJA TODA LA LÓGICA - EL SERVIDOR SOLO CONFÍA EN EL ESTADO FINAL
    // El cliente envía el tablero completo ya procesado con todas las capturas y promociones
    
    // Si el cliente envía el tablero completo, usarlo directamente
    if (isset($input['board_state'])) {
        $newBoard = $input['board_state'];
        error_log("Using complete board state from client");
    } else {
        // Fallback: procesar movimiento básico (para compatibilidad)
        $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
        $newBoard[$fromRow][$fromCol] = null;
        error_log("Using fallback movement processing");
    }
    
    // EL CLIENTE MANEJA EL CONTEO DE CAPTURAS - EL SERVIDOR SOLO CONFÍA EN LOS TOTALES
    error_log("DEBUG: Input keys: " . implode(', ', array_keys($input)));
    error_log("DEBUG: Input captured_pieces: " . (isset($input['captured_pieces']) ? json_encode($input['captured_pieces']) : 'NOT SET'));
    error_log("DEBUG: Input total_captures: " . (isset($input['total_captures']) ? json_encode($input['total_captures']) : 'NOT SET'));
    
    // Usar las capturas enviadas por el cliente (formato actual)
    if (isset($input['total_captures']) && isset($input['total_captures']['captured_pieces'])) {
        $totalCapturedBlack = $input['total_captures']['captured_pieces']['black'] ?? 0;
        $totalCapturedWhite = $input['total_captures']['captured_pieces']['white'] ?? 0;
        error_log("Using client-calculated captures (total_captures) - Black: $totalCapturedBlack, White: $totalCapturedWhite");
    } else if (isset($input['captured_pieces'])) {
        // Compatibilidad con formato anterior
        $totalCapturedBlack = $input['captured_pieces']['black'] ?? 0;
        $totalCapturedWhite = $input['captured_pieces']['white'] ?? 0;
        error_log("Using client-calculated captures (captured_pieces) - Black: $totalCapturedBlack, White: $totalCapturedWhite");
    } else {
        // Error: el cliente debe enviar las capturas
        error_log("ERROR: Client did not send captures");
        echo json_encode(['success' => false, 'message' => 'Cliente no envió información de capturas']);
        exit;
    }
    
    // Ensure values are integers and not null
    $totalCapturedBlack = (int)($totalCapturedBlack ?? 0);
    $totalCapturedWhite = (int)($totalCapturedWhite ?? 0);
    error_log("Final sanitized captures - Black: $totalCapturedBlack, White: $totalCapturedWhite");
    
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
