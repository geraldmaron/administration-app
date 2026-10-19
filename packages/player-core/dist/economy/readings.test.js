import { describe, expect, it } from "vitest";
import { ECONOMIC_PAIN } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { economyReading, economyTiles, isEconomyTileKey } from "./readings";
const base = openingCampaign();
const US = base.founding.nation;
function withEconomy(campaign, economy) {
    const runtime = campaign.nations[US];
    return {
        ...campaign,
        nations: { ...campaign.nations, [US]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } } } },
    };
}
describe("the Desk's economy row", () => {
    it("draws prices, jobs and growth from the live economy, each a door to its own file", () => {
        const tiles = economyTiles(base);
        expect(tiles.map((tile) => tile.key)).toEqual(["inflation", "unemployment", "growth"]);
        const us = base.nations[US].stats.economy;
        expect(tiles[0].figure).toBe(`${(Math.round(us.inflation * 1000) / 10).toFixed(1)}%`);
        expect(tiles.every((tile) => tile.href === `/nation/economy?measure=${tile.key}` && isEconomyTileKey(tile.key))).toBe(true);
    });
    it("opens steady, with nothing moved since the oath", () => {
        for (const tile of economyTiles(base)) {
            expect(tile.stanceWord, tile.key).toBe("Fair");
            expect(tile.change, tile.key).toBeUndefined();
            expect(tile.series).toHaveLength(2);
        }
    });
    it("turns prices red exactly where the public's own salience does", () => {
        const start = base.nations[US].stats.economy.inflation;
        const biting = economyTiles(withEconomy(base, { inflation: start + ECONOMIC_PAIN.inflation }))[0];
        expect(biting.stance).toBe("adverse");
        expect(biting.stanceWord).toBe("Biting");
        expect(biting.change).toMatchObject({ up: true, better: false, text: "+3.0 pts" });
        const rising = economyTiles(withEconomy(base, { inflation: start + ECONOMIC_PAIN.inflation / 2 }))[0];
        expect(rising.stance).toBe("caution");
    });
    it("calls a visible move inside the quiet band little changed rather than steady", () => {
        const start = base.nations[US].stats.economy.unemployment;
        const tile = economyTiles(withEconomy(base, { unemployment: start + 0.003 }))[1];
        expect(tile.stance).toBe("neutral");
        expect(tile.change?.text).toBe("+0.3 pts");
        expect(tile.stanceWord).toBe("Little changed");
    });
    it("reads a shrinking economy as adverse, and faster growth as good news", () => {
        expect(economyTiles(withEconomy(base, { growth: -0.01 }))[2]).toMatchObject({ stance: "adverse", stanceWord: "Shrinking", figure: "−1.0%" });
        const faster = economyTiles(withEconomy(base, { growth: base.nations[US].stats.economy.growth + 0.01 }))[2];
        expect(faster.change).toMatchObject({ up: true, better: true });
    });
});
describe("an economic reading's file", () => {
    it("names the published figure the economy rests on, and what the rate does to approval", () => {
        const reading = economyReading(base, "inflation");
        expect(reading.rest).toEqual({ figure: "2.9%", percent: 2.9, source: "BLS", year: 2024 });
        expect(reading.approval.map((term) => term.label)).toEqual(["Prices", "What things cost now"]);
        expect(reading.approval[0].points).toBeLessThan(0);
        expect(economyReading(base, "growth").rest?.source).toBe("BEA");
    });
});
