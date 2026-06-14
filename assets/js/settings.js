(function () {
    const config = window.WordCampCompanionConfig || {};

    function init() {
        const app = document.getElementById('wordcamp-companion-app');

        if (!app || app.dataset.page !== 'settings') {
            return;
        }

        const checkbox = document.getElementById('wcc-setting-debug-clock');
        const saveButton = document.getElementById('wcc-settings-save');
        const status = document.getElementById('wcc-settings-status');
        const build = document.getElementById('wcc-js-build');

        if (build) {
            build.textContent = 'JS ' + (config.assetVersion || 'settings');
        }

        if (!checkbox || !saveButton) {
            return;
        }

        checkbox.addEventListener('change', function () {
            if (status) {
                status.textContent = '';
            }
        });

        saveButton.addEventListener('click', function () {
            saveSettings(checkbox, saveButton, status);
        });
    }

    async function saveSettings(checkbox, saveButton, status) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        if (status) {
            status.textContent = '';
        }

        try {
            const response = await fetch(new URL('settings', config.restUrl || window.location.href).toString(), {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': config.nonce || '',
                },
                body: JSON.stringify({
                    show_debug_clock: Boolean(checkbox.checked),
                }),
            });
            const data = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(data.message || response.statusText || 'Could not save settings.');
            }

            checkbox.checked = Boolean(data.show_debug_clock);
            if (status) {
                status.textContent = 'Saved';
            }
        } catch (error) {
            if (status) {
                status.textContent = error && error.message ? error.message : 'Could not save settings.';
            }
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Settings';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
