<?php

namespace WordCampCompanion;

use WP_Error;

defined( 'ABSPATH' ) || exit;

class Abilities {
    private WordCampApi $api;
    private PlannerRepository $repository;
    private bool $category_registered = false;
    private bool $abilities_registered = false;
    private bool $category_deferred = false;
    private bool $abilities_deferred = false;

    public function __construct( WordCampApi $api, PlannerRepository $repository ) {
        $this->api = $api;
        $this->repository = $repository;

        $this->add_init_safe_action( 'wp_abilities_api_categories_init', 'register_category' );
        $this->add_init_safe_action( 'wp_abilities_api_init', 'register_abilities' );

        add_filter( 'ai_assistant_ability_domains', [ $this, 'register_ability_domain' ] );
    }

    private function add_init_safe_action( string $hook, string $method ): void {
        if ( function_exists( 'did_action' ) && did_action( $hook ) ) {
            $this->$method();
            return;
        }

        add_action( $hook, [ $this, $method ] );
    }

    private function is_init_or_later(): bool {
        if ( ! function_exists( 'did_action' ) ) {
            return true;
        }

        if ( did_action( 'init' ) ) {
            return true;
        }

        return function_exists( 'doing_action' ) && doing_action( 'init' );
    }

    public function register_category(): void {
        if ( $this->category_registered ) {
            return;
        }

        if ( ! $this->is_init_or_later() ) {
            if ( ! $this->category_deferred ) {
                add_action( 'init', [ $this, 'register_category' ], 0 );
                $this->category_deferred = true;
            }
            return;
        }

        if ( ! function_exists( 'wp_register_ability_category' ) ) {
            return;
        }

        wp_register_ability_category(
            'wordcamp-companion',
            [
                'label'       => __( 'WordCamp Companion', 'wordcamp-companion' ),
                'description' => __( 'Plan WordCamp attendance, inspect schedules, and analyze saved sessions.', 'wordcamp-companion' ),
            ]
        );

        $this->category_registered = true;
    }

    public function register_abilities(): void {
        if ( $this->abilities_registered ) {
            return;
        }

        if ( ! $this->is_init_or_later() ) {
            if ( ! $this->abilities_deferred ) {
                add_action( 'init', [ $this, 'register_abilities' ], 0 );
                $this->abilities_deferred = true;
            }
            return;
        }

        if ( ! function_exists( 'wp_register_ability' ) ) {
            return;
        }

        wp_register_ability(
            'wordcamp-companion/list-wordcamps',
            [
                'label'               => __( 'List WordCamps', 'wordcamp-companion' ),
                'description'         => __( 'Lists upcoming WordCamps from WordCamp Central with titles, dates, locations, and event URLs.', 'wordcamp-companion' ),
                'category'            => 'wordcamp-companion',
                'input_schema'        => $this->schema_list_wordcamps_input(),
                'output_schema'       => $this->schema_open_object(),
                'execute_callback'    => [ $this, 'list_wordcamps' ],
                'permission_callback' => [ $this, 'can_read' ],
                'meta'                => [
                    'annotations' => [
                        'readonly'     => true,
                        'destructive'  => false,
                        'instructions' => 'Use this to find WordCamp event URLs before selecting a WordCamp or loading a schedule.',
                    ],
                ],
            ]
        );

        wp_register_ability(
            'wordcamp-companion/get-plan',
            [
                'label'               => __( 'Get WordCamp Plan', 'wordcamp-companion' ),
                'description'         => __( 'Returns the current user\'s selected WordCamp, planned WordCamps, saved sessions, and companion visibility state.', 'wordcamp-companion' ),
                'category'            => 'wordcamp-companion',
                'input_schema'        => $this->schema_empty_input(),
                'output_schema'       => $this->schema_open_object(),
                'execute_callback'    => [ $this, 'get_plan' ],
                'permission_callback' => [ $this, 'can_read' ],
                'meta'                => [
                    'annotations' => [
                        'readonly'     => true,
                        'destructive'  => false,
                        'instructions' => 'Use this before recommending sessions so you know what the user has already saved.',
                    ],
                ],
            ]
        );

        wp_register_ability(
            'wordcamp-companion/get-schedule',
            [
                'label'               => __( 'Get WordCamp Schedule', 'wordcamp-companion' ),
                'description'         => __( 'Loads the full public schedule for a WordCamp, including sessions, tracks, speakers, categories, timezone, and day bounds.', 'wordcamp-companion' ),
                'category'            => 'wordcamp-companion',
                'input_schema'        => $this->schema_event_url_input(),
                'output_schema'       => $this->schema_open_object(),
                'execute_callback'    => [ $this, 'get_schedule' ],
                'permission_callback' => [ $this, 'can_read' ],
                'meta'                => [
                    'annotations' => [
                        'readonly'     => true,
                        'destructive'  => false,
                        'instructions' => 'Use this when the assistant needs the schedule before suggesting sessions. If event_url is omitted, the selected WordCamp is used.',
                    ],
                ],
            ]
        );

        wp_register_ability(
            'wordcamp-companion/analyze-plan',
            [
                'label'               => __( 'Analyze WordCamp Plan', 'wordcamp-companion' ),
                'description'         => __( 'Analyzes saved sessions for conflicts, gaps, day coverage, and selected WordCamp context.', 'wordcamp-companion' ),
                'category'            => 'wordcamp-companion',
                'input_schema'        => $this->schema_analyze_plan_input(),
                'output_schema'       => $this->schema_open_object(),
                'execute_callback'    => [ $this, 'analyze_plan' ],
                'permission_callback' => [ $this, 'can_read' ],
                'meta'                => [
                    'annotations' => [
                        'readonly'     => true,
                        'destructive'  => false,
                        'instructions' => 'Use this to explain schedule conflicts, empty time blocks, and whether the user has a complete plan.',
                    ],
                ],
            ]
        );

        wp_register_ability(
            'wordcamp-companion/get-recommendation-candidates',
            [
                'label'               => __( 'Get Session Recommendation Candidates', 'wordcamp-companion' ),
                'description'         => __( 'Returns schedule sessions that match topics, day, track, category, and current plan constraints so an assistant can recommend an itinerary.', 'wordcamp-companion' ),
                'category'            => 'wordcamp-companion',
                'input_schema'        => $this->schema_recommendation_candidates_input(),
                'output_schema'       => $this->schema_open_object(),
                'execute_callback'    => [ $this, 'get_recommendation_candidates' ],
                'permission_callback' => [ $this, 'can_read' ],
                'meta'                => [
                    'annotations' => [
                        'readonly'     => true,
                        'destructive'  => false,
                        'instructions' => 'Use this to gather candidate sessions, then rank them conversationally based on the user request. The ability does not make subjective recommendations by itself.',
                    ],
                ],
            ]
        );

        wp_register_ability(
            'wordcamp-companion/select-wordcamp',
            [
                'label'               => __( 'Select WordCamp', 'wordcamp-companion' ),
                'description'         => __( 'Sets the current user\'s selected WordCamp using an event snapshot from list-wordcamps.', 'wordcamp-companion' ),
                'category'            => 'wordcamp-companion',
                'input_schema'        => $this->schema_select_wordcamp_input(),
                'output_schema'       => $this->schema_open_object(),
                'execute_callback'    => [ $this, 'select_wordcamp' ],
                'permission_callback' => [ $this, 'can_read' ],
                'meta'                => [
                    'annotations' => [
                        'readonly'     => false,
                        'destructive'  => false,
                        'instructions' => 'Only use after the user confirms which WordCamp to select. Prefer passing the complete event object returned by list-wordcamps.',
                    ],
                ],
            ]
        );

        $this->abilities_registered = true;
    }

    public function register_ability_domain( array $domains ): array {
        $domains['wordcamp-companion'] = 'wordcamp, wordcamp companion, conference schedule, sessions, talks, tracks, speakers, notes, companion timeline, plan my day, event itinerary';
        return $domains;
    }

    public function can_read(): bool {
        return is_user_logged_in() && current_user_can( 'read' );
    }

    public function list_wordcamps( $input ) {
        $input = $this->normalize_input( $input );
        $payload = $this->api->get_wordcamps( ! empty( $input['refresh'] ) );

        if ( is_wp_error( $payload ) ) {
            return $payload;
        }

        $limit = isset( $input['limit'] ) ? absint( $input['limit'] ) : 25;
        $limit = max( 1, min( 100, $limit ) );
        $query = isset( $input['search'] ) ? sanitize_text_field( (string) $input['search'] ) : '';
        $wordcamps = isset( $payload['wordcamps'] ) && is_array( $payload['wordcamps'] ) ? $payload['wordcamps'] : [];

        if ( '' !== $query ) {
            $needle = strtolower( $query );
            $wordcamps = array_values(
                array_filter(
                    $wordcamps,
                    function ( array $event ) use ( $needle ): bool {
                        return false !== strpos( strtolower( wp_json_encode( $event ) ), $needle );
                    }
                )
            );
        }

        return [
            'wordcamps'  => array_slice( $wordcamps, 0, $limit ),
            'count'      => count( $wordcamps ),
            'fetched_at' => absint( $payload['fetched_at'] ?? time() ),
        ];
    }

    public function get_plan( $input = [] ) {
        return $this->repository->get_plan( get_current_user_id() );
    }

    public function get_schedule( $input ) {
        $input = $this->normalize_input( $input );
        $event_url = $this->get_event_url_from_input_or_plan( $input );
        if ( is_wp_error( $event_url ) ) {
            return $event_url;
        }

        $schedule = $this->api->get_schedule( $event_url, ! empty( $input['refresh'] ) );
        if ( is_wp_error( $schedule ) ) {
            return $schedule;
        }

        $schedule['days'] = $this->get_schedule_days( $schedule );
        $this->repository->store_schedule_metadata( $event_url, $schedule, $schedule['days'] );

        return $schedule;
    }

    public function analyze_plan( $input ) {
        $input = $this->normalize_input( $input );
        $plan = $this->repository->get_plan( get_current_user_id() );
        $event_url = $this->get_event_url_from_input_or_plan( $input, $plan );
        if ( is_wp_error( $event_url ) ) {
            return $event_url;
        }

        $event_plan = $this->get_event_plan( $plan, $event_url );
        $saved_sessions = $this->get_saved_sessions_for_plan( $event_plan );
        $event = isset( $event_plan['event'] ) && is_array( $event_plan['event'] ) ? $event_plan['event'] : [];
        $days = isset( $event['schedule_days'] ) && is_array( $event['schedule_days'] ) ? $event['schedule_days'] : [];

        if ( ! empty( $input['include_schedule_bounds'] ) && empty( $days ) ) {
            $schedule = $this->api->get_schedule( $event_url, ! empty( $input['refresh'] ) );
            if ( ! is_wp_error( $schedule ) ) {
                $days = $this->get_schedule_days( $schedule );
                $this->repository->store_schedule_metadata( $event_url, $schedule, $days );
            }
        }

        return [
            'event_url'      => $event_url,
            'event'          => $event,
            'timezone'       => $this->get_timezone_for_event( $event ),
            'saved_sessions' => $saved_sessions,
            'saved_count'    => count( $saved_sessions ),
            'conflicts'      => $this->get_conflicts( $saved_sessions ),
            'gaps'           => $this->get_gaps( $saved_sessions, $days, $this->get_timezone_for_event( $event ) ),
            'days'           => $this->summarize_days( $saved_sessions, $days, $this->get_timezone_for_event( $event ) ),
        ];
    }

    public function get_recommendation_candidates( $input ) {
        $input = $this->normalize_input( $input );
        $plan = $this->repository->get_plan( get_current_user_id() );
        $event_url = $this->get_event_url_from_input_or_plan( $input, $plan );
        if ( is_wp_error( $event_url ) ) {
            return $event_url;
        }

        $schedule = $this->api->get_schedule( $event_url, ! empty( $input['refresh'] ) );
        if ( is_wp_error( $schedule ) ) {
            return $schedule;
        }

        $schedule['days'] = $this->get_schedule_days( $schedule );
        $this->repository->store_schedule_metadata( $event_url, $schedule, $schedule['days'] );

        $event_plan = $this->get_event_plan( $plan, $event_url );
        $saved_sessions = $this->get_saved_sessions_for_plan( $event_plan );
        $saved_ids = $this->get_saved_session_ids( $saved_sessions );
        $topics = $this->normalize_string_list( $input['topics'] ?? [] );
        $day_key = isset( $input['day_key'] ) ? sanitize_text_field( (string) $input['day_key'] ) : '';
        $track = isset( $input['track'] ) ? strtolower( sanitize_text_field( (string) $input['track'] ) ) : '';
        $category = isset( $input['category'] ) ? strtolower( sanitize_text_field( (string) $input['category'] ) ) : '';
        $unsaved_only = array_key_exists( 'unsaved_only', $input ) ? rest_sanitize_boolean( $input['unsaved_only'] ) : true;
        $max_results = isset( $input['max_results'] ) ? absint( $input['max_results'] ) : 20;
        $max_results = max( 1, min( 100, $max_results ) );
        $timezone = isset( $schedule['timezone'] ) ? sanitize_text_field( (string) $schedule['timezone'] ) : '';
        $sessions = isset( $schedule['sessions'] ) && is_array( $schedule['sessions'] ) ? $schedule['sessions'] : [];
        $candidates = [];

        foreach ( $sessions as $session ) {
            if ( ! is_array( $session ) || empty( $session['id'] ) ) {
                continue;
            }

            $session_id = absint( $session['id'] );
            if ( $unsaved_only && in_array( $session_id, $saved_ids, true ) ) {
                continue;
            }

            if ( '' !== $day_key && $this->get_day_key( absint( $session['start'] ?? 0 ), $timezone ) !== $day_key ) {
                continue;
            }

            if ( '' !== $track && ! $this->session_list_contains( $session['track_names'] ?? [], $track ) ) {
                continue;
            }

            if ( '' !== $category && ! $this->session_list_contains( $session['category_names'] ?? [], $category ) ) {
                continue;
            }

            $topic_score = $this->get_topic_score( $session, $topics );
            if ( $topics && ! $topic_score ) {
                continue;
            }

            $overlaps = $this->get_overlapping_sessions( $session, $saved_sessions );
            $session['already_saved'] = in_array( $session_id, $saved_ids, true );
            $session['overlaps_saved'] = ! empty( $overlaps );
            $session['overlapping_saved_sessions'] = $overlaps;
            $session['topic_score'] = $topic_score;
            $candidates[] = $session;
        }

        usort(
            $candidates,
            function ( array $a, array $b ): int {
                $score_compare = absint( $b['topic_score'] ?? 0 ) <=> absint( $a['topic_score'] ?? 0 );
                if ( 0 !== $score_compare ) {
                    return $score_compare;
                }

                return absint( $a['start'] ?? PHP_INT_MAX ) <=> absint( $b['start'] ?? PHP_INT_MAX );
            }
        );

        return [
            'event_url'      => $event_url,
            'site_name'      => $schedule['site_name'] ?? '',
            'timezone'       => $timezone,
            'filters'        => [
                'topics'       => $topics,
                'day_key'      => $day_key,
                'track'        => $track,
                'category'     => $category,
                'unsaved_only' => $unsaved_only,
                'max_results'  => $max_results,
            ],
            'saved_sessions' => $saved_sessions,
            'candidates'     => array_slice( $candidates, 0, $max_results ),
            'count'          => count( $candidates ),
            'days'           => $schedule['days'],
            'tracks'         => $schedule['tracks'] ?? [],
            'categories'     => $schedule['categories'] ?? [],
        ];
    }

    public function select_wordcamp( $input ) {
        $input = $this->normalize_input( $input );
        $event = isset( $input['event'] ) && is_array( $input['event'] ) ? $input['event'] : $input;
        $plan = $this->repository->set_selected_event( get_current_user_id(), $event );

        return $plan;
    }

    private function get_event_url_from_input_or_plan( array $input, ?array $plan = null ) {
        $event_url = isset( $input['event_url'] ) ? $this->api->normalize_event_site_url( (string) $input['event_url'] ) : '';
        if ( '' !== $event_url ) {
            return $event_url;
        }

        $plan = is_array( $plan ) ? $plan : $this->repository->get_plan( get_current_user_id() );
        $event_url = isset( $plan['selected_event_url'] ) ? $this->api->normalize_event_site_url( (string) $plan['selected_event_url'] ) : '';
        if ( '' !== $event_url ) {
            return $event_url;
        }

        return new WP_Error(
            'wordcamp_companion_missing_event_url',
            __( 'Select a WordCamp or provide event_url.', 'wordcamp-companion' ),
            [ 'status' => 400 ]
        );
    }

    private function get_event_plan( array $plan, string $event_url ): array {
        return isset( $plan['plans'][ $event_url ] ) && is_array( $plan['plans'][ $event_url ] ) ? $plan['plans'][ $event_url ] : [];
    }

    private function get_saved_sessions_for_plan( array $event_plan ): array {
        $sessions = isset( $event_plan['saved_sessions'] ) && is_array( $event_plan['saved_sessions'] ) ? $event_plan['saved_sessions'] : [];
        usort(
            $sessions,
            function ( array $a, array $b ): int {
                return absint( $a['start'] ?? PHP_INT_MAX ) <=> absint( $b['start'] ?? PHP_INT_MAX );
            }
        );

        return array_values( $sessions );
    }

    private function get_saved_session_ids( array $saved_sessions ): array {
        return array_values(
            array_filter(
                array_map(
                    function ( array $session ): int {
                        return absint( $session['session_id'] ?? 0 );
                    },
                    $saved_sessions
                )
            )
        );
    }

    private function get_schedule_days( array $schedule ): array {
        $timezone = isset( $schedule['timezone'] ) ? sanitize_text_field( (string) $schedule['timezone'] ) : '';
        $days = [];

        foreach ( $schedule['sessions'] ?? [] as $session ) {
            if ( ! is_array( $session ) || empty( $session['start'] ) ) {
                continue;
            }

            $start = absint( $session['start'] );
            $end = ! empty( $session['end'] ) ? absint( $session['end'] ) : $start;
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
        if ( ! $timestamp ) {
            return '';
        }

        try {
            $date = new \DateTime( '@' . $timestamp );
            $date->setTimezone( new \DateTimeZone( $timezone ?: 'UTC' ) );
            return $date->format( 'Y-m-d' );
        } catch ( \Exception $exception ) {
            return gmdate( 'Y-m-d', $timestamp );
        }
    }

    private function get_timezone_for_event( array $event ): string {
        if ( ! empty( $event['schedule_timezone'] ) ) {
            return sanitize_text_field( (string) $event['schedule_timezone'] );
        }

        return ! empty( $event['timezone'] ) ? sanitize_text_field( (string) $event['timezone'] ) : '';
    }

    private function get_conflicts( array $sessions ): array {
        $conflicts = [];
        $count = count( $sessions );

        for ( $i = 0; $i < $count; $i++ ) {
            for ( $j = $i + 1; $j < $count; $j++ ) {
                if ( ! $this->sessions_overlap( $sessions[ $i ], $sessions[ $j ] ) ) {
                    continue;
                }

                $conflicts[] = [
                    'sessions' => [
                        $this->summarize_saved_session( $sessions[ $i ] ),
                        $this->summarize_saved_session( $sessions[ $j ] ),
                    ],
                ];
            }
        }

        return $conflicts;
    }

    private function get_gaps( array $saved_sessions, array $days, string $timezone ): array {
        $gaps = [];

        if ( empty( $days ) ) {
            $sessions_by_day = [];
            foreach ( $saved_sessions as $session ) {
                $day_key = $this->get_day_key( absint( $session['start'] ?? 0 ), $timezone );
                if ( '' !== $day_key ) {
                    $sessions_by_day[ $day_key ][] = $session;
                }
            }

            foreach ( $sessions_by_day as $day_key => $sessions ) {
                $gaps = array_merge( $gaps, $this->get_internal_gaps_for_day( $day_key, $sessions ) );
            }

            return $gaps;
        }

        foreach ( $days as $day_key => $day ) {
            if ( ! is_array( $day ) ) {
                continue;
            }

            $day_sessions = array_values(
                array_filter(
                    $saved_sessions,
                    function ( array $session ) use ( $day_key, $timezone ): bool {
                        return $this->get_day_key( absint( $session['start'] ?? 0 ), $timezone ) === (string) $day_key;
                    }
                )
            );

            $gaps = array_merge(
                $gaps,
                $this->get_gaps_for_day_bounds(
                    (string) $day_key,
                    absint( $day['start'] ?? 0 ),
                    absint( $day['end'] ?? 0 ),
                    $day_sessions
                )
            );
        }

        return $gaps;
    }

    private function get_gaps_for_day_bounds( string $day_key, int $day_start, int $day_end, array $sessions ): array {
        if ( ! $day_start || ! $day_end || $day_end <= $day_start ) {
            return [];
        }

        usort(
            $sessions,
            function ( array $a, array $b ): int {
                return absint( $a['start'] ?? PHP_INT_MAX ) <=> absint( $b['start'] ?? PHP_INT_MAX );
            }
        );

        $cursor = $day_start;
        $gaps = [];

        foreach ( $sessions as $session ) {
            $start = absint( $session['start'] ?? 0 );
            $end = absint( $session['end'] ?? $start );
            if ( ! $start ) {
                continue;
            }

            if ( $start > $cursor ) {
                $gaps[] = [
                    'day_key' => $day_key,
                    'start'   => $cursor,
                    'end'     => $start,
                    'seconds' => $start - $cursor,
                ];
            }

            $cursor = max( $cursor, $end ?: $start );
        }

        if ( $day_end > $cursor ) {
            $gaps[] = [
                'day_key' => $day_key,
                'start'   => $cursor,
                'end'     => $day_end,
                'seconds' => $day_end - $cursor,
            ];
        }

        return $gaps;
    }

    private function get_internal_gaps_for_day( string $day_key, array $sessions ): array {
        usort(
            $sessions,
            function ( array $a, array $b ): int {
                return absint( $a['start'] ?? PHP_INT_MAX ) <=> absint( $b['start'] ?? PHP_INT_MAX );
            }
        );

        $gaps = [];
        $previous_end = 0;

        foreach ( $sessions as $session ) {
            $start = absint( $session['start'] ?? 0 );
            $end = absint( $session['end'] ?? $start );
            if ( $previous_end && $start > $previous_end ) {
                $gaps[] = [
                    'day_key' => $day_key,
                    'start'   => $previous_end,
                    'end'     => $start,
                    'seconds' => $start - $previous_end,
                ];
            }
            $previous_end = max( $previous_end, $end ?: $start );
        }

        return $gaps;
    }

    private function summarize_days( array $saved_sessions, array $days, string $timezone ): array {
        $summary = [];

        foreach ( $days as $day_key => $day ) {
            $day_sessions = array_values(
                array_filter(
                    $saved_sessions,
                    function ( array $session ) use ( $day_key, $timezone ): bool {
                        return $this->get_day_key( absint( $session['start'] ?? 0 ), $timezone ) === (string) $day_key;
                    }
                )
            );

            $summary[] = [
                'day_key'     => (string) $day_key,
                'start'       => absint( $day['start'] ?? 0 ),
                'end'         => absint( $day['end'] ?? 0 ),
                'saved_count' => count( $day_sessions ),
            ];
        }

        if ( empty( $summary ) ) {
            $seen = [];
            foreach ( $saved_sessions as $session ) {
                $day_key = $this->get_day_key( absint( $session['start'] ?? 0 ), $timezone );
                if ( '' === $day_key || isset( $seen[ $day_key ] ) ) {
                    continue;
                }

                $seen[ $day_key ] = true;
                $summary[] = [
                    'day_key'     => $day_key,
                    'start'       => 0,
                    'end'         => 0,
                    'saved_count' => count(
                        array_filter(
                            $saved_sessions,
                            function ( array $saved_session ) use ( $day_key, $timezone ): bool {
                                return $this->get_day_key( absint( $saved_session['start'] ?? 0 ), $timezone ) === $day_key;
                            }
                        )
                    ),
                ];
            }
        }

        return $summary;
    }

    private function get_overlapping_sessions( array $session, array $saved_sessions ): array {
        $overlaps = [];

        foreach ( $saved_sessions as $saved_session ) {
            if ( $this->sessions_overlap( $session, $saved_session ) ) {
                $overlaps[] = $this->summarize_saved_session( $saved_session );
            }
        }

        return $overlaps;
    }

    private function sessions_overlap( array $a, array $b ): bool {
        $a_start = absint( $a['start'] ?? 0 );
        $b_start = absint( $b['start'] ?? 0 );
        if ( ! $a_start || ! $b_start ) {
            return false;
        }

        $a_end = absint( $a['end'] ?? $a_start ) ?: $a_start;
        $b_end = absint( $b['end'] ?? $b_start ) ?: $b_start;

        return $a_start < $b_end && $b_start < $a_end;
    }

    private function summarize_saved_session( array $session ): array {
        return [
            'session_id'  => absint( $session['session_id'] ?? $session['id'] ?? 0 ),
            'post_id'     => absint( $session['post_id'] ?? 0 ),
            'title'       => sanitize_text_field( (string) ( $session['title'] ?? '' ) ),
            'start'       => absint( $session['start'] ?? 0 ),
            'end'         => absint( $session['end'] ?? 0 ),
            'track_names' => isset( $session['track_names'] ) && is_array( $session['track_names'] ) ? array_values( $session['track_names'] ) : [],
        ];
    }

    private function get_topic_score( array $session, array $topics ): int {
        if ( empty( $topics ) ) {
            return 0;
        }

        $haystack = strtolower(
            implode(
                ' ',
                [
                    (string) ( $session['title'] ?? '' ),
                    implode( ' ', isset( $session['speaker_names'] ) && is_array( $session['speaker_names'] ) ? $session['speaker_names'] : [] ),
                    implode( ' ', isset( $session['track_names'] ) && is_array( $session['track_names'] ) ? $session['track_names'] : [] ),
                    implode( ' ', isset( $session['category_names'] ) && is_array( $session['category_names'] ) ? $session['category_names'] : [] ),
                ]
            )
        );
        $score = 0;

        foreach ( $topics as $topic ) {
            if ( '' !== $topic && false !== strpos( $haystack, strtolower( $topic ) ) ) {
                $score++;
            }
        }

        return $score;
    }

    private function session_list_contains( $values, string $needle ): bool {
        if ( ! is_array( $values ) ) {
            return false;
        }

        foreach ( $values as $value ) {
            if ( false !== strpos( strtolower( (string) $value ), $needle ) ) {
                return true;
            }
        }

        return false;
    }

    private function normalize_string_list( $values ): array {
        if ( is_string( $values ) ) {
            $values = preg_split( '/\s*,\s*/', $values );
        }

        if ( ! is_array( $values ) ) {
            return [];
        }

        return array_values(
            array_filter(
                array_map(
                    function ( $value ): string {
                        return sanitize_text_field( (string) $value );
                    },
                    $values
                )
            )
        );
    }

    private function normalize_input( $input ): array {
        return is_array( $input ) ? $input : [];
    }

    private function schema_empty_input(): array {
        return [
            'type'                 => 'object',
            'properties'           => [],
            'additionalProperties' => false,
        ];
    }

    private function schema_event_url_input(): array {
        return [
            'type'                 => 'object',
            'properties'           => [
                'event_url' => [
                    'type'        => 'string',
                    'description' => 'WordCamp site URL. If omitted, the selected WordCamp is used.',
                ],
                'refresh' => [
                    'type'        => 'boolean',
                    'description' => 'Whether to bypass cached schedule data.',
                    'default'     => false,
                ],
            ],
            'additionalProperties' => false,
        ];
    }

    private function schema_list_wordcamps_input(): array {
        return [
            'type'                 => 'object',
            'properties'           => [
                'search' => [
                    'type'        => 'string',
                    'description' => 'Optional text to match against title, location, country, or event URL.',
                ],
                'limit' => [
                    'type'        => 'integer',
                    'description' => 'Maximum number of WordCamps to return.',
                    'default'     => 25,
                    'minimum'     => 1,
                    'maximum'     => 100,
                ],
                'refresh' => [
                    'type'        => 'boolean',
                    'description' => 'Whether to bypass cached WordCamp Central data.',
                    'default'     => false,
                ],
            ],
            'additionalProperties' => false,
        ];
    }

    private function schema_analyze_plan_input(): array {
        return [
            'type'                 => 'object',
            'properties'           => [
                'event_url' => [
                    'type'        => 'string',
                    'description' => 'WordCamp site URL. If omitted, the selected WordCamp is used.',
                ],
                'include_schedule_bounds' => [
                    'type'        => 'boolean',
                    'description' => 'Whether to fetch the full schedule when stored day bounds are not available.',
                    'default'     => true,
                ],
                'refresh' => [
                    'type'        => 'boolean',
                    'description' => 'Whether to bypass cached schedule data if schedule bounds are fetched.',
                    'default'     => false,
                ],
            ],
            'additionalProperties' => false,
        ];
    }

    private function schema_recommendation_candidates_input(): array {
        return [
            'type'                 => 'object',
            'properties'           => [
                'event_url' => [
                    'type'        => 'string',
                    'description' => 'WordCamp site URL. If omitted, the selected WordCamp is used.',
                ],
                'topics' => [
                    'type'        => 'array',
                    'description' => 'Topics or keywords the user is interested in, such as AI, accessibility, community, performance, design, or contributor day.',
                    'items'       => [ 'type' => 'string' ],
                ],
                'day_key' => [
                    'type'        => 'string',
                    'description' => 'Optional schedule day key in YYYY-MM-DD format.',
                ],
                'track' => [
                    'type'        => 'string',
                    'description' => 'Optional track name or partial track name.',
                ],
                'category' => [
                    'type'        => 'string',
                    'description' => 'Optional session category name or partial category name.',
                ],
                'unsaved_only' => [
                    'type'        => 'boolean',
                    'description' => 'Whether to exclude sessions already saved by the user.',
                    'default'     => true,
                ],
                'max_results' => [
                    'type'        => 'integer',
                    'description' => 'Maximum number of candidate sessions to return.',
                    'default'     => 20,
                    'minimum'     => 1,
                    'maximum'     => 100,
                ],
                'refresh' => [
                    'type'        => 'boolean',
                    'description' => 'Whether to bypass cached schedule data.',
                    'default'     => false,
                ],
            ],
            'additionalProperties' => false,
        ];
    }

    private function schema_select_wordcamp_input(): array {
        return [
            'type'                 => 'object',
            'properties'           => [
                'event' => [
                    'type'        => 'object',
                    'description' => 'Complete WordCamp event object from wordcamp-companion/list-wordcamps.',
                ],
                'event_url' => [
                    'type'        => 'string',
                    'description' => 'WordCamp site URL if a full event object is not available.',
                ],
                'title' => [
                    'type'        => 'string',
                    'description' => 'WordCamp title if a full event object is not available.',
                ],
            ],
            'additionalProperties' => true,
        ];
    }

    private function schema_open_object(): array {
        return [
            'type'                 => 'object',
            'properties'           => [],
            'additionalProperties' => true,
        ];
    }
}
