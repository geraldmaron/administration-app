import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { addDays, campaignDay } from "./clock.js";
import { openingMunitions } from "./munitions.js";
import { createRngStreams } from "./rng.js";
import { signOrder } from "./orders.js";
import { regulatoryReviewOrderSubjects } from "./order-subjects.js";
import { orderExpiryPhase, rescindOrder } from "./order-lifecycle.js";
import { advanceOneDay } from "./day-step.js";
import { advanceTurn, noopPhase } from "./turn-loop.js";
import { rulemakingPhase } from "./rulemaking.js";
import { legislationPhase, overrideWouldCarry, signBill, vetoBill } from "./legislation.js";
import { legislativeAct } from "./legislative-acts.js";
import { createSave, loadSave } from "./save.js";
const { campaign: FOUNDED } = foundedForBalance("order-lifecycle");
const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;
function signed(campaign, orderId, subject) {
    const result = signOrder(campaign, CHARTER, orderId, createRngStreams(campaign.seed), subject);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(campaign, result.packet);
}
function reviewableRule() {
    const directed = signed(FOUNDED, "order-border-controls");
    const due = { ...directed, turn: directed.pendingRules.at(-1).effectiveTurn };
    return rulemakingPhase(due).reduce(apply, due);
}
describe("prospective order withdrawal", () => {
    it("ends priority without erasing its contracted backlog or court record", () => {
        const stock = openingMunitions();
        const funded = { ...FOUNDED, player: { ...FOUNDED.player,
                budget: { ...FOUNDED.player.budget, military: 0.01 } }, munitions: { ...stock,
                us: { ...stock.us, "precision-fires": { ...stock.us["precision-fires"],
                        onOrder: [{ arrives: addDays(FOUNDED.calendar, 156 * 7), count: 0.05 }] } } } };
        const issued = signed(funded, "order-defense-production");
        const record = issued.orders.at(-1);
        const priorDebt = issued.nations[issued.founding.nation].stats.economy.debt;
        const priorProceedings = issued.judiciary.proceedings;
        const result = rescindOrder(issued, record.id);
        if (!result.ok)
            throw new Error(result.reason);
        const ended = apply(issued, result.packet);
        expect(ended.orders.at(-1)).toMatchObject({ id: record.id, rescindedTurn: issued.turn, endReason: "rescinded" });
        expect(ended.nations[ended.founding.nation].stats.economy.debt).toBe(priorDebt);
        expect(ended.munitions?.us["precision-fires"]?.onOrder).toEqual(issued.munitions?.us["precision-fires"]?.onOrder);
        expect(ended.judiciary.proceedings).toBe(priorProceedings);
        expect(rescindOrder(ended, record.id).ok).toBe(false);
    });
    it("cancels an unfinished rule before it can land", () => {
        const ready = reviewableRule();
        const issued = signed(ready, "order-regulatory-review", regulatoryReviewOrderSubjects(ready)[0]);
        const record = issued.orders.at(-1);
        const result = rescindOrder(issued, record.id);
        if (!result.ok)
            throw new Error(result.reason);
        const ended = apply(issued, result.packet);
        expect(ended.pendingRules.find((rule) => rule.id === record.id)?.status).toBe("canceled");
        const due = { ...ended, turn: ended.pendingRules.find((rule) => rule.id === record.id).effectiveTurn };
        expect(rulemakingPhase(due)).toHaveLength(0);
    });
    it("withdraws a final rule's prospective effect while preserving its proceeding", () => {
        const ready = reviewableRule();
        const issued = signed(ready, "order-regulatory-review", regulatoryReviewOrderSubjects(ready)[0]);
        const record = issued.orders.at(-1);
        const due = { ...issued, turn: issued.pendingRules.find((rule) => rule.id === record.id).effectiveTurn };
        const effective = rulemakingPhase(due).reduce(apply, due);
        expect(effective.pendingRules.find((rule) => rule.id === record.id)?.status).toBe("in-effect");
        const proceedings = effective.judiciary.proceedings;
        const result = rescindOrder(effective, record.id);
        if (!result.ok)
            throw new Error(result.reason);
        const ended = apply(effective, result.packet);
        expect(ended.pendingRules.find((rule) => rule.id === record.id)?.status).toBe("rescinded");
        expect(ended.judiciary.proceedings).toEqual(proceedings);
    });
    it("expires the enacted ninety-day freeze on its recorded day", () => {
        const bill = { id: "bill:stabilization", act: "act-economic-stabilization", title: "Stabilization",
            sponsor: "administration", introducedTurn: FOUNDED.turn, status: "law", passage: [] };
        const authorized = { ...FOUNDED, bills: { ...FOUNDED.bills, [bill.id]: bill } };
        const issued = signed(authorized, "order-price-controls");
        const record = issued.orders.at(-1);
        expect(record.sunsetDay).toBe(campaignDay(issued) + 90);
        expect(orderExpiryPhase({ ...issued, calendar: addDays(issued.calendar, 89) })).toHaveLength(0);
        const due = { ...issued, calendar: addDays(issued.calendar, 90), turn: issued.turn + 13 };
        const packets = orderExpiryPhase(due);
        expect(packets).toHaveLength(1);
        const ended = packets.reduce(apply, due);
        expect(ended.orders.at(-1)).toMatchObject({ endReason: "sunset", rescindedTurn: due.turn });
        expect(orderExpiryPhase(ended)).toHaveLength(0);
        const phases = { simulate: noopPhase, select: noopPhase };
        const dayBefore = { ...issued, turn: issued.turn + 12, calendar: addDays(issued.calendar, 89) };
        const dayNinety = advanceOneDay(dayBefore, phases);
        expect(dayNinety.orders.at(-1)).toMatchObject({ endReason: "sunset", rescindedTurn: dayBefore.turn });
        expect(dayNinety.orders.at(-1)?.remedyApplied).toBe(true);
        const nextDay = advanceOneDay(dayNinety, phases);
        expect(nextDay.orders.at(-1)?.rescindedTurn).toBe(dayBefore.turn);
        expect(orderExpiryPhase(nextDay)).toHaveLength(0);
        const weekBefore = { ...issued, turn: issued.turn + 12, calendar: addDays(issued.calendar, 84) };
        const nextWeek = advanceTurn(weekBefore, phases);
        expect(campaignDay(nextWeek)).toBe(campaignDay(issued) + 91);
        expect(nextWeek.orders.at(-1)).toMatchObject({ endReason: "sunset", rescindedTurn: nextWeek.turn });
    });
});
describe("rule disapproval after implementation", () => {
    it.each(["signed", "veto-overridden"])("reverses a final rule once when the resolution is %s", (route) => {
        const source = route === "signed" ? FOUNDED : foundedForBalance("cra-independent-2", "independent").campaign;
        const issued = signed(source, "order-border-controls");
        const rule = issued.pendingRules.at(-1);
        expect(signOrder(issued, CHARTER, "order-border-controls", createRngStreams(issued.seed)).ok).toBe(false);
        const due = { ...issued, turn: rule.effectiveTurn };
        const landed = rulemakingPhase(due).reduce(apply, due);
        const borderBefore = issued.nations[issued.founding.nation].stats.security.borderControl;
        const borderLanded = landed.nations[landed.founding.nation].stats.security.borderControl;
        expect(borderLanded).toBeGreaterThan(borderBefore);
        expect(rulemakingPhase(landed)).toEqual([]);
        const act = legislativeAct("act-rule-disapproval");
        const bill = { id: `bill:disapprove:${route}`, act: act.id, title: act.title,
            sponsor: act.sponsor, introducedTurn: landed.turn, status: "on-the-desk", passage: [], target: rule.order };
        const desk = { ...landed, congress: { ...landed.congress, disposition: route === "signed" ? 0.6 : 0 },
            bills: { ...landed.bills, [bill.id]: bill } };
        if (route === "veto-overridden")
            expect(overrideWouldCarry(desk, bill)).toBe(true);
        const response = route === "signed" ? signBill(desk, bill.id) : vetoBill(desk, bill.id, "The rule should stand.");
        if (!response.ok)
            throw new Error(response.reason);
        const first = apply(desk, response.packet);
        expect(first.bills[bill.id].status).toBe(route === "signed" ? "law" : "vetoed");
        expect(first.nations[first.founding.nation].stats.security.borderControl).toBe(borderLanded);
        if (route === "veto-overridden")
            expect(rulemakingPhase(first)).toEqual([]);
        const law = route === "signed" ? first : legislationPhase({ ...first, turn: first.turn + 3 }).reduce(apply, { ...first, turn: first.turn + 3 });
        expect(law.bills[bill.id].status).toBe("law");
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(law))));
        const undone = rulemakingPhase(reloaded).reduce(apply, reloaded);
        expect(undone.pendingRules.find((entry) => entry.id === rule.id)?.status).toBe("disapproved");
        expect(undone.nations[undone.founding.nation].stats.security.borderControl).toBeCloseTo(borderBefore);
        expect(rulemakingPhase(undone)).toEqual([]);
        const again = loadSave(JSON.parse(JSON.stringify(createSave(undone))));
        expect(rulemakingPhase(again)).toEqual([]);
        expect(again.nations[again.founding.nation].stats.security.borderControl).toBeCloseTo(borderBefore);
        expect(signBill(again, bill.id).ok).toBe(false);
        expect(signOrder(again, CHARTER, rule.order, createRngStreams(again.seed)).ok).toBe(false);
    });
});
