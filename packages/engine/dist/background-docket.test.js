import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { selectDateOfTurn, selectTurnOfDate } from "./clock.js";
import { makeCampaignSeed } from "./rng.js";
import { executiveOrder, EXECUTIVE_ORDERS, projectOrder } from "./orders.js";
import { backgroundDocketEffects, docketTerm, doctrineShift, DOCTRINES, DOCTRINE_CAP, DOCTRINE_STEP } from "./background-docket.js";
import { dispositionTarget } from "./congress.js";
const FOUNDED = foundedForBalance("background-docket").campaign;
const founded = () => FOUNDED;
function atOpinionWeek(campaign, year) {
    const turn = selectTurnOfDate(campaign, { year, month: 6, day: 30 });
    return { ...campaign, turn, calendar: selectDateOfTurn(campaign, turn) };
}
function ruling(doctrine, holding, termYear) {
    return { id: `case:docket:${termYear}:${doctrine}`, subject: { kind: "background-docket", termYear, doctrine },
        question: "q", ground: "silent", filedTurn: 0, dueTurn: 0, ruledTurn: 0, holding, votes: [], opinion: { majority: "m" } };
}
describe("the background docket", () => {
    it("stays aggregate: thousands of filings, dozens argued, a handful of doctrine rulings", () => {
        const campaign = founded();
        const term = docketTerm(campaign, 2029);
        expect(term.filings).toBeGreaterThan(3000);
        expect(term.argued).toBeGreaterThan(50);
        expect(term.consequential.length).toBeLessThanOrEqual(DOCTRINES.length);
        expect(docketTerm(campaign, 2029)).toEqual(term);
    });
    it("selects about one consequential ruling a term across seeds, never every doctrine", () => {
        const counts = Array.from({ length: 60 }, (_, i) => docketTerm({ ...founded(), seed: makeCampaignSeed(`docket-rate-${i}`) }, 2029).consequential.length);
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        expect(mean).toBeGreaterThan(0.5);
        expect(mean).toBeLessThan(2);
    });
    it("covers every order a doctrine can reach exactly once", () => {
        const covered = DOCTRINES.flatMap((doctrine) => doctrine.orders);
        expect(new Set(covered).size).toBe(covered.length);
        expect(covered.every((id) => executiveOrder(id))).toBe(true);
        expect(EXECUTIVE_ORDERS.filter((order) => !covered.includes(order.id))).toEqual([]);
    });
    it("records rulings only in the late-June opinion week, once, with each seated justice's vote", () => {
        const base = founded();
        const year = base.calendar.year + 1;
        const found = Array.from({ length: 40 }, (_, i) => atOpinionWeek({ ...base, seed: makeCampaignSeed(`docket-june-${i}`) }, year))
            .find((state) => backgroundDocketEffects(state).length > 0);
        expect(found).toBeDefined();
        const ruled = backgroundDocketEffects(found).reduce((state, effect) => apply(state, { source: "simulate", actor: "world", turn: state.turn, narration: { summary: "ruling" }, effects: [effect] }), found);
        const cases = ruled.judiciary.cases.filter((entry) => entry.subject?.kind === "background-docket");
        expect(cases.length).toBeGreaterThan(0);
        expect(cases.every((entry) => entry.votes.length >= 6)).toBe(true);
        expect(backgroundDocketEffects(ruled)).toEqual([]);
        expect(backgroundDocketEffects({ ...found, turn: found.turn + 1 })).toEqual([]);
    });
    it("changes modeled law: a narrowing ruling raises later merits on its doctrine only, within a cap", () => {
        const campaign = founded();
        const narrowed = { ...campaign, judiciary: { ...campaign.judiciary, cases: [ruling("immigration-entry", "struck-down", 2029)] } };
        expect(doctrineShift(narrowed, "order-border-controls")).toBe(DOCTRINE_STEP);
        expect(doctrineShift(narrowed, "order-asset-seizure")).toBe(0);
        const border = executiveOrder("order-border-controls");
        expect(projectOrder(narrowed, CHARTER_PRESIDENTIAL_REPUBLIC, border).meritsChance)
            .toBeGreaterThan(projectOrder(campaign, CHARTER_PRESIDENTIAL_REPUBLIC, border).meritsChance);
        const stacked = { ...campaign, judiciary: { ...campaign.judiciary,
                cases: [2026, 2027, 2028, 2029].map((year) => ruling("immigration-entry", "struck-down", year)) } };
        expect(doctrineShift(stacked, "order-border-controls")).toBe(DOCTRINE_CAP);
        const upheld = { ...campaign, judiciary: { ...campaign.judiciary, cases: [ruling("immigration-entry", "upheld", 2029)] } };
        expect(doctrineShift(upheld, "order-entry-suspension")).toBe(-DOCTRINE_STEP);
    });
    it("never reads to the Hill as a ruling against this President", () => {
        const campaign = founded();
        const narrowed = { ...campaign, judiciary: { ...campaign.judiciary, cases: [ruling("immigration-entry", "struck-down", 2029)].map((entry) => ({ ...entry, ruledTurn: campaign.turn })) } };
        expect(dispositionTarget(narrowed)).toBe(dispositionTarget(campaign));
    });
});
