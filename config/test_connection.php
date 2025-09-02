<?php
/**
 * Test database connection with different credentials
 * This file helps you find the correct database credentials
 */

// Test different credential combinations
$testConfigs = [
    [
        'name' => 'damasfuner user',
        'host' => 'localhost',
        'db' => '6774344_damas_online',
        'user' => 'damasfuner',
        'pass' => '' // Try empty password first
    ],
    [
        'name' => 'damasfuner with common password',
        'host' => 'localhost',
        'db' => '6774344_damas_online',
        'user' => 'damasfuner',
        'pass' => 'damasfuner'
    ],
    [
        'name' => 'damasfuner with database name as password',
        'host' => 'localhost',
        'db' => '6774344_damas_online',
        'user' => 'damasfuner',
        'pass' => '6774344_damas_online'
    ],
    [
        'name' => 'Database name as user',
        'host' => 'localhost',
        'db' => '6774344_damas_online',
        'user' => '6774344_damas_online',
        'pass' => ''
    ],
    [
        'name' => 'Database name as user with same password',
        'host' => 'localhost',
        'db' => '6774344_damas_online',
        'user' => '6774344_damas_online',
        'pass' => '6774344_damas_online'
    ]
];

echo "<h1>Database Connection Test</h1>";
echo "<p>Testing different credential combinations...</p>";

foreach ($testConfigs as $config) {
    echo "<h3>Testing: {$config['name']}</h3>";
    echo "<p>Host: {$config['host']}, DB: {$config['db']}, User: {$config['user']}</p>";
    
    try {
        $pdo = new PDO(
            "mysql:host={$config['host']};dbname={$config['db']};charset=utf8",
            $config['user'],
            $config['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        
        echo "<p style='color: green; font-weight: bold;'>✅ SUCCESS! This configuration works!</p>";
        echo "<p>You can use these credentials in your server_config.php:</p>";
        echo "<pre>";
        echo "define('DB_HOST', '{$config['host']}');\n";
        echo "define('DB_NAME', '{$config['db']}');\n";
        echo "define('DB_USER', '{$config['user']}');\n";
        echo "define('DB_PASS', '{$config['pass']}');\n";
        echo "</pre>";
        
        // Test if tables exist
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "<p>Tables found: " . implode(', ', $tables) . "</p>";
        
        break; // Stop testing once we find a working configuration
        
    } catch (PDOException $e) {
        echo "<p style='color: red;'>❌ Failed: " . $e->getMessage() . "</p>";
    }
    
    echo "<hr>";
}

echo "<h2>Instructions:</h2>";
echo "<ol>";
echo "<li>If any test succeeded above, copy those credentials to config/server_config.php</li>";
echo "<li>If no test succeeded, you may need to create the database user or check your hosting panel</li>";
echo "<li>Delete this test file after finding the correct credentials</li>";
echo "</ol>";
?>
