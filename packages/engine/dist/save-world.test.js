import { describe, expect, it } from "vitest";
import { STATE_IDS } from "@admin/world";
import { atCampaignTurn, buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { openConflict } from "./conflicts.js";
import { CURRENT_SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS, createSave, loadSave } from "./save.js";
import { stateApprovalSample } from "./regional-opinion.js";
import { METRIC_HISTORY_WINDOW, advanceTurn, closeWeek, defaultTurnPhases, openWeek } from "./turn-loop.js";
const ALP = nationB.id;
const roundTrip = (campaign) => loadSave(JSON.parse(JSON.stringify(createSave(campaign))));
function withWar(campaign) {
    const war = openConflict(ALP, campaign.founding.nation, 1, "A test war.");
    return { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
}
function filled(base) {
    const war = openConflict(ALP, base.founding.nation, 1, "A test war.");
    const commitment = { id: "commitment:test", location: { base: "a forward air base", theater: "SEA-western-pacific" } };
    return {
        ...base,
        nations: { ...base.nations, [ALP]: { ...base.nations[ALP], memberships: ["ORG-TEST"] } },
        conflicts: {
            [war.id]: {
                ...war,
                inherited: { asOf: base.calendar, source: "https://example.org/opened" },
                casualties: { defender: { killed: { low: 10, high: 40 }, wounded: { low: 90, high: 360 }, confidence: "low" } },
                left: [ALP],
            },
        },
        commitments: { [commitment.id]: commitment },
        markets: {
            commodities: { crude: { index: 1.2, anchorUsd: 69, cause: "a war in the Gulf" } },
            fed: { rate: 0.0375, chairTilt: 0.05, pressure: { since: base.calendar, bound: 0.1 } },
            equity: { level: 0.94, series: [1, 0.97, 0.94] },
        },
        munitions: { us: { "air-defense": { count: 0.4, onOrder: [{ arrives: base.calendar, count: 0.1 }] } }, index: { [ALP]: 0.8 } },
        foreignPolitics: {
            seats: { [ALP]: { since: base.calendar, offset: { aggression: 0.05 }, provenance: "projected" } },
            recent: [{ nation: ALP, date: base.calendar, kind: "election" }],
        },
        foreignCoverage: { [ALP]: { affinity: -0.2 } },
        engagement: { last: { [`${base.founding.nation}:${ALP}`]: base.calendar } },
        opponent: { person: "person-opponent", party: "party-rep", seededMargin: 0.02 },
        releases: { last: { jobs: base.calendar } },
    };
}
describe("the world-that-moves save", () => {
    it("is one additive version on the last, and every earlier version still reads", () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(67);
        expect(SUPPORTED_SCHEMA_VERSIONS).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67]);
    });
    it("round-trips every stored field it adds", () => {
        const campaign = filled(buildCampaign());
        const restored = roundTrip(campaign);
        for (const key of ["markets", "munitions", "foreignPolitics", "foreignCoverage", "engagement", "opponent", "releases"]) {
            expect(restored[key], key).toEqual(campaign[key]);
        }
        expect(restored.nations[ALP].memberships).toEqual(["ORG-TEST"]);
        const war = Object.values(restored.conflicts)[0];
        expect(war.inherited).toEqual({ asOf: campaign.calendar, source: "https://example.org/opened" });
        expect(war.casualties?.defender).toEqual({ killed: { low: 10, high: 40 }, wounded: { low: 90, high: 360 }, confidence: "low" });
        expect(war.left).toEqual([ALP]);
        expect(restored.commitments["commitment:test"]?.location).toEqual({ base: "a forward air base", theater: "SEA-western-pacific" });
    });
    it("leaves every field absent on a campaign that never wrote one, rather than filling an empty shape", () => {
        const restored = roundTrip(withWar(buildCampaign()));
        for (const key of ["markets", "munitions", "foreignPolitics", "foreignCoverage", "engagement", "opponent", "releases"]) {
            expect(key in restored, key).toBe(false);
        }
        expect("memberships" in restored.nations[ALP]).toBe(false);
        const war = Object.values(restored.conflicts)[0];
        expect("inherited" in war || "casualties" in war || "left" in war).toBe(false);
    });
    it("opens a v53 save on the world it was founded in: no war is carried in on the way", () => {
        const older = buildCampaign();
        const opened = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 53, campaign: older })));
        expect(opened.conflicts).toEqual(older.conflicts);
        expect(Object.values(opened.conflicts).some((war) => war.inherited !== undefined)).toBe(false);
    });
});
describe("a war saved with one band of killed and wounded", () => {
    it("opens with the band split into killed and wounded that add back to it, and loads the same twice", () => {
        const base = filled(buildCampaign());
        const war = Object.values(base.conflicts)[0];
        const legacy = { ...war, intensity: 0.5, casualties: { defender: { low: 1_000, high: 4_000, confidence: "low" } } };
        const raw = JSON.parse(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, campaign: { ...base, conflicts: { [war.id]: legacy } } }));
        const band = loadSave(raw).conflicts[war.id].casualties.defender;
        expect(band.killed.low + band.wounded.low).toBe(1_000);
        expect(band.killed.high + band.wounded.high).toBe(4_000);
        expect(band.wounded.high).toBeGreaterThan(band.killed.high);
        expect(band.confidence).toBe("low");
        expect(roundTrip(loadSave(raw)).conflicts[war.id].casualties).toEqual(loadSave(raw).conflicts[war.id].casualties);
    });
});
describe("the state-approval record (v55)", () => {
    function v54(campaign) {
        const { stateApprovalHistory: _history, ...older } = campaign;
        return JSON.parse(JSON.stringify({ schemaVersion: 54, campaign: older }));
    }
    it("opens a v54 save with an empty record rather than a reconstructed one", () => {
        const opened = loadSave(v54(atCampaignTurn(buildCampaign(), 30)));
        expect(opened.stateApprovalHistory).toEqual([]);
    });
    it("records one row a week after the load, each the map as that week opened", () => {
        const opened = loadSave(v54(atCampaignTurn(buildCampaign(), 30)));
        const once = advanceTurn(opened);
        const twice = advanceTurn(once);
        expect(twice.stateApprovalHistory.map((row) => row.turn)).toEqual([opened.turn, once.turn]);
        expect(twice.stateApprovalHistory[0]).toEqual(stateApprovalSample(opened, opened.turn));
        expect(twice.stateApprovalHistory[1]).toEqual(stateApprovalSample(once, once.turn));
        expect(Object.keys(twice.stateApprovalHistory[0].approval)).toEqual([...STATE_IDS]);
    });
    it("round-trips the record it keeps", () => {
        const kept = advanceTurn(advanceTurn(buildCampaign()));
        expect(roundTrip(kept).stateApprovalHistory).toEqual(kept.stateApprovalHistory);
    });
    it("stops at the metric window, so it lines up with the national rows", () => {
        let campaign = buildCampaign();
        for (let week = 0; week < METRIC_HISTORY_WINDOW + 3; week += 1)
            campaign = advanceTurn(campaign);
        expect(campaign.stateApprovalHistory).toHaveLength(METRIC_HISTORY_WINDOW);
        expect(campaign.stateApprovalHistory).toHaveLength(campaign.player.metricHistory.length);
    });
    it("appends nothing for a week an older build opened without a sample", () => {
        const campaign = buildCampaign();
        const { stateApproval: _sample, ...opening } = openWeek(campaign);
        const closed = closeWeek(campaign, defaultTurnPhases, opening);
        expect(closed.stateApprovalHistory).toEqual([]);
    });
});
