import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { selectDateOfTurn } from "./clock.js";
import { apply } from "./effects.js";
import { familyCounterpart, familyPlace, selectFamilyRun, selectOpenFamilies } from "./scenario-families.js";
import { FAMILY_LAPSE_DAYS, expiringPins, familyLapsePhase, lapsingFamilies } from "./scenario-family-lapse.js";
const ALP = "ALP";
function opened() {
    const campaign = buildCampaign();
    return apply(campaign, {
        source: "conversation",
        actor: "player",
        turn: 1,
        narration: { summary: "The arc opens." },
        effects: [{ kind: "scenarioFamily", open: { family: "strait", counterpart: ALP, scenario: "strait-1", turn: 1, title: "The strait closes" } }],
    });
}
function at(campaign, turn) {
    return { ...campaign, turn, calendar: selectDateOfTurn(campaign, turn) };
}
function runLapse(campaign) {
    return familyLapsePhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
}
describe("an arc nobody closed", () => {
    it("stays open one week short of the bound and lapses on it", () => {
        const campaign = opened();
        const weeks = FAMILY_LAPSE_DAYS / 7;
        expect(lapsingFamilies(at(campaign, 1 + weeks - 1))).toEqual([]);
        const lapsed = runLapse(at(campaign, 1 + weeks));
        expect(selectFamilyRun(lapsed, "strait")).toMatchObject({ disposition: "lapsed", closedTurn: 1 + weeks });
        expect(selectOpenFamilies(lapsed)).toEqual([]);
    });
    it("measures calendar days from the last beat, so an arc still being dealt never lapses", () => {
        const campaign = opened();
        const beat = apply(at(campaign, 10), {
            source: "conversation",
            actor: "player",
            turn: 10,
            narration: { summary: "A beat." },
            effects: [{ kind: "scenarioFamily", beat: { family: "strait", scenario: "strait-2", turn: 10 } }],
        });
        expect(lapsingFamilies(at(beat, 1 + FAMILY_LAPSE_DAYS / 7))).toEqual([]);
        expect(lapsingFamilies(at(beat, 10 + FAMILY_LAPSE_DAYS / 7)).map((run) => run.family)).toEqual(["strait"]);
    });
    it("never reopens or re-closes an arc that already ended", () => {
        const campaign = apply(opened(), {
            source: "conversation",
            actor: "player",
            turn: 3,
            narration: { summary: "The close." },
            effects: [{ kind: "scenarioFamily", close: { family: "strait", turn: 3, disposition: "held" } }],
        });
        expect(familyLapsePhase(at(campaign, 60))).toEqual([]);
    });
    it("says in the packet which story lapsed", () => {
        const [packet] = familyLapsePhase(at(opened(), 1 + FAMILY_LAPSE_DAYS / 7));
        expect(packet?.narration.summary).toContain("The strait closes");
        expect(packet?.actor).toBe("world");
    });
});
describe("a thread pinned when its opener is raised", () => {
    const place = { state: "OH" };
    const raised = () => apply(buildCampaign(), {
        source: "simulate",
        actor: "world",
        turn: 1,
        narration: { summary: "A decision is waiting." },
        effects: [{ kind: "scenarioFamily", open: { family: "mill", counterpart: ALP, scenario: "mill-1", turn: 1, unanswered: true, place } }],
    });
    const answer = (campaign, turn, at2) => apply(campaign, {
        source: "conversation",
        actor: "player",
        turn,
        narration: { summary: "Answered." },
        effects: [{ kind: "scenarioFamily", open: { family: "mill", counterpart: ALP, scenario: "mill-1", turn, ...(at2 ? { place: at2 } : {}) } }],
    });
    it("exists from the raise with its place, but is not a running story and has no live follow-up", () => {
        const campaign = raised();
        expect(selectFamilyRun(campaign, "mill")).toMatchObject({ place, unanswered: true, beats: ["mill-1"] });
        expect(selectOpenFamilies(campaign)).toEqual([]);
        expect(familyCounterpart(campaign, "mill")).toBeUndefined();
    });
    it("is made live by the answer, which keeps the place it was raised in and counts the opener once", () => {
        const campaign = answer(raised(), 3, { state: "TX" });
        const run = selectFamilyRun(campaign, "mill");
        expect(run?.unanswered).toBeUndefined();
        expect(run).toMatchObject({ place, beats: ["mill-1"], lastTurn: 3, openedTurn: 1 });
        expect(familyPlace(campaign, "mill")).toEqual(place);
        expect(familyCounterpart(campaign, "mill")).toBe(ALP);
        expect(selectOpenFamilies(campaign)).toHaveLength(1);
    });
    it("is not moved by a second raise", () => {
        const again = apply(raised(), {
            source: "simulate",
            actor: "world",
            turn: 2,
            narration: { summary: "Again." },
            effects: [{ kind: "scenarioFamily", open: { family: "mill", counterpart: ALP, scenario: "mill-1", turn: 2, unanswered: true, place: { state: "TX" } } }],
        });
        expect(selectFamilyRun(again, "mill")?.place).toEqual(place);
    });
    it("is dropped, not closed, once an unanswered raise is as old as a lapsing arc", () => {
        const weeks = FAMILY_LAPSE_DAYS / 7;
        expect(expiringPins(at(raised(), 1 + weeks - 1))).toEqual([]);
        const expired = runLapse(at(raised(), 1 + weeks));
        expect(selectFamilyRun(expired, "mill")).toBeUndefined();
        expect(lapsingFamilies(at(raised(), 1 + weeks))).toEqual([]);
    });
    it("never expires an answered thread", () => {
        const answered = answer(raised(), 2);
        expect(expiringPins(at(answered, 200))).toEqual([]);
    });
});
