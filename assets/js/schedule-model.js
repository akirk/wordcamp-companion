(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const FALLBACK_DAY_END_HOUR = 18;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function wpApi() {
        return WCC.wpApi.apply(WCC, arguments);
    }
    function getGapKey() {
        return WCC.getGapKey.apply(WCC, arguments);
    }
    function getPrimaryTrack() {
        return WCC.getPrimaryTrack.apply(WCC, arguments);
    }
    function compareTracks() {
        return WCC.compareTracks.apply(WCC, arguments);
    }
    function getDateKey() {
        return WCC.getDateKey.apply(WCC, arguments);
    }
    function formatDate() {
        return WCC.formatDate.apply(WCC, arguments);
    }
    function getValidTimeZone() {
        return WCC.getValidTimeZone.apply(WCC, arguments);
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
        const catalogEvent = getEventByUrl(state.selectedEventUrl) || {};
        const planEvent = selectedPlan.event && typeof selectedPlan.event === 'object'
            ? selectedPlan.event
            : {};
        const scheduleEvent = data.event && typeof data.event === 'object' ? data.event : {};
        const event = mergeEventSnapshots(mergeEventSnapshots(catalogEvent, planEvent), scheduleEvent);

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

    function mergeEventSnapshots(base, update) {
        const merged = Object.assign({}, base || {});

        Object.keys(update || {}).forEach(function (key) {
            const value = update[key];

            if (key === 'venue' && value && typeof value === 'object' && !Array.isArray(value)) {
                merged.venue = mergeEventSnapshots(
                    merged.venue && typeof merged.venue === 'object' ? merged.venue : {},
                    value
                );
                return;
            }

            if (hasEventValue(value)) {
                merged[key] = value;
            }
        });

        return merged;
    }

    function hasEventValue(value) {
        if (Array.isArray(value)) {
            return value.length > 0;
        }

        if (value && typeof value === 'object') {
            return Object.keys(value).length > 0;
        }

        return value !== '' && value !== null && value !== undefined;
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

    function getRenderableEvents() {
        const events = state.events.slice();
        const plannedEvents = getPlannedEvents();

        plannedEvents.forEach(function (plannedEvent) {
            if (plannedEvent && plannedEvent.event_url && !events.some(function (event) {
                return event.event_url === plannedEvent.event_url;
            })) {
                events.unshift(plannedEvent);
            }
        });

        return events;
    }

    function getPlannedEvents() {
        const events = [];
        const plans = state.plan && state.plan.plans && typeof state.plan.plans === 'object' ? state.plan.plans : {};

        Object.keys(plans).forEach(function (eventUrl) {
            const plan = plans[eventUrl] && typeof plans[eventUrl] === 'object' ? plans[eventUrl] : null;
            const event = plan && plan.event ? plan.event : null;

            if (event && event.event_url && !events.some(function (existing) {
                return existing.event_url === event.event_url;
            })) {
                events.push(event);
            }
        });

        return events.sort(compareEvents);
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

    function clearRequestedWccValueFromUrl() {
        if (!window.history || typeof window.history.replaceState !== 'function') {
            return;
        }

        try {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('wcc1')) {
                return;
            }

            url.searchParams.delete('wcc1');
            window.history.replaceState(window.history.state, document.title, url.pathname + url.search + url.hash);
        } catch (error) {
            // Keeping the URL unchanged is safer than interrupting a completed import.
        }
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

    function getCompanionImportUrl(rawWccValue) {
        const base = getCompanionUrl();

        try {
            const url = new URL(base, window.location.href);
            url.searchParams.set('wcc1', rawWccValue);
            return url.toString();
        } catch (error) {
            const separator = base.indexOf('?') === -1 ? '?' : '&';
            return base.replace(/\/?$/, '/') + separator + 'wcc1=' + encodeURIComponent(rawWccValue);
        }
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
        const dayStart = getDayStart(dayKey) || getFirstSessionStart(sessions);

        (sessions || []).forEach(function (session) {
            dayEnd = Math.max(dayEnd, Number(session.end || session.start || 0));
        });

        getGapsForDay(dayKey).forEach(function (gap) {
            dayEnd = Math.max(dayEnd, Number(gap.end || gap.start || 0));
        });

        if (dayStart && dayEnd <= dayStart) {
            dayEnd = Math.max(dayEnd, getFallbackDayEnd(dayKey, dayStart) || 0);
        }

        return dayEnd || null;
    }

    function getFirstSessionStart(sessions) {
        const sortedSessions = (sessions || []).filter(function (session) {
            return session && session.start;
        }).sort(compareSessions);

        return sortedSessions.length ? Number(sortedSessions[0].start || 0) : 0;
    }

    function getFallbackDayEnd(dayKey, dayStart) {
        const fallback = getTimestampForLocalDateTime(dayKey, FALLBACK_DAY_END_HOUR, 0, getSelectedTimezone());

        return fallback && fallback > dayStart ? fallback : null;
    }

    function getTimestampForLocalDateTime(dayKey, hour, minute, timeZone) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey || '');
        if (!match) {
            return null;
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const desiredAsUtc = Math.floor(Date.UTC(year, month - 1, day, hour, minute, 0) / 1000);
        let timestamp = desiredAsUtc;

        for (let index = 0; index < 3; index++) {
            const parts = getLocalDateTimeParts(timestamp, timeZone);
            if (!parts) {
                return null;
            }

            const renderedAsUtc = Math.floor(Date.UTC(
                parts.year,
                parts.month - 1,
                parts.day,
                parts.hour,
                parts.minute,
                parts.second
            ) / 1000);
            const delta = desiredAsUtc - renderedAsUtc;

            if (!delta) {
                return getDateKey(timestamp, timeZone) === dayKey ? timestamp : null;
            }

            timestamp += delta;
        }

        return getDateKey(timestamp, timeZone) === dayKey ? timestamp : null;
    }

    function getLocalDateTimeParts(timestamp, timeZone) {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date(timestamp * 1000));
        const map = {};

        parts.forEach(function (part) {
            map[part.type] = part.value;
        });

        if (!map.year || !map.month || !map.day || !map.hour || !map.minute || !map.second) {
            return null;
        }

        return {
            year: Number(map.year),
            month: Number(map.month),
            day: Number(map.day),
            hour: Number(map.hour) % 24,
            minute: Number(map.minute),
            second: Number(map.second),
        };
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
        addLazyGap(gaps, dayKey, lastSaved.end || lastSaved.start, getKnownDayEnd(dayKey, sessions) || lastSaved.end || lastSaved.start);

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


    Object.assign(WCC, {
        buildLocalCompanionSchedule: buildLocalCompanionSchedule,
        savedSessionPostToSession: savedSessionPostToSession,
        getLocalCompanionDays: getLocalCompanionDays,
        syncSelectedEventScheduleMetadata: syncSelectedEventScheduleMetadata,
        mergeLoadedGapCandidates: mergeLoadedGapCandidates,
        createSavedSessionPost: createSavedSessionPost,
        deleteSavedSessionPost: deleteSavedSessionPost,
        buildSavedSessionMeta: buildSavedSessionMeta,
        listToMeta: listToMeta,
        normalizeSavedSessionPost: normalizeSavedSessionPost,
        metaToList: metaToList,
        metaToUrlList: metaToUrlList,
        findLocalSession: findLocalSession,
        getRenderableEvents: getRenderableEvents,
        getPlannedEvents: getPlannedEvents,
        getAttendingEvents: getAttendingEvents,
        getNoteEvents: getNoteEvents,
        getDefaultNotesEventUrl: getDefaultNotesEventUrl,
        getPlanForEvent: getPlanForEvent,
        isEventShownInCompanion: isEventShownInCompanion,
        shouldOpenCompanionFromPlanSelector: shouldOpenCompanionFromPlanSelector,
        getEventByUrl: getEventByUrl,
        getEventBySlug: getEventBySlug,
        getRequestedWordcampSlug: getRequestedWordcampSlug,
        getRequestedWccValue: getRequestedWccValue,
        clearRequestedWccValueFromUrl: clearRequestedWccValueFromUrl,
        parseWccParameter: parseWccParameter,
        normalizeWccEventUrl: normalizeWccEventUrl,
        isAllowedWordcampHost: isAllowedWordcampHost,
        normalizeWccEventSlug: normalizeWccEventSlug,
        parseWccSessionIds: parseWccSessionIds,
        buildWccEvent: buildWccEvent,
        getWccEventTitle: getWccEventTitle,
        getEventSlug: getEventSlug,
        getEventSlugAliases: getEventSlugAliases,
        getEventSlugWords: getEventSlugWords,
        getEventUrlSlugAliases: getEventUrlSlugAliases,
        normalizeSlugSource: normalizeSlugSource,
        normalizeRouteSlug: normalizeRouteSlug,
        getPlanYourDayUrl: getPlanYourDayUrl,
        getCompanionImportUrl: getCompanionImportUrl,
        getCompanionUrl: getCompanionUrl,
        getNotesUrl: getNotesUrl,
        getSelectedEvent: getSelectedEvent,
        getSelectedPlan: getSelectedPlan,
        ensureSelectedPlan: ensureSelectedPlan,
        getSavedSessionIds: getSavedSessionIds,
        getSavedSessionPost: getSavedSessionPost,
        getSessionNotePost: getSessionNotePost,
        getSessionNotes: getSessionNotes,
        updateSavedSessionNotes: updateSavedSessionNotes,
        addSavedSessionPost: addSavedSessionPost,
        removeSavedSessionPost: removeSavedSessionPost,
        getSelectedTimezone: getSelectedTimezone,
        getDayStart: getDayStart,
        getDayEnd: getDayEnd,
        getKnownDayEnd: getKnownDayEnd,
        getScheduleDayKeys: getScheduleDayKeys,
        getCompanionDayGroups: getCompanionDayGroups,
        getGapsForDay: getGapsForDay,
        getCompanionGapsForDay: getCompanionGapsForDay,
        getEmptyDayGapsForDay: getEmptyDayGapsForDay,
        mergeLoadedGaps: mergeLoadedGaps,
        isGapLoaded: isGapLoaded,
        hasGapCandidates: hasGapCandidates,
        getLazyGapsForDay: getLazyGapsForDay,
        getSavedTimeBlocks: getSavedTimeBlocks,
        addLazyGap: addLazyGap,
        getConflictsForSession: getConflictsForSession,
        getConflictCount: getConflictCount,
        sessionsOverlap: sessionsOverlap,
        sessionsOverlapSeconds: sessionsOverlapSeconds,
        sessionsSubstantiallyOverlap: sessionsSubstantiallyOverlap,
        sessionHasSubstantialOverlapWithBlock: sessionHasSubstantialOverlapWithBlock,
        sessionOverlapsAny: sessionOverlapsAny,
        groupSessionsByDay: groupSessionsByDay,
        compareSessions: compareSessions,
        compareEvents: compareEvents,
        normalizePlan: normalizePlan,
        normalizeSettings: normalizeSettings,
        isDebugClockEnabled: isDebugClockEnabled
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
