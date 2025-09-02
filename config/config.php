<?php
/**
 * Configuración general del juego de Damas Funer
 */

// Configuración de la aplicación
define('APP_NAME', 'Damas Funer');
define('APP_VERSION', '1.0.0');
define('APP_DEBUG', false);

// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_NAME', '6774344_damas_online');
define('DB_USER', 'root');
define('DB_PASS', '');

// Configuración del juego
define('GAME_TIMEOUT_MINUTES', 30);
define('MAX_GAMES_PER_HOUR', 10);
define('MAX_CHAT_MESSAGES_PER_MINUTE', 30);
define('POLLING_INTERVAL_SECONDS', 2);

// Configuración de seguridad
define('MAX_MESSAGE_LENGTH', 200);
define('MAX_PLAYER_NAME_LENGTH', 50);
define('GAME_CODE_LENGTH', 6);

// Configuración de archivos
define('LOG_DIR', __DIR__ . '/../logs/');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// Configuración de CORS
define('ALLOWED_ORIGINS', ['*']);

// Configuración de notificaciones
define('ENABLE_NOTIFICATIONS', true);
define('NOTIFICATION_SOUND', true);

// Configuración de estadísticas
define('ENABLE_STATS', true);
define('STATS_RETENTION_DAYS', 30);

// Configuración de limpieza automática
define('AUTO_CLEANUP_ENABLED', true);
define('CLEANUP_INTERVAL_HOURS', 24);

// Configuración de desarrollo
if (APP_DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', LOG_DIR . 'error.log');
}

// Crear directorios necesarios
if (!file_exists(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

if (!file_exists(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// Función para obtener configuración
function getConfig($key, $default = null) {
    return defined($key) ? constant($key) : $default;
}

// Función para validar configuración
function validateConfig() {
    $required = [
        'DB_HOST', 'DB_NAME', 'DB_USER'
    ];
    
    foreach ($required as $config) {
        if (!defined($config) || empty(constant($config))) {
            throw new Exception("Configuración requerida faltante: $config");
        }
    }
    
    return true;
}

// Función para obtener información del sistema
function getSystemInfo() {
    return [
        'app_name' => APP_NAME,
        'app_version' => APP_VERSION,
        'php_version' => PHP_VERSION,
        'server_time' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get(),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size')
    ];
}

// Función para log de eventos
function logEvent($level, $message, $context = []) {
    if (!APP_DEBUG && $level === 'debug') {
        return;
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] [$level] $message";
    
    if (!empty($context)) {
        $logMessage .= ' ' . json_encode($context);
    }
    
    $logMessage .= PHP_EOL;
    
    file_put_contents(LOG_DIR . 'app.log', $logMessage, FILE_APPEND | LOCK_EX);
}

// Función para limpiar logs antiguos
function cleanupOldLogs() {
    if (!AUTO_CLEANUP_ENABLED) {
        return;
    }
    
    $files = glob(LOG_DIR . '*.log');
    $cutoff = time() - (STATS_RETENTION_DAYS * 24 * 60 * 60);
    
    foreach ($files as $file) {
        if (filemtime($file) < $cutoff) {
            unlink($file);
        }
    }
}

// Función para obtener estadísticas del sistema
function getSystemStats() {
    try {
        require_once __DIR__ . '/database.php';
        
        $stats = [
            'total_games' => fetchOne("SELECT COUNT(*) as count FROM games")['count'],
            'active_games' => fetchOne("SELECT COUNT(*) as count FROM games WHERE game_status = 'playing'")['count'],
            'waiting_games' => fetchOne("SELECT COUNT(*) as count FROM games WHERE game_status = 'waiting'")['count'],
            'total_players' => fetchOne("SELECT COUNT(*) as count FROM players")['count'],
            'total_moves' => fetchOne("SELECT COUNT(*) as count FROM moves")['count'],
            'total_messages' => fetchOne("SELECT COUNT(*) as count FROM chat_messages")['count']
        ];
        
        return $stats;
    } catch (Exception $e) {
        logEvent('error', 'Error al obtener estadísticas del sistema', ['error' => $e->getMessage()]);
        return [];
    }
}

// Función para verificar el estado del sistema
function checkSystemHealth() {
    $health = [
        'database' => false,
        'directories' => false,
        'permissions' => false,
        'php_extensions' => false
    ];
    
    // Verificar base de datos
    try {
        require_once __DIR__ . '/database.php';
        $conn = getDBConnection();
        $stmt = $conn->query("SELECT 1");
        $health['database'] = true;
    } catch (Exception $e) {
        $health['database'] = false;
    }
    
    // Verificar directorios
    $health['directories'] = file_exists(LOG_DIR) && file_exists(UPLOAD_DIR);
    
    // Verificar permisos
    $health['permissions'] = is_writable(LOG_DIR) && is_writable(UPLOAD_DIR);
    
    // Verificar extensiones PHP
    $required_extensions = ['pdo', 'pdo_mysql', 'json'];
    $health['php_extensions'] = true;
    foreach ($required_extensions as $ext) {
        if (!extension_loaded($ext)) {
            $health['php_extensions'] = false;
            break;
        }
    }
    
    return $health;
}

// Inicializar configuración
try {
    validateConfig();
    logEvent('info', 'Configuración inicializada correctamente');
} catch (Exception $e) {
    logEvent('error', 'Error al inicializar configuración', ['error' => $e->getMessage()]);
}
?>
