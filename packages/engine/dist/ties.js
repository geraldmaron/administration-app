import { grievanceHalfLifeDays, retained } from "./relationships.js";
import { elapsedDays } from "./pace.js";
// The one place a tie is read and the one place it is written.
//
// A tie is written only by `apply`, through the `tie` effect, and every write
// names its cause: a member who turned cold has to be explainable from the
// record, or the whip count is a number the player cannot argue with.
/** Neither warm nor cold. What a person nobody has dealt with reads as. */
export const NEUTRAL_RAPPORT = 0.5;
/** Neither proven nor broken. */
export const NEUTRAL_TRUST = 0.5;
/** The tie someone holds before anything the President did has reached them. */
export const EMPTY_TIE = { rapport: NEUTRAL_RAPPORT, trust: NEUTRAL_TRUST, favors: [], grudges: [] };
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
export function tieOf(people, person) {
    return people[person]?.tie;
}
export function rapportOf(people, person) {
    return tieOf(people, person)?.rapport ?? NEUTRAL_RAPPORT;
}
/** People have no vengefulness trait; their dated injuries use the shared midpoint half-life. */
export function personalGrudgeWeight(campaign, person) {
    return (tieOf(campaign.people, person)?.grudges ?? []).reduce((sum, grudge) => sum + grudge.weight * retained(elapsedDays(campaign.turn - grudge.turn), grievanceHalfLifeDays(0.5)), 0);
}
/** How warm the member holding a Hill post is toward the administration. */
export function figureRapport(people, figure) {
    return rapportOf(people, figure.person);
}
/** The same people, with one person's rapport read as something else: for a projection, never a write. */
export function withRapportRead(people, person, rapport) {
    const runtime = people[person];
    if (!runtime)
        return people;
    return { ...people, [person]: { ...runtime, tie: { ...(runtime.tie ?? EMPTY_TIE), rapport } } };
}
/**
 * Every favor the President still owes, oldest first.
 *
 * Ordered by when it was given and then by id, which is the order the ledger
 * recorded them in, so a sum over them adds in the same order every time.
 */
export function openFavorsOwedByPresident(campaign) {
    return Object.values(campaign.people)
        .flatMap((runtime) => (runtime.tie?.favors ?? [])
        .filter((favor) => favor.status === "open" && favor.direction === "owed-by-president")
        .map((favor) => ({ ...favor, holder: runtime.base.id })))
        .sort((a, b) => a.openedTurn - b.openedTurn || a.id.localeCompare(b.id));
}
function movedRapport(tie, change) {
    if (change === undefined)
        return tie.rapport;
    if ("set" in change)
        return change.set;
    return round3(clamp01(tie.rapport + change.delta));
}
function settled(favors, settlement) {
    if (!settlement)
        return favors;
    if (!favors.some((favor) => favor.id === settlement.id)) {
        throw new Error(`tie: no favor ${settlement.id} to settle`);
    }
    return favors.map((favor) => favor.id === settlement.id ? { ...favor, status: settlement.status, settledTurn: settlement.turn } : favor);
}
function changedTie(tie, effect) {
    const opened = effect.openFavor ? [...tie.favors, effect.openFavor] : tie.favors;
    return {
        rapport: movedRapport(tie, effect.rapport),
        trust: effect.trust ? round3(clamp01(tie.trust + effect.trust.delta)) : tie.trust,
        favors: settled(opened, effect.settleFavor),
        grudges: effect.grudge ? [...tie.grudges, effect.grudge] : tie.grudges,
    };
}
/** One tie effect folded into a people table. The handler `apply` runs, and the one founding seats the Hill with. */
export function withTie(people, effect) {
    if (!effect.cause.trim())
        throw new Error("tie effect rejected: a cause is required");
    const runtime = people[effect.person];
    if (!runtime)
        throw new Error(`no person ${effect.person} to apply a tie effect to`);
    return { ...people, [effect.person]: { ...runtime, tie: changedTie(runtime.tie ?? EMPTY_TIE, effect) } };
}
export function applyTie(state, effect) {
    return { ...state, people: withTie(state.people, effect) };
}
/**
 * Settle every open favor the President owes on a bill: repaid when it became
 * law, defaulted when it died. Part of writing the bill, so no law or death can
 * leave a claim on it open.
 */
export function settleFavorsOnBill(state, billId, status, turn) {
    const due = openFavorsOwedByPresident(state).filter((favor) => favor.billId === billId);
    if (due.length === 0)
        return state;
    const cause = status === "repaid" ? "The bill they were promised became law." : "The bill they were promised died.";
    const people = due.reduce((current, favor) => withTie(current, { kind: "tie", person: favor.holder, cause, settleFavor: { id: favor.id, status, turn } }), state.people);
    return { ...state, people: people };
}
