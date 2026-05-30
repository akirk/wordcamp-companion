(function () {
    const SCRIPT_BUILD = '20260530.4';
    const SUBSTANTIAL_OVERLAP_SECONDS = 20 * 60;
    const TRACK_CHANGE_LEAD_SECONDS = 10 * 60;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = 180;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = 5;
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
        debugTimeAdjustmentMinutes: 0,
        debugTimeAdjustmentBaseOffset: null,
        debugLastTick: null,
        alert: null,
        shareMode: '',
        shareModeTouched: false,
        importingSharedSchedule: false,
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
        nodes.debugSliderMode = document.getElementById('wcc-debug-slider-mode');
        nodes.debugRateLabel = document.getElementById('wcc-debug-rate-label');
        nodes.debugReset = document.getElementById('wcc-debug-reset');
        nodes.debugClose = document.getElementById('wcc-debug-close');
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
                clearDebugTimeAdjustment();
                state.debugLastTick = null;
                render();
                restartClock();
            });
        }

        if (nodes.debugClose) {
            nodes.debugClose.addEventListener('click', function () {
                saveSettings({
                    show_debug_clock: false,
                });
            });
        }

        if (nodes.debugPlay) {
            nodes.debugPlay.addEventListener('click', function () {
                if (state.debugPlaying) {
                    updateDebugPlayback();
                }

                clearDebugTimeAdjustment();
                state.debugPlaying = !state.debugPlaying;
                state.debugLastTick = state.debugPlaying ? Date.now() : null;
                render();
                restartClock();
            });
        }

        if (nodes.debugRate) {
            nodes.debugRate.addEventListener('input', function () {
                if (!state.debugPlaying) {
                    adjustDebugTimeFromSlider(Number(nodes.debugRate.value || 0));
                    return;
                }

                state.debugRate = Number(nodes.debugRate.value || 1);
                render();
                restartClock();
            });

            nodes.debugRate.addEventListener('change', function () {
                if (!state.debugPlaying) {
                    commitDebugTimeAdjustment();
                }
            });
        }

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && state.view === 'companion') {
                updateDebugPlayback();
                render({ companionInPlace: true });
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
                        activatePlanSelectorEvent(selectedEvent);
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

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeShareDialog();
                closeImportScheduleDialog();
            }
        });

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
        const requestedWccRaw = getRequestedWccValue();
        const requestedWcc = parseWccParameter(requestedWccRaw);

        if (requestedWccRaw && state.page !== 'plan') {
            window.location.replace(getWccPlanUrl(requestedWccRaw));
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
                await selectWccSchedule(requestedWcc);
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
                    state.schedule = buildLocalCompanionSchedule();
                    resetCompanionAnimationState();
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
                state.schedule = buildLocalCompanionSchedule();
                resetCompanionAnimationState();
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

    async function selectWccSchedule(requestedWcc) {
        const event = buildWccEvent(requestedWcc);
        const previousSelectedEventUrl = state.selectedEventUrl;
        const previousSchedule = state.schedule;
        const previousLoadedGapKeys = Object.assign({}, state.loadedGapKeys);
        const previousOpenGapKey = state.openGapKey;

        state.selectedEventUrl = event.event_url;
        state.view = 'schedule';
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
        const previousSchedule = state.schedule;
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
            if (previousSchedule && previousSchedule.event_url === state.selectedEventUrl) {
                state.schedule = previousSchedule;
            }
            state.alert = getErrorAlert(error);
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
            speaker_urls: Array.isArray(post.speaker_urls) ? post.speaker_urls : [],
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
            state.alert = getErrorAlert(error);
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
            state.alert = getErrorAlert(error);
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
            state.alert = getErrorAlert(error);
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

        const alert = element('div', {
            className: 'wcc-alert' + (state.alert.type === 'error' ? ' is-error' : ''),
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
            nodes.shareLink
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
        const shareUrl = config.shareUrl || 'https://my.wordpress.net/?i=wordcamp-companion';

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

        nodes.importScheduleDialog.dataset.wccSessionIds = requestedWcc.sessionIds.join('.');
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
        nodes.importScheduleImport = element('button', {
            className: 'wcc-button',
            type: 'button',
            text: 'Import',
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
        const ids = getImportScheduleSessionIds();
        const count = ids.length;

        nodes.importScheduleText.textContent = count + ' shared session' + (count === 1 ? '' : 's') + ' can be added to your plan.';
        nodes.importScheduleImport.disabled = state.importingSharedSchedule || !count;
        nodes.importScheduleImport.textContent = state.importingSharedSchedule ? 'Importing...' : 'Import';
        nodes.importScheduleSkip.disabled = state.importingSharedSchedule;
    }

    function getImportScheduleSessionIds() {
        if (!nodes.importScheduleDialog) {
            return [];
        }

        return parseWccSessionIds(nodes.importScheduleDialog.dataset.wccSessionIds || '');
    }

    async function importSharedSchedule() {
        if (state.importingSharedSchedule) {
            return;
        }

        const ids = getImportScheduleSessionIds();
        if (!ids.length || !state.schedule || !Array.isArray(state.schedule.sessions)) {
            closeImportScheduleDialog();
            return;
        }

        const savedIds = getSavedSessionIds();
        const sessionsById = new Map();
        state.schedule.sessions.forEach(function (session) {
            sessionsById.set(Number(session.id || 0), session);
        });
        const sessionsToImport = ids.filter(function (id) {
            return !savedIds.has(id) && sessionsById.has(id);
        }).map(function (id) {
            return sessionsById.get(id);
        });

        if (!sessionsToImport.length) {
            state.alert = { type: 'notice', message: 'The shared sessions are already in your plan or are not available in this schedule.' };
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

            state.alert = { type: 'notice', message: sessionsToImport.length + ' shared session' + (sessionsToImport.length === 1 ? '' : 's') + ' added to your plan.' };
            closeImportScheduleDialog();
        } catch (error) {
            state.alert = getErrorAlert(error);
        } finally {
            state.importingSharedSchedule = false;
            updateImportScheduleDialog();
            render();
        }
    }

    function createQrSvg(text) {
        const matrix = createQrMatrix(text);
        const quiet = 4;
        const scale = 8;
        const size = matrix.length + quiet * 2;
        const parts = [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + (size * scale) + '" height="' + (size * scale) + '" role="img" aria-label="QR code">',
            '<rect width="100%" height="100%" fill="#fff"/>',
        ];

        matrix.forEach(function (row, y) {
            row.forEach(function (dark, x) {
                if (dark) {
                    parts.push('<rect x="' + (x + quiet) + '" y="' + (y + quiet) + '" width="1" height="1" fill="#000"/>');
                }
            });
        });

        parts.push('</svg>');
        return parts.join('');
    }

    function createQrMatrix(text) {
        const bytes = Array.from(new TextEncoder().encode(text));
        const version = getQrVersionForBytes(bytes.length);
        const blocks = getQrBlocks(version);
        const dataCodewordCount = blocks.reduce(function (sum, block) {
            return sum + block.count * block.data;
        }, 0);
        const dataCodewords = buildQrDataCodewords(bytes, version, dataCodewordCount);
        const finalCodewords = buildQrFinalCodewords(dataCodewords, blocks);
        const size = 17 + version * 4;
        const modules = Array.from({ length: size }, function () {
            return Array(size).fill(false);
        });
        const reserved = Array.from({ length: size }, function () {
            return Array(size).fill(false);
        });

        drawQrFunctionPatterns(modules, reserved, version);
        drawQrCodewords(modules, reserved, finalCodewords);
        drawQrFormatBits(modules, reserved, 0);

        return modules;
    }

    function getQrVersionForBytes(byteLength) {
        for (let version = 1; version <= QR_M_BLOCKS.length; version++) {
            const blocks = getQrBlocks(version);
            const dataCodewordCount = blocks.reduce(function (sum, block) {
                return sum + block.count * block.data;
            }, 0);
            const lengthBits = version < 10 ? 8 : 16;
            const totalBits = 4 + lengthBits + byteLength * 8;

            if (totalBits <= dataCodewordCount * 8) {
                return version;
            }
        }

        throw new Error('QR payload is too large.');
    }

    function buildQrDataCodewords(bytes, version, dataCodewordCount) {
        const bits = [];
        const lengthBits = version < 10 ? 8 : 16;

        appendQrBits(bits, 0x4, 4);
        appendQrBits(bits, bytes.length, lengthBits);
        bytes.forEach(function (byte) {
            appendQrBits(bits, byte, 8);
        });

        const capacityBits = dataCodewordCount * 8;
        appendQrBits(bits, 0, Math.min(4, capacityBits - bits.length));
        while (bits.length % 8) {
            bits.push(0);
        }

        const codewords = [];
        for (let index = 0; index < bits.length; index += 8) {
            let value = 0;
            for (let bit = 0; bit < 8; bit++) {
                value = (value << 1) | bits[index + bit];
            }
            codewords.push(value);
        }

        for (let padIndex = 0; codewords.length < dataCodewordCount; padIndex++) {
            codewords.push(padIndex % 2 ? 0x11 : 0xec);
        }

        return codewords;
    }

    function buildQrFinalCodewords(dataCodewords, blockGroups) {
        const blocks = [];
        let offset = 0;

        blockGroups.forEach(function (group) {
            const eccLength = group.total - group.data;

            for (let index = 0; index < group.count; index++) {
                const data = dataCodewords.slice(offset, offset + group.data);
                offset += group.data;
                blocks.push({
                    data: data,
                    ecc: computeQrErrorCorrection(data, eccLength),
                });
            }
        });

        const result = [];
        const maxDataLength = Math.max.apply(null, blocks.map(function (block) {
            return block.data.length;
        }));
        const maxEccLength = Math.max.apply(null, blocks.map(function (block) {
            return block.ecc.length;
        }));

        for (let index = 0; index < maxDataLength; index++) {
            blocks.forEach(function (block) {
                if (index < block.data.length) {
                    result.push(block.data[index]);
                }
            });
        }

        for (let index = 0; index < maxEccLength; index++) {
            blocks.forEach(function (block) {
                if (index < block.ecc.length) {
                    result.push(block.ecc[index]);
                }
            });
        }

        return result;
    }

    function appendQrBits(bits, value, length) {
        for (let bit = length - 1; bit >= 0; bit--) {
            bits.push((value >>> bit) & 1);
        }
    }

    function drawQrFunctionPatterns(modules, reserved, version) {
        const size = modules.length;

        drawQrFinder(modules, reserved, 0, 0);
        drawQrFinder(modules, reserved, size - 7, 0);
        drawQrFinder(modules, reserved, 0, size - 7);

        for (let index = 8; index < size - 8; index++) {
            setQrFunctionModule(modules, reserved, index, 6, index % 2 === 0);
            setQrFunctionModule(modules, reserved, 6, index, index % 2 === 0);
        }

        getQrAlignmentPositions(version).forEach(function (y) {
            getQrAlignmentPositions(version).forEach(function (x) {
                if (!reserved[y][x]) {
                    drawQrAlignment(modules, reserved, x, y);
                }
            });
        });

        reserveQrFormatBits(modules, reserved);
        if (version >= 7) {
            drawQrVersionBits(modules, reserved, version);
        }
        setQrFunctionModule(modules, reserved, 8, size - 8, true);
    }

    function drawQrFinder(modules, reserved, left, top) {
        for (let dy = -1; dy <= 7; dy++) {
            for (let dx = -1; dx <= 7; dx++) {
                const x = left + dx;
                const y = top + dy;
                if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) {
                    continue;
                }

                const dark = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
                    (dx === 0 || dx === 6 || dy === 0 || dy === 6 || dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
                setQrFunctionModule(modules, reserved, x, y, dark);
            }
        }
    }

    function drawQrAlignment(modules, reserved, centerX, centerY) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                setQrFunctionModule(
                    modules,
                    reserved,
                    centerX + dx,
                    centerY + dy,
                    Math.max(Math.abs(dx), Math.abs(dy)) !== 1
                );
            }
        }
    }

    function reserveQrFormatBits(modules, reserved) {
        const size = modules.length;

        for (let index = 0; index < 15; index++) {
            const primary = getQrFormatPrimaryCoordinate(index);
            const secondary = getQrFormatSecondaryCoordinate(index, size);

            setQrFunctionModule(modules, reserved, primary[0], primary[1], false);
            setQrFunctionModule(modules, reserved, secondary[0], secondary[1], false);
        }
    }

    function drawQrVersionBits(modules, reserved, version) {
        const size = modules.length;
        const bits = getQrVersionBits(version);

        for (let index = 0; index < 18; index++) {
            const dark = ((bits >>> index) & 1) === 1;
            const a = size - 11 + index % 3;
            const b = Math.floor(index / 3);

            setQrFunctionModule(modules, reserved, a, b, dark);
            setQrFunctionModule(modules, reserved, b, a, dark);
        }
    }

    function drawQrFormatBits(modules, reserved, mask) {
        const size = modules.length;
        const bits = getQrFormatBits(mask);

        for (let index = 0; index < 15; index++) {
            const dark = ((bits >>> index) & 1) === 1;
            const primary = getQrFormatPrimaryCoordinate(index);
            const secondary = getQrFormatSecondaryCoordinate(index, size);

            setQrFunctionModule(modules, reserved, primary[0], primary[1], dark);
            setQrFunctionModule(modules, reserved, secondary[0], secondary[1], dark);
        }

        setQrFunctionModule(modules, reserved, 8, size - 8, true);
    }

    function getQrFormatPrimaryCoordinate(index) {
        if (index < 6) {
            return [8, index];
        }
        if (index < 8) {
            return [8, index + 1];
        }
        if (index === 8) {
            return [7, 8];
        }
        return [14 - index, 8];
    }

    function getQrFormatSecondaryCoordinate(index, size) {
        if (index < 8) {
            return [size - 1 - index, 8];
        }
        return [8, size - 15 + index];
    }

    function drawQrCodewords(modules, reserved, codewords) {
        const size = modules.length;
        const bits = [];
        let bitIndex = 0;
        let upward = true;

        codewords.forEach(function (codeword) {
            appendQrBits(bits, codeword, 8);
        });

        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) {
                right--;
            }

            for (let vertical = 0; vertical < size; vertical++) {
                const y = upward ? size - 1 - vertical : vertical;
                for (let column = 0; column < 2; column++) {
                    const x = right - column;
                    if (reserved[y][x]) {
                        continue;
                    }

                    const rawBit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
                    const maskedBit = rawBit !== ((x + y) % 2 === 0);
                    modules[y][x] = maskedBit;
                    bitIndex++;
                }
            }

            upward = !upward;
        }
    }

    function setQrFunctionModule(modules, reserved, x, y, dark) {
        if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) {
            return;
        }

        modules[y][x] = Boolean(dark);
        reserved[y][x] = true;
    }

    function getQrFormatBits(mask) {
        let data = mask;
        let bits = data << 10;

        for (let bit = getQrBitLength(bits) - getQrBitLength(0x537); bit >= 0; bit--) {
            bits ^= 0x537 << bit;
        }

        return ((data << 10) | bits) ^ 0x5412;
    }

    function getQrVersionBits(version) {
        let bits = version << 12;

        for (let bit = getQrBitLength(bits) - getQrBitLength(0x1f25); bit >= 0; bit--) {
            bits ^= 0x1f25 << bit;
        }

        return (version << 12) | bits;
    }

    function getQrBitLength(value) {
        let length = 0;

        while (value) {
            length++;
            value >>>= 1;
        }

        return length;
    }

    function getQrAlignmentPositions(version) {
        return QR_ALIGNMENT_POSITIONS[version] || [];
    }

    function getQrBlocks(version) {
        return QR_M_BLOCKS[version - 1].map(function (block) {
            return {
                count: block[0],
                total: block[1],
                data: block[2],
            };
        });
    }

    function computeQrErrorCorrection(data, degree) {
        const divisor = getQrGeneratorPolynomial(degree);
        const result = Array(degree).fill(0);

        data.forEach(function (byte) {
            const factor = byte ^ result.shift();
            result.push(0);
            divisor.forEach(function (coefficient, index) {
                result[index] ^= qrGfMultiply(coefficient, factor);
            });
        });

        return result;
    }

    function getQrGeneratorPolynomial(degree) {
        let result = [1];

        for (let index = 0; index < degree; index++) {
            const next = Array(result.length + 1).fill(0);
            result.forEach(function (coefficient, coefficientIndex) {
                next[coefficientIndex] ^= coefficient;
                next[coefficientIndex + 1] ^= qrGfMultiply(coefficient, QR_GF_EXP[index]);
            });
            result = next;
        }

        return result.slice(1);
    }

    function qrGfMultiply(a, b) {
        if (!a || !b) {
            return 0;
        }

        return QR_GF_EXP[QR_GF_LOG[a] + QR_GF_LOG[b]];
    }

    function createQrGfTables() {
        const exp = Array(512).fill(0);
        const log = Array(256).fill(0);
        let value = 1;

        for (let index = 0; index < 255; index++) {
            exp[index] = value;
            log[value] = index;
            value <<= 1;
            if (value & 0x100) {
                value ^= 0x11d;
            }
        }

        for (let index = 255; index < exp.length; index++) {
            exp[index] = exp[index - 255];
        }

        return { exp: exp, log: log };
    }

    const QR_M_BLOCKS = [
        [[1, 26, 16]],
        [[1, 44, 28]],
        [[1, 70, 44]],
        [[2, 50, 32]],
        [[2, 67, 43]],
        [[4, 43, 27]],
        [[4, 49, 31]],
        [[2, 60, 38], [2, 61, 39]],
        [[3, 58, 36], [2, 59, 37]],
        [[4, 69, 43], [1, 70, 44]],
        [[1, 80, 50], [4, 81, 51]],
        [[6, 58, 36], [2, 59, 37]],
        [[8, 59, 37], [1, 60, 38]],
        [[4, 64, 40], [5, 65, 41]],
        [[5, 65, 41], [5, 66, 42]],
        [[7, 73, 45], [3, 74, 46]],
        [[10, 74, 46], [1, 75, 47]],
        [[9, 69, 43], [4, 70, 44]],
        [[3, 70, 44], [11, 71, 45]],
        [[3, 67, 41], [13, 68, 42]],
    ];
    const QR_ALIGNMENT_POSITIONS = {
        1: [],
        2: [6, 18],
        3: [6, 22],
        4: [6, 26],
        5: [6, 30],
        6: [6, 34],
        7: [6, 22, 38],
        8: [6, 24, 42],
        9: [6, 26, 46],
        10: [6, 28, 50],
        11: [6, 30, 54],
        12: [6, 32, 58],
        13: [6, 34, 62],
        14: [6, 26, 46, 66],
        15: [6, 26, 48, 70],
        16: [6, 26, 50, 74],
        17: [6, 30, 54, 78],
        18: [6, 30, 56, 82],
        19: [6, 30, 58, 86],
        20: [6, 34, 62, 90],
    };
    const QR_GF_TABLES = createQrGfTables();
    const QR_GF_EXP = QR_GF_TABLES.exp;
    const QR_GF_LOG = QR_GF_TABLES.log;

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
            render({ companionInPlace: true });
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
        const alternatives = Array.isArray(step.alternatives) ? step.alternatives : [];
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
            step.final ? '1' : '0',
            getCompanionSessionStaticSignature(session),
            alternatives.map(getCompanionSessionStaticSignature).join(','),
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
        const planButton = element('a', {
            className: 'wcc-plan-link wcc-companion-link-plan',
            href: getPlanYourDayUrl(selectedEvent),
            text: 'Plan your day',
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
        wrapper.append(switcherRow);
        wrapper.append(planButton);

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

        if (step.type === 'choice') {
            body.append(renderCompanionChoices(step.alternatives || [], timeZone));
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

            if (meta.length) {
                item.append(element('span', { text: meta.join(' / ') }));
            }

            const speakers = renderSessionSpeakers(session, 'wcc-session-speakers wcc-choice-speakers');
            if (speakers) {
                item.append(speakers);
            }

            const notes = renderSessionNotes(session, { compact: true });
            if (notes) {
                item.append(notes);
            }

            wrapper.append(item);
        });

        return wrapper;
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
            wcc_speaker_urls: listToMeta(session.speaker_urls),
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
            speaker_urls: metaToUrlList(meta.wcc_speaker_urls, fallback.speaker_urls),
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

    function metaToUrlList(value, fallback) {
        if (typeof value !== 'string' || !value) {
            return Array.isArray(fallback) ? fallback : [];
        }

        return value.split(/\r\n|\r|\n/);
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
                render({ companionInPlace: true });
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

        clearDebugTimeAdjustment();
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

        clearDebugTimeAdjustment();
        state.debugOffsetSeconds = Number(start) - 60 * 60 - Math.floor(Date.now() / 1000);
        state.debugLastTick = Date.now();
        render();
    }

    function adjustDebugTimeFromSlider(minutes) {
        if (!isDebugClockEnabled() || state.debugPlaying) {
            return;
        }

        if (state.debugTimeAdjustmentBaseOffset === null) {
            state.debugTimeAdjustmentBaseOffset = state.debugOffsetSeconds;
        }

        state.debugTimeAdjustmentMinutes = minutes;
        state.debugOffsetSeconds = state.debugTimeAdjustmentBaseOffset + minutes * 60;
        state.debugLastTick = null;
        render();
        restartClock();
    }

    function commitDebugTimeAdjustment() {
        if (state.debugPlaying || state.debugTimeAdjustmentBaseOffset === null) {
            return;
        }

        state.debugTimeAdjustmentBaseOffset = state.debugOffsetSeconds;
        state.debugTimeAdjustmentMinutes = 0;
        render();
        restartClock();
    }

    function clearDebugTimeAdjustment() {
        state.debugTimeAdjustmentMinutes = 0;
        state.debugTimeAdjustmentBaseOffset = null;
    }

    function formatDebugTimeAdjustment(minutes) {
        const value = Number(minutes) || 0;

        if (value === 0) {
            return '+0m';
        }

        const sign = value > 0 ? '+' : '-';
        const absolute = Math.abs(value);
        const hours = Math.floor(absolute / 60);
        const remainingMinutes = absolute % 60;

        if (hours && remainingMinutes) {
            return sign + hours + 'h ' + remainingMinutes + 'm';
        }

        if (hours) {
            return sign + hours + 'h';
        }

        return sign + remainingMinutes + 'm';
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

    function shouldOpenCompanionFromPlanSelector() {
        return Boolean(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
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

    function getRequestedWccValue() {
        return (new URLSearchParams(window.location.search).get('wcc1') || '').trim();
    }

    function parseWccParameter(rawValue) {
        let value = String(rawValue || '').trim();
        if (!value) {
            return null;
        }

        const legacyParts = value.split(';');
        const isLegacyFormat = legacyParts.length > 1 || /^[^_]+,\d{4}(?:_|$)/.test(value);
        const parts = isLegacyFormat ? legacyParts : value.split('_');
        const eventPart = (parts.shift() || '').trim();
        const sessionPart = parts.join(isLegacyFormat ? ';' : '_');
        let eventUrl = '';
        let eventSlug = '';
        let eventYear = '';

        if (/^https?:\/\//i.test(eventPart)) {
            eventUrl = normalizeWccEventUrl(eventPart);
        } else {
            const eventParts = isLegacyFormat
                ? eventPart.split(',')
                : (eventPart.match(/^(.+)\.(\d{4})$/) || []).slice(1);
            eventSlug = eventParts.length === 2 ? normalizeWccEventSlug(eventParts[0]) : '';
            eventYear = eventParts.length === 2 ? String(eventParts[1] || '').trim() : '';

            if (eventSlug && /^\d{4}$/.test(eventYear)) {
                eventUrl = 'https://' + eventSlug + '.wordcamp.org/' + eventYear + '/';
            }
        }

        if (!eventUrl) {
            return null;
        }

        return {
            raw: rawValue,
            eventUrl: eventUrl,
            eventSlug: eventSlug,
            eventYear: eventYear,
            sessionIds: parseWccSessionIds(sessionPart),
        };
    }

    function normalizeWccEventUrl(value) {
        try {
            const url = new URL(value);
            const protocol = url.protocol.toLowerCase();
            const host = url.hostname.toLowerCase();

            if ((protocol !== 'http:' && protocol !== 'https:') || !isAllowedWordcampHost(host)) {
                return '';
            }

            return protocol + '//' + host + (url.pathname || '/').replace(/\/?$/, '/');
        } catch (error) {
            return '';
        }
    }

    function isAllowedWordcampHost(host) {
        return host === 'wordcamp.org' || host.slice(-13) === '.wordcamp.org';
    }

    function normalizeWccEventSlug(value) {
        const words = normalizeSlugSource(value).split(' ').filter(Boolean);

        if (words[0] === 'wordcamp') {
            words.shift();
        }

        return words.join('-');
    }

    function parseWccSessionIds(value) {
        return String(value || '').split(/[,.]/).map(function (id) {
            return Number(id.trim());
        }).filter(function (id, index, ids) {
            return Number.isInteger(id) && id > 0 && ids.indexOf(id) === index;
        });
    }

    function buildWccEvent(requestedWcc) {
        return {
            id: 0,
            title: getWccEventTitle(requestedWcc),
            location: '',
            start: null,
            end: null,
            event_url: requestedWcc.eventUrl,
            timezone: '',
            country: '',
            coordinates: null,
            venue: {
                name: '',
                address: '',
                coordinates: null,
            },
        };
    }

    function getWccEventTitle(requestedWcc) {
        if (!requestedWcc.eventSlug || !requestedWcc.eventYear) {
            return requestedWcc.eventUrl;
        }

        const name = requestedWcc.eventSlug.split('-').filter(Boolean).map(function (word) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');

        return ['WordCamp', name, requestedWcc.eventYear].filter(Boolean).join(' ');
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

    function getWccPlanUrl(rawWccValue) {
        const base = config.planBaseUrl || config.planUrl || (config.appUrl ? config.appUrl.replace(/\/?$/, '/plan-your/') : '/wordcamp-companion/plan-your/');

        return base.replace(/\/?$/, '/') + 'schedule/?wcc1=' + encodeURIComponent(rawWccValue);
    }

    function getCompanionUrl() {
        return config.appUrl || '/wordcamp-companion/';
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
