<!DOCTYPE html>
<html <?php echo wp_app_language_attributes(); ?>>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo wp_app_title( 'Upcoming WordCamps' ); ?></title>
    <?php wp_app_head(); ?>
</head>
<body>
    <?php wp_app_body_open(); ?>

    <main id="wordcamp-companion-app" class="wcc-app" data-page="plan-selector">
        <header class="wcc-header">
            <div>
                <h1 class="wcc-heading-with-count">
                    <?php echo esc_html__( 'Upcoming WordCamps', 'wordcamp-companion' ); ?>
                    <span id="wcc-event-count" class="wcc-count"></span>
                </h1>
                <p id="wcc-current-event" class="wcc-current-event" hidden></p>
            </div>
            <div id="wcc-plan-summary" class="wcc-plan-summary wcc-actions">
                <a class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>"><?php echo esc_html__( 'Companion', 'wordcamp-companion' ); ?></a>
                <button id="wcc-refresh-events" class="wcc-button" type="button"><?php echo esc_html__( 'Refresh Events', 'wordcamp-companion' ); ?></button>
            </div>
        </header>

        <div id="wcc-alerts" class="wcc-alerts" aria-live="polite"></div>

        <section class="wcc-plan-selector" aria-label="<?php echo esc_attr__( 'Upcoming WordCamps', 'wordcamp-companion' ); ?>">
            <div id="wcc-event-list" class="wcc-event-list wcc-event-list-wide"></div>
        </section>

        <footer class="wcc-build">
            <?php
            $asset_version = defined( 'WORDCAMP_COMPANION_ASSET_VERSION' ) ? WORDCAMP_COMPANION_ASSET_VERSION : 'unknown';
            ?>
            <?php echo esc_html__( 'Build', 'wordcamp-companion' ); ?> <?php echo esc_html( $asset_version ); ?> -
            <span id="wcc-js-build"><?php echo esc_html__( 'JS not loaded', 'wordcamp-companion' ); ?></span>
        </footer>
    </main>

    <?php wp_app_body_close(); ?>
</body>
</html>
