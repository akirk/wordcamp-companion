<?php

namespace WordCampCompanion;

use WP_Error;

class PlannerRepository {
    private const META_KEY = 'wordcamp_companion_plan';

    private WordCampApi $api;

    public function __construct( WordCampApi $api ) {
        $this->api = $api;
    }

    public function get_plan( int $user_id ): array {
        $plan = get_user_meta( $user_id, self::META_KEY, true );

        return $this->normalize_plan( is_array( $plan ) ? $plan : [] );
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

        $plan = $this->get_plan( $user_id );
        $event_url = $event['event_url'];

        if ( empty( $plan['plans'][ $event_url ] ) ) {
            $plan['plans'][ $event_url ] = [
                'event'             => $event,
                'saved_session_ids' => [],
                'updated_at'        => time(),
            ];
        }

        $plan['selected_event_url'] = $event_url;
        $plan['plans'][ $event_url ]['event'] = $event;
        $plan['plans'][ $event_url ]['updated_at'] = time();

        update_user_meta( $user_id, self::META_KEY, $plan );

        return $plan;
    }

    public function set_saved_sessions( int $user_id, string $event_url, array $session_ids ) {
        $plan = $this->get_plan( $user_id );
        $event_url = $event_url ? $this->api->normalize_event_site_url( $event_url ) : $plan['selected_event_url'];

        if ( '' === $event_url || ! $this->api->is_allowed_wordcamp_url( $event_url ) ) {
            return new WP_Error(
                'wordcamp_companion_invalid_event_url',
                __( 'Select a WordCamp before saving sessions.', 'wordcamp-companion' ),
                [ 'status' => 400 ]
            );
        }

        if ( empty( $plan['plans'][ $event_url ] ) ) {
            $plan['plans'][ $event_url ] = [
                'event'             => [ 'event_url' => $event_url ],
                'saved_session_ids' => [],
                'updated_at'        => time(),
            ];
        }

        $plan['selected_event_url'] = $event_url;
        $plan['plans'][ $event_url ]['saved_session_ids'] = $this->sanitize_session_ids( $session_ids );
        $plan['plans'][ $event_url ]['updated_at'] = time();

        update_user_meta( $user_id, self::META_KEY, $plan );

        return $plan;
    }

    private function normalize_plan( array $plan ): array {
        $normalized = [
            'selected_event_url' => '',
            'plans'              => [],
        ];

        if ( ! empty( $plan['selected_event_url'] ) && is_string( $plan['selected_event_url'] ) ) {
            $selected_event_url = $this->api->normalize_event_site_url( $plan['selected_event_url'] );
            if ( $this->api->is_allowed_wordcamp_url( $selected_event_url ) ) {
                $normalized['selected_event_url'] = $selected_event_url;
            }
        }

        if ( empty( $plan['plans'] ) || ! is_array( $plan['plans'] ) ) {
            return $normalized;
        }

        foreach ( $plan['plans'] as $event_url => $event_plan ) {
            $event_url = is_string( $event_url ) ? $this->api->normalize_event_site_url( $event_url ) : '';
            if ( '' === $event_url || ! $this->api->is_allowed_wordcamp_url( $event_url ) || ! is_array( $event_plan ) ) {
                continue;
            }

            $event = isset( $event_plan['event'] ) && is_array( $event_plan['event'] )
                ? $this->sanitize_event_snapshot( $event_plan['event'] )
                : [ 'event_url' => $event_url ];

            $event['event_url'] = $event_url;

            $normalized['plans'][ $event_url ] = [
                'event'             => $event,
                'saved_session_ids' => $this->sanitize_session_ids( $event_plan['saved_session_ids'] ?? [] ),
                'updated_at'        => isset( $event_plan['updated_at'] ) ? absint( $event_plan['updated_at'] ) : 0,
            ];
        }

        if ( '' !== $normalized['selected_event_url'] && empty( $normalized['plans'][ $normalized['selected_event_url'] ] ) ) {
            $normalized['selected_event_url'] = '';
        }

        return $normalized;
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
            'country'     => isset( $event['country'] ) ? sanitize_text_field( $event['country'] ) : '',
            'coordinates' => $event['coordinates'] ?? null,
            'venue'       => $this->sanitize_venue_snapshot( isset( $event['venue'] ) && is_array( $event['venue'] ) ? $event['venue'] : [] ),
        ];
    }

    private function sanitize_venue_snapshot( array $venue ): array {
        return [
            'name'             => isset( $venue['name'] ) ? sanitize_text_field( $venue['name'] ) : '',
            'physical_address' => isset( $venue['physical_address'] ) ? sanitize_text_field( $venue['physical_address'] ) : '',
            'street_name'      => isset( $venue['street_name'] ) ? sanitize_text_field( $venue['street_name'] ) : '',
            'street_number'    => isset( $venue['street_number'] ) ? sanitize_text_field( $venue['street_number'] ) : '',
            'city'             => isset( $venue['city'] ) ? sanitize_text_field( $venue['city'] ) : '',
            'state'            => isset( $venue['state'] ) ? sanitize_text_field( $venue['state'] ) : '',
            'country_code'     => isset( $venue['country_code'] ) ? sanitize_text_field( $venue['country_code'] ) : '',
            'country'          => isset( $venue['country'] ) ? sanitize_text_field( $venue['country'] ) : '',
            'zip'              => isset( $venue['zip'] ) ? sanitize_text_field( $venue['zip'] ) : '',
            'coordinates'      => $venue['coordinates'] ?? null,
        ];
    }

    private function sanitize_session_ids( $session_ids ): array {
        if ( ! is_array( $session_ids ) ) {
            $session_ids = [];
        }

        $session_ids = array_map( 'absint', $session_ids );
        $session_ids = array_filter(
            $session_ids,
            function ( int $session_id ): bool {
                return $session_id > 0;
            }
        );

        return array_values( array_unique( $session_ids ) );
    }
}
