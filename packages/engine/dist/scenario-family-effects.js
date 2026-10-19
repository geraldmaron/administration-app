export function applyScenarioFamily(state, effect) {
    let families = state.scenarioFamilies;
    if (effect.open) {
        const { family } = effect.open;
        const existing = families[family];
        // Only an answer replaces a raise: a raise that finds a run changes
        // nothing, so a re-raise cannot move the pinned place.
        if (!(existing && effect.open.unanswered)) {
            families = { ...families, [family]: openedRun(existing, effect.open) };
        }
    }
    if (effect.expire && families[effect.expire.family]?.unanswered) {
        const { [effect.expire.family]: _dropped, ...rest } = families;
        families = rest;
    }
    if (effect.beat) {
        const { family, scenario, turn } = effect.beat;
        const existing = families[family];
        if (existing) {
            families = {
                ...families,
                [family]: { ...existing, lastTurn: turn, beats: [...existing.beats, scenario] },
            };
        }
    }
    if (effect.close) {
        const existing = families[effect.close.family];
        if (existing && existing.closedTurn === undefined) {
            const { place: _place, ...kept } = existing;
            families = {
                ...families,
                [existing.family]: { ...kept, closedTurn: effect.close.turn, disposition: effect.close.disposition },
            };
        }
    }
    const placed = effect.callback ? withCallbackPlaces(state, effect.callback) : state;
    return families === state.scenarioFamilies ? placed : { ...placed, scenarioFamilies: families };
}
// An opener for a family already running is a beat, not a second opening:
// re-pinning would move the arc's country mid-arc, which is the whole defect
// the family exists to close. The one exception is the answer to a raised
// opener, which makes the pinned thread live and keeps the place it was raised
// in.
function openedRun(existing, open) {
    const { family, counterpart, scenario, turn, title, place } = open;
    if (existing?.unanswered) {
        const { unanswered: _raised, ...answered } = existing;
        return {
            ...answered,
            counterpart,
            lastTurn: turn,
            beats: existing.beats.includes(scenario) ? existing.beats : [...existing.beats, scenario],
            ...(title ? { title } : {}),
            ...(existing.place ?? place ? { place: existing.place ?? place } : {}),
        };
    }
    if (existing)
        return { ...existing, lastTurn: turn, beats: [...existing.beats, scenario] };
    return {
        family,
        counterpart,
        openedTurn: turn,
        lastTurn: turn,
        beats: [scenario],
        ...(open.unanswered ? { unanswered: true } : {}),
        ...(title ? { title } : {}),
        ...(place ? { place } : {}),
    };
}
function withCallbackPlaces(state, callback) {
    const current = state.flagPlaces ?? {};
    const { place } = callback;
    const next = place
        ? { ...current, ...Object.fromEntries(callback.flags.map((flag) => [flag, place])) }
        : Object.fromEntries(Object.entries(current).filter(([flag]) => !callback.flags.includes(flag)));
    if (!place && Object.keys(next).length === Object.keys(current).length)
        return state;
    return { ...state, flagPlaces: next };
}
