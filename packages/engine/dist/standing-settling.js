import { openingExpectations } from "./opening-position.js";
import { selectNation } from "./state.js";
/**
 * How much of the gap to its usual reach the country's standing abroad closes
 * in a week: about a third of a year to close half. Slower than order's
 * settling, because a capital's view of a government is a record of dealings
 * rather than the weather, and a good year of diplomacy should outlast a
 * season. Design judgment, labeled.
 */
export const STANDING_REVERSION = 0.02;
/**
 * Standing settling back toward the reach the country's weight usually buys.
 *
 * Every writer of standing pushed it one way or the other and none pulled it
 * back, so a term's accumulated slights and favors summed without limit and a
 * reading could sit at a bound for years. This pulls it back toward the
 * founding's expectation for a power of this weight, the same resting point
 * the opening position measures it against. Filed in the background: it is the
 * world's memory fading, not something the President did.
 */
export function standingSettling(state) {
    const runtime = selectNation(state, state.founding.nation);
    if (!runtime)
        return undefined;
    const rest = openingExpectations(runtime.base).find((entry) => entry.metric === "standing").opening;
    const pull = Math.round(STANDING_REVERSION * (rest - state.player.metrics.standing) * 10_000) / 10_000;
    if (Math.abs(pull) < 0.0005)
        return undefined;
    return {
        source: "simulate",
        actor: "world",
        turn: state.turn + 1,
        background: true,
        narration: {
            summary: pull > 0 ? "Other governments' view of this one recovers a little toward its usual weight." : "Other governments' regard for this one eases back toward its usual weight.",
        },
        effects: [{ kind: "metric", deltas: { standing: pull } }],
    };
}
