(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function buildLocalCompanionSchedule() {
        return WCC.buildLocalCompanionSchedule.apply(WCC, arguments);
    }
    function syncSelectedEventScheduleMetadata() {
        return WCC.syncSelectedEventScheduleMetadata.apply(WCC, arguments);
    }
    function mergeLoadedGapCandidates() {
        return WCC.mergeLoadedGapCandidates.apply(WCC, arguments);
    }
    function api() {
        return WCC.api.apply(WCC, arguments);
    }
    function wpApi() {
        return WCC.wpApi.apply(WCC, arguments);
    }
    function getErrorAlert() {
        return WCC.getErrorAlert.apply(WCC, arguments);
    }
    function render() {
        return WCC.render.apply(WCC, arguments);
    }
    function refreshNotesExportPreview() {
        return WCC.refreshNotesExportPreview.apply(WCC, arguments);
    }
    function openImportScheduleDialog() {
        return WCC.openImportScheduleDialog.apply(WCC, arguments);
    }
    function resetCompanionAnimationState() {
        return WCC.resetCompanionAnimationState.apply(WCC, arguments);
    }
    function getGapKey() {
        return WCC.getGapKey.apply(WCC, arguments);
    }
    function createSavedSessionPost() {
        return WCC.createSavedSessionPost.apply(WCC, arguments);
    }
    function deleteSavedSessionPost() {
        return WCC.deleteSavedSessionPost.apply(WCC, arguments);
    }
    function restoreSavedSessionPost() {
        return WCC.restoreSavedSessionPost.apply(WCC, arguments);
    }
    function normalizeSavedSessionPost() {
        return WCC.normalizeSavedSessionPost.apply(WCC, arguments);
    }
    function savedSessionPostToSession() {
        return WCC.savedSessionPostToSession.apply(WCC, arguments);
    }
    function findLocalSession() {
        return WCC.findLocalSession.apply(WCC, arguments);
    }
    function restartClock() {
        return WCC.restartClock.apply(WCC, arguments);
    }
    function clearDebugTimeAdjustment() {
        return WCC.clearDebugTimeAdjustment.apply(WCC, arguments);
    }
    function getDefaultNotesEventUrl() {
        return WCC.getDefaultNotesEventUrl.apply(WCC, arguments);
    }
    function getEventByUrl() {
        return WCC.getEventByUrl.apply(WCC, arguments);
    }
    function getEventBySlug() {
        return WCC.getEventBySlug.apply(WCC, arguments);
    }
    function getRequestedWordcampSlug() {
        return WCC.getRequestedWordcampSlug.apply(WCC, arguments);
    }
    function getRequestedWccValue() {
        return WCC.getRequestedWccValue.apply(WCC, arguments);
    }
    function parseWccParameter() {
        return WCC.parseWccParameter.apply(WCC, arguments);
    }
    function buildWccEvent() {
        return WCC.buildWccEvent.apply(WCC, arguments);
    }
    function getCompanionImportUrl() {
        return WCC.getCompanionImportUrl.apply(WCC, arguments);
    }
    function getCompanionUrl() {
        return WCC.getCompanionUrl.apply(WCC, arguments);
    }
    function getSavedSessionIds() {
        return WCC.getSavedSessionIds.apply(WCC, arguments);
    }
    function getSavedSessionPost() {
        return WCC.getSavedSessionPost.apply(WCC, arguments);
    }
    function getSessionNotes() {
        return WCC.getSessionNotes.apply(WCC, arguments);
    }
    function updateSavedSessionNotes() {
        return WCC.updateSavedSessionNotes.apply(WCC, arguments);
    }

    function setNoteAutosaveStatus(postId, status) {
        postId = Number(postId || 0);
        if (!postId) {
            return;
        }

        if (status) {
            state.noteAutosaveStatus[postId] = status;
        } else {
            delete state.noteAutosaveStatus[postId];
        }

        Array.from(document.querySelectorAll('[data-note-post-id="' + postId + '"]')).forEach(function (element) {
            updateNoteAutosaveStatusElement(element, postId, getNoteAutosaveStatusTextFromStatus(status));
        });
        Array.from(document.querySelectorAll('[data-note-page-link-post-id="' + postId + '"]')).forEach(function (element) {
            updateNotePageLinkElement(element, getNoteAutosaveStatusTextFromStatus(status));
        });
    }

    function getNoteAutosaveStatusTextFromStatus(status) {
        if (status === 'saving') {
            return 'Saving...';
        }

        if (status === 'saved') {
            return 'Saved';
        }

        if (status === 'error') {
            return 'Could not save. Will retry when you edit.';
        }

        if (status === 'unsaved') {
            return 'Unsaved changes';
        }

        return '';
    }

    function getNoteSectionId(postId) {
        postId = Number(postId || 0);

        return postId ? 'note-' + postId : '';
    }

    function getNoteSectionUrl(postId) {
        const sectionId = getNoteSectionId(postId);
        const baseUrl = config.notesUrl || '#';

        return sectionId ? baseUrl + '#' + sectionId : baseUrl;
    }

    function updateNoteAutosaveStatusElement(element, postId, text) {
        const value = String(text || '');

        element.textContent = value;
    }

    function updateNotePageLinkElement(element, statusText) {
        const value = String(statusText || '');

        element.hidden = value !== 'Saved';
    }

    function queueSessionNotesAutosave(postId, notes) {
        postId = Number(postId || 0);
        if (!postId) {
            return;
        }

        if (state.noteAutosaveTimers[postId]) {
            window.clearTimeout(state.noteAutosaveTimers[postId]);
        }

        setNoteAutosaveStatus(postId, 'unsaved');
        state.noteAutosaveTimers[postId] = window.setTimeout(function () {
            delete state.noteAutosaveTimers[postId];
            saveSessionNotes(postId, notes, { quiet: true });
        }, 900);
    }

    function addSavedSessionPost() {
        return WCC.addSavedSessionPost.apply(WCC, arguments);
    }
    function removeSavedSessionPost() {
        return WCC.removeSavedSessionPost.apply(WCC, arguments);
    }
    function isGapLoaded() {
        return WCC.isGapLoaded.apply(WCC, arguments);
    }
    function hasGapCandidates() {
        return WCC.hasGapCandidates.apply(WCC, arguments);
    }
    function normalizePlan() {
        return WCC.normalizePlan.apply(WCC, arguments);
    }
    function normalizeSettings() {
        return WCC.normalizeSettings.apply(WCC, arguments);
    }
    function isDebugClockEnabled() {
        return WCC.isDebugClockEnabled.apply(WCC, arguments);
    }

    async function loadInitialData() {
        const requestedWccRaw = getRequestedWccValue();
        const requestedWcc = parseWccParameter(requestedWccRaw);

        if (requestedWccRaw && state.page !== 'plan' && state.page !== 'companion') {
            window.location.replace(getCompanionImportUrl(requestedWccRaw));
            return;
        }

        const requestedSlug = requestedWccRaw ? '' : getRequestedWordcampSlug();
        const needsEvents = !requestedWccRaw && (state.page === 'plan' || state.page === 'plan-selector');

        state.loadingEvents = needsEvents;
        state.plan = normalizePlan(config.initialPlan);
        state.settings = normalizeSettings(config.settings);
        state.selectedEventUrl = state.page === 'plan-selector'
            ? ''
            : (state.page === 'notes' ? getDefaultNotesEventUrl() : (state.plan.selected_event_url || ''));
        state.pickerOpen = state.page === 'plan-selector' || state.page === 'plan' && !state.selectedEventUrl;
        if (state.page === 'companion' && state.selectedEventUrl) {
            state.schedule = buildLocalCompanionSchedule();
        }
        if (shouldLoadInitialCompanionGaps()) {
            state.loadingInitialGaps = true;
        }
        render();
        if (state.loadingInitialGaps) {
            loadInitialCompanionGaps();
        }

        try {
            let handledRequestedEvent = false;

            if (needsEvents) {
                const events = await api('wordcamps');
                state.events = Array.isArray(events.wordcamps) ? events.wordcamps : [];
            }

            state.alert = null;

            if (requestedWccRaw && !requestedWcc) {
                handledRequestedEvent = true;
                state.alert = { type: 'error', message: 'WordCamp schedule link is invalid.' };
            } else if (requestedWcc) {
                handledRequestedEvent = true;
                await selectWccSchedule(requestedWcc, { stayOnCompanion: state.page === 'companion' });
            } else if (requestedSlug) {
                const requestedEvent = getEventBySlug(requestedSlug);
                if (requestedEvent) {
                    handledRequestedEvent = requestedEvent.event_url !== state.selectedEventUrl;
                    if (handledRequestedEvent) {
                        await selectEvent(requestedEvent.event_url);
                    }
                } else {
                    state.alert = { type: 'error', message: 'WordCamp not found for this link.' };
                }
            }

            render();

            if (state.page === 'notes') {
                render();
                return;
            }

            if (state.selectedEventUrl && !handledRequestedEvent) {
                if (state.page === 'companion') {
                    await loadSchedule(false, 'companion');
                } else {
                    await loadSchedule(false, state.view === 'schedule' ? 'full' : 'companion');
                }
            }
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.loadingEvents = false;
            render();
        }
    }

    async function loadEvents(refresh) {
        state.loadingEvents = true;
        render();

        try {
            const data = await api('wordcamps', { query: { refresh: refresh ? '1' : '0' } });
            state.events = Array.isArray(data.wordcamps) ? data.wordcamps : [];
            state.alert = null;
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.loadingEvents = false;
            render();
        }
    }

    async function selectEvent(eventUrl) {
        if (!eventUrl || state.savingEvent) {
            return;
        }

        if (eventUrl === state.selectedEventUrl) {
            state.pickerOpen = false;
            render();
            return;
        }

        const event = getEventByUrl(eventUrl);
        if (!event) {
            return;
        }

        const previousSelectedEventUrl = state.selectedEventUrl;
        const previousSchedule = state.schedule;
        const previousLoadedGapKeys = Object.assign({}, state.loadedGapKeys);
        const previousOpenGapKey = state.openGapKey;

        state.selectedEventUrl = eventUrl;
        state.schedule = null;
        state.loadedGapKeys = {};
        resetCompanionAnimationState();
        state.savingEvent = true;
        state.savingCompanionEventUrl = event.event_url;
        state.alert = null;
        render();

        try {
            state.plan = normalizePlan(await api('plan/event', {
                method: 'POST',
                body: { event: event },
            }));
            state.pickerOpen = false;
            if (state.view === 'companion') {
                await loadSchedule(false, 'companion');
                if (shouldLoadInitialCompanionGaps()) {
                    loadInitialCompanionGaps();
                }
            } else {
                await loadSchedule(false, state.view === 'schedule' ? 'full' : 'companion');
            }
        } catch (error) {
            state.selectedEventUrl = previousSelectedEventUrl;
            state.schedule = previousSchedule;
            state.loadedGapKeys = previousLoadedGapKeys;
            state.openGapKey = previousOpenGapKey;
            resetCompanionAnimationState();
            state.alert = getErrorAlert(error);
        } finally {
            state.savingEvent = false;
            state.savingCompanionEventUrl = '';
            render();
        }
    }

    async function selectWccSchedule(requestedWcc, options) {
        options = options || {};
        const event = buildWccEvent(requestedWcc);
        const previousSelectedEventUrl = state.selectedEventUrl;
        const previousView = state.view;
        const previousSchedule = state.schedule;
        const previousLoadedGapKeys = Object.assign({}, state.loadedGapKeys);
        const previousOpenGapKey = state.openGapKey;

        state.selectedEventUrl = event.event_url;
        state.view = options.stayOnCompanion ? 'companion' : 'schedule';
        state.pickerOpen = false;
        state.schedule = null;
        state.loadedGapKeys = {};
        resetCompanionAnimationState();
        state.savingEvent = true;
        state.savingCompanionEventUrl = event.event_url;
        state.alert = null;
        render();

        try {
            state.plan = normalizePlan(await api('plan/event', {
                method: 'POST',
                body: { event: event },
            }));
            state.selectedEventUrl = event.event_url;
            await loadSchedule(false, 'full');
            if (requestedWcc.sessionIds.length) {
                openImportScheduleDialog(requestedWcc);
            }
        } catch (error) {
            state.selectedEventUrl = previousSelectedEventUrl;
            state.view = previousView;
            state.schedule = previousSchedule;
            state.loadedGapKeys = previousLoadedGapKeys;
            state.openGapKey = previousOpenGapKey;
            resetCompanionAnimationState();
            state.alert = getErrorAlert(error);
        } finally {
            state.savingEvent = false;
            state.savingCompanionEventUrl = '';
            render();
        }
    }

    async function selectEventForMobileCompanion(event) {
        if (!event || !event.event_url || state.savingEvent || state.savingCompanionEventUrl) {
            return;
        }

        const previousSelectedEventUrl = state.selectedEventUrl;
        const previousPlan = state.plan;

        state.selectedEventUrl = event.event_url;
        state.savingEvent = true;
        state.savingCompanionEventUrl = event.event_url;
        state.alert = null;
        render();

        try {
            state.plan = normalizePlan(await api('plan/event', {
                method: 'POST',
                body: { event: event },
            }));
            window.location.href = getCompanionUrl();
        } catch (error) {
            state.selectedEventUrl = previousSelectedEventUrl;
            state.plan = previousPlan;
            state.alert = getErrorAlert(error);
            state.savingEvent = false;
            state.savingCompanionEventUrl = '';
            render();
        }
    }

    function selectNotesEvent(eventUrl) {
        if (!eventUrl || eventUrl === state.selectedEventUrl) {
            return;
        }

        state.selectedEventUrl = eventUrl;
        state.notesExportCopied = false;
        state.alert = null;
        render();
    }

    async function setEventCompanionVisibility(event, show) {
        if (!event || !event.event_url || state.savingCompanionEventUrl) {
            return;
        }

        state.savingCompanionEventUrl = event.event_url;
        state.alert = null;
        render();

        try {
            state.plan = normalizePlan(await api('plan/companion-visibility', {
                method: 'POST',
                body: {
                    event: event,
                    show: Boolean(show),
                },
            }));

            if (state.page === 'companion') {
                state.selectedEventUrl = state.plan.selected_event_url || '';
                state.schedule = state.selectedEventUrl ? buildLocalCompanionSchedule() : null;
                state.loadedGapKeys = {};
                state.openGapKey = '';
                resetCompanionAnimationState();
            }

            state.alert = null;
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.savingCompanionEventUrl = '';
            render();
        }
    }

    async function loadSchedule(refresh, mode) {
        if (!state.selectedEventUrl) {
            state.schedule = null;
            render();
            return;
        }

        mode = mode || (state.view === 'schedule' ? 'full' : 'companion');
        state.loadingSchedule = true;
        state.alert = null;
        const previousSchedule = state.schedule;
        const requestedEventUrl = state.selectedEventUrl;
        render();

        try {
            const schedule = await api(mode === 'full' ? 'schedule' : 'companion', {
                query: {
                    event_url: requestedEventUrl,
                    refresh: refresh ? '1' : '0',
                },
            });
            if (state.selectedEventUrl !== requestedEventUrl) {
                return;
            }

            state.schedule = schedule;
            syncSelectedEventScheduleMetadata(state.schedule);
            state.loadingGapKey = '';
            state.loadedGapKeys = {};
            state.openGapKey = '';
            resetCompanionAnimationState();
        } catch (error) {
            if (previousSchedule && previousSchedule.event_url === state.selectedEventUrl) {
                state.schedule = previousSchedule;
            }
            state.alert = getErrorAlert(error);
        } finally {
            state.loadingSchedule = false;
            render();
        }
    }

    async function loadGapCandidates(gap) {
        const gapKey = getGapKey(gap);
        if (!state.selectedEventUrl || !state.schedule || isGapLoaded(gapKey) || state.loadingGapKey) {
            return;
        }

        state.loadingGapKey = gapKey;
        const requestedEventUrl = state.selectedEventUrl;
        render();

        try {
            const data = await api('gap-candidates', {
                query: {
                    event_url: requestedEventUrl,
                    refresh: '0',
                    day_key: gap.dayKey || gap.day_key || '',
                    start: String(Number(gap.start || 0)),
                    end: String(Number(gap.end || 0)),
                },
            });
            if (!state.schedule || state.selectedEventUrl !== requestedEventUrl) {
                return;
            }

            syncSelectedEventScheduleMetadata(data);
            mergeLoadedGapCandidates(gapKey, Array.isArray(data.gaps) ? data.gaps : []);
            state.schedule.days = Object.assign({}, state.schedule.days || {}, data.days || {});
            if (Array.isArray(data.tracks) && data.tracks.length) {
                state.schedule.tracks = data.tracks;
            }
            state.loadedGapKeys[gapKey] = true;
            state.alert = null;
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.loadingGapKey = '';
            render();
        }
    }

    function shouldLoadInitialCompanionGaps() {
        return state.page === 'companion' &&
            Boolean(state.selectedEventUrl) &&
            Boolean(state.schedule) &&
            state.view === 'companion' &&
            getSavedSessionIds().size === 0 &&
            !state.loadingInitialGaps &&
            !state.schedule.gaps_loaded;
    }

    async function loadInitialCompanionGaps() {
        if (!state.selectedEventUrl || !state.schedule || state.schedule.gaps_loaded) {
            state.loadingInitialGaps = false;
            return;
        }

        state.loadingInitialGaps = true;
        const requestedEventUrl = state.selectedEventUrl;
        render();

        try {
            const data = await api('gap-candidates', {
                query: {
                    event_url: requestedEventUrl,
                    refresh: '0',
                },
            });
            if (!state.schedule || state.selectedEventUrl !== requestedEventUrl) {
                return;
            }

            syncSelectedEventScheduleMetadata(data);
            state.schedule.days = Object.assign({}, state.schedule.days || {}, data.days || {});
            state.schedule.gaps = Array.isArray(data.gaps) ? data.gaps.filter(hasGapCandidates) : [];
            state.schedule.gaps_loaded = true;
            state.schedule.timezone = data.timezone || state.schedule.timezone || '';
            state.schedule.site_name = data.site_name || state.schedule.site_name || '';
            if (Array.isArray(data.tracks) && data.tracks.length) {
                state.schedule.tracks = data.tracks;
            }
            state.loadedGapKeys = {};
            state.schedule.gaps.forEach(function (gap) {
                state.loadedGapKeys[getGapKey(gap)] = true;
            });
            state.alert = null;
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.loadingInitialGaps = false;
            render();
        }
    }

    async function toggleSession(sessionId) {
        if (!state.selectedEventUrl || state.savingSessionId) {
            return;
        }

        const savedIds = getSavedSessionIds();
        const wasSaved = savedIds.has(sessionId);
        const localSession = findLocalSession(sessionId);
        const savedPost = getSavedSessionPost(sessionId);
        const savedSession = savedPost ? savedSessionPostToSession(savedPost) : null;
        const savedNotes = savedSession ? getSessionNotes(savedSession) : '';

        if (wasSaved && savedNotes.trim() && !window.confirm(
            'This session has notes. Remove it from your schedule anyway? You can still use Undo to restore it.'
        )) {
            return;
        }

        state.savingSessionId = sessionId;
        render();

        try {
            if (wasSaved) {
                if (!savedPost || !savedPost.post_id) {
                    throw new Error('Saved session post was not found.');
                }

                await deleteSavedSessionPost(savedPost.post_id);
                removeSavedSessionPost(sessionId);
                state.pendingDeletedSessionUndo = {
                    eventUrl: state.selectedEventUrl,
                    postId: Number(savedPost.post_id || 0),
                    sessionId: Number(sessionId || 0),
                    title: savedPost.title || 'session',
                    session: Object.assign(
                        {},
                        localSession || savedSession,
                        { notes: savedNotes || savedPost.notes || (localSession && localSession.notes) || '' }
                    ),
                };
                state.alert = null;
                state.toast = null;
            } else {
                if (!localSession) {
                    throw new Error('Session details were not found.');
                }

                const pendingRestore = state.pendingDeletedSessionUndo &&
                    state.pendingDeletedSessionUndo.eventUrl === state.selectedEventUrl &&
                    Number(state.pendingDeletedSessionUndo.sessionId) === Number(sessionId)
                    ? state.pendingDeletedSessionUndo
                    : null;
                const sessionToSave = pendingRestore && pendingRestore.session
                    ? Object.assign({}, localSession, pendingRestore.session, {
                        notes: getSessionNotes(pendingRestore.session) || pendingRestore.session.notes || localSession.notes || '',
                    })
                    : localSession;
                const createdPost = await createSavedSessionPost(sessionToSave);
                addSavedSessionPost(normalizeSavedSessionPost(createdPost, sessionToSave));
                if (
                    state.pendingDeletedSessionUndo &&
                    Number(state.pendingDeletedSessionUndo.sessionId) === Number(sessionId)
                ) {
                    state.pendingDeletedSessionUndo = null;
                }
                state.alert = null;
            }

            if (state.schedule && state.schedule.mode === 'companion') {
                state.schedule = buildLocalCompanionSchedule();
                state.loadedGapKeys = {};
                state.openGapKey = '';
                resetCompanionAnimationState();
            }
            refreshNotesExportPreview();
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.savingSessionId = null;
            render();
        }
    }

    async function undoDeletedSession() {
        const pending = state.pendingDeletedSessionUndo;

        if (!pending || !pending.postId || state.savingSessionId) {
            return;
        }

        if (pending.eventUrl !== state.selectedEventUrl) {
            state.pendingDeletedSessionUndo = null;
            state.alert = { type: 'error', message: 'Switch back to that WordCamp before restoring the session.' };
            render();
            return;
        }

        state.savingSessionId = Number(pending.sessionId || 0);
        render();

        try {
            const restoredPost = await restoreSavedSessionPost(pending.postId);
            addSavedSessionPost(normalizeSavedSessionPost(restoredPost, pending.session));
            state.pendingDeletedSessionUndo = null;
            state.alert = null;
            state.toast = { type: 'success', message: 'Session restored.' };
            if (state.schedule && state.schedule.mode === 'companion') {
                state.schedule = buildLocalCompanionSchedule();
                state.loadedGapKeys = {};
                state.openGapKey = '';
                resetCompanionAnimationState();
            }
            refreshNotesExportPreview();
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.savingSessionId = null;
            render();
        }
    }

    async function saveSessionNotes(postId, notes, options) {
        options = options || {};
        postId = Number(postId || 0);
        if (!postId) {
            return;
        }

        if (state.noteAutosaveTimers[postId]) {
            window.clearTimeout(state.noteAutosaveTimers[postId]);
            delete state.noteAutosaveTimers[postId];
        }

        if (state.savingNotePostId) {
            queueSessionNotesAutosave(postId, notes);
            return;
        }

        state.savingNotePostId = postId;
        setNoteAutosaveStatus(postId, 'saving');
        state.alert = null;
        if (!options.quiet) {
            render();
        }

        try {
            const updatedPost = await wpApi((config.savedSessionRestBase || 'wordcamp-companion-sessions') + '/' + postId, {
                method: 'POST',
                body: {
                    meta: {
                        wcc_session_notes: notes,
                    },
                },
            });
            const updatedNotes = updatedPost && updatedPost.meta && typeof updatedPost.meta.wcc_session_notes === 'string'
                ? updatedPost.meta.wcc_session_notes
                : notes;

            updateSavedSessionNotes(postId, updatedNotes);
            refreshNotesExportPreview();
            if (state.noteDrafts[postId] === notes) {
                delete state.noteDrafts[postId];
                setNoteAutosaveStatus(postId, 'saved');
            } else {
                queueSessionNotesAutosave(postId, state.noteDrafts[postId]);
            }
            state.alert = null;
        } catch (error) {
            setNoteAutosaveStatus(postId, 'error');
            state.alert = getErrorAlert(error);
        } finally {
            state.savingNotePostId = null;
            if (!options.quiet) {
                render();
            }
        }
    }

    async function saveSettings(settings) {
        if (state.savingSettings) {
            return;
        }

        state.savingSettings = true;
        state.settingsSaved = false;
        state.alert = null;
        render();

        try {
            state.settings = normalizeSettings(await api('settings', {
                method: 'POST',
                body: settings,
            }));

            if (!isDebugClockEnabled()) {
                state.debugPlaying = false;
                state.debugOffsetSeconds = 0;
                clearDebugTimeAdjustment();
                state.debugLastTick = null;
            }

            state.settingsSaved = true;
            state.settingsDraft = null;
            state.alert = null;
            restartClock();
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.savingSettings = false;
            render();
        }
    }


    Object.assign(WCC, {
        loadInitialData: loadInitialData,
        loadEvents: loadEvents,
        selectEvent: selectEvent,
        selectWccSchedule: selectWccSchedule,
        selectEventForMobileCompanion: selectEventForMobileCompanion,
        selectNotesEvent: selectNotesEvent,
        setEventCompanionVisibility: setEventCompanionVisibility,
        loadSchedule: loadSchedule,
        loadGapCandidates: loadGapCandidates,
        shouldLoadInitialCompanionGaps: shouldLoadInitialCompanionGaps,
        loadInitialCompanionGaps: loadInitialCompanionGaps,
        toggleSession: toggleSession,
        undoDeletedSession: undoDeletedSession,
        getNoteSectionId: getNoteSectionId,
        getNoteSectionUrl: getNoteSectionUrl,
        updateNoteAutosaveStatusElement: updateNoteAutosaveStatusElement,
        updateNotePageLinkElement: updateNotePageLinkElement,
        queueSessionNotesAutosave: queueSessionNotesAutosave,
        saveSessionNotes: saveSessionNotes,
        saveSettings: saveSettings
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
