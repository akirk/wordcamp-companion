(function (WCC) {
    const state = WCC.state;

    function startClock() {
        if (WCC.clockTimer) {
            return;
        }

        WCC.clockTimer = window.setTimeout(function () {
            WCC.clockTimer = null;
            if (typeof WCC.render === 'function') {
                WCC.render({ companionInPlace: true });
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
        const now = new Date();
        return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    }

    function getNow() {
        return Math.floor(Date.now() / 1000);
    }

    function updateDebugPlayback() {}
    function jumpDebugTime() {}
    function setDebugTimeToWordCampStart() {}
    function adjustDebugTimeFromSlider() {}
    function commitDebugTimeAdjustment() {}

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
