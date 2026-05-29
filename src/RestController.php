<?php

namespace WordCampCompanion;

use WP_Error;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

class RestController {
    private const NAMESPACE = 'wordcamp-companion/v1';
    private const SUBSTANTIAL_OVERLAP_SECONDS = 20 * MINUTE_IN_SECONDS;

    private WordCampApi $api;
    private PlannerRepository $repository;

    public function __construct( WordCampApi $api, PlannerRepository $repository ) {
        $this->api = $api;
        $this->repository = $repository;
    }

    public function register_routes(): void {
        register_rest_route(
            self::NAMESPACE,
            '/wordcamps',
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [ $this, 'get_wordcamps' ],
                    'permission_callback' => [ $this, 'can_read' ],
                    'args'                => [
                        'refresh' => [
                            'sanitize_callback' => 'rest_sanitize_boolean',
                        ],
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/schedule',
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [ $this, 'get_schedule' ],
                    'permission_callback' => [ $this, 'can_read' ],
                    'args'                => [
                        'event_url' => [
                            'sanitize_callback' => 'esc_url_raw',
                        ],
                        'refresh'   => [
                            'sanitize_callback' => 'rest_sanitize_boolean',
                        ],
                        'day_key'   => [
                            'sanitize_callback' => 'sanitize_text_field',
                        ],
                        'start'     => [
                            'sanitize_callback' => 'absint',
                        ],
                        'end'       => [
                            'sanitize_callback' => 'absint',
                        ],
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/companion',
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [ $this, 'get_companion' ],
                    'permission_callback' => [ $this, 'can_read' ],
                    'args'                => [
                        'event_url' => [
                            'sanitize_callback' => 'esc_url_raw',
                        ],
                        'refresh'   => [
                            'sanitize_callback' => 'rest_sanitize_boolean',
                        ],
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/gap-candidates',
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [ $this, 'get_gap_candidates' ],
                    'permission_callback' => [ $this, 'can_read' ],
                    'args'                => [
                        'event_url' => [
                            'sanitize_callback' => 'esc_url_raw',
                        ],
                        'refresh'   => [
                            'sanitize_callback' => 'rest_sanitize_boolean',
                        ],
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/plan',
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [ $this, 'get_plan' ],
                    'permission_callback' => [ $this, 'can_read' ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/plan/event',
            [
                [
                    'methods'             => 'POST',
                    'callback'            => [ $this, 'save_event' ],
                    'permission_callback' => [ $this, 'can_read' ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/plan/companion-visibility',
            [
                [
                    'methods'             => 'POST',
                    'callback'            => [ $this, 'save_companion_visibility' ],
                    'permission_callback' => [ $this, 'can_read' ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/settings',
            [
                [
                    'methods'             => 'GET',
                    'callback'            => [ $this, 'get_settings' ],
                    'permission_callback' => [ $this, 'can_read' ],
                ],
                [
                    'methods'             => 'POST',
                    'callback'            => [ $this, 'save_settings' ],
                    'permission_callback' => [ $this, 'can_read' ],
                ],
            ]
        );

    }

    public function can_read(): bool {
        return is_user_logged_in() && current_user_can( 'read' );
    }

    public function get_wordcamps( WP_REST_Request $request ) {
        $wordcamps = $this->api->get_wordcamps( (bool) $request->get_param( 'refresh' ) );

        if ( is_wp_error( $wordcamps ) ) {
            return $wordcamps;
        }

        return rest_ensure_response( $wordcamps );
    }

    public function get_schedule( WP_REST_Request $request ) {
        $event_url = $this->get_event_url_from_request( $request );

        if ( '' === $event_url ) {
            return new WP_Error(
                'wordcamp_companion_missing_event_url',
                __( 'Select a WordCamp before loading its schedule.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        $schedule = $this->api->get_schedule( $event_url, (bool) $request->get_param( 'refresh' ) );

        if ( is_wp_error( $schedule ) ) {
            return $schedule;
        }

        $schedule['days'] = $this->get_schedule_days( $schedule );
        $schedule['mode'] = 'full';
        $this->repository->store_schedule_metadata( $event_url, $schedule, $schedule['days'] );

        return rest_ensure_response( $schedule );
    }

    public function get_companion( WP_REST_Request $request ) {
        $event_url = $this->get_event_url_from_request( $request );

        if ( '' === $event_url ) {
            return new WP_Error(
                'wordcamp_companion_missing_event_url',
                __( 'Select a WordCamp before loading your companion view.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        return rest_ensure_response( $this->get_local_companion_schedule( $this->repository->get_plan( get_current_user_id() ), $event_url ) );
    }

    public function get_gap_candidates( WP_REST_Request $request ) {
        $event_url = $this->get_event_url_from_request( $request );

        if ( '' === $event_url ) {
            return new WP_Error(
                'wordcamp_companion_missing_event_url',
                __( 'Select a WordCamp before loading session choices.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        $plan = $this->repository->get_plan( get_current_user_id() );
        $saved_session_ids = $this->get_saved_session_ids( $plan, $event_url );
        $schedule = $this->api->get_companion_candidate_schedule( $event_url, (bool) $request->get_param( 'refresh' ) );

        if ( is_wp_error( $schedule ) ) {
            return $schedule;
        }

        $days = $this->get_schedule_days( $schedule );
        $this->repository->store_schedule_metadata( $event_url, $schedule, $days );
        $requested_gap = $this->get_requested_gap( $request );
        $gaps = $requested_gap
            ? $this->get_gap_candidates_for_requested_gap( $schedule, $saved_session_ids, $requested_gap )
            : $this->get_gap_candidates_for_saved_sessions( $schedule, $saved_session_ids );

        return rest_ensure_response(
            [
                'event_url'  => $schedule['event_url'] ?? '',
                'timezone'   => $schedule['timezone'] ?? '',
                'days'       => $days,
                'gaps'       => $gaps,
                'mode'       => 'gap-candidates',
                'fetched_at' => $schedule['fetched_at'] ?? time(),
            ]
        );
    }

    private function get_event_url_from_request( WP_REST_Request $request ): string {
        $event_url = (string) $request->get_param( 'event_url' );

        if ( '' === $event_url ) {
            $plan = $this->repository->get_plan( get_current_user_id() );
            $event_url = $plan['selected_event_url'];
        }

        return $event_url;
    }

    private function get_saved_session_ids( array $plan, string $event_url ): array {
        if ( empty( $plan['plans'][ $event_url ]['saved_session_ids'] ) || ! is_array( $plan['plans'][ $event_url ]['saved_session_ids'] ) ) {
            return [];
        }

        return array_map( 'absint', $plan['plans'][ $event_url ]['saved_session_ids'] );
    }

    private function get_requested_gap( WP_REST_Request $request ): array {
        $start = absint( $request->get_param( 'start' ) );
        $end = absint( $request->get_param( 'end' ) );
        $day_key = sanitize_text_field( (string) $request->get_param( 'day_key' ) );

        if ( ! $day_key || ! $start || ! $end || $end <= $start ) {
            return [];
        }

        return [
            'day_key' => $day_key,
            'start'   => $start,
            'end'     => $end,
        ];
    }

    private function get_local_companion_schedule( array $plan, string $event_url ): array {
        $event_plan = isset( $plan['plans'][ $event_url ] ) && is_array( $plan['plans'][ $event_url ] ) ? $plan['plans'][ $event_url ] : [];
        $event = isset( $event_plan['event'] ) && is_array( $event_plan['event'] ) ? $event_plan['event'] : [ 'event_url' => $event_url ];
        $saved_sessions = isset( $event_plan['saved_sessions'] ) && is_array( $event_plan['saved_sessions'] ) ? $event_plan['saved_sessions'] : [];
        $sessions = [];

        foreach ( $saved_sessions as $session_post ) {
            if ( ! is_array( $session_post ) ) {
                continue;
            }

            $session = $this->saved_session_post_to_session( $session_post );
            if ( ! empty( $session['id'] ) ) {
                $sessions[] = $session;
            }
        }

        usort(
            $sessions,
            function ( array $a, array $b ): int {
                return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
            }
        );

        return [
            'event_url'   => $event_url,
            'event'       => $event,
            'site_name'   => isset( $event['site_name'] ) ? sanitize_text_field( (string) $event['site_name'] ) : '',
            'timezone'    => isset( $event['schedule_timezone'] ) && $event['schedule_timezone'] ? sanitize_text_field( (string) $event['schedule_timezone'] ) : ( isset( $event['timezone'] ) ? sanitize_text_field( (string) $event['timezone'] ) : '' ),
            'days'        => isset( $event['schedule_days'] ) && is_array( $event['schedule_days'] ) ? $event['schedule_days'] : [],
            'gaps'        => [],
            'gaps_loaded' => false,
            'sessions'    => $sessions,
            'mode'        => 'companion',
            'local'       => true,
            'fetched_at'  => time(),
        ];
    }

    private function saved_session_post_to_session( array $session_post ): array {
        return [
            'id'             => isset( $session_post['session_id'] ) ? absint( $session_post['session_id'] ) : 0,
            'title'          => isset( $session_post['title'] ) ? sanitize_text_field( (string) $session_post['title'] ) : '',
            'url'            => isset( $session_post['url'] ) ? esc_url_raw( (string) $session_post['url'] ) : '',
            'start'          => isset( $session_post['start'] ) ? absint( $session_post['start'] ) : null,
            'duration'       => isset( $session_post['duration'] ) ? absint( $session_post['duration'] ) : 0,
            'end'            => isset( $session_post['end'] ) ? absint( $session_post['end'] ) : null,
            'type'           => isset( $session_post['type'] ) ? sanitize_key( (string) $session_post['type'] ) : '',
            'speaker_names'  => isset( $session_post['speaker_names'] ) && is_array( $session_post['speaker_names'] ) ? array_map( 'sanitize_text_field', $session_post['speaker_names'] ) : [],
            'track_names'    => isset( $session_post['track_names'] ) && is_array( $session_post['track_names'] ) ? array_map( 'sanitize_text_field', $session_post['track_names'] ) : [],
            'category_names' => isset( $session_post['category_names'] ) && is_array( $session_post['category_names'] ) ? array_map( 'sanitize_text_field', $session_post['category_names'] ) : [],
        ];
    }

    private function get_plan_updated_at( array $plan, string $event_url ): int {
        return isset( $plan['plans'][ $event_url ]['updated_at'] ) ? absint( $plan['plans'][ $event_url ]['updated_at'] ) : 0;
    }

    private function get_compact_companion_schedule( array $schedule, array $saved_session_ids, array $event = [] ): array {
        $sessions = isset( $schedule['sessions'] ) && is_array( $schedule['sessions'] ) ? $schedule['sessions'] : [];
        $saved_session_ids = array_values( array_unique( array_filter( array_map( 'absint', $saved_session_ids ) ) ) );
        $saved_lookup = array_fill_keys( $saved_session_ids, true );
        $timezone = isset( $schedule['timezone'] ) ? (string) $schedule['timezone'] : '';
        $saved_days = [];
        $first_sessions_by_day = [];
        $last_sessions_by_day = [];
        $compact_sessions = [];

        foreach ( $sessions as $session ) {
            if ( empty( $session['start'] ) || empty( $session['id'] ) ) {
                continue;
            }

            $day_key = $this->get_schedule_day_key( (int) $session['start'], $timezone );

            if ( empty( $first_sessions_by_day[ $day_key ] ) || (int) $session['start'] < (int) $first_sessions_by_day[ $day_key ]['start'] ) {
                $first_sessions_by_day[ $day_key ] = $session;
            }

            $session_end = ! empty( $session['end'] ) ? (int) $session['end'] : (int) $session['start'];
            $last_session_end = ! empty( $last_sessions_by_day[ $day_key ]['end'] ) ? (int) $last_sessions_by_day[ $day_key ]['end'] : 0;
            if ( empty( $last_sessions_by_day[ $day_key ] ) || $session_end > $last_session_end ) {
                $last_sessions_by_day[ $day_key ] = $session;
            }

            if ( isset( $saved_lookup[ (int) $session['id'] ] ) ) {
                $saved_days[ $day_key ] = true;
                $compact_sessions[ (int) $session['id'] ] = $this->compact_session( $session );
            }
        }

        if ( $saved_session_ids ) {
            $saved_day_bounds = $this->get_saved_day_bounds( $sessions, $saved_lookup, $timezone );

            foreach ( $sessions as $session ) {
                if ( empty( $session['start'] ) || empty( $session['id'] ) || empty( $session['type'] ) || 'custom' !== $session['type'] ) {
                    continue;
                }

                $day_key = $this->get_schedule_day_key( (int) $session['start'], $timezone );
                if ( isset( $saved_days[ $day_key ] ) && $this->is_between_saved_sessions( $session, $saved_day_bounds[ $day_key ] ?? null ) ) {
                    $compact = $this->compact_session( $session );
                    $compact['auto'] = true;
                    $compact_sessions[ (int) $session['id'] ] = $compact;
                }
            }
        } else {
            foreach ( $first_sessions_by_day as $session ) {
                $compact = $this->compact_session( $session );
                $compact['arrival_anchor'] = true;
                $compact_sessions[ (int) $session['id'] ] = $compact;
            }
        }

        usort(
            $compact_sessions,
            function ( array $a, array $b ): int {
                return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
            }
        );

        return [
            'event_url'  => $schedule['event_url'] ?? '',
            'event'      => $event,
            'site_name'  => $schedule['site_name'] ?? '',
            'timezone'   => $schedule['timezone'] ?? '',
            'days'       => isset( $schedule['days'] ) && is_array( $schedule['days'] ) ? $schedule['days'] : $this->compact_days( $first_sessions_by_day, $last_sessions_by_day ),
            'gaps'       => [],
            'gaps_loaded' => false,
            'sessions'   => array_values( $compact_sessions ),
            'mode'       => 'companion',
            'fetched_at' => $schedule['fetched_at'] ?? time(),
        ];
    }

    private function get_companion_event( array $plan, string $event_url, bool $force_refresh ): array {
        $event = isset( $plan['plans'][ $event_url ]['event'] ) && is_array( $plan['plans'][ $event_url ]['event'] )
            ? $plan['plans'][ $event_url ]['event']
            : [];
        $central_event = $this->api->get_wordcamp_by_event_url( $event_url, $force_refresh );

        if ( is_array( $central_event ) && $central_event ) {
            return array_replace_recursive( $event, $central_event );
        }

        return $event;
    }

    private function get_gap_candidates_for_saved_sessions( array $schedule, array $saved_session_ids ): array {
        $sessions = isset( $schedule['sessions'] ) && is_array( $schedule['sessions'] ) ? $schedule['sessions'] : [];
        $saved_lookup = array_fill_keys( array_map( 'absint', $saved_session_ids ), true );
        $timezone = isset( $schedule['timezone'] ) ? (string) $schedule['timezone'] : '';

        return $this->compact_gaps( $sessions, $saved_lookup, $timezone );
    }

    private function get_gap_candidates_for_requested_gap( array $schedule, array $saved_session_ids, array $requested_gap ): array {
        $sessions = isset( $schedule['sessions'] ) && is_array( $schedule['sessions'] ) ? $schedule['sessions'] : [];
        $saved_lookup = array_fill_keys( array_map( 'absint', $saved_session_ids ), true );
        $timezone = isset( $schedule['timezone'] ) ? (string) $schedule['timezone'] : '';
        $day_sessions = [];

        foreach ( $sessions as $session ) {
            if ( empty( $session['id'] ) || empty( $session['start'] ) ) {
                continue;
            }

            if ( $this->get_schedule_day_key( (int) $session['start'], $timezone ) === $requested_gap['day_key'] ) {
                $day_sessions[] = $session;
            }
        }

        usort(
            $day_sessions,
            function ( array $a, array $b ): int {
                return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
            }
        );

        $gaps = [];
        $this->append_compact_gap(
            $gaps,
            $requested_gap['day_key'],
            (int) $requested_gap['start'],
            (int) $requested_gap['end'],
            $day_sessions,
            $saved_lookup
        );

        return $gaps;
    }

    private function compact_gaps( array $sessions, array $saved_lookup, string $timezone ): array {
        $saved_by_day = [];
        $sessions_by_day = [];

        foreach ( $sessions as $session ) {
            if ( empty( $session['id'] ) || empty( $session['start'] ) ) {
                continue;
            }

            $day_key = $this->get_schedule_day_key( (int) $session['start'], $timezone );
            $sessions_by_day[ $day_key ][] = $session;

            if ( isset( $saved_lookup[ (int) $session['id'] ] ) && ( empty( $session['type'] ) || 'custom' !== $session['type'] ) ) {
                $saved_by_day[ $day_key ][] = $session;
            }
        }

        $gaps = [];

        foreach ( $sessions_by_day as $day_key => $day_sessions ) {
            $saved_sessions = $saved_by_day[ $day_key ] ?? [];
            $day_sessions = $sessions_by_day[ $day_key ] ?? [];
            usort(
                $day_sessions,
                function ( array $a, array $b ): int {
                    return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
                }
            );

            if ( ! $saved_sessions ) {
                $day_start = ! empty( $day_sessions[0]['start'] ) ? (int) $day_sessions[0]['start'] : 0;
                $last_day_session = $day_sessions ? $day_sessions[ count( $day_sessions ) - 1 ] : [];
                $day_end = ! empty( $last_day_session['end'] ) ? (int) $last_day_session['end'] : ( ! empty( $last_day_session['start'] ) ? (int) $last_day_session['start'] : 0 );

                if ( $day_start && $day_end ) {
                    $this->append_compact_gap( $gaps, $day_key, $day_start, max( $day_start, $day_end ), $day_sessions, $saved_lookup );
                }

                continue;
            }

            usort(
                $saved_sessions,
                function ( array $a, array $b ): int {
                    return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
                }
            );

            $saved_blocks = $this->get_saved_time_blocks( $saved_sessions );
            if ( ! $saved_blocks ) {
                continue;
            }

            $first_saved_start = (int) $saved_blocks[0]['start'];
            $day_start = ! empty( $day_sessions[0]['start'] ) ? (int) $day_sessions[0]['start'] : $first_saved_start;
            $arrival_start = max( $day_start, $first_saved_start - 2 * HOUR_IN_SECONDS );
            $this->append_compact_gap(
                $gaps,
                $day_key,
                $arrival_start,
                max( $arrival_start, $first_saved_start - 10 * MINUTE_IN_SECONDS ),
                $day_sessions,
                $saved_lookup
            );

            for ( $index = 0; $index < count( $saved_blocks ) - 1; $index++ ) {
                $gap_start = (int) $saved_blocks[ $index ]['end'];
                $gap_end = max( $gap_start, (int) $saved_blocks[ $index + 1 ]['start'] - 10 * MINUTE_IN_SECONDS );

                $this->append_compact_gap( $gaps, $day_key, $gap_start, $gap_end, $day_sessions, $saved_lookup );
            }

            $last_saved_block = $saved_blocks[ count( $saved_blocks ) - 1 ];
            $last_saved_end = (int) $last_saved_block['end'];
            $last_day_session = $day_sessions ? $day_sessions[ count( $day_sessions ) - 1 ] : $last_saved_block;
            $day_end = ! empty( $last_day_session['end'] ) ? (int) $last_day_session['end'] : (int) $last_day_session['start'];
            $this->append_compact_gap( $gaps, $day_key, $last_saved_end, max( $last_saved_end, $day_end ), $day_sessions, $saved_lookup );
        }

        return $gaps;
    }

    private function get_saved_time_blocks( array $saved_sessions ): array {
        $blocks = [];

        foreach ( $saved_sessions as $session ) {
            if ( empty( $session['start'] ) ) {
                continue;
            }

            $start = (int) $session['start'];
            $end = ! empty( $session['end'] ) ? (int) $session['end'] : $start;
            $last_index = count( $blocks ) - 1;

            if ( $last_index >= 0 && $this->substantially_overlaps_block( $start, $end, $blocks[ $last_index ] ) ) {
                $blocks[ $last_index ]['end'] = max( $blocks[ $last_index ]['end'], $end );
                $blocks[ $last_index ]['sessions'][] = [
                    'start' => $start,
                    'end'   => $end,
                ];
                continue;
            }

            $blocks[] = [
                'start'    => $start,
                'end'      => $end,
                'sessions' => [
                    [
                        'start' => $start,
                        'end'   => $end,
                    ],
                ],
            ];
        }

        return $blocks;
    }

    private function substantially_overlaps_block( int $start, int $end, array $block ): bool {
        foreach ( $block['sessions'] ?? [] as $session ) {
            $overlap = max( 0, min( $end, (int) $session['end'] ) - max( $start, (int) $session['start'] ) );
            if ( $overlap >= self::SUBSTANTIAL_OVERLAP_SECONDS ) {
                return true;
            }
        }

        return false;
    }

    private function append_compact_gap( array &$gaps, string $day_key, int $gap_start, int $gap_end, array $day_sessions, array $saved_lookup ): void {
        if ( $gap_end - $gap_start < 15 * MINUTE_IN_SECONDS ) {
            return;
        }

        $candidates = [];
        foreach ( $day_sessions as $session ) {
            if ( empty( $session['id'] ) || isset( $saved_lookup[ (int) $session['id'] ] ) || ! empty( $session['type'] ) && 'custom' === $session['type'] ) {
                continue;
            }

            $session_start = (int) $session['start'];
            $session_end = ! empty( $session['end'] ) ? (int) $session['end'] : $session_start;

            if ( $session_start < $gap_end && $session_end > $gap_start ) {
                $candidates[] = $this->compact_session( $session );
            }
        }

        if ( ! $candidates ) {
            return;
        }

        $gaps[] = [
            'day_key'    => $day_key,
            'start'      => $gap_start,
            'end'        => $gap_end,
            'candidates' => $candidates,
        ];
    }

    private function get_schedule_days( array $schedule ): array {
        $sessions = isset( $schedule['sessions'] ) && is_array( $schedule['sessions'] ) ? $schedule['sessions'] : [];
        $timezone = isset( $schedule['timezone'] ) ? (string) $schedule['timezone'] : '';
        $first_sessions_by_day = [];
        $last_sessions_by_day = [];

        foreach ( $sessions as $session ) {
            if ( empty( $session['start'] ) ) {
                continue;
            }

            $day_key = $this->get_schedule_day_key( (int) $session['start'], $timezone );
            if ( empty( $first_sessions_by_day[ $day_key ] ) || (int) $session['start'] < (int) $first_sessions_by_day[ $day_key ]['start'] ) {
                $first_sessions_by_day[ $day_key ] = $session;
            }

            $session_end = ! empty( $session['end'] ) ? (int) $session['end'] : (int) $session['start'];
            $last_session_end = ! empty( $last_sessions_by_day[ $day_key ]['end'] ) ? (int) $last_sessions_by_day[ $day_key ]['end'] : 0;
            if ( empty( $last_sessions_by_day[ $day_key ] ) || $session_end > $last_session_end ) {
                $last_sessions_by_day[ $day_key ] = $session;
            }
        }

        return $this->compact_days( $first_sessions_by_day, $last_sessions_by_day );
    }

    private function compact_days( array $first_sessions_by_day, array $last_sessions_by_day ): array {
        $days = [];

        foreach ( $first_sessions_by_day as $day_key => $session ) {
            if ( empty( $session['start'] ) ) {
                continue;
            }

            $days[ $day_key ] = [
                'key'   => $day_key,
                'start' => absint( $session['start'] ),
                'end'   => isset( $last_sessions_by_day[ $day_key ]['end'] ) ? absint( $last_sessions_by_day[ $day_key ]['end'] ) : absint( $session['start'] ),
            ];
        }

        ksort( $days );

        return $days;
    }

    private function get_saved_day_bounds( array $sessions, array $saved_lookup, string $timezone ): array {
        $bounds = [];

        foreach ( $sessions as $session ) {
            if ( empty( $session['id'] ) || empty( $session['start'] ) || ! isset( $saved_lookup[ (int) $session['id'] ] ) ) {
                continue;
            }

            $day_key = $this->get_schedule_day_key( (int) $session['start'], $timezone );
            $start = (int) $session['start'];
            $end = ! empty( $session['end'] ) ? (int) $session['end'] : $start;

            if ( empty( $bounds[ $day_key ] ) ) {
                $bounds[ $day_key ] = [
                    'first_start' => $start,
                    'last_end'    => $end,
                ];
                continue;
            }

            $bounds[ $day_key ]['first_start'] = min( $bounds[ $day_key ]['first_start'], $start );
            $bounds[ $day_key ]['last_end'] = max( $bounds[ $day_key ]['last_end'], $end );
        }

        return $bounds;
    }

    private function is_between_saved_sessions( array $session, ?array $bounds ): bool {
        if ( empty( $bounds ) || empty( $session['start'] ) ) {
            return false;
        }

        $start = (int) $session['start'];
        $end = ! empty( $session['end'] ) ? (int) $session['end'] : $start;

        return $end > $bounds['first_start'] && $start < $bounds['last_end'];
    }

    private function compact_session( array $session ): array {
        return [
            'id'             => isset( $session['id'] ) ? absint( $session['id'] ) : 0,
            'title'          => isset( $session['title'] ) ? sanitize_text_field( $session['title'] ) : '',
            'url'            => isset( $session['url'] ) ? esc_url_raw( $session['url'] ) : '',
            'start'          => isset( $session['start'] ) ? absint( $session['start'] ) : null,
            'duration'       => isset( $session['duration'] ) ? absint( $session['duration'] ) : 0,
            'end'            => isset( $session['end'] ) ? absint( $session['end'] ) : null,
            'type'           => isset( $session['type'] ) ? sanitize_key( $session['type'] ) : '',
            'speaker_names'  => isset( $session['speaker_names'] ) && is_array( $session['speaker_names'] ) ? array_map( 'sanitize_text_field', $session['speaker_names'] ) : [],
            'track_names'    => isset( $session['track_names'] ) && is_array( $session['track_names'] ) ? array_map( 'sanitize_text_field', $session['track_names'] ) : [],
            'category_names' => isset( $session['category_names'] ) && is_array( $session['category_names'] ) ? array_map( 'sanitize_text_field', $session['category_names'] ) : [],
        ];
    }

    private function get_schedule_day_key( int $timestamp, string $timezone ): string {
        try {
            $date = new \DateTime( '@' . $timestamp );
            $date->setTimezone( new \DateTimeZone( $timezone ?: 'UTC' ) );
            return $date->format( 'Y-m-d' );
        } catch ( \Exception $exception ) {
            return gmdate( 'Y-m-d', $timestamp );
        }
    }

    public function get_plan(): \WP_REST_Response {
        return rest_ensure_response( $this->repository->get_plan( get_current_user_id() ) );
    }

    public function save_event( WP_REST_Request $request ) {
        $params = $this->get_request_params( $request );
        $event = isset( $params['event'] ) && is_array( $params['event'] ) ? $params['event'] : $params;
        $plan = $this->repository->set_selected_event( get_current_user_id(), $event );

        if ( is_wp_error( $plan ) ) {
            return $plan;
        }

        return rest_ensure_response( $plan );
    }

    public function save_companion_visibility( WP_REST_Request $request ) {
        $params = $this->get_request_params( $request );
        $event = isset( $params['event'] ) && is_array( $params['event'] ) ? $params['event'] : [];
        $show = rest_sanitize_boolean( $params['show'] ?? false );
        $plan = $this->repository->set_companion_visibility( get_current_user_id(), $event, $show );

        if ( is_wp_error( $plan ) ) {
            return $plan;
        }

        return rest_ensure_response( $plan );
    }

    public function get_settings(): \WP_REST_Response {
        return rest_ensure_response( UserSettings::get_settings( get_current_user_id() ) );
    }

    public function save_settings( WP_REST_Request $request ): \WP_REST_Response {
        $params = $this->get_request_params( $request );

        return rest_ensure_response( UserSettings::update_settings( get_current_user_id(), $params ) );
    }

    private function get_request_params( WP_REST_Request $request ): array {
        $params = $request->get_json_params();

        if ( ! is_array( $params ) ) {
            $params = $request->get_params();
        }

        return is_array( $params ) ? $params : [];
    }
}
