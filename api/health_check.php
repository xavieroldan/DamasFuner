<?php
/**
 * API para verificar el estado del servidor
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Verificar conexión a la base de datos
    $conn = getDBConnection();
    $stmt = $conn->query("SELECT 1");
    
    // Verificar que las tablas principales existen
    $tables = ['games', 'players', 'chat_messages', 'moves'];
    $existingTables = [];
    
    foreach ($tables as $table) {
        $stmt = $conn->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            $existingTables[] = $table;
        }
    }
    
    // Obtener estadísticas básicas
    $stats = [
        'total_games' => fetchOne("SELECT COUNT(*) as count FROM games")['count'],
        'active_games' => fetchOne("SELECT COUNT(*) as count FROM games WHERE game_status = 'playing'")['count'],
        'waiting_games' => fetchOne("SELECT COUNT(*) as count FROM games WHERE game_status = 'waiting'")['count'],
        'total_players' => fetchOne("SELECT COUNT(*) as count FROM players")['count']
    ];
    
    echo json_encode([
        'success' => true,
        'status' => 'healthy',
        'database_connected' => true,
        'tables_exist' => count($existingTables) === count($tables),
        'existing_tables' => $existingTables,
        'server_time' => date('Y-m-d H:i:s'),
        'php_version' => PHP_VERSION,
        'stats' => $stats
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'unhealthy',
        'database_connected' => false,
        'error' => $e->getMessage(),
        'server_time' => date('Y-m-d H:i:s')
    ]);
}
?>
