import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { answerLowerOrderReview, judicialReviewPhase, strikeDownCost } from "./judicial-review.js";
import { executiveOrder } from "./orders.js";
import { openedProceeding } from "./court-procedure.js";
import { addDays, selectDateOfTurn, selectTurnOfDate } from "./clock.js";
import { advanceUntilAttention } from "./advance.js";
import { defaultTurnPhases } from "./turn-loop.js";
import { blockingCases, withCaseTransition, withRaisedCase } from "./cases.js";
import { withDueCaseDefaults } from "./case-defaults.js";
import { makeCampaignSeed } from "./rng.js";
import { prospectiveOrderAuthority } from "./order-authority.js";
import { createSave, loadSave } from "./save.js";
import { benchForVotes } from "./court-votes.js";
import { JUDICIARY_SEAT_INSTITUTIONS } from "./judiciary.js";
import { rulemakingPhase } from "./rulemaking.js";
import { CIRCUIT_SEATS, circuitPanelFor, foundingCircuitSeats, materializeCircuitSeat } from "./lower-bench.js";
const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
function challenged(order, index, legacy = false) {
    const base = buildCampaign();
    const record = { id: `${order}:${index}`, order, turn: base.turn, contested: true,
        challengeChance: 0.5, review: { dueTurn: base.turn, status: "pending" } };
    return { ...base, institutions: { ...base.institutions, ...foundingCircuitSeats(base.seed, base.calendar.year) }, orders: [record], judiciary: { cases: [],
            ...(!legacy ? { proceedings: [openedProceeding(record.id, order, base.turn, base.turn)] } : {}) } };
}
/** One court step: the next week, or later when every open stage is waiting on its own dated band. */
function step(state) {
    const after = phase(state).reduce(apply, state);
    const waits = (after.judiciary.proceedings ?? []).filter((entry) => entry.stage !== "final").map((entry) => entry.nextTurn);
    return { ...after, turn: Math.max(after.turn + 1, waits.length ? Math.min(...waits) : 0) };
}
function finish(state) {
    for (let i = 0; i < 30; i += 1) {
        state = step(state);
        if (state.judiciary.cases.length)
            return state;
        if (state.judiciary.proceedings?.some((entry) => entry.stage === "appeal"
            && entry.lower?.holding === "struck-down" && !entry.governmentReview)) {
            state = withDueCaseDefaults({ ...state, calendar: addDays(state.calendar, 7) });
        }
        const pending = state.judiciary.proceedings?.find((entry) => entry.stage === "supreme-merits");
        if (pending && pending.nextTurn > state.turn)
            state = { ...state, turn: pending.nextTurn,
                calendar: selectDateOfTurn(state, pending.nextTurn) };
    }
    throw new Error("case did not finish in thirty court steps");
}
describe("an order challenge's court path", () => {
    it("records a three-judge circuit ruling and preserves it across a save", () => {
        const base = challenged("order-clean-energy", 701);
        const original = base.judiciary.proceedings[0];
        const staged = { ...base, judiciary: { ...base.judiciary, proceedings: [{ ...original,
                        stage: "circuit-merits", nextTurn: base.turn,
                        lower: { holding: "upheld", ruledTurn: base.turn - 1, ground: "silent", enforcement: "in-force" } }] } };
        const assigned = step(staged);
        expect(assigned.judiciary.proceedings?.[0]?.circuitPanel?.assigned).toHaveLength(3);
        expect(assigned.judiciary.proceedings?.[0]?.circuit).toBeUndefined();
        const lost = assigned.judiciary.proceedings[0].circuitPanel.assigned[0];
        const lostSeat = CIRCUIT_SEATS.find((seat) => seat.id === lost.seatId);
        const missingJudge = { ...assigned, people: { ...assigned.people,
                [lost.judge]: { ...assigned.people[lost.judge], alive: false } } };
        expect(materializeCircuitSeat(missingJudge, lostSeat)).toBeUndefined();
        expect(circuitPanelFor(missingJudge, lostSeat.circuit, original.id).map((seat) => seat.id)).not.toContain(lost.seatId);
        const [first, second] = assigned.judiciary.proceedings[0].circuitPanel.assigned.slice(1);
        const divergentPair = { ...missingJudge, people: { ...missingJudge.people,
                [first.judge]: { ...missingJudge.people[first.judge], base: {
                        ...missingJudge.people[first.judge].base,
                        ideology: { economicLeftRight: -0.1, authLibertarian: 0, nationalistGlobalist: -0.1 },
                        integrity: 1, competence: 1
                    } },
                [second.judge]: { ...missingJudge.people[second.judge], base: {
                        ...missingJudge.people[second.judge].base,
                        ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 },
                        integrity: 0, competence: 0
                    } } } };
        const twoJudgeOutcomes = Array.from({ length: 80 }, (_, index) => {
            const candidate = { ...divergentPair, seed: makeCampaignSeed(`two-judge-quorum-${index}`) };
            return phase(candidate).reduce(apply, candidate).judiciary.proceedings[0];
        });
        expect(twoJudgeOutcomes.some((entry) => entry.circuit?.votes.length === 2)).toBe(true);
        expect(twoJudgeOutcomes.filter((entry) => entry.circuit?.votes.length === 2)
            .every((entry) => entry.circuit.votes[0].vote === entry.circuit.votes[1].vote)).toBe(true);
        expect(twoJudgeOutcomes.some((entry) => !entry.circuit)).toBe(true);
        expect(twoJudgeOutcomes.filter((entry) => !entry.circuit)
            .every((entry) => entry.stage === "circuit-merits")).toBe(true);
        const advised = { ...assigned,
            orders: [{ ...assigned.orders[0], legalReviewer: { person: lost.judge, reviewedDay: 5 } }],
            nominations: { ...assigned.nominations, "nomination:advised-circuit": {
                    id: "nomination:advised-circuit", office: lostSeat.office, institution: lostSeat.id,
                    nominee: lost.judge, stage: "confirmed", stageEnteredDay: 1, openedDay: 1,
                    controversies: [], history: []
                } },
            judiciary: { ...assigned.judiciary, proceedings: [{ ...assigned.judiciary.proceedings[0],
                        circuitPanel: undefined, nextTurn: assigned.turn }] } };
        const afterRecusal = phase(advised).reduce(apply, advised).judiciary.proceedings[0];
        expect(afterRecusal.circuitPanel?.recusals).toContainEqual(expect.objectContaining({
            seatId: lostSeat.id, judge: lost.judge, reason: "prior-government-advice"
        }));
        expect(afterRecusal.circuitPanel?.assigned.map((judge) => judge.judge)).not.toContain(lost.judge);
        const withoutNomination = { ...advised, nominations: {} };
        const recusedWithoutHistory = phase(withoutNomination).reduce(apply, withoutNomination).judiciary.proceedings[0];
        expect(recusedWithoutHistory.circuitPanel?.recusals).toContainEqual(expect.objectContaining({
            seatId: lostSeat.id, judge: lost.judge, reason: "prior-government-advice"
        }));
        const otherOrderAdvice = { ...withoutNomination, orders: [assigned.orders[0],
                { ...assigned.orders[0], id: "unrelated-order", legalReviewer: { person: lost.judge, reviewedDay: 5 } }] };
        const unrelatedPanel = phase(otherOrderAdvice).reduce(apply, otherOrderAdvice).judiciary.proceedings[0].circuitPanel;
        expect(unrelatedPanel?.recusals).toEqual([]);
        expect(unrelatedPanel?.assigned.map((judge) => judge.judge)).toContain(lost.judge);
        const ruled = step(assigned);
        const circuit = ruled.judiciary.proceedings?.[0]?.circuit;
        expect(circuit?.votes).toHaveLength(3);
        expect(new Set(circuit?.votes.map((vote) => vote.seatId)).size).toBe(3);
        expect(circuit?.holding).toBe(circuit.votes.filter((vote) => vote.vote === "strike").length >= 2 ? "struck-down" : "upheld");
        expect(circuit?.votes.every((vote) => ruled.people[vote.judge]?.alive)).toBe(true);
        expect(prospectiveOrderAuthority(ruled, base.orders[0].id)).toBe(circuit?.holding === "struck-down" ? "suspended" : "operative");
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(ruled))));
        expect(restored.judiciary.proceedings?.[0]?.circuit).toEqual(circuit);
    });
    it("records review odds and waits for argument and opinion before a Supreme Court judgment", () => {
        const base = challenged("order-clean-energy", 700);
        const date = { year: 2029, month: 3, day: 1 };
        const turn = selectTurnOfDate(base, date) + 1;
        const original = base.judiciary.proceedings[0];
        const staged = { ...base, calendar: date, turn, judiciary: { ...base.judiciary,
                solicitorGeneral: { standing: 70, events: [] },
                proceedings: [{ ...original, stage: "appeal", nextTurn: turn,
                        governmentReview: "seek",
                        lower: { holding: "struck-down", ruledTurn: turn - 1,
                            ground: "silent", enforcement: "in-force" } }] } };
        const granted = Array.from({ length: 100 }, (_, i) => {
            const candidate = { ...staged, seed: makeCampaignSeed(`term-grant-${i}`) };
            return step(step(step(step(candidate))));
        }).find((candidate) => candidate.judiciary.proceedings?.[0]?.stage === "supreme-merits");
        expect(granted).toBeDefined();
        if (!granted)
            return;
        const proceeding = granted.judiciary.proceedings[0];
        expect(granted.judiciary.cases).toHaveLength(0);
        expect(proceeding.reviewDecision?.solicitorGeneralStanding).toBe(70);
        expect(proceeding.reviewDecision?.standingAdjustment).toBe(0.04);
        expect(proceeding.calendar?.status).toBe("scheduled");
        expect(proceeding.nextTurn).toBe(proceeding.calendar?.argumentTurn);
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(granted))));
        expect(reloaded.judiciary.proceedings?.[0]?.calendar).toEqual(proceeding.calendar);
        expect(reloaded.judiciary.proceedings?.[0]?.reviewDecision).toEqual(proceeding.reviewDecision);
        expect(reloaded.judiciary.solicitorGeneral).toEqual(granted.judiciary.solicitorGeneral);
        const beforeArgument = { ...granted, turn: proceeding.nextTurn - 1 };
        expect(phase(beforeArgument)).toEqual([]);
        const argument = { ...granted, turn: proceeding.nextTurn,
            calendar: selectDateOfTurn(granted, proceeding.nextTurn) };
        const argued = phase(argument).reduce(apply, argument);
        expect(argued.judiciary.proceedings?.[0]?.calendar?.status).toBe("argued");
        expect(argued.judiciary.cases).toHaveLength(0);
        expect(argued.judiciary.proceedings?.[0]?.nextTurn).toBe(proceeding.calendar?.opinionTurn);
    });
    it("pauses an operative order at adverse lower merits and offers a dated response", () => {
        const base = challenged("order-clean-energy", 71);
        const record = base.orders[0];
        const rule = { id: record.id, order: record.order, signedTurn: base.turn,
            effectiveTurn: base.turn - 1, status: "in-effect" };
        const lower = { ...base, pendingRules: [rule], judiciary: { ...base.judiciary,
                proceedings: [{ ...base.judiciary.proceedings[0], stage: "lower-merits", nextTurn: base.turn }] } };
        const found = Array.from({ length: 100 }, (_, i) => {
            const state = { ...lower, seed: makeCampaignSeed(`operative-lower-${i}`) };
            return phase(state).reduce(apply, state);
        }).find((state) => state.judiciary.proceedings?.[0]?.lower?.holding === "struck-down");
        expect(found).toBeDefined();
        if (!found)
            return;
        expect(found.pendingRules[0]?.status).toBe("in-effect");
        expect(found.judiciary.proceedings?.[0]?.lower?.enforcement).toBe("in-force");
        expect(prospectiveOrderAuthority(found, record.id)).toBe("suspended");
        expect(found.cases?.[`case:review:${found.judiciary.proceedings[0].id}`]?.status).toBe("raised");
    });
    it("decides a requested stay separately, preserves independent limits, and replays after save", () => {
        const base = challenged("order-clean-energy", 72);
        const record = base.orders[0];
        const proceeding = { ...base.judiciary.proceedings[0], stage: "appeal", nextTurn: base.turn,
            lower: { holding: "struck-down", ruledTurn: base.turn, ground: "silent",
                enforcement: "in-force" } };
        const other = { ...proceeding, id: `${proceeding.id}:independent`, lower: undefined,
            stage: "interim", interim: "rule-paused" };
        const rule = { id: record.id, order: record.order, signedTurn: base.turn,
            effectiveTurn: base.turn - 1, status: "in-effect" };
        const staged = { ...base, pendingRules: [rule], judiciary: { ...base.judiciary, proceedings: [proceeding] } };
        const state = withRaisedCase(staged, { id: `case:review:${proceeding.id}`, kind: "court-response",
            title: "Further review", subject: { kind: "court-proceeding", id: proceeding.id },
            clock: { kind: "operational", dueAt: addDays(staged.calendar, 7) },
            defaultOutcome: { kind: "legal-default", outcomeId: "accept-lower-judgment" },
            urgency: "hard", responseRequirement: "president", allowedDispositions: ["act", "allow-default"] }, "world", undefined);
        const answer = answerLowerOrderReview(state, proceeding.id, "seek-with-stay");
        expect(answer.ok).toBe(true);
        if (!answer.ok)
            return;
        const forbidden = { ...state, judiciary: { ...state.judiciary,
                proceedings: [{ ...proceeding, lower: { ...proceeding.lower, ground: "forbidden" } }] } };
        const pressed = answerLowerOrderReview(forbidden, proceeding.id, "seek");
        const abandoned = answerLowerOrderReview(forbidden, proceeding.id, "accept");
        expect(pressed.ok && abandoned.ok).toBe(true);
        if (pressed.ok && abandoned.ok) {
            expect(apply(forbidden, pressed.packet).judiciary.solicitorGeneral?.standing).toBe(47);
            expect(apply(forbidden, abandoned.packet).judiciary.solicitorGeneral?.standing).toBe(52);
        }
        const awaiting = apply(state, answer.packet);
        expect(prospectiveOrderAuthority(awaiting, record.id)).toBe("suspended");
        expect(awaiting.judiciary.proceedings?.[0]?.stayApplication?.status).toBe("pending");
        expect(phase(awaiting)).toEqual([]);
        const outcomes = Array.from({ length: 100 }, (_, i) => {
            const candidate = { ...awaiting, seed: makeCampaignSeed(`stay-ruling-${i}`), turn: awaiting.turn + 1 };
            return phase(candidate).reduce(apply, candidate);
        });
        const granted = outcomes.find((outcome) => outcome.judiciary.proceedings?.[0]?.stayApplication?.status === "granted");
        const denied = outcomes.find((outcome) => outcome.judiciary.proceedings?.[0]?.stayApplication?.status === "denied");
        expect(granted).toBeDefined();
        expect(denied).toBeDefined();
        if (!granted || !denied)
            return;
        expect(granted.judiciary.solicitorGeneral?.standing).toBe(50);
        expect(denied.judiciary.solicitorGeneral?.standing).toBe(50);
        expect(prospectiveOrderAuthority(granted, record.id)).toBe("operative");
        expect(prospectiveOrderAuthority(denied, record.id)).toBe("suspended");
        const limited = { ...granted, judiciary: { ...granted.judiciary,
                proceedings: [...granted.judiciary.proceedings, other] } };
        expect(prospectiveOrderAuthority(limited, record.id)).toBe("suspended");
        const restored = { ...limited, judiciary: { ...limited.judiciary, proceedings: [granted.judiciary.proceedings[0]] } };
        expect(prospectiveOrderAuthority(restored, record.id)).toBe("operative");
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(granted))));
        expect(reloaded.judiciary.proceedings?.[0]?.stayApplication).toEqual(granted.judiciary.proceedings?.[0]?.stayApplication);
        expect(prospectiveOrderAuthority(reloaded, record.id)).toBe("operative");
        expect(granted.player.metrics.treasury).toBe(state.player.metrics.treasury);
        const awaitingPending = { ...awaiting, pendingRules: [{ ...rule, status: "stayed",
                    effectiveTurn: awaiting.turn + 10 }] };
        const pendingCandidate = { ...awaitingPending, seed: granted.seed, turn: awaitingPending.turn + 1 };
        const pendingGrant = phase(pendingCandidate).reduce(apply, pendingCandidate);
        expect(pendingGrant.judiciary.proceedings?.[0]?.stayApplication?.status).toBe("granted");
        expect(pendingGrant.pendingRules[0]?.status).toBe("pending");
        expect(prospectiveOrderAuthority(pendingGrant, record.id)).toBe("not-yet-effective");
        const independentlyLimited = { ...pendingGrant, turn: awaitingPending.turn + 11,
            judiciary: { ...pendingGrant.judiciary, proceedings: [...pendingGrant.judiciary.proceedings,
                    { ...other, interim: "rule-stayed" }] } };
        expect(rulemakingPhase(independentlyLimited)).toEqual([]);
    });
    it("dissolves its own preliminary agency relief after sustaining the operative rule", () => {
        const base = challenged("order-energy-leasing", 74);
        const record = base.orders[0];
        const rule = { id: record.id, order: record.order, signedTurn: base.turn,
            effectiveTurn: base.turn - 1, status: "in-effect" };
        const matter = { kind: "agency-procedure", title: "Agency procedure",
            parties: [{ name: "Plaintiff group", role: "plaintiff" }], injury: "Planning decision",
            jurisdiction: "Federal question", question: "Whether procedure complied", authority: "Agency statute",
            disputedFacts: "Notice record", reliefSought: "Set aside", affected: "Planning area" };
        const original = base.judiciary.proceedings[0];
        const lower = { ...base, pendingRules: [rule], judiciary: { ...base.judiciary,
                proceedings: [{ ...original, matter, stage: "lower-merits", nextTurn: base.turn,
                        interim: "rule-paused", partyRelief: { scope: "agency-rule", fraction: 1,
                            active: true, appliedOnce: true, outstanding: {} } }] } };
        const upheld = Array.from({ length: 100 }, (_, i) => {
            const state = { ...lower, seed: makeCampaignSeed(`agency-upheld-${i}`) };
            return phase(state).reduce(apply, state);
        }).find((state) => state.judiciary.proceedings?.[0]?.lower?.holding === "upheld");
        expect(upheld).toBeDefined();
        if (!upheld)
            return;
        expect(upheld.judiciary.proceedings?.[0]?.partyRelief?.active).toBe(false);
        expect(prospectiveOrderAuthority(upheld, record.id)).toBe("operative");
    });
    it("keeps an unstayed lower judgment during no quorum and restores authority after reversal", () => {
        const base = challenged("order-clean-energy", 73);
        const record = base.orders[0];
        const proceeding = { ...base.judiciary.proceedings[0], stage: "supreme-merits",
            nextTurn: base.turn, governmentReview: "seek",
            lower: { holding: "struck-down", ruledTurn: base.turn - 1,
                ground: "authorized", enforcement: "in-force" } };
        const rule = { id: record.id, order: record.order, signedTurn: base.turn,
            effectiveTurn: base.turn - 1, status: "in-effect" };
        const people = { ...base.people };
        const institutions = { ...base.institutions };
        JUDICIARY_SEAT_INSTITUTIONS.forEach((seat, index) => {
            const id = `PER-COURT-${index}`;
            people[id] = { base: { ...person, id }, alive: true };
            institutions[seat] = { ...institutions[seat], leader: id, vacancy: false };
        });
        const hearing = { ...base, people, institutions, pendingRules: [rule], judiciary: { ...base.judiciary,
                proceedings: [proceeding] } };
        const occupied = new Set(benchForVotes(hearing).slice(0, 5).map((seat) => seat.person));
        const noQuorum = { ...hearing, people: Object.fromEntries(Object.entries(hearing.people)
                .map(([id, person]) => [id, occupied.has(person.base.id) ? person : { ...person, alive: false }])) };
        const waiting = phase(noQuorum).reduce(apply, noQuorum);
        expect(waiting.judiciary.proceedings?.[0]?.stage).toBe("supreme-merits");
        expect(waiting.judiciary.cases).toHaveLength(0);
        expect(prospectiveOrderAuthority(waiting, record.id)).toBe("suspended");
        const june = { year: 2029, month: 6, day: 29 };
        const juneTurn = selectTurnOfDate(noQuorum, june) + 1;
        const nearDeadline = { ...noQuorum, turn: juneTurn, calendar: june,
            judiciary: { ...noQuorum.judiciary, proceedings: [{ ...proceeding, nextTurn: juneTurn,
                        calendar: { termYear: 2028, argumentTurn: juneTurn - 8, opinionTurn: juneTurn,
                            opinionTargetTurn: juneTurn, status: "argued" } }] } };
        const carried = phase(nearDeadline).reduce(apply, nearDeadline).judiciary.proceedings[0];
        expect(carried.calendar?.status).toBe("carried");
        expect(carried.calendar?.termYear).toBe(2029);
        expect(carried.nextTurn).toBe(carried.calendar?.argumentTurn);
        expect(carried.nextTurn).toBeGreaterThan(juneTurn + 4);
        const reversed = Array.from({ length: 100 }, (_, i) => {
            const state = { ...hearing, seed: makeCampaignSeed(`final-reversal-${i}`) };
            return phase(state).reduce(apply, state);
        }).find((state) => state.orders[0]?.review?.status === "upheld");
        expect(reversed).toBeDefined();
        if (!reversed)
            return;
        expect(reversed.judiciary.cases[0]?.votes.length).toBeGreaterThanOrEqual(6);
        expect(reversed.pendingRules[0]?.status).toBe("in-effect");
        expect(prospectiveOrderAuthority(reversed, record.id)).toBe("operative");
    });
    it("raises a real response at adverse lower merits and defaults once after its dated window", () => {
        const base = challenged("order-border-controls", 9);
        const record = base.orders[0];
        const original = base.judiciary.proceedings[0];
        const rule = { id: record.id, order: record.order, signedTurn: base.turn, effectiveTurn: base.turn + 3, status: "pending" };
        const lower = { ...base, pendingRules: [rule], judiciary: { ...base.judiciary,
                proceedings: [{ ...original, stage: "lower-merits", nextTurn: base.turn }] } };
        const produced = Array.from({ length: 40 }, (_, i) => {
            const state = { ...lower, seed: makeCampaignSeed(`lower-review-${i}`) };
            return { state, after: phase(state).reduce(apply, state) };
        }).find(({ after }) => after.cases?.[`case:review:${original.id}`] !== undefined);
        expect(produced).toBeDefined();
        if (!produced)
            return;
        expect(produced.after.pendingRules[0]?.status).toBe("stayed");
        expect(produced.after.judiciary.proceedings?.[0]?.lower?.holding).toBe("struck-down");
        expect(produced.after.cases?.[`case:review:${original.id}`]?.status).toBe("raised");
        expect(phase({ ...produced.after, turn: produced.after.turn + 1 })).toEqual([]);
        const due = withDueCaseDefaults({ ...produced.after, turn: produced.after.turn + 1,
            calendar: addDays(produced.after.calendar, 7) });
        expect(due.cases?.[`case:review:${original.id}`]?.status).toBe("defaulted");
        const clockRun = advanceUntilAttention(produced.after, { phases: defaultTurnPhases, horizonDays: 9 });
        expect(clockRun.elapsedDays).toBe(9);
        expect(clockRun.campaign.cases?.[`case:review:${original.id}`]?.status).toBe("defaulted");
        const final = phase(due).reduce(apply, due);
        expect(final.pendingRules[0]?.status).toBe("canceled");
        expect(final.judiciary.cases).toHaveLength(1);
        expect(final.judiciary.proceedings?.[0]?.governmentReview).toBe("defaulted");
        expect(phase({ ...final, turn: final.turn + 1 })).toEqual([]);
    });
    it("allows a court response to be deferred before its operational deadline without moving the default", () => {
        const base = challenged("order-border-controls", 91);
        const record = base.orders[0];
        const proceeding = base.judiciary.proceedings[0];
        const caseId = `case:review:${proceeding.id}`;
        const lower = { ...base, pendingRules: [{ id: record.id, order: record.order,
                    signedTurn: base.turn, effectiveTurn: base.turn + 3, status: "pending" }],
            judiciary: { ...base.judiciary, proceedings: [{ ...proceeding,
                        stage: "lower-merits", nextTurn: base.turn }] } };
        const raised = Array.from({ length: 40 }, (_, i) => {
            const state = { ...lower, seed: makeCampaignSeed(`defer-lower-review-${i}`) };
            return phase(state).reduce(apply, state);
        }).find((state) => state.cases?.[caseId] !== undefined);
        expect(raised).toBeDefined();
        if (!raised)
            return;
        const response = raised.cases[caseId];
        expect(response.clock.kind).toBe("operational");
        expect(response.allowedDispositions).toContain("defer");
        const until = addDays(raised.calendar, 3);
        const deferred = withCaseTransition(raised, caseId, { kind: "defer", until }, "The President will revisit the lower judgment in three days.", "player", undefined);
        expect(deferred.cases?.[caseId]?.status).toBe("deferred");
        expect(blockingCases(deferred, deferred.calendar)).toEqual([]);
        expect(blockingCases(deferred, until).map((item) => item.id)).toEqual([caseId]);
        const wake = advanceUntilAttention(deferred, { phases: defaultTurnPhases, horizonDays: 4,
            matterSources: [(state, date) => blockingCases(state, date).filter((item) => item.id === caseId)
                    .map((item) => ({ id: item.id, source: "court-ruling", urgency: "hard",
                    subject: proceeding.id, title: item.title, reason: "The lower judgment needs a response.",
                    date, ...(item.clock.kind === "none" ? {} : { dueDate: item.clock.dueAt }) }))] });
        expect(wake.stopReason).toBe("attention");
        expect(wake.elapsedDays).toBe(3);
        expect(wake.stop.presented.map((item) => item.id)).toEqual([caseId]);
        const beforeDeadline = withDueCaseDefaults(wake.campaign);
        expect(beforeDeadline.cases?.[caseId]?.status).toBe("deferred");
        expect(beforeDeadline.pendingRules[0]?.status).toBe("stayed");
        expect(beforeDeadline.judiciary.proceedings?.[0]?.lower?.enforcement).toBe("in-force");
        if (response.clock.kind === "none")
            return;
        const deadline = response.clock.dueAt;
        expect(() => withCaseTransition(raised, caseId, { kind: "defer", until: deadline }, "Too late.", "player", undefined)).toThrow(/deadline/);
        const due = withDueCaseDefaults({ ...beforeDeadline, calendar: deadline });
        expect(due.cases?.[caseId]?.status).toBe("defaulted");
        const hearing = { ...due, turn: due.turn + 1 };
        const final = phase(hearing).reduce(apply, hearing);
        expect(final.judiciary.proceedings?.[0]?.governmentReview).toBe("defaulted");
        expect(final.orders[0]?.review?.status).toBe("struck-down");
        expect(final.pendingRules[0]?.status).toBe("canceled");
    });
    it("holds an adverse judgment on an unimplemented rule for a dated accept-or-seek choice", () => {
        const base = challenged("order-border-controls", 10);
        const record = base.orders[0];
        const original = base.judiciary.proceedings[0];
        const proceeding = { ...original, stage: "appeal", nextTurn: base.turn,
            lower: { holding: "struck-down", ruledTurn: base.turn, ground: "forbidden",
                enforcement: "in-force" } };
        const pending = { id: record.id, order: record.order, signedTurn: base.turn, effectiveTurn: base.turn + 3, status: "stayed" };
        const staged = { ...base, pendingRules: [pending], judiciary: { ...base.judiciary, proceedings: [proceeding] } };
        const caseId = `case:review:${proceeding.id}`;
        const state = withRaisedCase(staged, { id: caseId, kind: "court-response", title: "Further review", subject: { kind: "court-proceeding", id: proceeding.id },
            clock: { kind: "operational", dueAt: addDays(staged.calendar, 7) }, defaultOutcome: { kind: "legal-default", outcomeId: "accept-lower-judgment" },
            urgency: "hard", responseRequirement: "president", allowedDispositions: ["act", "allow-default"] }, "world", undefined);
        expect(phase(state)).toEqual([]);
        const seek = answerLowerOrderReview(state, proceeding.id, "seek");
        expect(seek.ok).toBe(true);
        if (!seek.ok)
            return;
        const seeking = apply(state, seek.packet);
        expect(seeking.judiciary.proceedings?.[0]?.governmentReview).toBe("seek");
        expect(seeking.pendingRules[0]?.status).toBe("stayed");
        expect(seeking.cases?.[caseId]?.status).toBe("acted");
        const outcomes = Array.from({ length: 40 }, (_, i) => {
            const candidate = { ...seeking, seed: makeCampaignSeed(`review-decision-${i}`), turn: seeking.turn + 1 };
            return step(step(step(step(candidate))));
        });
        expect(outcomes.some((outcome) => outcome.judiciary.proceedings?.[0]?.stage === "supreme-merits")).toBe(true);
        expect(outcomes.some((outcome) => outcome.judiciary.proceedings?.[0]?.stage === "final" &&
            outcome.orders[0]?.review?.status === "struck-down")).toBe(true);
        const accept = answerLowerOrderReview(state, proceeding.id, "accept");
        expect(accept.ok).toBe(true);
        if (!accept.ok)
            return;
        const accepted = apply(state, accept.packet);
        expect(accepted.pendingRules[0]?.status).toBe("canceled");
        expect(accepted.orders[0]?.review?.status).toBe("struck-down");
        expect(accepted.judiciary.cases).toHaveLength(1);
        expect(answerLowerOrderReview(accepted, proceeding.id, "seek").ok).toBe(false);
    });
    it("records lower proceedings before a final opinion and leaves legacy pending history unbackdated", () => {
        const initial = challenged("order-border-controls", 0, true);
        const after = step(initial);
        const proceeding = after.judiciary.proceedings?.[0];
        expect(proceeding?.id).toBe(`case:${initial.orders[0].id}`);
        expect(proceeding?.history[0]?.turn).toBe(initial.turn);
        expect(after.orders[0]?.review?.status).toBe("pending");
        const finished = finish(after);
        const opinion = finished.judiciary.cases[0];
        expect(opinion.id).toBe(proceeding?.id);
        expect(opinion.procedure?.history.length).toBeGreaterThanOrEqual(2);
        expect(finished.orders[0]?.review?.status).toBe(opinion.holding);
        expect(finished.feed.some((entry) => /court/i.test(entry.headline))).toBe(true);
    });
    it("does not settle or charge the remedy twice on later ticks", () => {
        const final = finish(challenged("order-relief-program", 1));
        const cases = final.judiciary.cases;
        const ledger = final.ledger.length;
        const later = step(final);
        expect(later.judiciary.cases).toEqual(cases);
        expect(later.ledger.length).toBe(ledger);
    });
    it("keeps old completed opinions unchanged", () => {
        const final = finish(challenged("order-border-controls", 0));
        const old = { ...final.judiciary.cases[0], id: "old-direct-opinion", procedure: undefined };
        const withLegacy = { ...final, judiciary: { ...final.judiciary, cases: [...final.judiciary.cases, old] } };
        expect(step(withLegacy).judiciary.cases).toEqual(withLegacy.judiciary.cases);
    });
});
describe("what losing in court costs", () => {
    it("follows the act: a loud order lost costs more than a quiet one", () => {
        const loud = strikeDownCost(executiveOrder("order-emergency-construction"), true);
        const quiet = strikeDownCost(executiveOrder("order-regulatory-review"), true);
        expect(loud.standing).toBeLessThan(quiet.standing);
        expect(loud.stability).toBeLessThan(quiet.stability);
    });
    it("follows the remedy: cancelling a rule before it landed costs half of undoing one in effect", () => {
        const order = executiveOrder("order-border-controls");
        expect(strikeDownCost(order, false).standing).toBeCloseTo(strikeDownCost(order, true).standing / 2, 4);
    });
});
