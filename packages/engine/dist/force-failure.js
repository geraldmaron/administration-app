import { openOrEscalate } from "./conflicts.js";
import { spendsReadiness } from "./instruments-military.js";
import { forceIntroduction, named, warPowersRecord } from "./instrument-records.js";
import { possessive, sentenceCase } from "./naming.js";
import { MILITARY_READINESS_GATES } from "./capacity.js";
import { selectNation, selectRelationship } from "./state.js";
// What an act of force that did not land still leaves behind.
//
// Failure on the military ladder was a line in the Record, a little tension
// and a grudge, whichever way it failed. But a blockade or a strike that does
// not land still sent hulls and airframes into hostilities, and the projection
// has always told the player one way of failing is the target hitting back
// harder instead of backing down. That branch did exactly what "nothing was
// gained" did. Both are made real here with machinery the board already has:
// the readiness the force spent, the War Powers record of the introduction,
// and, when the target answers, the war that answer starts.
const ACT_WORDS = {
    3: { attempted: "Blockade attempted; the ports were not closed.", introduced: "Blockade forces entered hostilities." },
    4: { attempted: "Strike attempted; the military objective was not achieved.", introduced: "Strike forces entered hostilities." },
};
/** Planning value: the navy or air arm a government needs to fire on a force sent against it, the floor a blockade is itself stood up out of. */
export const ANSWER_ARM_FLOOR = 0.3;
/**
 * Whether a government can answer an act of force with its own: forces ready
 * enough to take a heavy rung, and a navy or an air arm that reaches the ships
 * or aircraft sent against it. Where it cannot, "hits back harder" is not a way
 * the act can fail, and the projection does not offer it.
 */
export function answersWithForce(campaign, nation) {
    const military = selectNation(campaign, nation)?.stats.military;
    if (!military)
        return false;
    const arm = Math.max(military.branchStrength.naval, military.branchStrength.air);
    return military.readiness >= MILITARY_READINESS_GATES[3] && arm >= ANSWER_ARM_FLOOR;
}
/**
 * Whether "hits back harder" is a way this rung can fail: only an act of force
 * puts a force on the target to fire on, and only a target that can answer
 * does. An exercise or a forward deployment that fails is a signal that did
 * not land, and the projection does not offer a retaliation behind it.
 */
export function hitsBackHarder(campaign, rung, target) {
    return rung >= 3 && answersWithForce(campaign, target);
}
/**
 * The target's answer when a use of force fails by escalation: it fires on the
 * force that came for it, which is a use of force on the record, and the
 * exchange is a war the board carries from here. Started by the government
 * that moved first, so the country whose President moved first does not
 * rally to it (`opinion-war.ts`).
 */
function answeredWithForce(ctx) {
    const target = sentenceCase(named(ctx, ctx.target));
    const actor = named(ctx, ctx.actor);
    const war = {
        kind: "conflict",
        set: openOrEscalate(ctx.campaign, ctx.actor, ctx.target, `${target} answers ${possessive(actor)} use of force with its own.`, "retaliation"),
    };
    // The record of the fire lives on the target's own edge toward the actor; a
    // pair the board keeps no edge for still gets the war.
    if (!selectRelationship(ctx.campaign, ctx.target, ctx.actor))
        return [war];
    return [
        {
            kind: "relationship",
            from: ctx.target,
            to: ctx.actor,
            deltas: { militaryThreat: 0.2, tension: 0.2 },
            addHistory: { turn: ctx.campaign.turn, kind: "strike", description: `${target} fired on ${possessive(actor)} forces.` },
        },
        war,
    ];
}
/**
 * What a failed act of force leaves beyond the failure itself, or nothing for
 * an act that is not force. A blockade or strike spends readiness and is
 * reported as an introduction into hostilities whether or not it landed; an
 * act of force the target answers opens or heats a war.
 */
export function failedForceEffects(ctx, rung, riskId) {
    const introduced = rung === 3 || rung === 4
        ? [...spendsReadiness(ctx, rung), ...warPowersRecord(ctx, rung, ACT_WORDS[rung].attempted), ...forceIntroduction(ctx, rung, ACT_WORDS[rung].introduced)]
        : [];
    return rung >= 3 && riskId === "escalation" ? [...introduced, ...answeredWithForce(ctx)] : introduced;
}
