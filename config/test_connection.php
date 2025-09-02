<?php
/**
 * Test database connection with different credentials
 * This file helps you find the correct database credentials
 */

// Test different credential combinations
$testConfigs = [
    [
        'name' => 'damasfuner user with localhost',
        'host' => 'localhost',
        'db' => '6774344_damas_online',
        'user' => 'damasfuner',
        'pass' => '' // Try empty password first
    ],
    [
        'name' => 'damasfuner user with common hosting host',
        'host' => 'mysql.yourdomain.com', // Replace with your actual domain
        'db' => '6774344_damas_online',
        'user' => 'damasfuner',
        'pass' => ''
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
echo "<li><strong>If any test succeeded above:</strong> Copy those credentials to config/server_config.php</li>";
echo "<li><strong>If no test succeeded:</strong> You may need to:";
echo "<ul>";
echo "<li>Check your hosting control panel for the correct database host (may not be localhost!)</li>";
echo "<li>Verify the database name and username</li>";
echo "<li>Check if the database user has the correct password</li>";
echo "<li>Ensure the database exists and the user has proper permissions</li>";
echo "</ul>";
echo "</li>";
echo "<li><strong>Common hosting database hosts:</strong>";
echo "<ul>";
echo "<li>localhost (for shared hosting)</li>";
echo "<li>mysql.yourdomain.com</li>";
echo "<li>A specific IP address provided by your host</li>";
echo "<li>Check your hosting panel for the exact host</li>";
echo "</ul>";
echo "</li>";
echo "<li><strong>Security:</strong> Delete this test file after finding the correct credentials</li>";
echo "</ol>";

echo "<h2>Manual Configuration:</h2>";
echo "<p>If the automatic tests don't work, manually edit config/server_config.php with the values from your hosting control panel:</p>";
echo "<pre>";
echo "define('DB_HOST', 'your_actual_host_from_hosting');\n";
echo "define('DB_NAME', 'your_actual_database_name');\n";
echo "define('DB_USER', 'your_actual_username');\n";
echo "define('DB_PASS', 'your_actual_password');\n";
echo "</pre>";
?>
