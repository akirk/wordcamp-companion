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
        <header class="wcc-header wcc-plan-header">
            <div class="wcc-plan-heading">
                <div class="wcc-plan-title-row">
                    <h1>
                        <a id="wcc-page-title-link" class="wcc-title-link" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>">
                            <span id="wcc-page-title"><?php echo esc_html__( 'WordCamp Companion', 'wordcamp-companion' ); ?></span>
                        </a>
                    </h1>
                    <div class="wcc-selected-actions wcc-title-actions">
                        <a id="wcc-open-event" class="wcc-button" href="#" target="_blank" rel="noopener noreferrer"><?php echo esc_html__( 'Event Site', 'wordcamp-companion' ); ?></a>
                        <button id="wcc-companion-visibility" class="wcc-button" type="button" hidden><?php echo esc_html__( 'Show in Companion', 'wordcamp-companion' ); ?></button>
                        <a id="wcc-change-event" class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/plan-your/' ) ); ?>"><?php echo esc_html__( 'Change WordCamp', 'wordcamp-companion' ); ?></a>
                    </div>
                </div>
                <p id="wcc-current-event" class="wcc-current-event"></p>
            </div>
            <div id="wcc-plan-summary" class="wcc-plan-summary"></div>
        </header>

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
