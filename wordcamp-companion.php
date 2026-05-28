<?php
/**
 * Plugin Name: WordCamp Companion
 * Description: Plan your WordCamp attendance and save sessions from event schedules.
 * Version: 1.0.1
 * Author: Alex Kirk
 * Text Domain: wordcamp-companion
 * Requires PHP: 7.4
 */

namespace WordCampCompanion;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'WORDCAMP_COMPANION_VERSION', '1.0.1' );
define( 'WORDCAMP_COMPANION_ASSET_VERSION', '20260528.40' );

require_once __DIR__ . '/vendor/autoload.php';

// Autoloader for plugin classes.
spl_autoload_register( function( $class ) {
    $prefix = 'WordCampCompanion\\';
    $len = strlen( $prefix );
    if ( strncmp( $prefix, $class, $len ) !== 0 ) {
        return;
    }
    $file = __DIR__ . '/src/' . str_replace( '\\', '/', substr( $class, $len ) ) . '.php';
    if ( file_exists( $file ) ) {
        require $file;
    }
} );

add_action( 'plugins_loaded', function() {
    $app = new App();
    $app->init();
} );

register_activation_hook( __FILE__, function() {
    $app = new App();
    $app->activate();
} );

register_deactivation_hook( __FILE__, function() {
    $app = new App();
    $app->deactivate();
} );
