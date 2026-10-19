import { describe, expect, it } from "vitest";
import { advanceTurn, campaignTurnPhases, openConflict } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { stanceForTrust } from "../format/figures";
import { standingMoves, tallyStances, worldDesk, worldWars } from "./world-desk";
import { worldGovernments } from "./world-governments";
import { worldOverview, worldRows } from "./world-board";
function weeksOn(campaign, weeks) {
    const phases = campaignTurnPhases(charterOf(campaign));
    let working = campaign;
    for (let week = 0; week < weeks; week += 1)
        working = advanceTurn(working, phases);
    return working;
}
const opening = openingCampaign({ seedText: "world-desk" });
const later = weeksOn(opening, 8);
describe("the governments table's rows", () => {
    const governments = worldGovernments(later);
    it("holds every other government once, and not the President's own", () => {
        const ids = governments.map((government) => government.nation);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain(later.founding.nation);
        expect(ids).toHaveLength(Object.keys(later.nations).length - 1);
    });
    it("counts stances exactly as the ranked list and the overview do", () => {
        const counts = tallyStances(governments);
        expect(counts).toEqual(worldOverview(later).counts);
        const ranked = worldRows(later, "standing");
        for (const row of ranked) {
            expect(governments.find((government) => government.nation === row.nation)?.stance).toBe(row.stance);
        }
    });
    it("places trust only where the services read the government, on the same axis the ranking uses", () => {
        const ranked = new Map(worldRows(later, "standing").map((row) => [row.nation, row]));
        for (const government of governments) {
            if (government.stance === "unread" || government.stance === undefined) {
                expect(government.trust, government.name).toBeUndefined();
                expect(government.trend, government.name).toBeUndefined();
            }
            else {
                expect(government.trust, government.name).toBeCloseTo(ranked.get(government.nation).fraction, 6);
            }
        }
    });
    it("reads a trend only from an observed month and calls a move under a hundredth steady", () => {
        for (const government of governments) {
            if (!government.trend)
                continue;
            const { change, direction } = government.trend;
            expect(direction).toBe(change > 0.01 ? "warming" : change < -0.01 ? "cooling" : "steady");
        }
    });
});
describe("the wars as rows", () => {
    it("lists a war with both principals, an age and no invented exposure", () => {
        const base = openConflict("RUS", "UKR", later.turn, "A conflict for the desk.");
        const campaign = { ...later, conflicts: { [base.id]: base } };
        const [war] = worldWars(campaign);
        expect(war?.sides.map((side) => side.nation)).toEqual(["RUS", "UKR"]);
        expect(war?.age).toMatch(/Going on for \d+ weeks?\./);
        expect(war?.youAreParty).toBe(false);
    });
});
describe("the headline readings", () => {
    const governments = worldGovernments(later);
    const desk = worldDesk(later, governments);
    it("agree with the rows they summarize", () => {
        const { kpis } = desk;
        expect(kpis.intelligence.assessed + kpis.intelligence.unread).toBe(governments.length);
        expect(kpis.standing.read).toBe(governments.filter((government) => government.trust !== undefined).length);
        expect(kpis.wars.count).toBe(desk.wars.length);
        expect(kpis.pending.total).toBe(desk.flight.length);
        expect(Object.values(kpis.pending.byKind).reduce((sum, count) => sum + count, 0)).toBe(kpis.pending.total);
    });
    it("puts the mean of the read governments in the band its own trust falls in", () => {
        const { mean } = desk.kpis.standing;
        expect(mean).toBeDefined();
        expect(mean.stance).toBe(stanceForTrust(mean.fraction * 2 - 1));
    });
    it("totals the five largest trade partners from their own shares", () => {
        const top = [...governments].sort((a, b) => b.tradeShare - a.tradeShare).slice(0, 5);
        expect(desk.kpis.trade.topShare).toBeCloseTo(top.reduce((sum, government) => sum + government.tradeShare, 0), 9);
        expect(desk.kpis.trade.topNames).toEqual(top.map((government) => government.name));
        expect(desk.kpis.trade.topShare).toBeLessThanOrEqual(1);
    });
});
describe("what moved International Standing", () => {
    it("lists only entries that moved it, each narrowed to that reading, and sums them by direction", () => {
        const moves = standingMoves(later);
        for (const row of moves.rows) {
            expect(row.moves.length).toBe(1);
            expect(row.moves[0]?.key).toBe("standing");
        }
        const deltas = moves.rows.flatMap((row) => row.moves.map((move) => move.delta));
        expect(moves.lifted.count).toBe(deltas.filter((delta) => delta > 0).length);
        expect(moves.cost.count).toBe(deltas.filter((delta) => delta < 0).length);
    });
});
describe("TRUST_BAND_TICKS", () => {
    it("names each trust band exactly once", async () => {
        const { TRUST_BAND_TICKS, formatTrustBand } = await import("./world-desk");
        const words = TRUST_BAND_TICKS.map(formatTrustBand);
        expect(new Set(words).size).toBe(words.length);
        expect(words).toHaveLength(4);
    });
});
