<?php
/**
 * Test database connection script
 * This script will help diagnose database connection issues
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Database Connection Test</h2>";

// Load the database configuration
require_once 'config/database.php';

echo "<h3>Configuration Details:</h3>";
echo "<p><strong>Host:</strong> " . ($_ENV['DB_HOST'] ?? 'Not set') . "</p>";
echo "<p><strong>Database:</strong> " . ($_ENV['DB_NAME'] ?? 'Not set') . "</p>";
echo "<p><strong>Username:</strong> " . ($_ENV['DB_USER'] ?? 'Not set') . "</p>";
echo "<p><strong>Password:</strong> " . (isset($_ENV['DB_PASS']) ? '***SET***' : 'Not set') . "</p>";

echo "<h3>Connection Test:</h3>";

try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "<p style='color: green;'>✅ <strong>SUCCESS:</strong> Database connection established successfully!</p>";
    
    // Test a simple query
    $stmt = $conn->query("SELECT VERSION() as version");
    $result = $stmt->fetch();
    echo "<p><strong>MySQL Version:</strong> " . $result['version'] . "</p>";
    
    // Check if our tables exist
    $tables = ['games', 'players', 'chat_messages', 'moves', 'system_config'];
    echo "<h4>Table Status:</h4>";
    foreach ($tables as $table) {
        $stmt = $conn->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "<p style='color: green;'>✅ Table '$table' exists</p>";
        } else {
            echo "<p style='color: red;'>❌ Table '$table' does not exist</p>";
        }
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ <strong>ERROR:</strong> " . $e->getMessage() . "</p>";
    
    // Additional debugging information
    echo "<h4>Debug Information:</h4>";
    echo "<p><strong>Error Type:</strong> " . get_class($e) . "</p>";
    echo "<p><strong>Error Code:</strong> " . $e->getCode() . "</p>";
    
    // Check if it's a PDO error
    if ($e instanceof PDOException) {
        echo "<p><strong>PDO Error Code:</strong> " . $e->getCode() . "</p>";
        echo "<p><strong>PDO Error Info:</strong> " . print_r($e->errorInfo, true) . "</p>";
    }
}

echo "<h3>Environment Variables:</h3>";
echo "<pre>";
print_r($_ENV);
echo "</pre>";

echo "<h3>Server Information:</h3>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>PDO Available:</strong> " . (extension_loaded('pdo') ? 'Yes' : 'No') . "</p>";
echo "<p><strong>PDO MySQL Available:</strong> " . (extension_loaded('pdo_mysql') ? 'Yes' : 'No') . "</p>";
?>
