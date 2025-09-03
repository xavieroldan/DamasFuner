<?php
/**
 * API para abandonar una partida
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_id']) || !isset($input['player_id'])) {
        throw new Exception('ID de partida y jugador requeridos');
    }
    
    $gameId = (int)$input['game_id'];
    $playerId = (int)$input['player_id'];
    
    // Verificar que la partida existe
    $game = fetchOne("SELECT * FROM games WHERE id = ?", [$gameId]);
    if (!$game) {
        throw new Exception('Partida no encontrada');
    }
    
    // Verificar que el jugador pertenece a esta partida
    $player = fetchOne("SELECT * FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    if (!$player) {
        throw new Exception('Jugador no autorizado para esta partida');
    }
    
    $conn = getDBConnection();
    $conn->beginTransaction();
    
    try {
        // Agregar mensaje de sistema al chat
        $sql = "INSERT INTO chat_messages (game_id, player_id, player_name, message) VALUES (?, 0, 'Sistema', ?)";
        $stmt = $conn->prepare($sql);
        $message = $player['name'] . " ha abandonado la partida.";
        $stmt->execute([$gameId, $message]);
        
        // If the game is in progress, declare the opponent as winner
        if ($game['game_status'] === 'playing') {
            $winner = $player['player_number'] === 1 ? 2 : 1;
            $sql = "UPDATE games SET game_status = 'finished', winner = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$winner, $gameId]);
            
            // Agregar mensaje de victoria
            $sql = "INSERT INTO chat_messages (game_id, player_id, player_name, message) VALUES (?, 0, 'Sistema', ?)";
            $stmt = $conn->prepare($sql);
            $winnerMessage = "¡Partida terminada! El jugador " . ($winner === 1 ? "1" : "2") . " gana por abandono.";
            $stmt->execute([$gameId, $winnerMessage]);
        } else {
            // If the game is waiting, delete it
            $sql = "DELETE FROM games WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$gameId]);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Has abandonado la partida exitosamente'
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
