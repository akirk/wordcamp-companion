(function (WCC) {
    const SCRIPT_BUILD = '20260601.1';
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
        pendingDeletedSessionUndo: null,
        savingCompanionEventUrl: '',
        savingNotePostId: null,
        noteAutosaveTimers: {},
        noteAutosaveStatus: {},
        noteDrafts: {},
        notesExportCopied: false,
        notesExportCopiedType: '',
        notesExportOpen: false,
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
        toast: null,
        shareMode: '',
        shareModeTouched: false,
        importingSharedSchedule: false,
    };

    const nodes = {};
    let clockTimer = null;
    let companionExitTimer = null;

    Object.assign(WCC, {
        SCRIPT_BUILD: SCRIPT_BUILD,
        SUBSTANTIAL_OVERLAP_SECONDS: SUBSTANTIAL_OVERLAP_SECONDS,
        TRACK_CHANGE_LEAD_SECONDS: TRACK_CHANGE_LEAD_SECONDS,
        DEBUG_TIME_SLIDER_RANGE_MINUTES: DEBUG_TIME_SLIDER_RANGE_MINUTES,
        DEBUG_TIME_SLIDER_STEP_MINUTES: DEBUG_TIME_SLIDER_STEP_MINUTES,
        config: config,
        state: state,
        nodes: nodes,
        clockTimer: clockTimer,
        companionExitTimer: companionExitTimer
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
