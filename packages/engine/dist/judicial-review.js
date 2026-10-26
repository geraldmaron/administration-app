import { constitutionalGround } from "./legislation.js";
import { ORDER_DOMAIN_BAND, executiveOrder, orderDeed } from "./orders.js";
import { createRngStreams } from "./rng.js";
import { addDays } from "./clock.js";
import { selectPerson } from "./state.js";
import { routeDomestic } from "./domestic-signature.js";
import { benchForVotes, decideCase } from "./court-votes.js";
import { caseQuestion, composeOpinion } from "./court-opinions.js";
import { appealGrantChance, appealGranted, courtStep, courtWeeks, openedProceeding, thresholdPasses } from "./court-procedure.js";
import { backgroundDocketEffects, doctrineShift } from "./background-docket.js";
import { removalMatterEffects } from "./removal-court.js";
import { orderExposure } from "./order-exposure.js";
import { scheduleSupremeArgument } from "./court-calendar.js";
import { solicitorGeneralStanding, standingAdjustment } from "./solicitor-general.js";
import { statutoryMatterEffects } from "./statutory-matters.js";
import { constructionInterimRelief, specializedGround, specializedMatter, specializedMeritsChance, specializedThreshold } from "./specialized-court-matters.js";
import { electionAccessMatterEffects } from "./election-access-court.js";
import { fairHousingMatterEffects } from "./fair-housing-court.js";
import { wageHourMatterEffects } from "./wage-hour-court.js";
import { surveillanceMatterEffects } from "./surveillance-court.js";
import { circuitPanelFor, circuitPanelRecusals, districtForumFor, districtStrikeChance, DISTRICT_FORUM_READINGS, materializeCircuitSeat } from "./lower-bench.js";
import { priorGovernmentAdviceRecusal } from "./court-recusal.js";
import { justiceStrikePropensity, strikeDownChance } from "./strike-odds.js";
import { LOWER_BENCH_SOURCE_DATE } from "./lower-bench-source.js";
import { JUDICIARY_SEAT_ROLE } from "./judiciary.js";
import { missionInterimRelief } from "./mission-interim-relief.js";
import { courtOrderRulingEffects } from "./court-orders.js";
const STRUCK_DOWN_COST = { standing: -0.04, stability: -0.03 };
/**
 * What losing costs follows what was lost: a loud act more than a quiet one,
 * and a remedy that undoes something already in effect more than one that
 * cancels a rule before it landed.
 */
export function strikeDownCost(order, undoesLanded) {
    const scale = (0.5 + orderExposure(order.id).salience) * (undoesLanded ? 1 : 0.5);
    const round = (value) => Math.round(value * scale * 10000) / 10000;
    return { standing: round(STRUCK_DOWN_COST.standing), stability: round(STRUCK_DOWN_COST.stability) };
}
/** A matter whose own record rules apply; an ordinary order challenge has none. */
function specializedOf(proceeding) {
    return proceeding.matter?.kind === "order-challenge" ? undefined : proceeding.matter;
}
/** Precedent moves the legal merits, never past the bounds the bench reads. */
function withPrecedent(state, orderId, chance) {
    return Math.max(0.02, Math.min(0.98, chance + doctrineShift(state, orderId)));
}
function assignCircuitPanel(state, proceeding, record, circuit, keep = []) {
    const seats = circuitPanelFor(state, circuit, proceeding.id, record, new Set(keep.map((judge) => judge.seatId))).slice(0, 3 - keep.length);
    if (seats.length !== 3 - keep.length)
        return undefined;
    const materialized = [];
    for (const seat of seats) {
        const judge = materializeCircuitSeat(state, seat, materialized.map((entry) => entry.person));
        if (!judge)
            return undefined;
        materialized.push(judge);
    }
    const prior = proceeding.circuitPanel?.recusals ?? [];
    const newlyRecused = circuitPanelRecusals(state, circuit, record).filter((entry) => !prior.some((earlier) => earlier.seatId === entry.seatId && earlier.judge === entry.judge));
    const assigned = [...keep, ...materialized.map(({ seat, person }) => ({ seatId: seat.id, judge: person.base.id }))];
    const next = { ...courtStep(proceeding, "circuit-merits", state.turn, keep.length ? "The circuit assigns another eligible judge after the remaining pair cannot agree."
            : "The circuit assigns a three-judge panel. It will hear and decide the appeal on the circuit's calendar.", { circuitPanel: { assignedTurn: state.turn, assigned, recusals: [...prior, ...newlyRecused] } }),
        nextTurn: keep.length ? state.turn + 1 : state.turn + courtWeeks(state.seed, proceeding.id, "circuitMerits") };
    return [...materialized.flatMap((entry) => entry.effects), { kind: "courtProceeding", set: next }];
}
function finalCase(state, record, proceeding, order, holding, decision) {
    const rule = state.pendingRules.find((entry) => entry.id === record.id);
    const ground = specializedGround(proceeding.matter, rule, constitutionalGround(state, record.order), record, state);
    const forum = decision ? "supreme" : proceeding.circuit ? "circuit" : "lower";
    const opinion = proceeding.matter?.kind === "emergency-construction" && (proceeding.lower || decision) && decision?.disposition !== "equal-division"
        ? { majority: !proceeding.lower && !decision
                ? "The House has not established standing for this institutional appropriations claim. The court does not reach the §2808 merits."
                : holding === "struck-down"
                    ? "The redirection exceeds the authority shown under 10 U.S.C. §2808. Further obligations under this order are barred; previously obligated or spent funds are not returned to the source project."
                    : "The record supports the challenged emergency-construction redirection under 10 U.S.C. §2808. Previously obligated source-project funds remain committed to that project." }
        : proceeding.matter?.kind === "entry-suspension" && (proceeding.lower || decision) && decision?.disposition !== "equal-division"
            ? { majority: holding === "struck-down"
                    ? "This proclamation exceeds the showing required by 8 U.S.C. §1182(f). Its entry restriction is set aside prospectively; a refused visa application remains subject to the other admission rules and must be reconsidered, not automatically granted."
                    : "The proclamation's class restriction falls within 8 U.S.C. §1182(f). The refusal under this proclamation remains in force; no individual admission right is decided." }
            : specializedOf(proceeding) && (proceeding.lower || decision) && decision?.disposition !== "equal-division"
                ? { majority: holding === "struck-down"
                        ? `${proceeding.matter.kind === "agency-procedure" ? "The final lease-planning rule fails the required procedural record" : "The grant condition lacks the authority Congress must supply"}; this rule is set aside without disturbing the underlying law or other rules.`
                        : `${proceeding.matter.kind === "agency-procedure" ? "The agency record satisfies notice, comment and preservation of later sale and site review" : "The enacted grant terms support the condition"}; the challenged rule remains in force.` }
                : decision?.disposition === "equal-division"
                    ? { majority: `The Supreme Court is equally divided. The lower court's ${holding === "struck-down" ? "judgment setting aside" : "judgment sustaining"} the order remains in force without a Supreme Court merits opinion.` }
                    : decision?.disposition === "majority"
                        ? composeOpinion(order, ground, holding, decision.majority, decision.minority)
                        : { majority: proceeding.circuit ? `The ${proceeding.circuit.court} Circuit ${holding === "struck-down" ? "sets aside" : "sustains"} the order on appeal. The Supreme Court did not issue a merits opinion.`
                                : proceeding.lower ? `The district court ${holding === "struck-down" ? "sets aside" : "sustains"} the order on the merits. The Supreme Court did not issue a merits opinion.`
                                    : "The district court dismissed the challenge at threshold. No merits judgment was reached." };
    return { id: proceeding.id, order: record.order, subject: proceeding.subject,
        ...(proceeding.matter ? { matter: proceeding.matter } : {}),
        question: proceeding.matter?.question ?? caseQuestion(order, ground), ground,
        filedTurn: proceeding.filedTurn, dueTurn: record.review.dueTurn, ruledTurn: state.turn, holding,
        votes: decision?.votes ?? [], ...(decision?.majorityAuthor ? { majorityAuthor: decision.majorityAuthor } : {}),
        ...(decision?.dissentAuthor ? { dissentAuthor: decision.dissentAuthor } : {}), opinion,
        procedure: { forum, ...(proceeding.lower ? { lower: proceeding.lower.holding } : {}),
            ...(proceeding.lowerForum ? { lowerForum: proceeding.lowerForum } : {}),
            ...(proceeding.circuit ? { circuit: proceeding.circuit } : {}),
            ...(!proceeding.lower && !decision ? { dismissedAtThreshold: true } : {}),
            ...(decision ? { appeal: decision.disposition === "equal-division" ? "equally-divided" : "majority" } : proceeding.appeal ? { appeal: proceeding.appeal } : {}),
            history: proceeding.history } };
}
function finalEffects(state, record, proceeding, order, holding, decision) {
    const courtCase = finalCase(state, record, proceeding, order, holding, decision);
    const settled = courtStep(proceeding, "final", state.turn, decision?.disposition === "equal-division" ? "An equally divided Supreme Court leaves the lower judgment in force without precedent." :
        decision ? `The Supreme Court ${holding === "struck-down" ? "sets aside" : "sustains"} the order.` :
            proceeding.lower ? proceeding.governmentReview === "accept" ? "The administration accepted the lower judgment; it is final."
                : proceeding.governmentReview === "defaulted" ? "The response deadline passed without a request for review; the lower judgment is final."
                    : proceeding.circuit ? "Supreme Court review was denied; the circuit judgment is final." : "Review was denied; the district judgment is final."
                : "The district court dismissed the challenge at threshold.", { appeal: decision?.disposition === "equal-division" ? "equally-divided" : decision ? "majority" : proceeding.appeal });
    const effects = [
        { kind: "courtProceeding", set: settled },
        { kind: "orderReview", id: record.id, review: { dueTurn: record.review.dueTurn, status: holding, ruledTurn: state.turn } },
        { kind: "courtCase", set: { ...courtCase, procedure: { ...courtCase.procedure, history: settled.history } } },
        { kind: "feed", items: [rulingItem(state, order, courtCase)] },
    ];
    if (decision && proceeding.lower?.holding === "struck-down" && holding === "struck-down")
        effects.push({ kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                kind: "merits-rejected", change: 0,
                account: "The Supreme Court rejected the administration's merits position." } });
    if (holding === "upheld") {
        const stayed = state.pendingRules.find((rule) => rule.id === record.id && rule.status === "stayed");
        if (stayed)
            effects.push({ kind: "pendingRule", set: { ...stayed, status: "pending" } });
        if (proceeding.partyRelief?.active && proceeding.matter?.kind === "agency-procedure")
            effects.push({ kind: "courtLimitedRelief", proceedingId: proceeding.id, orderId: record.id,
                action: "restore", scope: "agency-rule", fraction: 1 });
        return effects;
    }
    const rule = state.pendingRules.find((entry) => entry.id === record.id);
    const unlanded = rule?.status === "pending" || rule?.status === "stayed";
    if (unlanded) {
        effects.push({ kind: "pendingRule", set: { ...rule, status: "canceled", resolvedTurn: state.turn } });
    }
    else if (rule?.status === "in-effect") {
        effects.push({ kind: "pendingRule", set: { ...rule, status: "struck-down", resolvedTurn: state.turn } }, { kind: "orderRemedy", ruleId: rule.id });
    }
    else if (!rule) {
        effects.push({ kind: "orderRemedy", orderId: record.id });
    }
    effects.push(...withdrawnFromStates(state, order), { kind: "metric", deltas: strikeDownCost(order, !unlanded) }, orderDeed(ORDER_DOMAIN_BAND[order.domain], "failed", state.turn));
    return effects;
}
function advance(state, charter, record, proceeding) {
    const order = executiveOrder(record.order);
    if (!order || state.turn < proceeding.nextTurn || proceeding.stage === "final")
        return [];
    const rule = state.pendingRules.find((entry) => entry.id === record.id);
    const ground = specializedGround(proceeding.matter, rule, constitutionalGround(state, record.order), record, state);
    const draw = createRngStreams(state.seed).stream("court-procedure", proceeding.id, proceeding.stage).next();
    const set = (next) => [{ kind: "courtProceeding", set: next }];
    switch (proceeding.stage) {
        case "remand":
            return [];
        case "threshold":
            if (!(specializedThreshold(proceeding.matter, rule) ?? thresholdPasses(charter, order, ground, draw)))
                return finalEffects(state, record, proceeding, order, "upheld");
            return set(courtStep(proceeding, "interim", state.turn, "The lower court accepts the challenge for merits review.", {}, proceeding.filedTurn + courtWeeks(state.seed, proceeding.id, "interim")));
        case "interim": {
            const rule = state.pendingRules.find((entry) => entry.id === record.id && entry.status === "pending");
            const activeAgencyRule = proceeding.matter?.kind === "agency-procedure"
                ? state.pendingRules.find((entry) => entry.id === record.id && entry.status === "in-effect") : undefined;
            const constructionStay = proceeding.matter?.kind === "emergency-construction"
                && constructionInterimRelief(state, record, charter, order, ground, draw);
            const stay = Boolean((rule || activeAgencyRule) && (specializedOf(proceeding) ? ground === "forbidden" : draw < 0.5 * Math.min(0.9, order.overreach)));
            // A mission order is a decree already on the street, so the relief is an injunction against it, not a stay of a rule.
            const relief = !rule && !activeAgencyRule ? missionInterimRelief(state, charter, record, proceeding) : undefined;
            const enjoined = relief !== undefined && draw < relief.chance;
            return [...set(courtStep(proceeding, "lower-merits", state.turn, constructionStay ? "The House shows likely merits success and an irreparable loss of the named project if uncommitted funds are spent. The court pauses new emergency-construction obligations; prior commitments may still be paid."
                    : stay ? activeAgencyRule ? "The lower court pauses this final lease-planning rule while it examines the agency record."
                        : "The lower court stays the unimplemented rule pending merits review."
                        : enjoined ? "The district court enjoins the mission order pending its merits ruling: the plaintiffs show likely success and harm that cannot be undone. The federal forces sent under it stand down."
                            : "The lower court denies interim relief; the challenge continues.", { interim: constructionStay ? "construction-obligations-stayed" : stay ? activeAgencyRule ? "rule-paused" : "rule-stayed" : enjoined ? "order-enjoined" : "denied" }, proceeding.filedTurn + courtWeeks(state.seed, proceeding.id, "lowerMerits"))),
                ...(stay && activeAgencyRule ? [{ kind: "courtLimitedRelief", proceedingId: proceeding.id,
                        orderId: record.id, action: "apply", scope: "agency-rule", fraction: 1 }] : []),
                ...(stay && rule ? [{ kind: "pendingRule", set: { ...rule, status: "stayed" } }] : [])];
        }
        case "lower-merits": {
            const forum = DISTRICT_FORUM_READINGS.find((row) => row.id === proceeding.lowerForum?.id)
                ?? districtForumFor(proceeding.matter?.state, proceeding.id, state.seed);
            const legalChance = withPrecedent(state, order.id, specializedMeritsChance(charter, order, proceeding.matter, rule, undefined, ground)
                ?? strikeDownChance(charter, order, undefined, ground));
            const modeledStrikeChance = districtStrikeChance(legalChance, forum, order);
            const holding = draw < modeledStrikeChance ? "struck-down" : "upheld";
            const responseDue = holding === "struck-down";
            const next = courtStep(proceeding, "appeal", state.turn, responseDue ? "The lower court sets aside the order. Its judgment is in force now; the administration may seek review and separately request a stay."
                : "The lower court sustains the order. Its preliminary relief is dissolved; independent limits, if any, still apply.", { lowerForum: proceeding.lowerForum ?? { id: forum.id, court: forum.court, circuit: forum.circuit,
                    sourceDate: LOWER_BENCH_SOURCE_DATE, authorized: forum.authorized, activeRepublican: forum.activeRepublican,
                    activeDemocratic: forum.activeDemocratic, vacancies: forum.vacancies },
                lower: { holding, ruledTurn: state.turn, ground, enforcement: "in-force", modeledStrikeChance, draw },
                ...(holding === "upheld" ? { interim: "denied" } : {}) });
            return [...set(next), ...(responseDue ? [
                    ...(rule?.status === "pending" ? [{ kind: "pendingRule", set: { ...rule, status: "stayed" } }] : []),
                    { kind: "case", actor: "world", raise: { id: `case:review:${proceeding.id}`, kind: "court-response",
                            title: `Further review of ${order.name}`, subject: { kind: "court-proceeding", id: proceeding.id },
                            clock: { kind: "operational", dueAt: addDays(state.calendar, 7) },
                            defaultOutcome: { kind: "legal-default", outcomeId: "accept-lower-judgment" },
                            urgency: "hard", responseRequirement: "president",
                            allowedDispositions: ["act", "defer", "allow-default"] } },
                ] : [
                    ...(rule?.status === "stayed" ? [{ kind: "pendingRule", set: { ...rule, status: "pending" } }] : []),
                    ...(proceeding.partyRelief?.active && proceeding.matter?.kind === "agency-procedure"
                        ? [{ kind: "courtLimitedRelief", proceedingId: proceeding.id, orderId: record.id,
                                action: "restore", scope: "agency-rule", fraction: 1 }] : []),
                ])];
        }
        case "appeal":
            if (!proceeding.lower)
                throw new Error(`appeal has no lower judgment: ${proceeding.id}`);
            if (proceeding.lower.holding === "struck-down") {
                const response = state.cases?.[`case:review:${proceeding.id}`];
                if (!proceeding.governmentReview) {
                    if (response?.status !== "defaulted")
                        return [];
                    return finalEffects(state, record, { ...proceeding, governmentReview: "defaulted" }, order, proceeding.lower.holding);
                }
                if (proceeding.stayApplication?.status === "pending") {
                    const draw = createRngStreams(state.seed).stream("court-stay", proceeding.id).next();
                    const factors = proceeding.stayApplication.factors;
                    const granted = draw < factors.modeledGrantChance;
                    const decided = { ...courtStep(proceeding, "appeal", state.turn, `The reviewing court ${granted ? "grants" : "denies"} a stay pending appeal after weighing likely merits success, irreparable harm, harm to other parties, and the public interest. Likely success and irreparable harm carry the most weight.`, { lower: { ...proceeding.lower, enforcement: granted ? "stayed-pending-appeal" : "in-force" },
                            stayApplication: { ...proceeding.stayApplication, status: granted ? "granted" : "denied",
                                decidedTurn: state.turn, factors: { ...factors, draw } } }), nextTurn: state.turn + 1 };
                    return [...set(decided), { kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                                kind: granted ? "stay-granted" : "stay-denied",
                                change: 0,
                                account: granted ? "The reviewing court granted the emergency stay." : "The reviewing court denied the emergency stay." } }, ...(granted ? [
                            ...(rule?.status === "stayed" ? [{ kind: "pendingRule", set: { ...rule, status: "pending" } }] : []),
                            ...(proceeding.partyRelief?.active && proceeding.matter?.kind === "agency-procedure"
                                ? [{ kind: "courtLimitedRelief", proceedingId: proceeding.id, orderId: record.id,
                                        action: "restore", scope: "agency-rule", fraction: 1 }] : []),
                        ] : [])];
                }
            }
            if (!proceeding.circuit)
                return set(courtStep(proceeding, "circuit-merits", state.turn, "The appeal is docketed in the circuit court; a three-judge panel will decide it."));
            {
                const sgStanding = solicitorGeneralStanding(state.judiciary.solicitorGeneral);
                const adjustment = standingAdjustment(state.judiciary.solicitorGeneral);
                const modeledGrantChance = appealGrantChance(ground, proceeding.circuit.holding, adjustment);
                const reviewed = { ...proceeding, reviewDecision: { modeledGrantChance, draw,
                        solicitorGeneralStanding: sgStanding, standingAdjustment: adjustment } };
                if (!appealGranted(ground, proceeding.circuit.holding, draw, adjustment))
                    return [
                        ...finalEffects(state, record, { ...reviewed, appeal: "denied" }, order, proceeding.circuit.holding),
                        { kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                                kind: "review-denied", change: 0,
                                account: "The Supreme Court declined the administration's request for review." } }
                    ];
                const calendar = scheduleSupremeArgument(state);
                return [...set({ ...courtStep(reviewed, "supreme-merits", state.turn, `The Supreme Court grants review. Argument is placed on its October ${calendar.termYear} calendar.`, { appeal: "granted", calendar }), nextTurn: calendar.argumentTurn }),
                    { kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                            kind: "review-granted", change: 0, account: "The Supreme Court granted the administration's request for review." } }];
            }
        case "circuit-merits": {
            if (!proceeding.lower)
                throw new Error(`circuit appeal has no district judgment: ${proceeding.id}`);
            const circuit = proceeding.lowerForum?.circuit ?? districtForumFor(proceeding.matter?.state, proceeding.id, state.seed).circuit;
            if (!proceeding.circuitPanel)
                return assignCircuitPanel(state, proceeding, record, circuit)
                    ?? set({ ...courtStep(proceeding, "circuit-merits", state.turn, "The circuit cannot assign three eligible judges; the appeal remains pending."), nextTurn: state.turn + 4 });
            const participating = proceeding.circuitPanel.assigned.filter(({ seatId, judge }) => {
                const seat = state.institutions[seatId];
                const person = state.people[judge];
                return seat?.vacancy === false && seat.leader === judge && person?.alive
                    && person.currentRole === JUDICIARY_SEAT_ROLE
                    && !priorGovernmentAdviceRecusal(judge, record);
            });
            if (participating.length < 2)
                return assignCircuitPanel(state, proceeding, record, circuit)
                    ?? set({ ...courtStep(proceeding, "circuit-merits", state.turn, "Fewer than two assigned judges can sit; the appeal waits for a lawful panel."), nextTurn: state.turn + 4 });
            const votes = participating.map(({ seatId, judge }) => {
                const person = state.people[judge];
                const member = { ideology: person.base.ideology, integrity: person.base.integrity, competence: person.base.competence };
                const chance = withPrecedent(state, order.id, specializedMeritsChance(charter, order, proceeding.matter, rule, member, ground)
                    ?? justiceStrikePropensity(charter, order, member, ground));
                return { seatId, judge, vote: draw < chance ? "strike" : "uphold" };
            });
            if (votes.length === 2 && votes[0].vote !== votes[1].vote)
                return assignCircuitPanel(state, proceeding, record, circuit, participating) ?? set({ ...courtStep(proceeding, "circuit-merits", state.turn, "The two remaining judges disagree. No panel judgment is entered while a third judge is assigned."), nextTurn: state.turn + 4 });
            const holding = votes.filter((vote) => vote.vote === "strike").length >= 2 ? "struck-down" : "upheld";
            const next = courtStep(proceeding, "appeal", state.turn, `A ${votes.length === 2 ? "two-judge quorum of the assigned" : "three-judge"} ${circuit} Circuit panel ${holding === "struck-down" ? "sets aside" : "sustains"} the order, ${votes.filter((vote) => vote.vote === (holding === "struck-down" ? "strike" : "uphold")).length} to ${votes.filter((vote) => vote.vote !== (holding === "struck-down" ? "strike" : "uphold")).length}.`, { circuit: { court: circuit, ruledTurn: state.turn, holding, votes } }, state.turn + courtWeeks(state.seed, proceeding.id, "certDisposition"));
            return [...set(next),
                ...(holding === "struck-down" && rule?.status === "pending"
                    ? [{ kind: "pendingRule", set: { ...rule, status: "stayed" } }] : []),
                ...(holding === "upheld" && rule?.status === "stayed"
                    ? [{ kind: "pendingRule", set: { ...rule, status: "pending" } }] : [])];
        }
        case "supreme-merits": {
            if (!proceeding.lower)
                throw new Error(`Supreme Court review has no lower judgment: ${proceeding.id}`);
            if (proceeding.calendar?.status === "scheduled" || proceeding.calendar?.status === "carried") {
                const argued = { ...courtStep(proceeding, "supreme-merits", state.turn, "The Supreme Court hears argument; its opinion is expected in the usual late-June window if a quorum can sit.", { calendar: { ...proceeding.calendar, status: "argued" } }), nextTurn: proceeding.calendar.opinionTurn };
                return set(argued);
            }
            const decision = decideCase(charter, order, benchForVotes(state, record), ground, draw, proceeding.id, (member) => withPrecedent(state, order.id, specializedMeritsChance(charter, order, proceeding.matter, rule, member, ground)
                ?? justiceStrikePropensity(charter, order, member, ground)));
            if (decision.disposition === "no-quorum") {
                const carry = Boolean(proceeding.calendar && state.turn + 4 > proceeding.calendar.opinionTargetTurn);
                const nextCalendar = carry ? { ...scheduleSupremeArgument(state), status: "carried" } : proceeding.calendar;
                return set({ ...courtStep(proceeding, "supreme-merits", state.turn, proceeding.lower.enforcement === "in-force" ? "Fewer than six justices can sit. Review waits; the lower judgment remains in force and prospective action stays paused."
                        : "Fewer than six justices can sit. Review waits; the lower judgment remains recorded and its enforcement stays deferred.", nextCalendar ? { calendar: nextCalendar } : {}), nextTurn: nextCalendar && carry ? nextCalendar.argumentTurn : state.turn + 4 });
            }
            return finalEffects(state, record, proceeding, order, decision.disposition === "equal-division" ? proceeding.circuit?.holding ?? proceeding.lower.holding : decision.holding, decision);
        }
    }
}
/** Court steps are autonomous and recorded one at a time; only a final judgment changes the order's review status. */
export function judicialReviewPhase(charter) {
    return (state) => {
        const effects = [];
        for (const record of state.orders) {
            if (record.review?.status !== "pending")
                continue;
            if (record.order === "order-entry-suspension"
                && !state.services?.["consular-visas"]?.entryRefusals?.some((entry) => entry.orderRecordId === record.id))
                continue;
            if (record.order === "order-energy-leasing"
                && state.pendingRules.find((entry) => entry.id === record.id)?.status !== "in-effect")
                continue;
            const existing = state.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order" && entry.subject.recordId === record.id);
            const rule = state.pendingRules.find((entry) => entry.id === record.id);
            const matter = specializedMatter(state, record, rule);
            const opened = existing ?? openedProceeding(record.id, record.order, state.turn, Math.max(state.turn, record.review.dueTurn), matter);
            const forum = districtForumFor(matter?.state, opened.id, state.seed);
            const proceeding = opened.lowerForum ? opened : { ...opened, lowerForum: { id: forum.id, court: forum.court,
                    circuit: forum.circuit, sourceDate: LOWER_BENCH_SOURCE_DATE, authorized: forum.authorized,
                    activeRepublican: forum.activeRepublican, activeDemocratic: forum.activeDemocratic, vacancies: forum.vacancies } };
            if (!existing)
                effects.push({ kind: "courtProceeding", set: proceeding });
            effects.push(...advance(state, charter, record, proceeding));
        }
        effects.push(...statutoryMatterEffects(state, charter));
        const electionAccess = electionAccessMatterEffects(state);
        effects.push(...electionAccess);
        effects.push(...fairHousingMatterEffects(state));
        effects.push(...wageHourMatterEffects(state));
        effects.push(...surveillanceMatterEffects(state));
        effects.push(...courtOrderRulingEffects(state));
        effects.push(...removalMatterEffects(state));
        effects.push(...backgroundDocketEffects(state));
        if (!effects.length)
            return [];
        return [{ source: "simulate", actor: "world", turn: state.turn + 1,
                provenance: { origin: "scheduled", confidence: "observed", visibility: "public", systems: electionAccess.length
                        ? ["judiciary", "orders", "elections"] : ["judiciary", "orders"] },
                narration: { summary: "The courts advance the administration's pending challenges." }, effects }];
    };
}
/** Answer the dated lower-court review choice without changing the court's merits or grant decision. */
export function answerLowerOrderReview(campaign, proceedingId, choice) {
    const proceeding = campaign.judiciary.proceedings?.find((entry) => entry.id === proceedingId);
    if (!proceeding || proceeding.subject.kind !== "executive-order" || proceeding.stage !== "appeal" ||
        proceeding.lower?.holding !== "struck-down" || proceeding.lower.enforcement !== "in-force" || proceeding.governmentReview)
        return { ok: false, reason: "No adverse lower ruling is awaiting this decision." };
    const responseId = `case:review:${proceedingId}`;
    const response = campaign.cases?.[responseId];
    if (!response || !["raised", "opened", "considering", "deferred"].includes(response.status))
        return { ok: false, reason: "The review decision has closed." };
    const subject = proceeding.subject;
    if (subject.kind !== "executive-order")
        return { ok: false, reason: "This is not an order case." };
    const record = campaign.orders.find((entry) => entry.id === subject.recordId);
    const order = record && executiveOrder(record.order);
    if (!record || !order || record.review?.status !== "pending")
        return { ok: false, reason: "The challenged order is no longer pending." };
    const merits = proceeding.lower.ground === "authorized" ? 0.8 : proceeding.lower.ground === "silent" ? 0.5 : 0.2;
    const rule = campaign.pendingRules.find((entry) => entry.id === record.id);
    const irreparableHarm = rule?.status === "in-effect" || !rule ? 0.7 : 0.45;
    const harmToOthers = proceeding.matter?.injury ? 0.35 : 0.55;
    const publicInterest = proceeding.matter?.kind === "emergency-construction" ? 0.45 : 0.55;
    // Nken's first two factors dominate; the probability is a transparent game assumption.
    const sgStanding = solicitorGeneralStanding(campaign.judiciary.solicitorGeneral);
    const adjustment = standingAdjustment(campaign.judiciary.solicitorGeneral);
    const modeledGrantChance = Math.min(0.85, Math.max(0.05, 0.05 + 0.4 * merits + 0.3 * irreparableHarm + 0.1 * harmToOthers + 0.1 * publicInterest + adjustment));
    const effects = choice !== "accept"
        ? [{ kind: "courtProceeding", set: { ...proceeding, governmentReview: choice,
                    nextTurn: campaign.turn + 1,
                    ...(choice === "seek-with-stay" ? { stayApplication: { status: "pending",
                            requestedTurn: campaign.turn, factors: { merits, irreparableHarm, harmToOthers,
                                publicInterest, modeledGrantChance, solicitorGeneralStanding: sgStanding, standingAdjustment: adjustment } } } : {}),
                    history: [...proceeding.history, { turn: campaign.turn, stage: "appeal",
                            account: choice === "seek-with-stay"
                                ? "The administration seeks review and separately applies for a stay; the lower judgment remains in force until a court grants one."
                                : "The administration seeks further review without a stay; the lower judgment remains in force." }] } }]
        : [...finalEffects(campaign, record, { ...proceeding, governmentReview: "accept" }, order, proceeding.lower.holding)];
    if (choice === "seek-with-stay") {
        effects.push({ kind: "solicitorGeneral", event: {
                proceedingId, turn: campaign.turn, kind: "stay-requested", change: 0,
                account: "The administration sought an emergency stay of an adverse lower judgment."
            } });
    }
    if (choice !== "accept" && proceeding.lower.ground === "forbidden")
        effects.push({ kind: "solicitorGeneral", event: {
                proceedingId, turn: campaign.turn, kind: "overreach", change: -3,
                account: "The administration pressed review despite a ground the charter forbids."
            } });
    if (choice === "accept")
        effects.push({ kind: "solicitorGeneral", event: {
                proceedingId, turn: campaign.turn, kind: "restraint", change: proceeding.lower.ground === "forbidden" ? 2 : 0,
                account: proceeding.lower.ground === "forbidden"
                    ? "The administration abandoned an order the lower court found beyond its constitutional authority."
                    : "The administration accepted an adverse lower judgment."
            } });
    effects.push({ kind: "case", actor: "player", transition: { id: responseId,
            disposition: { kind: "act", actionId: choice },
            narration: choice === "accept" ? "The administration accepted the lower judgment."
                : choice === "seek-with-stay" ? "The administration sought review and applied for a stay." : "The administration sought further review." } });
    return { ok: true, packet: { source: "action", actor: "player", turn: campaign.turn,
            provenance: { origin: "decision", entities: [proceedingId], systems: ["judiciary", "orders"] },
            narration: { summary: choice !== "accept" ? "The administration asks for further review; the lower judgment remains in force unless a court grants a stay or reverses it."
                    : "The administration accepts the lower judgment; the challenged rule ends." }, effects } };
}
function rulingItem(state, order, courtCase) {
    const strikes = courtCase.votes.filter((vote) => vote.vote === "strike").length;
    const upholds = courtCase.votes.length - strikes;
    const split = courtCase.procedure?.appeal === "equally-divided" ? `${strikes} to ${upholds}, equally divided` : courtCase.votes.length ? `${Math.max(strikes, upholds)} to ${Math.min(strikes, upholds)}` : "lower court";
    const forum = courtCase.procedure?.forum === "lower" ? "The district court"
        : courtCase.procedure?.forum === "circuit" ? "The circuit court" : "The Supreme Court";
    const verb = courtCase.procedure?.dismissedAtThreshold ? "dismisses the challenge to" : courtCase.procedure?.appeal === "equally-divided" ? "leaves the lower judgment in force on" : courtCase.holding === "struck-down" ? "strikes down" : "upholds";
    const author = courtCase.majorityAuthor ? selectPerson(state, courtCase.majorityAuthor)?.base.name : undefined;
    return { turn: state.turn, kind: "governance", visibility: "public", headline: `${forum} ${verb} ${order.name}${courtCase.procedure?.forum === "lower" ? "" : `, ${split}`}.`,
        facts: { instrument: order.name, figure: split, stake: courtCase.question.replace(/\.$/, "").replace(/^Whether/, "whether"),
            ...(author ? { subject: author } : {}), topicTags: ["judiciary"] } };
}
function withdrawnFromStates(state, order) {
    const signature = order.domestic;
    if (order.domain !== "civil" || !signature || signature.federal === undefined || (signature.sectors ?? []).length > 0)
        return [];
    const negate = (weights) => weights ? Object.fromEntries(Object.entries(weights).map(([axis, weight]) => [axis, -weight])) : undefined;
    const reversed = {
        federal: -signature.federal,
        ...(signature.urban !== undefined ? { urban: -signature.urban } : {}),
        ...(signature.axes ? { axes: negate(signature.axes) } : {}),
        ...(signature.values ? { values: negate(signature.values) } : {}),
        magnitude: signature.magnitude,
        signature: `${signature.signature}:struck`,
        reason: `The Court struck down ${order.name}, and what it promised the states is withdrawn.`,
    };
    return routeDomestic(state, reversed);
}
