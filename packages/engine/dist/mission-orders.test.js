import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { EXECUTIVE_ORDERS, executiveOrder, orderAvailability, signOrder } from "./orders.js";
import { LOCALE_MISSION_ORDERS } from "./locale-mission-orders.js";
import { LOCALE_REFUSALS } from "./locale-missions.js";
import { orderRecordId } from "./order-subjects.js";
const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;
describe("the mission orders a locale act signs", () => {
    const { campaign: founded } = foundedForBalance("mission-orders");
    const MN = "MN";
    const WI = "WI";
    const unrest = (campaign) => ({ ...campaign, conditions: { ...campaign.conditions,
            "condition:unrest:USA:mn": { id: "condition:unrest:USA:mn", nation: campaign.founding.nation, kind: "unrest", scope: "nation", state: MN,
                severity: 0.6, startedTurn: campaign.turn, status: "active", beats: [] } } });
    const surge = (state) => ({ kind: "locale-mission", state, act: "property-surge" });
    const order = (id) => executiveOrder(id);
    it("resolves each by id and keeps all of them off the policy desk", () => {
        const desk = new Set(EXECUTIVE_ORDERS.map((entry) => entry.id));
        for (const mission of LOCALE_MISSION_ORDERS) {
            expect(executiveOrder(mission.id)).toBe(mission);
            expect(desk.has(mission.id), mission.id).toBe(false);
        }
    });
    it("refuses a signature with no mission subject, or a subject for another order's act", () => {
        expect(orderAvailability(unrest(founded), order("order-property-surge")).ok).toBe(false);
        const wrongAct = { kind: "locale-mission", state: MN, act: "task-force" };
        const refused = orderAvailability(unrest(founded), order("order-property-surge"), wrongAct);
        expect(refused.ok).toBe(false);
    });
    it("holds the act's predicate itself, so a direct signature cannot skip it", () => {
        const refused = orderAvailability(founded, order("order-property-surge"), surge(MN));
        expect(refused.ok ? "" : refused.missing).toBe(LOCALE_REFUSALS.disorder);
        expect(orderAvailability(unrest(founded), order("order-property-surge"), surge(MN)).ok).toBe(true);
        const guard = { kind: "locale-mission", state: MN, act: "federalize" };
        const noGround = signOrder(unrest(founded), CHARTER, "order-guard-federalization", createRngStreams(founded.seed), guard);
        expect(noGround.ok).toBe(false);
        if (!noGround.ok)
            expect(noGround.missing).toBe(LOCALE_REFUSALS.federalize);
    });
    it("records one order per state and week, so two states ordered together do not collide", () => {
        expect(orderRecordId("order-property-surge", 5, surge(MN))).not.toBe(orderRecordId("order-property-surge", 5, surge(WI)));
        const campaign = unrest(founded);
        const signed = signOrder(campaign, CHARTER, "order-property-surge", createRngStreams(campaign.seed), surge(MN));
        if (!signed.ok)
            throw new Error(signed.reason);
        const after = apply(campaign, signed.packet);
        const again = orderAvailability(after, order("order-property-surge"), surge(MN));
        expect(again.ok).toBe(false);
    });
});
