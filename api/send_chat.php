<?php
/**
 * API para enviar mensajes de chat
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
    
    if (!$input || !isset($input['game_id']) || !isset($input['player_id']) || !isset($input['message'])) {
        throw new Exception('Datos de mensaje requeridos');
    }
    
    $gameId = (int)$input['game_id'];
    $playerId = (int)$input['player_id'];
    $message = trim($input['message']);
    
    // Validar el mensaje
    if (empty($message)) {
        throw new Exception('El mensaje no puede estar vacío');
    }
    
    if (strlen($message) > 200) {
        throw new Exception('El mensaje es demasiado largo (máximo 200 caracteres)');
    }
    
    // Verify that the game exists and is active
    $game = fetchOne("SELECT * FROM games WHERE id = ? AND game_status IN ('waiting', 'playing')", [$gameId]);
    if (!$game) {
        throw new Exception('Partida no encontrada o no está activa');
    }
    
    // Verificar que el jugador pertenece a esta partida
    $player = fetchOne("SELECT * FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    if (!$player) {
        throw new Exception('Jugador no autorizado para esta partida');
    }
    
    // Verify message limit per minute
    $recentMessages = fetchOne("
        SELECT COUNT(*) as count 
        FROM chat_messages 
        WHERE player_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    ", [$playerId])['count'];
    
    if ($recentMessages >= 10) {
        throw new Exception('Has enviado demasiados mensajes. Espera un momento.');
    }
    
    // Filter inappropriate content (basic)
    $filteredMessage = filterMessage($message);
    
    // Insertar el mensaje en la base de datos
    $sql = "INSERT INTO chat_messages (game_id, player_id, player_name, message) VALUES (?, ?, ?, ?)";
    $stmt = executeQuery($sql, [$gameId, $playerId, $player['name'], $filteredMessage]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Mensaje enviado exitosamente'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Filtra el contenido del mensaje para eliminar contenido inapropiado
 */
function filterMessage($message) {
    // Basic list of inappropriate words (you can expand this)
    $badWords = ['spam', 'scam', 'hack', 'virus'];
    
    $filtered = $message;
    
    foreach ($badWords as $word) {
        $filtered = str_ireplace($word, str_repeat('*', strlen($word)), $filtered);
    }
    
    // Limpiar HTML y scripts
    $filtered = htmlspecialchars($filtered, ENT_QUOTES, 'UTF-8');
    
    // Limitar caracteres especiales repetidos
    $filtered = preg_replace('/(.)\1{4,}/', '$1$1$1', $filtered);
    
    return $filtered;
}
?>
