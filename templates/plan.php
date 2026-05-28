<!DOCTYPE html>
<html <?php echo wp_app_language_attributes(); ?>>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo wp_app_title( 'WordCamp Companion' ); ?></title>
    <?php wp_app_head(); ?>
</head>
<body>
    <?php wp_app_body_open(); ?>

    <main id="wordcamp-companion-app" class="wcc-app" data-page="plan">
        <section id="wcc-debug-clock" class="wcc-debug-clock" aria-label="<?php echo esc_attr__( 'Debug time simulator', 'wordcamp-companion' ); ?>">
            <div>
                <span class="wcc-kicker"><?php echo esc_html__( 'Debug Time', 'wordcamp-companion' ); ?></span>
                <strong id="wcc-debug-current"></strong>
            </div>
            <button id="wcc-debug-play" class="wcc-debug-play" type="button" aria-pressed="false"><?php echo esc_html__( 'Play', 'wordcamp-companion' ); ?></button>
            <label class="wcc-debug-rate">
                <span><?php echo esc_html__( 'Rate', 'wordcamp-companion' ); ?></span>
                <input id="wcc-debug-rate" type="range" min="1" max="1200" step="1" value="300">
                <strong id="wcc-debug-rate-label">300x</strong>
            </label>
            <div class="wcc-debug-jumps" aria-label="<?php echo esc_attr__( 'Quick time adjustments', 'wordcamp-companion' ); ?>">
                <button type="button" data-debug-start="wordcamp"><?php echo esc_html__( 'Start', 'wordcamp-companion' ); ?></button>
                <button type="button" data-debug-jump="-20">-20m</button>
                <button type="button" data-debug-jump="20">+20m</button>
                <button type="button" data-debug-jump="-60">-1h</button>
                <button type="button" data-debug-jump="60">+1h</button>
                <button type="button" data-debug-jump="-1440">-1d</button>
                <button type="button" data-debug-jump="1440">+1d</button>
            </div>
            <button id="wcc-debug-reset" class="wcc-button" type="button"><?php echo esc_html__( 'Reset', 'wordcamp-companion' ); ?></button>
        </section>

        <header class="wcc-header">
            <div>
                <h1><?php echo esc_html__( 'WordCamp Companion', 'wordcamp-companion' ); ?></h1>
                <p id="wcc-current-event" class="wcc-current-event"></p>
            </div>
            <div id="wcc-plan-summary" class="wcc-plan-summary"></div>
        </header>

        <section id="wcc-selected-event" class="wcc-selected-event" hidden>
            <div>
                <span class="wcc-kicker"><?php echo esc_html__( 'Selected WordCamp', 'wordcamp-companion' ); ?></span>
                <h2 id="wcc-selected-title"></h2>
                <p id="wcc-selected-meta"></p>
            </div>
            <div class="wcc-selected-actions">
                <a id="wcc-open-event" class="wcc-button" href="#" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'Event Site', 'wordcamp-companion' ); ?></a>
                <a id="wcc-change-event" class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/plan-your/' ) ); ?>"><?php echo esc_html__( 'Change WordCamp', 'wordcamp-companion' ); ?></a>
            </div>
        </section>

        <section id="wcc-planner-nav" class="wcc-planner-nav" aria-label="<?php echo esc_attr__( 'Planner controls', 'wordcamp-companion' ); ?>">
            <div class="wcc-tabs" role="tablist" aria-label="<?php echo esc_attr__( 'Schedule views', 'wordcamp-companion' ); ?>">
                <button id="wcc-tab-schedule" class="wcc-tab is-active" type="button" role="tab" aria-selected="true" data-view="schedule"><?php echo esc_html__( 'Schedule', 'wordcamp-companion' ); ?></button>
                <button id="wcc-tab-plan" class="wcc-tab" type="button" role="tab" aria-selected="false" data-view="plan"><?php echo esc_html__( 'My Plan', 'wordcamp-companion' ); ?></button>
            </div>
            <div class="wcc-actions">
                <a class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>"><?php echo esc_html__( 'Companion', 'wordcamp-companion' ); ?></a>
                <button id="wcc-refresh-schedule" class="wcc-button" type="button"><?php echo esc_html__( 'Refresh Schedule', 'wordcamp-companion' ); ?></button>
            </div>
        </section>

        <div id="wcc-alerts" class="wcc-alerts" aria-live="polite"></div>

        <section class="wcc-content">
            <section class="wcc-main" aria-label="<?php echo esc_attr__( 'WordCamp schedule', 'wordcamp-companion' ); ?>">
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
