<?php

namespace WordCampCompanion;

defined( 'ABSPATH' ) || exit;

class UserSettings {
    private const DEBUG_CLOCK_META_KEY = 'wordcamp_companion_show_debug_clock';

    public static function get_settings( int $user_id ): array {
        return [
            'show_debug_clock' => self::is_debug_clock_enabled( $user_id ),
        ];
    }

    public static function update_settings( int $user_id, array $settings ): array {
        if ( array_key_exists( 'show_debug_clock', $settings ) ) {
            update_user_meta(
                $user_id,
                self::DEBUG_CLOCK_META_KEY,
                rest_sanitize_boolean( $settings['show_debug_clock'] ) ? '1' : '0'
            );
        }

        return self::get_settings( $user_id );
    }

    public static function is_debug_clock_enabled( int $user_id ): bool {
        $value = get_user_meta( $user_id, self::DEBUG_CLOCK_META_KEY, true );

        if ( '' === $value ) {
            return false;
        }

        return rest_sanitize_boolean( $value );
    }
}
