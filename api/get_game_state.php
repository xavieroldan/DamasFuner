<?php
/**
 * API para obtener el estado actual de una partida
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

/**
 * Calculate captures dynamically by counting missing pieces from initial board
 * @param array $currentBoard Current board state
 * @return array Array with player1_captures and player2_captures
 */
function calculateDynamicCaptures($currentBoard) {
    // Use the same logic as make_move.php for consistency
    $result = calculateCapturesFromBoard($currentBoard);
    return [
        'player1_captures' => $result['player1_captures'],
        'player2_captures' => $result['player2_captures']
    ];
}

/**
 * Calculate total captures from current board state by counting missing pieces
 * @param array $boardState Current board state
 * @return array Array with player1_captures and player2_captures
 */
function calculateCapturesFromBoard($boardState) {
    // Count pieces on current board
    $currentPlayer1Pieces = 0; // White pieces
    $currentPlayer2Pieces = 0; // Black pieces
    
    for ($row = 0; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if ($boardState[$row][$col]) {
                $piece = $boardState[$row][$col];
                if ($piece['player'] == 1) {
                    $currentPlayer1Pieces++;
                } else if ($piece['player'] == 2) {
                    $currentPlayer2Pieces++;
                }
            }
        }
    }
    
    // Initial pieces count (12 each)
    $initialPlayer1Pieces = 12; // White pieces
    $initialPlayer2Pieces = 12; // Black pieces
    
    // Calculate captures
    // Player 1 captures = missing Player 2 pieces
    $player1_captures = max(0, $initialPlayer2Pieces - $currentPlayer2Pieces);
    // Player 2 captures = missing Player 1 pieces  
    $player2_captures = max(0, $initialPlayer1Pieces - $currentPlayer1Pieces);
    
    return [
        'player1_captures' => $player1_captures,
        'player2_captures' => $player2_captures,
        'current_player1_pieces' => $currentPlayer1Pieces,
        'current_player2_pieces' => $currentPlayer2Pieces
    ];
}

// Only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Get parameters
    $gameId = isset($_GET['game_id']) ? (int)$_GET['game_id'] : 0;
    $playerId = isset($_GET['player_id']) ? (int)$_GET['player_id'] : 0;
    
    if (!$gameId || !$playerId) {
        throw new Exception('ID de partida y jugador requeridos');
    }
    
    // Get game information
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
    
    // Get recent chat messages (last 20)
    $chatMessages = fetchAll("
        SELECT cm.*, p.player_number
        FROM chat_messages cm
        LEFT JOIN players p ON cm.player_id = p.id
        WHERE cm.game_id = ?
        ORDER BY cm.created_at DESC
        LIMIT 20
    ", [$gameId]);
    
    // Get recent moves (last 10)
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
    
    // Calculate captures dynamically based on missing pieces
    $dynamicCaptures = calculateDynamicCaptures($boardState);
    
    // Preparar respuesta
    $response = [
        'success' => true,
        'board_state' => $boardState,
        'current_player' => $game['current_player'],
        'player1_captures' => $dynamicCaptures['player1_captures'],
        'player2_captures' => $dynamicCaptures['player2_captures'],
        'game_status' => $game['game_status'],
        'game_data' => [
            'game_id' => $game['id'],
            'game_code' => $game['game_code'],
            'current_player' => $game['current_player'],
            'board' => $boardState,
            'captured_pieces' => [
                'black' => $dynamicCaptures['player2_captures'], // Player 2 (black) captures
                'white' => $dynamicCaptures['player1_captures']  // Player 1 (white) captures
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
    
    // Place white pieces (player 1) in the last 3 rows
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
