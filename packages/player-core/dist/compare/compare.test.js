import { hasIntelOnNation, tickWeek } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { compareBenchmarks } from "./benchmarks";
import { historyOptions } from "./history";
import { COMPARE_METRICS, COMPARE_METRIC_IDS } from "./metrics";
import { peerSet, PEER_RULES } from "./peers";
import { compareSeries } from "./series";
import { selfVersus } from "./self-versus";
import { compareSnapshot, rankColumn } from "./snapshot";
const opening = openingCampaign();
const US = opening.founding.nation;
const nation = (id) => id;
const state = (id) => id;
function played(weeks) {
    return Array.from({ length: weeks }).reduce((campaign) => tickWeek(campaign), opening);
}
/** Six weeks on, with known figures written over the live ones so every gap below is arithmetic. */
const week7 = (() => {
    const campaign = played(6);
    const set = (id, economy) => {
        const runtime = campaign.nations[nation(id)];
        return [id, { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } } }];
    };
    return {
        ...campaign,
        nations: { ...campaign.nations, ...Object.fromEntries([set("USA", { unemployment: 0.05, inflation: 0.031 }), set("GBR", { unemployment: 0.04 }), set("FRA", { unemployment: 0.07 })]) },
        player: { ...campaign.player, metrics: { ...campaign.player.metrics, approval: 0.5 } },
    };
})();
const omniscient = (campaign) => ({ ...campaign, rules: { values: { "information.omniscient": true }, log: [] } });
describe("the reading registry", () => {
    it("offers a subject kind only where it carries a reader for it", () => {
        for (const id of COMPARE_METRIC_IDS) {
            const metric = COMPARE_METRICS[id];
            expect(metric.subjects.includes("nation"), id).toBe(metric.nation !== undefined);
            expect(metric.subjects.includes("state"), id).toBe(metric.state !== undefined);
            expect(metric.subjects.includes("self-at"), id).toBe(metric.course !== undefined);
            expect(metric.subjects.includes("history"), id).toBe(metric.history !== undefined);
        }
    });
});
describe("against defined benchmarks", () => {
    it("states the gap to each authored landmark in points and words", () => {
        const view = selfVersus(week7, "approval");
        expect(view.now).toBe(0.5);
        const honeymoon = view.comparisons.find((entry) => entry.label === "Typical honeymoon");
        expect(honeymoon).toMatchObject({ kind: "historical", standing: "worse", sentence: "8 points below Typical honeymoon" });
        const nixon = view.comparisons.find((entry) => entry.label === "Nixon, August 1974");
        expect(nixon.sentence).toBe("26 points above Nixon, August 1974");
    });
    it("judges a down-is-better reading the right way round, against a published target", () => {
        const fed = selfVersus(week7, "inflation").comparisons.find((entry) => entry.kind === "target");
        expect(fed).toMatchObject({ value: 0.02, standing: "worse", sentence: "1.1 points above Federal Reserve goal" });
    });
    it("gives stability its engine gate and no invented historical line", () => {
        const marks = compareBenchmarks(week7, COMPARE_METRICS.stability);
        expect(marks.map((mark) => mark.kind)).toEqual(["gate"]);
        expect(historyOptions(COMPARE_METRICS.stability)).toEqual([]);
    });
});
describe("between entities", () => {
    const snapshot = compareSnapshot(week7, ["unemployment", "growth"], [{ kind: "self" }, { kind: "nation", id: nation("GBR") }, { kind: "nation", id: nation("FRA") }]);
    it("ranks a down-is-better column with the lowest first, the President's row included", () => {
        const rank = (id) => snapshot.rows.find((row) => row.id === id).ranks.unemployment;
        expect(rank("nation:GBR")).toEqual({ rank: 1, of: 3, percentile: 1 });
        expect(rank("self")?.rank).toBe(2);
        expect(rank("nation:FRA")).toEqual({ rank: 3, of: 3, percentile: 1 / 3 });
        expect(snapshot.rows.find((row) => row.id === "self").self).toBe(true);
    });
    it("judges each column against the median of the governments beside the President", () => {
        expect(snapshot.metrics[0]).toMatchObject({ id: "unemployment", better: "down", format: "percent", benchmark: { label: "Middle value of the 2 compared" } });
        expect(snapshot.metrics[0].benchmark.value).toBeCloseTo(0.055, 10);
    });
    it("refuses an assessed reading of a government the services cannot read, and reads it in God Mode", () => {
        expect(hasIntelOnNation(week7, nation("PRK"))).toBe(false);
        const subjects = [{ kind: "self" }, { kind: "nation", id: nation("PRK") }];
        const fogged = compareSnapshot(week7, ["regimeStability", "growth"], subjects).rows[1];
        expect(fogged.values.regimeStability).toBeNull();
        expect(fogged.reasons.regimeStability).toMatch(/no read on North Korea's government/);
        expect(fogged.values.growth).not.toBeNull();
        const seen = compareSnapshot(omniscient(week7), ["regimeStability"], subjects).rows[1];
        expect(seen.values.regimeStability).toBe(week7.nations[nation("PRK")].stats.politics.regimeStability);
    });
    it("refuses a reading a foreign government does not carry, rather than inventing one", () => {
        const row = compareSnapshot(week7, ["approval"], [{ kind: "nation", id: nation("GBR") }]).rows[0];
        expect(row.values.approval).toBeNull();
        expect(row.reasons.approval).toMatch(/have approval/);
    });
    it("lists the President's government once however it is named", () => {
        const rows = compareSnapshot(week7, ["growth"], [{ kind: "self" }, { kind: "nation", id: US }]).rows;
        expect(rows.map((row) => row.id)).toEqual(["self"]);
    });
});
describe("against the President's own past", () => {
    it("draws the recorded course on the weeks it was recorded, the inherited quarter included", () => {
        const view = compareSeries(week7, "approval", [{ kind: "self" }], 10);
        expect(view.turns).toEqual([-2, -1, 0, 1, 2, 3, 4, 5, 6, 7]);
        expect(view.x.slice(2, 4)).toEqual(["1 week before the oath", "Week 1"]);
        const line = view.series[0];
        expect(line.kind).toBe("self");
        expect(line.values.at(-1)).toBe(0.5);
        expect(line.values.slice(0, -1)).toEqual(week7.player.metricHistory.slice(-9).map((snapshot) => snapshot.approval));
    });
    it("sets an earlier week as a reference line, not a course", () => {
        const view = compareSeries(week7, "approval", [{ kind: "self" }, { kind: "self-at", turn: 1 }], 4);
        expect(view.series).toHaveLength(1);
        expect(view.benchmarks.find((mark) => mark.id === "self-at:1")).toMatchObject({ label: "At the oath", value: opening.player.metrics.approval });
    });
    it("states now against the oath and against four weeks ago", () => {
        const view = selfVersus(week7, "approval");
        const oath = view.comparisons.find((entry) => entry.kind === "inauguration");
        expect(oath.value).toBe(opening.player.metrics.approval);
        expect(oath.sentence).toMatch(/^(Same as|\d+ points? (above|below)) where it was when you took office$/);
        expect(view.comparisons.find((entry) => entry.kind === "four-weeks-ago").value).toBe(week7.player.metricHistory.at(-4).approval);
    });
    it("says why a reading with no kept record has no past", () => {
        const own = selfVersus(week7, "debtToGdp").comparisons[0];
        expect(own.value).toBeUndefined();
        expect(own.sentence).toMatch(/doesn't keep a weekly record/);
        expect(compareSnapshot(week7, ["debtToGdp"], [{ kind: "self-at", turn: 3 }]).rows[0].values.debtToGdp).toBeNull();
    });
});
describe("the President against other entities over time", () => {
    const view = compareSeries(week7, "unemployment", [{ kind: "self" }, { kind: "nation", id: nation("GBR") }, { kind: "state", id: state("CA") }], 6);
    it("shows a foreign government's figure this week alone, and says it keeps no past", () => {
        const gbr = view.series.find((line) => line.id === "nation:GBR");
        expect(gbr).toMatchObject({ kind: "peer", available: true });
        expect(gbr.values.slice(0, -1).every((value) => value === null)).toBe(true);
        expect(gbr.values.at(-1)).toBe(0.04);
        expect(gbr.note).toMatch(/not earlier ones/);
    });
    it("carries a state's course through the country's recorded weeks", () => {
        const self = view.series.find((line) => line.id === "self");
        const ca = view.series.find((line) => line.id === "state:CA");
        const gap = week7.states[state("CA")].base.character.vitalAnchor.unemployment;
        self.values.forEach((value, index) => {
            if (value === null)
                expect(ca.values[index]).toBeNull();
            else
                expect(ca.values[index]).toBeCloseTo(Math.min(1, Math.max(0, value + gap)), 10);
        });
        expect(self.values.at(-1)).toBe(0.05);
    });
});
describe("against the published record", () => {
    it("lines a covered stretch up by months since the oath, and refuses one the pack does not cover", () => {
        const view = compareSeries(week7, "unemployment", [{ kind: "self" }, { kind: "history", benchmarkId: "us-record:2017-2019" }, { kind: "history", benchmarkId: "us-record:1973-1982" }], 6);
        const covered = view.series.find((line) => line.id === "history:us-record:2017-2019");
        expect(covered).toMatchObject({ kind: "history", available: true, label: "U.S. record, 2017 to 2019" });
        expect(covered.values.every((value) => value === null || (value > 0.03 && value < 0.06))).toBe(true);
        const refused = view.series.find((line) => line.id === "history:us-record:1973-1982");
        expect(refused.available).toBe(false);
        expect(refused.reason).toMatch(/outside it/);
    });
    it("keeps a published stretch as a reference row that is never ranked", () => {
        const row = compareSnapshot(week7, ["unemployment"], [{ kind: "self" }, { kind: "history", benchmarkId: "us-record:2017-2019" }]).rows[1];
        expect(row).toMatchObject({ reference: true, label: "U.S. record, 2017 to 2019 (average)" });
        expect(row.ranks.unemployment).toBeUndefined();
    });
    it("refuses a past the reading has no published scale for", () => {
        const line = compareSeries(week7, "stability", [{ kind: "history", benchmarkId: "anything" }], 4).series[0];
        expect(line.available).toBe(false);
    });
});
describe("default comparison sets", () => {
    it("draws the G7 and the neighbors from the world, never the President's own government", () => {
        expect([...peerSet(week7, "g7").nations].sort()).toEqual(["CAN", "DEU", "FRA", "GBR", "ITA", "JPN"]);
        expect([...peerSet(week7, "neighbors").nations].sort()).toEqual(["CAN", "CUB", "MEX"]);
        for (const rule of PEER_RULES) {
            const set = peerSet(week7, rule);
            expect(set.nations).not.toContain(US);
            expect(set.nations.length > 0 || set.empty !== undefined).toBe(true);
        }
    });
});
describe("reading never moves the campaign", () => {
    it("leaves every input exactly as it was", () => {
        const frozen = structuredClone(week7);
        compareSeries(week7, "unemployment", [{ kind: "self" }, { kind: "nation", id: nation("FRA") }, { kind: "history", benchmarkId: "us-record:2017-2019" }], "term");
        compareSnapshot(week7, COMPARE_METRIC_IDS, [{ kind: "self" }, { kind: "nation", id: nation("GBR") }, { kind: "state", id: state("TX") }, { kind: "self-at", turn: 2 }]);
        for (const id of COMPARE_METRIC_IDS)
            selfVersus(week7, id);
        for (const rule of PEER_RULES)
            peerSet(week7, rule);
        expect(week7).toEqual(frozen);
    });
    it("ranks ties to the better place", () => {
        expect(rankColumn([0.1, 0.1, 0.3, null], "down").map((entry) => entry?.rank)).toEqual([1, 1, 3, undefined]);
    });
});
