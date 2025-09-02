<?php
/**
 * API to end a game and declare winner
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_id']) || !isset($input['player_id']) || !isset($input['winner'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required parameters']);
        exit;
    }
    
    $gameId = (int)$input['game_id'];
    $playerId = (int)$input['player_id'];
    $winner = (int)$input['winner'];
    
    // Validate winner value
    if ($winner !== 1 && $winner !== 2) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid winner value']);
        exit;
    }
    
    // Update game status in database
    $conn = getDBConnection();
    $conn->beginTransaction();
    
    try {
        // Update game status to finished and set winner
        $sql = "UPDATE games SET game_status = 'finished', winner = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$winner, $gameId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Game not found or already finished');
        }
        
        // Log the game end
        error_log("Game $gameId ended with winner: $winner");
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Game ended successfully',
            'winner' => $winner
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error ending game: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error ending game: ' . $e->getMessage()
    ]);
}
?>
