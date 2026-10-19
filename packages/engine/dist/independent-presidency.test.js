import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, CRADLE_POTOMAC, US_ID, defaultFlagDesign, worldDataset } from "@admin/world";
import { majorityOf, openingCongress } from "./congress.js";
import { countVote } from "./congress-votes.js";
import { electoralVotesWon } from "./states.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { INDEPENDENT_REACH, INDEPENDENT_STANDING_GAP, administrationAlignment, administrationReach, oppositionParties, sealCaucusAnchor, } from "./party.js";
import { makeCampaignSeed } from "./rng.js";
import { advanceTurn } from "./turn-loop.js";
// A presidency that belongs to neither caucus. The point of these tests is that
// it is a harder job rather than a broken one: every number below falls out of
// the alignment reading in party.ts, and none of them is a difficulty dial.
const SEED = makeCampaignSeed("independent-presidency");
function choices(party) {
    const pool = generateFoundingPool(SEED, worldDataset);
    const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
    const cabinet = Object.fromEntries(Object.entries(candidates).map(([role, list]) => [role, list[0].id]));
    return {
        nationId: US_ID,
        nationName: "United States",
        name: "Test Leader",
        title: "President",
        charterId: CHARTER_USA_CONSTITUTION.id,
        cradleId: CRADLE_POTOMAC,
        compactIds: [],
        cabinet,
        flag: defaultFlagDesign,
        leader: { ...defaultLeaderDraft(), name: "Test Leader", party },
    };
}
const founded = (party) => sealFounding(SEED, worldDataset, choices(party));
describe("an administration with no caucus", () => {
    it("seals as Independent and still opens a whole Congress", () => {
        const campaign = founded("independent");
        expect(campaign.congress.administrationParty).toBe("independent");
        expect(campaign.congress.caucusAnchor).toBe(sealCaucusAnchor("independent", campaign.founding.leader.ideology));
        for (const chamber of ["house", "senate"]) {
            const held = campaign.congress.chambers[chamber];
            expect(held.administration + held.opposition + held.independent).toBe(held.seats);
        }
        // The posts are still held: the Speaker is whoever holds the House.
        expect(campaign.congress.leadership.length).toBeGreaterThan(0);
    });
    it("faces two oppositions rather than one", () => {
        expect(oppositionParties("independent")).toEqual(["democrat", "republican"]);
        expect(oppositionParties("democrat")).toEqual(["republican"]);
    });
    it("survives a turn with every phase running", () => {
        const campaign = founded("independent");
        const after = advanceTurn(campaign);
        expect(after.turn).toBe(campaign.turn + 1);
        expect(after.congress.administrationParty).toBe("independent");
        expect(after.congress.caucusAnchor).toBe(campaign.congress.caucusAnchor);
        expect(Number.isFinite(after.congress.disposition)).toBe(true);
        for (const state of Object.values(after.states)) {
            expect(Number.isFinite(state.lean)).toBe(true);
            expect(Number.isFinite(state.delegation.disposition)).toBe(true);
        }
    });
    it("reads every lean as nearer the far caucus and further from the near one", () => {
        const partisan = { administrationParty: "democrat", caucusAnchor: "democrat" };
        const independent = { administrationParty: "independent", caucusAnchor: "democrat" };
        // A state that is wholly the anchor caucus's is only partly theirs.
        expect(administrationAlignment(-1, independent)).toBeCloseTo(INDEPENDENT_REACH - INDEPENDENT_STANDING_GAP, 10);
        expect(administrationAlignment(-1, partisan)).toBe(1);
        // And an even state is against them rather than neutral.
        expect(administrationAlignment(0, independent)).toBeCloseTo(-INDEPENDENT_STANDING_GAP, 10);
        expect(administrationAlignment(0, partisan)).toBe(0);
        expect(administrationReach("independent")).toBe(INDEPENDENT_REACH);
        expect(administrationReach("democrat")).toBe(1);
    });
});
describe("what that costs on the floor", () => {
    const nation = worldDataset.nations.find((entry) => entry.id === US_ID);
    it("needs a better-disposed chamber to carry the same bill", () => {
        const partisan = openingCongress(nation, 1, "democrat", "democrat");
        const independent = { ...openingCongress(nation, 1, "independent", "democrat") };
        const required = majorityOf(partisan.chambers.house.seats);
        const carriesAt = (congress) => {
            for (let appeal = 0; appeal <= 1; appeal = Math.round((appeal + 0.01) * 100) / 100) {
                if (countVote(congress, "house", appeal, required).passed)
                    return appeal;
            }
            return Number.POSITIVE_INFINITY;
        };
        const partisanBar = carriesAt(partisan);
        const independentBar = carriesAt(independent);
        expect(partisanBar).toBeLessThan(1);
        // Harder, and still reachable: an independent has to move the room instead
        // of having won a primary.
        expect(independentBar).toBeGreaterThan(partisanBar);
        expect(independentBar).toBeLessThan(1);
    });
    it("opens with no coattails, so the chamber owes them nothing for winning", () => {
        const partisan = openingCongress(nation, 1, "democrat", "democrat");
        const independent = openingCongress(nation, 1, "independent", "democrat");
        const legitimacy = nation.stats.politics.legitimacy;
        if (legitimacy > 0.5) {
            expect(independent.chambers.house.administration).toBeLessThan(partisan.chambers.house.administration);
        }
        else {
            expect(independent.chambers.house.administration).toBeGreaterThanOrEqual(partisan.chambers.house.administration);
        }
    });
});
describe("the road to 270", () => {
    it("follows the country's own count, so a clear majority carries the map and a minority does not", () => {
        const campaign = founded("independent");
        const independent = campaign.congress;
        // The popular vote is the states added up: a map that gave a 53% national
        // vote no state was a second penalty on top of the count, not a result.
        expect(electoralVotesWon(campaign, 0.53, independent)).toBeGreaterThanOrEqual(270);
        expect(electoralVotesWon(campaign, 0.47, independent)).toBeLessThan(270);
        expect(electoralVotesWon(campaign, 1, independent)).toBeGreaterThan(electoralVotesWon(campaign, 0.5, independent));
        expect(electoralVotesWon(campaign, 0, independent)).toBe(0);
    });
});
