<?php

namespace WordCampCompanion;

use WP_Error;
use WP_REST_Request;

class RestController {
    private const NAMESPACE = 'wordcamp-companion/v1';

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
            '/plan/sessions',
            [
                [
                    'methods'             => 'POST',
                    'callback'            => [ $this, 'save_sessions' ],
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

        $schedule['mode'] = 'full';

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

        $plan = $this->repository->get_plan( get_current_user_id() );
        $saved_session_ids = $this->get_saved_session_ids( $plan, $event_url );
        $schedule = $this->api->get_schedule( $event_url, (bool) $request->get_param( 'refresh' ) );

        if ( is_wp_error( $schedule ) ) {
            return $schedule;
        }

        return rest_ensure_response( $this->get_compact_companion_schedule( $schedule, $saved_session_ids ) );
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

    private function get_compact_companion_schedule( array $schedule, array $saved_session_ids ): array {
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
            'site_name'  => $schedule['site_name'] ?? '',
            'timezone'   => $schedule['timezone'] ?? '',
            'days'       => $this->compact_days( $first_sessions_by_day, $last_sessions_by_day ),
            'gaps'       => $saved_session_ids ? $this->compact_gaps( $sessions, $saved_lookup, $timezone ) : [],
            'sessions'   => array_values( $compact_sessions ),
            'mode'       => 'companion',
            'fetched_at' => $schedule['fetched_at'] ?? time(),
        ];
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

        foreach ( $saved_by_day as $day_key => $saved_sessions ) {
            usort(
                $saved_sessions,
                function ( array $a, array $b ): int {
                    return ( $a['start'] ?? PHP_INT_MAX ) <=> ( $b['start'] ?? PHP_INT_MAX );
                }
            );

            for ( $index = 0; $index < count( $saved_sessions ) - 1; $index++ ) {
                $gap_start = ! empty( $saved_sessions[ $index ]['end'] ) ? (int) $saved_sessions[ $index ]['end'] : (int) $saved_sessions[ $index ]['start'];
                $gap_end = (int) $saved_sessions[ $index + 1 ]['start'];

                if ( $gap_end - $gap_start < 15 * MINUTE_IN_SECONDS ) {
                    continue;
                }

                $candidates = [];
                foreach ( $sessions_by_day[ $day_key ] ?? [] as $session ) {
                    if ( empty( $session['id'] ) || isset( $saved_lookup[ (int) $session['id'] ] ) || ! empty( $session['type'] ) && 'custom' === $session['type'] ) {
                        continue;
                    }

                    $session_start = (int) $session['start'];
                    $session_end = ! empty( $session['end'] ) ? (int) $session['end'] : $session_start;

                    if ( $session_start >= $gap_start && $session_end <= $gap_end ) {
                        $candidates[] = $this->compact_session( $session );
                    }
                }

                if ( $candidates ) {
                    $gaps[] = [
                        'day_key'    => $day_key,
                        'start'      => $gap_start,
                        'end'        => $gap_end,
                        'candidates' => $candidates,
                    ];
                }
            }
        }

        return $gaps;
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

    public function save_sessions( WP_REST_Request $request ) {
        $params = $this->get_request_params( $request );
        $event_url = isset( $params['event_url'] ) && is_string( $params['event_url'] ) ? $params['event_url'] : '';
        $session_ids = isset( $params['session_ids'] ) && is_array( $params['session_ids'] ) ? $params['session_ids'] : [];
        $plan = $this->repository->set_saved_sessions( get_current_user_id(), $event_url, $session_ids );

        if ( is_wp_error( $plan ) ) {
            return $plan;
        }

        return rest_ensure_response( $plan );
    }

    private function get_request_params( WP_REST_Request $request ): array {
        $params = $request->get_json_params();

        if ( ! is_array( $params ) ) {
            $params = $request->get_params();
        }

        return is_array( $params ) ? $params : [];
    }
}
