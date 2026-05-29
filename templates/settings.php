<!DOCTYPE html>
<html <?php echo wp_app_language_attributes(); ?>>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo wp_app_title( 'Settings' ); ?></title>
    <?php wp_app_head(); ?>
</head>
<body>
    <?php wp_app_body_open(); ?>

    <main id="wordcamp-companion-app" class="wcc-app" data-page="settings">
        <header class="wcc-header">
            <div>
                <h1>
                    <a class="wcc-title-link" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>">
                        <?php echo esc_html__( 'Settings', 'wordcamp-companion' ); ?>
                    </a>
                </h1>
            </div>
            <div class="wcc-actions">
                <a class="wcc-button" href="<?php echo esc_url( home_url( '/wordcamp-companion/' ) ); ?>"><?php echo esc_html__( 'Companion', 'wordcamp-companion' ); ?></a>
            </div>
        </header>

        <div id="wcc-alerts" class="wcc-alerts" aria-live="polite"></div>

        <section class="wcc-settings" aria-label="<?php echo esc_attr__( 'WordCamp Companion settings', 'wordcamp-companion' ); ?>">
            <div class="wcc-setting-row">
                <div>
                    <h2><?php echo esc_html__( 'Debug Time', 'wordcamp-companion' ); ?></h2>
                    <p><?php echo esc_html__( 'Show the simulator bar on the companion page.', 'wordcamp-companion' ); ?></p>
                </div>
                <label class="wcc-switch">
                    <input id="wcc-setting-debug-clock" type="checkbox" <?php checked( \WordCampCompanion\UserSettings::is_debug_clock_enabled( get_current_user_id() ) ); ?>>
                    <span><?php echo esc_html__( 'Enabled', 'wordcamp-companion' ); ?></span>
                </label>
            </div>
            <div class="wcc-settings-actions">
                <button id="wcc-settings-save" class="wcc-button" type="button"><?php echo esc_html__( 'Save Settings', 'wordcamp-companion' ); ?></button>
                <span id="wcc-settings-status" class="wcc-settings-status" aria-live="polite"></span>
            </div>
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
