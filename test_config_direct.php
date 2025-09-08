<?php
/**
 * Direct configuration test
 */

echo "=== CONFIGURATION TEST ===\n";

// Test 1: Check if server_config.php exists and is readable
echo "1. Checking server_config.php...\n";
$serverConfigPath = 'config/server_config.php';
if (file_exists($serverConfigPath)) {
    echo "   ✅ server_config.php exists\n";
    if (is_readable($serverConfigPath)) {
        echo "   ✅ server_config.php is readable\n";
    } else {
        echo "   ❌ server_config.php is not readable\n";
    }
} else {
    echo "   ❌ server_config.php does not exist\n";
}

// Test 2: Load server_config.php directly
echo "\n2. Loading server_config.php directly...\n";
try {
    require_once $serverConfigPath;
    echo "   ✅ server_config.php loaded successfully\n";
    echo "   DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED') . "\n";
    echo "   DB_NAME: " . (defined('DB_NAME') ? DB_NAME : 'NOT DEFINED') . "\n";
    echo "   DB_USER: " . (defined('DB_USER') ? DB_USER : 'NOT DEFINED') . "\n";
    echo "   DB_PASS: " . (defined('DB_PASS') ? '***SET***' : 'NOT DEFINED') . "\n";
} catch (Exception $e) {
    echo "   ❌ Error loading server_config.php: " . $e->getMessage() . "\n";
}

// Test 3: Load database.php
echo "\n3. Loading database.php...\n";
try {
    require_once 'config/database.php';
    echo "   ✅ database.php loaded successfully\n";
} catch (Exception $e) {
    echo "   ❌ Error loading database.php: " . $e->getMessage() . "\n";
}

// Test 4: Check final configuration values
echo "\n4. Final configuration values:\n";
echo "   DB_HOST: " . (defined('DB_HOST') ? DB_HOST : 'NOT DEFINED') . "\n";
echo "   DB_NAME: " . (defined('DB_NAME') ? DB_NAME : 'NOT DEFINED') . "\n";
echo "   DB_USER: " . (defined('DB_USER') ? DB_USER : 'NOT DEFINED') . "\n";
echo "   DB_PASS: " . (defined('DB_PASS') ? '***SET***' : 'NOT DEFINED') . "\n";

// Test 5: Test database connection
echo "\n5. Testing database connection...\n";
try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "   ✅ Database connection successful!\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n";
}

echo "\n=== END TEST ===\n";
?>

