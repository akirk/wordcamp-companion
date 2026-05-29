<!DOCTYPE html>
<html <?php echo wp_app_language_attributes(); ?>>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo wp_app_title( 'Session Notes' ); ?></title>
    <?php wp_app_head(); ?>
</head>
<body>
    <?php wp_app_body_open(); ?>

    <main id="wordcamp-companion-app" class="wcc-app" data-page="notes">
        <header class="wcc-header wcc-plan-header">
            <div class="wcc-plan-heading">
                <h1>
                    <a id="wcc-page-title-link" class="wcc-title-link" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>">
                        <span id="wcc-page-title"><?php echo esc_html__( 'Session Notes', 'wordcamp-companion' ); ?></span>
                    </a>
                </h1>
                <p id="wcc-current-event" class="wcc-current-event"></p>
            </div>
            <div class="wcc-notes-header-side">
                <div class="wcc-actions">
                    <a class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>"><?php echo esc_html__( 'Companion', 'wordcamp-companion' ); ?></a>
                    <a id="wcc-notes-plan-link" class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/plan-your/' ) ); ?>"><?php echo esc_html__( 'Plan your day', 'wordcamp-companion' ); ?></a>
                </div>
                <div id="wcc-plan-summary" class="wcc-plan-summary"></div>
            </div>
        </header>

        <section class="wcc-planner-nav" aria-label="<?php echo esc_attr__( 'Notes controls', 'wordcamp-companion' ); ?>">
            <label class="wcc-field">
                <span><?php echo esc_html__( 'WordCamp', 'wordcamp-companion' ); ?></span>
                <select id="wcc-notes-event-select"></select>
            </label>
        </section>

        <div id="wcc-alerts" class="wcc-alerts" aria-live="polite"></div>

        <section class="wcc-content">
            <section class="wcc-main" aria-label="<?php echo esc_attr__( 'Session notes', 'wordcamp-companion' ); ?>">
                <div id="wcc-status" class="wcc-status"></div>
                <div id="wcc-schedule" class="wcc-schedule"></div>
            </section>
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
