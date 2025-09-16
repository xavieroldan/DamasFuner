<?php
/**
 * Simple reset endpoint that doesn't depend on database
 * This is a fallback for when the main reset_game.php fails
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_id'])) {
        throw new Exception('Missing game_id parameter');
    }
    
    $gameId = intval($input['game_id']);
    $player1Name = isset($input['player1_name']) ? trim($input['player1_name']) : 'Jugador 1';
    $player2Name = isset($input['player2_name']) ? trim($input['player2_name']) : 'Jugador 2';
    
    // Create initial board state
    $initialBoard = [
        [null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false]],
        [['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null],
        [null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false], null, ['player' => 2, 'isQueen' => false]],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null],
        [null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false]],
        [['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null, ['player' => 1, 'isQueen' => false], null]
    ];
    
    // Return success response with initial game state
    echo json_encode([
        'success' => true,
        'message' => 'Game reset successfully (simple mode)',
        'game_data' => [
            'game_id' => $gameId,
            'current_player' => 1,
            'game_status' => 'playing',
            'player1_name' => $player1Name,
            'player2_name' => $player2Name,
            'captured_pieces' => ['black' => 0, 'white' => 0],
            'board' => $initialBoard
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Simple reset error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
