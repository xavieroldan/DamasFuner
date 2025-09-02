<?php
/**
 * Configuración de la base de datos para Damas Online
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;
    
    public function __construct() {
        // Configuración de la base de datos
        // Cambia estos valores según tu configuración
        $this->host = 'localhost';
        $this->db_name = 'damas_online';
        $this->username = 'root'; // Cambia por tu usuario de MySQL
        $this->password = ''; // Cambia por tu contraseña de MySQL
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
            error_log("Error de conexión: " . $exception->getMessage());
            throw new Exception("Error de conexión a la base de datos");
        }
        
        return $this->conn;
    }
    
    public function closeConnection() {
        $this->conn = null;
    }
}

/**
 * Función helper para obtener una conexión a la base de datos
 */
function getDBConnection() {
    static $db = null;
    if ($db === null) {
        $db = new Database();
    }
    return $db->getConnection();
}

/**
 * Función para ejecutar consultas de forma segura
 */
function executeQuery($sql, $params = []) {
    try {
        $conn = getDBConnection();
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch (PDOException $e) {
        error_log("Error en consulta: " . $e->getMessage());
        throw new Exception("Error en la consulta a la base de datos");
    }
}

/**
 * Función para obtener un solo resultado
 */
function fetchOne($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt->fetch();
}

/**
 * Función para obtener múltiples resultados
 */
function fetchAll($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt->fetchAll();
}

/**
 * Función para insertar y obtener el ID
 */
function insertAndGetId($sql, $params = []) {
    $conn = getDBConnection();
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $conn->lastInsertId();
}

/**
 * Función para validar la conexión a la base de datos
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
 * Función para inicializar la base de datos si no existe
 */
function initializeDatabase() {
    try {
        $conn = getDBConnection();
        
        // Verificar si las tablas existen
        $tables = ['games', 'players', 'chat_messages', 'moves', 'system_config'];
        $existingTables = [];
        
        foreach ($tables as $table) {
            $stmt = $conn->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() > 0) {
                $existingTables[] = $table;
            }
        }
        
        // Si faltan tablas, ejecutar el schema
        if (count($existingTables) < count($tables)) {
            $schema = file_get_contents(__DIR__ . '/../database/schema.sql');
            $conn->exec($schema);
            return true;
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error al inicializar la base de datos: " . $e->getMessage());
        return false;
    }
}

// Configuración de errores
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// Crear directorio de logs si no existe
if (!file_exists(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0755, true);
}

// Inicializar la base de datos al cargar este archivo
initializeDatabase();
?>
