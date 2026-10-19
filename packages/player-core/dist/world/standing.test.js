import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { advanceTurn, bilateralGoods, hasIntelOnNation, relationshipKey, selectRelationship, trustCourse } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { stanceForTrust } from "../format/figures";
import { RECORD_STARTS_AT_LOAD } from "../polling/record-trend";
import { nationFile } from "./nation-file";
import { boardStance, goodsTradeShare, goodsTradeTotals, standingToward, THEIR_VIEW } from "./standing";
const campaign = openingCampaign();
const home = campaign.founding.nation;
const foreign = Object.keys(campaign.nations).filter((id) => id !== home);
const godMode = { ...campaign, godMode: { enabled: true, enabledTurn: campaign.turn, actions: 1, branchPoints: [] } };
describe("how a government sits toward you", () => {
    // The board once read the United States' own view of each capital under a
    // caption saying how the capital saw the United States. The fill is the
    // capital's trust in you, or "unread" where the services cannot see it.
    it("draws every government by its own trust in the United States, or as unread", () => {
        for (const id of foreign) {
            const theirs = selectRelationship(campaign, id, home);
            const expected = !hasIntelOnNation(campaign, id) ? "unread" : theirs ? stanceForTrust(theirs.trust) : undefined;
            expect(boardStance(standingToward(campaign, id)), id).toBe(expected);
        }
    });
    it("reads the direction that points at the United States, not the one leaving it", () => {
        const flipped = foreign.filter((id) => {
            const theirs = selectRelationship(godMode, id, home);
            const ours = selectRelationship(godMode, home, id);
            return theirs && ours && stanceForTrust(theirs.trust) !== stanceForTrust(ours.trust);
        });
        expect(flipped.length).toBeGreaterThan(20);
        for (const id of flipped) {
            expect(boardStance(standingToward(godMode, id)), id).toBe(stanceForTrust(selectRelationship(godMode, id, home).trust));
        }
        const korea = "PRK";
        expect(boardStance(standingToward(godMode, korea))).toBe(stanceForTrust(selectRelationship(godMode, korea, home).trust));
    });
    it("keeps their view behind the services and your own read always legible", () => {
        const unread = foreign.filter((id) => !hasIntelOnNation(campaign, id));
        expect(unread.length).toBeGreaterThan(0);
        for (const id of unread) {
            const standing = standingToward(campaign, id);
            expect(standing.unread, id).toBe(true);
            expect(standing.theirs, id).toBeUndefined();
            expect(standing.ours?.caption, id).toBe("Your view of them");
        }
        const read = foreign.find((id) => hasIntelOnNation(campaign, id) && selectRelationship(campaign, id, home));
        expect(standingToward(campaign, read)?.theirs?.caption).toBe(THEIR_VIEW);
    });
    it("gives a band and a step, never a figure", () => {
        const standing = standingToward(godMode, "CHN");
        for (const reading of [standing.theirs?.trust, standing.ours?.trust, standing.tension, standing.aims, standing.threat]) {
            expect(reading).toBeDefined();
            expect(reading.word).not.toMatch(/\d/);
            expect(reading.level).toBeGreaterThanOrEqual(1);
            expect(reading.level).toBeLessThanOrEqual(4);
        }
    });
    it("has no standing toward the United States itself", () => {
        expect(standingToward(campaign, home)).toBeUndefined();
    });
});
describe("how the standing has moved", () => {
    const partner = foreign.find((id) => hasIntelOnNation(campaign, id) && selectRelationship(campaign, home, id) && selectRelationship(campaign, id, home));
    const key = relationshipKey(home, partner);
    const withOurTrust = (from, trust) => ({
        ...from,
        relationships: { ...from.relationships, [key]: { ...from.relationships[key], trust } },
    });
    let played = campaign;
    for (let week = 0; week < 14; week += 1)
        played = advanceTurn(withOurTrust(played, 0.2 + week / 100));
    it("reads both directions and the tension off the recorded course, one point a week", () => {
        const trend = standingToward(played, partner).trend;
        expect(trend.start).toEqual({ since: 1, fromOath: true });
        expect(trend.ours.points.map((point) => point.value)).toEqual(trustCourse(played, partner).map((point) => point.ours));
        expect(trend.ours.points).toHaveLength(14);
        expect(trend.theirs.points).toHaveLength(14);
        expect(trend.tension.points).toHaveLength(14);
    });
    it("gives the change over four and thirteen weeks", () => {
        const trend = standingToward(played, partner).trend;
        expect(trend.ours.change4).toBeCloseTo(0.04, 6);
        expect(trend.ours.change13).toBeCloseTo(0.13, 6);
    });
    it("keeps their side of the course behind the services, like their band", () => {
        const unread = foreign.find((id) => !hasIntelOnNation(played, id) && selectRelationship(played, id, home));
        const trend = standingToward(played, unread).trend;
        expect(trend.theirs).toBeUndefined();
        expect(trend.ours?.points.length ?? trend.tension?.points.length).toBe(14);
    });
    it("rides the country file, so its screen reads the same course", () => {
        expect(nationFile(played, partner).standing.trend).toEqual(standingToward(played, partner).trend);
    });
    it("says the record starts at the load on a save that never kept one", () => {
        const { relationsRecord: _record, ...older } = played;
        const trend = standingToward(older, partner).trend;
        expect(trend).toEqual({ start: { fromOath: false, note: RECORD_STARTS_AT_LOAD } });
    });
});
describe("a partner's share of US goods trade", () => {
    const total = foreign.reduce((sum, id) => {
        const goods = bilateralGoods(campaign, id);
        return sum + goods.imports + goods.exports;
    }, 0);
    it("is the partner's goods trade over the sum across every partner", () => {
        for (const id of ["CHN", "CAN", "MEX", "SAU"]) {
            const goods = bilateralGoods(campaign, id);
            expect(goodsTradeShare(campaign, id), id).toBeCloseTo((goods.imports + goods.exports) / total, 12);
        }
        const sum = foreign.reduce((acc, id) => acc + (goodsTradeShare(campaign, id) ?? 0), 0);
        expect(sum).toBeCloseTo(1, 9);
    });
    // The country file printed "1%" for China beside a $453.77B goods-trade
    // tile: the legacy relationship scalar, not the trade the game carries.
    it("puts China well above a legacy one percent", () => {
        expect(goodsTradeShare(campaign, "CHN")).toBeGreaterThan(0.05);
    });
    it("has no share of trade with itself", () => {
        expect(goodsTradeShare(campaign, home)).toBeUndefined();
    });
    it("totals imports and exports across every partner, from the walk the shares read", () => {
        const imports = foreign.reduce((sum, id) => sum + bilateralGoods(campaign, id).imports, 0);
        const exports = foreign.reduce((sum, id) => sum + bilateralGoods(campaign, id).exports, 0);
        const totals = goodsTradeTotals(campaign);
        expect(totals.imports).toBeCloseTo(imports, 6);
        expect(totals.exports).toBeCloseTo(exports, 6);
        expect(totals.imports + totals.exports).toBeCloseTo(total, 6);
        expect(goodsTradeTotals(campaign)).toBe(totals);
    });
});
// Every screen that draws a posture goes through the reader above. A screen
// that indexes the relationship graph itself is where the direction went wrong
// the first time, so the web app may not do it at all.
describe("the one reader", () => {
    it("is the only way a screen reaches the relationship graph", () => {
        const web = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "apps", "web", "src");
        expect(existsSync(web)).toBe(true);
        const offenders = sourceFiles(web).filter((file) => /\brelationships\s*\[/.test(readFileSync(file, "utf8")));
        expect(offenders.map((file) => relative(web, file))).toEqual([]);
    });
});
function sourceFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory())
            return sourceFiles(full);
        return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [full] : [];
    });
}
