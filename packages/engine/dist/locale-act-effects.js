import { answerReliefClaims } from "./obligations.js";
import { coercionOutcome } from "./domestic-coercion.js";
import { createRngStreams } from "./rng.js";
import { executiveOrder, orderRecordId, projectOrder, signOrder } from "./orders.js";
import { openCommitment } from "./commitments.js";
import { issueDirective } from "./directives.js";
import { markedFlags } from "./marked-flags.js";
import { BASE_MARK_DECAY } from "./state-geography.js";
import { deferClaims, homeActAvailability, localeAct, localeActCost, localeAvailability, localeGround, missionSubject, openRequests, playerCharter, tieredLocaleAct, unrequestedReliefCost, UNPROVOKED_STANDING, } from "./locale-acts.js";
import { federalServiceGround, governorAssents, insurrectionGrounds, investigativePriorityFlag, liveProclamation, unrestReaching, } from "./locale-missions.js";
import { liveCourtOrder, surveilledUnderOrderFlag, SURVEILLANCE_ORDER_KINDS } from "./court-order-records.js";
import { missionInterimRelief } from "./mission-interim-relief.js";
/** The foreign-born share at which an immigration operation reaches a state in full. The national share is near 0.14. */
const FOREIGN_BORN_REFERENCE = 0.14;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
const clamp01 = (value) => Math.min(1, Math.max(0, value));
/** How fully the act reaches this state's people: its foreign-born share for an immigration operation, else all of it. */
function reachShare(campaign, id, act) {
    if (act.reach !== "foreign-born")
        return 1;
    const share = campaign.states[id]?.base.character.cohorts.nativity["foreign-born"] ?? 0;
    return Math.min(1, share / FOREIGN_BORN_REFERENCE);
}
/** What the act does to national protest: easing only where unrest reaches the state, and never from the home path. */
export function localeProtestDelta(campaign, id, act, home = false) {
    const protest = (act.protest ?? 0) * reachShare(campaign, id, act);
    if (protest < 0 && (home || !unrestReaching(campaign, id)))
        return 0;
    return round4(protest);
}
/** The governor's step: what the act costs with an assenting governor, and with an opposed one. */
export function localeGovernorShift(campaign, id, act) {
    if (!act.governor)
        return 0;
    const assents = governorAssents(campaign.states[id]?.governor);
    return round4(assents ? act.governor.assenting : act.governor.opposed * reachShare(campaign, id, act));
}
/** The price as a metric effect, its keys written out so the metric walk can read what it moves. */
function priceEffect(price) {
    return { kind: "metric", deltas: { ...(price.treasury ? { treasury: price.treasury } : {}), ...(price.standing ? { standing: price.standing } : {}) } };
}
/** What the act itself charges, unrequested standing and its tier included: not what a suit or an incident adds. */
export function localeActPrice(campaign, id, base, home = false) {
    const act = tieredLocaleAct(base, localeGround(campaign, id, base));
    const unrequested = act.predicate === "request" ? unrequestedReliefCost(campaign, id) : 0;
    const standing = round3((act.standingCost + unrequested) * (home ? UNPROVOKED_STANDING : 1));
    const cost = localeActCost(campaign, act);
    return { ...(cost ? { treasury: -cost } : {}), ...(standing ? { standing: -standing } : {}) };
}
/** The governor's step and the mark the state keeps of it. */
function stateMemory(campaign, id, name, act) {
    const shift = localeGovernorShift(campaign, id, act);
    const opposed = !governorAssents(campaign.states[id]?.governor);
    const mark = act.mark && (act.mark.when === "always" || opposed) ? act.mark : undefined;
    if (!shift && !mark)
        return undefined;
    const reason = `${act.name} in ${name}.`;
    return {
        kind: "state", state: id, reason,
        ...(shift ? { governorShift: shift } : {}),
        ...(mark ? { addMark: { turn: campaign.turn, signature: mark.signature, weight: round3(mark.weight * reachShare(campaign, id, act)),
                valence: mark.valence, decayRate: BASE_MARK_DECAY, reason } } : {}),
    };
}
/** What the state, the public and the country's order make of the act, apart from its price. */
function consequenceEffects(campaign, id, name, act) {
    const opposed = !governorAssents(campaign.states[id]?.governor);
    const opinion = act.opinion && (act.opinion.when !== "opposed" || opposed) ? act.opinion : undefined;
    const memory = stateMemory(campaign, id, name, act);
    const order = { ...(act.stability ? { stability: act.stability } : {}), ...(act.readiness ? { militaryReadiness: act.readiness } : {}) };
    return [
        ...(memory ? [memory] : []),
        ...(opinion ? [{ kind: "opinion", deltas: { ...(opinion.integrity ? { integrity: opinion.integrity } : {}),
                    ...(opinion.competence ? { competence: opinion.competence } : {}) }, ...(opinion.polarize ? { polarize: opinion.polarize } : {}) }] : []),
        ...(Object.keys(order).length ? [{ kind: "metric", deltas: order }] : []),
    ];
}
/**
 * An act that answers discharges the claim without a mark; the others cost
 * their price and leave the obligation standing, which is the honest outcome —
 * a waiver is not an answer, and the state goes on waiting.
 */
function claimEffects(campaign, id, name, act, cause) {
    if (!cause)
        return [];
    const answers = act.answersClaim === true || (act.answersClaim === "with-assent" && governorAssents(campaign.states[id]?.governor));
    if (answers) {
        const answered = answerReliefClaims(campaign, id, cause);
        return answered ? [answered] : [];
    }
    if (act.id !== "review")
        return [];
    return [{ kind: "state", state: id, reason: `A federal review of the ${cause} in ${name} buys the answer more time.`,
            replaceClaims: deferClaims(campaign.states[id].claims, campaign.turn) }];
}
/**
 * Fold the act's protest move into the incident's, when there is one: both are
 * absolute writes off the same week's reading, and two in one packet would let
 * the later erase the earlier.
 */
function withProtest(campaign, effects, delta) {
    if (delta === 0)
        return effects;
    const nation = campaign.founding.nation;
    const at = effects.findIndex((effect) => effect.kind === "nationStat" && effect.setStats?.politics?.protestPressure !== undefined);
    if (at === -1) {
        const protest = campaign.nations[nation]?.stats.politics.protestPressure ?? 0;
        return [...effects, { kind: "nationStat", nation, setStats: { politics: { protestPressure: round4(clamp01(protest + delta)) } } }];
    }
    return effects.map((effect, index) => index !== at || effect.kind !== "nationStat" ? effect : {
        ...effect, setStats: { ...effect.setStats, politics: { ...effect.setStats.politics,
                protestPressure: round4(clamp01((effect.setStats.politics.protestPressure ?? 0) + delta)) } },
    });
}
/** Collection at the edge of a narrowed order is where it reaches the people the court left out of it. */
export const NARROWED_ORDER_ODDS = 1.5;
/** The act's coercion risk this week: surveillance under a narrowed order runs hotter. */
export function surveillanceRisk(campaign, id, act) {
    if (!act.coercion || act.predicate !== "court-order")
        return act.coercion;
    const order = liveCourtOrder(campaign, id, SURVEILLANCE_ORDER_KINDS);
    return order?.status === "narrowed" ? { ...act.coercion, odds: round4(act.coercion.odds * NARROWED_ORDER_ODDS) } : act.coercion;
}
function signMission(campaign, id, act) {
    if (!act.orderId)
        return undefined;
    const charter = playerCharter(campaign);
    if (!charter)
        return { ok: false, reason: "No charter governs these orders.", missing: "a charter to sign under" };
    return signOrder(campaign, charter, act.orderId, createRngStreams(campaign.seed), missionSubject(campaign, id, act));
}
/** A memorandum to the Attorney General; only a priority Justice carries leaves the flag mission attention reads. */
function priorityDirective(campaign, id, name) {
    const result = issueDirective(campaign, { institution: "INST-DOJ", kind: "enforcement-posture", key: id,
        subject: `Investigative priority: violent disorder in ${name}` });
    if (!result.ok)
        return result;
    const carried = result.packet.effects.some((effect) => effect.kind === "institution"
        && (effect.directives ?? []).some((directive) => directive.status === "carried"));
    const flag = carried ? [{ kind: "flag", set: markedFlags([investigativePriorityFlag(id)], campaign.turn) }] : [];
    return { ok: true, effects: [...result.packet.effects, ...flag], summary: result.packet.narration.summary };
}
/** The forces and the weekly bill, bound to this state and to the order record they were sent under. */
function missionCommitment(campaign, id, name, act, recordId) {
    if (!act.commitment)
        return undefined;
    const { amountPerTurn, weeks, line, forces } = act.commitment;
    const nation = campaign.founding.nation;
    return openCommitment(campaign, {
        kind: "deployment",
        actor: nation,
        target: { kind: "state", id },
        resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn },
        source: forces ? { kind: "orderOfBattle", ...forces } : { kind: "budgetLine", line },
        review: { endsTurn: campaign.turn + weeks },
        rationale: `${act.name} for ${name}.`,
        ...(unrestReaching(campaign, id) ? { addressedCondition: { kind: "unrest", nation } } : {}),
        authorizedBy: recordId,
        ...(act.excepted ? { excepted: true } : {}),
    });
}
function narration(campaign, id, name, act, ctx) {
    if (ctx.home)
        return act.occasion === "enforcement" ? `${act.name} in ${name}.` : `${act.name} for ${name}, with no unrest there to answer.`;
    const unrequested = act.predicate === "request" && unrequestedReliefCost(campaign, id) > 0;
    return unrequested
        ? `${act.name} for ${name}, against the ${ctx.cause} — which the state did not ask for, and its governor will say so.`
        : `${act.name} for ${name}, against the ${ctx.cause}.`;
}
/** Sign, instruct and commit, in that order; the first refusal refuses the act. */
function takeSteps(campaign, id, name, act) {
    const signed = signMission(campaign, id, act);
    if (signed && !signed.ok)
        return { reason: `This needs ${signed.missing}.` };
    const directive = act.id === "priority" ? priorityDirective(campaign, id, name) : undefined;
    if (directive && !directive.ok)
        return { reason: directive.reason };
    const committed = signed ? missionCommitment(campaign, id, name, act, signed.record.id) : undefined;
    if (committed && !committed.ok)
        return { reason: committed.reason };
    return { ...(signed ? { signed } : {}), ...(directive ? { directive } : {}), ...(committed ? { committed } : {}) };
}
/** One packet for the whole act, narrated by the act, with the order's counsel and provenance where it signed one. */
function actPacket(campaign, id, base, ctx) {
    const name = campaign.states[id].base.name;
    const act = tieredLocaleAct(base, localeGround(campaign, id, base));
    const steps = takeSteps(campaign, id, name, act);
    if ("reason" in steps)
        return { ok: false, reason: steps.reason };
    const { signed, directive, committed } = steps;
    const provoked = act.occasion === "enforcement" || !ctx.home;
    const risk = surveillanceRisk(campaign, id, act);
    const coerced = risk ? coercionOutcome(campaign, id, name, risk, provoked) : undefined;
    const collected = act.predicate === "court-order"
        ? [{ kind: "flag", set: markedFlags([surveilledUnderOrderFlag(id)], campaign.turn) }] : [];
    const effects = [
        priceEffect(localeActPrice(campaign, id, base, ctx.home)),
        ...(signed?.packet.effects ?? []),
        ...(directive?.effects ?? []),
        ...(committed?.packet.effects ?? []),
        ...consequenceEffects(campaign, id, name, act),
        ...claimEffects(campaign, id, name, act, ctx.cause),
        ...collected,
        ...withProtest(campaign, coerced?.effects ?? [], localeProtestDelta(campaign, id, act, ctx.home)),
    ];
    const summary = [narration(campaign, id, name, act, ctx), signed?.contested ? "A suit is filed against the order the same day." : "",
        directive?.summary ?? "", coerced?.incident ? `${coerced.incident}.` : ""].filter(Boolean).join(" ");
    // A packet rather than loose effects, for the same reason every other act
    // the president can take hands one back: `apply()` is the one write path onto
    // the ledger, and a caller assembling its own narration would be a second
    // account of what the administration did.
    return {
        ok: true,
        packet: {
            source: "action", actor: "player", turn: campaign.turn,
            narration: { summary },
            ...(signed?.packet.counsel ? { counsel: signed.packet.counsel } : {}),
            ...(signed?.packet.provenance ? { provenance: signed.packet.provenance } : {}),
            effects,
        },
    };
}
/** Take one act against one state, over one condition kind. */
export function takeLocaleAct(campaign, id, actId, cause) {
    const act = localeAct(actId);
    if (!act)
        return { ok: false, reason: "no such act" };
    const availability = localeAvailability(campaign, id, act, cause);
    if (!availability.ok)
        return { ok: false, reason: `This needs ${availability.missing}.` };
    return actPacket(campaign, id, act, { cause, home: false });
}
/** Force or collection sent into a state on the President's own initiative, with no unrest to answer. */
export function takeHomeAct(campaign, id, actId) {
    const act = localeAct(actId);
    if (!act?.coercion)
        return { ok: false, reason: "no such act of force or collection" };
    const availability = homeActAvailability(campaign, id, act);
    if (!availability.ok)
        return { ok: false, reason: `This needs ${availability.missing}.` };
    return actPacket(campaign, id, act, { home: true });
}
function predicateGates(campaign, id, act) {
    if (act.predicate === "request")
        return [{ label: "The governor's request", met: openRequests(campaign, id).length > 0, cite: "42 U.S.C. §5170" }];
    if (act.predicate === "federal-service")
        return [{ label: "An invasion, a rebellion, or Insurrection Act troops here unable to carry out their mission",
                met: federalServiceGround(campaign, id) !== undefined, cite: "10 U.S.C. §12406" }];
    if (act.predicate === "proclaimed")
        return [{ label: "A proclamation to disperse, issued an earlier week and still in force",
                met: liveProclamation(campaign, id) !== undefined, cite: "10 U.S.C. §254" }];
    if (act.predicate === "court-order")
        return [{ label: "A FISA or Title III order for this state, still in force",
                met: liveCourtOrder(campaign, id, SURVEILLANCE_ORDER_KINDS) !== undefined, cite: "50 U.S.C. §1812" }];
    if (act.predicate !== "insurrection")
        return [];
    const grounds = insurrectionGrounds(campaign, id);
    return [
        { label: "The governor's request", met: grounds["251"], cite: "10 U.S.C. §251" },
        { label: "A federal court's order the state has let stand defied", met: grounds["252"], cite: "10 U.S.C. §252" },
        { label: "Violence denying rights the state will not protect", met: grounds["253"], cite: "10 U.S.C. §253" },
    ];
}
function localeGates(campaign, id, act, cause) {
    return [
        ...(act.boundary ? [{ label: "A FISA or Title III court order", met: false, cite: "50 U.S.C. §1812" }] : []),
        ...(act.occasion === "disorder" ? [{ label: "Unrest in the state", met: cause === "unrest" }] : []),
        ...(act.needsGovernorAssent ? [{ label: "The governor's assent", met: governorAssents(campaign.states[id]?.governor) }] : []),
        ...predicateGates(campaign, id, act),
    ];
}
/** Everything a desk shows about one act in one state before it is taken, out of the same reads the act takes. */
export function localeActProjection(campaign, id, actId, cause) {
    const base = localeAct(actId);
    const ground = localeGround(campaign, id, base);
    const act = tieredLocaleAct(base, ground);
    const charter = playerCharter(campaign);
    const order = act.orderId ? executiveOrder(act.orderId) : undefined;
    const subject = missionSubject(campaign, id, act);
    const projection = order && charter ? projectOrder(campaign, charter, order, subject) : undefined;
    const interimRelief = order && charter && projection ? missionInterimRelief(campaign, charter, { id: orderRecordId(order.id, campaign.turn, subject), order: order.id, subject }, undefined, projection.filing.states.length > 0) : undefined;
    return {
        act,
        availability: localeAvailability(campaign, id, base, cause),
        gates: localeGates(campaign, id, act, cause),
        ...(order && projection ? { order: { orderId: order.id, subject, projection } } : {}),
        ...(act.commitment ? { commitment: act.commitment } : {}),
        ...(act.mission ? { mission: act.mission } : {}),
        protestDelta: localeProtestDelta(campaign, id, act),
        governorShift: localeGovernorShift(campaign, id, act),
        ...(ground ? { ground } : {}),
        ...(interimRelief ? { interimRelief } : {}),
    };
}
