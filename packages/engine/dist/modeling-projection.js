import { COHORT_IDS } from "@admin/world";
import { advanceUntilAttention } from "./advance.js";
import { cohortSupport } from "./demos.js";
import { apply } from "./effects.js";
import { campaignIsOver } from "./elections.js";
import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { believedCampaign } from "./projection-belief.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
// The projection's engine half: a pending choice's alternatives, each
// committed on a detached copy of what the government believes (see
// projection-belief.ts) and run forward through the same
// apply() and the same weekly advance the player's Continue runs. Nothing here
// is stored and nothing reaches the live campaign: every run starts from a
// spread copy, and the engine's immutable apply never writes into its input.
//
// Each run of the ensemble uses its own derived seed rather than the
// campaign's. Two reasons. Streams are keyed on the seed, so a derived seed is
// the projection's own stream key and cannot coincide with a draw the live
// campaign will make. And a run on the live seed would be the realized future
// of every uncertain roll the act and the world make, handed to the player
// before they decide; a forecast is the spread across runs the government
// could not tell apart, never the one that will happen.
//
// Every alternative in one ensemble member shares that member's seed, so the
// difference between two alternatives in the same member is the choice and
// not the luck of the draw.
/** The horizons a President can ask for, in weeks. */
export const PROJECTION_HORIZON_WEEKS = [4, 13, 26, 52];
/** Runs per alternative. Five gives a median and a range without making a long horizon wait. */
export const PROJECTION_ENSEMBLE_SIZE = 5;
export const PROJECTION_HEADLINE_METRICS = ["approval", "treasury", "stability", "standing", "militaryReadiness", "removalPressure"];
export function projectionSeed(seed, member) {
    return makeCampaignSeed(`${seed}::projection::${member}`);
}
/** Every figure the workbench draws, read off one projected campaign. */
export function projectionReading(campaign) {
    const { metrics, opinion } = campaign.player;
    const entries = [
        ["approval", metrics.approval],
        ["treasury", metrics.treasury],
        ["stability", metrics.stability],
        ["standing", metrics.standing],
        ["militaryReadiness", metrics.militaryReadiness],
        ["removalPressure", campaign.removal.pressure],
        ...OPINION_DRIVERS.map((driver) => [`judgment:${driver}`, opinion[driver]]),
        ...COHORT_IDS.map((cohort) => [`cohort:${cohort}`, cohortSupport(campaign, cohort)]),
    ];
    return Object.fromEntries(entries);
}
/** Seven daily steps, with the same between-day seating as the running player clock. */
function runWeek(state, options) {
    const settle = options.settle ?? ((campaign) => campaign);
    let working = state;
    for (let day = 0; day < DAYS_PER_TURN; day += 1) {
        const run = advanceUntilAttention(working, { ...options.advance, horizonDays: 1 });
        working = settle(run.campaign);
        if (run.stopReason === "ended" || run.elapsedDays === 0)
            break;
    }
    return working;
}
/** One alternative, one ensemble member, run `weeks` forward on a detached copy. */
export function projectRun(campaign, alternative, options) {
    const head = { alternative: alternative.id, member: options.member };
    const detached = { ...believedCampaign(campaign, options.member, options.basis), seed: projectionSeed(campaign.seed, options.member) };
    const built = alternative.build(detached, createRngStreams(detached.seed));
    if (!built.ok)
        return { ...head, readings: [], refused: built.reason };
    const settle = options.settle ?? ((state) => state);
    let state = settle(built.packets.reduce((working, packet) => apply(working, packet), detached));
    const readings = [projectionReading(state)];
    if (campaignIsOver(state))
        return { ...head, readings, endedWeek: 0 };
    for (let week = 1; week <= options.weeks; week += 1) {
        state = runWeek(state, options);
        readings.push(projectionReading(state));
        options.onWeek?.(week);
        if (campaignIsOver(state))
            return { ...head, readings, endedWeek: week };
    }
    return { ...head, readings };
}
/** Every alternative across the ensemble, alternatives in the order given and members in seed order. */
export function projectAlternatives(campaign, alternatives, options) {
    const members = options.members ?? PROJECTION_ENSEMBLE_SIZE;
    return alternatives.flatMap((alternative) => Array.from({ length: members }, (_, member) => projectRun(campaign, alternative, { ...options, member })));
}
