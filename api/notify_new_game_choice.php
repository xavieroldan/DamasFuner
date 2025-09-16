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
    
    error_log("New game choice notification - Input: " . json_encode($input));
    
    if (!$input || !isset($input['game_id']) || !isset($input['player_id']) || !isset($input['color_mode'])) {
        error_log("New game choice error - Missing required parameters: " . json_encode($input));
        throw new Exception('Missing required parameters');
    }
    
    $gameId = intval($input['game_id']);
    $playerId = intval($input['player_id']);
    $colorMode = $input['color_mode'];
    $player1Name = isset($input['player1_name']) ? trim($input['player1_name']) : 'Jugador 1';
    $player2Name = isset($input['player2_name']) ? trim($input['player2_name']) : 'Jugador 2';
    
    error_log("New game choice - Game ID: $gameId, Player ID: $playerId, Color Mode: $colorMode");
    
    // Validate game exists
    $game = fetchOne("SELECT id, game_code FROM games WHERE id = ?", [$gameId]);
    if (!$game) {
        error_log("New game choice error - Game not found: $gameId");
        throw new Exception('Game not found');
    }
    
    // Update game status to indicate new game choice has been made
    $updateQuery = "
        UPDATE games SET 
            game_status = 'new_game_pending',
            last_move_time = NOW()
        WHERE id = ?
    ";
    
    error_log("New game choice - Updating game status to new_game_pending");
    executeQuery($updateQuery, [$gameId]);
    error_log("New game choice - Game status updated successfully");
    
    // Log the choice
    error_log("Game $gameId - Player $playerId chose new game with color mode: $colorMode");
    
    echo json_encode([
        'success' => true,
        'message' => 'New game choice recorded',
        'color_mode' => $colorMode,
        'player1_name' => $player1Name,
        'player2_name' => $player2Name
    ]);
    
} catch (Exception $e) {
    error_log("New game choice error: " . $e->getMessage());
    error_log("New game choice error trace: " . $e->getTraceAsString());
    
    // Determine if it's a database connection error
    $isDbError = strpos($e->getMessage(), 'Database') !== false || 
                 strpos($e->getMessage(), 'Connection') !== false ||
                 strpos($e->getMessage(), 'PDO') !== false;
    
    $errorMessage = $isDbError ? 
        'Database connection error. Please try again later.' : 
        $e->getMessage();
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $errorMessage,
        'debug_info' => $isDbError ? 'Database connection failed' : 'General error'
    ]);
}
?>
