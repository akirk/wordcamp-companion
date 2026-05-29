(function () {
    const SCRIPT_BUILD = '20260529.7';
    const SUBSTANTIAL_OVERLAP_SECONDS = 20 * 60;
    const TRACK_CHANGE_LEAD_SECONDS = 10 * 60;
    const config = window.WordCampCompanionConfig || {};
    const state = {
        events: [],
        plan: { selected_event_url: '', plans: {} },
        settings: { show_debug_clock: false },
        schedule: null,
        selectedEventUrl: '',
        page: 'companion',
        view: 'companion',
        pickerOpen: true,
        loadingEvents: false,
        loadingSchedule: false,
        loadingGapKey: '',
        loadingInitialGaps: false,
        loadedGapKeys: {},
        openGapKey: '',
        companionVisibleStepKeys: null,
        exitingCompanionStepKeys: {},
        savingEvent: false,
        savingSessionId: null,
        savingCompanionEventUrl: '',
        savingNotePostId: null,
        noteDrafts: {},
        notesExportCopied: false,
        savingSettings: false,
        settingsSaved: false,
        settingsDraft: null,
        debugOffsetSeconds: 0,
        debugPlaying: false,
        debugRate: 300,
        debugLastTick: null,
        alert: null,
    };

    const nodes = {};
    let clockTimer = null;
    let companionExitTimer = null;

    function init() {
        nodes.app = document.getElementById('wordcamp-companion-app');
        state.page = nodes.app && nodes.app.dataset.page ? nodes.app.dataset.page : 'companion';
        state.view = state.page === 'plan' ? 'schedule' : (state.page === 'notes' ? 'notes' : 'companion');
        state.pickerOpen = state.page === 'plan' || state.page === 'plan-selector';
        nodes.debugClock = document.getElementById('wcc-debug-clock');
        nodes.debugCurrent = document.getElementById('wcc-debug-current');
        nodes.debugPlay = document.getElementById('wcc-debug-play');
        nodes.debugRate = document.getElementById('wcc-debug-rate');
        nodes.debugRateLabel = document.getElementById('wcc-debug-rate-label');
        nodes.debugReset = document.getElementById('wcc-debug-reset');
        nodes.debugJumps = Array.from(document.querySelectorAll('[data-debug-jump]'));
        nodes.debugStart = document.querySelector('[data-debug-start]');
        nodes.header = document.querySelector('.wcc-header');
        nodes.pageTitle = document.getElementById('wcc-page-title');
        nodes.pageTitleLink = document.getElementById('wcc-page-title-link');
        nodes.currentEvent = document.getElementById('wcc-current-event');
        nodes.planSummary = document.getElementById('wcc-plan-summary');
        nodes.selectedEvent = document.getElementById('wcc-selected-event');
        nodes.selectedTitle = document.getElementById('wcc-selected-title');
        nodes.selectedMeta = document.getElementById('wcc-selected-meta');
        nodes.openEvent = document.getElementById('wcc-open-event');
        nodes.changeEvent = document.getElementById('wcc-change-event');
        nodes.companionVisibility = document.getElementById('wcc-companion-visibility');
        nodes.picker = document.getElementById('wcc-picker');
        nodes.plannerNav = document.getElementById('wcc-planner-nav');
        nodes.eventSelect = document.getElementById('wcc-event-select');
        nodes.notesEventSelect = document.getElementById('wcc-notes-event-select');
        nodes.notesPlanLink = document.getElementById('wcc-notes-plan-link');
        nodes.planNotesLink = document.getElementById('wcc-plan-notes-link');
        nodes.settingsDebugClock = document.getElementById('wcc-setting-debug-clock');
        nodes.settingsSave = document.getElementById('wcc-settings-save');
        nodes.settingsStatus = document.getElementById('wcc-settings-status');
        nodes.refreshEvents = document.getElementById('wcc-refresh-events');
        nodes.refreshSchedule = document.getElementById('wcc-refresh-schedule');
        nodes.alerts = document.getElementById('wcc-alerts');
        nodes.eventCount = document.getElementById('wcc-event-count');
        nodes.eventList = document.getElementById('wcc-event-list');
        nodes.sidebar = document.querySelector('.wcc-sidebar');
        nodes.status = document.getElementById('wcc-status');
        nodes.schedule = document.getElementById('wcc-schedule');
        nodes.tabs = Array.from(document.querySelectorAll('.wcc-tab'));
        nodes.jsBuild = document.getElementById('wcc-js-build');

        if (nodes.jsBuild) {
            nodes.jsBuild.textContent = 'JS ' + (config.assetVersion || SCRIPT_BUILD);
        }

        bindEvents();
        startClock();
        loadInitialData();
    }

    function bindEvents() {
        if (nodes.debugReset) {
            nodes.debugReset.addEventListener('click', function () {
                state.debugOffsetSeconds = 0;
                state.debugPlaying = false;
                state.debugLastTick = null;
                render();
                restartClock();
            });
        }

        if (nodes.debugPlay) {
            nodes.debugPlay.addEventListener('click', function () {
                state.debugPlaying = !state.debugPlaying;
                state.debugLastTick = Date.now();
                render();
                restartClock();
            });
        }

        if (nodes.debugRate) {
            nodes.debugRate.addEventListener('input', function () {
                state.debugRate = Number(nodes.debugRate.value || 1);
                render();
                restartClock();
            });
        }

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && state.view === 'companion') {
                updateDebugPlayback();
                render();
                restartClock();
            }
        });

        nodes.debugJumps.forEach(function (button) {
            button.addEventListener('click', function () {
                jumpDebugTime(parseInt(button.dataset.debugJump || '0', 10) || 0);
            });
        });

        if (nodes.debugStart) {
            nodes.debugStart.addEventListener('click', function () {
                setDebugTimeToWordCampStart();
            });
        }

        if (nodes.eventSelect) {
            nodes.eventSelect.addEventListener('change', function (event) {
                if (state.page === 'plan-selector') {
                    const selectedEvent = getEventByUrl(event.target.value);
                    if (selectedEvent) {
                        window.location.href = getPlanYourDayUrl(selectedEvent);
                    }
                    return;
                }

                selectEvent(event.target.value);
            });
        }

        if (nodes.notesEventSelect) {
            nodes.notesEventSelect.addEventListener('change', function (event) {
                selectNotesEvent(event.target.value);
            });
        }

        if (nodes.refreshEvents) {
            nodes.refreshEvents.addEventListener('click', function () {
                loadEvents(true);
            });
        }

        if (nodes.refreshSchedule) {
            nodes.refreshSchedule.addEventListener('click', function () {
                loadSchedule(true, state.view === 'schedule' ? 'full' : 'companion');
            });
        }

        if (nodes.changeEvent && nodes.changeEvent.tagName.toLowerCase() === 'button') {
            nodes.changeEvent.addEventListener('click', function () {
                state.pickerOpen = true;
                render();
                window.setTimeout(function () {
                    if (nodes.eventSelect) {
                        nodes.eventSelect.focus();
                    }
                }, 0);
            });
        }

        if (nodes.companionVisibility) {
            nodes.companionVisibility.addEventListener('click', function () {
                const event = getSelectedEvent();
                if (!event) {
                    return;
                }

                setEventCompanionVisibility(event, !isEventShownInCompanion(event));
            });
        }

        if (nodes.settingsSave) {
            nodes.settingsSave.addEventListener('click', function () {
                saveSettings({
                    show_debug_clock: Boolean(nodes.settingsDebugClock && nodes.settingsDebugClock.checked),
                });
            });
        }

        if (nodes.settingsDebugClock) {
            nodes.settingsDebugClock.addEventListener('change', function () {
                state.settingsDraft = {
                    show_debug_clock: Boolean(nodes.settingsDebugClock.checked),
                };
                state.settingsSaved = false;
                if (nodes.settingsStatus) {
                    nodes.settingsStatus.textContent = '';
                }
            });
        }

        nodes.tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                state.view = tab.dataset.view || 'schedule';
                render();
                if (state.view === 'schedule' && state.schedule && state.schedule.mode !== 'full') {
                    loadSchedule(false, 'full');
                }
            });
        });
    }

    function isEditingNotes() {
        const active = document.activeElement;

        return Boolean(active && active.classList && active.classList.contains('wcc-note-editor'));
    }

    async function loadInitialData() {
        const requestedSlug = getRequestedWordcampSlug();
        const needsEvents = state.page === 'plan' || state.page === 'plan-selector';

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

            if (requestedSlug) {
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
                    state.schedule = buildLocalCompanionSchedule();
                    resetCompanionAnimationState();
                } else {
                    await loadSchedule(false, state.view === 'schedule' ? 'full' : 'companion');
                }
            }
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
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
            state.alert = { type: 'error', message: error.message };
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

        state.selectedEventUrl = eventUrl;
        state.schedule = null;
        state.loadedGapKeys = {};
        resetCompanionAnimationState();
        state.savingEvent = true;
        state.alert = null;
        render();

        try {
            state.plan = normalizePlan(await api('plan/event', {
                method: 'POST',
                body: { event: event },
            }));
            state.pickerOpen = false;
            if (state.view === 'companion') {
                state.schedule = buildLocalCompanionSchedule();
                resetCompanionAnimationState();
                if (shouldLoadInitialCompanionGaps()) {
                    loadInitialCompanionGaps();
                }
            } else {
                await loadSchedule(false, state.view === 'schedule' ? 'full' : 'companion');
            }
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.savingEvent = false;
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
            state.alert = { type: 'error', message: error.message };
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
        if (mode === 'companion') {
            state.schedule = buildLocalCompanionSchedule();
            state.loadedGapKeys = {};
            state.loadingSchedule = false;
            state.alert = null;
            render();
            return;
        }

        state.loadingSchedule = true;
        state.alert = null;
        render();

        try {
            state.schedule = await api(mode === 'full' ? 'schedule' : 'companion', {
                query: {
                    event_url: state.selectedEventUrl,
                    refresh: refresh ? '1' : '0',
                },
            });
            syncSelectedEventScheduleMetadata(state.schedule);
            state.loadingGapKey = '';
            state.loadedGapKeys = {};
            state.openGapKey = '';
            resetCompanionAnimationState();
        } catch (error) {
            state.schedule = null;
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.loadingSchedule = false;
            render();
        }
    }

    function buildLocalCompanionSchedule() {
        const event = getSelectedEvent();
        const selectedPlan = getSelectedPlan();
        const savedPosts = selectedPlan && Array.isArray(selectedPlan.saved_sessions) ? selectedPlan.saved_sessions : [];
        const sessions = savedPosts.map(savedSessionPostToSession).filter(function (session) {
            return session.id && session.start;
        });
        const days = getLocalCompanionDays(event, sessions);

        return {
            event_url: state.selectedEventUrl,
            event: event,
            site_name: event && event.site_name ? event.site_name : '',
            timezone: event && (event.schedule_timezone || event.timezone) ? (event.schedule_timezone || event.timezone) : '',
            days: days,
            gaps: [],
            gaps_loaded: false,
            sessions: sessions.sort(compareSessions),
            mode: 'companion',
            local: true,
            fetched_at: Math.floor(Date.now() / 1000),
        };
    }

    function savedSessionPostToSession(post) {
        return {
            id: Number(post.session_id || 0),
            post_id: Number(post.post_id || 0),
            title: post.title || 'Untitled session',
            url: post.url || '',
            start: Number(post.start || 0),
            end: Number(post.end || 0) || null,
            duration: Number(post.duration || 0),
            type: post.type || '',
            speaker_names: Array.isArray(post.speaker_names) ? post.speaker_names : [],
            track_names: Array.isArray(post.track_names) ? post.track_names : [],
            category_names: Array.isArray(post.category_names) ? post.category_names : [],
            notes: post.notes || '',
        };
    }

    function getLocalCompanionDays(event, sessions) {
        const timeZone = getValidTimeZone(event && (event.schedule_timezone || event.timezone) ? (event.schedule_timezone || event.timezone) : '');
        const days = {};
        const storedDays = event && event.schedule_days && typeof event.schedule_days === 'object' ? event.schedule_days : {};

        Object.keys(storedDays).forEach(function (dayKey) {
            const day = storedDays[dayKey];
            const start = Number(day && day.start || 0);
            const end = Number(day && day.end || start);

            if (start) {
                days[dayKey] = { key: dayKey, start: start, end: end || start };
            }
        });

        if (!Object.keys(days).length && event && event.start && sessions && sessions.length) {
            const eventStart = Number(event.start || 0);
            const eventEnd = Number(event.end || eventStart);
            const startDayKey = getDateKey(eventStart, timeZone);
            const endDayKey = eventEnd ? getDateKey(eventEnd, timeZone) : startDayKey;

            if (eventStart) {
                days[startDayKey] = {
                    key: startDayKey,
                    start: eventStart,
                    end: startDayKey === endDayKey && eventEnd ? eventEnd : eventStart,
                };
            }

            if (eventEnd && endDayKey !== startDayKey) {
                days[endDayKey] = {
                    key: endDayKey,
                    start: eventEnd,
                    end: eventEnd,
                };
            }
        }

        const storedDayKeys = new Set(Object.keys(days));

        (sessions || []).forEach(function (session) {
            const start = Number(session.start || 0);
            const end = Number(session.end || start);
            if (!start) {
                return;
            }

            const dayKey = getDateKey(start, timeZone);
            const inferredStart = storedDayKeys.has(dayKey) ? start : Math.max(0, start - 2 * 60 * 60);
            if (!days[dayKey]) {
                days[dayKey] = { key: dayKey, start: inferredStart, end: end || start };
                return;
            }

            if (!storedDayKeys.has(dayKey)) {
                days[dayKey].start = Math.min(days[dayKey].start, inferredStart);
            }
            days[dayKey].end = Math.max(days[dayKey].end || days[dayKey].start, end || start);
        });

        return Object.keys(days).sort().reduce(function (sorted, dayKey) {
            sorted[dayKey] = days[dayKey];
            return sorted;
        }, {});
    }

    function syncSelectedEventScheduleMetadata(data) {
        if (!data || !state.selectedEventUrl) {
            return;
        }

        const selectedPlan = ensureSelectedPlan();
        const event = selectedPlan.event && typeof selectedPlan.event === 'object'
            ? selectedPlan.event
            : { event_url: state.selectedEventUrl };

        event.event_url = state.selectedEventUrl;

        if (data.days && typeof data.days === 'object') {
            event.schedule_days = data.days;
        }

        if (data.timezone) {
            event.schedule_timezone = data.timezone;
        }

        if (data.site_name) {
            event.site_name = data.site_name;
        }

        selectedPlan.event = event;

        if (state.schedule && state.schedule.event && state.schedule.event.event_url === state.selectedEventUrl) {
            state.schedule.event = Object.assign({}, state.schedule.event, {
                schedule_days: event.schedule_days || state.schedule.event.schedule_days,
                schedule_timezone: event.schedule_timezone || state.schedule.event.schedule_timezone,
                site_name: event.site_name || state.schedule.event.site_name,
            });
        }
    }

    async function loadGapCandidates(gap) {
        const gapKey = getGapKey(gap);
        if (!state.selectedEventUrl || !state.schedule || isGapLoaded(gapKey) || state.loadingGapKey) {
            return;
        }

        state.loadingGapKey = gapKey;
        render();

        try {
            const data = await api('gap-candidates', {
                query: {
                    event_url: state.selectedEventUrl,
                    refresh: '0',
                    day_key: gap.dayKey || gap.day_key || '',
                    start: String(Number(gap.start || 0)),
                    end: String(Number(gap.end || 0)),
                },
            });
            syncSelectedEventScheduleMetadata(data);
            mergeLoadedGapCandidates(gapKey, Array.isArray(data.gaps) ? data.gaps : []);
            state.schedule.days = Object.assign({}, state.schedule.days || {}, data.days || {});
            if (Array.isArray(data.tracks) && data.tracks.length) {
                state.schedule.tracks = data.tracks;
            }
            state.loadedGapKeys[gapKey] = true;
            state.alert = null;
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
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
        render();

        try {
            const data = await api('gap-candidates', {
                query: {
                    event_url: state.selectedEventUrl,
                    refresh: '0',
                },
            });
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
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.loadingInitialGaps = false;
            render();
        }
    }

    function mergeLoadedGapCandidates(requestedGapKey, gaps) {
        const existingGaps = state.schedule && Array.isArray(state.schedule.gaps) ? state.schedule.gaps : [];
        const nextGaps = existingGaps.filter(function (gap) {
            return getGapKey(gap) !== requestedGapKey;
        });

        gaps.forEach(function (gap) {
            if (getGapKey(gap) === requestedGapKey && hasGapCandidates(gap)) {
                nextGaps.push(gap);
            }
        });

        state.schedule.gaps = nextGaps;
    }

    async function toggleSession(sessionId) {
        if (!state.selectedEventUrl || state.savingSessionId) {
            return;
        }

        const savedIds = getSavedSessionIds();
        const wasSaved = savedIds.has(sessionId);
        const localSession = findLocalSession(sessionId);
        const savedPost = getSavedSessionPost(sessionId);

        state.savingSessionId = sessionId;
        render();

        try {
            if (wasSaved) {
                if (!savedPost || !savedPost.post_id) {
                    throw new Error('Saved session post was not found.');
                }

                await deleteSavedSessionPost(savedPost.post_id);
                removeSavedSessionPost(sessionId);
            } else {
                if (!localSession) {
                    throw new Error('Session details were not found.');
                }

                const createdPost = await createSavedSessionPost(localSession);
                addSavedSessionPost(normalizeSavedSessionPost(createdPost, localSession));
            }

            state.alert = null;
            if (state.schedule && state.schedule.mode === 'companion') {
                state.schedule = buildLocalCompanionSchedule();
                state.loadedGapKeys = {};
                state.openGapKey = '';
                resetCompanionAnimationState();
            }
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.savingSessionId = null;
            render();
        }
    }

    async function saveSessionNotes(postId, notes) {
        postId = Number(postId || 0);
        if (!postId || state.savingNotePostId) {
            return;
        }

        state.savingNotePostId = postId;
        state.alert = null;
        render();

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
            delete state.noteDrafts[postId];
            state.alert = null;
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.savingNotePostId = null;
            render();
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
                state.debugLastTick = null;
            }

            state.settingsSaved = true;
            state.settingsDraft = null;
            state.alert = null;
            restartClock();
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.savingSettings = false;
            render();
        }
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

        const response = await fetch(url.toString(), fetchOptions);
        const data = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throw new Error(data.message || response.statusText || 'Request failed.');
        }

        return data;
    }

    function render() {
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
            renderSchedule();
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
        nodes.debugRateLabel.textContent = state.debugRate + 'x';
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

        const alert = element('div', {
            className: 'wcc-alert' + (state.alert.type === 'error' ? ' is-error' : ''),
            text: state.alert.message,
        });
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
            summary.push(conflictCount + ' alternative' + (conflictCount === 1 ? '' : 's'));
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
            window.location.href = getPlanYourDayUrl(event);
            return;
        }

        selectEvent(event.event_url);
    }

    function createEventCompanionToggle(event) {
        const button = element('button', {
            className: 'wcc-event-companion-toggle',
            type: 'button',
        });

        renderCompanionVisibilityButton(button, event);
        button.addEventListener('click', function () {
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
        button.textContent = isSaving ? 'Saving...' : (isShown ? 'Attending' : 'Attend');
        button.disabled = isSaving;
        button.setAttribute('aria-pressed', isShown ? 'true' : 'false');
        button.setAttribute('aria-label', (isShown ? 'Stop attending: ' : 'Attend: ') + getEventTitle(event));
    }

    function renderTabs() {
        nodes.tabs.forEach(function (tab) {
            const isActive = tab.dataset.view === state.view;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function renderSchedule() {
        if (!nodes.status || !nodes.schedule) {
            return;
        }

        try {
            renderScheduleContent();
        } catch (error) {
            renderCompanionRenderError(error);
        }
    }

    function renderScheduleContent() {
        nodes.status.textContent = '';
        nodes.schedule.replaceChildren();

        if (state.page === 'notes') {
            renderNotesPage();
            return;
        }

        if (!state.selectedEventUrl) {
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
            nodes.status.textContent = 'Loading schedule...';
            return;
        }

        if (state.page === 'companion' && state.loadingInitialGaps && getSavedSessionIds().size === 0) {
            nodes.status.textContent = 'Loading session choices...';
            nodes.schedule.append(element('div', { className: 'wcc-empty', text: 'Loading session choices...' }));
            return;
        }

        if (!state.schedule) {
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
            renderCompanion();
            return;
        }

        if (state.view === 'schedule' && state.schedule.mode !== 'full') {
            nodes.status.textContent = 'Loading full schedule...';
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
                    text: group.sessions.length + ' session' + (group.sessions.length === 1 ? '' : 's'),
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
        const section = element('section', { className: 'wcc-notes-export' });
        const header = element('div', { className: 'wcc-notes-export-header' });
        const title = element('div', { className: 'wcc-notes-export-title' });
        const actions = element('div', { className: 'wcc-notes-export-actions' });
        const output = element('textarea', {
            className: 'wcc-notes-output',
            readonly: 'readonly',
            rows: notedCount ? '8' : '3',
        });
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
            element('strong', { text: 'Session notes' }),
            element('span', { text: notedCount + ' with notes / ' + sessions.length + ' saved' })
        );
        output.value = markdown;

        copyButton.addEventListener('click', function () {
            copyNotesMarkdown(markdown);
        });
        downloadButton.addEventListener('click', function () {
            downloadNotesMarkdown(markdown);
        });

        actions.append(copyButton, downloadButton);
        header.append(title, actions);
        section.append(header, output);

        return section;
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

        const selectedPlan = getSelectedPlan();
        const savedPosts = selectedPlan && Array.isArray(selectedPlan.saved_sessions) ? selectedPlan.saved_sessions : [];
        const sessions = savedPosts.map(savedSessionPostToSession).filter(function (session) {
            return session.id && session.start;
        }).sort(compareSessions);

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
                    text: group.sessions.length + ' session' + (group.sessions.length === 1 ? '' : 's'),
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
                    text: tracks.length + ' track' + (tracks.length === 1 ? '' : 's'),
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

        if (session.speaker_names && session.speaker_names.length) {
            card.append(element('div', { className: 'wcc-session-speakers', text: session.speaker_names.join(', ') }));
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

    function renderCompanion() {
        const timeline = buildCompanionTimeline();
        const now = getNow();
        const visibleSteps = getAnimatedCompanionSteps(timeline.steps, now);

        if (!visibleSteps.length) {
            nodes.schedule.append(element('div', {
                className: 'wcc-empty',
                text: timeline.steps.length ? 'WordCamp complete.' : 'No companion steps.',
            }));
            return;
        }

        const wrapper = element('div', { className: 'wcc-companion' });
        wrapper.append(renderCompanionTopLink());

        getRenderableCompanionSteps(visibleSteps).forEach(function (step, index) {
            wrapper.append(renderCompanionStep(step, now, index));
        });

        nodes.schedule.append(wrapper);
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
                        text: 'Upcoming WordCamps',
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
            return step.type === 'session' || step.type === 'choice';
        });
        let limit = Math.min(defaultLimit, visibleSteps.length);

        if (sessionIndex === -1 || sessionIndex >= limit) {
            return visibleSteps.slice(0, limit);
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

        return visibleSteps.slice(0, limit);
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
        if (companionExitTimer) {
            return;
        }

        companionExitTimer = window.setTimeout(function () {
            companionExitTimer = null;
            render();
        }, 700);
    }

    function resetCompanionAnimationState() {
        state.companionVisibleStepKeys = null;
        state.exitingCompanionStepKeys = {};

        if (companionExitTimer) {
            window.clearTimeout(companionExitTimer);
            companionExitTimer = null;
        }
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

    function renderCompanionTopLink() {
        const wrapper = element('div', { className: 'wcc-companion-top' });
        const selectedEvent = getSelectedEvent();
        const events = getAttendingEvents();
        const switcher = element('label', { className: 'wcc-companion-switcher' });
        const select = element('select', { 'aria-label': 'Switch WordCamp' });
        const planButton = element('a', {
            className: 'wcc-plan-link',
            href: getPlanYourDayUrl(selectedEvent),
            text: 'Plan your day',
        });
        const addButton = element('a', {
            className: 'wcc-plan-link',
            href: getPlanYourDayUrl(null),
            text: 'Upcoming WordCamps',
        });

        if (!events.length) {
            select.append(element('option', { value: '', text: state.loadingEvents ? 'Loading...' : 'No WordCamps yet' }));
            select.disabled = true;
        } else {
            events.forEach(function (event) {
                select.append(element('option', {
                    value: event.event_url,
                    text: event.title || event.location || event.event_url,
                }));
            });
            select.value = state.selectedEventUrl || '';
            select.disabled = state.loadingEvents || state.savingEvent;
        }

        select.addEventListener('change', function () {
            selectEvent(select.value);
        });

        switcher.append(select);
        wrapper.append(switcher);
        wrapper.append(planButton);
        wrapper.append(addButton);

        return wrapper;
    }

    function renderCompanionStep(step, now, index) {
        const isCurrent = isCompanionStepCurrent(step, now);
        const isGap = step.type === 'gap';
        const item = element('article', {
            className: [
                'wcc-companion-step',
                'is-' + step.type,
                index === 0 ? 'is-primary' : '',
                isCurrent ? 'is-current' : '',
                step.exiting ? 'is-exiting' : '',
                index === 0 && !isCurrent ? 'is-next' : '',
                step.final ? 'is-final' : '',
            ].filter(Boolean).join(' '),
        });
        const timeZone = getSelectedTimezone();
        const timeLabel = formatCompanionStepTime(step, timeZone);
        const label = getCompanionStepLabel(step, now, index, timeLabel);
        const marker = element('div', { className: 'wcc-companion-marker' });
        const body = element('div', { className: 'wcc-companion-body' });

        if (isCurrent && step.type === 'session') {
            item.style.setProperty('--wcc-step-progress', getCompanionStepProgress(step, now) + '%');
        }

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

        if (step.session && step.session.speaker_names && step.session.speaker_names.length) {
            body.append(element('div', { className: 'wcc-companion-speakers', text: step.session.speaker_names.join(', ') }));
        }

        if (step.type === 'choice') {
            body.append(renderCompanionChoices(step.alternatives || [], timeZone));
        }

        if (step.type === 'gap') {
            body.append(renderGapPicker(step));
        }

        const timing = formatCompanionTiming(step, now, timeZone, index);
        if (timing && !isGap) {
            body.append(element('div', { className: 'wcc-companion-timing', text: timing }));
        }

        item.append(marker, body);

        return item;
    }

    function getCompanionStepProgress(step, now) {
        const start = Number(step && step.start || 0);
        const end = Number(step && (step.end || step.start) || 0);

        if (!start || !end || end <= start) {
            return 0;
        }

        return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 1000) / 10));
    }

    function renderCompanionChoices(alternatives, timeZone) {
        const wrapper = element('div', { className: 'wcc-choice-list' });

        alternatives.forEach(function (session) {
            const item = element('article', { className: 'wcc-choice-item' });
            const heading = element('div', { className: 'wcc-choice-heading' });
            const meta = [getPrimaryTrack(session), formatSessionTime(session, timeZone)].filter(Boolean);

            heading.append(
                element('strong', { text: session.title || 'Untitled session' }),
                renderCompanionRemoveButton(session)
            );
            item.append(heading);

            if (session.speaker_names && session.speaker_names.length) {
                meta.push(session.speaker_names.join(', '));
            }

            if (meta.length) {
                item.append(element('span', { text: meta.join(' / ') }));
            }

            wrapper.append(item);
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

    async function createSavedSessionPost(session) {
        const selectedPlan = ensureSelectedPlan();
        const termId = Number(selectedPlan.wordcamp_term_id || state.plan.selected_wordcamp_term_id || 0);
        const body = {
            title: session.title || 'Untitled session',
            status: 'publish',
            meta: buildSavedSessionMeta(session, termId),
        };
        const taxonomyRestBase = config.wordcampTaxonomyRestBase || 'wordcamp-companion-wordcamps';

        if (termId) {
            body[taxonomyRestBase] = [termId];
        }

        return wpApi(config.savedSessionRestBase || 'wordcamp-companion-sessions', {
            method: 'POST',
            body: body,
        });
    }

    async function deleteSavedSessionPost(postId) {
        return wpApi((config.savedSessionRestBase || 'wordcamp-companion-sessions') + '/' + Number(postId), {
            method: 'DELETE',
            query: { force: 'true' },
        });
    }

    function buildSavedSessionMeta(session, termId) {
        return {
            wcc_event_url: state.selectedEventUrl,
            wcc_wordcamp_term_id: termId,
            wcc_session_id: Number(session.id || 0),
            wcc_session_url: session.url || '',
            wcc_session_start: Number(session.start || 0),
            wcc_session_end: Number(session.end || 0),
            wcc_session_duration: Number(session.duration || 0),
            wcc_session_type: session.type || '',
            wcc_speaker_names: listToMeta(session.speaker_names),
            wcc_track_names: listToMeta(session.track_names),
            wcc_category_names: listToMeta(session.category_names),
            wcc_session_snapshot: JSON.stringify(session),
            wcc_session_notes: session.notes || '',
        };
    }

    function listToMeta(values) {
        return (Array.isArray(values) ? values : []).join('\n');
    }

    function normalizeSavedSessionPost(post, fallbackSession) {
        const meta = post && post.meta && typeof post.meta === 'object' ? post.meta : {};
        const fallback = fallbackSession || {};
        const title = post && post.title && typeof post.title === 'object'
            ? (post.title.raw || post.title.rendered || fallback.title || '')
            : (fallback.title || '');

        return {
            post_id: Number(post && post.id || 0),
            session_id: Number(meta.wcc_session_id || fallback.id || 0),
            event_url: meta.wcc_event_url || state.selectedEventUrl,
            title: title,
            url: meta.wcc_session_url || fallback.url || '',
            start: Number(meta.wcc_session_start || fallback.start || 0),
            end: Number(meta.wcc_session_end || fallback.end || 0),
            duration: Number(meta.wcc_session_duration || fallback.duration || 0),
            type: meta.wcc_session_type || fallback.type || '',
            speaker_names: metaToList(meta.wcc_speaker_names, fallback.speaker_names),
            track_names: metaToList(meta.wcc_track_names, fallback.track_names),
            category_names: metaToList(meta.wcc_category_names, fallback.category_names),
            notes: typeof meta.wcc_session_notes === 'string' ? meta.wcc_session_notes : (fallback.notes || ''),
            updated_at: Math.floor(Date.now() / 1000),
        };
    }

    function metaToList(value, fallback) {
        if (typeof value !== 'string' || !value) {
            return Array.isArray(fallback) ? fallback : [];
        }

        return value.split(/\r\n|\r|\n/).filter(Boolean);
    }

    function findLocalSession(sessionId) {
        const id = Number(sessionId);
        const sessions = state.schedule && Array.isArray(state.schedule.sessions) ? state.schedule.sessions : [];
        const existing = sessions.find(function (session) {
            return Number(session.id) === id;
        });

        if (existing) {
            return existing;
        }

        const gaps = state.schedule && Array.isArray(state.schedule.gaps) ? state.schedule.gaps : [];
        for (let gapIndex = 0; gapIndex < gaps.length; gapIndex++) {
            const candidates = Array.isArray(gaps[gapIndex].candidates) ? gaps[gapIndex].candidates : [];
            const candidate = candidates.find(function (session) {
                return Number(session.id) === id;
            });

            if (candidate) {
                return candidate;
            }
        }

        return null;
    }

    function getCompanionStepLabel(step, now, index, timeLabel) {
        if (isCompanionStepCurrent(step, now)) {
            return 'Now';
        }

        if (step.start && now < step.start) {
            return formatUpcomingStepLabel(step.start, now, getSelectedTimezone());
        }

        if (index === 0) {
            return 'Next at ' + timeLabel;
        }

        return timeLabel;
    }

    function formatUpcomingStepLabel(start, now, timeZone) {
        const dayDistance = getCalendarDayDistance(start, now, timeZone);
        const time = formatTimeOnly(start, timeZone);
        const relative = dayDistance > 1 ? 'In ' + dayDistance + ' days' : 'In ' + formatDurationWords(start - now);

        if (dayDistance === 0) {
            return relative + ' - today at ' + time;
        }

        if (dayDistance === 1) {
            return 'Tomorrow at ' + time;
        }

        return relative + ' - ' + formatDate(start, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
        }, timeZone);
    }

    function buildCompanionTimeline() {
        if (!state.schedule || !Array.isArray(state.schedule.sessions)) {
            return { steps: [], hasSavedSessions: false };
        }

        const savedIds = getSavedSessionIds();
        const allSessions = state.schedule.sessions.filter(function (session) {
            return session.start;
        }).sort(compareSessions);
        const savedSessions = allSessions.filter(function (session) {
            return savedIds.has(session.id);
        });
        const savedRealSessions = savedSessions.filter(function (session) {
            return session.type !== 'custom';
        });
        const plannedSessions = allSessions.filter(function (session) {
            return savedIds.has(session.id) || session.auto;
        }).filter(function (session) {
            return session.type !== 'custom' || !sessionOverlapsAny(session, savedRealSessions, true);
        });
        const sourceSessions = savedSessions.length ? plannedSessions : allSessions;
        const event = getSelectedEvent();
        const timeZone = getSelectedTimezone();
        const steps = [];
        const scheduleDayKeys = getScheduleDayKeys();
        const dayGroups = getCompanionDayGroups(sourceSessions, timeZone, scheduleDayKeys);

        dayGroups.forEach(function (group, dayIndex) {
            const daySessions = group.sessions.filter(function (session) {
                return session.start;
            }).sort(compareSessions);
            const scheduleDayIndex = scheduleDayKeys.indexOf(group.key);
            const dayNumber = scheduleDayIndex >= 0 ? scheduleDayIndex + 1 : dayIndex + 1;
            const dayStartFromSchedule = getDayStart(group.key);
            const dayEndFromSchedule = getKnownDayEnd(group.key, daySessions);

            if (!daySessions.length) {
                if (dayStartFromSchedule && dayEndFromSchedule) {
                    steps.push({
                        type: 'arrival',
                        dayKey: group.key,
                        start: dayStartFromSchedule,
                        end: Math.min(dayEndFromSchedule, dayStartFromSchedule + 30 * 60),
                        dayStart: dayStartFromSchedule,
                        title: dayIndex === 0 ? 'Arrive at ' + getEventTitle(event) : 'Arrive for Day ' + dayNumber,
                        detail: getEventAddress(event),
                        meta: group.label,
                        mapLinks: getEventMapLinks(event),
                    });

                    getEmptyDayGapsForDay(group.key, dayStartFromSchedule, dayEndFromSchedule).forEach(function (gap) {
                        steps.push({
                            type: 'gap',
                            dayKey: group.key,
                            start: gap.start,
                            end: gap.end,
                            title: 'Add a session',
                            detail: '',
                            meta: formatSessionTime(gap, timeZone),
                            candidates: gap.candidates || [],
                        });
                    });

                    const isFinalEmptyDay = scheduleDayKeys.length
                        ? scheduleDayIndex === scheduleDayKeys.length - 1
                        : dayIndex + 1 >= dayGroups.length;

                    steps.push({
                        type: 'day-end',
                        dayKey: group.key,
                        start: dayEndFromSchedule,
                        end: dayEndFromSchedule + 30 * 60,
                        title: isFinalEmptyDay ? 'End of WordCamp' : 'End of Day ' + dayNumber,
                        detail: isFinalEmptyDay ? 'WordCamp complete.' : 'See you tomorrow.',
                        meta: group.label,
                        final: isFinalEmptyDay,
                    });
                }

                return;
            }

            const firstSession = daySessions[0];
            const dayStart = dayStartFromSchedule || Math.max(0, firstSession.start - 2 * 60 * 60);
            const arrivalStart = Math.max(dayStart, firstSession.start - 2 * 60 * 60);
            const firstTrackStart = Math.max(arrivalStart, firstSession.start - 10 * 60);
            steps.push({
                type: 'arrival',
                dayKey: group.key,
                start: arrivalStart,
                end: firstTrackStart,
                dayStart: dayStart,
                title: dayIndex === 0 ? 'Arrive at ' + getEventTitle(event) : 'Arrive for Day ' + dayNumber,
                detail: getEventAddress(event),
                meta: group.label,
                mapLinks: getEventMapLinks(event),
            });

            if (!savedSessions.length) {
                const plannedDayEnd = daySessions.reduce(function (latest, session) {
                    const sessionEnd = session.end || session.start;

                    return sessionEnd > latest ? sessionEnd : latest;
                }, 0);
                const dayEnd = dayEndFromSchedule || plannedDayEnd;

                if (dayEnd) {
                    getEmptyDayGapsForDay(group.key, dayStart, dayEnd).forEach(function (gap) {
                        steps.push({
                            type: 'gap',
                            dayKey: group.key,
                            start: gap.start,
                            end: gap.end,
                            title: 'Add a session',
                            detail: '',
                            meta: formatSessionTime(gap, timeZone),
                            candidates: gap.candidates || [],
                        });
                    });

                    const isFinalDay = scheduleDayKeys.length
                        ? scheduleDayIndex === scheduleDayKeys.length - 1
                        : dayIndex + 1 >= dayGroups.length;

                    steps.push({
                        type: 'day-end',
                        dayKey: group.key,
                        start: dayEnd,
                        end: dayEnd + 30 * 60,
                        title: isFinalDay ? 'End of WordCamp' : 'End of Day ' + dayNumber,
                        detail: isFinalDay ? 'WordCamp complete.' : 'See you tomorrow.',
                        meta: group.label,
                        final: isFinalDay,
                    });
                }

                return;
            }

            let currentTrack = '';
            let occupiedUntil = firstTrackStart;
            getCompanionSessionBlocks(daySessions).forEach(function (block) {
                if (block.type === 'break') {
                    steps.push({
                        type: 'break',
                        dayKey: group.key,
                        start: block.start,
                        end: block.end,
                        title: block.session.title || 'Break',
                        detail: '',
                        meta: formatSessionTime(block.session, timeZone),
                        session: block.session,
                    });
                    occupiedUntil = Math.max(occupiedUntil, block.end || block.start || 0);
                    return;
                }

                if (block.type === 'choice') {
                    const choiceWindow = getTrackChangeWindow(block.start, occupiedUntil);

                    if (choiceWindow) {
                        steps.push({
                            type: 'track',
                            dayKey: group.key,
                            start: choiceWindow.start,
                            end: choiceWindow.end,
                            title: 'Choose where to go',
                            detail: getChoiceTrackSummary(block.sessions),
                            meta: '',
                        });
                    }
                    steps.push({
                        type: 'choice',
                        dayKey: group.key,
                        start: block.start,
                        end: block.end,
                        title: 'Choose one session',
                        detail: '',
                        meta: formatSessionTime(block, timeZone),
                        alternatives: block.sessions,
                    });
                    currentTrack = '';
                    occupiedUntil = Math.max(occupiedUntil, block.end || block.start || 0);
                    return;
                }

                const session = block.session;
                const track = getPrimaryTrack(session);
                const overlapWarning = getSessionOverlapWarning(session, daySessions, timeZone);
                let warningShownOnTrack = false;

                if (track && track !== currentTrack) {
                    const trackWindow = getTrackChangeWindow(session.start, occupiedUntil);

                    if (trackWindow) {
                        steps.push({
                            type: 'track',
                            dayKey: group.key,
                            start: trackWindow.start,
                            end: trackWindow.end,
                            title: currentTrack ? 'Switch to ' + track : 'Go to ' + track,
                            detail: '',
                            meta: '',
                            warning: overlapWarning,
                        });
                        warningShownOnTrack = Boolean(overlapWarning);
                    }
                    currentTrack = track;
                }

                const sessionEnd = session.end || session.start + Math.max(0, Number(session.duration || 0));
                steps.push({
                    type: 'session',
                    dayKey: group.key,
                    start: session.start,
                    end: sessionEnd,
                    title: session.title || 'Untitled session',
                    detail: getPrimaryTrack(session),
                    meta: formatSessionTime(session, timeZone),
                    session: session,
                    warning: warningShownOnTrack ? '' : overlapWarning,
                });
                occupiedUntil = Math.max(occupiedUntil, sessionEnd || session.start || 0);
            });

            const gaps = getCompanionGapsForDay(daySessions, savedIds, group.key);

            gaps.forEach(function (gap) {
                steps.push({
                    type: 'gap',
                    dayKey: group.key,
                    start: gap.start,
                    end: gap.end,
                    title: 'Add a session',
                    detail: '',
                    meta: formatSessionTime(gap, timeZone),
                    candidates: gap.candidates || [],
                });
            });

            const plannedDayEnd = daySessions.reduce(function (latest, session) {
                const sessionEnd = session.end || session.start;

                return sessionEnd > latest ? sessionEnd : latest;
            }, 0);
            const dayEnd = dayEndFromSchedule || plannedDayEnd;

            if (dayEnd) {
                const isFinalDay = scheduleDayKeys.length
                    ? scheduleDayIndex === scheduleDayKeys.length - 1
                    : dayIndex + 1 >= dayGroups.length;

                steps.push({
                    type: 'day-end',
                    dayKey: group.key,
                    start: dayEnd,
                    end: dayEnd + 30 * 60,
                    title: isFinalDay ? 'End of WordCamp' : 'End of Day ' + dayNumber,
                    detail: isFinalDay ? 'WordCamp complete.' : 'See you tomorrow.',
                    meta: group.label,
                    final: isFinalDay,
                });
            }
        });

        steps.sort(function (a, b) {
            if (a.start !== b.start) {
                return a.start - b.start;
            }

            return getStepSortWeight(a) - getStepSortWeight(b);
        });

        return {
            steps: steps,
            hasSavedSessions: Boolean(savedSessions.length),
        };
    }

    function getCompanionSessionBlocks(sessions) {
        const customBlocks = sessions.filter(function (session) {
            return session.type === 'custom';
        }).map(function (session) {
            return {
                type: 'break',
                start: session.start,
                end: session.end || session.start,
                session: session,
            };
        });
        const realSessions = sessions.filter(function (session) {
            return session.type !== 'custom';
        }).sort(compareSessions);
        const realBlocks = [];

        realSessions.forEach(function (session) {
            const sessionEnd = session.end || session.start;
            const lastBlock = realBlocks[realBlocks.length - 1];

            if (lastBlock && sessionHasSubstantialOverlapWithBlock(session, lastBlock)) {
                lastBlock.sessions.push(session);
                lastBlock.end = Math.max(lastBlock.end, sessionEnd);
                return;
            }

            realBlocks.push({
                type: 'real',
                start: session.start,
                end: sessionEnd,
                sessions: [session],
            });
        });

        return customBlocks.concat(realBlocks.map(function (block) {
            if (block.sessions.length === 1) {
                return {
                    type: 'session',
                    start: block.start,
                    end: block.end,
                    session: block.sessions[0],
                };
            }

            return {
                type: 'choice',
                start: block.start,
                end: block.end,
                sessions: block.sessions,
            };
        })).sort(function (a, b) {
            if (a.start !== b.start) {
                return a.start - b.start;
            }

            return a.type === 'break' ? 1 : -1;
        });
    }

    function getChoiceTrackSummary(sessions) {
        const tracks = sessions.map(getPrimaryTrack).filter(Boolean).filter(function (track, index, list) {
            return list.indexOf(track) === index;
        });

        if (!tracks.length) {
            return 'Pick one saved option.';
        }

        return 'Pick one: ' + tracks.join(' / ');
    }

    function getTrackChangeWindow(targetStart, occupiedUntil) {
        const end = Number(targetStart || 0);
        const blockedUntil = Number(occupiedUntil || 0);

        if (!end || blockedUntil > end) {
            return null;
        }

        return {
            start: Math.max(0, end - TRACK_CHANGE_LEAD_SECONDS, blockedUntil),
            end: end,
        };
    }

    function getSessionOverlapWarning(session, sessions, timeZone) {
        if (!session || session.type === 'custom' || !session.start || !session.end) {
            return '';
        }

        const sessionTrack = getPrimaryTrack(session);
        const overlaps = (sessions || []).filter(function (candidate) {
            const candidateTrack = getPrimaryTrack(candidate);

            return candidate.id !== session.id &&
                candidate.type !== 'custom' &&
                candidate.start &&
                candidate.end &&
                sessionTrack &&
                candidateTrack &&
                candidateTrack !== sessionTrack &&
                candidate.start <= session.start &&
                candidate.end > session.start &&
                sessionsOverlap(session, candidate) &&
                !sessionsSubstantiallyOverlap(session, candidate);
        }).sort(compareSessions);

        if (!overlaps.length) {
            return '';
        }

        const latestEnd = overlaps.reduce(function (latest, candidate) {
            return Math.max(latest, candidate.end || candidate.start || 0);
        }, 0);
        const longestOverlap = overlaps.reduce(function (longest, candidate) {
            return Math.max(longest, sessionsOverlapSeconds(session, candidate));
        }, 0);
        const names = overlaps.slice(0, 2).map(function (candidate) {
            return candidate.title || 'another saved session';
        });

        if (overlaps.length > 2) {
            names.push((overlaps.length - 2) + ' more');
        }

        return 'Heads up: ' + names.join(', ') + ' ' + (overlaps.length === 1 ? 'runs' : 'run') + ' until ' + formatSlotTime(latestEnd, timeZone) + ', so there is a ' + formatDuration(longestOverlap) + ' overlap.';
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
        const saveButton = element('button', {
            className: 'wcc-button wcc-note-save',
            type: 'button',
            text: state.savingNotePostId === postId ? 'Saving...' : 'Save note',
        });

        if (value || Object.prototype.hasOwnProperty.call(state.noteDrafts, postId)) {
            details.open = true;
        }

        textarea.value = value;
        textarea.addEventListener('input', function () {
            state.noteDrafts[postId] = textarea.value;
        });

        saveButton.disabled = state.savingNotePostId !== null;
        saveButton.addEventListener('click', function () {
            saveSessionNotes(postId, textarea.value);
        });

        actions.append(saveButton);
        details.append(
            element('summary', { text: persistedValue || value ? 'Notes' : 'Add notes' }),
            textarea,
            actions
        );

        return details;
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

        if (session.speaker_names && session.speaker_names.length) {
            body.append(element('div', { className: 'wcc-session-speakers', text: session.speaker_names.join(', ') }));
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

        if (session.speaker_names && session.speaker_names.length) {
            body.append(element('div', { className: 'wcc-session-speakers', text: session.speaker_names.join(', ') }));
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

    function startClock() {
        if (clockTimer) {
            return;
        }

        clockTimer = window.setTimeout(function () {
            clockTimer = null;
            updateDebugPlayback();
            if (isEditingNotes()) {
                renderDebugClock();
            } else {
                render();
            }
            startClock();
        }, getClockDelay());
    }

    function restartClock() {
        if (clockTimer) {
            window.clearTimeout(clockTimer);
            clockTimer = null;
        }

        startClock();
    }

    function getClockDelay() {
        if (isDebugClockEnabled() && state.debugPlaying) {
            return Math.max(50, Math.round(60000 / Math.max(1, state.debugRate)));
        }

        const now = new Date();
        return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    }

    function getNow() {
        return Math.floor(Date.now() / 1000) + (isDebugClockEnabled() ? state.debugOffsetSeconds : 0);
    }

    function updateDebugPlayback() {
        if (!isDebugClockEnabled() || !state.debugPlaying) {
            state.debugLastTick = null;
            return;
        }

        const currentTick = Date.now();

        if (state.debugLastTick) {
            const elapsedSeconds = (currentTick - state.debugLastTick) / 1000;
            state.debugOffsetSeconds += elapsedSeconds * Math.max(1, state.debugRate - 1);
        }

        state.debugLastTick = currentTick;
    }

    function jumpDebugTime(minutes) {
        if (!isDebugClockEnabled()) {
            return;
        }

        state.debugOffsetSeconds += minutes * 60;
        state.debugLastTick = Date.now();
        render();
    }

    async function setDebugTimeToWordCampStart() {
        if (!isDebugClockEnabled()) {
            return;
        }

        let start = getFirstCompanionStart();

        if (!start && state.selectedEventUrl && !state.loadingSchedule) {
            await loadSchedule(false, 'companion');
            start = getFirstCompanionStart();
        }

        if (!start) {
            return;
        }

        state.debugOffsetSeconds = Number(start) - 60 * 60 - Math.floor(Date.now() / 1000);
        state.debugLastTick = Date.now();
        render();
    }

    function getFirstCompanionStart() {
        const timeline = buildCompanionTimeline();
        const firstStep = timeline.steps.find(function (step) {
            return step.start;
        });

        if (!firstStep || !firstStep.start) {
            return null;
        }

        return Number(firstStep.start);
    }

    function isCompanionStepPast(step, now) {
        const end = step.end || step.start;

        return end ? now >= end : false;
    }

    function isCompanionStepCurrent(step, now) {
        const end = step.end || step.start;

        return Boolean(step.start && end && now >= step.start && now < end);
    }

    function formatCompanionTiming(step, now, timeZone, index) {
        const end = step.end || step.start;

        if (isCompanionStepCurrent(step, now) && end) {
            if (step.type === 'track') {
                return 'Be there in ' + formatHumanDuration(end - now);
            }

            if (step.type === 'session' || step.type === 'choice') {
                return 'Ends in ' + formatRelativeDuration(end - now);
            }

            return 'Until ' + formatDate(end, { hour: 'numeric', minute: '2-digit' }, timeZone);
        }

        if (step.start && now < step.start) {
            if (step.type === 'arrival') {
                return '';
            }

            if (index > 0) {
                return formatScheduledStepTiming(step);
            }

            return 'In ' + formatRelativeDuration(step.start - now);
        }

        return '';
    }

    function formatScheduledStepTiming(step) {
        const duration = step.start && step.end ? step.end - step.start : 0;

        if (step.type === 'track') {
            return duration ? formatRelativeDuration(duration) + ' before session' : 'At session start';
        }

        if (step.type === 'break' && duration) {
            return formatRelativeDuration(duration) + ' break';
        }

        if ((step.type === 'session' || step.type === 'choice') && duration) {
            return 'Duration: ' + formatDuration(duration);
        }

        if (step.type === 'day-end' && duration) {
            return 'For ' + formatRelativeDuration(duration);
        }

        if (step.type === 'arrival' && duration) {
            return formatArrivalTiming(step);
        }

        return '';
    }

    function formatArrivalTiming(step) {
        if (!step.dayStart || !step.start) {
            return 'Before the first session';
        }

        const offset = step.start - step.dayStart;
        if (offset <= 0) {
            return 'At day start';
        }

        return formatArrivalOffset(offset) + ' after start';
    }

    function formatArrivalOffset(seconds) {
        const minutes = Math.round(Math.max(0, seconds) / 60);
        const hours = Math.floor(minutes / 60);
        const remaining = minutes % 60;

        if (hours && remaining) {
            return hours + 'hr' + (hours === 1 ? '' : 's') + ' ' + remaining + 'm';
        }

        if (hours) {
            return hours + 'hr' + (hours === 1 ? '' : 's');
        }

        return Math.max(1, minutes) + 'm';
    }

    function formatCompanionStepTime(step, timeZone) {
        if (!step.start) {
            return 'TBD';
        }

        return formatDate(step.start, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
        }, timeZone);
    }

    function formatTimeOnly(timestamp, timeZone) {
        return formatDate(timestamp, { hour: 'numeric', minute: '2-digit' }, timeZone);
    }

    function formatRelativeDuration(seconds) {
        seconds = Math.max(0, Number(seconds || 0));

        const days = Math.floor(seconds / 86400);
        if (days >= 2) {
            return days + ' days';
        }

        const remaining = seconds - days * 86400;
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.ceil((remaining % 3600) / 60);

        if (days === 1) {
            return hours ? '1 day ' + hours + 'h' : '1 day';
        }

        if (hours > 0) {
            return minutes ? hours + 'h ' + minutes + 'm' : hours + 'h';
        }

        return Math.max(1, minutes) + 'm';
    }

    function formatHumanDuration(seconds) {
        seconds = Math.max(0, Number(seconds || 0));

        const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours && minutes) {
            return hours + 'hr ' + minutes + 'mins';
        }

        if (hours) {
            return hours + 'hr';
        }

        return totalMinutes + 'min' + (totalMinutes === 1 ? '' : 's');
    }

    function formatDurationWords(seconds) {
        seconds = Math.max(0, Number(seconds || 0));

        const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];

        if (days) {
            return days + ' day' + (days === 1 ? '' : 's');
        }

        if (hours) {
            parts.push(hours + ' hr' + (hours === 1 ? '' : 's'));
        }

        if (minutes || !parts.length) {
            parts.push(minutes + ' min' + (minutes === 1 ? '' : 's'));
        }

        return parts.join(' ');
    }

    function getPrimaryTrack(session) {
        if (session.track_names && session.track_names.length) {
            return session.track_names[0];
        }

        if (session.category_names && session.category_names.length) {
            return session.category_names[0];
        }

        return '';
    }

    function getTracksForSessions(sessions) {
        const tracks = [];
        const trackPositions = new Map();

        sessions.forEach(function (session) {
            const track = getPrimaryTrack(session);

            if (track && !shouldSpanTracks(session) && tracks.indexOf(track) === -1) {
                trackPositions.set(track, tracks.length);
                tracks.push(track);
            }
        });

        if (!tracks.length) {
            return ['Sessions'];
        }

        return tracks.sort(function (a, b) {
            return compareTracks(a, b, trackPositions);
        });
    }

    function compareTracks(a, b, fallbackPositions) {
        const aOrder = getScheduleTrackOrder(a);
        const bOrder = getScheduleTrackOrder(b);

        if (aOrder !== bOrder) {
            return aOrder - bOrder;
        }

        if (fallbackPositions) {
            return (fallbackPositions.get(a) || 0) - (fallbackPositions.get(b) || 0);
        }

        return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true });
    }

    function getScheduleTrackOrder(trackName) {
        const scheduleTracks = state.schedule && Array.isArray(state.schedule.tracks) ? state.schedule.tracks : [];
        const normalizedTrackName = normalizeTrackName(trackName);

        for (let index = 0; index < scheduleTracks.length; index++) {
            if (normalizeTrackName(scheduleTracks[index] && scheduleTracks[index].name) === normalizedTrackName) {
                return index;
            }
        }

        return Number.MAX_SAFE_INTEGER;
    }

    function normalizeTrackName(trackName) {
        return String(trackName || '').trim().toLowerCase();
    }

    function groupSessionsByTime(sessions) {
        const groups = new Map();

        sessions.slice().sort(compareSessions).forEach(function (session) {
            const key = String(session.start || 0);

            if (!groups.has(key)) {
                groups.set(key, { start: session.start || 0, sessions: [] });
            }

            groups.get(key).sessions.push(session);
        });

        return Array.from(groups.values()).sort(function (a, b) {
            return a.start - b.start;
        });
    }

    function groupSessionsByTrack(sessions) {
        return sessions.reduce(function (groups, session) {
            const track = getPrimaryTrack(session) || 'Sessions';

            if (!groups[track]) {
                groups[track] = [];
            }

            groups[track].push(session);

            return groups;
        }, {});
    }

    function shouldSpanTracks(session) {
        return session.type === 'custom' || !getPrimaryTrack(session);
    }

    function formatSlotTime(timestamp, timeZone) {
        if (!timestamp) {
            return 'TBD';
        }

        return formatDate(timestamp, { hour: 'numeric', minute: '2-digit' }, timeZone);
    }

    function getEventTitle(event) {
        return event && event.title ? event.title : 'WordCamp';
    }

    function getEventAddress(event) {
        if (!event) {
            return '';
        }

        const venue = event.venue && typeof event.venue === 'object' ? event.venue : {};
        const lines = [];

        [venue.name, venue.address || venue.physical_address].forEach(function (line) {
            if (line && lines.indexOf(line) === -1) {
                lines.push(line);
            }
        });

        if (!lines.length) {
            [event.location, event.country].forEach(function (line) {
                if (line && lines.indexOf(line) === -1) {
                    lines.push(line);
                }
            });
        }

        return lines.join('\n');
    }

    function getEventMapLinks(event) {
        if (!event) {
            return [];
        }

        const venue = event.venue && typeof event.venue === 'object' ? event.venue : {};
        const coordinates = venue.coordinates || event.coordinates || null;
        const latitude = coordinates && (coordinates.latitude || coordinates.lat);
        const longitude = coordinates && (coordinates.longitude || coordinates.lng || coordinates.lon);
        const query = getEventAddress(event) || event.location || getEventTitle(event);
        const encodedQuery = encodeURIComponent(query);

        if (latitude && longitude) {
            return [
                {
                    label: 'Google Maps',
                    url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(latitude + ',' + longitude),
                },
                {
                    label: 'OpenStreetMap',
                    url: 'https://www.openstreetmap.org/?mlat=' + encodeURIComponent(latitude) + '&mlon=' + encodeURIComponent(longitude) + '#map=17/' + encodeURIComponent(latitude) + '/' + encodeURIComponent(longitude),
                },
            ];
        }

        if (!encodedQuery) {
            return [];
        }

        return [
            {
                label: 'Google Maps',
                url: 'https://www.google.com/maps/search/?api=1&query=' + encodedQuery,
            },
            {
                label: 'OpenStreetMap',
                url: 'https://www.openstreetmap.org/search?query=' + encodedQuery,
            },
        ];
    }

    function getStepSortWeight(step) {
        if (step.type === 'arrival') {
            return 0;
        }

        if (step.type === 'track') {
            return 1;
        }

        return 2;
    }

    function getRenderableEvents() {
        const events = state.events.slice();
        const selectedPlan = getSelectedPlan();
        const selectedEvent = selectedPlan && selectedPlan.event ? selectedPlan.event : null;

        if (selectedEvent && selectedEvent.event_url && !events.some(function (event) {
            return event.event_url === selectedEvent.event_url;
        })) {
            events.unshift(selectedEvent);
        }

        return events;
    }

    function getAttendingEvents() {
        const events = [];
        const plans = state.plan && state.plan.plans && typeof state.plan.plans === 'object' ? state.plan.plans : {};

        Object.keys(plans).forEach(function (eventUrl) {
            const plan = plans[eventUrl] && typeof plans[eventUrl] === 'object' ? plans[eventUrl] : null;
            const event = plan && plan.event ? plan.event : null;

            if (plan && plan.show_in_companion && event && event.event_url && !events.some(function (existing) {
                return existing.event_url === event.event_url;
            })) {
                events.push(event);
            }
        });

        return events.sort(compareEvents);
    }

    function getNoteEvents() {
        const events = [];
        const plans = state.plan && state.plan.plans && typeof state.plan.plans === 'object' ? state.plan.plans : {};

        Object.keys(plans).forEach(function (eventUrl) {
            const plan = plans[eventUrl] && typeof plans[eventUrl] === 'object' ? plans[eventUrl] : null;
            const event = plan && plan.event ? plan.event : null;
            const savedSessions = plan && Array.isArray(plan.saved_sessions) ? plan.saved_sessions : [];

            if (savedSessions.length && event && event.event_url && !events.some(function (existing) {
                return existing.event_url === event.event_url;
            })) {
                events.push(event);
            }
        });

        return events.sort(compareEvents);
    }

    function getDefaultNotesEventUrl() {
        const selectedUrl = state.plan && state.plan.selected_event_url ? state.plan.selected_event_url : '';
        const events = getNoteEvents();

        if (selectedUrl && events.some(function (event) {
            return event.event_url === selectedUrl;
        })) {
            return selectedUrl;
        }

        return events.length ? events[0].event_url : '';
    }

    function getPlanForEvent(event) {
        const eventUrl = typeof event === 'string' ? event : event && event.event_url;
        const plans = state.plan && state.plan.plans && typeof state.plan.plans === 'object' ? state.plan.plans : {};

        return eventUrl && plans[eventUrl] ? plans[eventUrl] : null;
    }

    function isEventShownInCompanion(event) {
        const plan = getPlanForEvent(event);

        return Boolean(plan && plan.show_in_companion);
    }

    function getEventByUrl(eventUrl) {
        return getRenderableEvents().find(function (event) {
            return event.event_url === eventUrl;
        }) || null;
    }

    function getEventBySlug(slug) {
        slug = normalizeRouteSlug(slug);
        if (!slug) {
            return null;
        }

        return getRenderableEvents().find(function (event) {
            return getEventSlugAliases(event).indexOf(slug) !== -1;
        }) || null;
    }

    function getRequestedWordcampSlug() {
        const querySlug = new URLSearchParams(window.location.search).get('wordcamp') || '';

        return normalizeRouteSlug(config.routeWordcampSlug || querySlug);
    }

    function getEventSlug(event) {
        const words = getEventSlugWords(event);

        if (!words.length) {
            return '';
        }

        const lastWord = words[words.length - 1];
        if (words[0] === 'wordcamp' && words.length > 2 && /^\d{4}$/.test(lastWord)) {
            return words.slice(0, -1).join('') + '-' + lastWord;
        }

        return words.join('-');
    }

    function getEventSlugAliases(event) {
        const words = getEventSlugWords(event);
        const aliases = [getEventSlug(event)];

        if (words.length) {
            aliases.push(words.join('-'), words.join(''));
        }

        getEventUrlSlugAliases(event).forEach(function (alias) {
            aliases.push(alias);
        });

        return aliases.map(normalizeRouteSlug).filter(Boolean).filter(function (alias, index, list) {
            return list.indexOf(alias) === index;
        });
    }

    function getEventSlugWords(event) {
        const source = event && (event.title || event.site_name || event.location || event.event_url) ? (event.title || event.site_name || event.location || event.event_url) : '';

        return normalizeSlugSource(source).split(' ').filter(Boolean);
    }

    function getEventUrlSlugAliases(event) {
        if (!event || !event.event_url) {
            return [];
        }

        try {
            const url = new URL(event.event_url, window.location.href);
            const hostParts = url.hostname.split('.');
            const wordcampIndex = hostParts.indexOf('wordcamp');
            const subdomain = wordcampIndex > 0 ? hostParts[wordcampIndex - 1] : '';
            const year = (url.pathname.match(/\/(\d{4})(?:\/|$)/) || [])[1] || '';

            return [subdomain && year ? subdomain + '-' + year : '', subdomain && year ? 'wordcamp' + subdomain + '-' + year : ''];
        } catch (error) {
            return [];
        }
    }

    function normalizeSlugSource(source) {
        return String(source || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function normalizeRouteSlug(slug) {
        return normalizeSlugSource(slug).replace(/\s+/g, '-');
    }

    function getPlanYourDayUrl(event) {
        const base = config.planUrl || config.planBaseUrl || (config.appUrl ? config.appUrl.replace(/\/?$/, '/plan-your/') : '/wordcamp-companion/plan-your/');
        const slug = getEventSlug(event);

        if (!slug) {
            return base.replace(/\/?$/, '/');
        }

        return base.replace(/\/?$/, '/') + encodeURIComponent(slug) + '/';
    }

    function getNotesUrl() {
        return config.notesUrl || (config.appUrl ? config.appUrl.replace(/\/?$/, '/notes/') : '/wordcamp-companion/notes/');
    }

    function getSelectedEvent() {
        if (state.schedule && state.schedule.event && state.schedule.event.event_url === state.selectedEventUrl) {
            return state.schedule.event;
        }

        const selectedPlan = getSelectedPlan();
        if (selectedPlan && selectedPlan.event && selectedPlan.event.event_url === state.selectedEventUrl) {
            return selectedPlan.event;
        }

        return getEventByUrl(state.selectedEventUrl);
    }

    function getSelectedPlan() {
        if (!state.selectedEventUrl || !state.plan || !state.plan.plans) {
            return null;
        }

        return state.plan.plans[state.selectedEventUrl] || null;
    }

    function ensureSelectedPlan() {
        if (!state.selectedEventUrl) {
            return {};
        }

        if (!state.plan || typeof state.plan !== 'object') {
            state.plan = normalizePlan(null);
        }

        if (!state.plan.plans[state.selectedEventUrl]) {
            state.plan.plans[state.selectedEventUrl] = {
                event: getSelectedEvent() || { event_url: state.selectedEventUrl },
                wordcamp_term_id: state.plan.selected_wordcamp_term_id || 0,
                saved_session_ids: [],
                saved_sessions: [],
                updated_at: 0,
                show_in_companion: false,
                companion_visibility_set: false,
            };
        }

        return state.plan.plans[state.selectedEventUrl];
    }

    function getSavedSessionIds() {
        const selectedPlan = getSelectedPlan();
        const ids = selectedPlan && Array.isArray(selectedPlan.saved_session_ids) ? selectedPlan.saved_session_ids : [];

        return new Set(ids.map(function (id) {
            return Number(id);
        }).filter(function (id) {
            return id > 0;
        }));
    }

    function getSavedSessionPost(sessionId) {
        const selectedPlan = getSelectedPlan();
        const posts = selectedPlan && Array.isArray(selectedPlan.saved_sessions) ? selectedPlan.saved_sessions : [];
        const id = Number(sessionId);

        return posts.find(function (post) {
            return Number(post.session_id) === id;
        }) || null;
    }

    function getSessionNotePost(session) {
        const savedPost = getSavedSessionPost(session && session.id);
        if (savedPost) {
            return savedPost;
        }

        if (session && session.post_id) {
            return {
                post_id: Number(session.post_id),
                session_id: Number(session.id || 0),
                notes: session.notes || '',
            };
        }

        return null;
    }

    function getSessionNotes(session) {
        const notePost = getSessionNotePost(session);
        if (!notePost || !notePost.post_id) {
            return session && typeof session.notes === 'string' ? session.notes : '';
        }

        const postId = Number(notePost.post_id);
        if (Object.prototype.hasOwnProperty.call(state.noteDrafts, postId)) {
            return state.noteDrafts[postId];
        }

        return typeof notePost.notes === 'string' ? notePost.notes : '';
    }

    function updateSavedSessionNotes(postId, notes) {
        const selectedPlan = ensureSelectedPlan();
        let sessionId = 0;

        postId = Number(postId || 0);
        selectedPlan.saved_sessions = (selectedPlan.saved_sessions || []).map(function (post) {
            if (Number(post.post_id) !== postId) {
                return post;
            }

            sessionId = Number(post.session_id || 0);
            return Object.assign({}, post, {
                notes: notes,
                updated_at: Math.floor(Date.now() / 1000),
            });
        });
        state.plan.saved_session_posts = selectedPlan.saved_sessions;

        if (sessionId && state.schedule && Array.isArray(state.schedule.sessions)) {
            state.schedule.sessions = state.schedule.sessions.map(function (session) {
                return Number(session.id) === sessionId ? Object.assign({}, session, { notes: notes }) : session;
            });
        }
    }

    function addSavedSessionPost(savedPost) {
        if (!savedPost || !savedPost.session_id) {
            return;
        }

        const selectedPlan = ensureSelectedPlan();
        const posts = Array.isArray(selectedPlan.saved_sessions) ? selectedPlan.saved_sessions.slice() : [];
        const ids = new Set((selectedPlan.saved_session_ids || []).map(Number));

        selectedPlan.saved_sessions = posts.filter(function (post) {
            return Number(post.session_id) !== Number(savedPost.session_id);
        }).concat([savedPost]).sort(function (a, b) {
            return Number(a.start || 0) - Number(b.start || 0);
        });
        ids.add(Number(savedPost.session_id));
        selectedPlan.saved_session_ids = Array.from(ids).filter(Boolean);
        selectedPlan.updated_at = Math.floor(Date.now() / 1000);
        if (!selectedPlan.companion_visibility_set) {
            selectedPlan.show_in_companion = selectedPlan.saved_session_ids.length > 0;
        }
        state.plan.saved_session_posts = selectedPlan.saved_sessions;
    }

    function removeSavedSessionPost(sessionId) {
        const selectedPlan = ensureSelectedPlan();
        const id = Number(sessionId);

        selectedPlan.saved_sessions = (selectedPlan.saved_sessions || []).filter(function (post) {
            return Number(post.session_id) !== id;
        });
        selectedPlan.saved_session_ids = (selectedPlan.saved_session_ids || []).map(Number).filter(function (savedId) {
            return savedId && savedId !== id;
        });
        selectedPlan.updated_at = Math.floor(Date.now() / 1000);
        if (!selectedPlan.companion_visibility_set) {
            selectedPlan.show_in_companion = selectedPlan.saved_session_ids.length > 0;
        }
        state.plan.saved_session_posts = selectedPlan.saved_sessions;
    }

    function getSelectedTimezone() {
        const selectedEvent = getSelectedEvent();
        const scheduleTimezone = state.schedule && state.schedule.timezone ? state.schedule.timezone : '';
        const eventTimezone = selectedEvent && (selectedEvent.schedule_timezone || selectedEvent.timezone)
            ? (selectedEvent.schedule_timezone || selectedEvent.timezone)
            : '';

        return getValidTimeZone(scheduleTimezone || eventTimezone);
    }

    function getDayStart(dayKey) {
        if (!state.schedule || !state.schedule.days || !state.schedule.days[dayKey]) {
            return null;
        }

        return Number(state.schedule.days[dayKey].start || 0) || null;
    }

    function getDayEnd(dayKey) {
        if (!state.schedule || !state.schedule.days || !state.schedule.days[dayKey]) {
            return null;
        }

        return Number(state.schedule.days[dayKey].end || 0) || null;
    }

    function getKnownDayEnd(dayKey, sessions) {
        let dayEnd = getDayEnd(dayKey) || 0;

        (sessions || []).forEach(function (session) {
            dayEnd = Math.max(dayEnd, Number(session.end || session.start || 0));
        });

        getGapsForDay(dayKey).forEach(function (gap) {
            dayEnd = Math.max(dayEnd, Number(gap.end || gap.start || 0));
        });

        return dayEnd || null;
    }

    function getScheduleDayKeys() {
        if (!state.schedule || !state.schedule.days || typeof state.schedule.days !== 'object') {
            return [];
        }

        return Object.keys(state.schedule.days).sort();
    }

    function getCompanionDayGroups(sessions, timeZone, scheduleDayKeys) {
        const groups = new Map();

        scheduleDayKeys.forEach(function (dayKey) {
            const dayStart = getDayStart(dayKey);
            groups.set(dayKey, {
                key: dayKey,
                label: dayStart ? formatDate(dayStart, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                }, timeZone) : dayKey,
                sessions: [],
            });
        });

        groupSessionsByDay(sessions, timeZone).forEach(function (group) {
            if (!groups.has(group.key)) {
                groups.set(group.key, {
                    key: group.key,
                    label: group.label,
                    sessions: [],
                });
            }

            groups.get(group.key).label = group.label;
            groups.get(group.key).sessions = groups.get(group.key).sessions.concat(group.sessions);
        });

        return Array.from(groups.values()).sort(function (a, b) {
            const aStart = getDayStart(a.key) || (a.sessions[0] && a.sessions[0].start) || 0;
            const bStart = getDayStart(b.key) || (b.sessions[0] && b.sessions[0].start) || 0;

            return aStart - bStart;
        });
    }

    function getGapsForDay(dayKey) {
        if (!state.schedule || !Array.isArray(state.schedule.gaps)) {
            return [];
        }

        return state.schedule.gaps.filter(function (gap) {
            return gap.day_key === dayKey;
        });
    }

    function getCompanionGapsForDay(sessions, savedIds, dayKey) {
        return mergeLoadedGaps(getLazyGapsForDay(sessions, savedIds, dayKey), dayKey);
    }

    function getEmptyDayGapsForDay(dayKey, dayStart, dayEnd) {
        const gaps = [];
        addLazyGap(gaps, dayKey, dayStart, dayEnd);

        return mergeLoadedGaps(gaps, dayKey);
    }

    function mergeLoadedGaps(lazyGaps, dayKey) {
        if (!state.schedule) {
            return lazyGaps;
        }

        const loadedGaps = new Map();
        getGapsForDay(dayKey).forEach(function (gap) {
            loadedGaps.set(getGapKey(gap), gap);
        });

        return lazyGaps.filter(function (gap) {
            const gapKey = getGapKey(gap);
            if (!isGapLoaded(gapKey)) {
                return !state.schedule.gaps_loaded;
            }

            return hasGapCandidates(loadedGaps.get(gapKey));
        }).map(function (gap) {
            return loadedGaps.get(getGapKey(gap)) || gap;
        }).sort(function (a, b) {
            return (a.start || 0) - (b.start || 0);
        });
    }

    function isGapLoaded(gapKey) {
        return Boolean(state.loadedGapKeys && state.loadedGapKeys[gapKey]);
    }

    function hasGapCandidates(gap) {
        return Boolean(gap && Array.isArray(gap.candidates) && gap.candidates.length);
    }

    function getLazyGapsForDay(sessions, savedIds, dayKey) {
        const savedBlocks = getSavedTimeBlocks(sessions, savedIds);
        const gaps = [];

        if (!savedBlocks.length) {
            return gaps;
        }

        const dayStart = getDayStart(dayKey) || savedBlocks[0].start;
        const arrivalStart = Math.max(dayStart, savedBlocks[0].start - 2 * 60 * 60);
        addLazyGap(gaps, dayKey, arrivalStart, Math.max(arrivalStart, savedBlocks[0].start - 10 * 60));

        for (let index = 0; index < savedBlocks.length - 1; index++) {
            const current = savedBlocks[index];
            const next = savedBlocks[index + 1];
            const gapStart = current.end || current.start;
            const gapEnd = Math.max(gapStart, next.start - 10 * 60);

            addLazyGap(gaps, dayKey, gapStart, gapEnd);
        }

        const lastSaved = savedBlocks[savedBlocks.length - 1];
        addLazyGap(gaps, dayKey, lastSaved.end || lastSaved.start, getDayEnd(dayKey) || lastSaved.end || lastSaved.start);

        return gaps;
    }

    function getSavedTimeBlocks(sessions, savedIds) {
        const blocks = [];
        const savedSessions = sessions.filter(function (session) {
            return savedIds.has(session.id) && session.type !== 'custom' && session.start;
        }).sort(compareSessions);

        savedSessions.forEach(function (session) {
            const sessionEnd = session.end || session.start;
            const lastBlock = blocks[blocks.length - 1];

            if (lastBlock && sessionHasSubstantialOverlapWithBlock(session, lastBlock)) {
                lastBlock.end = Math.max(lastBlock.end, sessionEnd);
                lastBlock.sessions.push(session);
                return;
            }

            blocks.push({
                start: session.start,
                end: sessionEnd,
                sessions: [session],
            });
        });

        return blocks;
    }

    function addLazyGap(gaps, dayKey, start, end) {
        if (end - start < 15 * 60) {
            return;
        }

        gaps.push({
            day_key: dayKey,
            start: start,
            end: end,
            candidates: [],
        });
    }

    function getConflictsForSession(session, savedIds) {
        if (!state.schedule || !session.start || !session.end || session.type === 'custom') {
            return [];
        }

        return (state.schedule.sessions || []).filter(function (candidate) {
            return candidate.id !== session.id &&
                savedIds.has(candidate.id) &&
                candidate.type !== 'custom' &&
                candidate.start &&
                candidate.end &&
                sessionsOverlap(session, candidate);
        });
    }

    function getConflictCount(savedIds) {
        if (!state.schedule || !savedIds.size) {
            return 0;
        }

        const sessions = (state.schedule.sessions || []).filter(function (session) {
            return savedIds.has(session.id);
        });
        const pairs = new Set();

        sessions.forEach(function (session) {
            getConflictsForSession(session, savedIds).forEach(function (conflict) {
                pairs.add([session.id, conflict.id].sort().join(':'));
            });
        });

        return pairs.size;
    }

    function sessionsOverlap(first, second) {
        const firstStart = Number(first && first.start || 0);
        const firstEnd = Number(first && (first.end || first.start) || 0);
        const secondStart = Number(second && second.start || 0);
        const secondEnd = Number(second && (second.end || second.start) || 0);

        return Boolean(firstStart && firstEnd && secondStart && secondEnd && firstStart < secondEnd && secondStart < firstEnd);
    }

    function sessionsOverlapSeconds(first, second) {
        if (!sessionsOverlap(first, second)) {
            return 0;
        }

        const firstStart = Number(first && first.start || 0);
        const firstEnd = Number(first && (first.end || first.start) || 0);
        const secondStart = Number(second && second.start || 0);
        const secondEnd = Number(second && (second.end || second.start) || 0);

        return Math.max(0, Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart));
    }

    function sessionsSubstantiallyOverlap(first, second) {
        return sessionsOverlapSeconds(first, second) >= SUBSTANTIAL_OVERLAP_SECONDS;
    }

    function sessionHasSubstantialOverlapWithBlock(session, block) {
        return (block.sessions || []).some(function (candidate) {
            return sessionsSubstantiallyOverlap(session, candidate);
        });
    }

    function sessionOverlapsAny(session, sessions, substantialOnly) {
        return (sessions || []).some(function (candidate) {
            if (candidate.id === session.id) {
                return false;
            }

            return substantialOnly ? sessionsSubstantiallyOverlap(session, candidate) : sessionsOverlap(session, candidate);
        });
    }

    function groupSessionsByDay(sessions, timeZone) {
        const groups = new Map();

        sessions.slice().sort(compareSessions).forEach(function (session) {
            const key = session.start ? getDateKey(session.start, timeZone) : 'unscheduled';
            const label = session.start ? formatDate(session.start, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            }, timeZone) : 'Unscheduled';

            if (!groups.has(key)) {
                groups.set(key, { key: key, label: label, sessions: [] });
            }

            groups.get(key).sessions.push(session);
        });

        return Array.from(groups.values());
    }

    function compareSessions(a, b) {
        const aStart = a.start || Number.MAX_SAFE_INTEGER;
        const bStart = b.start || Number.MAX_SAFE_INTEGER;

        if (aStart !== bStart) {
            return aStart - bStart;
        }

        const trackCompare = compareTracks(getPrimaryTrack(a), getPrimaryTrack(b));
        if (trackCompare) {
            return trackCompare;
        }

        return String(a.title || '').localeCompare(String(b.title || ''));
    }

    function compareEvents(a, b) {
        const aStart = Number(a && a.start || Number.MAX_SAFE_INTEGER);
        const bStart = Number(b && b.start || Number.MAX_SAFE_INTEGER);

        if (aStart !== bStart) {
            return aStart - bStart;
        }

        const aTitle = a && (a.title || a.location || a.event_url) ? (a.title || a.location || a.event_url) : '';
        const bTitle = b && (b.title || b.location || b.event_url) ? (b.title || b.location || b.event_url) : '';

        return String(aTitle).localeCompare(String(bTitle));
    }

    function formatEventRange(event) {
        if (!event || !event.start) {
            return '';
        }

        const timeZone = getValidTimeZone(event.timezone || '');
        const start = formatDate(event.start, { month: 'short', day: 'numeric', year: 'numeric' }, timeZone);

        if (!event.end || event.end === event.start) {
            return start;
        }

        const end = formatDate(event.end, { month: 'short', day: 'numeric', year: 'numeric' }, timeZone);
        return start + ' - ' + end;
    }

    function formatSessionTime(session, timeZone) {
        if (!session.start) {
            return 'TBD';
        }

        const start = formatDate(session.start, { hour: 'numeric', minute: '2-digit' }, timeZone);
        if (!session.end) {
            return start;
        }

        return start + ' - ' + formatDate(session.end, { hour: 'numeric', minute: '2-digit' }, timeZone);
    }

    function formatDuration(duration) {
        duration = Number(duration || 0);
        if (!duration) {
            return '';
        }

        const minutes = Math.round(duration / 60);
        if (minutes < 60) {
            return minutes + 'm';
        }

        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;

        return remainder ? hours + 'h ' + remainder + 'm' : hours + 'h';
    }

    function getDateKey(timestamp, timeZone) {
        const parts = getDateParts(timestamp, timeZone);
        return parts.year + '-' + parts.month + '-' + parts.day;
    }

    function getCalendarDayDistance(timestamp, baseTimestamp, timeZone) {
        const target = getDateParts(timestamp, timeZone);
        const base = getDateParts(baseTimestamp, timeZone);
        const targetTime = Date.UTC(Number(target.year), Number(target.month) - 1, Number(target.day));
        const baseTime = Date.UTC(Number(base.year), Number(base.month) - 1, Number(base.day));

        return Math.round((targetTime - baseTime) / 86400000);
    }

    function getDateParts(timestamp, timeZone) {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(new Date(timestamp * 1000));
        const map = {};

        parts.forEach(function (part) {
            map[part.type] = part.value;
        });

        return {
            year: map.year,
            month: map.month,
            day: map.day,
        };
    }

    function formatDate(timestamp, options, timeZone) {
        const formatOptions = Object.assign({}, options, {
            timeZone: timeZone,
        });

        if (Object.prototype.hasOwnProperty.call(formatOptions, 'hour') && typeof config.uses24HourTime === 'boolean') {
            formatOptions.hour12 = !config.uses24HourTime;
        }

        return new Intl.DateTimeFormat(undefined, formatOptions).format(new Date(timestamp * 1000));
    }

    function getValidTimeZone(timeZone) {
        if (!timeZone) {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        try {
            new Intl.DateTimeFormat(undefined, { timeZone: timeZone }).format(new Date());
            return timeZone;
        } catch (error) {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
    }

    function normalizePlan(plan) {
        const rawPlans = plan && plan.plans && typeof plan.plans === 'object' ? plan.plans : {};
        const plans = {};

        Object.keys(rawPlans).forEach(function (eventUrl) {
            const eventPlan = rawPlans[eventUrl] && typeof rawPlans[eventUrl] === 'object' ? rawPlans[eventUrl] : {};

            plans[eventUrl] = Object.assign({}, eventPlan, {
                show_in_companion: Boolean(eventPlan.show_in_companion),
                companion_visibility_set: Boolean(eventPlan.companion_visibility_set),
            });
        });

        return {
            selected_event_url: plan && plan.selected_event_url ? plan.selected_event_url : '',
            selected_wordcamp_term_id: plan && plan.selected_wordcamp_term_id ? Number(plan.selected_wordcamp_term_id) : 0,
            saved_session_posts: plan && Array.isArray(plan.saved_session_posts) ? plan.saved_session_posts : [],
            plans: plans,
        };
    }

    function normalizeSettings(settings) {
        return {
            show_debug_clock: Boolean(settings && settings.show_debug_clock),
        };
    }

    function isDebugClockEnabled() {
        return Boolean(state.settings && state.settings.show_debug_clock);
    }

    function element(tag, options) {
        options = options || {};
        const node = document.createElement(tag);

        Object.keys(options).forEach(function (key) {
            const value = options[key];
            if (key === 'className') {
                node.className = value;
            } else if (key === 'text') {
                node.textContent = value;
            } else if (key === 'dataset') {
                Object.keys(value).forEach(function (dataKey) {
                    node.dataset[dataKey] = value[dataKey];
                });
            } else if (key !== 'children' && value !== undefined && value !== null) {
                node.setAttribute(key, value);
            }
        });

        (options.children || []).forEach(function (child) {
            node.append(child);
        });

        return node;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
