import { describe, expect, it } from "vitest";
import { stateApprovals } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { stateEconomyBoard } from "../economy/state-economy.js";
import { NAMED_PALETTE, REGIONS, region } from "./__fixtures__/regions.js";
import { readRegion, refOf, regionOfRef } from "./contract.js";
import { dependenceLens, jobsLens, outputLens, pricesLens } from "./lenses/economy-lenses.js";
import { homesLensId } from "./lenses/home-lens.js";
import { callReading, leanText } from "./lenses/state-lenses.js";
import { mapPalette } from "./palette.js";
import { LENS_IDS, resolveLens } from "./registry.js";
import { fillColor, lensRows, lensView } from "./rows.js";
const campaign = openingCampaign();
const rowsOf = (lens, level) => lensRows(lens, REGIONS, level, NAMED_PALETTE);
describe("lens resolution", () => {
    it("builds every listed lens, with or without a campaign", () => {
        for (const id of LENS_IDS) {
            expect(resolveLens(id, campaign, NAMED_PALETTE).id).toBe(id);
            expect(resolveLens(id, null, NAMED_PALETTE).id).toBe(id);
        }
    });
    it("falls back to the neutral lens for an unknown or absent id, never an error", () => {
        for (const id of [undefined, "", "not-a-lens", "APPROVAL"]) {
            const lens = resolveLens(id, campaign, NAMED_PALETTE);
            expect(lens.id).toBe("neutral");
            expect(lens.read(region("states", "CA"), "state")).toBeNull();
        }
    });
});
describe("effective level", () => {
    it("dithers a state's House delegation at state level and colors a district solid at district level", () => {
        const house = resolveLens("house", campaign, NAMED_PALETTE);
        const ca = house.read(region("states", "CA"), "state");
        expect(ca?.fill.kind).toBe("dither");
        const district = house.read(region("districts", "NY-12"), "district");
        expect(district?.fill.kind).toBe("solid");
    });
});
describe("the Congress lenses read the campaign as it is seated, not the dataset", () => {
    const seats = (fill) => (fill && "weights" in fill ? fill.weights : undefined);
    it("dithers a state's House seats from its apportioned delegation, and moves when the seats move", () => {
        const house = resolveLens("house", campaign, NAMED_PALETTE);
        const ca = campaign.states.CA.delegation;
        const reading = house.read(region("states", "CA"), "state");
        expect(seats(reading?.fill)?.reduce((sum, n) => sum + n, 0)).toBe(ca.house.seats);
        const flipped = { ...campaign, states: { ...campaign.states, CA: { ...campaign.states.CA, delegation: { ...ca, house: { ...ca.house, administration: ca.house.opposition, opposition: ca.house.administration } } } } };
        const moved = resolveLens("house", flipped, NAMED_PALETTE).read(region("states", "CA"), "state");
        expect(seats(moved?.fill)).toEqual([...(seats(reading?.fill) ?? [])].slice(0, 2).reverse().concat(seats(reading?.fill)?.slice(2) ?? []));
    });
    it("dithers a state's two senators, and gives DC none", () => {
        const senate = resolveLens("senate", campaign, NAMED_PALETTE);
        const reading = senate.read(region("states", "OH"), "state");
        expect(seats(reading?.fill)?.reduce((sum, n) => sum + n, 0)).toBe(2);
        expect(reading?.text).toMatch(/of 2 senators$/);
        expect(senate.read(region("states", "DC"), "state")?.text).toBe("No senators");
        expect(senate.read(region("districts", "OH-01"), "district")).toBeNull();
    });
    it("shows no seats, not the opening roster, before an administration is in office", () => {
        expect(resolveLens("house", null, NAMED_PALETTE).read(region("states", "CA"), "state")?.text).toBe("No game in progress");
    });
    it("keeps future member support unresolved on the delegation map", () => {
        const bill = { id: "bill:act-tax-relief-and-growth:1", act: "act-tax-relief-and-growth", title: "Tax Relief and Growth Act", sponsor: "bipartisan", introducedTurn: 1, status: "in-progress", stage: "floor", passage: [] };
        const withBill = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
        const lens = resolveLens(`whip:house:${bill.id}`, withBill, NAMED_PALETTE);
        expect(lens.id).toBe(`whip:house:${bill.id}`);
        expect(lens.read(region("states", "TX"), "state")?.text).toBe("Support unclear");
        expect(resolveLens("whip:house:bill:none", withBill, NAMED_PALETTE).read(region("states", "TX"), "state")?.text).toBe("No such bill");
    });
    it("colors each state by where its regional paper stands", () => {
        expect(resolveLens("press-reach", campaign, NAMED_PALETTE).read(region("states", "OH"), "state")?.text).toMatch(/: (Friendly|Even-handed|Skeptical|Hostile)$/);
    });
});
describe("state lenses", () => {
    it("reads approval from the engine's state approval, at state level only", () => {
        const approvals = stateApprovals(campaign);
        const lens = resolveLens("approval", campaign, NAMED_PALETTE);
        const reading = lens.read(region("states", "PA"), "state");
        expect(reading?.rank).toBeCloseTo(approvals["PA"]);
        expect(reading?.text).toMatch(/^\d+% approve$/);
        expect(lens.read(region("districts", "PA-01"), "district")).toBeNull();
        expect(lens.read(region("world", "FRA"), "nation")).toBeNull();
    });
    it("shows no data, not a guess, before an administration is in office", () => {
        const reading = resolveLens("approval", null, NAMED_PALETTE).read(region("states", "PA"), "state");
        expect(reading?.fill).toEqual({ kind: "solid", color: "nodata" });
    });
    it("says lean the way a reader does", () => {
        expect(leanText(-0.12)).toBe("D+12");
        expect(leanText(0.041)).toBe("R+4");
        expect(leanText(0.002)).toBe("Even");
    });
    it("dithers a state that splits its electoral votes in proportion", () => {
        const split = { state: "ME", share: 0.52, electoralVotes: 4, administrationVotes: 3, winner: "administration", allocation: "by-district" };
        const reading = callReading(split, NAMED_PALETTE);
        expect(reading.fill).toEqual({ kind: "dither", colors: ["forLean", "againstLean"], weights: [3, 1] });
        const safe = callReading({ ...split, administrationVotes: 4, share: 0.58, allocation: "winner-take-all" }, NAMED_PALETTE);
        expect(safe.fill).toEqual({ kind: "solid", color: "forStrong" });
        // `share` is the administration's whoever won: a state lost narrowly has it just under half.
        const lost = callReading({ ...split, administrationVotes: 0, winner: "opposition", share: 0.47, allocation: "winner-take-all" }, NAMED_PALETTE);
        expect(lost.fill).toEqual({ kind: "solid", color: "againstLean" });
    });
    it("calls a state safe against you by the opposition's share, not yours", () => {
        const deep = { state: "WY", share: 0.28, electoralVotes: 3, administrationVotes: 0, winner: "opposition", allocation: "winner-take-all" };
        const reading = callReading(deep, NAMED_PALETTE);
        expect(reading.fill).toEqual({ kind: "solid", color: "againstStrong" });
        expect(reading.text).toBe("Called against you, 72% to 28%, 3 electoral votes");
        expect(reading.rank).toBeCloseTo(0.28, 9);
    });
});
describe("nation lenses", () => {
    it("paints the United States in its own gold and reads the rest through standing", () => {
        const lens = resolveLens("relations", campaign, NAMED_PALETTE);
        expect(lens.read(region("world", "USA"), "nation")?.fill).toEqual({ kind: "solid", color: "own" });
        const france = lens.read(region("world", "FRA"), "nation");
        expect(france).not.toBeNull();
        expect(["favorable", "steady", "caution", "adverse", "unread"]).toContain(france.fill.color);
    });
    it("sizes the forces lens by presence, with radius kept in the 0.6× to 1.6× band", () => {
        const lens = resolveLens("forces", campaign, NAMED_PALETTE);
        const hosts = REGIONS.filter((r) => r.layer === "world").flatMap((r) => {
            const fill = lens.read(r, "nation")?.fill;
            return fill?.kind === "solid" && fill.scale !== undefined ? [fill.scale] : [];
        });
        expect(hosts.length).toBeGreaterThan(0);
        for (const scale of hosts) {
            expect(scale).toBeGreaterThanOrEqual(0.6);
            expect(scale).toBeLessThanOrEqual(1.6);
        }
    });
    it("reads a US state under a nation lens as the United States, so the country never goes neutral", () => {
        expect(readRegion(resolveLens("relations", campaign, NAMED_PALETTE), region("states", "TX"), "state")?.fill).toEqual({ kind: "solid", color: "own" });
    });
});
describe("districts inside a detached state", () => {
    it("carry their state's approval, said as statewide, because no district figure would be honest", () => {
        const lens = resolveLens("approval", campaign, NAMED_PALETTE);
        const state = lens.read(region("states", "PA"), "state");
        const district = readRegion(lens, region("districts", "PA-03"), "district");
        expect(district.fill).toEqual(state.fill);
        expect(district.text).toBe(`${state.text}, statewide`);
    });
    it("are drawn by their own lean under the lean lens", () => {
        const lens = resolveLens("lean", campaign, NAMED_PALETTE);
        const urban = readRegion(lens, region("districts", "PA-03"), "district");
        expect(urban.text).not.toMatch(/statewide/);
        expect(urban.text).toMatch(/^(D\+\d+|R\+\d+|Even)$/);
    });
    it("still rank by state in the list, so a state lens never lists 435 copies of 51 values", () => {
        const rows = rowsOf(resolveLens("approval", campaign, NAMED_PALETTE), "district");
        expect(rows).toHaveLength(51);
    });
});
describe("population by state", () => {
    it("ranks the largest state first and keeps radius in the magnitude band", () => {
        const lens = resolveLens("state-population", campaign, NAMED_PALETTE);
        const rows = rowsOf(lens, "state");
        expect(rows[0].regionKey).toBe("state:CA");
        expect(rows[0].value).toMatch(/million people$/);
        const fill = lens.read(region("states", "WY"), "state")?.fill;
        expect(fill?.kind === "solid" ? fill.scale : undefined).toBeGreaterThanOrEqual(0.6);
    });
});
describe("the accessible list", () => {
    it("ranks every state for a state lens, highest first, with the value in words", () => {
        const rows = rowsOf(resolveLens("approval", campaign, NAMED_PALETTE), "state");
        expect(rows).toHaveLength(51);
        for (let i = 1; i < rows.length; i++)
            expect(rows[i - 1].rank).toBeGreaterThanOrEqual(rows[i].rank);
        expect(rows[0].regionKey).toMatch(/^state:[A-Z]{2}$/);
        expect(rows.every((row) => row.value.endsWith("approve"))).toBe(true);
    });
    it("lists the House by delegation at state level and by seat at district level", () => {
        const house = resolveLens("house", campaign, NAMED_PALETTE);
        const byState = rowsOf(house, "state");
        expect(byState.find((row) => row.regionKey === "state:CA")?.value).toMatch(/Democratic.*Republican.*of 52 House seats/);
        const bySeat = rowsOf(house, "district");
        expect(bySeat.length).toBeGreaterThan(430);
        expect(bySeat.find((row) => row.regionKey === "district:NY-12")?.label).toBe("District NY-12");
    });
    it("lists governments by name for a nation lens, and nothing for the neutral lens", () => {
        const rows = rowsOf(resolveLens("relations", campaign, NAMED_PALETTE), "nation");
        expect(rows.find((row) => row.regionKey === "nation:FRA")?.label).toBe("France");
        expect(rowsOf(resolveLens("neutral", campaign, NAMED_PALETTE), "state")).toEqual([]);
    });
    it("round-trips a ref", () => {
        for (const ref of ["nation:FRA", "state:CA", "district:NY-12"])
            expect(refOf(regionOfRef(ref))).toBe(ref);
        expect(regionOfRef("county:X")).toBeUndefined();
        expect(regionOfRef("state:")).toBeUndefined();
    });
});
describe("the delta lens", () => {
    it("recolors each state by its approval move since the last change, and says both ends", () => {
        const moved = { ...campaign, player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval: Math.min(1, campaign.player.metrics.approval + 0.04) } } };
        const before = stateApprovals(campaign);
        const after = stateApprovals(moved);
        const lens = resolveLens("delta", moved, NAMED_PALETTE, campaign);
        const reading = lens.read(region("states", "OH"), "state");
        expect(reading?.rank).toBeCloseTo(after["OH"] - before["OH"], 12);
        expect(reading?.rank).toBeGreaterThan(0);
        expect(reading?.text).toMatch(/^\+[\d.]+ points, \d+% to \d+%$/);
        expect(lens.read(region("world", "FRA"), "nation")).toBeNull();
    });
    it("shows no data rather than a change when nothing has changed yet", () => {
        const reading = resolveLens("delta", campaign, NAMED_PALETTE, null).read(region("states", "OH"), "state");
        expect(reading?.text).toBe("Nothing has changed yet");
    });
    it("replays a closed week from the weekly state series, and the latest week up to the open week's figures", () => {
        const { week, ...closed } = campaign;
        void week;
        const now = stateApprovals({ ...closed, turn: 5 });
        const opened = Object.fromEntries(Object.entries(now).map(([id, value]) => [id, value - 0.01]));
        const kept = { ...closed, turn: 5, stateApprovalHistory: [{ turn: 4, approval: opened }] };
        const reading = resolveLens("week:4", kept, NAMED_PALETTE).read(region("states", "OH"), "state");
        expect(reading?.rank).toBeCloseTo(0.01, 12);
        const lost = resolveLens("week:2", kept, NAMED_PALETTE).read(region("states", "OH"), "state");
        expect(lost?.text).toBe("State figures don't go back this far");
    });
});
describe("the economy lenses", () => {
    it("say nothing about foreign land and read every state", () => {
        for (const lens of [jobsLens(campaign, NAMED_PALETTE), pricesLens(campaign, NAMED_PALETTE), outputLens(campaign, NAMED_PALETTE), dependenceLens(campaign, NAMED_PALETTE)]) {
            expect(lens.read(region("world", "FRA"), "nation")).toBeNull();
            expect(lens.read(region("states", "OH"), "state")?.text.length).toBeGreaterThan(0);
        }
    });
    it("ranks the jobs list from fewest out of work, each line saying the gap against the country", () => {
        const rows = rowsOf(jobsLens(campaign, NAMED_PALETTE), "state");
        const board = new Map(stateEconomyBoard(campaign).rows.map((row) => [`state:${row.state}`, row.jobsGap]));
        const gaps = rows.map((row) => board.get(row.regionKey));
        expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
        expect(rows[0].value).toMatch(/out of work, [+−]\d+\.\d pts compared with the country$/);
    });
    it("reads DC as the most federally dependent place", () => {
        const rows = rowsOf(dependenceLens(campaign, NAMED_PALETTE), "state");
        expect(rows[0].regionKey).toBe("state:DC");
    });
    it("is dim with no administration in office", () => {
        expect(jobsLens(null, NAMED_PALETTE).read(region("states", "OH"), "state")?.text).toBe("No game in progress");
    });
});
describe("the circuits lens", () => {
    it("colors a state by its circuit's bench and leaves foreign land alone", () => {
        const lens = resolveLens("circuits", campaign, NAMED_PALETTE);
        expect(lens.id).toBe("circuits");
        expect(lens.read(region("states", "OH"), "state")?.text).toContain("Sixth Circuit");
        expect(lens.read(region("world", "FRA"), "nation")).toBeNull();
    });
});
describe("the homes lens", () => {
    it("names a ticket's states before any campaign exists", () => {
        const lens = resolveLens(homesLensId("OH", "TX", ["FL", "TX"]), null, NAMED_PALETTE);
        expect(lens.read(region("states", "OH"), "state")?.text).toContain("your home");
        expect(lens.read(region("states", "TX"), "state")?.text).toContain("running mate");
        expect(lens.read(region("states", "FL"), "state")?.text).toContain("shortlist");
        expect(lens.read(region("states", "NY"), "state")).toBeNull();
    });
    it("marks a state that is both yours and your running mate's once", () => {
        const lens = resolveLens(homesLensId("OH", "OH"), null, NAMED_PALETTE);
        expect(lens.read(region("states", "OH"), "state")?.text).toContain("you and your running mate");
    });
});
describe("the rows a filled map draws", () => {
    it("fills a mixed reading with its largest share and keeps the mix for the key", () => {
        expect(fillColor({ kind: "dither", colors: ["a", "b", "c"], weights: [2, 5, 1] }, NAMED_PALETTE)).toBe("b");
        expect(fillColor({ kind: "none" }, NAMED_PALETTE)).toBe("land");
        const ca = rowsOf(resolveLens("house", campaign, NAMED_PALETTE), "state").find((row) => row.regionKey === "state:CA");
        expect(ca.mix?.weights.reduce((sum, n) => sum + n, 0)).toBe(campaign.states.CA.delegation.house.seats);
        expect(["democrat", "republican", "independent"]).toContain(ca.fill);
    });
    it("paints the drawn regions the list leaves out: states under a nation lens, districts under their state", () => {
        const relations = lensView(resolveLens("relations", campaign, NAMED_PALETTE), REGIONS, "nation", NAMED_PALETTE);
        expect(relations.rows.find((row) => row.regionKey === "nation:USA")?.fill).toBe("own");
        expect(relations.paint.find((paint) => paint.regionKey === "state:TX")?.fill).toBe("own");
        const approval = lensView(resolveLens("approval", campaign, NAMED_PALETTE), REGIONS, "district", NAMED_PALETTE);
        const pa = approval.rows.find((row) => row.regionKey === "state:PA");
        expect(approval.paint.find((paint) => paint.regionKey === "district:PA-03")?.fill).toBe(pa.fill);
        expect(approval.paint.some((paint) => paint.regionKey === "nation:FRA")).toBe(false);
    });
    it("resolves every slot of every display palette to a color", () => {
        for (const colorVision of ["standard", "protan", "deutan", "tritan"]) {
            for (const highContrast of [false, true]) {
                const palette = mapPalette({ colorVision, highContrast });
                expect(palette.seq).toHaveLength(7);
                expect(palette.div).toHaveLength(7);
                expect(palette.standing).toHaveLength(7);
                for (const value of Object.values(palette).flat())
                    expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
            }
        }
    });
});
describe("the governors lens", () => {
    it("reads every seated governor in one of four bands and says so where none sits", () => {
        const lens = resolveLens("governors", campaign, NAMED_PALETTE);
        for (const [id, state] of Object.entries(campaign.states)) {
            const reading = lens.read({ layer: "states", id }, "state");
            expect(reading?.text).toMatch(state.governor ? /^Governor is (allied|cooperative|guarded|opposed)$/ : /^No governor$/);
        }
        expect(lens.read({ layer: "world", id: "FRA" }, "state")).toBeNull();
    });
});
