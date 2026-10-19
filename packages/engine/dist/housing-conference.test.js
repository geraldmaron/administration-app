import { describe, expect, it } from "vitest";
import { advanceUntilAttention } from "./advance.js";
import { buildCampaign, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { advanceBills, CONFERENCE_RECOMMENDATION_WEEKS, conferenceRecommendationDeadline, projectStage } from "./bill-stages.js";
import { addDays, daysBetween, selectDateOfTurn } from "./clock.js";
import { withRaisedCase } from "./cases.js";
import { housingActForText } from "./legislative-acts.js";
import { housingLawOffset, lawOffsetForBill, lawShift } from "./law-offsets.js";
import { signBill } from "./legislation.js";
import { proposeHousingText, recommendHousingConferenceText } from "./bill-text-actions.js";
import { legislationPhase } from "./legislation.js";
import { noopPhase } from "./turn-loop.js";
const id = "bill:act-housing-supply:test";
function housingCampaign(stage = "markup") {
    const campaign = buildCampaign();
    const bill = { id, act: "act-housing-supply", title: "Housing Supply Act", sponsor: "administration", introducedTurn: campaign.turn, status: "in-progress", stage, passage: [] };
    return { ...campaign, congress: { ...campaign.congress, disposition: 1, chambers: {
                house: { seats: 435, administration: 435, opposition: 0, independent: 0 },
                senate: { seats: 100, administration: 100, opposition: 0, independent: 0 },
            } }, bills: { ...campaign.bills, [id]: bill } };
}
function requirePacket(result) {
    if (!result.ok || !result.packet)
        throw new Error(result.reason ?? "No packet");
    return result.packet;
}
function toStage(campaign, stage) {
    let state = campaign;
    for (let attempt = 0; attempt < 300; attempt += 1) {
        state = withWeeksElapsed(state, 1);
        const advance = advanceBills(state);
        if (advance.effects.length)
            state = apply(state, { source: "simulate", actor: "world", turn: state.turn, narration: { summary: "Congress meets." }, effects: advance.effects });
        if (state.bills[id]?.stage === stage || state.bills[id]?.status === stage)
            return state;
        if (state.bills[id]?.status === "dead")
            throw new Error("Housing bill died before the expected stage");
    }
    throw new Error(`Housing bill never reached ${stage}`);
}
describe("housing amendment and conference", () => {
    it("prices the narrower text differently and keeps a mismatched bill off the desk", () => {
        expect(housingLawOffset("targeted").outlays).toBeLessThan(housingLawOffset("base").outlays);
        expect(housingLawOffset("targeted").rest?.["economy.growth"]).toBeLessThan(housingLawOffset("base").rest?.["economy.growth"] ?? 0);
        expect(housingActForText("targeted").domestic).not.toEqual(housingActForText("base").domestic);
        let state = housingCampaign();
        state = apply(state, requirePacket(proposeHousingText(state, id)));
        expect(proposeHousingText(state, id).ok).toBe(false);
        state = { ...state, bills: { ...state.bills, [id]: { ...state.bills[id], stage: "floor" } } };
        state = toStage(state, "conference");
        const bill = state.bills[id];
        expect(bill.status).toBe("in-progress");
        expect(bill.text?.house).toBe("base");
        expect(bill.text?.senate).toBe("targeted");
        expect(bill.text?.initialPassage?.every((vote) => vote.passed)).toBe(true);
        expect(projectStage(state, bill)?.advances).toBe(0);
        expect(advanceBills(state).effects).toEqual([]);
        state = apply(state, requirePacket(recommendHousingConferenceText(state, id, "targeted")));
        expect(state.bills[id]?.status).toBe("in-progress");
        expect(recommendHousingConferenceText(state, id, "base").ok).toBe(false);
        state = toStage(state, "on-the-desk");
        expect(state.bills[id]?.text?.enrolled).toBe("targeted");
        expect(state.bills[id]?.passage.every((vote) => vote.passed)).toBe(true);
        const roundTrip = JSON.parse(JSON.stringify(state.bills[id]));
        expect(lawOffsetForBill(roundTrip)).toEqual(housingLawOffset("targeted"));
        const signed = apply(state, requirePacket(signBill(state, id)));
        expect(signed.bills[id]?.enactedBy).toBe("signed");
        expect(lawShift(signed).outlays).toBe(housingLawOffset("targeted").outlays);
        expect(lawOffsetForBill({ ...roundTrip, text: undefined })).toEqual(housingLawOffset("base"));
    });
    it("lets conferees choose after the unanswered window and requires both chambers to vote again", () => {
        const initial = housingCampaign();
        let state = apply(initial, requirePacket(proposeHousingText(initial, id)));
        state = { ...state, bills: { ...state.bills, [id]: { ...state.bills[id], stage: "floor" } } };
        state = toStage(state, "conference");
        const entered = state.turn;
        const initialPassage = state.bills[id].text.initialPassage;
        expect(conferenceRecommendationDeadline(state, state.bills[id])).toEqual(addDays(selectDateOfTurn(state, entered + CONFERENCE_RECOMMENDATION_WEEKS + 1), -1));
        expect(advanceBills({ ...state, turn: entered + CONFERENCE_RECOMMENDATION_WEEKS - 1 }).effects).toEqual([]);
        const due = { ...state, turn: entered + CONFERENCE_RECOMMENDATION_WEEKS };
        const chosen = advanceBills(due);
        expect(advanceBills(due)).toEqual(chosen);
        expect(chosen.accounts).toEqual([expect.stringContaining("The President offered no recommendation")]);
        state = apply(due, { source: "simulate", actor: "world", turn: due.turn,
            narration: { summary: "Conferees choose a text." }, effects: chosen.effects });
        expect(["base", "targeted"]).toContain(state.bills[id]?.text?.conference);
        expect(state.bills[id]?.status).toBe("in-progress");
        expect(state.bills[id]?.text?.initialPassage).toEqual(initialPassage);
        expect(state.bills[id]?.passage).toEqual([]);
        expect(state.bills[id]?.beats?.at(-1)?.stage).toBe("conference");
        state = toStage(state, "on-the-desk");
        expect(state.bills[id]?.text?.enrolled).toBe(state.bills[id]?.text?.conference);
        expect(state.bills[id]?.passage).toHaveLength(2);
        expect(state.bills[id]?.passage.every((vote) => vote.passed && vote.recordedTurn > due.turn)).toBe(true);
    });
    it("defaults an owed conference case before conferees choose on the following weekly tick", () => {
        const initial = housingCampaign();
        let state = apply(initial, requirePacket(proposeHousingText(initial, id)));
        state = { ...state, bills: { ...state.bills, [id]: { ...state.bills[id], stage: "floor" } } };
        state = toStage(state, "conference");
        const deadline = conferenceRecommendationDeadline(state, state.bills[id]);
        const raised = withRaisedCase(state, { id: "case:conference-housing", kind: "authored-scenario", title: "Conference choice",
            subject: { kind: "bill", id }, clock: { kind: "opportunity", dueAt: deadline },
            defaultOutcome: { kind: "declined", outcomeId: "unanswered" }, urgency: "hard",
            responseRequirement: "president", allowedDispositions: ["act", "allow-default"] }, "world", undefined);
        const phases = { simulate: legislationPhase, select: noopPhase };
        const before = advanceUntilAttention(raised, { phases, horizonDays: daysBetween(state.calendar, deadline) }).campaign;
        expect(before.calendar).toEqual(deadline);
        expect(before.cases?.["case:conference-housing"]?.status).toBe("raised");
        expect(before.bills[id]?.text?.conference).toBeUndefined();
        const after = advanceUntilAttention(before, { phases, horizonDays: 1 }).campaign;
        expect(after.cases?.["case:conference-housing"]?.status).toBe("defaulted");
        expect(after.bills[id]?.text?.conference).toBeDefined();
    });
});
