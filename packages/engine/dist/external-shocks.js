/** Half a year: how long a grant's program, a sabotaged plant or a hiring round shapes the year's direction. */
export const EXTERNAL_SHOCK_WEEKS = 26;
/**
 * The most shocks the campaign keeps. Shocks landing on the same country, of
 * the same kind, in the same week are one entry, so this is room for every
 * country a busy half-year touches, and the oldest go first past it.
 */
export const EXTERNAL_SHOCK_RING = 128;
/** The most a grant can add to a growth target: a development program, not a boom. */
export const GRANT_GROWTH_CAP = 0.02;
function live(shock, turn) {
    return turn >= shock.fromTurn && turn - shock.fromTurn < shock.weeks;
}
const sameEntry = (a, b) => a.nation === b.nation && a.kind === b.kind && a.fromTurn === b.fromTurn;
/** The ring with one more shock in it: merged into its week's entry, expired ones dropped, the oldest past the bound gone. */
export function withShock(shocks, shock, turn) {
    const kept = shocks.filter((entry) => live(entry, turn));
    const same = kept.find((entry) => sameEntry(entry, shock));
    const merged = same
        ? kept.map((entry) => entry === same ? { ...entry, growth: entry.growth + shock.growth, unemployment: entry.unemployment + shock.unemployment } : entry)
        : [...kept, shock];
    return merged.slice(Math.max(0, merged.length - EXTERNAL_SHOCK_RING));
}
export function applyExternalShock(state, effect) {
    return { ...state, externalShocks: withShock(state.externalShocks ?? [], effect.shock, state.turn) };
}
/** A shock dated this week, as the effect that records it. */
export function shockEffect(campaign, nation, kind, shift) {
    return {
        kind: "externalShock",
        shock: { nation, kind, growth: shift.growth ?? 0, unemployment: shift.unemployment ?? 0, fromTurn: campaign.turn, weeks: EXTERNAL_SHOCK_WEEKS },
    };
}
/** What the shocks still standing do to one country's targets this week. */
export function shockPressure(campaign, nation) {
    let growth = 0;
    let unemployment = 0;
    for (const shock of campaign.externalShocks ?? []) {
        if (shock.nation !== nation || !live(shock, campaign.turn))
            continue;
        growth += shock.growth;
        unemployment += shock.unemployment;
    }
    return { growth, unemployment };
}
