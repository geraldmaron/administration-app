import { FOREIGN_POLITICS_RECENT_WINDOW, } from "./state-world.js";
export function applyMarkets(state, effect) {
    return { ...state, markets: effect.set };
}
export function applyMunitions(state, effect) {
    return { ...state, munitions: effect.set };
}
export function applyLeadership(state, effect) {
    const current = state.foreignPolitics ?? { seats: {}, recent: [] };
    const recent = effect.change ? [...current.recent, effect.change].slice(-FOREIGN_POLITICS_RECENT_WINDOW) : current.recent;
    const seated = effect.seat || effect.change
        ? { ...state, foreignPolitics: { seats: effect.seat ? { ...current.seats, [effect.nation]: effect.seat } : current.seats, recent } }
        : state;
    if (!effect.coverage)
        return seated;
    const coverage = { ...(state.foreignCoverage ?? {}), [effect.nation]: effect.coverage };
    return { ...seated, foreignCoverage: coverage };
}
// An ended operation is kept for as long as anything still reads it: the
// tempo caps look back one term, and a successor's lean decays over four
// half-lives of two years each.
const REGIME_KEEP_TURNS = 416;
function lastTouched(operation) {
    return Math.max(operation.startedTurn, operation.endedTurn ?? 0, operation.installed?.turn ?? 0);
}
export function applyRegime(state, effect) {
    const current = state.regimeOperations?.operations ?? [];
    const known = current.some((operation) => operation.id === effect.upsert.id);
    const next = known ? current.map((operation) => (operation.id === effect.upsert.id ? effect.upsert : operation)) : [...current, effect.upsert];
    const kept = next.filter((operation) => operation.status === "running" || lastTouched(operation) >= state.turn - REGIME_KEEP_TURNS);
    return { ...state, regimeOperations: { ...state.regimeOperations, operations: kept } };
}
export function applyIndictment(state, effect) {
    const operations = state.regimeOperations?.operations ?? [];
    const current = state.regimeOperations?.indictments ?? [];
    const known = current.some((entry) => entry.id === effect.upsert.id);
    const next = known ? current.map((entry) => (entry.id === effect.upsert.id ? effect.upsert : entry)) : [...current, effect.upsert];
    return { ...state, regimeOperations: { operations, indictments: next } };
}
export function applyMembership(state, effect) {
    const runtime = state.nations[effect.nation];
    if (!runtime)
        throw new Error(`membership: no nation ${effect.nation}`);
    const current = runtime.memberships ?? runtime.base.memberships;
    const memberships = effect.change === "accede"
        ? current.includes(effect.org)
            ? current
            : [...current, effect.org]
        : current.filter((org) => org !== effect.org);
    return { ...state, nations: { ...state.nations, [effect.nation]: { ...runtime, memberships } } };
}
