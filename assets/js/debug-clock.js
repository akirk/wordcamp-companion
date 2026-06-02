(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function isEditingNotes() {
        return WCC.isEditingNotes.apply(WCC, arguments);
    }
    function loadSchedule() {
        return WCC.loadSchedule.apply(WCC, arguments);
    }
    function render() {
        return WCC.render.apply(WCC, arguments);
    }
    function renderDebugClock() {
        return WCC.renderDebugClock.apply(WCC, arguments);
    }
    function getFirstCompanionStart() {
        return WCC.getFirstCompanionStart.apply(WCC, arguments);
    }
    function isDebugClockEnabled() {
        return WCC.isDebugClockEnabled.apply(WCC, arguments);
    }

    function startClock() {
        if (WCC.clockTimer) {
            return;
        }

        WCC.clockTimer = window.setTimeout(function () {
            WCC.clockTimer = null;
            updateDebugPlayback();
            if (state.page === 'notes' || isEditingNotes()) {
                renderDebugClock();
            } else {
                render({ companionInPlace: true });
            }
            startClock();
        }, getClockDelay());
    }

    function restartClock() {
        if (WCC.clockTimer) {
            window.clearTimeout(WCC.clockTimer);
            WCC.clockTimer = null;
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

    Object.assign(WCC, {
        startClock: startClock,
        restartClock: restartClock,
        getClockDelay: getClockDelay,
        getNow: getNow,
        updateDebugPlayback: updateDebugPlayback,
        jumpDebugTime: jumpDebugTime,
        setDebugTimeToWordCampStart: setDebugTimeToWordCampStart,
        adjustDebugTimeFromSlider: adjustDebugTimeFromSlider,
        commitDebugTimeAdjustment: commitDebugTimeAdjustment,
        clearDebugTimeAdjustment: clearDebugTimeAdjustment
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
