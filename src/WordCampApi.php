<?php

namespace WordCampCompanion;

use WP_Error;

class WordCampApi {
    private const CENTRAL_WORDCAMPS_URL = 'https://central.wordcamp.org/wp-json/wp/v2/wordcamps';
    private const WORDCAMPS_CACHE_KEY = 'wordcamp_companion_wordcamps_v4';
    private const WORDCAMPS_CACHE_TTL = 6 * HOUR_IN_SECONDS;
    private const SCHEDULE_CACHE_TTL = 15 * MINUTE_IN_SECONDS;
    private const COMPANION_CACHE_TTL = 15 * MINUTE_IN_SECONDS;
    private const COMPANION_CACHE_SCHEMA_VERSION = 2;
    private const MAX_COLLECTION_PAGES = 20;

    public function get_wordcamps( bool $force_refresh = false ) {
        if ( ! $force_refresh ) {
            $cached = get_transient( self::WORDCAMPS_CACHE_KEY );
            if ( false !== $cached ) {
                return $cached;
            }
        }

        $response = $this->request_json(
            add_query_arg(
                [
                    'status'   => 'wcpt-scheduled',
                    'per_page' => 100,
                ],
                self::CENTRAL_WORDCAMPS_URL
            )
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        if ( ! is_array( $response['body'] ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_wordcamps',
                __( 'WordCamp Central returned an unexpected response.', 'wordcamp-companion' ),
                [ 'status' => 502 ]
            );
        }

        $wordcamps = [];
        foreach ( $response['body'] as $event ) {
            $event = $this->normalize_wordcamp( is_array( $event ) ? $event : [] );

            if ( empty( $event['title'] ) || 0 !== strpos( $event['title'], 'WordCamp' ) ) {
                continue;
            }

            if ( empty( $event['event_url'] ) || ! $this->is_allowed_wordcamp_url( $event['event_url'] ) ) {
                continue;
            }

            $wordcamps[] = $event;
        }

        usort(
            $wordcamps,
            function ( array $a, array $b ): int {
                return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
            }
        );

        $payload = [
            'wordcamps'  => array_values( $wordcamps ),
            'fetched_at' => time(),
        ];

        set_transient( self::WORDCAMPS_CACHE_KEY, $payload, self::WORDCAMPS_CACHE_TTL );

        return $payload;
    }

    public function get_schedule( string $event_url, bool $force_refresh = false ) {
        $event_url = $this->normalize_event_site_url( $event_url );

        if ( '' === $event_url || ! $this->is_allowed_wordcamp_url( $event_url ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_event_url',
                __( 'Choose a valid WordCamp site URL.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        $cache_key = 'wordcamp_companion_schedule_' . md5( $event_url );
        if ( ! $force_refresh ) {
            $cached = get_transient( $cache_key );
            if ( false !== $cached ) {
                return $cached;
            }
        }

        $rest_index = $this->request_json( trailingslashit( $event_url ) . 'wp-json/' );
        if ( is_wp_error( $rest_index ) ) {
            return $rest_index;
        }

        $index = is_array( $rest_index['body'] ) ? $rest_index['body'] : [];
        if ( ! $this->rest_route_exists( $index, '/wp/v2/sessions' ) ) {
            return new WP_Error(
                'wordcamp_companion_schedule_unavailable',
                __( 'This WordCamp has not published a REST schedule yet.', 'wordcamp-companion' ),
                [ 'status' => 404 ]
            );
        }

        $sessions = $this->get_rest_collection( trailingslashit( $event_url ) . 'wp-json/wp/v2/sessions' );
        if ( is_wp_error( $sessions ) ) {
            return $sessions;
        }

        $speakers = $this->rest_route_exists( $index, '/wp/v2/speakers' )
            ? $this->get_rest_collection( trailingslashit( $event_url ) . 'wp-json/wp/v2/speakers' )
            : [];
        if ( is_wp_error( $speakers ) ) {
            $speakers = [];
        }

        $tracks = $this->rest_route_exists( $index, '/wp/v2/session_track' )
            ? $this->get_rest_collection( trailingslashit( $event_url ) . 'wp-json/wp/v2/session_track' )
            : [];
        if ( is_wp_error( $tracks ) ) {
            $tracks = [];
        }

        $categories = $this->rest_route_exists( $index, '/wp/v2/session_category' )
            ? $this->get_rest_collection( trailingslashit( $event_url ) . 'wp-json/wp/v2/session_category' )
            : [];
        if ( is_wp_error( $categories ) ) {
            $categories = [];
        }

        $normalized_speakers = $this->normalize_speakers( $speakers );
        $normalized_tracks = $this->normalize_terms( $tracks );
        $normalized_categories = $this->normalize_terms( $categories );
        $normalized_sessions = $this->normalize_sessions( $sessions, $normalized_speakers, $normalized_tracks, $normalized_categories );

        $payload = [
            'event_url'   => $event_url,
            'site_name'   => isset( $index['name'] ) ? $this->normalize_text( $index['name'] ) : '',
            'timezone'    => isset( $index['timezone_string'] ) ? sanitize_text_field( $index['timezone_string'] ) : '',
            'sessions'    => $normalized_sessions,
            'speakers'    => array_values( $normalized_speakers ),
            'tracks'      => array_values( $normalized_tracks ),
            'categories'  => array_values( $normalized_categories ),
            'fetched_at'  => time(),
        ];

        set_transient( $cache_key, $payload, self::SCHEDULE_CACHE_TTL );

        return $payload;
    }

    public function get_wordcamp_by_event_url( string $event_url, bool $force_refresh = false ) {
        $event_url = $this->normalize_event_site_url( $event_url );

        if ( '' === $event_url ) {
            return null;
        }

        $wordcamps = $this->get_wordcamps( $force_refresh );
        if ( is_wp_error( $wordcamps ) ) {
            return $wordcamps;
        }

        foreach ( $wordcamps['wordcamps'] ?? [] as $wordcamp ) {
            if ( ! is_array( $wordcamp ) || empty( $wordcamp['event_url'] ) ) {
                continue;
            }

            if ( $this->normalize_event_site_url( (string) $wordcamp['event_url'] ) === $event_url ) {
                return $wordcamp;
            }
        }

        return null;
    }

    public function get_companion_schedule( string $event_url, array $session_ids = [], bool $force_refresh = false, int $cache_version = 0 ) {
        $event_url = $this->normalize_event_site_url( $event_url );
        $session_ids = array_values( array_unique( array_filter( array_map( 'absint', $session_ids ) ) ) );
        sort( $session_ids );

        if ( '' === $event_url || ! $this->is_allowed_wordcamp_url( $event_url ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_event_url',
                __( 'Choose a valid WordCamp site URL.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        $cache_key = 'wordcamp_companion_schedule_companion_' . md5( self::COMPANION_CACHE_SCHEMA_VERSION . ':' . $event_url . ':' . implode( ',', $session_ids ) . ':' . absint( $cache_version ) );
        if ( ! $force_refresh ) {
            $cached = get_transient( $cache_key );
            if ( false !== $cached ) {
                return $cached;
            }
        }

        $context = $this->get_companion_context( $event_url );
        if ( is_wp_error( $context ) ) {
            return $context;
        }

        $start_sessions = $this->get_companion_start_sessions( $context['event_url'] );
        if ( is_wp_error( $start_sessions ) ) {
            return $start_sessions;
        }

        $sessions = $this->get_companion_session_subset( $context['event_url'], $session_ids );
        if ( is_wp_error( $sessions ) ) {
            return $sessions;
        }

        $sessions = $this->merge_sessions_by_id( $start_sessions, $sessions );
        $days = $this->get_companion_day_bounds( $context['event_url'], $context['timezone'] );
        if ( is_wp_error( $days ) ) {
            $days = [];
        }

        $tracks = $this->get_companion_tracks( $context );
        $normalized_tracks = is_wp_error( $tracks ) ? [] : $this->normalize_terms( $tracks );

        $payload = [
            'event_url'  => $context['event_url'],
            'site_name'  => $context['site_name'],
            'timezone'   => $context['timezone'],
            'sessions'   => $this->normalize_companion_sessions( $sessions, $normalized_tracks ),
            'days'       => $days,
            'tracks'     => array_values( $normalized_tracks ),
            'fetched_at' => time(),
        ];

        set_transient( $cache_key, $payload, self::COMPANION_CACHE_TTL );

        return $payload;
    }

    public function get_companion_candidate_schedule( string $event_url, bool $force_refresh = false ) {
        $event_url = $this->normalize_event_site_url( $event_url );

        if ( '' === $event_url || ! $this->is_allowed_wordcamp_url( $event_url ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_event_url',
                __( 'Choose a valid WordCamp site URL.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        $cache_key = 'wordcamp_companion_schedule_candidates_' . md5( $event_url );
        if ( ! $force_refresh ) {
            $cached = get_transient( $cache_key );
            if ( false !== $cached ) {
                return $cached;
            }
        }

        $context = $this->get_companion_context( $event_url );
        if ( is_wp_error( $context ) ) {
            return $context;
        }

        $sessions = $this->get_companion_all_sessions( $context['event_url'] );
        if ( is_wp_error( $sessions ) ) {
            return $sessions;
        }

        $tracks = $this->get_companion_tracks( $context );
        $normalized_tracks = is_wp_error( $tracks ) ? [] : $this->normalize_terms( $tracks );

        $payload = [
            'event_url'  => $context['event_url'],
            'site_name'  => $context['site_name'],
            'timezone'   => $context['timezone'],
            'sessions'   => $this->normalize_companion_sessions( $sessions, $normalized_tracks ),
            'tracks'     => array_values( $normalized_tracks ),
            'fetched_at' => time(),
        ];

        set_transient( $cache_key, $payload, self::COMPANION_CACHE_TTL );

        return $payload;
    }

    private function get_companion_context( string $event_url ) {
        $rest_index = $this->request_json( trailingslashit( $event_url ) . 'wp-json/' );
        if ( is_wp_error( $rest_index ) ) {
            return $rest_index;
        }

        $index = is_array( $rest_index['body'] ) ? $rest_index['body'] : [];
        if ( ! $this->rest_route_exists( $index, '/wp/v2/sessions' ) ) {
            return new WP_Error(
                'wordcamp_companion_schedule_unavailable',
                __( 'This WordCamp has not published a REST schedule yet.', 'wordcamp-companion' ),
                [ 'status' => 404 ]
            );
        }

        return [
            'event_url' => $event_url,
            'index'     => $index,
            'site_name' => isset( $index['name'] ) ? $this->normalize_text( $index['name'] ) : '',
            'timezone'  => isset( $index['timezone_string'] ) ? sanitize_text_field( $index['timezone_string'] ) : '',
        ];
    }

    private function get_companion_start_sessions( string $event_url ) {
        $endpoint = add_query_arg(
            [
                '_fields' => 'id,slug,title,link,meta,session_track',
                'orderby' => 'session_date',
                'order'   => 'asc',
            ],
            trailingslashit( $event_url ) . 'wp-json/wp/v2/sessions'
        );

        return $this->get_rest_page( $endpoint, 1 );
    }

    private function get_companion_session_subset( string $event_url, array $session_ids ) {
        $session_ids = array_values( array_unique( array_filter( array_map( 'absint', $session_ids ) ) ) );

        if ( empty( $session_ids ) ) {
            return [];
        }

        return $this->get_rest_collection(
            add_query_arg(
                [
                    '_fields' => 'id,slug,title,link,meta,session_track',
                    'include' => implode( ',', $session_ids ),
                    'orderby' => 'include',
                ],
                trailingslashit( $event_url ) . 'wp-json/wp/v2/sessions'
            )
        );
    }

    private function get_companion_all_sessions( string $event_url ) {
        return $this->get_rest_collection(
            add_query_arg(
                [
                    '_fields' => 'id,slug,title,link,meta,session_track',
                    'orderby' => 'session_date',
                    'order'   => 'asc',
                ],
                trailingslashit( $event_url ) . 'wp-json/wp/v2/sessions'
            )
        );
    }

    private function get_companion_day_bounds( string $event_url, string $timezone ) {
        $sessions = $this->get_rest_collection(
            add_query_arg(
                [
                    '_fields' => 'id,meta',
                    'orderby' => 'session_date',
                    'order'   => 'asc',
                ],
                trailingslashit( $event_url ) . 'wp-json/wp/v2/sessions'
            )
        );

        if ( is_wp_error( $sessions ) ) {
            return $sessions;
        }

        $days = [];
        foreach ( $sessions as $session ) {
            if ( ! is_array( $session ) || empty( $session['meta'] ) || ! is_array( $session['meta'] ) ) {
                continue;
            }

            $start = $this->normalize_timestamp( $session['meta']['_wcpt_session_time'] ?? null );
            if ( ! $start ) {
                continue;
            }

            $duration = isset( $session['meta']['_wcpt_session_duration'] ) ? absint( $session['meta']['_wcpt_session_duration'] ) : 0;
            $end = $duration ? $start + $duration : $start;
            $day_key = $this->get_day_key( $start, $timezone );

            if ( empty( $days[ $day_key ] ) ) {
                $days[ $day_key ] = [
                    'key'   => $day_key,
                    'start' => $start,
                    'end'   => $end,
                ];
                continue;
            }

            $days[ $day_key ]['start'] = min( $days[ $day_key ]['start'], $start );
            $days[ $day_key ]['end'] = max( $days[ $day_key ]['end'], $end );
        }

        ksort( $days );

        return $days;
    }

    private function get_day_key( int $timestamp, string $timezone ): string {
        try {
            $date = new \DateTime( '@' . $timestamp );
            $date->setTimezone( new \DateTimeZone( $timezone ?: 'UTC' ) );
            return $date->format( 'Y-m-d' );
        } catch ( \Exception $exception ) {
            return gmdate( 'Y-m-d', $timestamp );
        }
    }

    private function get_companion_tracks( array $context ) {
        if ( ! $this->rest_route_exists( $context['index'], '/wp/v2/session_track' ) ) {
            return [];
        }

        return $this->get_rest_collection(
            add_query_arg(
                [
                    '_fields' => 'id,name,slug',
                ],
                trailingslashit( $context['event_url'] ) . 'wp-json/wp/v2/session_track'
            )
        );
    }

    private function merge_sessions_by_id( array ...$session_sets ): array {
        $sessions = [];

        foreach ( $session_sets as $session_set ) {
            foreach ( $session_set as $session ) {
                if ( ! is_array( $session ) || empty( $session['id'] ) ) {
                    continue;
                }

                $sessions[ absint( $session['id'] ) ] = $session;
            }
        }

        return array_values( $sessions );
    }

    public function normalize_event_site_url( string $url ): string {
        $url = trim( $url );

        if ( '' === $url ) {
            return '';
        }

        if ( ! preg_match( '#^https?://#i', $url ) ) {
            $url = 'https://' . ltrim( $url, '/' );
        }

        $parts = wp_parse_url( esc_url_raw( $url ) );
        if ( empty( $parts['host'] ) ) {
            return '';
        }

        $scheme = isset( $parts['scheme'] ) && 'http' === strtolower( $parts['scheme'] ) ? 'http' : 'https';
        $path = isset( $parts['path'] ) ? $parts['path'] : '/';

        return trailingslashit( $scheme . '://' . strtolower( $parts['host'] ) . $path );
    }

    public function is_allowed_wordcamp_url( string $url ): bool {
        $parts = wp_parse_url( $url );

        if ( empty( $parts['host'] ) || empty( $parts['scheme'] ) ) {
            return false;
        }

        $scheme = strtolower( $parts['scheme'] );
        if ( ! in_array( $scheme, [ 'http', 'https' ], true ) ) {
            return false;
        }

        $host = strtolower( $parts['host'] );

        return 'wordcamp.org' === $host || '.wordcamp.org' === substr( $host, -13 );
    }

    private function normalize_wordcamp( array $event ): array {
        $title = isset( $event['title']['rendered'] ) ? $event['title']['rendered'] : '';
        $event_url = '';

        foreach ( [ 'URL', 'Website URL', 'link' ] as $key ) {
            if ( ! empty( $event[ $key ] ) && is_string( $event[ $key ] ) ) {
                $event_url = $this->normalize_event_site_url( $event[ $key ] );
                break;
            }
        }

        return [
            'id'          => isset( $event['id'] ) ? absint( $event['id'] ) : 0,
            'title'       => $this->normalize_text( $title ),
            'location'    => isset( $event['Location'] ) ? $this->normalize_text( $event['Location'] ) : '',
            'start'       => $this->normalize_timestamp( $event['Start Date (YYYY-mm-dd)'] ?? null ),
            'end'         => $this->normalize_timestamp( $event['End Date (YYYY-mm-dd)'] ?? null ),
            'event_url'   => $event_url,
            'timezone'    => isset( $event['Event Timezone'] ) ? sanitize_text_field( $event['Event Timezone'] ) : '',
            'country'     => isset( $event['_host_country_name'] ) ? $this->normalize_text( $event['_host_country_name'] ) : '',
            'coordinates' => $event['_host_coordinates'] ?? null,
            'venue'       => $this->extract_venue_snapshot( $event ),
        ];
    }

    private function extract_venue_snapshot( array $event ): array {
        return [
            'name'        => isset( $event['Venue Name'] ) ? $this->normalize_text( $event['Venue Name'] ) : '',
            'address'     => $this->extract_venue_address( $event ),
            'coordinates' => $event['_venue_coordinates'] ?? null,
        ];
    }

    private function extract_venue_address( array $event ): string {
        if ( isset( $event['Physical Address'] ) && is_string( $event['Physical Address'] ) ) {
            return $this->normalize_text( $event['Physical Address'] );
        }

        $parts = [
            trim(
                implode(
                    ' ',
                    array_filter(
                        [
                            isset( $event['_venue_street_name'] ) ? $this->normalize_text( $event['_venue_street_name'] ) : '',
                            isset( $event['_venue_street_number'] ) ? $this->normalize_text( $event['_venue_street_number'] ) : '',
                        ]
                    )
                )
            ),
            trim(
                implode(
                    ' ',
                    array_filter(
                        [
                            isset( $event['_venue_zip'] ) ? $this->normalize_text( $event['_venue_zip'] ) : '',
                            isset( $event['_venue_city'] ) ? $this->normalize_text( $event['_venue_city'] ) : '',
                        ]
                    )
                )
            ),
            isset( $event['_venue_state'] ) ? $this->normalize_text( $event['_venue_state'] ) : '',
            isset( $event['_venue_country_name'] ) ? $this->normalize_text( $event['_venue_country_name'] ) : '',
        ];

        $structured_address = trim( implode( "\n", array_filter( $parts ) ) );
        if ( '' !== $structured_address ) {
            return $structured_address;
        }

        return '';
    }

    private function normalize_sessions( array $sessions, array $speakers, array $tracks, array $categories ): array {
        $normalized = [];

        foreach ( $sessions as $session ) {
            if ( ! is_array( $session ) ) {
                continue;
            }

            $meta = isset( $session['meta'] ) && is_array( $session['meta'] ) ? $session['meta'] : [];
            $speaker_ids = $this->normalize_id_list( $meta['_wcpt_speaker_id'] ?? [] );
            $track_ids = $this->normalize_id_list( $session['session_track'] ?? [] );
            $category_ids = $this->normalize_id_list( $session['session_category'] ?? [] );
            $start = $this->normalize_timestamp( $meta['_wcpt_session_time'] ?? null );
            $duration = isset( $meta['_wcpt_session_duration'] ) ? absint( $meta['_wcpt_session_duration'] ) : 0;
            $description = isset( $session['content']['rendered'] ) ? $session['content']['rendered'] : ( $session['excerpt']['rendered'] ?? '' );

            $normalized[] = [
                'id'             => isset( $session['id'] ) ? absint( $session['id'] ) : 0,
                'slug'           => isset( $session['slug'] ) ? sanitize_title( $session['slug'] ) : '',
                'title'          => isset( $session['title']['rendered'] ) ? $this->normalize_text( $session['title']['rendered'] ) : '',
                'description'    => $this->compact_text( $description ),
                'url'            => isset( $session['link'] ) ? esc_url_raw( $session['link'] ) : '',
                'start'          => $start,
                'duration'       => $duration,
                'end'            => $start && $duration ? $start + $duration : null,
                'type'           => isset( $meta['_wcpt_session_type'] ) ? sanitize_key( $meta['_wcpt_session_type'] ) : '',
                'speaker_ids'    => $speaker_ids,
                'speaker_names'  => $this->names_for_ids( $speaker_ids, $speakers ),
                'track_ids'      => $track_ids,
                'track_names'    => $this->names_for_ids( $track_ids, $tracks ),
                'category_ids'   => $category_ids,
                'category_names' => $this->names_for_ids( $category_ids, $categories ),
            ];
        }

        usort(
            $normalized,
            function ( array $a, array $b ): int {
                $time_compare = ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
                if ( 0 !== $time_compare ) {
                    return $time_compare;
                }

                return strcasecmp( $a['title'], $b['title'] );
            }
        );

        return array_values( $normalized );
    }

    private function normalize_companion_sessions( array $sessions, array $tracks ): array {
        $normalized = [];

        foreach ( $sessions as $session ) {
            if ( ! is_array( $session ) ) {
                continue;
            }

            $meta = isset( $session['meta'] ) && is_array( $session['meta'] ) ? $session['meta'] : [];
            $track_ids = $this->normalize_id_list( $session['session_track'] ?? [] );
            $start = $this->normalize_timestamp( $meta['_wcpt_session_time'] ?? null );
            $duration = isset( $meta['_wcpt_session_duration'] ) ? absint( $meta['_wcpt_session_duration'] ) : 0;

            $normalized[] = [
                'id'             => isset( $session['id'] ) ? absint( $session['id'] ) : 0,
                'slug'           => isset( $session['slug'] ) ? sanitize_title( $session['slug'] ) : '',
                'title'          => isset( $session['title']['rendered'] ) ? $this->normalize_text( $session['title']['rendered'] ) : '',
                'description'    => '',
                'url'            => isset( $session['link'] ) ? esc_url_raw( $session['link'] ) : '',
                'start'          => $start,
                'duration'       => $duration,
                'end'            => $start && $duration ? $start + $duration : null,
                'type'           => isset( $meta['_wcpt_session_type'] ) ? sanitize_key( $meta['_wcpt_session_type'] ) : '',
                'speaker_ids'    => [],
                'speaker_names'  => [],
                'track_ids'      => $track_ids,
                'track_names'    => $this->names_for_ids( $track_ids, $tracks ),
                'category_ids'   => [],
                'category_names' => [],
            ];
        }

        usort(
            $normalized,
            function ( array $a, array $b ): int {
                $time_compare = ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
                if ( 0 !== $time_compare ) {
                    return $time_compare;
                }

                return strcasecmp( $a['title'], $b['title'] );
            }
        );

        return array_values( $normalized );
    }

    private function normalize_speakers( array $speakers ): array {
        $normalized = [];

        foreach ( $speakers as $speaker ) {
            if ( ! is_array( $speaker ) || empty( $speaker['id'] ) ) {
                continue;
            }

            $id = absint( $speaker['id'] );
            $normalized[ $id ] = [
                'id'   => $id,
                'name' => isset( $speaker['title']['rendered'] ) ? $this->normalize_text( $speaker['title']['rendered'] ) : '',
                'url'  => isset( $speaker['link'] ) ? esc_url_raw( $speaker['link'] ) : '',
            ];
        }

        return $normalized;
    }

    private function normalize_terms( array $terms ): array {
        $normalized = [];

        foreach ( $terms as $term ) {
            if ( ! is_array( $term ) || empty( $term['id'] ) ) {
                continue;
            }

            $id = absint( $term['id'] );
            $normalized[ $id ] = [
                'id'   => $id,
                'name' => isset( $term['name'] ) ? $this->normalize_text( $term['name'] ) : '',
                'slug' => isset( $term['slug'] ) ? sanitize_title( $term['slug'] ) : '',
            ];
        }

        return $normalized;
    }

    private function names_for_ids( array $ids, array $items ): array {
        $names = [];

        foreach ( $ids as $id ) {
            if ( isset( $items[ $id ]['name'] ) && '' !== $items[ $id ]['name'] ) {
                $names[] = $items[ $id ]['name'];
            }
        }

        return $names;
    }

    private function get_rest_collection( string $endpoint_url ) {
        $items = [];
        $page = 1;
        $total_pages = null;

        while ( $page <= self::MAX_COLLECTION_PAGES ) {
            $response = $this->request_json(
                add_query_arg(
                    [
                        'per_page' => 100,
                        'page'     => $page,
                    ],
                    $endpoint_url
                )
            );

            if ( is_wp_error( $response ) ) {
                return $response;
            }

            if ( ! is_array( $response['body'] ) || ! $this->is_list_array( $response['body'] ) ) {
                return new WP_Error(
                    'wordcamp_companion_invalid_collection',
                    __( 'The WordCamp site returned an unexpected schedule response.', 'wordcamp-companion' ),
                    [ 'status' => 502 ]
                );
            }

            $items = array_merge( $items, $response['body'] );

            if ( null === $total_pages ) {
                $header = wp_remote_retrieve_header( $response['response'], 'x-wp-totalpages' );
                $total_pages = $header ? absint( $header ) : 0;
            }

            if ( $total_pages > 0 && $page >= $total_pages ) {
                break;
            }

            if ( count( $response['body'] ) < 100 ) {
                break;
            }

            $page++;
        }

        return $items;
    }

    private function get_rest_page( string $endpoint_url, int $per_page ) {
        $response = $this->request_json(
            add_query_arg(
                [
                    'per_page' => max( 1, min( 100, $per_page ) ),
                    'page'     => 1,
                ],
                $endpoint_url
            )
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        if ( ! is_array( $response['body'] ) || ! $this->is_list_array( $response['body'] ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_collection',
                __( 'The WordCamp site returned an unexpected schedule response.', 'wordcamp-companion' ),
                [ 'status' => 502 ]
            );
        }

        return $response['body'];
    }

    private function request_json( string $url ) {
        $response = wp_remote_get(
            $url,
            [
                'timeout'     => 15,
                'redirection' => 3,
                'user-agent'  => 'WordCamp Companion/' . ( defined( 'WORDCAMP_COMPANION_VERSION' ) ? WORDCAMP_COMPANION_VERSION : '1.0.0' ) . '; ' . home_url( '/' ),
            ]
        );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $status = wp_remote_retrieve_response_code( $response );
        if ( $status < 200 || $status >= 300 ) {
            return new WP_Error(
                'wordcamp_companion_remote_error',
                sprintf(
                    /* translators: %d: HTTP response status code. */
                    __( 'The WordCamp site returned HTTP %d.', 'wordcamp-companion' ),
                    $status
                ),
                [ 'status' => 502 ]
            );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( JSON_ERROR_NONE !== json_last_error() ) {
            return new WP_Error(
                'wordcamp_companion_invalid_json',
                __( 'The WordCamp site returned invalid JSON.', 'wordcamp-companion' ),
                [ 'status' => 502 ]
            );
        }

        return [
            'body'     => $body,
            'response' => $response,
        ];
    }

    private function rest_route_exists( array $index, string $route ): bool {
        return isset( $index['routes'] ) && is_array( $index['routes'] ) && isset( $index['routes'][ $route ] );
    }

    private function is_list_array( array $items ): bool {
        if ( [] === $items ) {
            return true;
        }

        return array_keys( $items ) === range( 0, count( $items ) - 1 );
    }

    private function normalize_id_list( $ids ): array {
        if ( ! is_array( $ids ) ) {
            $ids = [ $ids ];
        }

        $ids = array_map( 'absint', $ids );
        $ids = array_filter(
            $ids,
            function ( int $id ): bool {
                return $id > 0;
            }
        );

        return array_values( array_unique( $ids ) );
    }

    private function normalize_timestamp( $value ): ?int {
        if ( null === $value || '' === $value ) {
            return null;
        }

        if ( is_numeric( $value ) ) {
            $timestamp = (int) $value;
            return $timestamp > 0 ? $timestamp : null;
        }

        if ( is_string( $value ) ) {
            $timestamp = strtotime( $value );
            return false !== $timestamp ? $timestamp : null;
        }

        return null;
    }

    private function normalize_text( $value ): string {
        if ( ! is_scalar( $value ) ) {
            return '';
        }

        return trim( wp_strip_all_tags( html_entity_decode( (string) $value, ENT_QUOTES, 'UTF-8' ) ) );
    }

    private function compact_text( $value ): string {
        $text = preg_replace( '/\s+/', ' ', $this->normalize_text( $value ) );

        if ( strlen( $text ) <= 1200 ) {
            return $text;
        }

        return substr( $text, 0, 1197 ) . '...';
    }
}
