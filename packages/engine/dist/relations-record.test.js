import { describe, expect, it } from "vitest";
import { atCampaignTurn, buildCampaign } from "./__fixtures__/campaign.js";
import { archiveMonth } from "./economy-archive.js";
import { RELATIONS_HISTORY_WINDOW, trustCourse } from "./relations-record.js";
import { createSave, loadSave } from "./save.js";
import { relationshipKey } from "./state.js";
import { advanceTurn } from "./turn-loop.js";
const home = buildCampaign().founding.nation;
const partner = Object.keys(buildCampaign().nations).find((id) => id !== home && buildCampaign().relationships[relationshipKey(home, id)] !== undefined);
function withTrust(campaign, trust) {
    const key = relationshipKey(home, partner);
    return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key], trust } } };
}
const roundTrip = (campaign) => loadSave(JSON.parse(JSON.stringify(createSave(campaign))));
describe("the weekly trust record", () => {
    it("opens with every government and then files only the ones that moved", () => {
        const first = advanceTurn(buildCampaign());
        const opening = first.relationsRecord.weekly[0];
        expect(Object.keys(opening.ties).sort()).toEqual(Object.keys(first.nations).filter((id) => id !== home).sort());
        expect(opening.ties[partner].ours).toBeCloseTo(first.relationships[relationshipKey(home, partner)].trust, 3);
        const quiet = advanceTurn(first);
        expect(quiet.relationsRecord.weekly[1].ties).toEqual({});
        const moved = advanceTurn(withTrust(quiet, 0.61));
        expect(moved.relationsRecord.weekly[2].ties).toEqual({ [partner]: { ...opening.ties[partner], ours: 0.61 } });
    });
    it("draws a point at every recorded week, carrying a quiet week's reading forward", () => {
        const campaign = advanceTurn(withTrust(advanceTurn(advanceTurn(buildCampaign())), 0.61));
        const course = trustCourse(campaign, partner);
        expect(course.map((point) => point.turn)).toEqual([2, 3, 4]);
        expect(course[1].ours).toBe(course[0].ours);
        expect(course[2].ours).toBe(0.61);
    });
    it("says nothing of a government on a campaign that kept no record", () => {
        expect(trustCourse(buildCampaign(), partner)).toEqual([]);
    });
});
describe("a presidency longer than the weekly ring", () => {
    // Trust is moved in a week that will leave the ring, so the fold has to keep it.
    function played() {
        let campaign = buildCampaign();
        const set = new Map();
        for (let week = 0; week < RELATIONS_HISTORY_WINDOW + 40; week += 1) {
            if (week % 9 === 4) {
                const trust = Math.round((0.1 + (week % 50) / 100) * 1000) / 1000;
                campaign = withTrust(campaign, trust);
                set.set(campaign.turn + 1, trust);
            }
            campaign = advanceTurn(campaign);
        }
        return { campaign, set };
    }
    const { campaign: long, set } = played();
    it("keeps two years weekly and folds the earlier weeks to one entry a month", () => {
        const record = long.relationsRecord;
        expect(record.weekly).toHaveLength(RELATIONS_HISTORY_WINDOW);
        const months = record.monthly.map((sample) => archiveMonth(sample.turn));
        expect(new Set(months).size).toBe(months.length);
        expect(record.monthly.at(-1).turn).toBeLessThan(record.weekly[0].turn);
        expect(Object.keys(record.monthly[0].ties).length).toBe(Object.keys(long.nations).length - 1);
    });
    it("reads every point as the trust that stood at that week, months included", () => {
        const expectedAt = (turn) => [...set.entries()].filter(([at]) => at <= turn).sort((a, b) => b[0] - a[0])[0]?.[1];
        for (const point of trustCourse(long, partner)) {
            const expected = expectedAt(point.turn);
            if (expected !== undefined)
                expect(point.ours, `turn ${point.turn}`).toBe(expected);
        }
        expect(trustCourse(long, partner).at(-1).ours).toBeCloseTo(long.relationships[relationshipKey(home, partner)].trust, 3);
    });
    it("round-trips through a save without gaining or losing a week", () => {
        const loaded = roundTrip(long);
        expect(loaded.relationsRecord).toEqual(long.relationsRecord);
        expect(trustCourse(loaded, partner)).toEqual(trustCourse(long, partner));
    });
});
describe("a save written before the record", () => {
    it("opens with no record and starts it, whole, at the next close", () => {
        const { relationsRecord: _record, ...rest } = atCampaignTurn(buildCampaign(), 30);
        const opened = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 58, campaign: rest })));
        expect(opened.relationsRecord).toBeUndefined();
        const next = advanceTurn(opened);
        expect(next.relationsRecord.since).toBe(30);
        expect(trustCourse(next, partner).map((point) => point.turn)).toEqual([31]);
    });
});
