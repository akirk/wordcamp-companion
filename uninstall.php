<?php
/**
 * Clean up WordCamp Companion data on uninstall.
 *
 * @package WordCampCompanion
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

const WORDCAMP_COMPANION_UNINSTALL_POST_TYPE = 'wcc_session';
const WORDCAMP_COMPANION_UNINSTALL_TAXONOMY = 'wcc_wordcamp';

function wordcamp_companion_uninstall_register_content_types(): void {
	if ( ! taxonomy_exists( WORDCAMP_COMPANION_UNINSTALL_TAXONOMY ) ) {
		register_taxonomy(
			WORDCAMP_COMPANION_UNINSTALL_TAXONOMY,
			[ WORDCAMP_COMPANION_UNINSTALL_POST_TYPE ],
			[
				'public'       => false,
				'hierarchical' => false,
			]
		);
	}

	if ( ! post_type_exists( WORDCAMP_COMPANION_UNINSTALL_POST_TYPE ) ) {
		register_post_type(
			WORDCAMP_COMPANION_UNINSTALL_POST_TYPE,
			[
				'public'     => false,
				'taxonomies' => [ WORDCAMP_COMPANION_UNINSTALL_TAXONOMY ],
			]
		);
	}
}

function wordcamp_companion_uninstall_delete_saved_sessions(): void {
	do {
		$post_ids = get_posts(
			[
				'post_type'              => WORDCAMP_COMPANION_UNINSTALL_POST_TYPE,
				'post_status'            => get_post_stati( [], 'names' ),
				'posts_per_page'         => 100,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			]
		);

		foreach ( array_map( 'absint', $post_ids ) as $post_id ) {
			wp_delete_post( $post_id, true );
		}
	} while ( ! empty( $post_ids ) );
}

function wordcamp_companion_uninstall_delete_wordcamp_terms(): void {
	$term_ids = get_terms(
		[
			'taxonomy'   => WORDCAMP_COMPANION_UNINSTALL_TAXONOMY,
			'hide_empty' => false,
			'fields'     => 'ids',
		]
	);

	if ( is_wp_error( $term_ids ) ) {
		return;
	}

	foreach ( array_map( 'absint', $term_ids ) as $term_id ) {
		wp_delete_term( $term_id, WORDCAMP_COMPANION_UNINSTALL_TAXONOMY );
	}
}

function wordcamp_companion_uninstall_delete_transients(): void {
	delete_transient( 'wordcamp_companion_wordcamps_v4' );

	global $wpdb;

	$transient_option_prefixes = [
		'_transient_wordcamp_companion_schedule_',
		'_transient_timeout_wordcamp_companion_schedule_',
		'wordcamp_companion_stale_',
	];

	foreach ( $transient_option_prefixes as $prefix ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$option_names = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( $prefix ) . '%'
			)
		);

		foreach ( $option_names as $option_name ) {
			delete_option( $option_name );
		}
	}
}

function wordcamp_companion_uninstall_delete_site_data(): void {
	wordcamp_companion_uninstall_register_content_types();
	wordcamp_companion_uninstall_delete_saved_sessions();
	wordcamp_companion_uninstall_delete_wordcamp_terms();
	wordcamp_companion_uninstall_delete_transients();
}

function wordcamp_companion_uninstall_delete_user_meta(): void {
	foreach ( [
		'wordcamp_companion_selected_wordcamp',
		'wordcamp_companion_wordcamp_visibility',
		'wordcamp_companion_show_debug_clock',
	] as $meta_key ) {
		delete_metadata( 'user', 0, $meta_key, '', true );
	}
}

if ( is_multisite() ) {
	$wordcamp_companion_site_ids = get_sites(
		[
			'fields' => 'ids',
			'number' => 0,
		]
	);

	foreach ( array_map( 'absint', $wordcamp_companion_site_ids ) as $wordcamp_companion_site_id ) {
		switch_to_blog( $wordcamp_companion_site_id );
		wordcamp_companion_uninstall_delete_site_data();
		restore_current_blog();
	}
} else {
	wordcamp_companion_uninstall_delete_site_data();
}

wordcamp_companion_uninstall_delete_user_meta();
