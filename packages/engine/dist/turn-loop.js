import { advanceImpactEvents } from "./impact-lifecycle.js";
import { advanceCalendar } from "./calendar.js";
import { recordReleases } from "./economic-releases.js";
import { foldIntoArchive } from "./economy-archive.js";
import { apply } from "./effects.js";
import { OPINION_WEEK_SUMMARY, polarizationRiseThisTurn, recomputeApproval } from "./opinion.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { maxWeeklyRise } from "./polarization.js";
import { withOpinionSample } from "./opinion-record.js";
import { withRelationsSample } from "./relations-record.js";
import { orderExpiryPhase } from "./order-lifecycle.js";
import { stateApprovalSample } from "./regional-opinion.js";
// The turn loop driving hybrid pacing: the player ends a turn, the world
// simulates (NPCs, operators, drift accounting), content is selected, and
// the next turn opens. simulate always runs before select, in that fixed
// order, regardless of what either phase produces.
//
// A phase may be given as one function or as an ordered list of them, and a
// list runs sequentially: each step is planned against the state the step
// before it produced, not against the state the turn opened on. That is what
// makes a phase order mean anything. An order exists so that a later phase
// can read what an earlier one wrote this week — the chamber's mood read off
// the week that just happened, the arc read off a mandate the public has
// already revised — and under a shared turn-start snapshot none of those
// reads reach the write they name.
export { DAYS_PER_TURN } from "./turn-clock.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
// Roughly half a year of weekly turns. Long enough that a sparkline shows a
// trend rather than the last two moves; short enough that a save's size is
// bounded no matter how long a campaign runs.
export const METRIC_HISTORY_WINDOW = 24;
export const noopPhase = () => [];
export const defaultTurnPhases = { simulate: noopPhase, select: noopPhase };
function applyPackets(state, packets, turn) {
    return packets.reduce((acc, packet) => apply(acc, { ...packet, turn }), state);
}
// Every step sees the country the steps before it have already moved. Packets
// still reach apply() in list order, so the ledger reads the same way it always
// did; what changes is which state each step plans against.
export function runPhase(state, phases, turn) {
    const steps = typeof phases === "function" ? [phases] : phases;
    return steps.reduce((before, step) => applyPackets(before, step(before), turn), state);
}
/**
 * The joint ceiling on how much one week may divide the country.
 *
 * Every writer caps its own emission, but no writer can see the sum, and a turn
 * where three of them fire is still one week. This is the only scope that holds
 * both the turn-start figure and the state every writer has finished moving, so
 * it is the only place the sum can be capped once rather than per writer.
 *
 * `opening` is the true start of the week — reconstructed by
 * `polarizationRiseThisTurn` rather than read live off `state` — because a
 * scenario decision commits through `apply()` before `advanceTurn` is ever
 * called. A live snapshot taken here would already carry whatever those
 * decisions added, and this ceiling would then hand the phases below it a
 * second full allowance on top of theirs. Reconstructing the true opening is
 * what makes this one joint ceiling for the whole week rather than one per
 * caller.
 *
 * Only the rise is capped, at what one fully divisive week does to the stock
 * from where it opened: the weeks give division back without a ceiling.
 * Applied directly rather than through a packet because a clamp is bookkeeping
 * and not something that happened to the country — a ledger line for it would
 * be a week's event the player is owed no explanation of. The headline is
 * resettled here for exactly that reason: this is the one move of the public
 * that does not go through `apply()`, so it is the one place that has to say so.
 */
function capTurnPolarization(state, opening) {
    const ceiling = opening + maxWeeklyRise(opening);
    if (state.player.opinion.polarization <= ceiling)
        return state;
    const opinion = { ...state.player.opinion, polarization: ceiling };
    return recomputeApproval({ ...state, player: { ...state.player, opinion } });
}
/**
 * The most the world's recurring writers may move one judgment in a week,
 * other than the public's own weekly revision, in either direction.
 *
 * A judgment is an impression the country revises toward what it can see; a
 * phase that set it directly every week was a second, unexplained account of
 * the public, and summed without limit over a term. Anything recurring that
 * should move a judgment further belongs in its targets, where the cause is
 * named, and fast revision while the story is on the front page delivers steep
 * moves without a direct write. A decision is not recurring: its one-time
 * consequence for the public is what the decision did, and is not budgeted.
 */
export const WEEKLY_DIRECT_MOOD_BUDGET = 0.05;
/** What the turn's recurring background writers, other than the weekly revision, have moved each judgment by, net. */
export function directMoodThisTurn(campaign) {
    const sums = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, 0]));
    for (let i = campaign.ledger.length - 1; i >= 0; i -= 1) {
        const entry = campaign.ledger[i];
        if (entry.turn !== campaign.turn)
            break;
        if (!entry.background || entry.description === OPINION_WEEK_SUMMARY || !entry.mood)
            continue;
        for (const driver of OPINION_DRIVERS)
            sums[driver] += entry.mood[driver] ?? 0;
    }
    return sums;
}
/**
 * Hold each judgment's direct movement this week inside the budget, after
 * every writer has had its say. Applied directly, like the polarization
 * ceiling, because a clamp is bookkeeping rather than something that happened.
 */
function capTurnMood(state) {
    const direct = directMoodThisTurn(state);
    let opinion = state.player.opinion;
    for (const driver of OPINION_DRIVERS) {
        const excess = Math.abs(direct[driver]) - WEEKLY_DIRECT_MOOD_BUDGET;
        if (excess <= 0)
            continue;
        const value = opinion[driver] - Math.sign(direct[driver]) * excess;
        opinion = { ...opinion, [driver]: Math.max(0, Math.min(1, value)) };
    }
    return opinion === state.player.opinion ? state : { ...state, player: { ...state.player, opinion } };
}
/**
 * Two years of the United States economy as each week closed, at weekly
 * resolution. Older weeks are not dropped: they fold into a monthly archive
 * (`economy-archive.ts`), so a long presidency keeps its whole course at the
 * resolution the comparison charts read, and the weekly ring stays two years.
 */
export const ECONOMY_HISTORY_WINDOW = 104;
function economySample(state, turn) {
    const economy = state.nations[state.founding.nation]?.stats.economy;
    if (!economy)
        return undefined;
    const { growth, inflation, unemployment, costOfLiving } = economy;
    return { turn, growth, inflation, unemployment, costOfLiving };
}
function withEconomySample(state, turn) {
    const sample = economySample(state, turn);
    const history = state.economyHistory ?? [];
    if (!sample)
        return { economyHistory: history, ...(state.economyArchive ? { economyArchive: state.economyArchive } : {}) };
    const all = [...history, sample];
    const leaving = all.slice(0, Math.max(0, all.length - ECONOMY_HISTORY_WINDOW));
    const archive = foldIntoArchive(state.economyArchive ?? [], leaving);
    return { economyHistory: all.slice(-ECONOMY_HISTORY_WINDOW), ...(archive.length > 0 ? { economyArchive: archive } : {}) };
}
function withStateApprovalSample(state, opening) {
    const history = state.stateApprovalHistory ?? [];
    return opening.stateApproval ? [...history, opening.stateApproval].slice(-METRIC_HISTORY_WINDOW) : history;
}
/**
 * What the week is measured from: the figures as it opened, read before any
 * phase or office day moves them. The one builder, so the weekly tick and the
 * office-day clock record the same opening.
 */
export function openWeek(state) {
    return {
        metrics: state.player.metrics,
        pressure: state.removal.pressure,
        polarization: state.player.opinion.polarization - polarizationRiseThisTurn(state),
        stateApproval: stateApprovalSample(state, state.turn),
    };
}
export function closeWeek(state, phases, opening) {
    const nextTurn = state.turn + 1;
    const afterSelect = capTurnMood(capTurnPolarization(runPhase(state, phases.select, nextTurn), opening.polarization));
    const { week, ...rest } = afterSelect;
    void week;
    return recomputeApproval({
        ...rest,
        turn: nextTurn,
        ...withEconomySample(afterSelect, nextTurn),
        stateApprovalHistory: withStateApprovalSample(afterSelect, opening),
        // Read once, after every phase and the polarization ceiling have settled the
        // week, beside the economy's sample and stamped with the same turn.
        opinionRecord: withOpinionSample(afterSelect, nextTurn),
        relationsRecord: withRelationsSample(afterSelect, nextTurn),
        player: {
            ...afterSelect.player,
            metricHistory: [...afterSelect.player.metricHistory, opening.metrics].slice(-METRIC_HISTORY_WINDOW),
        },
        removal: {
            ...afterSelect.removal,
            pressureHistory: [...afterSelect.removal.pressureHistory, opening.pressure].slice(-METRIC_HISTORY_WINDOW),
        },
    });
}
export function tickWeek(state, phases = defaultTurnPhases) {
    return closeWeek(runPhase(state, phases.simulate, state.turn + 1), phases, openWeek(state));
}
export function advanceTurn(state, phases = defaultTurnPhases) {
    // Fix the week now closing before the step moves the economy, then the week it opens after.
    const ticked = tickWeek(recordReleases(state), phases);
    const dated = { ...ticked, calendar: advanceCalendar(ticked.calendar, DAYS_PER_TURN) };
    return recordReleases(advanceImpactEvents(runPhase(dated, orderExpiryPhase, dated.turn)));
}
