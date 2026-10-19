import { answerReliefClaims, RELIEF_SIGNATURE_PREFIX } from "./obligations.js";
import { underDeclaredEmergency } from "./emergency.js";
import { obligationAvailability } from "./funding.js";
import { playerGdp } from "./policy.js";
import { coercionOutcome } from "./domestic-coercion.js";
import { boundaryRefusalReason, icElement } from "./intelligence.js";
/**
 * Priced against `order-relief-program`, which is the *national* relief
 * program at 0.0015 of output — about $41B. Reaching one state costs a
 * fraction of reaching the whole country: direct relief to a single state is a
 * sixth of the national program, which is the order of magnitude of a real
 * state-level disaster supplemental, and a locale act that cost two-thirds of
 * the national program would make helping Michigan and helping America nearly
 * the same decision.
 */
export const LOCALE_ACTS = [
    {
        id: "relief",
        name: "Direct federal relief",
        summary: "Money and materiel to this state, ahead of the ordinary appropriation.",
        needsDeclaration: false,
        needsGovernorAssent: false,
        predicate: "request",
        answersClaim: true,
        // ~$6.9B, a sixth of the national program.
        treasuryOfGdp: -0.00025,
        standingCost: 0,
        // The disaster relief fund is a no-year appropriation and does not stop
        // when the annual ones do.
        excepted: true,
    },
    {
        id: "request-deployment",
        name: "Ask the governor to deploy the Guard",
        summary: "The state's own Guard, on the state's own authority, at the President's request.",
        needsDeclaration: false,
        needsGovernorAssent: true,
        answersClaim: true,
        // ~$2.8B: a state's own Guard, on state orders, federally reimbursed.
        treasuryOfGdp: -0.0001,
        standingCost: 0.01,
        excepted: true,
    },
    {
        // The historical identifier is retained; no supported federal-service pathway is modeled.
        id: "federalize",
        name: "Federalize the Guard",
        summary: "Put the state's National Guard under federal command.",
        needsDeclaration: true,
        needsGovernorAssent: false,
        predicate: "guard",
        answersClaim: true,
        // ~$8.3B: federal service, federal pay, and a deployment nobody in the
        // state asked for.
        treasuryOfGdp: -0.0003,
        standingCost: 0.06,
        excepted: true,
    },
    {
        // Retained for historical records and comparison, not as a jurisdictional finding.
        id: "agents",
        name: "Surge federal agents",
        summary: "Send federal law-enforcement agents into the state.",
        needsDeclaration: false,
        needsGovernorAssent: false,
        predicate: "disorder",
        answersClaim: false,
        // ~$1.4B: a surge of federal officers, their travel and their overtime.
        treasuryOfGdp: -0.00005,
        standingCost: 0.02,
        coercion: { kind: "agents", odds: 0.14, severity: 1 },
    },
    {
        // Historical capability retained without inventing legal predicates or procedures.
        id: "troops",
        name: "Send in active-duty troops",
        summary: "Send active-duty troops into the state.",
        needsDeclaration: true,
        needsGovernorAssent: false,
        predicate: "guard",
        answersClaim: false,
        // ~$11B: a deployed brigade, and the readiness it is not training for.
        treasuryOfGdp: -0.0004,
        standingCost: 0.1,
        excepted: true,
        coercion: { kind: "troops", odds: 0.22, severity: 1.5 },
    },
    {
        // Kept visible as a refused proposal so the state desk explains the
        // investigation boundary instead of implying unrest grants authority.
        id: "surveil",
        name: "Order surveillance of residents",
        summary: "A presidential order to investigate residents; Justice does not take case direction from this desk.",
        needsDeclaration: false,
        needsGovernorAssent: false,
        predicate: "disorder",
        answersClaim: false,
        // Historical price of the refused proposal; no obligation is made.
        treasuryOfGdp: -0.00002,
        standingCost: 0.01,
        coercion: { kind: "surveillance", odds: 0.18, severity: 1 },
    },
    {
        id: "waiver",
        name: "Grant a regulatory waiver",
        summary: "Cheap, narrow, and only part of an answer.",
        needsDeclaration: false,
        needsGovernorAssent: false,
        answersClaim: false,
        // ~$825M: the administrative cost of suspending a rule for one state.
        treasuryOfGdp: -0.00003,
        standingCost: 0,
    },
    {
        id: "review",
        name: "Order a federal review",
        summary: "Buys time. The state waits longer before the silence counts against you.",
        needsDeclaration: false,
        needsGovernorAssent: false,
        answersClaim: false,
        // ~$550M: a federal review, which is people and time.
        treasuryOfGdp: -0.00002,
        standingCost: 0,
    },
];
export function localeAct(id) {
    return LOCALE_ACTS.find((act) => act.id === id);
}
/** How long a federal review pushes a claim's deadline out. Once only; see `deferClaims`. */
export const REVIEW_DEFERRAL_TURNS = 3;
/**
 * Whether the governor will go along with an act that needs them.
 *
 * Read off `GovernorStanding`, which founding seats and
 * which nothing has ever consulted for a decision. A governor disposed against
 * the administration refuses, and refusing is what makes federalizing the only
 * remaining road — at its own price.
 */
export const GOVERNOR_ASSENT_FLOOR = 0.45;
export function governorAssents(governor) {
    // An absent governor record cannot supply affirmative consent.
    return governor !== undefined && governor.disposition >= GOVERNOR_ASSENT_FLOOR;
}
/** What one use of an act obligates, resolved against the country paying for it. */
export function localeActCost(campaign, act) {
    return Math.round(Math.abs(act.treasuryOfGdp) * playerGdp(campaign));
}
/** A condition or declaration is not a federal mission, jurisdiction or statutory finding. */
function domesticAuthorityBoundary(act) {
    if (act.id === "agents")
        return "a federal law-enforcement mission, and the game doesn't include those yet";
    if (act.id === "federalize")
        return "federal command of the Guard, and the game doesn't include that yet";
    if (act.id === "troops")
        return "the Insurrection Act, and the game doesn't include it yet";
    return undefined;
}
export function localeAvailability(campaign, id, act, cause) {
    const runtime = campaign.states[id];
    if (!runtime)
        return { ok: false, missing: "a state this act could reach" };
    if (act.id === "surveil")
        return { ok: false, missing: residentSurveillanceBoundary() };
    const authorityBoundary = domesticAuthorityBoundary(act);
    if (authorityBoundary)
        return { ok: false, missing: authorityBoundary };
    if (act.needsDeclaration && !underDeclaredEmergency(campaign, id)) {
        return { ok: false, missing: "a declared emergency reaching this state" };
    }
    if (act.predicate === "disorder" && cause !== "unrest") {
        return { ok: false, missing: "unrest in the state: federal force and collection answer disorder, not a disaster" };
    }
    if (act.needsGovernorAssent && !governorAssents(runtime.governor)) {
        return { ok: false, missing: "the governor's recorded assent, which is absent or withheld" };
    }
    const funded = obligationAvailability(campaign, localeActCost(campaign, act), { excepted: act.excepted });
    if (!funded.ok)
        return funded;
    return { ok: true };
}
/**
 * What reaching into a state that has not asked costs at home.
 *
 * The Stafford Act runs the other way round: every request for a declaration is
 * made by the Governor, who has to have directed the state's own response
 * first. The game already models the asking — a governor's request is a claim —
 * and simply never consulted it. Unasked relief is not refused, because a
 * President who thinks a governor is failing their own people may act anyway;
 * it is charged, and it is charged hardest where the governor is most opposed,
 * because that is the one who will say so on television.
 */
export const UNREQUESTED_RELIEF_STANDING = 0.04;
function unrequestedReliefCost(campaign, id) {
    if (openRequests(campaign, id).length > 0)
        return 0;
    const disposition = campaign.states[id]?.governor?.disposition ?? 0.5;
    return round3(UNREQUESTED_RELIEF_STANDING * (1 - disposition));
}
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/** Push every open relief claim in this state further out, once. */
function deferClaims(claims, turn) {
    return claims.map((claim) => claim.signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`) && claim.expiresTurn > turn
        ? { ...claim, expiresTurn: claim.expiresTurn + REVIEW_DEFERRAL_TURNS }
        : claim);
}
/**
 * Take one act against one state, over one condition kind.
 *
 * An act that answers discharges the claim without a mark; the others cost
 * their price and leave the obligation standing, which is the honest outcome —
 * a waiver is not an answer, and the state goes on waiting.
 */
export function takeLocaleAct(campaign, id, actId, cause) {
    const act = localeAct(actId);
    if (!act)
        return { ok: false, reason: "no such act" };
    const availability = localeAvailability(campaign, id, act, cause);
    if (!availability.ok)
        return { ok: false, reason: `This needs ${availability.missing}.` };
    const runtime = campaign.states[id];
    const unrequested = act.predicate === "request" ? unrequestedReliefCost(campaign, id) : 0;
    const standing = round3(act.standingCost + unrequested);
    const effects = [
        {
            kind: "metric",
            deltas: { treasury: -localeActCost(campaign, act), ...(standing ? { standing: -standing } : {}) },
        },
    ];
    if (act.answersClaim) {
        const answered = answerReliefClaims(campaign, id, cause);
        if (answered)
            effects.push(answered);
    }
    else if (actId === "review") {
        const deferred = deferClaims(runtime.claims, campaign.turn);
        effects.push({
            kind: "state",
            state: id,
            reason: `A federal review of the ${cause} in ${runtime.base.name} buys the answer more time.`,
            replaceClaims: deferred,
        });
    }
    const coerced = act.coercion ? coercionOutcome(campaign, id, runtime.base.name, act.coercion) : undefined;
    if (coerced)
        effects.push(...coerced.effects);
    // A packet rather than loose effects, for the same reason every other act
    // the president can take hands one back: `apply()` is the one write path onto
    // the ledger, and a caller assembling its own narration would be a second
    // account of what the administration did.
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `${unrequested
                    ? `${act.name} for ${runtime.base.name}, against the ${cause} — which the state did not ask for, and its governor will say so.`
                    : `${act.name} for ${runtime.base.name}, against the ${cause}.`}${coerced?.incident ? ` ${coerced.incident}.` : ""}`,
            },
            effects,
        },
    };
}
/** Standing paid for force or collection with no unrest to answer, as a multiple of the act's own. */
export const UNPROVOKED_STANDING = 2;
/** A second entry point cannot waive the ordinary authority boundary. */
export function homeActAvailability(campaign, id, act) {
    if (!act.coercion)
        return { ok: false, missing: "an act of force or collection" };
    return localeAvailability(campaign, id, act);
}
function residentSurveillanceBoundary() {
    const fbi = icElement("IC-FBI");
    return boundaryRefusalReason(fbi, {
        element: "IC-FBI", discipline: "humint", targetKind: "domestic-person",
        target: "a resident", question: "Investigate residents in this state.",
    });
}
/** Force or collection sent into a state on the President's own initiative, with no unrest to answer. */
export function takeHomeAct(campaign, id, actId) {
    const act = localeAct(actId);
    if (!act?.coercion)
        return { ok: false, reason: "no such act of force or collection" };
    const availability = homeActAvailability(campaign, id, act);
    if (!availability.ok)
        return { ok: false, reason: `This needs ${availability.missing}.` };
    const name = campaign.states[id].base.name;
    const coerced = coercionOutcome(campaign, id, name, act.coercion, false);
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: `${act.name} for ${name}, with no unrest there to answer.${coerced.incident ? ` ${coerced.incident}.` : ""}` },
            effects: [
                { kind: "metric", deltas: { treasury: -localeActCost(campaign, act), standing: -round3(act.standingCost * UNPROVOKED_STANDING) } },
                ...coerced.effects,
            ],
        },
    };
}
/**
 * Whether this state is currently asking for something.
 *
 * The player-facing half of the obligation ledger: a governor's request is a
 * claim, and this is how a surface asks whether one is open.
 */
export function openRequests(campaign, id) {
    const runtime = campaign.states[id];
    if (!runtime)
        return [];
    return runtime.claims.filter((claim) => claim.signature.startsWith(`${RELIEF_SIGNATURE_PREFIX}:`));
}
