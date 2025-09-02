<?php
/**
 * Server-specific configuration for Damas Funer
 * This file should be customized for your hosting environment
 */

// Database configuration for your hosting provider
// Replace these values with your actual database credentials

// For most hosting providers, the database host is usually:
// - localhost (for shared hosting)
// - mysql.yourdomain.com (for some providers)
// - A specific IP address provided by your host

define('DB_HOST', 'localhost');
define('DB_NAME', '6774344_damas_online');
define('DB_USER', '6774344_damas_online'); // Usually the same as database name
define('DB_PASS', 'your_database_password_here'); // Replace with your actual password

// Alternative configuration for different hosting providers
// Uncomment and modify the lines below if needed:

// For cPanel hosting:
// define('DB_HOST', 'localhost');
// define('DB_NAME', 'your_cpanel_username_damas_online');
// define('DB_USER', 'your_cpanel_username_damas_online');
// define('DB_PASS', 'your_database_password');

// For some hosting providers that use different hosts:
// define('DB_HOST', 'mysql.yourdomain.com');
// define('DB_NAME', '6774344_damas_online');
// define('DB_USER', '6774344_damas_online');
// define('DB_PASS', 'your_database_password');

// Set environment variables for the database class
$_ENV['DB_HOST'] = DB_HOST;
$_ENV['DB_NAME'] = DB_NAME;
$_ENV['DB_USER'] = DB_USER;
$_ENV['DB_PASS'] = DB_PASS;

// Log configuration for debugging
error_log("Server config loaded - Host: " . DB_HOST . ", DB: " . DB_NAME . ", User: " . DB_USER);
?>
