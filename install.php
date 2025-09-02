<?php
/**
 * Script de instalación para Damas Online
 * Ejecutar una sola vez para configurar el juego
 */

// Database configuration
$db_config = [
    'host' => 'localhost',
    'dbname' => '6774344_damas_online',
    'username' => 'root', // Change to your username
    'password' => ''      // Change to your password
];

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalación - Damas Online</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        .step {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            border-left: 4px solid #32CD32;
        }
        .error {
            border-left-color: #FF6B6B;
            background: rgba(255, 107, 107, 0.1);
        }
        .success {
            border-left-color: #32CD32;
            background: rgba(50, 205, 50, 0.1);
        }
        .warning {
            border-left-color: #FFD700;
            background: rgba(255, 215, 0, 0.1);
        }
        pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .btn {
            background: linear-gradient(135deg, #32CD32, #228B22);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .form-group {
            margin: 15px 0;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Instalación de Damas Online</h1>
        
        <?php
        $step = isset($_GET['step']) ? (int)$_GET['step'] : 1;
        
        switch ($step) {
            case 1:
                showWelcome();
                break;
            case 2:
                showDatabaseConfig();
                break;
            case 3:
                installDatabase();
                break;
            case 4:
                showCompletion();
                break;
        }
        
        function showWelcome() {
            ?>
            <div class="step">
                <h2>Bienvenido a la instalación de Damas Online</h2>
                <p>Este asistente te ayudará a configurar el juego paso a paso.</p>
                
                <h3>Requisitos del sistema:</h3>
                <ul>
                    <li>PHP 7.4 o superior</li>
                    <li>MySQL 5.7 o superior</li>
                    <li>Servidor web (Apache, Nginx, etc.)</li>
                    <li>Extensiones PHP: PDO, PDO_MySQL</li>
                </ul>
                
                <h3>Verificación del sistema:</h3>
                <ul>
                    <li>PHP Version: <?php echo PHP_VERSION; ?> 
                        <?php echo version_compare(PHP_VERSION, '7.4.0', '>=') ? '✅' : '❌'; ?>
                    </li>
                    <li>PDO Extension: <?php echo extension_loaded('pdo') ? '✅' : '❌'; ?></li>
                    <li>PDO MySQL: <?php echo extension_loaded('pdo_mysql') ? '✅' : '❌'; ?></li>
                    <li>JSON Extension: <?php echo extension_loaded('json') ? '✅' : '❌'; ?></li>
                </ul>
                
                <a href="?step=2" class="btn">Continuar</a>
            </div>
            <?php
        }
        
        function showDatabaseConfig() {
            ?>
            <div class="step">
                <h2>Configuración de la Base de Datos</h2>
                <p>Ingresa los datos de conexión a tu base de datos MySQL:</p>
                
                <form method="POST" action="?step=3">
                    <div class="form-group">
                        <label for="host">Host:</label>
                        <input type="text" id="host" name="host" value="localhost" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="dbname">Nombre de la Base de Datos:</label>
                        <input type="text" id="dbname" name="dbname" value="6774344_damas_online" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="username">Usuario:</label>
                        <input type="text" id="username" name="username" value="root" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Contraseña:</label>
                        <input type="password" id="password" name="password">
                    </div>
                    
                    <button type="submit" class="btn">Instalar Base de Datos</button>
                </form>
            </div>
            <?php
        }
        
        function installDatabase() {
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                header('Location: ?step=2');
                exit;
            }
            
            $host = $_POST['host'];
            $dbname = $_POST['dbname'];
            $username = $_POST['username'];
            $password = $_POST['password'];
            
            try {
                // Probar conexión
                $pdo = new PDO("mysql:host=$host;charset=utf8", $username, $password);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                echo '<div class="step success">';
                echo '<h2>✅ Conexión exitosa</h2>';
                echo '<p>La conexión a MySQL se estableció correctamente.</p>';
                echo '</div>';
                
                // Crear base de datos si no existe
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname`");
                $pdo->exec("USE `$dbname`");
                
                echo '<div class="step success">';
                echo '<h2>✅ Base de datos creada</h2>';
                echo '<p>La base de datos "' . htmlspecialchars($dbname) . '" se creó exitosamente.</p>';
                echo '</div>';
                
                // Leer y ejecutar el schema
                $schema = file_get_contents('database/schema.sql');
                if ($schema === false) {
                    throw new Exception('No se pudo leer el archivo schema.sql');
                }
                
                // Dividir el schema en consultas individuales
                $queries = explode(';', $schema);
                foreach ($queries as $query) {
                    $query = trim($query);
                    if (!empty($query)) {
                        $pdo->exec($query);
                    }
                }
                
                echo '<div class="step success">';
                echo '<h2>✅ Tablas creadas</h2>';
                echo '<p>Las tablas de la base de datos se crearon exitosamente.</p>';
                echo '</div>';
                
                // Actualizar archivo de configuración
                $configContent = "<?php
/**
 * Configuración de la base de datos para Damas Online
 */

class Database {
    private \$host;
    private \$db_name;
    private \$username;
    private \$password;
    private \$conn;
    
    public function __construct() {
        \$this->host = '$host';
        \$this->db_name = '$dbname';
        \$this->username = '$username';
        \$this->password = '$password';
    }
    
    public function getConnection() {
        \$this->conn = null;
        
        try {
            \$this->conn = new PDO(
                \"mysql:host=\" . \$this->host . \";dbname=\" . \$this->db_name . \";charset=utf8\",
                \$this->username,
                \$this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch(PDOException \$exception) {
            error_log(\"Error de conexión: \" . \$exception->getMessage());
            throw new Exception(\"Error de conexión a la base de datos\");
        }
        
        return \$this->conn;
    }
    
    public function closeConnection() {
        \$this->conn = null;
    }
}

/**
 * Función helper para obtener una conexión a la base de datos
 */
function getDBConnection() {
    static \$db = null;
    if (\$db === null) {
        \$db = new Database();
    }
    return \$db->getConnection();
}

/**
 * Función para ejecutar consultas de forma segura
 */
function executeQuery(\$sql, \$params = []) {
    try {
        \$conn = getDBConnection();
        \$stmt = \$conn->prepare(\$sql);
        \$stmt->execute(\$params);
        return \$stmt;
    } catch (PDOException \$e) {
        error_log(\"Error en consulta: \" . \$e->getMessage());
        throw new Exception(\"Error en la consulta a la base de datos\");
    }
}

/**
 * Función para obtener un solo resultado
 */
function fetchOne(\$sql, \$params = []) {
    \$stmt = executeQuery(\$sql, \$params);
    return \$stmt->fetch();
}

/**
 * Función para obtener múltiples resultados
 */
function fetchAll(\$sql, \$params = []) {
    \$stmt = executeQuery(\$sql, \$params);
    return \$stmt->fetchAll();
}

/**
 * Función para insertar y obtener el ID
 */
function insertAndGetId(\$sql, \$params = []) {
    \$conn = getDBConnection();
    \$stmt = \$conn->prepare(\$sql);
    \$stmt->execute(\$params);
    return \$conn->lastInsertId();
}

/**
 * Función para validar la conexión a la base de datos
 */
function validateDatabaseConnection() {
    try {
        \$conn = getDBConnection();
        \$stmt = \$conn->query(\"SELECT 1\");
        return true;
    } catch (Exception \$e) {
        return false;
    }
}

/**
 * Función para inicializar la base de datos si no existe
 */
function initializeDatabase() {
    try {
        \$conn = getDBConnection();
        
        // Verificar si las tablas existen
        \$tables = ['games', 'players', 'chat_messages', 'moves', 'system_config'];
        \$existingTables = [];
        
        foreach (\$tables as \$table) {
            \$stmt = \$conn->query(\"SHOW TABLES LIKE '\$table'\");
            if (\$stmt->rowCount() > 0) {
                \$existingTables[] = \$table;
            }
        }
        
        // Si faltan tablas, ejecutar el schema
        if (count(\$existingTables) < count(\$tables)) {
            \$schema = file_get_contents(__DIR__ . '/../database/schema.sql');
            \$conn->exec(\$schema);
            return true;
        }
        
        return true;
    } catch (Exception \$e) {
        error_log(\"Error al inicializar la base de datos: \" . \$e->getMessage());
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
?>";
                
                if (file_put_contents('config/database.php', $configContent)) {
                    echo '<div class="step success">';
                    echo '<h2>✅ Configuración guardada</h2>';
                    echo '<p>El archivo de configuración se actualizó correctamente.</p>';
                    echo '</div>';
                } else {
                    echo '<div class="step error">';
                    echo '<h2>❌ Error al guardar configuración</h2>';
                    echo '<p>No se pudo escribir el archivo config/database.php. Verifica los permisos.</p>';
                    echo '</div>';
                }
                
                // Crear directorio de logs
                if (!file_exists('logs')) {
                    mkdir('logs', 0755, true);
                }
                
                echo '<div class="step success">';
                echo '<h2>✅ Instalación completada</h2>';
                echo '<p>El juego de Damas Online se ha instalado correctamente.</p>';
                echo '<a href="?step=4" class="btn">Finalizar</a>';
                echo '</div>';
                
            } catch (Exception $e) {
                echo '<div class="step error">';
                echo '<h2>❌ Error durante la instalación</h2>';
                echo '<p>Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
                echo '<a href="?step=2" class="btn">Intentar de nuevo</a>';
                echo '</div>';
            }
        }
        
        function showCompletion() {
            ?>
            <div class="step success">
                <h2>🎉 ¡Instalación Completada!</h2>
                <p>El juego de Damas Online se ha instalado exitosamente en tu servidor.</p>
                
                <h3>Próximos pasos:</h3>
                <ol>
                    <li>Elimina el archivo <code>install.php</code> por seguridad</li>
                    <li>Accede al juego en: <a href="index.html" style="color: #32CD32;">index.html</a></li>
                    <li>¡Disfruta jugando!</li>
                </ol>
                
                <div class="warning">
                    <h3>⚠️ Importante:</h3>
                    <p>Por seguridad, elimina este archivo de instalación después de completar la configuración.</p>
                </div>
                
                <a href="index.html" class="btn">Ir al Juego</a>
            </div>
            <?php
        }
        ?>
    </div>
</body>
</html>
