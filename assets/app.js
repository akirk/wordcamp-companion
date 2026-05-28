(function () {
    const SCRIPT_BUILD = '20260528.6';
    const config = window.WordCampCompanionConfig || {};
    const state = {
        events: [],
        plan: { selected_event_url: '', plans: {} },
        schedule: null,
        selectedEventUrl: '',
        view: 'companion',
        pickerOpen: true,
        loadingEvents: false,
        loadingSchedule: false,
        loadingGapKey: '',
        openGapKey: '',
        companionVisibleStepKeys: null,
        exitingCompanionStepKeys: {},
        savingEvent: false,
        savingSessionId: null,
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
        nodes.debugClock = document.getElementById('wcc-debug-clock');
        nodes.debugCurrent = document.getElementById('wcc-debug-current');
        nodes.debugPlay = document.getElementById('wcc-debug-play');
        nodes.debugRate = document.getElementById('wcc-debug-rate');
        nodes.debugRateLabel = document.getElementById('wcc-debug-rate-label');
        nodes.debugReset = document.getElementById('wcc-debug-reset');
        nodes.debugJumps = Array.from(document.querySelectorAll('[data-debug-jump]'));
        nodes.debugStart = document.querySelector('[data-debug-start]');
        nodes.header = document.querySelector('.wcc-header');
        nodes.currentEvent = document.getElementById('wcc-current-event');
        nodes.planSummary = document.getElementById('wcc-plan-summary');
        nodes.selectedEvent = document.getElementById('wcc-selected-event');
        nodes.selectedTitle = document.getElementById('wcc-selected-title');
        nodes.selectedMeta = document.getElementById('wcc-selected-meta');
        nodes.openEvent = document.getElementById('wcc-open-event');
        nodes.changeEvent = document.getElementById('wcc-change-event');
        nodes.picker = document.getElementById('wcc-picker');
        nodes.plannerNav = document.getElementById('wcc-planner-nav');
        nodes.eventSelect = document.getElementById('wcc-event-select');
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
        nodes.debugReset.addEventListener('click', function () {
            state.debugOffsetSeconds = 0;
            state.debugPlaying = false;
            state.debugLastTick = null;
            render();
            restartClock();
        });

        nodes.debugPlay.addEventListener('click', function () {
            state.debugPlaying = !state.debugPlaying;
            state.debugLastTick = Date.now();
            render();
            restartClock();
        });

        nodes.debugRate.addEventListener('input', function () {
            state.debugRate = Number(nodes.debugRate.value || 1);
            render();
            restartClock();
        });

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

        nodes.debugStart.addEventListener('click', function () {
            setDebugTimeToWordCampStart();
        });

        nodes.eventSelect.addEventListener('change', function (event) {
            selectEvent(event.target.value);
        });

        nodes.refreshEvents.addEventListener('click', function () {
            loadEvents(true);
        });

        nodes.refreshSchedule.addEventListener('click', function () {
            loadSchedule(true, state.view === 'schedule' ? 'full' : 'companion');
        });

        nodes.changeEvent.addEventListener('click', function () {
            state.pickerOpen = true;
            render();
            window.setTimeout(function () {
                nodes.eventSelect.focus();
            }, 0);
        });

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

    async function loadInitialData() {
        state.loadingEvents = true;
        render();

        try {
            const results = await Promise.all([api('plan'), api('wordcamps')]);
            state.plan = normalizePlan(results[0]);
            state.events = Array.isArray(results[1].wordcamps) ? results[1].wordcamps : [];
            state.selectedEventUrl = state.plan.selected_event_url || '';
            state.pickerOpen = !state.selectedEventUrl;
            state.alert = null;
            render();

            if (state.selectedEventUrl) {
                await loadSchedule(false, 'companion');
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
            await loadSchedule(false, 'companion');
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.savingEvent = false;
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
        render();

        try {
            state.schedule = await api(mode === 'full' ? 'schedule' : 'companion', {
                query: {
                    event_url: state.selectedEventUrl,
                    refresh: refresh ? '1' : '0',
                },
            });
            state.loadingGapKey = '';
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

    async function loadGapCandidates(gapKey) {
        if (!state.selectedEventUrl || !state.schedule || state.schedule.gaps_loaded || state.loadingGapKey) {
            return;
        }

        state.loadingGapKey = gapKey || 'all';
        render();

        try {
            const data = await api('gap-candidates', {
                query: {
                    event_url: state.selectedEventUrl,
                    refresh: '0',
                },
            });
            state.schedule.gaps = Array.isArray(data.gaps) ? data.gaps : [];
            state.schedule.days = Object.assign({}, state.schedule.days || {}, data.days || {});
            state.schedule.gaps_loaded = true;
            state.alert = null;
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.loadingGapKey = '';
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
        if (wasSaved) {
            savedIds.delete(sessionId);
        } else {
            savedIds.add(sessionId);
        }

        state.savingSessionId = sessionId;
        render();

        try {
            state.plan = normalizePlan(await api('plan/sessions', {
                method: 'POST',
                body: {
                    event_url: state.selectedEventUrl,
                    session_ids: Array.from(savedIds),
                },
            }));
            state.alert = null;
            if (!wasSaved && localSession && state.schedule && state.schedule.mode === 'companion') {
                addSessionToCompanionSchedule(localSession);
            } else if (wasSaved && state.schedule && state.schedule.mode === 'companion') {
                await loadSchedule(true, 'companion');
            }
        } catch (error) {
            state.alert = { type: 'error', message: error.message };
        } finally {
            state.savingSessionId = null;
            render();
        }
    }

    async function api(path, options) {
        options = options || {};
        const url = new URL(path.replace(/^\/+/, ''), config.restUrl);

        Object.keys(options.query || {}).forEach(function (key) {
            url.searchParams.set(key, options.query[key]);
        });

        if ((options.method || 'GET').toUpperCase() === 'GET') {
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
        renderLayout();
        renderDebugClock();
        renderAlerts();
        renderHeader();
        renderSelectedEvent();
        renderControls();
        renderEvents();
        renderTabs();
        renderSchedule();
    }

    function renderDebugClock() {
        const timeZone = getSelectedTimezone();
        const now = getNow();
        const parts = [];

        if (state.debugOffsetSeconds) {
            parts.push('offset ' + formatSignedOffset(state.debugOffsetSeconds));
        }

        nodes.debugCurrent.textContent = formatDate(now, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }, timeZone) + (parts.length ? ' (' + parts.join(', ') + ')' : '');
        nodes.debugPlay.textContent = state.debugPlaying ? 'Pause' : 'Play';
        nodes.debugPlay.setAttribute('aria-pressed', state.debugPlaying ? 'true' : 'false');
        nodes.debugRateLabel.textContent = state.debugRate + 'x';
    }

    function renderLayout() {
        const hasSelectedEvent = Boolean(state.selectedEventUrl && getSelectedEvent());
        const isChoosing = state.pickerOpen || !hasSelectedEvent;
        const isFocused = hasSelectedEvent && !isChoosing;
        const isLiveCompanion = isFocused && state.view === 'companion';

        nodes.app.classList.toggle('is-focused', isFocused);
        nodes.app.classList.toggle('is-choosing', isChoosing);
        nodes.app.classList.toggle('is-live-companion', isLiveCompanion);
        nodes.header.hidden = isLiveCompanion;
        nodes.selectedEvent.hidden = !hasSelectedEvent || isLiveCompanion;
        nodes.picker.hidden = !isChoosing;
        nodes.plannerNav.hidden = !hasSelectedEvent || isLiveCompanion;
        nodes.sidebar.hidden = hasSelectedEvent && !isChoosing;
    }

    function renderAlerts() {
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
        const event = getSelectedEvent();
        const savedIds = getSavedSessionIds();
        const conflictCount = getConflictCount(savedIds);

        nodes.currentEvent.textContent = event
            ? [event.location, formatEventRange(event)].filter(Boolean).join(' - ')
            : 'No WordCamp selected';

        if (!event) {
            nodes.planSummary.textContent = '';
            return;
        }

        const summary = [savedIds.size + ' saved'];
        if (conflictCount > 0) {
            summary.push(conflictCount + ' conflict' + (conflictCount === 1 ? '' : 's'));
        }
        nodes.planSummary.textContent = summary.join(' / ');
    }

    function renderSelectedEvent() {
        const event = getSelectedEvent();

        if (!event) {
            nodes.selectedTitle.textContent = '';
            nodes.selectedMeta.textContent = '';
            nodes.openEvent.href = '#';
            return;
        }

        nodes.selectedTitle.textContent = event.title || 'Selected WordCamp';
        nodes.selectedMeta.textContent = [event.location, formatEventRange(event), event.timezone].filter(Boolean).join(' - ');

        if (event.event_url) {
            nodes.openEvent.href = event.event_url;
            nodes.openEvent.hidden = false;
        } else {
            nodes.openEvent.href = '#';
            nodes.openEvent.hidden = true;
        }
    }

    function renderControls() {
        const events = getRenderableEvents();
        const previousValue = nodes.eventSelect.value;
        const fragment = document.createDocumentFragment();

        if (!events.length) {
            fragment.append(element('option', { value: '', text: state.loadingEvents ? 'Loading WordCamps...' : 'No scheduled WordCamps' }));
        } else {
            fragment.append(element('option', { value: '', text: 'Select a WordCamp' }));
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
        nodes.refreshEvents.disabled = state.loadingEvents;
        nodes.refreshSchedule.disabled = state.loadingSchedule || !state.selectedEventUrl;
    }

    function renderEvents() {
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
            const button = element('button', {
                className: 'wcc-event-card' + (event.event_url === state.selectedEventUrl ? ' is-active' : ''),
                type: 'button',
            });
            button.append(
                element('span', { className: 'wcc-event-title', text: event.title || 'Untitled WordCamp' }),
                element('span', {
                    className: 'wcc-event-meta',
                    text: [event.location, formatEventRange(event)].filter(Boolean).join(' - '),
                })
            );
            button.addEventListener('click', function () {
                selectEvent(event.event_url);
            });
            nodes.eventList.append(button);
        });
    }

    function renderTabs() {
        nodes.tabs.forEach(function (tab) {
            const isActive = tab.dataset.view === state.view;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    function renderSchedule() {
        nodes.status.textContent = '';
        nodes.schedule.replaceChildren();

        if (!state.selectedEventUrl) {
            nodes.schedule.append(element('div', { className: 'wcc-empty', text: 'Select a WordCamp.' }));
            return;
        }

        if (state.loadingSchedule) {
            nodes.status.textContent = 'Loading schedule...';
            return;
        }

        if (!state.schedule) {
            nodes.schedule.append(element('div', { className: 'wcc-empty', text: 'Schedule unavailable.' }));
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

        if (!timeline.hasSavedSessions && timeline.steps.length) {
            const notice = element('div', { className: 'wcc-companion-note', text: 'No saved sessions.' });
            nodes.schedule.append(notice);
        }

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

    function getRenderableCompanionSteps(visibleSteps) {
        const defaultLimit = 4;
        const sessionIndex = visibleSteps.findIndex(function (step) {
            return step.type === 'session';
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
        const organizeButton = element('button', {
            className: 'wcc-organize-link',
            type: 'button',
            text: 'Organize',
        });

        organizeButton.addEventListener('click', function () {
            state.view = 'schedule';
            state.pickerOpen = false;
            render();

            if (state.schedule && state.schedule.mode !== 'full') {
                loadSchedule(false, 'full');
            }
        });

        wrapper.append(organizeButton);

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
            ].filter(Boolean).join(' '),
        });
        const timeZone = getSelectedTimezone();
        const timeLabel = formatCompanionStepTime(step, timeZone);
        const label = getCompanionStepLabel(step, now, index, timeLabel);
        const marker = element('div', { className: 'wcc-companion-marker' });
        const body = element('div', { className: 'wcc-companion-body' });

        if (!isGap) {
            body.append(
                element('div', { className: 'wcc-companion-label', text: label }),
                element('h3', { text: step.title })
            );
        }

        if (step.detail) {
            body.append(element('p', { className: 'wcc-companion-detail', text: step.detail }));
        }

        if (step.mapLinks && step.mapLinks.length) {
            body.append(renderMapLinks(step.mapLinks));
        }

        if (step.meta) {
            body.append(element('div', { className: 'wcc-companion-meta', text: step.meta }));
        }

        if (step.session && step.session.speaker_names && step.session.speaker_names.length) {
            body.append(element('div', { className: 'wcc-companion-meta', text: step.session.speaker_names.join(', ') }));
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
        const details = element('details', { className: 'wcc-gap-picker' });
        const timeZone = getSelectedTimezone();

        if (state.openGapKey === gapKey) {
            details.open = true;
        }

        details.append(element('summary', { className: 'wcc-gap-toggle', text: 'Add a session' }));
        details.addEventListener('toggle', function () {
            if (details.open) {
                state.openGapKey = gapKey;
                if (!candidates.length && !state.schedule.gaps_loaded) {
                    loadGapCandidates(gapKey);
                }
            } else if (state.openGapKey === gapKey) {
                state.openGapKey = '';
            }
        });

        if (!candidates.length) {
            details.append(element('div', {
                className: 'wcc-gap-empty',
                text: state.loadingGapKey === gapKey ? 'Loading sessions...' : (state.schedule && state.schedule.gaps_loaded ? 'No sessions fit here.' : 'Open to load sessions.'),
            }));

            return details;
        }

        details.append(renderGapSchedule(candidates, timeZone));

        return details;
    }

    function getGapKey(step) {
        return [step.dayKey || '', step.start || 0, step.end || 0].join(':');
    }

    function renderGapSchedule(candidates, timeZone) {
        const tracks = getTracksForSessions(candidates);
        const grid = element('div', { className: 'wcc-gap-grid' });
        const columns = '64px repeat(' + Math.max(1, tracks.length) + ', minmax(150px, 1fr))';
        const header = element('div', { className: 'wcc-gap-row wcc-gap-header' });

        header.style.gridTemplateColumns = columns;
        header.append(element('div', { className: 'wcc-gap-time' }));
        tracks.forEach(function (track) {
            header.append(element('div', { className: 'wcc-gap-track', text: track }));
        });
        grid.append(header);

        groupSessionsByTime(candidates).forEach(function (slot) {
            const row = element('div', { className: 'wcc-gap-row' });
            const byTrack = groupSessionsByTrack(slot.sessions);

            row.style.gridTemplateColumns = columns;
            row.append(element('div', { className: 'wcc-gap-time', text: formatSlotTime(slot.start, timeZone) }));

            tracks.forEach(function (track) {
                const cell = element('div', { className: 'wcc-gap-cell' });
                (byTrack[track] || []).forEach(function (session) {
                    cell.append(renderGapCandidate(session, timeZone));
                });
                row.append(cell);
            });

            grid.append(row);
        });

        return grid;
    }

    function renderGapCandidate(session, timeZone) {
        const button = element('button', {
            className: 'wcc-gap-candidate',
            type: 'button',
        });
        const meta = [formatSessionTime(session, timeZone)];

        if (session.speaker_names && session.speaker_names.length) {
            meta.push(session.speaker_names.join(', '));
        }

        button.append(
            element('strong', {
                text: state.savingSessionId === session.id ? 'Saving...' : (session.title || 'Untitled session'),
            }),
            element('span', { text: meta.join(' / ') })
        );
        button.disabled = state.savingSessionId !== null;
        button.addEventListener('click', function () {
            toggleSession(session.id);
        });

        return button;
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

    function addSessionToCompanionSchedule(session) {
        if (!state.schedule || !Array.isArray(state.schedule.sessions)) {
            return;
        }

        const sessionId = Number(session.id);
        const exists = state.schedule.sessions.some(function (existing) {
            return Number(existing.id) === sessionId;
        });

        if (!exists) {
            state.schedule.sessions.push(Object.assign({}, session));
            state.schedule.sessions.sort(compareSessions);
        }

        splitLoadedGapsAroundSession(session);
        state.openGapKey = '';
        resetCompanionAnimationState();
    }

    function splitLoadedGapsAroundSession(session) {
        if (!state.schedule || !Array.isArray(state.schedule.gaps) || !session.start) {
            return;
        }

        const timeZone = getSelectedTimezone();
        const sessionId = Number(session.id);
        const sessionStart = Number(session.start);
        const sessionEnd = Number(session.end || session.start);
        const sessionDayKey = getDateKey(sessionStart, timeZone);
        const nextGaps = [];

        state.schedule.gaps.forEach(function (gap) {
            const gapStart = Number(gap.start || 0);
            const gapEnd = Number(gap.end || gapStart);
            const candidates = Array.isArray(gap.candidates) ? gap.candidates.filter(function (candidate) {
                return Number(candidate.id) !== sessionId;
            }) : [];
            const containsSession = gap.day_key === sessionDayKey && gapStart <= sessionStart && sessionEnd <= gapEnd;

            if (!containsSession) {
                nextGaps.push(Object.assign({}, gap, { candidates: candidates }));
                return;
            }

            appendLocalGap(nextGaps, gap.day_key, gapStart, sessionStart, candidates);
            appendLocalGap(nextGaps, gap.day_key, sessionEnd, gapEnd, candidates);
        });

        state.schedule.gaps = nextGaps;
    }

    function appendLocalGap(gaps, dayKey, start, end, candidates) {
        if (end - start < 15 * 60) {
            return;
        }

        gaps.push({
            day_key: dayKey,
            start: start,
            end: end,
            candidates: (candidates || []).filter(function (session) {
                const sessionStart = Number(session.start || 0);
                const sessionEnd = Number(session.end || sessionStart);

                return sessionStart >= start && sessionEnd <= end;
            }),
        });
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
        const relative = 'In ' + formatDurationWords(start - now);

        if (dayDistance === 0) {
            return relative + ' - today at ' + time;
        }

        if (dayDistance === 1) {
            return relative + ' - tomorrow at ' + time;
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
        const plannedSessions = allSessions.filter(function (session) {
            return savedIds.has(session.id) || session.auto;
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
                if (savedSessions.length && dayStartFromSchedule && dayEndFromSchedule) {
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
            const dayStart = dayStartFromSchedule || firstSession.start;
            const arrivalStart = Math.max(dayStart, firstSession.start - 2 * 60 * 60);
            const firstTrackStart = Math.max(arrivalStart, firstSession.start - 10 * 60);
            steps.push({
                type: 'arrival',
                dayKey: group.key,
                start: arrivalStart,
                end: firstTrackStart,
                dayStart: dayStart,
                title: dayIndex === 0 ? 'Arrive at ' + getEventTitle(event) : 'Arrive for Day ' + (dayIndex + 1),
                detail: getEventAddress(event),
                meta: group.label,
                mapLinks: getEventMapLinks(event),
            });

            if (!savedSessions.length) {
                return;
            }

            let currentTrack = '';
            daySessions.forEach(function (session) {
                const isBreak = session.type === 'custom';
                const track = isBreak ? '' : getPrimaryTrack(session);

                if (track && track !== currentTrack) {
                    steps.push({
                        type: 'track',
                        dayKey: group.key,
                        start: Math.max(0, session.start - 10 * 60),
                        end: session.start,
                        title: currentTrack ? 'Switch to ' + track : 'Go to ' + track,
                        detail: '',
                        meta: '',
                    });
                    currentTrack = track;
                }

                steps.push({
                    type: isBreak ? 'break' : 'session',
                    dayKey: group.key,
                    start: session.start,
                    end: session.end || session.start + Math.max(0, Number(session.duration || 0)),
                    title: session.title || 'Untitled session',
                    detail: isBreak ? '' : getPrimaryTrack(session),
                    meta: formatSessionTime(session, timeZone),
                    session: session,
                });
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

    function renderSession(session, savedIds) {
        const isSaved = savedIds.has(session.id);
        const conflicts = isSaved ? getConflictsForSession(session, savedIds) : [];
        const timeZone = getSelectedTimezone();
        const article = element('article', {
            className: [
                'wcc-session',
                isSaved ? 'is-saved' : '',
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
                text: 'Conflicts with ' + conflicts.map(function (conflict) {
                    return conflict.title;
                }).join(', '),
            }));
        }

        const toggle = element('button', {
            className: 'wcc-session-toggle' + (isSaved ? ' is-saved' : ''),
            type: 'button',
            text: state.savingSessionId === session.id ? 'Saving...' : (isSaved ? 'Saved' : 'Save'),
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
            render();
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
        if (state.debugPlaying) {
            return Math.max(50, Math.round(60000 / Math.max(1, state.debugRate)));
        }

        const now = new Date();
        return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    }

    function getNow() {
        return Math.floor(Date.now() / 1000) + state.debugOffsetSeconds;
    }

    function updateDebugPlayback() {
        if (!state.debugPlaying) {
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
        state.debugOffsetSeconds += minutes * 60;
        state.debugLastTick = Date.now();
        render();
    }

    async function setDebugTimeToWordCampStart() {
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

            if (step.type === 'session') {
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

        if (step.type === 'track' && duration) {
            return formatRelativeDuration(duration) + ' before session';
        }

        if (step.type === 'break' && duration) {
            return formatRelativeDuration(duration) + ' break';
        }

        if (step.type === 'session' && duration) {
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

    function formatSignedOffset(seconds) {
        const sign = seconds < 0 ? '-' : '+';

        return sign + formatRelativeDuration(Math.abs(seconds));
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
            parts.push(days + ' day' + (days === 1 ? '' : 's'));
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

        sessions.forEach(function (session) {
            const track = getPrimaryTrack(session);

            if (track && !shouldSpanTracks(session) && tracks.indexOf(track) === -1) {
                tracks.push(track);
            }
        });

        return tracks.length ? tracks : ['Sessions'];
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
        const street = [venue.street_name, venue.street_number].filter(Boolean).join(' ');
        const city = [venue.zip, venue.city].filter(Boolean).join(' ');

        [venue.name, street, city, venue.country].forEach(function (line) {
            if (line && lines.indexOf(line) === -1) {
                lines.push(line);
            }
        });

        if (!lines.length && venue.physical_address) {
            lines.push(venue.physical_address);
        }

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

    function getEventByUrl(eventUrl) {
        return getRenderableEvents().find(function (event) {
            return event.event_url === eventUrl;
        }) || null;
    }

    function getSelectedEvent() {
        return getEventByUrl(state.selectedEventUrl);
    }

    function getSelectedPlan() {
        if (!state.selectedEventUrl || !state.plan || !state.plan.plans) {
            return null;
        }

        return state.plan.plans[state.selectedEventUrl] || null;
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

    function getSelectedTimezone() {
        const selectedEvent = getSelectedEvent();
        const scheduleTimezone = state.schedule && state.schedule.timezone ? state.schedule.timezone : '';
        const eventTimezone = selectedEvent && selectedEvent.timezone ? selectedEvent.timezone : '';

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
        if (!state.schedule || !state.schedule.gaps_loaded) {
            return lazyGaps;
        }

        const gapsByKey = new Map();
        lazyGaps.forEach(function (gap) {
            gapsByKey.set(getGapKey(gap), gap);
        });

        getGapsForDay(dayKey).forEach(function (gap) {
            const key = getGapKey(gap);
            const existing = gapsByKey.get(key) || {};

            gapsByKey.set(key, Object.assign({}, existing, gap, {
                candidates: gap.candidates || existing.candidates || [],
            }));
        });

        return Array.from(gapsByKey.values()).sort(function (a, b) {
            return (a.start || 0) - (b.start || 0);
        });
    }

    function getLazyGapsForDay(sessions, savedIds, dayKey) {
        const savedSessions = sessions.filter(function (session) {
            return savedIds.has(session.id) && session.type !== 'custom' && session.start;
        }).sort(compareSessions);
        const gaps = [];

        if (!savedSessions.length) {
            return gaps;
        }

        const dayStart = getDayStart(dayKey) || savedSessions[0].start;
        const arrivalStart = Math.max(dayStart, savedSessions[0].start - 2 * 60 * 60);
        addLazyGap(gaps, dayKey, arrivalStart, Math.max(arrivalStart, savedSessions[0].start - 10 * 60));

        for (let index = 0; index < savedSessions.length - 1; index++) {
            const current = savedSessions[index];
            const next = savedSessions[index + 1];
            const gapStart = current.end || current.start;
            const gapEnd = Math.max(gapStart, next.start - 10 * 60);

            addLazyGap(gaps, dayKey, gapStart, gapEnd);
        }

        const lastSaved = savedSessions[savedSessions.length - 1];
        addLazyGap(gaps, dayKey, lastSaved.end || lastSaved.start, getDayEnd(dayKey) || lastSaved.end || lastSaved.start);

        return gaps;
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
        if (!state.schedule || !session.start || !session.end) {
            return [];
        }

        return (state.schedule.sessions || []).filter(function (candidate) {
            return candidate.id !== session.id &&
                savedIds.has(candidate.id) &&
                candidate.start &&
                candidate.end &&
                session.start < candidate.end &&
                candidate.start < session.end;
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

        return String(a.title || '').localeCompare(String(b.title || ''));
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
        return {
            selected_event_url: plan && plan.selected_event_url ? plan.selected_event_url : '',
            plans: plan && plan.plans && typeof plan.plans === 'object' ? plan.plans : {},
        };
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
