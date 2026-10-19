import { describe, expect, it } from "vitest";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { advanceBills } from "./bill-stages.js";
import { apply } from "./effects.js";
import { actForText, actOf } from "./legislative-acts.js";
import { lawOffsetForBill, lawOffsetForText, lawShift } from "./law-offsets.js";
import { signBill, transmit } from "./legislation.js";
import { proposeBillText, recommendBillConferenceText } from "./bill-text-actions.js";
import { createSave, loadSave } from "./save.js";
import { selectCurrentLaws, selectLaws } from "./state.js";
function packet(result) {
    if (!result.ok || !result.packet)
        throw new Error(result.reason ?? "The bill action failed.");
    return result.packet;
}
function nextSitting(campaign, id, destination) {
    let state = campaign;
    for (let step = 0; step < 300; step += 1) {
        state = withWeeksElapsed(state, 1);
        const advance = advanceBills(state);
        if (advance.effects.length)
            state = apply(state, { source: "simulate", actor: "world", turn: state.turn, narration: { summary: "Congress meets." }, effects: advance.effects });
        if (state.bills[id]?.stage === destination || state.bills[id]?.status === destination)
            return state;
        if (state.bills[id]?.status === "dead")
            throw new Error(`${id} died before ${destination}.`);
    }
    throw new Error(`${id} never reached ${destination}.`);
}
describe.each(["act-health-coverage", "act-clean-grid"])("substantive %s amendment", (actId) => {
    it("changes the chamber text, public policy, and continuing cost only after both chambers agree", () => {
        const id = `bill:${actId}:provisions`;
        const base = buildCampaign();
        const act = actForText(actId, "base");
        const bill = { id, act: actId, title: act.title, sponsor: "administration", introducedTurn: base.turn, status: "in-progress", stage: "markup", passage: [] };
        let state = { ...base, congress: { ...base.congress, disposition: 1, chambers: {
                    house: { seats: 435, administration: 435, opposition: 0, independent: 0 },
                    senate: { seats: 100, administration: 100, opposition: 0, independent: 0 },
                } }, bills: { ...base.bills, [id]: bill } };
        expect(lawOffsetForText(actId, "targeted")?.outlays).toBeLessThan(lawOffsetForText(actId, "base").outlays);
        expect(actForText(actId, "targeted")?.domestic).not.toEqual(act.domestic);
        state = apply(state, packet(proposeBillText(state, id)));
        expect(state.bills[id]?.text?.proposed).toBe("targeted");
        state = { ...state, bills: { ...state.bills, [id]: { ...state.bills[id], stage: "floor" } } };
        state = nextSitting(state, id, "conference");
        expect(state.bills[id]?.text?.house).toBe("base");
        expect(state.bills[id]?.text?.senate).toBe("targeted");
        expect(state.bills[id]?.text?.initialPassage?.every((vote) => vote.passed)).toBe(true);
        state = apply(state, packet(recommendBillConferenceText(state, id, "targeted")));
        state = nextSitting(state, id, "on-the-desk");
        expect(state.bills[id]?.text?.enrolled).toBe("targeted");
        expect(actOf(state.bills[id])?.summary).toBe(actForText(actId, "targeted")?.summary);
        const signed = apply(state, packet(signBill(state, id)));
        expect(signed.bills[id]?.status).toBe("law");
        expect(lawOffsetForBill(signed.bills[id])).toEqual(lawOffsetForText(actId, "targeted"));
        expect(lawShift(signed).outlays).toBe(lawOffsetForText(actId, "targeted")?.outlays);
    });
});
it("carries a housing repeal through both chambers, then keeps enacted history and sunk effects across reload", () => {
    const opening = buildCampaign();
    const friendly = { ...withWeeksElapsed(opening, 16), congress: { ...opening.congress, disposition: 1,
            chambers: { house: { seats: 435, administration: 435, opposition: 0, independent: 0 },
                senate: { seats: 100, administration: 100, opposition: 0, independent: 0 } } } };
    const originalSent = apply(friendly, packet(transmit(friendly, "act-housing-supply")));
    const original = Object.values(originalSent.bills).find((bill) => bill.act === "act-housing-supply");
    const originalDesk = nextSitting(originalSent, original.id, "on-the-desk");
    const enacted = apply(originalDesk, packet(signBill(originalDesk, original.id)));
    expect(lawShift(enacted).outlays).toBeGreaterThan(lawShift(friendly).outlays);
    const saved = loadSave(JSON.parse(JSON.stringify(createSave(enacted))));
    const repealReady = withWeeksElapsed(saved, 1);
    const repealSent = apply(repealReady, packet(transmit(repealReady, "act-housing-repeal")));
    const repeal = Object.values(repealSent.bills).find((bill) => bill.act === "act-housing-repeal");
    expect(repeal.revises?.billId).toBe(original.id);
    const repealDesk = nextSitting(repealSent, repeal.id, "on-the-desk");
    const repealed = apply(repealDesk, packet(signBill(repealDesk, repeal.id)));
    expect(selectLaws(repealed).map((bill) => bill.id)).toEqual([repeal.id, original.id].sort());
    expect(selectCurrentLaws(repealed)).toEqual([]);
    expect(lawShift(repealed).outlays).toBe(lawShift(friendly).outlays);
    expect(repealed.states).toEqual(enacted.states);
    expect(repealed.cohorts).toEqual(enacted.cohorts);
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(repealed))));
    expect(restored.bills[original.id]).toEqual(repealed.bills[original.id]);
    expect(restored.bills[repeal.id]).toEqual(repealed.bills[repeal.id]);
    expect(lawShift(restored)).toEqual(lawShift(repealed));
    expect(restored.states).toEqual(enacted.states);
});
