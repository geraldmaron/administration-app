import { governorAnswer } from "./governors.js";
import { markedFlags } from "./marked-flags.js";
import { isFederallyDeployable } from "./response.js";
import { selectConditionsFor } from "./state-selectors.js";
// The historical API name is retained for save/caller compatibility. A
// governor's consent records modeled coordination and its cost; this packet
// does not change military command status or create a federal deployment.
/** The record a refusal or a consent leaves, so the same state is not asked twice inside a season. */
const REQUEST_COOLDOWN_TURNS = 8;
/** Treasury deltas use USD millions, like every other metric packet. */
export const GUARD_SUPPORT_COORDINATION_USD_MILLIONS = 10;
const CONSENT_STABILITY = 0.005;
const ASK_OF = "guard-federalization";
export function guardRequestAnsweredFlag(state, conditionId) {
    return `guard-request-answered:${state}:${conditionId}`;
}
function markedWithin(campaign, flag, turns) {
    const prefix = `flagset:${flag}:`;
    return Object.keys(campaign.player.flags).some((key) => {
        if (!key.startsWith(prefix) || campaign.player.flags[key] !== true)
            return false;
        const turn = Number(key.slice(prefix.length));
        return Number.isFinite(turn) && campaign.turn - turn < turns;
    });
}
/**
 * The condition a state support coordination request would be about: the
 * most severe eligible emergency running there that has not
 * already had an answer this cooldown. Undefined where nothing in the state
 * qualifies, which is what keeps this from ever inventing an ask a real
 * emergency does not back.
 */
export function guardEligibleCondition(campaign, state) {
    return [...selectConditionsFor(campaign, campaign.founding.nation)]
        .filter((condition) => condition.state === state &&
        condition.status === "active" &&
        isFederallyDeployable(condition.kind) &&
        !markedWithin(campaign, guardRequestAnsweredFlag(state, condition.id), REQUEST_COOLDOWN_TURNS))
        .sort((a, b) => b.severity - a.severity)[0];
}
/**
 * What a support coordination request is about, in the terms `governor-consent`
 * weighs. Exported so a Desk card can project the same forecast
 * `requestGuardFederalization` will actually decide from
 * (`projectGovernorWillingness(campaign, state, guardAskFor(condition))`,
 * `governors.ts`), off one terms builder rather than two.
 */
export function guardAskFor(condition) {
    return { severity: condition.severity, of: ASK_OF };
}
/** A consent funds modeled support coordination; legal deployment authority is separate. */
export function requestGuardFederalization(campaign, state, streams) {
    const condition = guardEligibleCondition(campaign, state);
    if (!condition)
        return { ok: false, reason: "No emergency in this state calls for it right now." };
    const answer = governorAnswer(campaign, state, guardAskFor(condition), streams);
    const flag = guardRequestAnsweredFlag(state, condition.id);
    const effects = [
        ...(answer.consents ? [{ kind: "metric", deltas: { treasury: -GUARD_SUPPORT_COORDINATION_USD_MILLIONS, stability: CONSENT_STABILITY } }] : []),
        { kind: "flag", set: markedFlags([flag], campaign.turn) },
    ];
    return {
        ok: true,
        consents: answer.consents,
        packet: { ...answer.packet, effects: [...answer.packet.effects, ...effects] },
    };
}
