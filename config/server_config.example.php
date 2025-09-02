<?php
/**
 * Example server configuration for Damas Funer
 * Copy this file to server_config.php and update with your actual credentials
 */

// Database configuration for your hosting provider
// Replace these values with your actual database credentials

// For most hosting providers, the database host is usually:
// - localhost (for shared hosting)
// - mysql.yourdomain.com (for some providers)
// - A specific IP address provided by your host
// - Check your hosting control panel for the correct database host

define('DB_HOST', 'your_database_host_here'); // IMPORTANT: Replace with the actual host provided by your hosting
define('DB_NAME', '6774344_damas_online');
define('DB_USER', 'your_db_user'); // Replace with your actual database username
define('DB_PASS', 'your_actual_password_here'); // Replace with your actual database password

// Alternative configuration for different hosting providers
// Uncomment and modify the lines below if needed:

// For cPanel hosting:
// define('DB_HOST', 'localhost'); // Usually localhost for cPanel
// define('DB_NAME', 'your_cpanel_username_damas_online');
// define('DB_USER', 'your_cpanel_username_damas_online');
// define('DB_PASS', 'your_database_password');

// For some hosting providers that use different hosts:
// define('DB_HOST', 'mysql.yourdomain.com'); // Check your hosting panel
// define('DB_NAME', '6774344_damas_online');
// define('DB_USER', '6774344_damas_online');
// define('DB_PASS', 'your_database_password');

// IMPORTANT: Always check your hosting control panel for the correct:
// - Database host (may not be localhost!)
// - Database name (usually provided by hosting)
// - Username (usually same as database name or provided separately)
// - Password (set by you or provided by hosting)

// Set environment variables for the database class
$_ENV['DB_HOST'] = DB_HOST;
$_ENV['DB_NAME'] = DB_NAME;
$_ENV['DB_USER'] = DB_USER;
$_ENV['DB_PASS'] = DB_PASS;

// Log configuration for debugging
error_log("Server config loaded - Host: " . DB_HOST . ", DB: " . DB_NAME . ", User: " . DB_USER);
?>

