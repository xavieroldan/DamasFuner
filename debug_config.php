<?php
/**
 * Debug configuration loading
 */

echo "<h2>Configuration Debug</h2>";

// Load database configuration
require_once 'config/database.php';

echo "<h3>Configuration Values:</h3>";
echo "<p><strong>DB_HOST:</strong> " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED') . "</p>";
echo "<p><strong>DB_NAME:</strong> " . (defined('DB_NAME') ? DB_NAME : 'NOT DEFINED') . "</p>";
echo "<p><strong>DB_USER:</strong> " . (defined('DB_USER') ? DB_USER : 'NOT DEFINED') . "</p>";
echo "<p><strong>DB_PASS:</strong> " . (defined('DB_PASS') ? '***SET***' : 'NOT DEFINED') . "</p>";

echo "<h3>Environment Variables:</h3>";
echo "<p><strong>DB_HOST:</strong> " . ($_ENV['DB_HOST'] ?? 'NOT SET') . "</p>";
echo "<p><strong>DB_NAME:</strong> " . ($_ENV['DB_NAME'] ?? 'NOT SET') . "</p>";
echo "<p><strong>DB_USER:</strong> " . ($_ENV['DB_USER'] ?? 'NOT SET') . "</p>";
echo "<p><strong>DB_PASS:</strong> " . (isset($_ENV['DB_PASS']) ? '***SET***' : 'NOT SET') . "</p>";

echo "<h3>Test Connection:</h3>";
try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "<p style='color: green;'>✅ Connection successful!</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Connection failed: " . $e->getMessage() . "</p>";
}
?>
