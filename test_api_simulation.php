<?php
/**
 * Simulate API call to test database connection
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== API SIMULATION TEST ===\n";

// Simulate the same loading as the API files
echo "1. Loading database configuration...\n";
require_once 'config/database.php';

echo "2. Configuration values after loading:\n";
echo "   DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED') . "\n";
echo "   DB_NAME: " . (defined('DB_NAME') ? DB_NAME : 'NOT DEFINED') . "\n";
echo "   DB_USER: " . (defined('DB_USER') ? DB_USER : 'NOT DEFINED') . "\n";
echo "   DB_PASS: " . (defined('DB_PASS') ? '***SET***' : 'NOT DEFINED') . "\n";

echo "\n3. Testing database connection...\n";
try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "   ✅ SUCCESS: Database connection established!\n";
    
    // Test a simple query
    $stmt = $conn->query("SELECT VERSION() as version");
    $result = $stmt->fetch();
    echo "   MySQL Version: " . $result['version'] . "\n";
    
    // Test if our tables exist
    $tables = ['games', 'players', 'chat_messages', 'moves', 'system_config'];
    echo "\n4. Checking tables:\n";
    foreach ($tables as $table) {
        $stmt = $conn->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "   ✅ Table '$table' exists\n";
        } else {
            echo "   ❌ Table '$table' does not exist\n";
        }
    }
    
} catch (Exception $e) {
    echo "   ❌ ERROR: " . $e->getMessage() . "\n";
    echo "   Error type: " . get_class($e) . "\n";
    if ($e instanceof PDOException) {
        echo "   PDO Error Code: " . $e->getCode() . "\n";
        echo "   PDO Error Info: " . print_r($e->errorInfo, true) . "\n";
    }
}

echo "\n=== END TEST ===\n";
?>
