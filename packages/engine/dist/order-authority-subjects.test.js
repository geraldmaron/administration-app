import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { addDays } from "./clock.js";
import { energyLeasingOrderSubjects, leasePlanningArea, regulatoryReviewOrderSubjects } from "./order-authority-subjects.js";
import { rulemakingPhase } from "./rulemaking.js";
import { apply } from "./effects.js";
import { createSave, loadSave } from "./save.js";
const record = (id, order, subject) => ({
    id, order, ...(subject ? { subject } : {}), turn: 0, contested: false, challengeChance: 0,
});
const rule = (id, order, status) => ({
    id, order, signedTurn: 0, effectiveTurn: 6, status,
});
describe("identified executive authority subjects", () => {
    it("offers only operative named agency rules and does not duplicate a live review", () => {
        const base = buildCampaign();
        const target = record("grant-rule:0", "order-grant-conditions", { kind: "grant", billId: "bill:grant" });
        const campaign = { ...base, orders: [target], pendingRules: [rule(target.id, target.order, "in-effect")] };
        expect(regulatoryReviewOrderSubjects(campaign)).toEqual([{ kind: "rule-review", ruleId: target.id }]);
        expect(regulatoryReviewOrderSubjects({ ...campaign, pendingRules: [rule(target.id, target.order, "pending")] })).toEqual([]);
        expect(regulatoryReviewOrderSubjects({ ...campaign, orders: [{ ...target, rescindedTurn: 1 }] })).toEqual([]);
        const review = record("review:0", "order-regulatory-review", { kind: "rule-review", ruleId: target.id });
        expect(regulatoryReviewOrderSubjects({ ...campaign, orders: [target, review] })).toEqual([]);
    });
    it("limits Gulf planning to the approved program window and one operative signature", () => {
        const base = buildCampaign();
        const subject = energyLeasingOrderSubjects(base)[0];
        expect(subject).toEqual({ kind: "lease-planning", areaId: "ocs-gulf-program-2029" });
        const area = leasePlanningArea(subject.areaId);
        expect(area.scheduledSale).toBe("264");
        expect(energyLeasingOrderSubjects({ ...base, calendar: addDays(area.programThrough, 1) })).toEqual([]);
        const signed = record("lease:0", "order-energy-leasing", subject);
        expect(energyLeasingOrderSubjects({ ...base, orders: [signed] })).toEqual([]);
        expect(energyLeasingOrderSubjects({ ...base, orders: [{ ...signed, review: { dueTurn: 1, status: "struck-down" } }] })).toEqual([subject]);
    });
    it("cancels an unfinished Gulf planning rule once its program expires", () => {
        const base = buildCampaign();
        const subject = energyLeasingOrderSubjects(base)[0];
        const signed = record("lease:0", "order-energy-leasing", subject);
        const area = leasePlanningArea(subject.areaId);
        const due = { ...base, turn: 23, orders: [signed],
            pendingRules: [{ ...rule(signed.id, signed.order, "pending"), effectiveTurn: 30 }],
            calendar: addDays(area.programThrough, 1) };
        const ended = rulemakingPhase(due).reduce(apply, due);
        expect(ended.pendingRules[0]).toMatchObject({ status: "canceled", resolvedTurn: due.turn });
        expect(ended.nations[ended.founding.nation].stats.energy.importDependence)
            .toBe(due.nations[due.founding.nation].stats.energy.importDependence);
    });
});
describe("agency review finding", () => {
    it.each([
        { targetStatus: "in-effect", defect: false, expected: "retain" },
        { targetStatus: "in-effect", defect: true, expected: "recommend-revision" },
        { targetStatus: "rescinded", defect: false, expected: "closed-without-action" },
    ])("records $expected without changing the target rule", ({ targetStatus, defect, expected }) => {
        const base = buildCampaign();
        const target = record("grant-rule:0", "order-grant-conditions", { kind: "grant", billId: "bill:grant" });
        const review = record("review:0", "order-regulatory-review", { kind: "rule-review", ruleId: target.id });
        const targetRule = { ...rule(target.id, target.order, targetStatus),
            ...(defect ? { process: { noticeWeeks: 6, commentsAnswered: false, siteReviewPreserved: true } } : {}) };
        const due = { ...base, turn: 6, orders: [target, review], pendingRules: [targetRule, rule(review.id, review.order, "pending")] };
        const completed = rulemakingPhase(due).reduce(apply, due);
        expect(completed.pendingRules[0]).toEqual(targetRule);
        expect(completed.pendingRules[1]).toMatchObject({ status: "in-effect", resolvedTurn: 6,
            reviewFinding: { targetRuleId: target.id, disposition: expected } });
        expect(loadSave(createSave(completed)).pendingRules[1]?.reviewFinding?.disposition).toBe(expected);
    });
});
