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
// - Check your hosting control panel for the correct database host

define('DB_HOST', 'PMYSQL111.dns-servicio.com:3306'); // IMPORTANT: Replace with the actual host provided by your hosting
define('DB_NAME', '6774344_damas_online');
define('DB_USER', 'damasfuner'); // The actual username from the error
define('DB_PASS', 'Rcja1234.'); // Replace with the correct password for damasfuner user

// Set environment variables for the database class
$_ENV['DB_HOST'] = DB_HOST;
$_ENV['DB_NAME'] = DB_NAME;
$_ENV['DB_USER'] = DB_USER;
$_ENV['DB_PASS'] = DB_PASS;

// Log configuration for debugging
error_log("Server config loaded - Host: " . DB_HOST . ", DB: " . DB_NAME . ", User: " . DB_USER);
?>
