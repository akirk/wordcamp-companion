<?php

namespace WordCampCompanion;

use WpApp\BaseApp;
use WpApp\WpApp;

defined( 'ABSPATH' ) || exit;

class App extends BaseApp {
    private WordCampApi $api;
    private PlannerRepository $repository;
    private RestController $rest_controller;
    private Abilities $abilities;

    public function __construct() {
        $this->api = new WordCampApi();
        $this->repository = new PlannerRepository( $this->api );
        $this->rest_controller = new RestController( $this->api, $this->repository );
        $this->abilities = new Abilities( $this->api, $this->repository );

        $this->app = new WpApp(
            $this->get_template_dir(),
            $this->get_url_path(),
            [
                'require_login' => true,
                'app_name'      => 'WordCamp Companion',
                'my_apps'       => true,
            ]
        );

        add_action( 'init', [ PlannerRepository::class, 'register_content_types' ] );
        add_action( 'rest_api_init', [ $this->rest_controller, 'register_routes' ] );
        add_action( 'wp_app_before_render', [ $this, 'redirect_empty_companion_to_wordcamp_selector' ], 10, 2 );
        add_action( 'wp_app_before_render', [ $this, 'enqueue_assets' ], 10, 2 );
    }

    protected function get_url_path(): string {
        return 'wordcamp-companion';
    }

    protected function get_template_dir(): string {
        return dirname( __DIR__ ) . '/templates';
    }

    protected function setup_database(): void {
        // Saved sessions are stored as authored CPT entries; remote API payloads are cached in transients.
    }

    protected function setup_routes(): void {
        $this->app->route( '', 'index.php' );
        $this->app->route( 'notes', 'notes.php' );
        $this->app->route( 'plan-your', 'plan-your.php' );
        $this->app->route( 'plan-your/{wordcamp}', 'plan.php' );
        $this->app->route( 'settings', 'settings.php' );
    }

    protected function setup_menu(): void {
        $this->app->add_menu_item(
            'wordcamp-companion-home',
            'Companion',
            home_url( '/' . $this->get_url_path() . '/' )
        );
        $this->app->add_menu_item(
            'wordcamp-companion-wordcamps',
            'Upcoming WordCamps',
            home_url( '/' . $this->get_url_path() . '/plan-your/' )
        );
        $this->app->add_menu_item(
            'wordcamp-companion-notes',
            'Notes',
            home_url( '/' . $this->get_url_path() . '/notes/' )
        );
        $this->app->add_menu_item(
            'wordcamp-companion-settings',
            'Settings',
            home_url( '/' . $this->get_url_path() . '/settings/' )
        );
    }

    public function activate(): void {
        PlannerRepository::register_content_types();
        flush_rewrite_rules();
    }

    public function deactivate(): void {
        flush_rewrite_rules();
    }

    public function redirect_empty_companion_to_wordcamp_selector( string $template_path, array $route_data ): void {
        if ( ! $this->is_companion_template( $template_path ) ) {
            return;
        }

        if ( 'index.php' !== basename( $template_path ) || ( $route_data['pattern'] ?? null ) !== '' ) {
            return;
        }

        $wcc_share = $this->get_wcc_query_parameter();
        if ( '' !== $wcc_share ) {
            return;
        }

        $plan = $this->repository->get_plan( get_current_user_id() );
        if ( ! empty( $plan['selected_event_url'] ) ) {
            return;
        }

        wp_safe_redirect( home_url( '/' . $this->get_url_path() . '/plan-your/' ) );
        exit;
    }

    private function get_wcc_query_parameter(): string {
        $query_string = isset( $_SERVER['QUERY_STRING'] ) ? (string) wp_unslash( $_SERVER['QUERY_STRING'] ) : '';
        if ( '' !== $query_string && preg_match( '/(?:^|&)wcc1=([^&]+)/', $query_string, $matches ) ) {
            return sanitize_text_field( rawurldecode( $matches[1] ) );
        }

        if ( isset( $_GET['wcc1'] ) && is_scalar( $_GET['wcc1'] ) ) {
            return sanitize_text_field( wp_unslash( (string) $_GET['wcc1'] ) );
        }

        return '';
    }

    public function enqueue_assets( string $template_path, array $route_data ): void {
        if ( ! $this->is_companion_template( $template_path ) ) {
            return;
        }

        $plugin_file = dirname( __DIR__ ) . '/wordcamp-companion.php';
        $css_path = dirname( __DIR__ ) . '/assets/app.css';
        $version = defined( 'WORDCAMP_COMPANION_VERSION' ) ? WORDCAMP_COMPANION_VERSION : '1.0.0';
        $asset_version = defined( 'WORDCAMP_COMPANION_ASSET_VERSION' ) ? WORDCAMP_COMPANION_ASSET_VERSION : $version;

        wp_app_enqueue_style(
            'dashicons',
            includes_url( 'css/dashicons.min.css' ),
            [],
            get_bloginfo( 'version' )
        );

        if ( file_exists( $css_path ) ) {
            wp_app_enqueue_style(
                'wordcamp-companion',
                plugins_url( 'assets/app.css', $plugin_file ),
                [],
                $asset_version . '-' . filemtime( $css_path )
            );
        }

        add_action(
            'wp_app_head_scripts',
            function () use ( $asset_version ): void {
                echo '<script id="wordcamp-companion-config-inline-js">' . "\n";
                echo 'window.WordCampCompanionConfig = ' . wp_json_encode( $this->get_client_config( $asset_version ) ) . ';' . "\n";
                echo '</script>' . "\n";
            },
            0
        );

        $script_assets = [
            'wordcamp-companion-state'           => 'assets/js/state.js',
            'wordcamp-companion-i18n'            => 'assets/js/i18n.js',
            'wordcamp-companion-dom'             => 'assets/js/dom.js',
            'wordcamp-companion-api'             => 'assets/js/api.js',
            'wordcamp-companion-qr'              => 'assets/js/qr.js',
            'wordcamp-companion-events'          => 'assets/js/events.js',
            'wordcamp-companion-schedule-model'  => 'assets/js/schedule-model.js',
            'wordcamp-companion-companion-model' => 'assets/js/companion-model.js',
            'wordcamp-companion-render'          => 'assets/js/render.js',
            'wordcamp-companion-debug-clock'     => 'assets/js/debug-clock.js',
            'wordcamp-companion'                 => 'assets/js/bootstrap.js',
        ];
        $previous_script_handle = null;

        foreach ( $script_assets as $handle => $relative_path ) {
            $script_path = dirname( __DIR__ ) . '/' . $relative_path;
            if ( ! file_exists( $script_path ) ) {
                continue;
            }

            wp_app_enqueue_script(
                $handle,
                plugins_url( $relative_path, $plugin_file ),
                $previous_script_handle ? [ $previous_script_handle ] : [],
                $asset_version . '-' . filemtime( $script_path )
            );

            $previous_script_handle = $handle;
        }
    }

    private function is_companion_template( string $template_path ): bool {
        $template_dir = wp_normalize_path( realpath( $this->get_template_dir() ) ?: $this->get_template_dir() );
        $template_path = wp_normalize_path( realpath( $template_path ) ?: $template_path );

        return 0 === strpos( $template_path, trailingslashit( $template_dir ) );
    }

    private function get_client_config( string $asset_version ): array {
        return [
            'restUrl'                  => rest_url( 'wordcamp-companion/v1/' ),
            'wpRestUrl'                => rest_url( 'wp/v2/' ),
            'nonce'                    => wp_create_nonce( 'wp_rest' ),
            'loginUrl'                 => wp_login_url( home_url( '/' . $this->get_url_path() . '/' ) ),
            'appUrl'                   => home_url( '/' . $this->get_url_path() . '/' ),
            'notesUrl'                 => home_url( '/' . $this->get_url_path() . '/notes/' ),
            'planBaseUrl'              => home_url( '/' . $this->get_url_path() . '/plan-your/' ),
            'planUrl'                  => home_url( '/' . $this->get_url_path() . '/plan-your/' ),
            'shareUrl'                 => 'https://my.wordpress.net/?myapps-i=wordcamp-companion',
            'routeWordcampSlug'        => sanitize_title( (string) get_query_var( 'wordcamp' ) ),
            'assetVersion'             => $asset_version,
            'timeFormat'               => get_option( 'time_format' ),
            'uses24HourTime'           => ! preg_match( '/[ga]/i', (string) get_option( 'time_format' ) ),
            'settings'                 => UserSettings::get_settings( get_current_user_id() ),
            'initialPlan'              => $this->repository->get_plan( get_current_user_id() ),
            'savedSessionRestBase'     => PlannerRepository::POST_REST_BASE,
            'wordcampTaxonomyRestBase' => PlannerRepository::TAXONOMY_REST_BASE,
        ];
    }
}
