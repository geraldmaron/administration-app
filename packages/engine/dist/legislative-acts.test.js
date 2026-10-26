import { describe, expect, it } from "vitest";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { addDays } from "./clock.js";
import { endEmergency, declareEmergency, authorityDeadline, emergencyAuthorityClock, underDeclaredEmergency } from "./emergency.js";
import { legislativeAct } from "./legislative-acts.js";
import { billsOnTheAgenda, legislationPhase, signBill, transmit, vetoBill } from "./legislation.js";
import { createSave, loadSave } from "./save.js";
import { projectPassage, restrainsThePresident } from "./bill-stages.js";
const TERMINATE = "act-emergency-termination";
const RENEW = "act-emergency-renewal";
const LIMIT = "act-emergency-powers-limitation";
function packet(result) {
    if (!result.ok || !result.packet)
        throw new Error(result.reason ?? "No packet");
    return result.packet;
}
function emergency() {
    const base = buildCampaign();
    const condition = { id: "condition:unrest", nation: base.founding.nation, kind: "unrest", scope: "nation",
        severity: 0.7, startedTurn: base.turn, status: "active", beats: [] };
    const live = { ...base, conditions: { ...base.conditions, [condition.id]: condition } };
    return apply(live, packet(declareEmergency(live, { kind: "nation" }, "unrest")));
}
function desk(campaign, actId, target) {
    const act = legislativeAct(actId);
    const bill = { id: `bill:${actId}:${campaign.turn}`, act: act.id, title: act.title, sponsor: act.sponsor,
        introducedTurn: campaign.turn, status: "on-the-desk", presentedOn: campaign.calendar, passage: [],
        ...(target ? { target } : {}) };
    return { campaign: { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } }, bill };
}
function signed(campaign, actId, target) {
    const ready = desk(campaign, actId, target);
    return apply(ready.campaign, packet(signBill(ready.campaign, ready.bill.id)));
}
describe("Congress and national emergency authority", () => {
    it("counts a termination resolution on party lines: the opposition for it, the President's caucus against it", () => {
        const active = emergency();
        const act = legislativeAct(TERMINATE);
        expect(restrainsThePresident(act)).toBe(true);
        for (const vote of projectPassage(active, act)) {
            const own = vote.byCaucus.administration;
            const other = vote.byCaucus.opposition;
            expect(own.yeas / own.seats, `${vote.chamber}: the President's caucus votes to end his emergency`).toBeLessThan(0.25);
            expect(other.yeas / other.seats, `${vote.chamber}: the opposition backs its own resolution`).toBeGreaterThan(own.yeas / own.seats);
        }
    });
    it("offers a privileged termination resolution only for a live national emergency", () => {
        const base = buildCampaign();
        expect(billsOnTheAgenda(base).some((act) => act.id === TERMINATE)).toBe(false);
        const active = emergency();
        const act = billsOnTheAgenda(active).find((entry) => entry.id === TERMINATE);
        expect(act.track).toBe("privileged");
        expect(act.targetsEmergency?.(active)).toBe(Object.keys(active.emergencies)[0]);
        const target = Object.values(active.emergencies)[0];
        const local = { ...active, emergencies: { [target.id]: { ...target, scope: { kind: "state", state: "MI" } } } };
        expect(billsOnTheAgenda(local).some((entry) => entry.id === TERMINATE)).toBe(false);
    });
    it("a signature ends the pinned declaration and prevents reissue over the same predicate", () => {
        const active = emergency();
        const target = Object.keys(active.emergencies)[0];
        const ready = desk(active, TERMINATE, target);
        expect(underDeclaredEmergency(ready.campaign)).toBe(true);
        const law = apply(ready.campaign, packet(signBill(ready.campaign, ready.bill.id)));
        expect(law.bills[ready.bill.id]?.enactedBy).toBe("signed");
        expect(law.emergencies[target]?.endedTurn).toBe(law.turn);
        expect(underDeclaredEmergency(law)).toBe(false);
        expect(declareEmergency(law, { kind: "nation" }, "unrest").ok).toBe(false);
    });
    it.each([[0.05, "law"], [0.95, "dead"]])("a veto leaves authority alive until the override at disposition %s (%s)", (disposition, status) => {
        const active = emergency();
        const ready = desk({ ...active, congress: { ...active.congress, disposition } }, TERMINATE, Object.keys(active.emergencies)[0]);
        const vetoed = apply(ready.campaign, packet(vetoBill(ready.campaign, ready.bill.id, "The emergency remains necessary.")));
        expect(underDeclaredEmergency(vetoed)).toBe(true);
        const later = withWeeksElapsed(vetoed, 3);
        const resolved = legislationPhase(later).reduce(apply, later);
        expect(resolved.bills[ready.bill.id]?.status).toBe(status);
        expect(resolved.bills[ready.bill.id]?.override).toHaveLength(2);
        expect(underDeclaredEmergency(resolved)).toBe(status !== "law");
        if (status === "law")
            expect(resolved.bills[ready.bill.id]?.enactedBy).toBe("veto-overridden");
    });
    it("an unsigned resolution takes effect through the existing presentment default", () => {
        const active = emergency();
        const ready = desk(active, TERMINATE, Object.keys(active.emergencies)[0]);
        const later = { ...ready.campaign, calendar: addDays(active.calendar, 15) };
        const law = legislationPhase(later).reduce(apply, later);
        expect(law.bills[ready.bill.id]?.enactedBy).toBe("unsigned");
        expect(underDeclaredEmergency(law)).toBe(false);
    });
    it("a missing or stale target cannot end a later unrelated declaration", () => {
        const active = emergency();
        expect(underDeclaredEmergency(signed(active, TERMINATE, "missing-emergency"))).toBe(true);
        expect(underDeclaredEmergency(signed(active, TERMINATE))).toBe(true);
    });
    it("ending and reissuing the same episode does not escape a pending termination resolution", () => {
        const active = emergency();
        const id = Object.keys(active.emergencies)[0];
        const ready = desk(active, TERMINATE, id);
        const ended = apply(ready.campaign, packet(endEmergency(ready.campaign, id)));
        const again = apply(ended, packet(declareEmergency(ended, { kind: "nation" }, "unrest")));
        expect(underDeclaredEmergency(again)).toBe(true);
        const law = apply(again, packet(signBill(again, ready.bill.id)));
        expect(underDeclaredEmergency(law)).toBe(false);
        expect(Object.values(law.authorityClocks ?? {})).toHaveLength(1);
    });
    it("a resolution keeps its original target when another declaration opens in the same week", () => {
        const active = emergency();
        const id = Object.keys(active.emergencies)[0];
        const ready = desk(active, TERMINATE, id);
        const ended = apply(ready.campaign, packet(endEmergency(ready.campaign, id)));
        const prior = Object.values(ended.conditions)[0];
        const different = { ...ended, conditions: { later: { ...prior, id: "condition:later" } } };
        const again = apply(different, packet(declareEmergency(different, { kind: "nation" }, "unrest")));
        expect(Object.keys(again.emergencies)).toHaveLength(2);
        const law = apply(again, packet(signBill(again, ready.bill.id)));
        expect(underDeclaredEmergency(law)).toBe(true);
        expect(Object.values(law.authorityClocks ?? {})).toHaveLength(2);
    });
    it("transmission pins the renewal target; only enactment extends the ninety-day ceiling", () => {
        const active = signed(emergency(), LIMIT);
        const near = { ...active, calendar: addDays(active.calendar, 70), turn: active.turn + 10 };
        const id = Object.keys(active.emergencies)[0];
        const sent = apply(near, packet(transmit(near, RENEW)));
        const introduced = Object.values(sent.bills).find((bill) => bill.act === RENEW);
        expect(introduced.target).toBe(id);
        expect(introduced.stage).toBe("referral");
        expect(authorityDeadline(sent, emergencyAuthorityClock(sent, sent.emergencies[id]))).toEqual(addDays(active.calendar, 90));
        const enrolled = { ...sent, bills: { ...sent.bills, [introduced.id]: { ...introduced, status: "on-the-desk", presentedOn: sent.calendar } } };
        const law = apply(enrolled, packet(signBill(enrolled, introduced.id)));
        expect(authorityDeadline(law, emergencyAuthorityClock(law, law.emergencies[id]))).toEqual(addDays(active.calendar, 180));
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(law))));
        expect(underDeclaredEmergency({ ...restored, calendar: addDays(active.calendar, 179) })).toBe(true);
        expect(underDeclaredEmergency({ ...restored, calendar: addDays(active.calendar, 180) })).toBe(false);
    });
});
