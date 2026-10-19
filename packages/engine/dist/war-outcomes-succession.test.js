import { describe, expect, it, vi } from "vitest";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { openConflict } from "./conflicts.js";
import { settle } from "./war-tick.js";
import { OUTCOME_LINES, settlementEffects } from "./war-outcomes.js";
const ALP = nationB.id;
// Stands in for the succession rule so this file can show the hand-off: a
// decisive defeat asks the rule who governs the loser, and files whatever
// seat it returns.
vi.mock("./foreign-politics.js", async (original) => {
    const actual = await original();
    return {
        ...actual,
        defeatSuccessionEffects: (campaign, nation) => [
            { kind: "person", person: "P-SUCCESSOR", changes: { currentRole: "role-head-of-government" } },
            {
                kind: "leadership",
                nation,
                seat: { since: campaign.calendar, offset: { aggression: -0.1 }, provenance: "played" },
                change: { nation, date: campaign.calendar, kind: "succession" },
            },
        ],
    };
});
describe("a decisive defeat hands the loser to the succession rule", () => {
    const campaign = buildCampaign();
    const lost = settle(openConflict(ALP, campaign.founding.nation, campaign.turn, "Alpland attacks."), campaign.turn, "defender-victory", OUTCOME_LINES.decisiveRepulse);
    it("files the seat the rule returns, with the change", () => {
        const seat = settlementEffects(campaign, lost, { decisive: true }).find((effect) => effect.kind === "leadership");
        expect(seat).toMatchObject({ kind: "leadership", nation: ALP, change: { kind: "succession", nation: ALP } });
    });
    it("carries every effect the rule files, the chair with the seat", () => {
        const effects = settlementEffects(campaign, lost, { decisive: true });
        expect(effects.some((effect) => effect.kind === "person" && effect.person === "P-SUCCESSOR")).toBe(true);
    });
    it("asks nothing of the rule after a defeat that was not decisive", () => {
        expect(settlementEffects(campaign, lost).some((effect) => effect.kind === "leadership")).toBe(false);
    });
});
