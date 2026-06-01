(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function isCompanionStepCurrent() {
        return WCC.isCompanionStepCurrent.apply(WCC, arguments);
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
    function formatTimeOnly() {
        return WCC.formatTimeOnly.apply(WCC, arguments);
    }
    function formatDurationWords() {
        return WCC.formatDurationWords.apply(WCC, arguments);
    }
    function getPrimaryTrack() {
        return WCC.getPrimaryTrack.apply(WCC, arguments);
    }
    function formatSlotTime() {
        return WCC.formatSlotTime.apply(WCC, arguments);
    }
    function getEventTitle() {
        return WCC.getEventTitle.apply(WCC, arguments);
    }
    function getEventAddress() {
        return WCC.getEventAddress.apply(WCC, arguments);
    }
    function getEventMapLinks() {
        return WCC.getEventMapLinks.apply(WCC, arguments);
    }
    function getSelectedEvent() {
        return WCC.getSelectedEvent.apply(WCC, arguments);
    }
    function getSavedSessionIds() {
        return WCC.getSavedSessionIds.apply(WCC, arguments);
    }
    function getSelectedTimezone() {
        return WCC.getSelectedTimezone.apply(WCC, arguments);
    }
    function getDayStart() {
        return WCC.getDayStart.apply(WCC, arguments);
    }
    function getKnownDayEnd() {
        return WCC.getKnownDayEnd.apply(WCC, arguments);
    }
    function getScheduleDayKeys() {
        return WCC.getScheduleDayKeys.apply(WCC, arguments);
    }
    function getCompanionDayGroups() {
        return WCC.getCompanionDayGroups.apply(WCC, arguments);
    }
    function getCompanionGapsForDay() {
        return WCC.getCompanionGapsForDay.apply(WCC, arguments);
    }
    function getEmptyDayGapsForDay() {
        return WCC.getEmptyDayGapsForDay.apply(WCC, arguments);
    }
    function sessionsOverlap() {
        return WCC.sessionsOverlap.apply(WCC, arguments);
    }
    function sessionsOverlapSeconds() {
        return WCC.sessionsOverlapSeconds.apply(WCC, arguments);
    }
    function sessionsSubstantiallyOverlap() {
        return WCC.sessionsSubstantiallyOverlap.apply(WCC, arguments);
    }
    function sessionHasSubstantialOverlapWithBlock() {
        return WCC.sessionHasSubstantialOverlapWithBlock.apply(WCC, arguments);
    }
    function sessionOverlapsAny() {
        return WCC.sessionOverlapsAny.apply(WCC, arguments);
    }
    function compareSessions() {
        return WCC.compareSessions.apply(WCC, arguments);
    }
    function formatSessionTime() {
        return WCC.formatSessionTime.apply(WCC, arguments);
    }
    function formatDuration() {
        return WCC.formatDuration.apply(WCC, arguments);
    }
    function getCalendarDayDistance() {
        return WCC.getCalendarDayDistance.apply(WCC, arguments);
    }
    function formatDate() {
        return WCC.formatDate.apply(WCC, arguments);
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

                if (block.type === 'overlap') {
                    const overlapNote = getChoiceOverlapNote(block.sessions);

                    block.sessions.forEach(function (overlapSession, overlapIndex) {
                        const overlapTrack = getPrimaryTrack(overlapSession);
                        const overlapEnd = overlapSession.end ||
                            overlapSession.start + Math.max(0, Number(overlapSession.duration || 0));

                        if (overlapTrack && overlapTrack !== currentTrack) {
                            if (overlapIndex === 0) {
                                const trackWindow = getTrackChangeWindow(overlapSession.start, occupiedUntil);

                                if (trackWindow) {
                                    steps.push({
                                        type: 'track',
                                        dayKey: group.key,
                                        start: trackWindow.start,
                                        end: trackWindow.end,
                                        title: currentTrack ? 'Switch to ' + overlapTrack : 'Go to ' + overlapTrack,
                                        detail: '',
                                        meta: '',
                                    });
                                }
                            } else {
                                // Overlapping sessions share a slot, so there is no real gap to
                                // place a lead-in window. Emit an inline marker that sorts like a
                                // session (see getStepSortWeight) so it lands between the two cards.
                                steps.push({
                                    type: 'track',
                                    dayKey: group.key,
                                    start: overlapSession.start,
                                    end: overlapSession.start,
                                    title: 'Switch to ' + overlapTrack,
                                    detail: '',
                                    meta: '',
                                    inline: true,
                                });
                            }
                            currentTrack = overlapTrack;
                        }

                        steps.push({
                            type: 'session',
                            dayKey: group.key,
                            start: overlapSession.start,
                            end: overlapEnd,
                            title: overlapSession.title || 'Untitled session',
                            detail: overlapTrack,
                            meta: formatSessionTime(overlapSession, timeZone),
                            session: overlapSession,
                            note: overlapIndex === 0 ? overlapNote : '',
                        });
                        occupiedUntil = Math.max(occupiedUntil, overlapEnd || overlapSession.start || 0);
                    });
                    currentTrack = '';
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
                type: 'overlap',
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

    function getChoiceOverlapNote(sessions) {
        if (!sessions || sessions.length < 2) {
            return '';
        }

        const overlapSeconds = sessionsOverlapSeconds(sessions[0], sessions[1]);

        if (!overlapSeconds) {
            return __('Overlaps with next session');
        }

        return sprintf(__('Overlaps with next session by %s'), formatDuration(overlapSeconds));
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
            return candidate.title || __('another saved session');
        });

        if (overlaps.length > 2) {
            names.push(sprintf(__('%d more'), overlaps.length - 2));
        }

        return sprintf(
            _n(
                'Heads up: %1$s runs until %2$s, so there is a %3$s overlap.',
                'Heads up: %1$s run until %2$s, so there is a %3$s overlap.',
                overlaps.length
            ),
            names.join(', '),
            formatSlotTime(latestEnd, timeZone),
            formatDuration(longestOverlap)
        );
    }

    function getStepSortWeight(step) {
        if (step.type === 'arrival') {
            return 0;
        }

        if (step.type === 'track') {
            // Inline track markers sit between two overlapping sessions that share a
            // start time, so they must sort alongside sessions (not ahead of them).
            return step.inline ? 2 : 1;
        }

        return 2;
    }

    Object.assign(WCC, {
        getCompanionStepLabel: getCompanionStepLabel,
        formatUpcomingStepLabel: formatUpcomingStepLabel,
        buildCompanionTimeline: buildCompanionTimeline,
        getCompanionSessionBlocks: getCompanionSessionBlocks,
        getChoiceOverlapNote: getChoiceOverlapNote,
        getTrackChangeWindow: getTrackChangeWindow,
        getSessionOverlapWarning: getSessionOverlapWarning,
        getStepSortWeight: getStepSortWeight
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
