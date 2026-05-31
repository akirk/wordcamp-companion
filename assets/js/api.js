(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function getSelectedEvent() {
        return WCC.getSelectedEvent.apply(WCC, arguments);
    }

    async function api(path, options) {
        options = options || {};
        return requestJson(config.restUrl, path, options, true);
    }

    async function wpApi(path, options) {
        options = options || {};
        return requestJson(config.wpRestUrl, path, options, false);
    }

    async function requestJson(baseUrl, path, options, addAssetVersion) {
        const url = new URL(path.replace(/^\/+/, ''), baseUrl);

        Object.keys(options.query || {}).forEach(function (key) {
            url.searchParams.set(key, options.query[key]);
        });

        if (addAssetVersion && (options.method || 'GET').toUpperCase() === 'GET') {
            url.searchParams.set('_wcc_asset', config.assetVersion || SCRIPT_BUILD);
        }

        const headers = {
            Accept: 'application/json',
            'X-WP-Nonce': config.nonce || '',
        };

        const fetchOptions = {
            method: options.method || 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: headers,
        };

        if (options.body) {
            headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(options.body);
        }

        let response;

        try {
            response = await fetch(url.toString(), fetchOptions);
        } catch (error) {
            throw new Error('Network connection unavailable. Cached data was kept when available.');
        }

        const data = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throwApiError(data, response);
        }

        return data;
    }

    function throwApiError(data, response) {
        data = data && typeof data === 'object' ? data : {};
        const details = data.data && typeof data.data === 'object' ? data.data : {};
        const error = new Error(data.message || response.statusText || 'Request failed.');

        error.code = data.code || '';
        error.status = Number(details.status || response.status || 0);
        error.remoteStatus = Number(details.remote_status || 0);
        error.remoteSource = details.remote_source || '';

        throw error;
    }

    function getErrorAlert(error) {
        const alert = {
            type: 'error',
            message: error && error.message ? error.message : 'Request failed.',
        };

        if (isScheduleAccessDeniedError(error)) {
            alert.message = 'This WordCamp is not allowing schedule data to load here right now. Open the event site for the published schedule, or try again later.';

            const event = getSelectedEvent();
            const eventUrl = event && event.event_url ? event.event_url : '';

            if (eventUrl) {
                alert.actions = [
                    {
                        label: 'Open Event Site',
                        href: eventUrl,
                        external: true,
                    },
                ];
            }
        }

        return alert;
    }

    function isScheduleAccessDeniedError(error) {
        if (!error || error.remoteSource === 'central') {
            return false;
        }

        const remoteStatus = Number(error.remoteStatus || 0);
        return error.code === 'wordcamp_companion_schedule_access_denied' ||
            remoteStatus === 401 ||
            remoteStatus === 403 ||
            /HTTP\s+(401|403)\b/.test(error.message || '');
    }

    Object.assign(WCC, {
        api: api,
        wpApi: wpApi,
        requestJson: requestJson,
        throwApiError: throwApiError,
        getErrorAlert: getErrorAlert,
        isScheduleAccessDeniedError: isScheduleAccessDeniedError
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
