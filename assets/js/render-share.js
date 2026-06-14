(function (WCC) {
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;
    function __() { return WCC.__.apply(WCC, arguments); }
    function _n() { return WCC._n.apply(WCC, arguments); }
    function sprintf() { return WCC.sprintf.apply(WCC, arguments); }
    function element() { return WCC.element.apply(WCC, arguments); }
    function setHidden() { return WCC.setHidden.apply(WCC, arguments); }
    function getSelectedEvent() { return WCC.getSelectedEvent.apply(WCC, arguments); }
    function getEventTitle() { return WCC.getEventTitle.apply(WCC, arguments); }
    function getSavedSessionIds() { return WCC.getSavedSessionIds.apply(WCC, arguments); }
    function normalizeWccEventUrl() { return WCC.normalizeWccEventUrl.apply(WCC, arguments); }
    function loadLazyAsset() { return WCC.loadLazyAsset.apply(WCC, arguments); }
    function createQrSvg() { return WCC.createQrSvg.apply(WCC, arguments); }
    function parseWccSessionIds() { return WCC.parseWccSessionIds.apply(WCC, arguments); }
    function formatDate() { return WCC.formatDate.apply(WCC, arguments); }
    function getSelectedTimezone() { return WCC.getSelectedTimezone.apply(WCC, arguments); }
    function createSavedSessionPost() { return WCC.createSavedSessionPost.apply(WCC, arguments); }
    function addSavedSessionPost() { return WCC.addSavedSessionPost.apply(WCC, arguments); }
    function normalizeSavedSessionPost() { return WCC.normalizeSavedSessionPost.apply(WCC, arguments); }
    function clearRequestedWccValueFromUrl() { return WCC.clearRequestedWccValueFromUrl.apply(WCC, arguments); }
    function getErrorAlert() { return WCC.getErrorAlert.apply(WCC, arguments); }
    function render() { return WCC.render.apply(WCC, arguments); }
    function openShareDialog() {
        ensureShareDialog();

        if (!nodes.shareDialog) {
            return;
        }

        updateShareDialog();
        nodes.shareDialog.hidden = false;
        document.body.classList.add('has-wcc-modal');

        const closeButton = nodes.shareDialog.querySelector('.wcc-share-close');
        if (closeButton) {
            closeButton.focus();
        }
    }

    function closeShareDialog() {
        if (!nodes.shareDialog || nodes.shareDialog.hidden) {
            return;
        }

        nodes.shareDialog.hidden = true;
        document.body.classList.remove('has-wcc-modal');
    }

    function ensureShareDialog() {
        if (nodes.shareDialog) {
            return;
        }

        const shareUrl = config.shareUrl || '';
        if (!shareUrl) {
            return;
        }

        const closeButton = element('button', {
            className: 'wcc-share-close',
            type: 'button',
            'aria-label': 'Close share dialog',
            text: 'X',
        });
        closeButton.addEventListener('click', closeShareDialog);

        const panel = element('div', {
            className: 'wcc-share-panel',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'wcc-share-title',
        });
        panel.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        nodes.shareQr = element('div', {
            className: 'wcc-share-qr',
            role: 'img',
            'aria-label': 'QR code for WordCamp Companion',
        });
        nodes.shareOptionApp = createShareOption('app', 'App only');
        nodes.shareOptionSchedule = createShareOption('schedule', 'With schedule');
        nodes.shareLink = element('a', {
            className: 'wcc-button wcc-share-link',
            href: shareUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: 'Open link',
        });
        nodes.shareImportNote = element('p', { className: 'wcc-share-note' });
        nodes.shareImportNote.append(
            'If you have ',
            element('a', {
                href: 'https://github.com/akirk/wordcamp-companion',
                target: '_blank',
                rel: 'noopener noreferrer',
                text: 'WordCamp Companion',
            }),
            ' installed on your own WordPress site, paste this link there to import these sessions.'
        );

        const options = element('fieldset', {
            className: 'wcc-share-options',
            'aria-label': 'Share options',
        });
        options.append(
            nodes.shareOptionApp.label,
            nodes.shareOptionSchedule.label
        );

        panel.append(
            closeButton,
            element('h2', { id: 'wcc-share-title', text: 'Share WordCamp Companion' }),
            nodes.shareQr,
            options,
            nodes.shareLink,
            nodes.shareImportNote
        );

        nodes.shareDialog = element('div', {
            className: 'wcc-share-dialog',
            hidden: 'hidden',
        });
        nodes.shareDialog.addEventListener('click', closeShareDialog);
        nodes.shareDialog.append(panel);
        document.body.append(nodes.shareDialog);
    }

    function createShareOption(value, labelText) {
        const id = 'wcc-share-option-' + value;
        const input = element('input', {
            id: id,
            type: 'radio',
            name: 'wcc-share-mode',
            value: value,
        });
        const text = element('span', { text: labelText });
        const label = element('label', { className: 'wcc-share-option', for: id });

        input.addEventListener('change', function () {
            if (!input.checked) {
                return;
            }

            state.shareMode = value;
            state.shareModeTouched = true;
            updateShareDialog();
        });
        label.append(input, text);

        return {
            input: input,
            label: label,
        };
    }

    function updateShareDialog() {
        if (!nodes.shareQr || !nodes.shareLink) {
            return;
        }

        const canShareSchedule = Boolean(getSelectedEvent());
        const mode = getActiveShareMode(canShareSchedule);
        const shareUrl = getShareUrlForMode(mode);

        nodes.shareOptionApp.input.checked = mode === 'app';
        nodes.shareOptionSchedule.input.checked = mode === 'schedule';
        nodes.shareOptionApp.label.classList.toggle('is-checked', mode === 'app');
        nodes.shareOptionSchedule.label.classList.toggle('is-checked', mode === 'schedule');
        nodes.shareOptionSchedule.input.disabled = !canShareSchedule;
        nodes.shareOptionSchedule.label.classList.toggle('is-disabled', !canShareSchedule);
        nodes.shareLink.href = shareUrl;
        setHidden(nodes.shareImportNote, mode !== 'schedule' || !getCurrentWccSharePayload());

        renderShareQr(shareUrl);
    }

    function getActiveShareMode(canShareSchedule) {
        if (!canShareSchedule) {
            return 'app';
        }

        if (!state.shareModeTouched || !state.shareMode) {
            return 'schedule';
        }

        return state.shareMode === 'schedule' ? 'schedule' : 'app';
    }

    function getShareUrlForMode(mode) {
        const shareUrl = config.shareUrl || 'https://my.wordpress.net/?myapps-i=wordcamp-companion';

        if (mode !== 'schedule') {
            return shareUrl;
        }

        const payload = getCurrentWccSharePayload();
        if (!payload) {
            return shareUrl;
        }

        try {
            const url = new URL(shareUrl, window.location.href);
            url.searchParams.set('wcc1', payload);
            return url.toString();
        } catch (error) {
            const separator = shareUrl.indexOf('?') === -1 ? '?' : '&';
            return shareUrl + separator + 'wcc1=' + encodeURIComponent(payload);
        }
    }

    function getCurrentWccSharePayload() {
        const event = getSelectedEvent();
        if (!event || !event.event_url) {
            return '';
        }

        const eventToken = getWccEventToken(event.event_url);
        if (!eventToken) {
            return '';
        }

        const sessionIds = Array.from(getSavedSessionIds()).sort(function (a, b) {
            return a - b;
        });

        return eventToken + (sessionIds.length ? '_' + sessionIds.join('.') : '');
    }

    function getWccEventToken(eventUrl) {
        try {
            const url = new URL(eventUrl, window.location.href);
            const hostParts = url.hostname.toLowerCase().split('.');
            const wordcampIndex = hostParts.indexOf('wordcamp');
            const subdomain = wordcampIndex > 0 ? hostParts[wordcampIndex - 1] : '';
            const year = (url.pathname.match(/\/(\d{4})(?:\/|$)/) || [])[1] || '';

            if (subdomain && year) {
                return subdomain + '.' + year;
            }

            return normalizeWccEventUrl(eventUrl);
        } catch (error) {
            return '';
        }
    }

    function renderShareQr(shareUrl) {
        nodes.shareQr.replaceChildren();
        nodes.shareQr.dataset.shareUrl = shareUrl;

        if (typeof WCC.createQrSvg !== 'function') {
            nodes.shareQr.append(element('span', {
                className: 'wcc-share-qr-error',
                text: 'Loading QR...'
            }));

            loadLazyAsset('qr').then(function () {
                if (nodes.shareQr && nodes.shareQr.dataset.shareUrl === shareUrl) {
                    renderShareQr(shareUrl);
                }
            }).catch(function () {
                if (nodes.shareQr && nodes.shareQr.dataset.shareUrl === shareUrl) {
                    nodes.shareQr.replaceChildren(element('span', {
                        className: 'wcc-share-qr-error',
                        text: 'QR unavailable',
                    }));
                }
            });
            return;
        }

        try {
            nodes.shareQr.innerHTML = createQrSvg(shareUrl);
        } catch (error) {
            nodes.shareQr.append(element('span', {
                className: 'wcc-share-qr-error',
                text: 'QR unavailable',
            }));
        }
    }

    function openImportScheduleDialog(requestedWcc) {
        ensureImportScheduleDialog();

        if (!nodes.importScheduleDialog) {
            return;
        }

        nodes.importScheduleDialog.dataset.wccEventUrl = requestedWcc.eventUrl;
        nodes.importScheduleDialog.dataset.wccSessionIds = requestedWcc.sessionIds.join('.');
        nodes.importScheduleDialog.dataset.wccSelectedSessionIds = requestedWcc.sessionIds.join('.');
        updateImportScheduleDialog();
        nodes.importScheduleDialog.hidden = false;
        document.body.classList.add('has-wcc-modal');

        if (nodes.importScheduleImport) {
            nodes.importScheduleImport.focus();
        }
    }

    function closeImportScheduleDialog() {
        if (!nodes.importScheduleDialog || nodes.importScheduleDialog.hidden) {
            return;
        }

        nodes.importScheduleDialog.hidden = true;
        document.body.classList.remove('has-wcc-modal');
    }

    function ensureImportScheduleDialog() {
        if (nodes.importScheduleDialog) {
            return;
        }

        nodes.importScheduleText = element('p', { className: 'wcc-import-text' });
        nodes.importSchedulePreview = element('ul', { className: 'wcc-import-preview' });
        nodes.importScheduleImport = element('button', {
            className: 'wcc-button',
            type: 'button',
            text: 'Add selected',
        });
        nodes.importScheduleSkip = element('button', {
            className: 'wcc-button',
            type: 'button',
            text: 'Skip',
        });
        nodes.importScheduleClose = element('button', {
            className: 'wcc-share-close',
            type: 'button',
            'aria-label': 'Close import dialog',
            text: 'X',
        });

        nodes.importScheduleImport.addEventListener('click', importSharedSchedule);
        nodes.importScheduleSkip.addEventListener('click', closeImportScheduleDialog);
        nodes.importScheduleClose.addEventListener('click', closeImportScheduleDialog);

        const panel = element('div', {
            className: 'wcc-share-panel wcc-import-panel',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'wcc-import-title',
        });
        const actions = element('div', { className: 'wcc-modal-actions' });
        actions.append(nodes.importScheduleSkip, nodes.importScheduleImport);
        panel.addEventListener('click', function (event) {
            event.stopPropagation();
        });
        panel.append(
            nodes.importScheduleClose,
            element('h2', { id: 'wcc-import-title', text: 'Import Shared Schedule' }),
            nodes.importScheduleText,
            nodes.importSchedulePreview,
            actions
        );

        nodes.importScheduleDialog = element('div', {
            className: 'wcc-share-dialog',
            hidden: 'hidden',
        });
        nodes.importScheduleDialog.addEventListener('click', closeImportScheduleDialog);
        nodes.importScheduleDialog.append(panel);
        document.body.append(nodes.importScheduleDialog);
    }

    function updateImportScheduleDialog() {
        const preview = getImportSchedulePreview();
        const event = getSelectedEvent();
        const eventTitle = event ? getEventTitle(event) : __('this WordCamp');
        const savedIds = getSavedSessionIds();
        const selectedIds = getImportScheduleSelectedSessionIds();
        const selectedImportCount = getSelectableImportSessions(preview.sessions, savedIds, selectedIds).length;
        const missingCount = preview.missingIds.length;
        const foundText = sprintf(
            _n('%1$d of %2$d shared session', '%1$d of %2$d shared sessions', preview.ids.length),
            preview.sessions.length,
            preview.ids.length
        );

        let importText = sprintf(
            __('%1$s found for %2$s. Select the sessions to add to your plan.'),
            foundText,
            eventTitle
        );
        if (missingCount) {
            importText += ' ' + sprintf(
                _n(
                    '%d shared session was not found in the published schedule.',
                    '%d shared sessions were not found in the published schedule.',
                    missingCount
                ),
                missingCount
            );
        }
        nodes.importScheduleText.textContent = importText;
        renderImportSchedulePreview(preview, savedIds, selectedIds);
        nodes.importScheduleImport.disabled = state.importingSharedSchedule || !selectedImportCount;
        nodes.importScheduleImport.textContent = state.importingSharedSchedule ? __('Adding...') : __('Add selected');
        nodes.importScheduleSkip.disabled = state.importingSharedSchedule;
    }

    function getImportSchedulePreview() {
        const ids = getImportScheduleSessionIds();
        const sessionsById = new Map();
        const sessions = [];
        const missingIds = [];

        if (state.schedule && Array.isArray(state.schedule.sessions)) {
            state.schedule.sessions.forEach(function (session) {
                const id = Number(session.id || 0);
                if (id) {
                    sessionsById.set(id, session);
                }
            });
        }

        ids.forEach(function (id) {
            if (sessionsById.has(id)) {
                sessions.push(sessionsById.get(id));
            } else {
                missingIds.push(id);
            }
        });

        return {
            ids: ids,
            sessions: sessions,
            missingIds: missingIds,
        };
    }

    function renderImportSchedulePreview(preview, savedIds, selectedIds) {
        if (!nodes.importSchedulePreview) {
            return;
        }

        nodes.importSchedulePreview.replaceChildren();

        if (!preview.ids.length) {
            nodes.importSchedulePreview.append(element('li', {
                className: 'wcc-import-preview-empty',
                text: 'This shared link does not include saved sessions.',
            }));
            return;
        }

        if (!preview.sessions.length) {
            nodes.importSchedulePreview.append(element('li', {
                className: 'wcc-import-preview-empty',
                text: 'No matching sessions were found in the published schedule.',
            }));
            return;
        }

        preview.sessions.forEach(function (session) {
            const id = Number(session.id || 0);
            nodes.importSchedulePreview.append(renderImportSchedulePreviewItem(session, {
                alreadySaved: savedIds.has(id),
                selected: selectedIds.has(id),
            }));
        });

        if (preview.missingIds.length) {
            nodes.importSchedulePreview.append(element('li', {
                className: 'wcc-import-preview-empty',
                text: sprintf(
                    _n(
                        '%d shared session could not be previewed.',
                        '%d shared sessions could not be previewed.',
                        preview.missingIds.length
                    ),
                    preview.missingIds.length
                ),
            }));
        }
    }

    function renderImportSchedulePreviewItem(session, options) {
        options = options || {};
        const sessionId = Number(session && session.id || 0);
        const alreadySaved = Boolean(options.alreadySaved);
        const item = element('li', { className: 'wcc-import-preview-item' + (alreadySaved ? ' is-saved' : '') });
        const content = element('span', { className: 'wcc-import-preview-content' });
        const title = element('strong', { text: session.title || 'Untitled session' });
        const meta = getImportScheduleSessionMeta(session);
        const sessionLink = createImportScheduleSessionLink(session);

        content.append(title);
        if (meta) {
            content.append(element('span', { className: 'wcc-import-preview-meta', text: meta }));
        }
        if (alreadySaved) {
            content.append(element('span', { className: 'wcc-import-preview-badge', text: 'Already in plan' }));
            item.append(content);
            if (sessionLink) {
                item.append(sessionLink);
            }
            return item;
        }

        const label = element('label', { className: 'wcc-import-preview-choice' });
        const checkbox = element('input', {
            type: 'checkbox',
            value: String(sessionId),
            'aria-label': 'Import ' + (session.title || 'session'),
        });

        checkbox.checked = Boolean(options.selected);
        checkbox.disabled = state.importingSharedSchedule || !sessionId;
        checkbox.addEventListener('change', function () {
            toggleImportScheduleSession(sessionId, checkbox.checked);
            updateImportScheduleDialog();
        });

        label.append(checkbox, content);
        item.append(label);
        if (sessionLink) {
            item.append(sessionLink);
        }

        return item;
    }

    function createImportScheduleSessionLink(session) {
        const url = session && session.url ? session.url : '';

        if (!url) {
            return null;
        }

        const label = 'Open WordCamp session page for ' + (session.title || 'session');
        const link = element('a', {
            className: 'wcc-import-preview-link',
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': label,
            title: 'Open session page',
        });

        link.append(element('span', {
            className: 'dashicons dashicons-external',
            'aria-hidden': 'true',
        }));

        return link;
    }

    function getImportScheduleSessionMeta(session) {
        const parts = [];
        const timeZone = getSelectedTimezone();

        if (session.start) {
            parts.push(formatDate(session.start, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            }, timeZone));
        }
        if (Array.isArray(session.track_names) && session.track_names.length) {
            parts.push(session.track_names.join(', '));
        }
        if (Array.isArray(session.speaker_names) && session.speaker_names.length) {
            parts.push(session.speaker_names.join(', '));
        }

        return parts.join(' - ');
    }

    function getImportScheduleSessionIds() {
        if (!nodes.importScheduleDialog) {
            return [];
        }

        return parseWccSessionIds(nodes.importScheduleDialog.dataset.wccSessionIds || '');
    }

    function getImportScheduleSelectedSessionIds() {
        if (!nodes.importScheduleDialog) {
            return new Set();
        }

        return new Set(parseWccSessionIds(nodes.importScheduleDialog.dataset.wccSelectedSessionIds || ''));
    }

    function setImportScheduleSelectedSessionIds(ids) {
        if (!nodes.importScheduleDialog) {
            return;
        }

        nodes.importScheduleDialog.dataset.wccSelectedSessionIds = ids.filter(Boolean).join('.');
    }

    function toggleImportScheduleSession(sessionId, selected) {
        const selectedIds = getImportScheduleSelectedSessionIds();
        const id = Number(sessionId || 0);

        if (!id) {
            return;
        }

        if (selected) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }

        setImportScheduleSelectedSessionIds(Array.from(selectedIds));
    }

    function getSelectableImportSessions(sessions, savedIds, selectedIds) {
        return sessions.filter(function (session) {
            const id = Number(session && session.id || 0);

            return id && selectedIds.has(id) && !savedIds.has(id);
        });
    }

    async function importSharedSchedule() {
        if (state.importingSharedSchedule) {
            return;
        }

        const preview = getImportSchedulePreview();
        const ids = preview.ids;
        if (!ids.length || !state.schedule || !Array.isArray(state.schedule.sessions)) {
            closeImportScheduleDialog();
            return;
        }

        const savedIds = getSavedSessionIds();
        const selectedIds = getImportScheduleSelectedSessionIds();
        const sessionsToImport = getSelectableImportSessions(preview.sessions, savedIds, selectedIds);

        if (!sessionsToImport.length) {
            state.alert = {
                type: 'notice',
                message: 'No new shared sessions are selected to add.',
            };
            closeImportScheduleDialog();
            render();
            return;
        }

        if (!preview.sessions.length) {
            state.alert = { type: 'notice', message: 'The shared sessions are not available in this schedule.' };
            closeImportScheduleDialog();
            render();
            return;
        }

        state.importingSharedSchedule = true;
        updateImportScheduleDialog();

        try {
            for (let index = 0; index < sessionsToImport.length; index++) {
                const session = sessionsToImport[index];
                const createdPost = await createSavedSessionPost(session);
                addSavedSessionPost(normalizeSavedSessionPost(createdPost, session));
            }

            state.alert = {
                type: 'success',
                message: sprintf(
                    _n(
                        '%d shared session added to your plan.',
                        '%d shared sessions added to your plan.',
                        sessionsToImport.length
                    ),
                    sessionsToImport.length
                ),
            };
            state.toast = state.alert;
            state.alert = null;
            clearRequestedWccValueFromUrl();
            closeImportScheduleDialog();
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.importingSharedSchedule = false;
            updateImportScheduleDialog();
            render();
        }
    }


    function createShareIconButton() {
        const button = element("button", {
            className: "wcc-share-icon-button",
            type: "button",
            "aria-label": "Share WordCamp Companion",
            title: "Share",
        });
        const icon = element("span", {
            className: "dashicons dashicons-share",
            "aria-hidden": "true",
        });

        button.append(icon);
        button.addEventListener("click", openShareDialog);

        return button;
    }

    Object.assign(WCC, {
        openShareDialog: openShareDialog,
        closeShareDialog: closeShareDialog,
        ensureShareDialog: ensureShareDialog,
        createShareOption: createShareOption,
        updateShareDialog: updateShareDialog,
        getActiveShareMode: getActiveShareMode,
        getShareUrlForMode: getShareUrlForMode,
        getCurrentWccSharePayload: getCurrentWccSharePayload,
        getWccEventToken: getWccEventToken,
        renderShareQr: renderShareQr,
        openImportScheduleDialog: openImportScheduleDialog,
        closeImportScheduleDialog: closeImportScheduleDialog,
        ensureImportScheduleDialog: ensureImportScheduleDialog,
        updateImportScheduleDialog: updateImportScheduleDialog,
        getImportSchedulePreview: getImportSchedulePreview,
        renderImportSchedulePreview: renderImportSchedulePreview,
        renderImportSchedulePreviewItem: renderImportSchedulePreviewItem,
        createImportScheduleSessionLink: createImportScheduleSessionLink,
        getImportScheduleSessionMeta: getImportScheduleSessionMeta,
        getImportScheduleSessionIds: getImportScheduleSessionIds,
        getImportScheduleSelectedSessionIds: getImportScheduleSelectedSessionIds,
        setImportScheduleSelectedSessionIds: setImportScheduleSelectedSessionIds,
        toggleImportScheduleSession: toggleImportScheduleSession,
        getSelectableImportSessions: getSelectableImportSessions,
        importSharedSchedule: importSharedSchedule,
        createShareIconButton: createShareIconButton
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
