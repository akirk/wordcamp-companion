(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function selectEvent() {
        return WCC.selectEvent.apply(WCC, arguments);
    }
    function selectEventForMobileCompanion() {
        return WCC.selectEventForMobileCompanion.apply(WCC, arguments);
    }
    function setEventCompanionVisibility() {
        return WCC.setEventCompanionVisibility.apply(WCC, arguments);
    }
    function savedSessionPostToSession() {
        return WCC.savedSessionPostToSession.apply(WCC, arguments);
    }
    function loadGapCandidates() {
        return WCC.loadGapCandidates.apply(WCC, arguments);
    }
    function toggleSession() {
        return WCC.toggleSession.apply(WCC, arguments);
    }
    function queueSessionNotesAutosave() {
        return WCC.queueSessionNotesAutosave.apply(WCC, arguments);
    }
    function getErrorAlert() {
        return WCC.getErrorAlert.apply(WCC, arguments);
    }
    function __() {
        return WCC.__.apply(WCC, arguments);
    }
    function _n() {
        return WCC._n.apply(WCC, arguments);
    }
    function sprintf() {
        return WCC.sprintf.apply(WCC, arguments);
    }
    function createQrSvg() {
        return WCC.createQrSvg.apply(WCC, arguments);
    }
    function createSavedSessionPost() {
        return WCC.createSavedSessionPost.apply(WCC, arguments);
    }
    function normalizeSavedSessionPost() {
        return WCC.normalizeSavedSessionPost.apply(WCC, arguments);
    }
    function getCompanionStepLabel() {
        return WCC.getCompanionStepLabel.apply(WCC, arguments);
    }
    function buildCompanionTimeline() {
        return WCC.buildCompanionTimeline.apply(WCC, arguments);
    }
    function getNow() {
        return WCC.getNow.apply(WCC, arguments);
    }
    function formatDebugTimeAdjustment() {
        return WCC.formatDebugTimeAdjustment.apply(WCC, arguments);
    }
    function isCompanionStepPast() {
        return WCC.isCompanionStepPast.apply(WCC, arguments);
    }
    function isCompanionStepCurrent() {
        return WCC.isCompanionStepCurrent.apply(WCC, arguments);
    }
    function formatCompanionTiming() {
        return WCC.formatCompanionTiming.apply(WCC, arguments);
    }
    function formatCompanionStepTime() {
        return WCC.formatCompanionStepTime.apply(WCC, arguments);
    }
    function getPrimaryTrack() {
        return WCC.getPrimaryTrack.apply(WCC, arguments);
    }
    function getTracksForSessions() {
        return WCC.getTracksForSessions.apply(WCC, arguments);
    }
    function groupSessionsByTime() {
        return WCC.groupSessionsByTime.apply(WCC, arguments);
    }
    function groupSessionsByTrack() {
        return WCC.groupSessionsByTrack.apply(WCC, arguments);
    }
    function shouldSpanTracks() {
        return WCC.shouldSpanTracks.apply(WCC, arguments);
    }
    function formatSlotTime() {
        return WCC.formatSlotTime.apply(WCC, arguments);
    }
    function getEventTitle() {
        return WCC.getEventTitle.apply(WCC, arguments);
    }
    function getRenderableEvents() {
        return WCC.getRenderableEvents.apply(WCC, arguments);
    }
    function getAttendingEvents() {
        return WCC.getAttendingEvents.apply(WCC, arguments);
    }
    function getNoteEvents() {
        return WCC.getNoteEvents.apply(WCC, arguments);
    }
    function isEventShownInCompanion() {
        return WCC.isEventShownInCompanion.apply(WCC, arguments);
    }
    function shouldOpenCompanionFromPlanSelector() {
        return WCC.shouldOpenCompanionFromPlanSelector.apply(WCC, arguments);
    }
    function normalizeWccEventUrl() {
        return WCC.normalizeWccEventUrl.apply(WCC, arguments);
    }
    function parseWccSessionIds() {
        return WCC.parseWccSessionIds.apply(WCC, arguments);
    }
    function getEventSlug() {
        return WCC.getEventSlug.apply(WCC, arguments);
    }
    function getPlanYourDayUrl() {
        return WCC.getPlanYourDayUrl.apply(WCC, arguments);
    }
    function getNotesUrl() {
        return WCC.getNotesUrl.apply(WCC, arguments);
    }
    function getSelectedEvent() {
        return WCC.getSelectedEvent.apply(WCC, arguments);
    }
    function getSelectedPlan() {
        return WCC.getSelectedPlan.apply(WCC, arguments);
    }
    function getSavedSessionIds() {
        return WCC.getSavedSessionIds.apply(WCC, arguments);
    }
    function getSessionNotePost() {
        return WCC.getSessionNotePost.apply(WCC, arguments);
    }
    function getSessionNotes() {
        return WCC.getSessionNotes.apply(WCC, arguments);
    }
    function addSavedSessionPost() {
        return WCC.addSavedSessionPost.apply(WCC, arguments);
    }
    function getSelectedTimezone() {
        return WCC.getSelectedTimezone.apply(WCC, arguments);
    }
    function clearRequestedWccValueFromUrl() {
        return WCC.clearRequestedWccValueFromUrl.apply(WCC, arguments);
    }
    function isGapLoaded() {
        return WCC.isGapLoaded.apply(WCC, arguments);
    }
    function getConflictsForSession() {
        return WCC.getConflictsForSession.apply(WCC, arguments);
    }
    function getConflictCount() {
        return WCC.getConflictCount.apply(WCC, arguments);
    }
    function groupSessionsByDay() {
        return WCC.groupSessionsByDay.apply(WCC, arguments);
    }
    function compareSessions() {
        return WCC.compareSessions.apply(WCC, arguments);
    }
    function formatEventRange() {
        return WCC.formatEventRange.apply(WCC, arguments);
    }
    function formatSessionTime() {
        return WCC.formatSessionTime.apply(WCC, arguments);
    }
    function formatDuration() {
        return WCC.formatDuration.apply(WCC, arguments);
    }
    function formatDate() {
        return WCC.formatDate.apply(WCC, arguments);
    }
    function isDebugClockEnabled() {
        return WCC.isDebugClockEnabled.apply(WCC, arguments);
    }
    function element() {
        return WCC.element.apply(WCC, arguments);
    }

    function render(options) {
        options = options || {};

        try {
            renderLayout();
            renderDebugClock();
            renderAlerts();
            renderHeader();
            renderSelectedEvent();
            renderControls();
            renderNotesControls();
            renderSettingsControls();
            renderEvents();
            renderTabs();
            renderSchedule(options);
        } catch (error) {
            renderCompanionRenderError(error);
        }
    }

    function renderDebugClock() {
        setHidden(nodes.debugClock, !isDebugClockEnabled());

        if (!isDebugClockEnabled() || !nodes.debugCurrent || !nodes.debugPlay || !nodes.debugRateLabel) {
            return;
        }

        const timeZone = getSelectedTimezone();
        const now = getNow();

        nodes.debugCurrent.textContent = formatDate(now, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }, timeZone);
        nodes.debugPlay.textContent = state.debugPlaying ? 'Pause' : 'Play';
        nodes.debugPlay.setAttribute('aria-pressed', state.debugPlaying ? 'true' : 'false');

        if (nodes.debugClose) {
            nodes.debugClose.disabled = state.savingSettings;
        }

        renderDebugSlider();
    }

    function renderDebugSlider() {
        if (!nodes.debugRate || !nodes.debugRateLabel) {
            return;
        }

        if (state.debugPlaying) {
            if (nodes.debugSliderMode) {
                nodes.debugSliderMode.textContent = 'Rate';
            }
            nodes.debugRate.min = '1';
            nodes.debugRate.max = '1200';
            nodes.debugRate.step = '1';
            nodes.debugRate.value = String(state.debugRate);
            nodes.debugRate.setAttribute('aria-label', 'Playback rate');
            nodes.debugRateLabel.textContent = state.debugRate + 'x';
            return;
        }

        if (nodes.debugSliderMode) {
            nodes.debugSliderMode.textContent = 'Time';
        }
        nodes.debugRate.min = String(-DEBUG_TIME_SLIDER_RANGE_MINUTES);
        nodes.debugRate.max = String(DEBUG_TIME_SLIDER_RANGE_MINUTES);
        nodes.debugRate.step = String(DEBUG_TIME_SLIDER_STEP_MINUTES);
        nodes.debugRate.value = String(state.debugTimeAdjustmentMinutes);
        nodes.debugRate.setAttribute('aria-label', 'Temporary time adjustment');
        nodes.debugRateLabel.textContent = formatDebugTimeAdjustment(state.debugTimeAdjustmentMinutes);
    }

    function renderLayout() {
        const hasSelectedEvent = Boolean(state.selectedEventUrl && getSelectedEvent());
        const isChoosing = state.pickerOpen || !hasSelectedEvent;
        const isFocused = state.page === 'companion' || hasSelectedEvent && !isChoosing;
        const isLiveCompanion = state.page === 'companion' || isFocused && state.view === 'companion';

        nodes.app.classList.toggle('is-focused', isFocused);
        nodes.app.classList.toggle('is-choosing', isChoosing);
        nodes.app.classList.toggle('is-live-companion', isLiveCompanion);
        setHidden(nodes.header, isLiveCompanion);
        setHidden(nodes.selectedEvent, !hasSelectedEvent || isLiveCompanion);
        setHidden(nodes.picker, !isChoosing);
        setHidden(nodes.plannerNav, !hasSelectedEvent || isLiveCompanion);
        setHidden(nodes.sidebar, hasSelectedEvent && !isChoosing);
    }

    function setHidden(node, hidden) {
        if (node) {
            node.hidden = hidden;
        }
    }

    function renderAlerts() {
        if (!nodes.alerts) {
            return;
        }

        nodes.alerts.replaceChildren();

        if (!state.alert || !state.alert.message) {
            return;
        }

        const alertModifier = state.alert.type === 'error'
            ? ' is-error'
            : (state.alert.type === 'success' ? ' is-success' : '');
        const alert = element('div', {
            className: 'wcc-alert' + alertModifier,
        });
        alert.append(element('span', { className: 'wcc-alert-message', text: state.alert.message }));

        if (Array.isArray(state.alert.actions) && state.alert.actions.length) {
            const actions = element('span', { className: 'wcc-alert-actions' });

            state.alert.actions.forEach(function (action) {
                if (!action || !action.href || !action.label) {
                    return;
                }

                actions.append(element('a', {
                    className: 'wcc-button',
                    href: action.href,
                    target: action.external ? '_blank' : undefined,
                    rel: action.external ? 'noopener noreferrer' : undefined,
                    text: action.label,
                }));
            });

            if (actions.children.length) {
                alert.append(actions);
            }
        }

        nodes.alerts.append(alert);
    }

    function renderHeader() {
        if (!nodes.currentEvent || !nodes.planSummary) {
            return;
        }

        const event = getSelectedEvent();
        const savedIds = getSavedSessionIds();
        const conflictCount = getConflictCount(savedIds);

        if (nodes.pageTitle) {
            nodes.pageTitle.textContent = state.page === 'notes' ? 'Session Notes' : (event ? getEventTitle(event) : 'WordCamp Companion');
        }
        if (nodes.pageTitleLink) {
            nodes.pageTitleLink.href = config.appUrl || '/wordcamp-companion/';
        }

        if (state.page === 'plan-selector') {
            nodes.currentEvent.textContent = '';
            nodes.planSummary.textContent = '';
            return;
        }

        nodes.currentEvent.textContent = event
            ? [event.location, formatEventRange(event)].filter(Boolean).join(' - ')
            : 'No WordCamp selected';

        if (!event) {
            nodes.planSummary.textContent = '';
            return;
        }

        const summary = [savedIds.size + ' saved'];
        if (conflictCount > 0) {
            summary.push(sprintf(_n('%d alternative', '%d alternatives', conflictCount), conflictCount));
        }
        nodes.planSummary.textContent = summary.join(' / ');
    }

    function renderSelectedEvent() {
        if (!nodes.selectedTitle && !nodes.selectedMeta && !nodes.openEvent && !nodes.companionVisibility) {
            return;
        }

        const event = getSelectedEvent();

        if (!event) {
            if (nodes.selectedTitle) {
                nodes.selectedTitle.textContent = '';
            }
            if (nodes.selectedMeta) {
                nodes.selectedMeta.textContent = '';
            }
            if (nodes.openEvent) {
                nodes.openEvent.href = '#';
                nodes.openEvent.hidden = true;
            }
            setHidden(nodes.companionVisibility, true);
            return;
        }

        if (nodes.selectedTitle) {
            nodes.selectedTitle.textContent = event.title || 'Selected WordCamp';
        }
        if (nodes.selectedMeta) {
            nodes.selectedMeta.textContent = [event.location, formatEventRange(event), event.timezone].filter(Boolean).join(' - ');
        }

        if (nodes.openEvent) {
            if (event.event_url) {
                nodes.openEvent.href = event.event_url;
                nodes.openEvent.hidden = false;
            } else {
                nodes.openEvent.href = '#';
                nodes.openEvent.hidden = true;
            }
        }

        renderCompanionVisibilityButton(nodes.companionVisibility, event);
    }

    function renderControls() {
        if (!nodes.eventSelect) {
            return;
        }

        const events = getRenderableEvents();
        const previousValue = nodes.eventSelect.value;
        const fragment = document.createDocumentFragment();

        if (!events.length) {
            fragment.append(element('option', { value: '', text: state.loadingEvents ? 'Loading WordCamps...' : 'No scheduled WordCamps' }));
        } else {
            fragment.append(element('option', { value: '', text: 'Select a WordCamp to attend' }));
            events.forEach(function (event) {
                fragment.append(element('option', {
                    value: event.event_url,
                    text: event.title + (event.location ? ' - ' + event.location : ''),
                }));
            });
        }

        nodes.eventSelect.replaceChildren(fragment);
        nodes.eventSelect.value = state.selectedEventUrl || previousValue || '';
        nodes.eventSelect.disabled = state.loadingEvents || state.savingEvent;
        if (nodes.refreshEvents) {
            nodes.refreshEvents.disabled = state.loadingEvents;
        }
        if (nodes.refreshSchedule) {
            nodes.refreshSchedule.disabled = state.loadingSchedule || !state.selectedEventUrl;
        }
    }

    function renderNotesControls() {
        if (!nodes.notesEventSelect && !nodes.notesPlanLink && !nodes.planNotesLink) {
            return;
        }

        const event = getSelectedEvent();
        const notesUrl = getNotesUrl();

        if (nodes.planNotesLink) {
            nodes.planNotesLink.href = notesUrl;
        }

        if (nodes.notesPlanLink) {
            nodes.notesPlanLink.href = getPlanYourDayUrl(event);
        }

        if (!nodes.notesEventSelect) {
            return;
        }

        const events = getNoteEvents();
        const fragment = document.createDocumentFragment();

        if (!events.length) {
            fragment.append(element('option', { value: '', text: 'No saved sessions yet' }));
            nodes.notesEventSelect.disabled = true;
        } else {
            events.forEach(function (noteEvent) {
                fragment.append(element('option', {
                    value: noteEvent.event_url,
                    text: noteEvent.title || noteEvent.location || noteEvent.event_url,
                }));
            });
            nodes.notesEventSelect.disabled = false;
        }

        nodes.notesEventSelect.replaceChildren(fragment);
        nodes.notesEventSelect.value = state.selectedEventUrl || '';
    }

    function renderSettingsControls() {
        if (!nodes.settingsDebugClock && !nodes.settingsSave && !nodes.settingsStatus) {
            return;
        }

        if (nodes.settingsDebugClock) {
            const draftValue = state.settingsDraft && typeof state.settingsDraft.show_debug_clock === 'boolean'
                ? state.settingsDraft.show_debug_clock
                : isDebugClockEnabled();

            nodes.settingsDebugClock.checked = draftValue;
            nodes.settingsDebugClock.disabled = state.savingSettings;
        }

        if (nodes.settingsSave) {
            nodes.settingsSave.disabled = state.savingSettings;
            nodes.settingsSave.textContent = state.savingSettings ? 'Saving...' : 'Save Settings';
        }

        if (nodes.settingsStatus) {
            nodes.settingsStatus.textContent = state.settingsSaved ? 'Saved' : '';
        }
    }

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

    function renderEvents() {
        if (!nodes.eventList || !nodes.eventCount) {
            return;
        }

        const events = getRenderableEvents();
        nodes.eventList.replaceChildren();
        nodes.eventCount.textContent = events.length ? String(events.length) : '';

        if (state.loadingEvents) {
            nodes.eventList.append(element('div', { className: 'wcc-empty', text: 'Loading upcoming WordCamps...' }));
            return;
        }

        if (!events.length) {
            nodes.eventList.append(element('div', { className: 'wcc-empty', text: 'No scheduled WordCamps found.' }));
            return;
        }

        events.forEach(function (event) {
            const card = element('article', {
                className: 'wcc-event-card' + (event.event_url === state.selectedEventUrl ? ' is-active' : ''),
                role: 'button',
                tabindex: '0',
            });
            const details = element('div', { className: 'wcc-event-card-details' });
            const actions = element('div', { className: 'wcc-event-card-actions' });

            details.append(
                element('span', { className: 'wcc-event-title', text: event.title || 'Untitled WordCamp' }),
                element('span', {
                    className: 'wcc-event-meta',
                    text: [event.location, formatEventRange(event)].filter(Boolean).join(' - '),
                })
            );
            actions.append(createEventCompanionToggle(event));
            card.append(details, actions);

            card.addEventListener('click', function (clickEvent) {
                if (clickEvent.target && clickEvent.target.closest && clickEvent.target.closest('button, a, input, select, textarea')) {
                    return;
                }

                activateEventCard(event);
            });
            card.addEventListener('keydown', function (keyEvent) {
                if (keyEvent.target !== card || keyEvent.defaultPrevented) {
                    return;
                }

                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault();
                    activateEventCard(event);
                }
            });
            nodes.eventList.append(card);
        });
    }

    function activateEventCard(event) {
        if (state.page === 'plan-selector') {
            activatePlanSelectorEvent(event);
            return;
        }

        selectEvent(event.event_url);
    }

    function activatePlanSelectorEvent(event) {
        if (!event || !event.event_url) {
            return;
        }

        if (shouldOpenCompanionFromPlanSelector()) {
            selectEventForMobileCompanion(event);
            return;
        }

        window.location.href = getPlanYourDayUrl(event);
    }

    function createEventCompanionToggle(event) {
        const button = element('button', {
            className: 'wcc-event-companion-toggle',
            type: 'button',
        });

        renderCompanionVisibilityButton(button, event);
        button.addEventListener('click', function () {
            if (state.page === 'plan-selector' && shouldOpenCompanionFromPlanSelector()) {
                selectEventForMobileCompanion(event);
                return;
            }

            setEventCompanionVisibility(event, !isEventShownInCompanion(event));
        });

        return button;
    }

    function renderCompanionVisibilityButton(button, event) {
        if (!button) {
            return;
        }

        if (!event || !event.event_url) {
            setHidden(button, true);
            return;
        }

        const isShown = isEventShownInCompanion(event);
        const isSaving = state.savingCompanionEventUrl === event.event_url;

        setHidden(button, false);
        button.textContent = isSaving ? 'Saving...' : (isShown ? 'Un-Attend' : 'Attend');
        button.disabled = isSaving;
        button.setAttribute('aria-pressed', isShown ? 'true' : 'false');
        button.setAttribute('aria-label', (isShown ? 'Un-Attend: ' : 'Attend: ') + getEventTitle(event));
    }

    function renderTabs() {
        nodes.tabs.forEach(function (tab) {
            const isActive = tab.dataset.view === state.view;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function renderSchedule(options) {
        if (!nodes.status || !nodes.schedule) {
            return;
        }

        try {
            renderScheduleContent(options || {});
        } catch (error) {
            renderCompanionRenderError(error);
        }
    }

    function renderScheduleContent(options) {
        options = options || {};
        nodes.status.textContent = '';

        if (state.page === 'notes') {
            nodes.schedule.replaceChildren();
            renderNotesPage();
            return;
        }

        if (!state.selectedEventUrl) {
            nodes.schedule.replaceChildren();
            if (state.page === 'companion') {
                nodes.schedule.append(renderEmptyCompanion());
            } else {
                const empty = element('div', { className: 'wcc-empty' });
                empty.append(element('p', { text: state.page === 'plan-selector' ? 'Choose a WordCamp you are planning to attend.' : 'Select a WordCamp.' }));
                nodes.schedule.append(empty);
            }
            return;
        }

        if (state.loadingSchedule) {
            nodes.schedule.replaceChildren();
            nodes.status.textContent = 'Loading schedule...';
            return;
        }

        if (state.page === 'companion' && state.loadingInitialGaps && getSavedSessionIds().size === 0) {
            nodes.schedule.replaceChildren();
            nodes.status.textContent = 'Loading session choices...';
            nodes.schedule.append(element('div', { className: 'wcc-empty', text: 'Loading session choices...' }));
            return;
        }

        if (!state.schedule) {
            nodes.schedule.replaceChildren();
            if (state.page === 'companion') {
                nodes.schedule.append(renderCompanionFallback(
                    'Companion unavailable',
                    'Choose a WordCamp again to rebuild your companion timeline.'
                ));
            } else {
                nodes.schedule.append(element('div', { className: 'wcc-empty', text: 'Schedule unavailable.' }));
            }
            return;
        }

        if (state.view === 'companion') {
            const companionModel = getCompanionRenderModel();
            const previousStepRects = options.companionInPlace ? captureCompanionStepRects() : null;

            if (options.companionInPlace && updateCompanionInPlace(companionModel)) {
                return;
            }

            nodes.schedule.replaceChildren();
            renderCompanion(companionModel);
            animateCompanionStepPositions(previousStepRects);
            return;
        }

        nodes.schedule.replaceChildren();

        if (state.view === 'schedule' && state.schedule.mode !== 'full') {
            nodes.schedule.append(element('div', { className: 'wcc-empty', text: 'Full schedule unavailable.' }));
            return;
        }

        const savedIds = getSavedSessionIds();
        let sessions = Array.isArray(state.schedule.sessions) ? state.schedule.sessions : [];

        if (state.view === 'plan') {
            sessions = sessions.filter(function (session) {
                return savedIds.has(session.id);
            });
        }

        if (!sessions.length) {
            nodes.schedule.append(element('div', {
                className: 'wcc-empty',
                text: state.view === 'plan' ? 'No saved sessions.' : 'No sessions published yet.',
            }));
            return;
        }

        if (state.view === 'schedule') {
            renderTrackSchedule(sessions, savedIds);
            return;
        }

        groupSessionsByDay(sessions, getSelectedTimezone()).forEach(function (group) {
            const section = element('section', { className: 'wcc-day' });
            const header = element('div', { className: 'wcc-day-header' });
            header.append(
                element('h2', { text: group.label }),
                element('span', {
                    className: 'wcc-day-count',
                    text: sprintf(_n('%d session', '%d sessions', group.sessions.length), group.sessions.length),
                })
            );

            const list = element('div', { className: 'wcc-session-list' });
            group.sessions.forEach(function (session) {
                list.append(renderSession(session, savedIds));
            });

            section.append(header, list);
            nodes.schedule.append(section);
        });
    }

    function renderNotesExport(sessions) {
        const markdown = buildNotesMarkdown(sessions);
        const notedCount = sessions.filter(function (session) {
            return getSessionNotes(session).trim() !== '';
        }).length;
        const section = element('details', { className: 'wcc-notes-export' });
        const summary = element('summary', { className: 'wcc-notes-export-header' });
        const title = element('div', { className: 'wcc-notes-export-title' });
        const actions = element('div', { className: 'wcc-notes-export-actions' });
        const output = element('textarea', {
            className: 'wcc-notes-output',
            'data-notes-export-output': 'true',
            readonly: 'readonly',
            rows: notedCount ? '8' : '3',
            'aria-label': 'Generated Markdown export of your session notes',
        });
        const preview = element('div', {
            className: 'wcc-notes-rendered-preview',
            'data-notes-export-rendered': 'true',
            'aria-label': 'Rendered preview of your exported notes',
        });
        const tabs = element('div', {
            className: 'wcc-notes-export-tabs',
            role: 'tablist',
            'aria-label': 'Markdown export views',
        });
        const renderedTab = element('button', {
            className: 'wcc-notes-export-tab is-active',
            type: 'button',
            role: 'tab',
            'aria-selected': 'true',
            text: 'Rendered',
        });
        const markdownTab = element('button', {
            className: 'wcc-notes-export-tab',
            type: 'button',
            role: 'tab',
            'aria-selected': 'false',
            text: 'Markdown',
        });
        const renderedPanel = element('div', {
            className: 'wcc-notes-export-panel',
            role: 'tabpanel',
        });
        const markdownPanel = element('div', {
            className: 'wcc-notes-export-panel',
            role: 'tabpanel',
        });
        const activeExportView = state.notesExportView === 'markdown' ? 'markdown' : 'rendered';
        const copyButton = element('button', {
            className: 'wcc-button',
            type: 'button',
            text: state.notesExportCopied ? 'Copied' : 'Copy Markdown',
        });
        const downloadButton = element('button', {
            className: 'wcc-button',
            type: 'button',
            text: 'Download .md',
        });

        title.append(
            element('strong', { text: 'Markdown export' }),
            element('span', {
                'data-notes-export-count': 'true',
                text: getNotesExportCountText(notedCount, sessions.length),
            })
        );
        output.value = markdown;
        renderMarkdownPreview(markdown, preview);

        copyButton.addEventListener('click', function () {
            copyNotesMarkdown(buildNotesMarkdown(getCurrentNoteSessions()));
        });
        downloadButton.addEventListener('click', function () {
            downloadNotesMarkdown(buildNotesMarkdown(getCurrentNoteSessions()));
        });
        renderedTab.addEventListener('click', function () {
            setNotesExportTab('rendered', renderedTab, markdownTab, renderedPanel, markdownPanel);
        });
        markdownTab.addEventListener('click', function () {
            setNotesExportTab('markdown', renderedTab, markdownTab, renderedPanel, markdownPanel);
        });
        section.addEventListener('toggle', function () {
            state.notesExportOpen = section.open;
        });

        section.open = Boolean(state.notesExportOpen);
        tabs.append(renderedTab, markdownTab);
        actions.append(copyButton, downloadButton);
        summary.append(title);
        renderedPanel.append(preview);
        markdownPanel.append(output);
        setNotesExportTab(activeExportView, renderedTab, markdownTab, renderedPanel, markdownPanel);
        section.append(
            summary,
            actions,
            element('p', {
                className: 'wcc-notes-export-help',
                text: 'This read-only preview is built from the individual session notes below. Edit a session note to update the export automatically.',
            }),
            tabs,
            renderedPanel,
            markdownPanel
        );

        return section;
    }

    function setNotesExportTab(tab, renderedTab, markdownTab, renderedPanel, markdownPanel) {
        const showRendered = tab === 'rendered';

        state.notesExportView = showRendered ? 'rendered' : 'markdown';
        renderedTab.classList.toggle('is-active', showRendered);
        renderedTab.setAttribute('aria-selected', showRendered ? 'true' : 'false');
        markdownTab.classList.toggle('is-active', !showRendered);
        markdownTab.setAttribute('aria-selected', showRendered ? 'false' : 'true');
        renderedPanel.hidden = !showRendered;
        markdownPanel.hidden = showRendered;
    }

    function getCurrentNoteSessions() {
        const selectedPlan = getSelectedPlan();
        const savedPosts = selectedPlan && Array.isArray(selectedPlan.saved_sessions) ? selectedPlan.saved_sessions : [];

        return savedPosts.map(savedSessionPostToSession).filter(function (session) {
            return session.id && session.start;
        }).sort(compareSessions);
    }

    function getNotesExportCountText(notedCount, sessionCount) {
        return 'Generated from ' + notedCount + ' noted / ' + sessionCount + ' saved sessions';
    }

    function refreshNotesExportPreview() {
        const output = document.querySelector('[data-notes-export-output="true"]');
        const count = document.querySelector('[data-notes-export-count="true"]');
        const rendered = document.querySelector('[data-notes-export-rendered="true"]');

        if (!output && !count && !rendered) {
            return;
        }

        const sessions = getCurrentNoteSessions();
        const notedCount = sessions.filter(function (session) {
            return getSessionNotes(session).trim() !== '';
        }).length;
        const markdown = buildNotesMarkdown(sessions);

        if (output) {
            output.value = markdown;
            output.rows = notedCount ? 8 : 3;
        }

        if (rendered) {
            renderMarkdownPreview(markdown, rendered);
        }

        if (count) {
            count.textContent = getNotesExportCountText(notedCount, sessions.length);
        }
    }

    function renderMarkdownPreview(markdown, container) {
        const fragment = document.createDocumentFragment();
        const lines = String(markdown || '').split('\n');
        let list = null;
        let paragraph = [];

        function flushParagraph() {
            if (!paragraph.length) {
                return;
            }

            const node = element('p');
            appendInlineMarkdown(node, paragraph.join(' '));
            fragment.append(node);
            paragraph = [];
        }

        function flushList() {
            if (list) {
                fragment.append(list);
                list = null;
            }
        }

        lines.forEach(function (line) {
            const value = line.trim();
            const heading = value.match(/^(#{1,3})\s+(.+)$/);
            const listItem = value.match(/^[-*]\s+(.+)$/);

            if (!value) {
                flushParagraph();
                flushList();
                return;
            }

            if (heading) {
                flushParagraph();
                flushList();
                const level = Math.min(heading[1].length, 3);
                const node = element('h' + level);
                appendInlineMarkdown(node, heading[2]);
                fragment.append(node);
                return;
            }

            if (listItem) {
                flushParagraph();
                if (!list) {
                    list = element('ul');
                }
                const item = element('li');
                appendInlineMarkdown(item, listItem[1]);
                list.append(item);
                return;
            }

            flushList();
            paragraph.push(value);
        });

        flushParagraph();
        flushList();
        container.replaceChildren(fragment);
    }

    function appendInlineMarkdown(container, text) {
        const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                container.append(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const token = match[0];
            const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

            if (token.indexOf('**') === 0) {
                container.append(element('strong', { text: token.slice(2, -2) }));
            } else if (token.indexOf('_') === 0) {
                container.append(element('em', { text: token.slice(1, -1) }));
            } else if (link) {
                container.append(element('a', {
                    href: getSafeMarkdownUrl(link[2]),
                    rel: 'noopener noreferrer',
                    target: '_blank',
                    text: link[1],
                }));
            }

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            container.append(document.createTextNode(text.slice(lastIndex)));
        }
    }

    function getSafeMarkdownUrl(url) {
        const value = String(url || '').trim();

        if (/^(https?:|mailto:)/i.test(value)) {
            return value;
        }

        return '#';
    }

    function renderNotesPage() {
        const events = getNoteEvents();
        if (!events.length) {
            nodes.schedule.append(renderCompanionFallback(
                'No saved sessions',
                'Save sessions from a WordCamp before adding notes.'
            ));
            return;
        }

        if (!state.selectedEventUrl || !getSelectedPlan()) {
            state.selectedEventUrl = events[0].event_url;
        }

        const sessions = getCurrentNoteSessions();

        if (!sessions.length) {
            nodes.schedule.append(element('div', {
                className: 'wcc-empty',
                text: 'No saved sessions for this WordCamp yet.',
            }));
            return;
        }

        nodes.schedule.append(renderNotesExport(sessions));

        groupSessionsByDay(sessions, getSelectedTimezone()).forEach(function (group) {
            const section = element('section', { className: 'wcc-day' });
            const header = element('div', { className: 'wcc-day-header' });
            header.append(
                element('h2', { text: group.label }),
                element('span', {
                    className: 'wcc-day-count',
                    text: sprintf(_n('%d session', '%d sessions', group.sessions.length), group.sessions.length),
                })
            );

            const list = element('div', { className: 'wcc-session-list' });
            group.sessions.forEach(function (session) {
                list.append(renderNoteSession(session));
            });

            section.append(header, list);
            nodes.schedule.append(section);
        });
    }

    async function copyNotesMarkdown(markdown) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(markdown);
            } else {
                copyTextFallback(markdown);
            }

            state.notesExportCopied = true;
            render();
            window.setTimeout(function () {
                state.notesExportCopied = false;
                render();
            }, 1600);
        } catch (error) {
            state.alert = { type: 'error', message: 'Could not copy notes.' };
            render();
        }
    }

    function copyTextFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.append(textarea);
        textarea.select();

        const copied = document.execCommand('copy');
        textarea.remove();

        if (!copied) {
            throw new Error('Copy failed.');
        }
    }

    function downloadNotesMarkdown(markdown) {
        const event = getSelectedEvent();
        const filename = (getEventSlug(event) || 'wordcamp-notes') + '-notes.md';
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = element('a', {
            href: url,
            download: filename,
        });

        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 0);
    }

    function buildNotesMarkdown(sessions) {
        const event = getSelectedEvent();
        const timeZone = getSelectedTimezone();
        const notedSessions = sessions.filter(function (session) {
            return getSessionNotes(session).trim() !== '';
        });
        const lines = [
            '# ' + getEventTitle(event) + ' notes',
            '',
        ];

        if (event) {
            const meta = [event.location, formatEventRange(event)].filter(Boolean).join(' - ');
            if (meta) {
                lines.push(meta, '');
            }
        }

        if (!notedSessions.length) {
            lines.push('No session notes yet.');
            return lines.join('\n');
        }

        groupSessionsByDay(notedSessions, timeZone).forEach(function (group) {
            lines.push('## ' + group.label, '');
            group.sessions.forEach(function (session) {
                const meta = [
                    formatSessionTime(session, timeZone),
                    getPrimaryTrack(session),
                    session.speaker_names && session.speaker_names.length ? session.speaker_names.join(', ') : '',
                ].filter(Boolean);

                lines.push('### ' + (session.title || 'Untitled session'));
                if (meta.length) {
                    lines.push(meta.join(' / '));
                }
                if (session.url) {
                    lines.push(session.url);
                }
                lines.push('', getSessionNotes(session).trim(), '');
            });
        });

        return lines.join('\n').trim() + '\n';
    }

    function renderTrackSchedule(sessions, savedIds) {
        const timeZone = getSelectedTimezone();

        groupSessionsByDay(sessions, timeZone).forEach(function (group) {
            const tracks = getTracksForSessions(group.sessions);
            const section = element('section', { className: 'wcc-day wcc-track-day' });
            const header = element('div', { className: 'wcc-day-header' });
            header.append(
                element('h2', { text: group.label }),
                element('span', {
                    className: 'wcc-day-count',
                    text: sprintf(_n('%d track', '%d tracks', tracks.length), tracks.length),
                })
            );

            const grid = element('div', { className: 'wcc-track-grid' });
            const columns = '96px repeat(' + Math.max(1, tracks.length) + ', minmax(190px, 1fr))';
            const gridHeader = element('div', { className: 'wcc-track-row wcc-track-header' });
            gridHeader.style.gridTemplateColumns = columns;
            gridHeader.append(element('div', { className: 'wcc-track-time' }));
            tracks.forEach(function (track) {
                gridHeader.append(element('div', { className: 'wcc-track-name', text: track }));
            });
            grid.append(gridHeader);

            groupSessionsByTime(group.sessions).forEach(function (slot) {
                let row = element('div', { className: 'wcc-track-row' });
                row.style.gridTemplateColumns = columns;
                row.append(element('div', { className: 'wcc-track-time', text: formatSlotTime(slot.start, timeZone) }));

                const spanning = slot.sessions.filter(shouldSpanTracks);
                const normalSessions = slot.sessions.filter(function (session) {
                    return !shouldSpanTracks(session);
                });
                const byTrack = groupSessionsByTrack(normalSessions);

                if (spanning.length) {
                    const spanCell = element('div', { className: 'wcc-track-spanning' });
                    spanCell.style.gridColumn = '2 / -1';
                    spanning.forEach(function (session) {
                        spanCell.append(renderTrackSession(session, savedIds, true));
                    });
                    row.append(spanCell);
                    grid.append(row);

                    if (!normalSessions.length) {
                        return;
                    }

                    row = element('div', { className: 'wcc-track-row' });
                    row.style.gridTemplateColumns = columns;
                    row.append(element('div', { className: 'wcc-track-time' }));
                }

                tracks.forEach(function (track) {
                    const cell = element('div', { className: 'wcc-track-cell' });
                    (byTrack[track] || []).forEach(function (session) {
                        cell.append(renderTrackSession(session, savedIds, false));
                    });
                    row.append(cell);
                });
                grid.append(row);
            });

            section.append(header, grid);
            nodes.schedule.append(section);
        });
    }

    function renderTrackSession(session, savedIds, isSpanning) {
        const isSaved = savedIds.has(session.id);
        const card = element('article', {
            className: [
                'wcc-track-session',
                isSpanning ? 'is-spanning' : '',
                isSaved ? 'is-saved' : '',
                session.type === 'custom' ? 'is-custom' : '',
            ].filter(Boolean).join(' '),
        });
        const title = element('h3');
        const button = element('button', {
            className: 'wcc-session-toggle' + (isSaved ? ' is-saved' : ''),
            type: 'button',
            text: state.savingSessionId === session.id ? 'Saving...' : (isSaved ? 'Saved' : 'Save'),
        });

        if (session.url) {
            title.append(element('a', {
                href: session.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                text: session.title || 'Untitled session',
            }));
        } else {
            title.textContent = session.title || 'Untitled session';
        }

        card.append(title);

        const speakers = renderSessionSpeakers(session, 'wcc-session-speakers');
        if (speakers) {
            card.append(speakers);
        }

        if (session.category_names && session.category_names.length) {
            card.append(element('div', { className: 'wcc-session-meta', text: session.category_names.join(', ') }));
        }

        button.disabled = state.savingSessionId !== null;
        button.addEventListener('click', function () {
            toggleSession(session.id);
        });
        card.append(button);

        return card;
    }

    function renderCompanion(model) {
        model = model || getCompanionRenderModel();
        const timeline = model.timeline;
        const now = model.now;
        const visibleSteps = model.visibleSteps;
        const renderableSteps = model.renderableSteps;

        if (!visibleSteps.length) {
            nodes.schedule.append(element('div', {
                className: 'wcc-empty',
                text: timeline.steps.length ? 'WordCamp complete.' : 'No companion steps.',
            }));
            return;
        }

        const wrapper = element('div', {
            className: 'wcc-companion',
            dataset: {
                companionSignature: getCompanionRenderSignature(model),
                companionStepKeys: getCompanionStepKeySignature(renderableSteps),
            },
        });
        wrapper.append(renderCompanionTopLink());

        renderableSteps.forEach(function (step, index) {
            wrapper.append(renderCompanionStep(step, now, index));
        });

        nodes.schedule.append(wrapper);
    }

    function getCompanionRenderModel() {
        const timeline = buildCompanionTimeline();
        const now = getNow();
        const visibleSteps = getAnimatedCompanionSteps(timeline.steps, now);
        const renderableSteps = getRenderableCompanionSteps(visibleSteps);

        return {
            timeline: timeline,
            now: now,
            visibleSteps: visibleSteps,
            renderableSteps: renderableSteps,
        };
    }

    function renderEmptyCompanion() {
        return renderCompanionFallback(
            'No WordCamp selected',
            'Choose the WordCamp you are planning to attend to start your companion timeline.'
        );
    }

    function renderCompanionFallback(title, detail) {
        const empty = element('div', { className: 'wcc-empty wcc-empty-companion' });
        empty.append(
            element('h1', { text: title }),
            element('p', { text: detail }),
            element('p', {
                className: 'wcc-empty-actions',
                children: [
                    element('a', {
                        className: 'wcc-button',
                        href: getPlanYourDayUrl(null),
                        text: 'Attend a WordCamp',
                    }),
                ],
            })
        );

        return empty;
    }

    function renderCompanionRenderError(error) {
        if (window.console && typeof window.console.error === 'function') {
            window.console.error(error);
        }

        if (nodes.status) {
            nodes.status.textContent = '';
        }

        if (nodes.schedule) {
            nodes.schedule.replaceChildren(renderCompanionFallback(
                'Companion unavailable',
                'Something interrupted the timeline. Choose a WordCamp again or refresh this page.'
            ));
        }
    }

    function getRenderableCompanionSteps(visibleSteps) {
        const defaultLimit = 4;
        const sessionIndex = visibleSteps.findIndex(function (step) {
            return step.type === 'session';
        });
        let limit = Math.min(defaultLimit, visibleSteps.length);

        if (sessionIndex === -1 || sessionIndex >= limit) {
            return visibleSteps.slice(0, getCompanionLimitThroughVisibleDayEnd(visibleSteps, limit));
        }

        for (let index = sessionIndex + 1; index < visibleSteps.length; index++) {
            if (visibleSteps[index].type === 'day-end' && visibleSteps[index].final) {
                return visibleSteps.slice(0, index + 1);
            }
        }

        for (let index = sessionIndex + 1; index < visibleSteps.length; index++) {
            if (visibleSteps[index].type === 'day-end') {
                limit = Math.max(limit, index + 1);
                break;
            }
        }

        return visibleSteps.slice(0, getCompanionLimitThroughVisibleDayEnd(visibleSteps, limit));
    }

    function getCompanionLimitThroughVisibleDayEnd(visibleSteps, limit) {
        if (!limit || limit >= visibleSteps.length) {
            return limit;
        }

        const lastStep = visibleSteps[limit - 1];
        if (!lastStep || !lastStep.dayKey || lastStep.type === 'day-end') {
            return limit;
        }

        for (let index = limit; index < visibleSteps.length; index++) {
            const step = visibleSteps[index];
            if (!step || step.dayKey !== lastStep.dayKey) {
                break;
            }

            if (step.type === 'day-end') {
                return index + 1;
            }
        }

        return limit;
    }

    function getAnimatedCompanionSteps(steps, now) {
        const visibleSteps = steps.filter(function (step) {
            return !isCompanionStepPast(step, now);
        });
        const visibleKeys = visibleSteps.map(getCompanionStepKey);
        const visibleLookup = new Set(visibleKeys);
        const stepsByKey = steps.reduce(function (map, step) {
            map[getCompanionStepKey(step)] = step;
            return map;
        }, {});
        const previousKeys = Array.isArray(state.companionVisibleStepKeys) ? state.companionVisibleStepKeys : null;
        const currentTime = Date.now();

        if (previousKeys) {
            previousKeys.forEach(function (key) {
                const step = stepsByKey[key];

                if (step && !visibleLookup.has(key) && isCompanionStepPast(step, now)) {
                    state.exitingCompanionStepKeys[key] = currentTime;
                }
            });
        }

        state.companionVisibleStepKeys = visibleKeys;

        const exitingSteps = [];
        Object.keys(state.exitingCompanionStepKeys).forEach(function (key) {
            const startedAt = state.exitingCompanionStepKeys[key];
            const step = stepsByKey[key];

            if (!step || visibleLookup.has(key) || currentTime - startedAt > 650) {
                delete state.exitingCompanionStepKeys[key];
                return;
            }

            exitingSteps.push(Object.assign({}, step, { exiting: true }));
        });

        if (exitingSteps.length) {
            scheduleCompanionExitCleanup();
        }

        return exitingSteps.concat(visibleSteps);
    }

    function scheduleCompanionExitCleanup() {
        if (WCC.companionExitTimer) {
            return;
        }

        WCC.companionExitTimer = window.setTimeout(function () {
            WCC.companionExitTimer = null;
            render({ companionInPlace: true });
        }, 700);
    }

    function resetCompanionAnimationState() {
        state.companionVisibleStepKeys = null;
        state.exitingCompanionStepKeys = {};

        if (WCC.companionExitTimer) {
            window.clearTimeout(WCC.companionExitTimer);
            WCC.companionExitTimer = null;
        }
    }

    function updateCompanionInPlace(model) {
        const wrapper = getCurrentCompanionWrapper();

        if (!wrapper) {
            return false;
        }

        const renderableSteps = model.renderableSteps;
        const stepKeys = getCompanionStepKeys(renderableSteps);
        const expectedSignature = getCompanionRenderSignature(model);

        if (
            wrapper.dataset.companionSignature !== expectedSignature ||
            wrapper.dataset.companionStepKeys !== getCompanionStepKeySignature(renderableSteps)
        ) {
            return false;
        }

        const stepNodes = getCompanionStepNodes(wrapper);
        const timeZone = getSelectedTimezone();

        if (stepNodes.length !== renderableSteps.length) {
            return false;
        }

        for (let index = 0; index < renderableSteps.length; index++) {
            const step = renderableSteps[index];
            const timing = getRenderedCompanionTiming(step, model.now, timeZone, index);
            const timingNode = stepNodes[index].querySelector('.wcc-companion-timing');

            if (
                stepNodes[index].dataset.companionStepKey !== stepKeys[index] ||
                Boolean(timingNode) !== Boolean(timing)
            ) {
                return false;
            }
        }

        renderableSteps.forEach(function (step, index) {
            updateCompanionStepInPlace(stepNodes[index], step, model.now, index, timeZone);
        });

        return true;
    }

    function updateCompanionStepInPlace(item, step, now, index, timeZone) {
        const timeLabel = formatCompanionStepTime(step, timeZone);
        const label = getCompanionStepLabel(step, now, index, timeLabel);
        const labelNode = item.querySelector('.wcc-companion-label');
        const timingNode = item.querySelector('.wcc-companion-timing');
        const timing = getRenderedCompanionTiming(step, now, timeZone, index);
        const className = getCompanionStepClassName(step, now, index);

        if (item.className !== className) {
            item.className = className;
        }

        if (labelNode && labelNode.textContent !== label) {
            labelNode.textContent = label;
        }

        if (timingNode && timingNode.textContent !== timing) {
            timingNode.textContent = timing;
        }

        applyCompanionStepProgress(item, step, now);
    }

    function captureCompanionStepRects() {
        const wrapper = getCurrentCompanionWrapper();
        const rects = {};

        if (!wrapper || shouldReduceMotion()) {
            return null;
        }

        getCompanionStepNodes(wrapper).forEach(function (item) {
            const key = item.dataset.companionStepKey || '';

            if (key) {
                rects[key] = item.getBoundingClientRect();
            }
        });

        return Object.keys(rects).length ? rects : null;
    }

    function animateCompanionStepPositions(previousRects) {
        const wrapper = getCurrentCompanionWrapper();

        if (!previousRects || !wrapper || shouldReduceMotion() || typeof window.requestAnimationFrame !== 'function') {
            return;
        }

        window.requestAnimationFrame(function () {
            getCompanionStepNodes(wrapper).forEach(function (item) {
                if (item.classList.contains('is-exiting')) {
                    return;
                }

                const key = item.dataset.companionStepKey || '';
                const previousRect = previousRects[key];

                if (!previousRect) {
                    return;
                }

                const currentRect = item.getBoundingClientRect();
                const deltaX = previousRect.left - currentRect.left;
                const deltaY = previousRect.top - currentRect.top;

                if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
                    return;
                }

                const animationId = String(Date.now()) + Math.random();
                item.dataset.companionMoveAnimation = animationId;
                item.style.transition = 'none';
                item.style.transform = 'translate3d(' + deltaX + 'px, ' + deltaY + 'px, 0)';
                item.style.willChange = 'transform';

                window.requestAnimationFrame(function () {
                    item.style.transition = 'transform 280ms cubic-bezier(0.2, 0, 0, 1)';
                    item.style.transform = '';

                    window.setTimeout(function () {
                        if (item.dataset.companionMoveAnimation !== animationId) {
                            return;
                        }

                        delete item.dataset.companionMoveAnimation;
                        item.style.transition = '';
                        item.style.willChange = '';
                    }, 340);
                });
            });
        });
    }

    function getCurrentCompanionWrapper() {
        const wrapper = nodes.schedule ? nodes.schedule.firstElementChild : null;

        if (!wrapper || !wrapper.classList || !wrapper.classList.contains('wcc-companion')) {
            return null;
        }

        return wrapper;
    }

    function getCompanionStepNodes(wrapper) {
        if (!wrapper) {
            return [];
        }

        return Array.from(wrapper.children).filter(function (child) {
            return child.classList && child.classList.contains('wcc-companion-step');
        });
    }

    function getCompanionStepKeys(steps) {
        return steps.map(getCompanionStepKey);
    }

    function getCompanionStepKeySignature(steps) {
        return JSON.stringify(getCompanionStepKeys(steps));
    }

    function shouldReduceMotion() {
        return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function getCompanionStepKey(step) {
        return [
            step.type || '',
            step.dayKey || '',
            step.session && step.session.id ? step.session.id : '',
            step.start || 0,
            step.end || 0,
            step.title || '',
        ].join(':');
    }

    function getCompanionRenderSignature(model) {
        const eventsSignature = getAttendingEvents().map(function (event) {
            return [
                event.event_url || '',
                event.title || '',
                event.location || '',
            ];
        });
        const loadedGapKeys = Object.keys(state.loadedGapKeys || {}).sort().join(',');
        const stepSignature = model.renderableSteps.map(getCompanionStepStaticSignature);

        return JSON.stringify([
            state.selectedEventUrl || '',
            state.loadingEvents ? '1' : '0',
            state.savingEvent ? '1' : '0',
            state.savingCompanionEventUrl || '',
            state.savingSessionId || '',
            state.savingNotePostId || '',
            state.loadingGapKey || '',
            state.openGapKey || '',
            loadedGapKeys,
            eventsSignature,
            stepSignature,
        ]);
    }

    function getCompanionStepStaticSignature(step) {
        const session = step.session || {};
        const candidates = Array.isArray(step.candidates) ? step.candidates : [];
        const mapLinks = Array.isArray(step.mapLinks) ? step.mapLinks : [];

        return JSON.stringify([
            getCompanionStepKey(step),
            step.type || '',
            step.dayKey || '',
            step.start || '',
            step.end || '',
            step.dayStart || '',
            step.title || '',
            step.detail || '',
            step.meta || '',
            step.warning || '',
            step.note || '',
            step.final ? '1' : '0',
            getCompanionSessionStaticSignature(session),
            candidates.map(getCompanionSessionStaticSignature).join(','),
            mapLinks.map(function (link) {
                return [link.label || '', link.url || ''];
            }),
        ]);
    }

    function getCompanionSessionStaticSignature(session) {
        if (!session || !session.id) {
            return '';
        }

        return JSON.stringify([
            session.id || '',
            session.title || '',
            session.url || '',
            session.start || '',
            session.end || '',
            session.duration || '',
            session.type || '',
            Array.isArray(session.speaker_names) ? session.speaker_names.join(',') : '',
            Array.isArray(session.speaker_urls) ? session.speaker_urls.join(',') : '',
            Array.isArray(session.track_names) ? session.track_names.join(',') : '',
            Array.isArray(session.category_names) ? session.category_names.join(',') : '',
        ]);
    }

    function renderCompanionTopLink() {
        const wrapper = element('div', { className: 'wcc-companion-top' });
        const selectedEvent = getSelectedEvent();
        const events = getAttendingEvents();
        const attendAnotherValue = '__wcc_attend_another__';
        const switcherRow = element('div', { className: 'wcc-companion-switcher-row' });
        const switcher = element('label', { className: 'wcc-companion-switcher' });
        const select = element('select', { 'aria-label': 'Switch or attend another WordCamp' });
        const shareButton = createShareIconButton();
        const links = element('div', { className: 'wcc-companion-links' });
        const planButton = element('a', {
            className: 'wcc-plan-link wcc-companion-link-plan',
            href: getPlanYourDayUrl(selectedEvent),
            text: 'Plan your day',
        });
        const notesButton = element('a', {
            className: 'wcc-plan-link wcc-companion-link-notes',
            href: getNotesUrl(),
            text: 'Notes',
        });

        if (!events.length) {
            select.append(element('option', { value: '', text: state.loadingEvents ? 'Loading...' : 'No WordCamps yet' }));
        } else {
            events.forEach(function (event) {
                select.append(element('option', {
                    value: event.event_url,
                    text: event.title || event.location || event.event_url,
                }));
            });
        }
        const actionsGroup = element('optgroup', { label: 'Upcoming WordCamps' });
        actionsGroup.append(element('option', { value: attendAnotherValue, text: 'Attend another WordCamp' }));
        select.append(actionsGroup);
        select.value = state.selectedEventUrl || '';
        select.disabled = state.loadingEvents || state.savingEvent;

        select.addEventListener('change', function () {
            if (select.value === attendAnotherValue) {
                window.location.href = getPlanYourDayUrl(null);
                return;
            }

            selectEvent(select.value);
        });

        switcher.append(select);
        switcherRow.append(switcher, shareButton);
        links.append(planButton, notesButton);
        wrapper.append(switcherRow);
        wrapper.append(links);

        return wrapper;
    }

    function renderCompanionStep(step, now, index) {
        const isCurrent = isCompanionStepCurrent(step, now);
        const isGap = step.type === 'gap';
        const item = element('article', {
            className: getCompanionStepClassName(step, now, index),
            dataset: {
                companionStepKey: getCompanionStepKey(step),
            },
        });
        const timeZone = getSelectedTimezone();
        const timeLabel = formatCompanionStepTime(step, timeZone);
        const label = getCompanionStepLabel(step, now, index, timeLabel);
        const body = element('div', { className: 'wcc-companion-body' });
        let gapPicker = null;

        applyCompanionStepProgress(item, step, now);

        if (!isGap) {
            const heading = element('div', { className: 'wcc-companion-heading' });
            const title = element('h3');
            const titleText = step.title || 'Untitled session';

            if (step.session && step.session.url) {
                title.append(element('a', {
                    href: step.session.url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    text: titleText,
                }));
            } else {
                title.textContent = titleText;
            }

            heading.append(title);

            if (step.type === 'session' && step.session) {
                heading.append(renderCompanionRemoveButton(step.session));
            }

            body.append(element('div', { className: 'wcc-companion-label', text: label }), heading);
        }

        if (step.detail) {
            body.append(element('p', { className: 'wcc-companion-detail', text: step.detail }));
        }

        if (step.warning) {
            body.append(element('div', { className: 'wcc-companion-warning', text: step.warning }));
        }

        if (step.mapLinks && step.mapLinks.length) {
            body.append(renderMapLinks(step.mapLinks));
        }

        if (step.meta) {
            body.append(element('div', { className: 'wcc-companion-meta', text: step.meta }));
        }

        const speakers = step.session ? renderSessionSpeakers(step.session, 'wcc-companion-speakers') : null;
        if (speakers) {
            body.append(speakers);
        }

        if (step.type === 'gap') {
            gapPicker = renderGapPicker(step);
            body.append(gapPicker);
        }

        const timing = getRenderedCompanionTiming(step, now, timeZone, index);
        if (timing) {
            body.append(element('div', { className: 'wcc-companion-timing', text: timing }));
        }

        if (step.type === 'session' && step.session) {
            const notes = renderSessionNotes(step.session, { compact: true });
            if (notes) {
                body.append(notes);
            }
        }

        if (step.note) {
            body.append(element('span', { className: 'wcc-overlap-badge wcc-companion-overlap-note', text: step.note }));
        }

        const marker = renderCompanionMarker(step, gapPicker);
        item.append(marker, body);

        return item;
    }

    function getCompanionStepClassName(step, now, index) {
        const isCurrent = isCompanionStepCurrent(step, now);

        return [
            'wcc-companion-step',
            'is-' + step.type,
            index === 0 ? 'is-primary' : '',
            isCurrent ? 'is-current' : '',
            step.exiting ? 'is-exiting' : '',
            index === 0 && !isCurrent ? 'is-next' : '',
            step.final ? 'is-final' : '',
        ].filter(Boolean).join(' ');
    }

    function getRenderedCompanionTiming(step, now, timeZone, index) {
        if (step.type === 'gap') {
            return '';
        }

        return formatCompanionTiming(step, now, timeZone, index);
    }

    function applyCompanionStepProgress(item, step, now) {
        if (!isCompanionStepCurrent(step, now) || step.type !== 'session') {
            item.style.removeProperty('--wcc-step-progress');
            item.style.removeProperty('--wcc-step-progress-scale');
            return;
        }

        const progress = getCompanionStepProgress(step, now);

        item.style.setProperty('--wcc-step-progress', progress + '%');
        item.style.setProperty('--wcc-step-progress-scale', (progress / 100).toFixed(4));
    }

    function renderCompanionMarker(step, gapPicker) {
        if (step.type !== 'gap') {
            return element('div', { className: 'wcc-companion-marker' });
        }

        const marker = element('button', {
            className: 'wcc-companion-marker',
            type: 'button',
            title: 'Add a session',
            'aria-label': 'Add a session',
        });

        marker.addEventListener('click', function (event) {
            const toggle = gapPicker ? gapPicker.querySelector('.wcc-gap-toggle') : null;

            event.preventDefault();
            event.stopPropagation();

            if (toggle) {
                toggle.click();
            }
        });

        return marker;
    }

    function getCompanionStepProgress(step, now) {
        const start = Number(step && step.start || 0);
        const end = Number(step && (step.end || step.start) || 0);

        if (!start || !end || end <= start) {
            return 0;
        }

        return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 1000) / 10));
    }

    function renderSessionSpeakers(session, className) {
        const names = Array.isArray(session && session.speaker_names) ? session.speaker_names : [];
        const urls = Array.isArray(session && session.speaker_urls) ? session.speaker_urls : [];

        if (!names.length) {
            return null;
        }

        const wrapper = element('div', { className: className || 'wcc-session-speakers' });
        names.forEach(function (name, index) {
            const url = urls[index] || '';

            if (index > 0) {
                wrapper.append(document.createTextNode(', '));
            }

            if (url) {
                wrapper.append(element('a', {
                    href: url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    text: name,
                }));
                return;
            }

            wrapper.append(document.createTextNode(name));
        });

        return wrapper;
    }

    function renderCompanionRemoveButton(session) {
        const title = session && session.title ? session.title : 'session';
        const button = element('button', {
            className: 'wcc-companion-remove',
            type: 'button',
            text: 'x',
            title: 'Remove from schedule',
            'aria-label': 'Remove ' + title + ' from your schedule',
        });

        button.disabled = state.savingSessionId !== null;
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            toggleSession(session.id);
        });

        return button;
    }

    function renderMapLinks(links) {
        const wrapper = element('div', { className: 'wcc-map-links' });

        links.forEach(function (link) {
            wrapper.append(element('a', {
                href: link.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                text: link.label,
            }));
        });

        return wrapper;
    }

    function renderGapPicker(step) {
        const candidates = Array.isArray(step.candidates) ? step.candidates : [];
        const gapKey = getGapKey(step);
        const loaded = isGapLoaded(gapKey);
        const details = element('details', { className: 'wcc-gap-picker' });
        const timeZone = getSelectedTimezone();

        if (state.openGapKey === gapKey) {
            details.open = true;
        }

        details.append(element('summary', { className: 'wcc-gap-toggle', text: 'Add a session' }));
        details.addEventListener('toggle', function () {
            if (details.open) {
                state.openGapKey = gapKey;
                if (!candidates.length && !loaded) {
                    loadGapCandidates(step);
                }
            } else if (state.openGapKey === gapKey) {
                state.openGapKey = '';
            }
        });

        if (!candidates.length) {
            details.append(element('div', {
                className: 'wcc-gap-empty',
                text: state.loadingGapKey === gapKey ? 'Loading sessions...' : (loaded ? 'No sessions fit here.' : 'Open to load sessions.'),
            }));

            return details;
        }

        details.append(renderGapSchedule(candidates, timeZone, step));

        return details;
    }

    function getGapKey(step) {
        return [step.dayKey || step.day_key || '', step.start || 0, step.end || 0].join(':');
    }

    function renderGapSchedule(candidates, timeZone, gap) {
        const tracks = getTracksForSessions(candidates);
        const grid = element('div', { className: 'wcc-gap-grid' });
        const boundaries = getGapGridBoundaries(candidates, gap);
        const columns = '64px repeat(' + Math.max(1, tracks.length) + ', minmax(150px, 1fr))';
        const rows = ['auto'].concat(getGapGridRowSizes(boundaries)).join(' ');

        grid.style.gridTemplateColumns = columns;
        grid.style.gridTemplateRows = rows;
        grid.append(positionGridItem(element('div', { className: 'wcc-gap-time wcc-gap-header-cell' }), 1, 1));
        tracks.forEach(function (track) {
            grid.append(positionGridItem(element('div', { className: 'wcc-gap-track', text: track }), tracks.indexOf(track) + 2, 1));
        });

        boundaries.slice(0, -1).forEach(function (boundary, index) {
            grid.append(positionGridItem(element('div', { className: 'wcc-gap-time', text: formatSlotTime(boundary, timeZone) }), 1, index + 2));
        });

        candidates.slice().sort(compareSessions).forEach(function (session) {
            const track = getPrimaryTrack(session) || 'Sessions';
            const trackIndex = Math.max(0, tracks.indexOf(track));
            const startIndex = Math.max(0, boundaries.indexOf(Number(session.start || 0)));
            const endIndex = Math.max(startIndex + 1, boundaries.indexOf(Number(session.end || session.start || 0)));
            const candidate = renderGapCandidate(session, timeZone, gap);

            candidate.style.gridColumn = String(trackIndex + 2);
            candidate.style.gridRow = (startIndex + 2) + ' / ' + (endIndex + 2);
            grid.append(candidate);
        });

        return grid;
    }

    function positionGridItem(node, column, row) {
        node.style.gridColumn = String(column);
        node.style.gridRow = String(row);

        return node;
    }

    function getGapGridBoundaries(candidates, gap) {
        const boundaries = [];

        function addBoundary(value) {
            value = Number(value || 0);
            if (value && boundaries.indexOf(value) === -1) {
                boundaries.push(value);
            }
        }

        addBoundary(gap && gap.start);
        addBoundary(gap && gap.end);
        candidates.forEach(function (session) {
            addBoundary(session.start);
            addBoundary(session.end || session.start);
        });

        return boundaries.sort(function (a, b) {
            return a - b;
        });
    }

    function getGapGridRowSizes(boundaries) {
        return boundaries.slice(0, -1).map(function (boundary, index) {
            const nextBoundary = boundaries[index + 1] || boundary;
            const minutes = Math.max(1, Math.round((nextBoundary - boundary) / 60));
            const height = Math.max(30, Math.min(90, Math.round(minutes * 1.6)));

            return 'minmax(' + height + 'px, auto)';
        });
    }

    function renderGapCandidate(session, timeZone, gap) {
        const conflicts = getConflictsForSession(session, getSavedSessionIds());
        const boundaryNotices = getGapBoundaryNotices(session, gap, timeZone);
        const button = element('button', {
            className: 'wcc-gap-candidate' + (conflicts.length ? ' has-conflict' : ''),
            type: 'button',
        });
        const meta = [formatSessionTime(session, timeZone)];

        if (session.speaker_names && session.speaker_names.length) {
            meta.push(session.speaker_names.join(', '));
        }

        if (conflicts.length) {
            meta.push('Overlaps ' + conflicts.map(function (conflict) {
                return conflict.title || 'saved session';
            }).join(', '));
        }

        button.append(
            element('strong', {
                text: state.savingSessionId === session.id
                    ? 'Saving...'
                    : (session.title || 'Untitled session'),
            })
        );

        if (conflicts.length || boundaryNotices.length) {
            const badges = element('span', { className: 'wcc-gap-badges' });

            if (conflicts.length) {
                badges.append(element('span', { className: 'wcc-overlap-badge', text: 'Overlaps your plan' }));
            }

            boundaryNotices.forEach(function (notice) {
                badges.append(element('span', { className: 'wcc-slot-badge', text: notice }));
            });

            button.append(badges);
        }

        button.append(
            element('span', { text: meta.join(' / ') })
        );
        button.disabled = state.savingSessionId !== null;
        button.addEventListener('click', function () {
            toggleSession(session.id);
        });

        return button;
    }

    function getGapBoundaryNotices(session, gap, timeZone) {
        const notices = [];
        const sessionStart = Number(session && session.start || 0);
        const sessionEnd = Number(session && (session.end || session.start) || 0);
        const gapStart = Number(gap && gap.start || 0);
        const gapEnd = Number(gap && gap.end || 0);

        if (sessionStart && gapStart && sessionStart < gapStart) {
            notices.push('Started at ' + formatSlotTime(sessionStart, timeZone));
        }

        if (sessionEnd && gapEnd && sessionEnd > gapEnd) {
            notices.push('Runs until ' + formatSlotTime(sessionEnd, timeZone));
        }

        return notices;
    }

    function renderSessionNotes(session, options) {
        options = options || {};
        const notePost = getSessionNotePost(session);
        if (!notePost || !notePost.post_id) {
            return null;
        }

        const postId = Number(notePost.post_id);
        const value = getSessionNotes(session);
        const persistedValue = typeof notePost.notes === 'string' ? notePost.notes : '';
        const details = element('details', {
            className: 'wcc-session-notes' + (options.compact ? ' is-compact' : ''),
        });
        const textarea = element('textarea', {
            className: 'wcc-note-editor',
            rows: options.compact ? '3' : '4',
            placeholder: 'Notes',
            'aria-label': 'Notes for ' + (session.title || 'session'),
        });
        const actions = element('div', { className: 'wcc-note-actions' });
        const status = element('span', {
            className: 'wcc-note-autosave-status',
            'data-note-post-id': String(postId),
            text: getNoteAutosaveStatusText(postId, value, persistedValue),
        });
        const toolbar = renderNoteMarkdownToolbar(textarea, postId, persistedValue, status);

        if (value || Object.prototype.hasOwnProperty.call(state.noteDrafts, postId)) {
            details.open = true;
        }

        textarea.value = value;
        autoResizeNoteTextarea(textarea);
        textarea.addEventListener('input', function () {
            handleNoteEditorInput(textarea, postId, persistedValue, status);
        });
        textarea.addEventListener('keydown', function (event) {
            handleNoteEditorKeydown(event, textarea, postId, persistedValue, status);
        });

        actions.append(status);
        details.append(
            element('summary', { text: persistedValue || value ? 'Notes' : 'Add notes' }),
            toolbar,
            textarea,
            actions
        );

        return details;
    }

    function renderNoteMarkdownToolbar(textarea, postId, persistedValue, status) {
        const toolbar = element('div', {
            className: 'wcc-note-toolbar',
            'aria-label': 'Markdown formatting controls',
        });
        const controls = [
            { label: 'B', title: 'Bold', marker: '**', sample: 'bold text' },
            { label: 'I', title: 'Italic', marker: '_', sample: 'italic text' },
            { label: 'List', title: 'Bulleted list', list: true },
            { label: 'Link', title: 'Link', link: true },
        ];

        controls.forEach(function (control) {
            const button = element('button', {
                className: 'wcc-note-tool',
                type: 'button',
                title: control.title,
                text: control.label,
            });

            button.addEventListener('mousedown', function (event) {
                event.preventDefault();
            });
            button.addEventListener('click', function () {
                applyNoteMarkdownControl(textarea, control, postId, persistedValue, status);
            });
            toolbar.append(button);
        });

        return toolbar;
    }

    function applyNoteMarkdownControl(textarea, control, postId, persistedValue, status) {
        textarea.focus();
        let changed = true;

        if (control.list) {
            insertNoteListMarkdown(textarea);
        } else if (control.link) {
            changed = insertNoteLinkMarkdown(textarea);
        } else {
            wrapNoteSelection(textarea, control.marker, control.marker, control.sample);
        }

        if (changed) {
            handleNoteEditorInput(textarea, postId, persistedValue, status);
        }
    }

    function handleNoteEditorInput(textarea, postId, persistedValue, status) {
        autoResizeNoteTextarea(textarea);
        state.noteDrafts[postId] = textarea.value;
        state.noteAutosaveStatus[postId] = 'unsaved';
        status.textContent = getNoteAutosaveStatusText(postId, textarea.value, persistedValue);
        refreshNotesExportPreview();
        queueSessionNotesAutosave(postId, textarea.value);
    }

    function handleNoteEditorKeydown(event, textarea, postId, persistedValue, status) {
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'b') {
            event.preventDefault();
            wrapNoteSelection(textarea, '**', '**', 'bold text');
            handleNoteEditorInput(textarea, postId, persistedValue, status);
            return;
        }

        if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'i') {
            event.preventDefault();
            wrapNoteSelection(textarea, '_', '_', 'italic text');
            handleNoteEditorInput(textarea, postId, persistedValue, status);
            return;
        }

        if (event.key === 'Enter' && continueNoteList(textarea)) {
            event.preventDefault();
            handleNoteEditorInput(textarea, postId, persistedValue, status);
        }
    }

    function wrapNoteSelection(textarea, prefix, suffix, fallback) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const selected = textarea.value.slice(start, end) || fallback;
        const inserted = prefix + selected + suffix;

        replaceNoteSelection(textarea, inserted, start, end);
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }

    function insertNoteListMarkdown(textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const value = textarea.value;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const selectionEnd = end > start ? end : start;
        const lineEndIndex = value.indexOf('\n', selectionEnd);
        const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
        const block = value.slice(lineStart, lineEnd);
        const lines = block.split('\n');
        const isSingleEmptyLine = start === end && lines.length === 1 && !lines[0].trim();
        const shouldRemove = lines.some(function (line) {
            return line.trim();
        }) && lines.filter(function (line) {
            return line.trim();
        }).every(function (line) {
            return /^\s*[-*]\s+/.test(line);
        });
        const inserted = lines.map(function (line) {
            if (!line.trim()) {
                return isSingleEmptyLine ? '- ' : line;
            }

            if (shouldRemove) {
                return line.replace(/^(\s*)[-*]\s+/, '$1');
            }

            return line.replace(/^(\s*)/, '$1- ');
        }).join('\n');
        const offset = inserted.length - block.length;

        replaceNoteSelection(textarea, inserted, lineStart, lineEnd);
        textarea.setSelectionRange(
            Math.max(lineStart, start + offset),
            Math.max(lineStart, end + offset)
        );
    }

    function insertNoteLinkMarkdown(textarea) {
        const selection = getNoteLinkSelection(textarea);
        const selected = textarea.value.slice(selection.start, selection.end) || 'link text';
        const inserted = '[' + selected + '](https://)';
        const cursor = selection.start + selected.length + 11;

        replaceNoteSelection(textarea, inserted, selection.start, selection.end);
        textarea.setSelectionRange(cursor, cursor);
        return true;
    }

    function getNoteLinkSelection(textarea) {
        const value = textarea.value;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;

        if (start !== end) {
            return { start: start, end: end };
        }

        let wordStart = start;
        let wordEnd = end;

        while (wordStart > 0 && isNoteLinkWordCharacter(value.charAt(wordStart - 1))) {
            wordStart--;
        }

        while (wordEnd < value.length && isNoteLinkWordCharacter(value.charAt(wordEnd))) {
            wordEnd++;
        }

        return { start: wordStart, end: wordEnd };
    }

    function isNoteLinkWordCharacter(character) {
        return /[^\s()[\]{}<>]/.test(character);
    }

    function continueNoteList(textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;

        if (start !== end) {
            return false;
        }

        const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
        const line = textarea.value.slice(lineStart, start);
        const match = line.match(/^(\s*)[-*]\s(.*)$/);

        if (!match) {
            return false;
        }

        if (!match[2].trim()) {
            textarea.value = textarea.value.slice(0, lineStart) + textarea.value.slice(start);
            textarea.setSelectionRange(lineStart, lineStart);
            return true;
        }

        const inserted = '\n' + match[1] + '- ';
        replaceNoteSelection(textarea, inserted, start, end);
        textarea.setSelectionRange(start + inserted.length, start + inserted.length);
        return true;
    }

    function replaceNoteSelection(textarea, inserted, start, end) {
        textarea.value = textarea.value.slice(0, start) + inserted + textarea.value.slice(end);
    }

    function autoResizeNoteTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    function getNoteAutosaveStatusText(postId, value, persistedValue) {
        const status = state.noteAutosaveStatus[postId] || '';

        if (status === 'saving' || state.savingNotePostId === postId) {
            return 'Saving...';
        }

        if (status === 'saved') {
            return 'Saved';
        }

        if (status === 'error') {
            return 'Could not save. Will retry when you edit.';
        }

        if (status === 'unsaved' || value !== persistedValue) {
            return 'Unsaved changes';
        }

        return 'Autosaved';
    }

    function renderNoteSession(session) {
        const timeZone = getSelectedTimezone();
        const article = element('article', { className: 'wcc-session wcc-note-session is-saved' });
        const time = element('div', { className: 'wcc-session-time', text: formatSessionTime(session, timeZone) });
        const body = element('div', { className: 'wcc-session-body' });
        const title = element('h3');
        const meta = session.track_names && session.track_names.length ? session.track_names.join(', ') : '';
        const notes = renderSessionNotes(session, { compact: false });

        time.append(element('span', { className: 'wcc-session-duration', text: formatDuration(session.duration) }));

        if (session.url) {
            title.append(element('a', {
                href: session.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                text: session.title || 'Untitled session',
            }));
        } else {
            title.textContent = session.title || 'Untitled session';
        }

        body.append(title);

        if (meta) {
            body.append(element('div', { className: 'wcc-session-meta', text: meta }));
        }

        const speakers = renderSessionSpeakers(session, 'wcc-session-speakers');
        if (speakers) {
            body.append(speakers);
        }

        if (notes) {
            body.append(notes);
        }

        article.append(time, body);

        return article;
    }

    function renderSession(session, savedIds) {
        const isSaved = savedIds.has(session.id);
        const conflicts = getConflictsForSession(session, savedIds);
        const timeZone = getSelectedTimezone();
        const article = element('article', {
            className: [
                'wcc-session',
                isSaved ? 'is-saved' : '',
                !isSaved && conflicts.length ? 'has-conflict' : '',
                session.type === 'custom' ? 'is-custom' : '',
            ].filter(Boolean).join(' '),
        });

        const time = element('div', { className: 'wcc-session-time', text: formatSessionTime(session, timeZone) });
        time.append(element('span', { className: 'wcc-session-duration', text: formatDuration(session.duration) }));

        const body = element('div', { className: 'wcc-session-body' });
        const title = element('h3');
        if (session.url) {
            title.append(element('a', {
                href: session.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                text: session.title || 'Untitled session',
            }));
        } else {
            title.textContent = session.title || 'Untitled session';
        }
        body.append(title);

        const meta = session.track_names && session.track_names.length ? session.track_names.join(', ') : '';
        if (meta) {
            body.append(element('div', { className: 'wcc-session-meta', text: meta }));
        }

        const speakers = renderSessionSpeakers(session, 'wcc-session-speakers');
        if (speakers) {
            body.append(speakers);
        }

        if (session.description) {
            body.append(element('p', { className: 'wcc-session-description', text: session.description }));
        }

        const tags = [].concat(session.category_names || []);
        if (session.type === 'custom') {
            tags.push('Custom');
        }
        if (tags.length) {
            const tagList = element('div', { className: 'wcc-tags' });
            tags.forEach(function (tag) {
                tagList.append(element('span', { className: 'wcc-tag', text: tag }));
            });
            body.append(tagList);
        }

        if (conflicts.length) {
            body.append(element('div', {
                className: 'wcc-conflict',
                text: (isSaved ? 'Saved alternative to ' : 'Same time as ') + conflicts.map(function (conflict) {
                    return conflict.title;
                }).join(', '),
            }));
        }

        const toggle = element('button', {
            className: 'wcc-session-toggle' + (isSaved ? ' is-saved' : ''),
            type: 'button',
            text: state.savingSessionId === session.id ? 'Saving...' : (isSaved ? 'Saved' : (conflicts.length ? 'Save option' : 'Save')),
        });
        toggle.disabled = state.savingSessionId !== null;
        toggle.addEventListener('click', function () {
            toggleSession(session.id);
        });

        article.append(time, body, toggle);

        return article;
    }

    function createShareIconButton() {
        const button = element('button', {
            className: 'wcc-share-icon-button',
            type: 'button',
            'aria-label': 'Share WordCamp Companion',
            title: 'Share',
        });
        const icon = element('span', {
            className: 'dashicons dashicons-share',
            'aria-hidden': 'true',
        });

        button.append(icon);
        button.addEventListener('click', openShareDialog);

        return button;
    }

    Object.assign(WCC, {
        render: render,
        renderDebugClock: renderDebugClock,
        renderDebugSlider: renderDebugSlider,
        renderLayout: renderLayout,
        setHidden: setHidden,
        renderAlerts: renderAlerts,
        renderHeader: renderHeader,
        renderSelectedEvent: renderSelectedEvent,
        renderControls: renderControls,
        renderNotesControls: renderNotesControls,
        renderSettingsControls: renderSettingsControls,
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
        renderEvents: renderEvents,
        activateEventCard: activateEventCard,
        activatePlanSelectorEvent: activatePlanSelectorEvent,
        createEventCompanionToggle: createEventCompanionToggle,
        renderCompanionVisibilityButton: renderCompanionVisibilityButton,
        renderTabs: renderTabs,
        renderSchedule: renderSchedule,
        renderScheduleContent: renderScheduleContent,
        renderNotesExport: renderNotesExport,
        renderNotesPage: renderNotesPage,
        copyNotesMarkdown: copyNotesMarkdown,
        copyTextFallback: copyTextFallback,
        downloadNotesMarkdown: downloadNotesMarkdown,
        buildNotesMarkdown: buildNotesMarkdown,
        renderTrackSchedule: renderTrackSchedule,
        renderTrackSession: renderTrackSession,
        renderCompanion: renderCompanion,
        getCompanionRenderModel: getCompanionRenderModel,
        renderEmptyCompanion: renderEmptyCompanion,
        renderCompanionFallback: renderCompanionFallback,
        renderCompanionRenderError: renderCompanionRenderError,
        getRenderableCompanionSteps: getRenderableCompanionSteps,
        getAnimatedCompanionSteps: getAnimatedCompanionSteps,
        scheduleCompanionExitCleanup: scheduleCompanionExitCleanup,
        resetCompanionAnimationState: resetCompanionAnimationState,
        updateCompanionInPlace: updateCompanionInPlace,
        updateCompanionStepInPlace: updateCompanionStepInPlace,
        captureCompanionStepRects: captureCompanionStepRects,
        animateCompanionStepPositions: animateCompanionStepPositions,
        getCurrentCompanionWrapper: getCurrentCompanionWrapper,
        getCompanionStepNodes: getCompanionStepNodes,
        getCompanionStepKeys: getCompanionStepKeys,
        getCompanionStepKeySignature: getCompanionStepKeySignature,
        shouldReduceMotion: shouldReduceMotion,
        getCompanionStepKey: getCompanionStepKey,
        getCompanionRenderSignature: getCompanionRenderSignature,
        getCompanionStepStaticSignature: getCompanionStepStaticSignature,
        getCompanionSessionStaticSignature: getCompanionSessionStaticSignature,
        renderCompanionTopLink: renderCompanionTopLink,
        renderCompanionStep: renderCompanionStep,
        getCompanionStepClassName: getCompanionStepClassName,
        getRenderedCompanionTiming: getRenderedCompanionTiming,
        applyCompanionStepProgress: applyCompanionStepProgress,
        renderCompanionMarker: renderCompanionMarker,
        getCompanionStepProgress: getCompanionStepProgress,
        renderSessionSpeakers: renderSessionSpeakers,
        renderCompanionRemoveButton: renderCompanionRemoveButton,
        renderMapLinks: renderMapLinks,
        renderGapPicker: renderGapPicker,
        getGapKey: getGapKey,
        renderGapSchedule: renderGapSchedule,
        positionGridItem: positionGridItem,
        getGapGridBoundaries: getGapGridBoundaries,
        getGapGridRowSizes: getGapGridRowSizes,
        renderGapCandidate: renderGapCandidate,
        getGapBoundaryNotices: getGapBoundaryNotices,
        refreshNotesExportPreview: refreshNotesExportPreview,
        renderSessionNotes: renderSessionNotes,
        renderNoteSession: renderNoteSession,
        renderSession: renderSession,
        createShareIconButton: createShareIconButton
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
