<?php
/**
 * Simple database connection test
 */

echo "Testing database configuration...\n";

// Load database configuration
require_once 'config/database.php';

echo "Configuration loaded.\n";
echo "DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED') . "\n";
echo "DB_NAME: " . (defined('DB_NAME') ? DB_NAME : 'NOT DEFINED') . "\n";
echo "DB_USER: " . (defined('DB_USER') ? DB_USER : 'NOT DEFINED') . "\n";
echo "DB_PASS: " . (defined('DB_PASS') ? '***SET***' : 'NOT DEFINED') . "\n";

echo "\nTesting connection...\n";

try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "✅ SUCCESS: Database connection established!\n";
    
    // Test a simple query
    $stmt = $conn->query("SELECT VERSION() as version");
    $result = $stmt->fetch();
    echo "MySQL Version: " . $result['version'] . "\n";
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
?>
