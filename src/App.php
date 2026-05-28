<?php

namespace WordCampCompanion;

use WpApp\BaseApp;
use WpApp\WpApp;

class App extends BaseApp {
    private WordCampApi $api;
    private PlannerRepository $repository;
    private RestController $rest_controller;

    public function __construct() {
        $this->api = new WordCampApi();
        $this->repository = new PlannerRepository( $this->api );
        $this->rest_controller = new RestController( $this->api, $this->repository );

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
        $this->enqueue_assets();
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
        $this->app->route( 'plan-your', 'plan-your.php' );
        $this->app->route( 'plan-your/{wordcamp}', 'plan.php' );
    }

    protected function setup_menu(): void {
        $this->app->add_menu_item(
            'wordcamp-companion-home',
            'companion',
            home_url( '/' . $this->get_url_path() . '/' )
        );
        $this->app->add_menu_item(
            'wordcamp-companion-wordcamps',
            'wordcamps',
            home_url( '/' . $this->get_url_path() . '/plan-your/' )
        );
    }

    public function activate(): void {
        PlannerRepository::register_content_types();
        flush_rewrite_rules();
    }

    public function deactivate(): void {
        flush_rewrite_rules();
    }

    private function enqueue_assets(): void {
        $plugin_file = dirname( __DIR__ ) . '/wordcamp-companion.php';
        $css_path = dirname( __DIR__ ) . '/assets/app.css';
        $js_path = dirname( __DIR__ ) . '/assets/app.js';
        $version = defined( 'WORDCAMP_COMPANION_VERSION' ) ? WORDCAMP_COMPANION_VERSION : '1.0.0';
        $asset_version = defined( 'WORDCAMP_COMPANION_ASSET_VERSION' ) ? WORDCAMP_COMPANION_ASSET_VERSION : $version;

        if ( file_exists( $css_path ) ) {
            wp_app_enqueue_style(
                'wordcamp-companion',
                plugins_url( 'assets/app.css', $plugin_file ),
                [],
                $asset_version . '-' . filemtime( $css_path )
            );
        }

        add_action(
            'wp_app_body_close',
            function (): void {
                echo '<script id="wordcamp-companion-config-inline-js">' . "\n";
                echo 'window.WordCampCompanionConfig = ' . wp_json_encode(
                    [
                        'restUrl'                 => rest_url( 'wordcamp-companion/v1/' ),
                        'wpRestUrl'               => rest_url( 'wp/v2/' ),
                        'nonce'                   => wp_create_nonce( 'wp_rest' ),
                        'loginUrl'                => wp_login_url( home_url( '/' . $this->get_url_path() . '/' ) ),
                        'appUrl'                  => home_url( '/' . $this->get_url_path() . '/' ),
                        'planBaseUrl'             => home_url( '/' . $this->get_url_path() . '/plan-your/' ),
                        'planUrl'                 => home_url( '/' . $this->get_url_path() . '/plan-your/' ),
                        'routeWordcampSlug'       => sanitize_title( (string) get_query_var( 'wordcamp' ) ),
                        'assetVersion'            => $asset_version,
                        'timeFormat'              => get_option( 'time_format' ),
                        'uses24HourTime'          => ! preg_match( '/[ga]/i', (string) get_option( 'time_format' ) ),
                        'initialPlan'             => is_user_logged_in() ? $this->repository->get_plan( get_current_user_id() ) : null,
                        'savedSessionRestBase'    => PlannerRepository::POST_REST_BASE,
                        'wordcampTaxonomyRestBase' => PlannerRepository::TAXONOMY_REST_BASE,
                    ]
                ) . ';' . "\n";
                echo '</script>' . "\n";
            }
        );

        if ( file_exists( $js_path ) ) {
            wp_app_enqueue_script(
                'wordcamp-companion',
                plugins_url( 'assets/app.js', $plugin_file ),
                [],
                $asset_version . '-' . filemtime( $js_path )
            );
        } else {
            wp_app_enqueue_script(
                'wordcamp-companion',
                plugins_url( 'assets/app.js', $plugin_file ),
                [],
                $version
            );
        }
    }
}
