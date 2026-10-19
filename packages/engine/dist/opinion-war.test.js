/**
 * A war's pull on whether people feel safe: a rally that fades, the unease of
 * a hot front, and the dead on a log scale, tested at two casualty bands.
 */
import { approvalFor } from "./opinion.js";
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { openConflict } from "./conflicts.js";
import { CASUALTY_CAP, RALLY, WAR_UNEASE, casualtyCost, rallyFor, warOpinionTerms, warSecurityContribution, warSecurityDetail, } from "./opinion-war.js";
import { selectOpinionCauses } from "./opinion.js";
const IRN = "IRN";
const { campaign: BARE } = foundedForBalance("opinion-war", "democrat", {}, { carriedWorld: false });
function atWar(campaign, casualties, weeksIn = 0) {
    const war = {
        ...openConflict(campaign.founding.nation, IRN, campaign.turn - weeksIn, "A test war."),
        intensity: 0.5,
        ...(casualties ? { casualties: { aggressor: casualties } } : {}),
    };
    return { ...campaign, conflicts: { [war.id]: war } };
}
describe("the rally", () => {
    it("peaks in the first week and halves over its half-life, smaller and shorter for a war this government opened", () => {
        const launched = openConflict("USA", IRN, 10, "A test war.");
        expect(rallyFor(launched, 10, "USA")).toBeCloseTo(RALLY.launched.valence, 9);
        expect(rallyFor(launched, 10 + RALLY.launched.halfLifeWeeks, "USA")).toBeCloseTo(RALLY.launched.valence / 2, 9);
        const attacked = openConflict(IRN, "USA", 10, "A test war.");
        expect(rallyFor(attacked, 10, "USA")).toBeCloseTo(RALLY.drawnIn.valence, 9);
        expect(rallyFor(attacked, 10 + RALLY.drawnIn.halfLifeWeeks, "USA")).toBeCloseTo(RALLY.drawnIn.valence / 2, 9);
        expect(RALLY.launched.valence).toBeLessThan(RALLY.drawnIn.valence);
    });
    it("gives nothing for a war this government opened by blockade", () => {
        const blockade = openConflict("USA", IRN, 10, "A test war.", "blockade");
        expect(rallyFor(blockade, 10, "USA")).toBe(0);
    });
    it("reaches the headline through the record every bloc reads, not through the security judgment", () => {
        const at = atWar(BARE);
        expect(warSecurityContribution(warOpinionTerms(at))).toBeLessThanOrEqual(0);
        expect(approvalFor(at)).toBeGreaterThan(approvalFor(BARE));
    });
});
describe("the dead", () => {
    const light = { killed: { low: 50, high: 150 }, wounded: { low: 400, high: 1_200 }, confidence: "medium" };
    const heavy = { killed: { low: 8_000, high: 12_000 }, wounded: { low: 30_000, high: 40_000 }, confidence: "low" };
    it("cost the judgment more at a heavy band than a light one, on a log scale, and never past the cap", () => {
        expect(casualtyCost(undefined)).toBe(0);
        expect(casualtyCost(light)).toBeGreaterThan(0);
        expect(casualtyCost(heavy)).toBeGreaterThan(casualtyCost(light));
        expect(casualtyCost(heavy)).toBeLessThan(100 * casualtyCost(light));
        expect(casualtyCost({ killed: { low: 1e7, high: 1e7 }, wounded: { low: 0, high: 0 }, confidence: "low" })).toBe(CASUALTY_CAP);
    });
    it("reads the killed, not the wounded", () => {
        const wounded = { ...light, wounded: { low: 1e6, high: 1e6 } };
        expect(casualtyCost(wounded)).toBe(casualtyCost(light));
    });
    it("moves the security judgment's war term by the band the war record carries", () => {
        const lightWar = warSecurityContribution(warOpinionTerms(atWar(BARE, light, 30)));
        const heavyWar = warSecurityContribution(warOpinionTerms(atWar(BARE, heavy, 30)));
        expect(heavyWar).toBeLessThan(lightWar);
        const causes = selectOpinionCauses(atWar(BARE, heavy, 30)).find((reading) => reading.driver === "security").causes;
        // A cause is published to the thousandth; the term behind it is not rounded.
        expect(causes.find((cause) => cause.key === "war")?.contribution).toBe(Math.round(heavyWar * 1000) / 1000);
    });
});
describe("the war term", () => {
    it("is nothing without a war, and the front's unease in a war's first week", () => {
        expect(warSecurityContribution(warOpinionTerms(BARE))).toBe(0);
        expect(warSecurityDetail(warOpinionTerms(BARE))).toBe("The country is not at war.");
        const first = warOpinionTerms(atWar(BARE));
        expect(warSecurityContribution(first)).toBeCloseTo(-WAR_UNEASE * 0.5, 9);
        expect(warSecurityDetail(first)).toContain("unsettles");
    });
});
