<?php

namespace WordCampCompanion;

use WP_Error;
use WP_Query;

class PlannerRepository {
    public const POST_TYPE = 'wcc_session';
    public const TAXONOMY = 'wcc_wordcamp';
    public const POST_REST_BASE = 'wordcamp-companion-sessions';
    public const TAXONOMY_REST_BASE = 'wordcamp-companion-wordcamps';

    private const SELECTED_TERM_META_KEY = 'wordcamp_companion_selected_wordcamp';
    private const EVENT_META_KEY = 'wcc_event';
    private const EVENT_URL_META_KEY = 'wcc_event_url';
    private const SCHEDULE_DAYS_META_KEY = 'wcc_schedule_days';
    private const SCHEDULE_TIMEZONE_META_KEY = 'wcc_schedule_timezone';
    private const SCHEDULE_SITE_NAME_META_KEY = 'wcc_schedule_site_name';

    private WordCampApi $api;

    public function __construct( WordCampApi $api ) {
        $this->api = $api;
    }

    public static function register_content_types(): void {
        register_taxonomy(
            self::TAXONOMY,
            [ self::POST_TYPE ],
            [
                'labels'            => [
                    'name'          => __( 'WordCamps', 'wordcamp-companion' ),
                    'singular_name' => __( 'WordCamp', 'wordcamp-companion' ),
                ],
                'public'            => false,
                'show_ui'           => true,
                'show_admin_column' => true,
                'show_in_rest'      => true,
                'rest_base'         => self::TAXONOMY_REST_BASE,
                'hierarchical'      => false,
                'capabilities'      => [
                    'manage_terms' => 'read',
                    'edit_terms'   => 'read',
                    'delete_terms' => 'do_not_allow',
                    'assign_terms' => 'read',
                ],
            ]
        );

        register_post_type(
            self::POST_TYPE,
            [
                'labels'          => [
                    'name'          => __( 'Saved Sessions', 'wordcamp-companion' ),
                    'singular_name' => __( 'Saved Session', 'wordcamp-companion' ),
                ],
                'public'          => false,
                'show_ui'         => true,
                'show_in_menu'    => true,
                'show_in_rest'    => true,
                'rest_base'       => self::POST_REST_BASE,
                'supports'        => [ 'title', 'author', 'custom-fields' ],
                'taxonomies'      => [ self::TAXONOMY ],
                'capability_type' => [ 'wcc_session', 'wcc_sessions' ],
                'map_meta_cap'    => true,
                'capabilities'    => [
                    'create_posts'           => 'read',
                    'edit_posts'             => 'read',
                    'edit_published_posts'   => 'read',
                    'publish_posts'          => 'read',
                    'delete_posts'           => 'read',
                    'delete_published_posts' => 'read',
                    'read_private_posts'     => 'read',
                ],
            ]
        );

        self::register_meta();
    }

    public function get_plan( int $user_id ): array {
        $term_id = absint( get_user_meta( $user_id, self::SELECTED_TERM_META_KEY, true ) );
        if ( ! $term_id || ! term_exists( $term_id, self::TAXONOMY ) ) {
            return $this->empty_plan();
        }

        $event = $this->get_event_from_term( $term_id );
        if ( empty( $event['event_url'] ) ) {
            return $this->empty_plan();
        }

        $event_url = $event['event_url'];
        $saved_sessions = $this->get_saved_session_posts( $user_id, $term_id );
        $saved_session_ids = array_values(
            array_filter(
                array_map(
                    function ( array $session ): int {
                        return absint( $session['session_id'] ?? 0 );
                    },
                    $saved_sessions
                )
            )
        );
        $updated_at = 0;
        foreach ( $saved_sessions as $session ) {
            $updated_at = max( $updated_at, absint( $session['updated_at'] ?? 0 ) );
        }

        return [
            'selected_event_url'      => $event_url,
            'selected_wordcamp_term_id' => $term_id,
            'saved_session_posts'     => $saved_sessions,
            'plans'                   => [
                $event_url => [
                    'event'             => $event,
                    'wordcamp_term_id'  => $term_id,
                    'saved_session_ids' => $saved_session_ids,
                    'saved_sessions'    => $saved_sessions,
                    'updated_at'        => $updated_at,
                ],
            ],
        ];
    }

    public function set_selected_event( int $user_id, array $event ) {
        $event = $this->sanitize_event_snapshot( $event );

        if ( empty( $event['event_url'] ) || ! $this->api->is_allowed_wordcamp_url( $event['event_url'] ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_event',
                __( 'Choose a valid WordCamp from the event list.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        $term_id = $this->ensure_wordcamp_term( $event );
        if ( is_wp_error( $term_id ) ) {
            return $term_id;
        }

        update_user_meta( $user_id, self::SELECTED_TERM_META_KEY, $term_id );

        return $this->get_plan( $user_id );
    }

    public function store_schedule_metadata( string $event_url, array $schedule, array $days ): void {
        $event_url = $this->api->normalize_event_site_url( $event_url );
        if ( '' === $event_url || ! $this->api->is_allowed_wordcamp_url( $event_url ) ) {
            return;
        }

        $term_id = $this->get_wordcamp_term_id_by_event_url( $event_url );
        if ( ! $term_id ) {
            $term_id = $this->ensure_wordcamp_term(
                [
                    'event_url' => $event_url,
                    'title'     => isset( $schedule['site_name'] ) ? (string) $schedule['site_name'] : $event_url,
                    'timezone'  => isset( $schedule['timezone'] ) ? (string) $schedule['timezone'] : '',
                ]
            );
        }

        if ( is_wp_error( $term_id ) || ! $term_id ) {
            return;
        }

        update_term_meta( $term_id, self::SCHEDULE_DAYS_META_KEY, wp_json_encode( $this->sanitize_schedule_days( $days ) ) );

        if ( ! empty( $schedule['timezone'] ) ) {
            update_term_meta( $term_id, self::SCHEDULE_TIMEZONE_META_KEY, sanitize_text_field( (string) $schedule['timezone'] ) );
        }

        if ( ! empty( $schedule['site_name'] ) ) {
            update_term_meta( $term_id, self::SCHEDULE_SITE_NAME_META_KEY, sanitize_text_field( (string) $schedule['site_name'] ) );
        }
    }

    private static function register_meta(): void {
        $auth_callback = function (): bool {
            return is_user_logged_in() && current_user_can( 'read' );
        };

        $integer_meta = [
            'wcc_session_id',
            'wcc_session_start',
            'wcc_session_end',
            'wcc_session_duration',
            'wcc_wordcamp_term_id',
        ];

        foreach ( $integer_meta as $meta_key ) {
            register_post_meta(
                self::POST_TYPE,
                $meta_key,
                [
                    'single'            => true,
                    'type'              => 'integer',
                    'show_in_rest'      => true,
                    'sanitize_callback' => 'absint',
                    'auth_callback'     => $auth_callback,
                ]
            );
        }

        $string_meta = [
            'wcc_event_url',
            'wcc_session_url',
            'wcc_session_type',
            'wcc_speaker_names',
            'wcc_track_names',
            'wcc_category_names',
            'wcc_session_snapshot',
        ];

        foreach ( $string_meta as $meta_key ) {
            register_post_meta(
                self::POST_TYPE,
                $meta_key,
                [
                    'single'            => true,
                    'type'              => 'string',
                    'show_in_rest'      => true,
                    'sanitize_callback' => 'sanitize_textarea_field',
                    'auth_callback'     => $auth_callback,
                ]
            );
        }

        register_term_meta(
            self::TAXONOMY,
            self::EVENT_URL_META_KEY,
            [
                'single'            => true,
                'type'              => 'string',
                'show_in_rest'      => true,
                'sanitize_callback' => 'esc_url_raw',
                'auth_callback'     => $auth_callback,
            ]
        );

        register_term_meta(
            self::TAXONOMY,
            self::EVENT_META_KEY,
            [
                'single'            => true,
                'type'              => 'string',
                'show_in_rest'      => true,
                'sanitize_callback' => 'sanitize_textarea_field',
                'auth_callback'     => $auth_callback,
            ]
        );

        register_term_meta(
            self::TAXONOMY,
            self::SCHEDULE_DAYS_META_KEY,
            [
                'single'            => true,
                'type'              => 'string',
                'show_in_rest'      => true,
                'sanitize_callback' => 'sanitize_textarea_field',
                'auth_callback'     => $auth_callback,
            ]
        );

        foreach ( [ self::SCHEDULE_TIMEZONE_META_KEY, self::SCHEDULE_SITE_NAME_META_KEY ] as $meta_key ) {
            register_term_meta(
                self::TAXONOMY,
                $meta_key,
                [
                    'single'            => true,
                    'type'              => 'string',
                    'show_in_rest'      => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'auth_callback'     => $auth_callback,
                ]
            );
        }
    }

    private function empty_plan(): array {
        return [
            'selected_event_url'       => '',
            'selected_wordcamp_term_id' => 0,
            'saved_session_posts'      => [],
            'plans'                    => [],
        ];
    }

    private function ensure_wordcamp_term( array $event ) {
        $event_url = $event['event_url'];
        $term_id = $this->get_wordcamp_term_id_by_event_url( $event_url );
        $term_name = $event['title'] ?: $event_url;
        $term_slug = $this->get_wordcamp_term_slug( $event_url );

        if ( ! $term_id ) {
            $created = wp_insert_term(
                $term_name,
                self::TAXONOMY,
                [
                    'slug' => $term_slug,
                ]
            );

            if ( is_wp_error( $created ) ) {
                return $created;
            }

            $term_id = absint( $created['term_id'] ?? 0 );
        } else {
            wp_update_term(
                $term_id,
                self::TAXONOMY,
                [
                    'name' => $term_name,
                    'slug' => $term_slug,
                ]
            );
        }

        update_term_meta( $term_id, self::EVENT_URL_META_KEY, $event_url );
        update_term_meta( $term_id, self::EVENT_META_KEY, wp_slash( wp_json_encode( $event, JSON_UNESCAPED_UNICODE ) ) );

        return $term_id;
    }

    private function get_wordcamp_term_id_by_event_url( string $event_url ): int {
        $terms = get_terms(
            [
                'taxonomy'   => self::TAXONOMY,
                'hide_empty' => false,
                'number'     => 1,
                'fields'     => 'ids',
                'meta_query' => [
                    [
                        'key'   => self::EVENT_URL_META_KEY,
                        'value' => $event_url,
                    ],
                ],
            ]
        );

        if ( is_wp_error( $terms ) || empty( $terms ) ) {
            $term = get_term_by( 'slug', $this->get_wordcamp_term_slug( $event_url ), self::TAXONOMY );
            return $term && ! is_wp_error( $term ) ? absint( $term->term_id ) : 0;
        }

        return absint( $terms[0] );
    }

    private function get_wordcamp_term_slug( string $event_url ): string {
        return 'wordcamp-' . substr( md5( $event_url ), 0, 16 );
    }

    private function get_event_from_term( int $term_id ): array {
        $event = [];
        $raw_event = get_term_meta( $term_id, self::EVENT_META_KEY, true );

        if ( is_string( $raw_event ) && '' !== $raw_event ) {
            $decoded = json_decode( $raw_event, true );
            if ( is_array( $decoded ) ) {
                $event = $decoded;
            }
        }

        if ( empty( $event['event_url'] ) ) {
            $event['event_url'] = get_term_meta( $term_id, self::EVENT_URL_META_KEY, true );
        }

        $schedule_days = $this->get_schedule_days_from_term( $term_id );
        if ( $schedule_days ) {
            $event['schedule_days'] = $schedule_days;
        }

        $schedule_timezone = (string) get_term_meta( $term_id, self::SCHEDULE_TIMEZONE_META_KEY, true );
        if ( '' !== $schedule_timezone ) {
            $event['schedule_timezone'] = sanitize_text_field( $schedule_timezone );
        }

        $site_name = (string) get_term_meta( $term_id, self::SCHEDULE_SITE_NAME_META_KEY, true );
        if ( '' !== $site_name ) {
            $event['site_name'] = sanitize_text_field( $site_name );
        }

        return $this->sanitize_event_snapshot( $event );
    }

    private function get_schedule_days_from_term( int $term_id ): array {
        $raw_days = get_term_meta( $term_id, self::SCHEDULE_DAYS_META_KEY, true );
        if ( ! is_string( $raw_days ) || '' === $raw_days ) {
            return [];
        }

        $decoded = json_decode( $raw_days, true );

        return is_array( $decoded ) ? $this->sanitize_schedule_days( $decoded ) : [];
    }

    private function sanitize_schedule_days( array $days ): array {
        $sanitized = [];

        foreach ( $days as $key => $day ) {
            if ( ! is_array( $day ) ) {
                continue;
            }

            $day_key = isset( $day['key'] ) ? sanitize_text_field( (string) $day['key'] ) : sanitize_text_field( (string) $key );
            $start = isset( $day['start'] ) ? absint( $day['start'] ) : 0;
            $end = isset( $day['end'] ) ? absint( $day['end'] ) : 0;

            if ( '' === $day_key || ! $start ) {
                continue;
            }

            $sanitized[ $day_key ] = [
                'key'   => $day_key,
                'start' => $start,
                'end'   => $end ?: $start,
            ];
        }

        ksort( $sanitized );

        return $sanitized;
    }

    private function get_saved_session_posts( int $user_id, int $term_id ): array {
        $query = new WP_Query(
            [
                'post_type'      => self::POST_TYPE,
                'post_status'    => [ 'publish', 'private' ],
                'author'         => $user_id,
                'posts_per_page' => -1,
                'orderby'        => 'meta_value_num',
                'meta_key'       => 'wcc_session_start',
                'order'          => 'ASC',
                'tax_query'      => [
                    [
                        'taxonomy' => self::TAXONOMY,
                        'field'    => 'term_id',
                        'terms'    => [ $term_id ],
                    ],
                ],
                'fields'         => 'ids',
            ]
        );

        return array_values(
            array_filter(
                array_map(
                    function ( int $post_id ): array {
                        return $this->compact_saved_session_post( $post_id );
                    },
                    array_map( 'absint', $query->posts )
                )
            )
        );
    }

    private function compact_saved_session_post( int $post_id ): array {
        $session_id = absint( get_post_meta( $post_id, 'wcc_session_id', true ) );
        if ( ! $session_id ) {
            return [];
        }

        return [
            'post_id'        => $post_id,
            'session_id'     => $session_id,
            'event_url'      => esc_url_raw( (string) get_post_meta( $post_id, 'wcc_event_url', true ) ),
            'title'          => get_the_title( $post_id ),
            'url'            => esc_url_raw( (string) get_post_meta( $post_id, 'wcc_session_url', true ) ),
            'start'          => absint( get_post_meta( $post_id, 'wcc_session_start', true ) ),
            'end'            => absint( get_post_meta( $post_id, 'wcc_session_end', true ) ),
            'duration'       => absint( get_post_meta( $post_id, 'wcc_session_duration', true ) ),
            'type'           => sanitize_key( (string) get_post_meta( $post_id, 'wcc_session_type', true ) ),
            'speaker_names'  => $this->split_meta_list( (string) get_post_meta( $post_id, 'wcc_speaker_names', true ) ),
            'track_names'    => $this->split_meta_list( (string) get_post_meta( $post_id, 'wcc_track_names', true ) ),
            'category_names' => $this->split_meta_list( (string) get_post_meta( $post_id, 'wcc_category_names', true ) ),
            'updated_at'     => absint( get_post_modified_time( 'U', true, $post_id ) ),
        ];
    }

    private function split_meta_list( string $value ): array {
        if ( '' === $value ) {
            return [];
        }

        return array_values(
            array_filter(
                array_map(
                    'sanitize_text_field',
                    preg_split( '/\r\n|\r|\n/', $value )
                )
            )
        );
    }

    private function sanitize_event_snapshot( array $event ): array {
        $event_url = isset( $event['event_url'] ) && is_string( $event['event_url'] )
            ? $this->api->normalize_event_site_url( $event['event_url'] )
            : '';

        return [
            'id'          => isset( $event['id'] ) ? absint( $event['id'] ) : 0,
            'title'       => isset( $event['title'] ) ? sanitize_text_field( $event['title'] ) : '',
            'location'    => isset( $event['location'] ) ? sanitize_text_field( $event['location'] ) : '',
            'start'       => isset( $event['start'] ) ? absint( $event['start'] ) : null,
            'end'         => isset( $event['end'] ) ? absint( $event['end'] ) : null,
            'event_url'   => $event_url,
            'timezone'    => isset( $event['timezone'] ) ? sanitize_text_field( $event['timezone'] ) : '',
            'schedule_timezone' => isset( $event['schedule_timezone'] ) ? sanitize_text_field( $event['schedule_timezone'] ) : '',
            'site_name'   => isset( $event['site_name'] ) ? sanitize_text_field( $event['site_name'] ) : '',
            'schedule_days' => isset( $event['schedule_days'] ) && is_array( $event['schedule_days'] ) ? $this->sanitize_schedule_days( $event['schedule_days'] ) : [],
            'country'     => isset( $event['country'] ) ? sanitize_text_field( $event['country'] ) : '',
            'coordinates' => $event['coordinates'] ?? null,
            'venue'       => $this->sanitize_venue_snapshot( isset( $event['venue'] ) && is_array( $event['venue'] ) ? $event['venue'] : [] ),
        ];
    }

    private function sanitize_venue_snapshot( array $venue ): array {
        return [
            'name'        => isset( $venue['name'] ) ? sanitize_text_field( $venue['name'] ) : '',
            'address'     => $this->get_venue_address( $venue ),
            'coordinates' => $venue['coordinates'] ?? null,
        ];
    }

    private function get_venue_address( array $venue ): string {
        if ( isset( $venue['address'] ) && is_string( $venue['address'] ) ) {
            return sanitize_textarea_field( $venue['address'] );
        }

        if ( isset( $venue['physical_address'] ) && is_string( $venue['physical_address'] ) ) {
            return sanitize_textarea_field( $venue['physical_address'] );
        }

        $street = trim(
            implode(
                ' ',
                array_filter(
                    [
                        isset( $venue['street_name'] ) ? sanitize_text_field( (string) $venue['street_name'] ) : '',
                        isset( $venue['street_number'] ) ? sanitize_text_field( (string) $venue['street_number'] ) : '',
                    ]
                )
            )
        );
        $city = trim(
            implode(
                ' ',
                array_filter(
                    [
                        isset( $venue['zip'] ) ? sanitize_text_field( (string) $venue['zip'] ) : '',
                        isset( $venue['city'] ) ? sanitize_text_field( (string) $venue['city'] ) : '',
                    ]
                )
            )
        );
        $structured_address = sanitize_textarea_field(
            implode(
                "\n",
                array_filter(
                    [
                        $street,
                        $city,
                        isset( $venue['state'] ) ? sanitize_text_field( (string) $venue['state'] ) : '',
                        isset( $venue['country'] ) ? sanitize_text_field( (string) $venue['country'] ) : '',
                    ]
                )
            )
        );

        if ( '' !== $structured_address ) {
            return $structured_address;
        }

        return '';
    }
}
