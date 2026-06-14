(function (WCC) {
    const state = WCC.state;
    const nodes = WCC.nodes;

    function element() {
        return WCC.element.apply(WCC, arguments);
    }

    function getRenderableEvents() {
        return WCC.getRenderableEvents.apply(WCC, arguments);
    }

    function formatEventRange() {
        return WCC.formatEventRange.apply(WCC, arguments);
    }

    function selectEvent() {
        return WCC.selectEvent.apply(WCC, arguments);
    }

    function selectEventForMobileCompanion() {
        return WCC.selectEventForMobileCompanion.apply(WCC, arguments);
    }

    function setEventCompanionVisibility() {
        return WCC.setEventCompanionVisibility.apply(WCC, arguments);
    }

    function isEventShownInCompanion() {
        return WCC.isEventShownInCompanion.apply(WCC, arguments);
    }

    function shouldOpenCompanionFromPlanSelector() {
        return WCC.shouldOpenCompanionFromPlanSelector.apply(WCC, arguments);
    }

    function getPlanYourDayUrl() {
        return WCC.getPlanYourDayUrl.apply(WCC, arguments);
    }

    function renderCompanionVisibilityButton() {
        return WCC.renderCompanionVisibilityButton.apply(WCC, arguments);
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

    Object.assign(WCC, {
        renderEvents: renderEvents,
        activateEventCard: activateEventCard,
        activatePlanSelectorEvent: activatePlanSelectorEvent,
        createEventCompanionToggle: createEventCompanionToggle
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
