import { describe, expect, it } from "vitest";
import { advanceTurn, campaignTurnPhases, openConflict } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { nationFile } from "./nation-file";
import { bilateralTradePartners } from "./trade-partners";
import { forcesByHost, usForcesIn } from "./us-presence";
import { STANDING_BANDS, WORLD_LENSES, searchWorldRows, worldOverview, worldRows, worldWatchlist } from "./world-board";
import { WORLD_REGIONS } from "./world-regions";
function weeksOn(campaign, weeks) {
    const phases = campaignTurnPhases(charterOf(campaign));
    let working = campaign;
    for (let week = 0; week < weeks; week += 1)
        working = advanceTurn(working, phases);
    return working;
}
const opening = openingCampaign({ seedText: "world-board" });
const later = weeksOn(opening, 10);
const foreign = Object.keys(opening.nations).filter((id) => id !== opening.founding.nation);
describe("the world's ranked list", () => {
    it("marks opponents, never coalition partners, as at war with the US on either side", () => {
        const rus = "RUS";
        const ukr = "UKR";
        const ally = "GBR";
        for (const side of ["aggressor", "defender"]) {
            const base = openConflict(rus, ukr, opening.turn, "A conflict for the board reading.");
            const conflict = { ...base, joined: { ...base.joined, [side]: [opening.founding.nation, ally] } };
            const campaign = { ...opening, conflicts: { [conflict.id]: conflict } };
            const atWar = worldRows(campaign, "standing").filter((row) => row.atWar).map((row) => row.nation);
            expect(atWar).toEqual([side === "aggressor" ? ukr : rus]);
            expect(atWar).not.toContain(ally);
        }
    });
    it("ranks every other government for each lens, and the President's own country in none", () => {
        for (const lens of WORLD_LENSES) {
            const rows = worldRows(opening, lens);
            expect(rows, lens).toHaveLength(foreign.length);
            expect(rows.map((row) => row.nation), lens).not.toContain(opening.founding.nation);
            for (const row of rows) {
                expect(row.fraction, `${lens} ${row.nation}`).toBeGreaterThanOrEqual(0);
                expect(row.fraction, `${lens} ${row.nation}`).toBeLessThanOrEqual(1);
                expect(row.value, `${lens} ${row.nation}`).not.toBe("");
            }
        }
    });
    it("puts the warmest standing first and prints words rather than figures", () => {
        const rows = worldRows(opening, "standing");
        expect(rows[0].stance).toBe("favorable");
        expect(rows.every((row) => !/\d/.test(row.value))).toBe(true);
    });
    it("ranks the largest host of US forces first under the forces lens", () => {
        const rows = worldRows(opening, "forces");
        const top = [...forcesByHost(opening).entries()].sort((a, b) => b[1] - a[1])[0];
        expect(rows[0].nation).toBe(top[0]);
        expect(rows.filter((row) => row.value === "No US troops").length).toBeGreaterThan(0);
    });
    it("finds a government by its name, its capital or what it is called", () => {
        const rows = worldRows(opening, "standing");
        expect(searchWorldRows(rows, "mexico").map((row) => row.nation)).toContain("MEX");
        expect(searchWorldRows(rows, "  ")).toHaveLength(rows.length);
        expect(searchWorldRows(rows, "zzzzzz")).toHaveLength(0);
    });
});
describe("the watchlist", () => {
    it("lists the wars on the board with a door to each", () => {
        const { wars } = worldWatchlist(openingCampaign());
        expect(wars.length).toBeGreaterThan(0);
        for (const war of wars)
            expect(war.href).toBe(`/world/war/${encodeURIComponent(war.id)}`);
    });
    it("names only foreign governments as movers", () => {
        const { movers } = worldWatchlist(later);
        for (const mover of movers)
            expect(foreign).toContain(mover.nation);
        expect(movers.length).toBeLessThanOrEqual(5);
    });
});
describe("a country's trade", () => {
    it("reads the United States' flow and the country's own partners", () => {
        const trade = bilateralTradePartners(opening, "MEX");
        expect(trade.usShare).toBeGreaterThan(0);
        expect(trade.partners[0].nation).toBe("USA");
        expect(trade.partners.every((partner, index, all) => index === 0 || all[index - 1].share >= partner.share)).toBe(true);
        expect(trade.sectors.length).toBeGreaterThan(0);
        expect(trade.balanceLine).toMatch(/Mexico/);
    });
    it("keeps no file on the President's own country", () => {
        expect(bilateralTradePartners(opening, opening.founding.nation)).toBeUndefined();
        expect(nationFile(opening, opening.founding.nation)).toBeUndefined();
    });
});
describe("a country's file", () => {
    it("assembles every section for every foreign government", () => {
        for (const id of foreign.slice(0, 40)) {
            const file = nationFile(opening, id);
            expect(file, id).toBeDefined();
            expect(file.vitals.length, id).toBe(5);
            expect(file.arcs.length, id).toBeLessThanOrEqual(8);
            for (const arc of file.arcs)
                expect([...foreign, opening.founding.nation], id).toContain(arc.to);
        }
    });
    it("places US forces inside the host and in no one else", () => {
        const host = [...forcesByHost(opening).keys()][0];
        const file = nationFile(opening, host);
        expect(file.presence.length).toBeGreaterThan(0);
        expect(usForcesIn(opening, host)).toHaveLength(file.presence.length);
    });
    it("reads a thin country with its provenance and a full one without", () => {
        const thin = foreign.find((id) => opening.nations[id]?.base.fidelity === "thin");
        if (thin)
            expect(nationFile(opening, thin).provenance).toMatch(/World Bank/);
        const full = foreign.find((id) => (opening.nations[id]?.base.fidelity ?? "full") === "full");
        expect(nationFile(opening, full).provenance).toBeUndefined();
    });
});
describe("the world's headline", () => {
    it("counts every other government once, overall and across the six parts of the world", () => {
        const overview = worldOverview(opening);
        expect(overview.total).toBe(foreign.length);
        const counted = Object.values(overview.counts).reduce((sum, n) => sum + n, 0);
        expect(counted).toBe(foreign.length);
        expect(overview.regions.map((tile) => tile.region)).toEqual([...WORLD_REGIONS]);
        expect(overview.regions.reduce((sum, tile) => sum + tile.total, 0)).toBe(foreign.length);
    });
    it("places every government in the dataset in one of the six parts", () => {
        expect(worldRows(opening, "standing").filter((row) => row.region === undefined).map((row) => row.nation)).toEqual([]);
    });
    it("names at most four governments per part, war and hostility first", () => {
        for (const tile of worldOverview(later).regions) {
            expect(tile.notable.length).toBeLessThanOrEqual(4);
            expect(tile.atWar).toBeLessThanOrEqual(tile.total);
        }
    });
});
describe("standing inside a band", () => {
    it("places read governments where their trust sits, so one band is not one point", () => {
        const rows = worldRows(opening, "standing").filter((row) => row.stance === "favorable");
        expect(new Set(rows.map((row) => row.fraction)).size).toBeGreaterThan(5);
        for (const row of rows) {
            const band = STANDING_BANDS.find((entry) => entry.stance === "favorable");
            expect(row.fraction).toBeGreaterThanOrEqual(band.from);
            expect(row.fraction).toBeLessThanOrEqual(band.to);
        }
    });
    it("ranks warmer first inside a band", () => {
        const rows = worldRows(opening, "standing").filter((row) => row.stance === "favorable");
        for (let i = 1; i < rows.length; i += 1)
            expect(rows[i - 1].fraction).toBeGreaterThanOrEqual(rows[i].fraction);
    });
    it("spans the axis with four bands that meet", () => {
        expect(STANDING_BANDS[0].from).toBe(0);
        expect(STANDING_BANDS.at(-1).to).toBe(1);
        for (let i = 1; i < STANDING_BANDS.length; i += 1)
            expect(STANDING_BANDS[i].from).toBe(STANDING_BANDS[i - 1].to);
    });
});
