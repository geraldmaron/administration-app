import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { executiveOrder, signOrder } from "./orders.js";
import { specializedGround, specializedMatter, specializedMeritsChance, specializedThreshold } from "./specialized-court-matters.js";
import { rulemakingPhase } from "./rulemaking.js";
import { energyLeasingOrderSubjects } from "./order-authority-subjects.js";
import { makeCampaignSeed } from "./rng.js";
import { legislativeAct } from "./legislative-acts.js";
const forced = { stream: () => ({ key: "court-family-test", next: () => 0,
        nextInt: (min) => min, pick: (items) => items[0] }) };
const phase = judicialReviewPhase(CHARTER_PRESIDENTIAL_REPUBLIC);
function signed(orderId, seedSuffix = "") {
    const opening = foundedForBalance(`court-${orderId}${seedSuffix}`).campaign;
    const act = legislativeAct("act-police-accountability");
    const bill = { id: "bill:policing-grants", act: act.id, title: act.title,
        sponsor: act.sponsor, introducedTurn: opening.turn, resolvedTurn: opening.turn,
        status: "law", passage: [] };
    const state = orderId === "order-grant-conditions" ? { ...opening,
        bills: { ...opening.bills, [bill.id]: bill } } : opening;
    const result = signOrder(state, CHARTER_PRESIDENTIAL_REPUBLIC, orderId, forced, orderId === "order-grant-conditions" ? { kind: "grant", billId: bill.id }
        : orderId === "order-energy-leasing" ? energyLeasingOrderSubjects(state)[0] : undefined);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(state, result.packet);
}
function atInterim(state) {
    for (let week = 0; week < 4; week += 1) {
        state = phase(state).reduce(apply, state);
        if (state.judiciary.proceedings?.some((entry) => entry.stage === "interim"))
            return state;
        state = { ...state, turn: state.turn + 1 };
    }
    throw new Error("specialized matter did not reach interim review");
}
function agencyAfterFinalRule(state) {
    const rule = state.pendingRules.find((entry) => entry.order === "order-energy-leasing");
    expect(state.judiciary.proceedings?.some((entry) => entry.matter?.kind === "agency-procedure") ?? false).toBe(false);
    const due = { ...state, turn: rule.effectiveTurn };
    return rulemakingPhase(due).reduce(apply, due);
}
/** The next week, or the dated turn an open stage is waiting for. */
function nextCourtTurn(state) {
    const waits = (state.judiciary.proceedings ?? []).filter((entry) => entry.stage !== "final").map((entry) => entry.nextTurn);
    return Math.max(state.turn + 1, waits.length ? Math.min(...waits) : 0);
}
function resolved(state) {
    for (let week = 0; week < 12; week += 1) {
        state = phase(state).reduce(apply, state);
        if (state.judiciary.cases.some((entry) => entry.matter?.kind === "agency-procedure"))
            return state;
        state = { ...state, turn: nextCourtTurn(state) };
    }
    return undefined;
}
describe("agency and state-initiated judicial matters", () => {
    it("weighs each missing agency step on the merits even when the legal ground label is the same", () => {
        const state = signed("order-energy-leasing");
        const record = state.orders.at(-1);
        const rule = state.pendingRules.at(-1);
        const order = executiveOrder(record.order);
        const variants = [
            { noticeWeeks: 6, commentsAnswered: true, siteReviewPreserved: true },
            { noticeWeeks: 6, commentsAnswered: false, siteReviewPreserved: true },
            { noticeWeeks: 2, commentsAnswered: false, siteReviewPreserved: false },
        ];
        const chances = variants.map((process) => {
            const adjusted = { ...rule, process };
            const matter = specializedMatter(state, record, adjusted);
            return { ground: specializedGround(matter, adjusted, "silent"),
                chance: specializedMeritsChance(CHARTER_PRESIDENTIAL_REPUBLIC, order, matter, adjusted) };
        });
        expect(chances.map((entry) => entry.ground)).toEqual(["authorized", "forbidden", "forbidden"]);
        expect(chances[0].chance).toBeLessThan(chances[1].chance);
        expect(chances[1].chance).toBeLessThan(chances[2].chance);
    });
    it("files a named planning-area case and preserves the environmental process without conferring production", () => {
        const issued = signed("order-energy-leasing", "-planning-standing");
        const filed = agencyAfterFinalRule(issued);
        expect(filed.nations[filed.founding.nation].stats.energy.importDependence)
            .toBe(issued.nations[issued.founding.nation].stats.energy.importDependence);
        const rule = filed.pendingRules.find((entry) => entry.order === "order-energy-leasing");
        const interim = atInterim({ ...filed, turn: filed.turn + 1 });
        const proceeding = interim.judiciary.proceedings?.find((entry) => entry.subject.kind === "executive-order"
            && entry.subject.recordId === rule.id);
        expect(proceeding).toBeDefined();
        expect(proceeding?.matter?.kind).toBe("agency-procedure");
        expect(proceeding?.matter?.parties[0]?.name).toMatch(/Coastal communities/);
        expect(proceeding?.matter?.evidence).toContain("Planning area: ocs-gulf-program-2029; proposed sale 264.");
        expect(proceeding?.matter?.injury).toContain("No lease or drilling right is granted");
        expect(specializedThreshold(proceeding?.matter, rule)).toBeUndefined();
        expect(proceeding?.matter?.evidence).toContain(`Notice period: ${rule.process?.noticeWeeks} weeks.`);
        const complete = { ...filed, pendingRules: filed.pendingRules.map((entry) => entry.id === rule.id
                ? { ...entry, process: { noticeWeeks: 6, commentsAnswered: true, siteReviewPreserved: true } } : entry) };
        const deficient = { ...filed, pendingRules: filed.pendingRules.map((entry) => entry.id === rule.id
                ? { ...entry, process: { noticeWeeks: 6, commentsAnswered: false, siteReviewPreserved: true } } : entry) };
        const review = (state) => { const at = atInterim({ ...state, turn: state.turn + 1 }); const next = { ...at, turn: nextCourtTurn(at) }; return phase(next).reduce(apply, next); };
        expect(review(complete).judiciary.proceedings?.[0]?.interim).toBe("denied");
        const stayed = review(deficient);
        expect(stayed.judiciary.proceedings?.[0]?.interim).toBe("rule-paused");
        const before = deficient.nations[deficient.founding.nation].stats.energy.importDependence;
        const after = stayed.nations[stayed.founding.nation].stats.energy.importDependence;
        expect(after).toBe(before);
        expect(filed.pendingRules.find((entry) => entry.id === rule.id)?.nationContribution?.["energy.importDependence"]).toBeUndefined();
    });
    it("can dismiss a planning-only challenge at the contested injury threshold", () => {
        let state = agencyAfterFinalRule(signed("order-energy-leasing"));
        for (let week = 0; week < 4 && !state.judiciary.cases.some((entry) => entry.matter?.kind === "agency-procedure"); week += 1) {
            state = phase(state).reduce(apply, state);
            state = { ...state, turn: state.turn + 1 };
        }
        const courtCase = state.judiciary.cases.find((entry) => entry.matter?.kind === "agency-procedure");
        expect(courtCase?.procedure?.dismissedAtThreshold).toBe(true);
        expect(courtCase?.opinion.majority).toContain("dismissed");
    });
    it("names an affected state as plaintiff and limits review to a scheduled grant condition", () => {
        const filed = signed("order-grant-conditions");
        const record = filed.orders.find((entry) => entry.order === "order-grant-conditions");
        const proceeding = filed.judiciary.proceedings?.find((entry) => entry.matter?.kind === "federal-state");
        expect(record.subject).toEqual({ kind: "grant", billId: "bill:policing-grants" });
        expect(proceeding?.matter?.state).toBeTruthy();
        expect(proceeding?.matter?.parties[0]?.name).toMatch(/^State of /);
        expect(proceeding?.matter?.injury).toMatch(/grant/);
        expect(proceeding?.matter?.authority).toContain("bill:policing-grants");
        expect(proceeding?.matter?.evidence).toContain("Bill status and subject match: current policing-grant law.");
        expect(specializedGround(proceeding?.matter, filed.pendingRules.find((entry) => entry.id === record.id), "forbidden", record, filed)).toBe("authorized");
        expect(proceeding?.matter?.reliefSought).toMatch(/leave the statute/);
    });
    it("can vacate only the defective rule while preserving the underlying leasing authority", () => {
        const filed = agencyAfterFinalRule(signed("order-energy-leasing"));
        const rule = filed.pendingRules.find((entry) => entry.order === "order-energy-leasing");
        const defective = { ...filed, pendingRules: filed.pendingRules.map((entry) => entry.id === rule.id
                ? { ...entry, process: { noticeWeeks: 6, commentsAnswered: false, siteReviewPreserved: false } } : entry) };
        let vacated;
        for (let n = 0; n < 120 && !vacated; n += 1) {
            const final = resolved({ ...defective, turn: defective.turn + 1, seed: makeCampaignSeed(`agency-vacatur-${n}`) });
            if (final?.judiciary.cases.some((entry) => entry.matter?.kind === "agency-procedure" && entry.holding === "struck-down"))
                vacated = final;
        }
        expect(vacated).toBeDefined();
        expect(vacated.pendingRules.find((entry) => entry.id === rule.id)?.status).toBe("struck-down");
        expect(vacated.orders.find((entry) => entry.id === rule.id)?.review?.status).toBe("struck-down");
        expect(vacated.judiciary.cases.find((entry) => entry.matter?.kind === "agency-procedure")?.opinion.majority).toMatch(/underlying law/);
    });
});
