import { selectLaws } from "./state.js";
import { executiveOrder } from "./orders.js";
import { createRngStreams } from "./rng.js";
import { appealGrantChance, appealGranted, courtStep, lowerMerits } from "./court-procedure.js";
import { scheduleSupremeArgument } from "./court-calendar.js";
import { solicitorGeneralStanding, standingAdjustment } from "./solicitor-general.js";
import { benchForVotes, decideCase } from "./court-votes.js";
// This is a challenge to Congress's industrial-base grant after the government
// actually invokes it. A pre-enforcement challenge to an unused standby power
// would invent an injury and should not appear on the docket.
const ACT = "act-defense-authorization";
const ORDER = "order-defense-production";
function matter(record) {
    const supplier = record.defenseContract?.supplier ?? "The supplier identified in the priority order";
    const contract = record.defenseContract ? `${record.defenseContract.munitionClass} contract` : "priority contract";
    return {
        kind: "statutory-authority",
        title: `${supplier} v. Department of Defense`,
        parties: [{ name: supplier, role: "plaintiff" }, { name: "Department of Defense", role: "defendant" }],
        injury: `The ${contract} displaces the modeled supplier's existing private contracts.`,
        jurisdiction: "Federal-question jurisdiction; the regulated manufacturers have a concrete contractual injury from the priority order.",
        question: "Does the industrial-base authorization permit the full priority imposed on private production?",
        authority: "The Annual Defense Authorization Act's industrial-base title and the Defense Production Act's priority authority.",
        disputedFacts: "The size of the production shortfall and how much private capacity the priority displaces.",
        reliefSought: "Relief for the regulated parties, and a narrower construction of the statutory grant if the Supreme Court reaches the merits.",
        affected: `Only ${supplier}'s ${contract}; other suppliers and the rest of the Act remain outside party relief.`,
    };
}
export function statutoryMatterId(billId, orderRecordId) {
    return `statute:${billId}:${orderRecordId}`;
}
function opened(bill, record) {
    const filedTurn = Math.max(bill.resolvedTurn ?? bill.introducedTurn, record.turn);
    return { id: statutoryMatterId(bill.id, record.id),
        subject: { kind: "statutory-authority", billId: bill.id, actId: ACT, orderId: ORDER, recordId: record.id },
        matter: matter(record), filedTurn, stage: "threshold", nextTurn: filedTurn + 1,
        history: [{ turn: filedTurn, stage: "threshold", account: "Regulated manufacturers file a federal statutory challenge after a priority order displaces their contracts." }] };
}
function finalCase(state, proceeding, holding, decision) {
    const supreme = decision?.disposition === "majority";
    const relief = holding === "struck-down" ? supreme ? "statutory-construction" : "party-specific" : undefined;
    const disposition = decision?.disposition === "equal-division"
        ? "An equally divided Supreme Court leaves the lower judgment in force without a national merits holding."
        : supreme
            ? holding === "struck-down"
                ? "The statutory grant does not reach the full production priority. The named authorization is construed narrowly; the rest of the Act remains in force."
                : "The industrial-base grant permits this production priority."
            : proceeding.lower
                ? holding === "struck-down"
                    ? "The lower judgment affords relief only to the regulated plaintiffs; the national statutory grant remains available pending a Supreme Court holding."
                    : "The lower court sustains the priority under the statute; review was denied."
                : "The manufacturers' challenge is dismissed at threshold; no court reached the statute's merits.";
    return { id: proceeding.id, order: ORDER, subject: proceeding.subject, matter: proceeding.matter,
        question: proceeding.matter.question, ground: "authorized", filedTurn: proceeding.filedTurn,
        dueTurn: proceeding.nextTurn, ruledTurn: state.turn, holding,
        votes: decision?.votes ?? [],
        ...(decision?.majorityAuthor ? { majorityAuthor: decision.majorityAuthor } : {}),
        ...(decision?.dissentAuthor ? { dissentAuthor: decision.dissentAuthor } : {}),
        opinion: { majority: disposition },
        procedure: { forum: decision ? "supreme" : "lower",
            ...(proceeding.lower ? { lower: proceeding.lower.holding } : { dismissedAtThreshold: true }),
            ...(decision ? { appeal: decision.disposition === "equal-division" ? "equally-divided" : "majority" } : proceeding.appeal ? { appeal: proceeding.appeal } : {}),
            ...(relief ? { relief } : {}), ...(proceeding.remanded ? { remanded: true } : {}),
            history: proceeding.history } };
}
function finish(state, proceeding, holding, decision) {
    const account = decision?.disposition === "equal-division" ? "The Supreme Court divides equally; the lower judgment stands without precedent."
        : decision ? "The Supreme Court decides the statutory scope on the merits."
            : proceeding.lower ? "The Supreme Court declines review; the lower judgment is final for the parties."
                : "The lower court dismisses the challenge at threshold.";
    const settled = courtStep(proceeding, "final", state.turn, account, { appeal: decision?.disposition === "equal-division" ? "equally-divided" : decision ? "majority" : proceeding.appeal });
    const record = finalCase(state, settled, holding, decision);
    const relief = holding === "struck-down" ? decision?.disposition === "majority" ? "broad" : "party" : "restore";
    const effects = [{ kind: "courtProceeding", set: settled }, { kind: "courtCase", set: record }];
    if (decision && proceeding.lower?.holding === "struck-down" && holding === "struck-down")
        effects.push({ kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                kind: "merits-rejected", change: 0, account: "The Supreme Court rejected the government's statutory position." } });
    if (relief === "broad")
        effects.push({ kind: "orderRemedy", orderId: proceeding.subject.kind === "statutory-authority" ? proceeding.subject.recordId : "" });
    else if (relief === "party" && !proceeding.partyRelief?.appliedOnce)
        effects.push(limitedRelief(state, proceeding, "apply"));
    else if (relief === "restore" && proceeding.partyRelief?.active)
        effects.push(limitedRelief(state, proceeding, "restore"));
    effects.push({ kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
                headline: `${record.procedure?.forum === "supreme" ? "The Supreme Court" : "A federal lower court"} resolves the manufacturers' statutory challenge.`,
                facts: { instrument: record.matter.title, stake: record.opinion.majority, topicTags: ["judiciary", "defense"] } }] });
    return effects;
}
function limitedRelief(state, proceeding, action) {
    if (proceeding.subject.kind !== "statutory-authority")
        throw new Error("Limited relief needs a statutory proceeding.");
    const sectors = state.sectors[state.founding.nation];
    // The live sector mix is a bounded proxy for the named suppliers' share, not a measured capacity figure.
    const fraction = Math.max(0, Math.min(1, (sectors?.["defense-industrial"]?.mix ?? 0) + (sectors?.aerospace?.mix ?? 0)));
    return { kind: "courtLimitedRelief", proceedingId: proceeding.id, orderId: proceeding.subject.recordId,
        action, scope: "defense-industrial", fraction };
}
function advance(state, charter, proceeding) {
    if (state.turn < proceeding.nextTurn || proceeding.stage === "final")
        return [];
    if (proceeding.subject.kind !== "statutory-authority")
        throw new Error("A statutory matter needs its statutory subject.");
    const subject = proceeding.subject;
    const order = executiveOrder(ORDER);
    const draw = createRngStreams(state.seed).stream("statutory-matter", proceeding.id, proceeding.stage, proceeding.remanded ? "remanded" : "first").next();
    const set = (next) => [{ kind: "courtProceeding", set: next }];
    switch (proceeding.stage) {
        case "threshold": {
            const record = state.orders.find((entry) => entry.id === subject.recordId);
            const grant = selectLaws(state).some((entry) => entry.id === subject.billId);
            return !record || !grant ? finish(state, proceeding, "upheld")
                : set(courtStep(proceeding, "interim", state.turn, "The signed priority order displaces the plaintiffs' contracts; the enacted grant supplies a federal statutory question."));
        }
        case "interim": {
            const stay = draw < 0.25;
            return [...set(courtStep(proceeding, "lower-merits", state.turn, stay ? "Interim relief protects only the plaintiff manufacturers' contracts while merits review continues." : "Interim relief is denied; merits review continues.", { interim: stay ? "party-stayed" : "denied" })),
                ...(stay ? [limitedRelief(state, proceeding, "apply")] : [])];
        }
        case "lower-merits": {
            const holding = lowerMerits(charter, order, "authorized", draw);
            return set(courtStep(proceeding, "appeal", state.turn, `The lower court ${holding === "struck-down" ? "limits the priority as to the plaintiffs" : "sustains the priority"}; its judgment is stayed pending the appeal decision.`, { lower: { holding, ruledTurn: state.turn, ground: "authorized", enforcement: "stayed-pending-appeal" } }));
        }
        case "appeal": {
            if (!proceeding.lower)
                throw new Error(`statutory appeal has no lower judgment: ${proceeding.id}`);
            const governmentPetition = proceeding.lower.holding === "struck-down";
            const sgStanding = solicitorGeneralStanding(state.judiciary.solicitorGeneral);
            const adjustment = governmentPetition ? standingAdjustment(state.judiciary.solicitorGeneral) : 0;
            const reviewed = { ...proceeding, reviewDecision: { modeledGrantChance: appealGrantChance("authorized", proceeding.lower.holding, adjustment),
                    draw, solicitorGeneralStanding: sgStanding, standingAdjustment: adjustment } };
            if (!appealGranted("authorized", proceeding.lower.holding, draw, adjustment))
                return [
                    ...finish(state, { ...reviewed, appeal: "denied" }, proceeding.lower.holding),
                    ...(governmentPetition ? [{ kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                                kind: "review-denied", change: 0, account: "The Supreme Court declined the government's statutory petition." } }] : [])
                ];
            const calendar = scheduleSupremeArgument(state);
            return [...set({ ...courtStep(reviewed, "supreme-merits", state.turn, `The Supreme Court grants discretionary review; argument is placed in its October ${calendar.termYear} term.`, { appeal: "granted", calendar }), nextTurn: calendar.argumentTurn }),
                ...(governmentPetition ? [{ kind: "solicitorGeneral", event: { proceedingId: proceeding.id, turn: state.turn,
                            kind: "review-granted", change: 0, account: "The Supreme Court granted the government's statutory petition." } }] : [])];
        }
        case "supreme-merits": {
            if (!proceeding.lower)
                throw new Error(`statutory review has no lower judgment: ${proceeding.id}`);
            if (proceeding.calendar?.status === "scheduled" || proceeding.calendar?.status === "carried")
                return set({
                    ...courtStep(proceeding, "supreme-merits", state.turn, "The Supreme Court hears argument on the statutory question; an opinion is expected in the usual late-June window if a quorum can sit.", { calendar: { ...proceeding.calendar, status: "argued" } }), nextTurn: proceeding.calendar.opinionTurn
                });
            const sectors = state.sectors[state.founding.nation];
            if (!proceeding.remanded && (!sectors?.["defense-industrial"] || !sectors.aerospace))
                return set(courtStep(proceeding, "remand", state.turn, "The Court sends the disputed production-capacity facts back for a fuller lower-court record.", { remanded: true }));
            const decision = decideCase(charter, order, benchForVotes(state), "authorized", draw, proceeding.id);
            if (decision.disposition === "no-quorum") {
                const carry = Boolean(proceeding.calendar && state.turn + 4 > proceeding.calendar.opinionTargetTurn);
                const nextCalendar = carry ? { ...scheduleSupremeArgument(state), status: "carried" } : proceeding.calendar;
                return set({ ...courtStep(proceeding, "supreme-merits", state.turn, "Fewer than six justices can sit; review waits without a fabricated judgment.", nextCalendar ? { calendar: nextCalendar } : {}), nextTurn: nextCalendar && carry ? nextCalendar.argumentTurn : state.turn + 4 });
            }
            return finish(state, proceeding, decision.disposition === "equal-division" ? proceeding.lower.holding : decision.holding, decision);
        }
        case "circuit-merits":
        case "remand":
            return set(courtStep(proceeding, "lower-merits", state.turn, "The lower court reopens the factual record before deciding the statutory claim again."));
    }
}
/** A live statute and an actual priority order are required before this autonomous filing exists. */
export function statutoryMatterEffects(state, charter) {
    const bills = selectLaws(state).filter((bill) => bill.act === ACT);
    const effects = [];
    // One docket for one priority: an already contested order follows its own
    // challenge, rather than receiving contradictory judgments in the same week.
    for (const record of state.orders.filter((entry) => entry.order === ORDER && !entry.contested && entry.review?.status !== "pending")) {
        const bill = bills.filter((entry) => (entry.resolvedTurn ?? entry.introducedTurn) <= record.turn)
            .sort((a, b) => (b.resolvedTurn ?? b.introducedTurn) - (a.resolvedTurn ?? a.introducedTurn) || b.id.localeCompare(a.id))[0];
        if (bill) {
            const id = statutoryMatterId(bill.id, record.id);
            const existing = state.judiciary.proceedings?.find((entry) => entry.id === id);
            const proceeding = existing ?? opened(bill, record);
            if (!existing)
                effects.push({ kind: "courtProceeding", set: proceeding });
            effects.push(...advance(state, charter, proceeding));
        }
    }
    return effects;
}
