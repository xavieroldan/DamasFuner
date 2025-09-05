<?php
/**
 * Database configuration for Damas Funer
 */

// Load server-specific configuration first if it exists
if (file_exists(__DIR__ . '/server_config.php')) {
    error_log("Loading server_config.php");
    require_once __DIR__ . '/server_config.php';
    error_log("server_config.php loaded - DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED'));
} else {
    error_log("server_config.php not found");
}

// Load general configuration (this may override some settings)
if (file_exists(__DIR__ . '/config.php')) {
    error_log("Loading config.php");
    require_once __DIR__ . '/config.php';
    error_log("config.php loaded - DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED'));
} else {
    error_log("config.php not found");
}

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;
    
    public function __construct() {
        // Database configuration
        // Try to load from constants first, then environment variables, then defaults
        $this->host = defined('DB_HOST') ? DB_HOST : ($_ENV['DB_HOST'] ?? 'localhost');
        $this->db_name = defined('DB_NAME') ? DB_NAME : ($_ENV['DB_NAME'] ?? '6774344_damas_online');
        $this->username = defined('DB_USER') ? DB_USER : ($_ENV['DB_USER'] ?? 'root');
        $this->password = defined('DB_PASS') ? DB_PASS : ($_ENV['DB_PASS'] ?? '');
        
        // Log configuration for debugging (without password)
        error_log("Database config - Host: {$this->host}, DB: {$this->db_name}, User: {$this->username}");
    }
    
    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch(PDOException $exception) {
            $errorMsg = "Connection error: " . $exception->getMessage();
            error_log($errorMsg);
            error_log("Connection details - Host: {$this->host}, DB: {$this->db_name}, User: {$this->username}");
            throw new Exception("Database connection error: " . $exception->getMessage());
        }
        
        return $this->conn;
    }
    
    public function closeConnection() {
        $this->conn = null;
    }
}

/**
 * Helper function to get a database connection
 */
function getDBConnection() {
    static $db = null;
    if ($db === null) {
        $db = new Database();
    }
    return $db->getConnection();
}

/**
 * Function to execute queries safely
 */
function executeQuery($sql, $params = []) {
    try {
        $conn = getDBConnection();
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch (PDOException $e) {
        error_log("Query error: " . $e->getMessage());
        throw new Exception("Database query error");
    }
}

/**
 * Function to get a single result
 */
function fetchOne($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt->fetch();
}

/**
 * Function to get multiple results
 */
function fetchAll($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt->fetchAll();
}

/**
 * Function to insert and get the ID
 */
function insertAndGetId($sql, $params = []) {
    $conn = getDBConnection();
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $conn->lastInsertId();
}

/**
 * Function to validate database connection
 */
function validateDatabaseConnection() {
    try {
        $conn = getDBConnection();
        $stmt = $conn->query("SELECT 1");
        return true;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Function to initialize database if it doesn't exist
 */
function initializeDatabase() {
    try {
        $conn = getDBConnection();
        
        // Check if tables exist
        $tables = ['games', 'players', 'chat_messages', 'moves', 'system_config'];
        $existingTables = [];
        
        foreach ($tables as $table) {
            $stmt = $conn->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() > 0) {
                $existingTables[] = $table;
            }
        }
        
        // If tables are missing, execute the schema
        if (count($existingTables) < count($tables)) {
            $schema = file_get_contents(__DIR__ . '/../database/schema.sql');
            $conn->exec($schema);
            return true;
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error initializing database: " . $e->getMessage());
        return false;
    }
}

// Error configuration
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Create logs directory if it doesn't exist
if (!file_exists(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0755, true);
}

// Initialize database when loading this file
initializeDatabase();
?>
