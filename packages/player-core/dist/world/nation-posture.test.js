import { describe, expect, it } from "vitest";
import { hasIntelOnNation, sharesCompact, signTreaty } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { standingToward } from "./standing";
import { nationPosture } from "./nation-posture";
// The world's read at founding, on the gate seed and on the three party
// fixtures' seeds: who the services read, who they cannot, and how the United
// States' adversaries open on their files.
const SEEDS = ["foreign-truth-gate", "fixture-opening-d", "fixture-opening-r", "fixture-opening-i"];
const ADVERSARIES = ["CHN", "RUS", "PRK", "IRN"];
const FIVE = [...ADVERSARIES, "CUB"];
const campaigns = SEEDS.map((seedText) => [seedText, openingCampaign({ seedText })]);
/** Give the services a collection advantage over one target without changing any compact membership. */
function withTargetRead(campaign, target) {
    const home = campaign.founding.nation;
    const ours = campaign.nations[home];
    const theirs = campaign.nations[target];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [home]: { ...ours, stats: { ...ours.stats, security: { ...ours.stats.security, intelCapability: 1 } } },
            [target]: { ...theirs, stats: { ...theirs.stats, security: { ...theirs.stats.security, counterIntel: 0 } } },
        },
    };
}
describe("what the President can read of the world at founding", () => {
    for (const [seed, campaign] of campaigns) {
        const foreign = Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
        const outside = foreign.filter((id) => !sharesCompact(campaign, id));
        it(`does not treat standing-body membership as access to private deliberations (${seed})`, () => {
            const compact = foreign.filter((id) => sharesCompact(campaign, id));
            expect(compact.length).toBeGreaterThanOrEqual(30);
            expect(sharesCompact(campaign, "GBR")).toBe(true);
            expect(hasIntelOnNation(campaign, "GBR")).toBe(false);
            expect(compact.some((id) => !hasIntelOnNation(campaign, id))).toBe(true);
        });
        it(`hides the four adversaries and at least a third of everyone else (${seed})`, () => {
            expect(ADVERSARIES.filter((id) => hasIntelOnNation(campaign, id))).toEqual([]);
            const unread = outside.filter((id) => !hasIntelOnNation(campaign, id));
            expect(unread.length / outside.length).toBeGreaterThanOrEqual(1 / 3);
        });
        it(`opens the five founding dyads as adversaries on their files (${seed})`, () => {
            for (const id of FIVE) {
                const standing = standingToward(campaign, id);
                expect(standing.tension?.word, id).not.toBe("Low");
                expect(["Wary", "Hostile"], id).toContain(standing.ours?.trust.word);
            }
            for (const id of ADVERSARIES)
                expect(["Serious", "Grave"], id).toContain(standingToward(campaign, id).threat?.word);
            expect(standingToward(campaign, "CUB").threat?.word).toBe("Low");
            const charter = worldDataset.charters.find((entry) => entry.id === campaign.nations[campaign.founding.nation].base.identity.government);
            expect(signTreaty(campaign, charter, "arms-control", "PRK").ok).toBe(false);
        });
    }
});
describe("how a government is disposed", () => {
    const campaign = campaigns[0][1];
    it("shows a read government's aims and its temperament against the world", () => {
        const reading = withTargetRead(campaign, "TUR");
        expect(hasIntelOnNation(reading, "TUR")).toBe(true);
        const posture = nationPosture(reading, "TUR");
        expect(posture.unread).toBe(false);
        expect(posture.aims.length).toBeGreaterThan(0);
        expect(posture.temperament.length).toBe(8);
        expect(posture.temperamentSource).toBeUndefined();
    });
    it("shows an unread government's published posture and nothing of how it decides", () => {
        const posture = nationPosture(campaign, "CHN");
        expect(posture.unread).toBe(true);
        expect(posture.posture.word.length).toBeGreaterThan(0);
        expect(posture.aims).toEqual([]);
        expect(posture.temperament).toEqual([]);
    });
    it("says where a fitted temperament comes from", () => {
        const foreign = Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
        const standard = foreign.find((id) => campaign.nations[id].base.fidelity === "standard");
        const thin = foreign.find((id) => campaign.nations[id].base.fidelity === "thin");
        const standardReading = withTargetRead(campaign, standard);
        const thinReading = withTargetRead(campaign, thin);
        expect(hasIntelOnNation(standardReading, standard)).toBe(true);
        expect(hasIntelOnNation(thinReading, thin)).toBe(true);
        expect(nationPosture(standardReading, standard).temperamentSource).toMatch(/estimated from how it's governed/);
        expect(nationPosture(thinReading, thin).temperamentSource).toMatch(/usual ones for countries like it in its region/);
        expect(nationPosture(thinReading, thin).temperament.length).toBe(8);
    });
    it("keeps no file on the President's own government", () => {
        expect(nationPosture(campaign, campaign.founding.nation)).toBeUndefined();
    });
});
