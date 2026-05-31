(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function api() {
        return WCC.api.apply(WCC, arguments);
    }
    function buildCompanionTimeline() {
        return WCC.buildCompanionTimeline.apply(WCC, arguments);
    }
    function compareSessions() {
        return WCC.compareSessions.apply(WCC, arguments);
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

    Object.assign(WCC, {
        formatDebugTimeAdjustment: formatDebugTimeAdjustment,
        getFirstCompanionStart: getFirstCompanionStart,
        isCompanionStepPast: isCompanionStepPast,
        isCompanionStepCurrent: isCompanionStepCurrent,
        formatCompanionTiming: formatCompanionTiming,
        formatScheduledStepTiming: formatScheduledStepTiming,
        formatArrivalTiming: formatArrivalTiming,
        formatArrivalOffset: formatArrivalOffset,
        formatCompanionStepTime: formatCompanionStepTime,
        formatTimeOnly: formatTimeOnly,
        formatRelativeDuration: formatRelativeDuration,
        formatHumanDuration: formatHumanDuration,
        formatDurationWords: formatDurationWords,
        getPrimaryTrack: getPrimaryTrack,
        getTracksForSessions: getTracksForSessions,
        compareTracks: compareTracks,
        getScheduleTrackOrder: getScheduleTrackOrder,
        normalizeTrackName: normalizeTrackName,
        groupSessionsByTime: groupSessionsByTime,
        groupSessionsByTrack: groupSessionsByTrack,
        shouldSpanTracks: shouldSpanTracks,
        formatSlotTime: formatSlotTime,
        getEventTitle: getEventTitle,
        getEventAddress: getEventAddress,
        getEventMapLinks: getEventMapLinks,
        formatEventRange: formatEventRange,
        formatSessionTime: formatSessionTime,
        formatDuration: formatDuration,
        getDateKey: getDateKey,
        getCalendarDayDistance: getCalendarDayDistance,
        getDateParts: getDateParts,
        formatDate: formatDate,
        getValidTimeZone: getValidTimeZone,
        element: element
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
