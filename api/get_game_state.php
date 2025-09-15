<?php
/**
 * API para obtener el estado actual de una partida
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Solo permitir método GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Obtener parámetros
    $gameId = isset($_GET['game_id']) ? (int)$_GET['game_id'] : 0;
    $playerId = isset($_GET['player_id']) ? (int)$_GET['player_id'] : 0;
    
    if (!$gameId || !$playerId) {
        throw new Exception('ID de partida y jugador requeridos');
    }
    
    // Obtener información de la partida
    $game = fetchOne("
        SELECT g.*, p1.name as player1_name, p2.name as player2_name
        FROM games g
        LEFT JOIN players p1 ON g.player1_id = p1.id
        LEFT JOIN players p2 ON g.player2_id = p2.id
        WHERE g.id = ?
    ", [$gameId]);
    
    if (!$game) {
        throw new Exception('Partida no encontrada');
    }
    
    // Verificar que el jugador pertenece a esta partida
    $player = fetchOne("SELECT * FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    if (!$player) {
        throw new Exception('Jugador no autorizado para esta partida');
    }
    
    // Obtener mensajes de chat recientes (últimos 20)
    $chatMessages = fetchAll("
        SELECT cm.*, p.player_number
        FROM chat_messages cm
        LEFT JOIN players p ON cm.player_id = p.id
        WHERE cm.game_id = ?
        ORDER BY cm.created_at DESC
        LIMIT 20
    ", [$gameId]);
    
    // Obtener movimientos recientes (últimos 10)
    $recentMoves = fetchAll("
        SELECT m.*, p.name as player_name
        FROM moves m
        LEFT JOIN players p ON m.player_id = p.id
        WHERE m.game_id = ?
        ORDER BY m.created_at DESC
        LIMIT 10
    ", [$gameId]);
    
    // Decodificar el estado del tablero
    $boardState = json_decode($game['board_state'], true);
    if (!$boardState) {
        $boardState = createInitialBoard();
    }
    
    // Preparar respuesta
    $response = [
        'success' => true,
        'game_data' => [
            'game_id' => $game['id'],
            'game_code' => $game['game_code'],
            'current_player' => $game['current_player'],
            'board' => $boardState,
            'captured_pieces' => [
                'black' => $game['captured_pieces_black'] ?? 0,
                'white' => $game['captured_pieces_white'] ?? 0
            ],
            'game_status' => $game['game_status'],
            'winner' => $game['winner'],
            'player1_name' => $game['player1_name'],
            'player2_name' => $game['player2_name'],
            'created_at' => $game['created_at'],
            'updated_at' => $game['updated_at']
        ]
    ];
    
    // Agregar mensajes de chat si hay nuevos
    if (!empty($chatMessages)) {
        $response['game_data']['chat_messages'] = array_reverse($chatMessages);
    }
    
    // Agregar movimientos recientes
    if (!empty($recentMoves)) {
        $response['game_data']['recent_moves'] = array_reverse($recentMoves);
    }
    
    // Verificar si el juego ha terminado
    if ($game['game_status'] === 'finished' && $game['winner']) {
        $response['game_data']['game_ended'] = true;
        $response['game_data']['winner_name'] = $game['winner'] == 1 ? $game['player1_name'] : $game['player2_name'];
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Crea el estado inicial del tablero de damas
 * CONSISTENTE con create_game.php: Player 1 = Blancas, Player 2 = Negras
 */
function createInitialBoard() {
    $board = array_fill(0, 8, array_fill(0, 8, null));
    
    // Colocar piezas negras (jugador 2) en las primeras 3 filas
    for ($row = 0; $row < 3; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if (($row + $col) % 2 === 1) {
                $board[$row][$col] = [
                    'player' => 2,
                    'isQueen' => false
                ];
            }
        }
    }
    
    // Colocar piezas blancas (jugador 1) en las últimas 3 filas
    for ($row = 5; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if (($row + $col) % 2 === 1) {
                $board[$row][$col] = [
                    'player' => 1,
                    'isQueen' => false
                ];
            }
        }
    }
    
    return $board;
}
?>
