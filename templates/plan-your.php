<!DOCTYPE html>
<html <?php echo wp_app_language_attributes(); ?>>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo wp_app_title( 'Plan your WordCamp' ); ?></title>
    <?php wp_app_head(); ?>
</head>
<body>
    <?php wp_app_body_open(); ?>

    <main id="wordcamp-companion-app" class="wcc-app" data-page="plan-selector">
        <header class="wcc-header">
            <div>
                <h1><?php echo esc_html__( 'Plan your WordCamp', 'wordcamp-companion' ); ?></h1>
                <p id="wcc-current-event" class="wcc-current-event"><?php echo esc_html__( 'Choose the next WordCamp you want to plan.', 'wordcamp-companion' ); ?></p>
            </div>
            <div id="wcc-plan-summary" class="wcc-plan-summary"></div>
        </header>

        <section id="wcc-picker" class="wcc-picker" aria-label="<?php echo esc_attr__( 'Choose a WordCamp', 'wordcamp-companion' ); ?>">
            <label class="wcc-field">
                <span><?php echo esc_html__( 'WordCamp', 'wordcamp-companion' ); ?></span>
                <select id="wcc-event-select">
                    <option value=""><?php echo esc_html__( 'Loading WordCamps...', 'wordcamp-companion' ); ?></option>
                </select>
            </label>

            <div class="wcc-actions">
                <a class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>"><?php echo esc_html__( 'Companion', 'wordcamp-companion' ); ?></a>
                <button id="wcc-refresh-events" class="wcc-button" type="button"><?php echo esc_html__( 'Refresh Events', 'wordcamp-companion' ); ?></button>
            </div>
        </section>

        <div id="wcc-alerts" class="wcc-alerts" aria-live="polite"></div>

        <section class="wcc-content">
            <aside class="wcc-sidebar" aria-label="<?php echo esc_attr__( 'Upcoming WordCamps', 'wordcamp-companion' ); ?>">
                <div class="wcc-sidebar-header">
                    <h2><?php echo esc_html__( 'Upcoming', 'wordcamp-companion' ); ?></h2>
                    <span id="wcc-event-count" class="wcc-count"></span>
                </div>
                <div id="wcc-event-list" class="wcc-event-list"></div>
            </aside>

            <section class="wcc-main" aria-label="<?php echo esc_attr__( 'WordCamp selection', 'wordcamp-companion' ); ?>">
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
