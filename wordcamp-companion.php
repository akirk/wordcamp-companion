<?php
/**
 * Plugin Name: WordCamp Companion
 * Description: Plan your WordCamp attendance and save sessions from event schedules.
 * Version: 1.0.0
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * Author: Alex Kirk
 * Author URI: https://alex.kirk.at/
 * License: GPL2
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wordcamp-companion
 */

namespace WordCampCompanion;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'WORDCAMP_COMPANION_VERSION', '1.0.0' );
define( 'WORDCAMP_COMPANION_ASSET_VERSION', '20260529.16' );

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
