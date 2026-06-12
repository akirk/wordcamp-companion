(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function loadInitialData() {
        return WCC.loadInitialData.apply(WCC, arguments);
    }
    function loadEvents() {
        return WCC.loadEvents.apply(WCC, arguments);
    }
    function selectEvent() {
        return WCC.selectEvent.apply(WCC, arguments);
    }
    function selectNotesEvent() {
        return WCC.selectNotesEvent.apply(WCC, arguments);
    }
    function setEventCompanionVisibility() {
        return WCC.setEventCompanionVisibility.apply(WCC, arguments);
    }
    function loadSchedule() {
        return WCC.loadSchedule.apply(WCC, arguments);
    }
    function saveSettings() {
        return WCC.saveSettings.apply(WCC, arguments);
    }
    function render() {
        return WCC.render.apply(WCC, arguments);
    }
    function closeShareDialog() {
        return WCC.closeShareDialog.apply(WCC, arguments);
    }
    function closeImportScheduleDialog() {
        return WCC.closeImportScheduleDialog.apply(WCC, arguments);
    }
    function activatePlanSelectorEvent() {
        return WCC.activatePlanSelectorEvent.apply(WCC, arguments);
    }
    function startClock() {
        return WCC.startClock.apply(WCC, arguments);
    }
    function restartClock() {
        return WCC.restartClock.apply(WCC, arguments);
    }
    function updateDebugPlayback() {
        return WCC.updateDebugPlayback.apply(WCC, arguments);
    }
    function jumpDebugTime() {
        return WCC.jumpDebugTime.apply(WCC, arguments);
    }
    function setDebugTimeToWordCampStart() {
        return WCC.setDebugTimeToWordCampStart.apply(WCC, arguments);
    }
    function adjustDebugTimeFromSlider() {
        return WCC.adjustDebugTimeFromSlider.apply(WCC, arguments);
    }
    function commitDebugTimeAdjustment() {
        return WCC.commitDebugTimeAdjustment.apply(WCC, arguments);
    }
    function clearDebugTimeAdjustment() {
        return WCC.clearDebugTimeAdjustment.apply(WCC, arguments);
    }
    function isEventShownInCompanion() {
        return WCC.isEventShownInCompanion.apply(WCC, arguments);
    }
    function getEventByUrl() {
        return WCC.getEventByUrl.apply(WCC, arguments);
    }
    function getSelectedEvent() {
        return WCC.getSelectedEvent.apply(WCC, arguments);
    }
    function parseWccParameter() {
        return WCC.parseWccParameter.apply(WCC, arguments);
    }
    function getCompanionImportUrl() {
        return WCC.getCompanionImportUrl.apply(WCC, arguments);
    }

    function init() {
        nodes.app = document.getElementById('wordcamp-companion-app');
        if (!nodes.app) {
            return;
        }

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
        document.addEventListener('paste', handleSharedSchedulePaste);

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

    function handleSharedSchedulePaste(event) {
        const clipboard = event.clipboardData || window.clipboardData;
        const text = clipboard && typeof clipboard.getData === 'function' ? clipboard.getData('text') : '';
        const rawWccValue = getSharedScheduleWccValueFromText(text);
        const requestedWcc = rawWccValue ? parseWccParameter(rawWccValue) : null;

        if (!requestedWcc) {
            return;
        }

        event.preventDefault();
        closeShareDialog();
        closeImportScheduleDialog();
        window.location.href = getCompanionImportUrl(rawWccValue);
    }

    function getSharedScheduleWccValueFromText(text) {
        const candidates = getSharedScheduleUrlCandidates(text);

        for (let index = 0; index < candidates.length; index++) {
            const value = getSharedScheduleWccValueFromUrl(candidates[index]);
            if (value) {
                return value;
            }
        }

        return '';
    }

    function getSharedScheduleUrlCandidates(text) {
        const value = String(text || '').trim();
        const candidates = [];
        const urlMatches = value.match(/https?:\/\/[^\s<>"']+/g) || [];
        const bareShareMatches = value.match(/\bmy\.wordpress\.net\/[^\s<>"']+/gi) || [];

        urlMatches.forEach(function (candidate) {
            candidates.push(cleanPastedUrlCandidate(candidate));
        });
        bareShareMatches.forEach(function (candidate) {
            candidates.push(cleanPastedUrlCandidate('https://' + candidate));
        });
        if (value) {
            candidates.push(cleanPastedUrlCandidate(value));
        }

        return candidates.filter(Boolean).filter(function (candidate, index, list) {
            return list.indexOf(candidate) === index;
        });
    }

    function cleanPastedUrlCandidate(candidate) {
        return String(candidate || '').trim().replace(/&amp;/g, '&').replace(/[),.;]+$/, '');
    }

    function getSharedScheduleWccValueFromUrl(candidate) {
        try {
            const url = new URL(candidate, window.location.href);
            const value = (url.searchParams.get('wcc1') || '').trim();

            if (!value || !isAllowedSharedScheduleUrl(url)) {
                return '';
            }

            return value;
        } catch (error) {
            return '';
        }
    }

    function isAllowedSharedScheduleUrl(url) {
        const host = url && url.hostname ? url.hostname.toLowerCase() : '';
        const allowedHosts = ['my.wordpress.net', window.location.hostname.toLowerCase()];

        try {
            const shareHost = new URL(config.shareUrl || '', window.location.href).hostname.toLowerCase();
            if (shareHost) {
                allowedHosts.push(shareHost);
            }
        } catch (error) {
            // Ignore malformed configured share URLs; the pasted URL still has to match the app or default share host.
        }

        return allowedHosts.indexOf(host) !== -1;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    Object.assign(WCC, {
        init: init,
        bindEvents: bindEvents,
        isEditingNotes: isEditingNotes,
        handleSharedSchedulePaste: handleSharedSchedulePaste,
        getSharedScheduleWccValueFromText: getSharedScheduleWccValueFromText,
        getSharedScheduleUrlCandidates: getSharedScheduleUrlCandidates,
        cleanPastedUrlCandidate: cleanPastedUrlCandidate,
        getSharedScheduleWccValueFromUrl: getSharedScheduleWccValueFromUrl,
        isAllowedSharedScheduleUrl: isAllowedSharedScheduleUrl
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
