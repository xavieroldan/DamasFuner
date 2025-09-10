<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_id']) || !isset($input['player1_name']) || !isset($input['player2_name'])) {
        throw new Exception('Missing required parameters');
    }
    
    $gameId = intval($input['game_id']);
    $player1Name = trim($input['player1_name']);
    $player2Name = trim($input['player2_name']);
    
    // Validate game exists
    $game = fetchOne("SELECT id, game_code FROM games WHERE id = ?", [$gameId]);
    if (!$game) {
        throw new Exception('Game not found');
    }
    
    // Reset the game to initial state
    $resetQuery = "
        UPDATE games SET 
            current_player = 1,
            game_status = 'playing',
            captured_pieces_black = 0,
            captured_pieces_white = 0,
            player1_name = ?,
            player2_name = ?,
            last_move_time = NOW(),
            winner = NULL
        WHERE id = ?
    ";
    
    executeQuery($resetQuery, [$player1Name, $player2Name, $gameId]);
    
    // Reset the board to initial state
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
    
    $boardJson = json_encode($initialBoard);
    executeQuery("UPDATE games SET board_state = ? WHERE id = ?", [$boardJson, $gameId]);
    
    // Clear any existing moves for this game
    executeQuery("DELETE FROM moves WHERE game_id = ?", [$gameId]);
    
    // Log the reset
    error_log("Game $gameId reset - Player 1: $player1Name, Player 2: $player2Name");
    
    echo json_encode([
        'success' => true,
        'message' => 'Game reset successfully',
        'game_data' => [
            'game_id' => $gameId,
            'game_code' => $game['game_code'],
            'current_player' => 1,
            'game_status' => 'playing',
            'player1_name' => $player1Name,
            'player2_name' => $player2Name,
            'captured_pieces' => ['black' => 0, 'white' => 0],
            'board' => $initialBoard
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Reset game error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>




