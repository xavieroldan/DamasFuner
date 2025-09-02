<?php
/**
 * API para unirse a una partida existente
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Solo permitir método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['game_code']) || !isset($input['player_name'])) {
        throw new Exception('Código de partida y nombre del jugador requeridos');
    }
    
    $gameCode = trim(strtoupper($input['game_code']));
    $playerName = trim($input['player_name']);
    
    if (empty($gameCode) || strlen($gameCode) !== 6) {
        throw new Exception('Código de partida inválido');
    }
    
    if (empty($playerName) || strlen($playerName) > 50) {
        throw new Exception('Nombre del jugador inválido');
    }
    
    // Buscar la partida
    $game = fetchOne("SELECT * FROM games WHERE game_code = ? AND game_status = 'waiting'", [$gameCode]);
    
    if (!$game) {
        throw new Exception('Partida no encontrada o ya iniciada');
    }
    
    // Verificar si ya hay 2 jugadores
    $playerCount = fetchOne("SELECT COUNT(*) as count FROM players WHERE game_id = ?", [$game['id']])['count'];
    
    if ($playerCount >= 2) {
        throw new Exception('La partida ya está llena');
    }
    
    // Unirse a la partida
    $conn = getDBConnection();
    $conn->beginTransaction();
    
    try {
        // Insertar el jugador 2
        $sql = "INSERT INTO players (name, game_id, player_number) VALUES (?, ?, 2)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$playerName, $game['id']]);
        $playerId = $conn->lastInsertId();
        
        // Actualizar la partida con el ID del jugador 2 y cambiar estado a 'playing'
        $sql = "UPDATE games SET player2_id = ?, game_status = 'playing' WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$playerId, $game['id']]);
        
        // Agregar mensaje de sistema al chat
        $sql = "INSERT INTO chat_messages (game_id, player_id, player_name, message) VALUES (?, 0, 'Sistema', ?)";
        $stmt = $conn->prepare($sql);
        $message = "$playerName se ha unido a la partida. ¡Que comience el juego!";
        $stmt->execute([$game['id'], $message]);
        
        $conn->commit();
        
        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'game_id' => $game['id'],
            'player_id' => $playerId,
            'message' => 'Te has unido exitosamente a la partida'
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
