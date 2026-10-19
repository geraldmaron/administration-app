function withoutRemoved(held, remove) {
    if (remove.length === 0)
        return held;
    const gone = new Set(remove);
    return held.filter((entry) => !gone.has(entry.id));
}
function withAdmitted(held, admit) {
    const seen = new Set(held.map((entry) => entry.id));
    const fresh = admit.filter((entry) => !seen.has(entry.id));
    return fresh.length === 0 ? held : [...held, ...fresh];
}
/** Appends entries whose ids are not already held, and drops the listed ids. */
export function applyDocket(state, effect) {
    const held = state.docket ?? [];
    const kept = withoutRemoved(held, effect.remove ?? []);
    const next = withAdmitted(kept, effect.admit ?? []);
    if (next === held && state.docket !== undefined)
        return state;
    return { ...state, docket: next };
}
