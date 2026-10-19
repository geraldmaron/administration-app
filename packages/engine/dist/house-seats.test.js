import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, CRADLE_POTOMAC, HOUSE_DELEGATION_TABLE, STATE_IDS, US_ID, defaultFlagDesign, worldDataset, } from "@admin/world";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { recompose } from "./elections.js";
import { apply } from "./effects.js";
import { electHouse, rosterSeats, seatLeans, seatsOfDelegation } from "./house-seats.js";
const SEED = makeCampaignSeed("house-roster-seed");
function founded(party, mandate = "narrow") {
    const pool = generateFoundingPool(SEED, worldDataset);
    const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
    const cabinet = Object.fromEntries(Object.entries(candidates).map(([role, list]) => [role, list[0].id]));
    return sealFounding(SEED, worldDataset, {
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
        mandate,
    });
}
const partySeats = (campaign) => STATE_IDS.map((id) => seatsOfDelegation(campaign.states[id].delegation.house, campaign.congress.caucusAnchor));
/** Seats that sit with a different party than they did before, counted from each state's own totals. */
function seatsMoved(before, after) {
    return before.reduce((sum, row, index) => sum + Math.max(Math.abs(row.democrat - after[index].democrat), Math.abs(row.republican - after[index].republican)), 0);
}
describe("the House opens on the Clerk's roster", () => {
    it("seats winner-take-all delegations, not a split by lean", () => {
        // The mandate that leaves each President's House nearest the roster's: the
        // founding election moves a few seats and nothing else.
        const nearest = [
            ["democrat", "popular-vote-loss"],
            ["republican", "narrow"],
            ["independent", "popular-vote-loss"],
        ];
        for (const [party, mandate] of nearest) {
            const house = partySeats(founded(party, mandate));
            const at = (state) => house[STATE_IDS.indexOf(state)];
            expect(at("ID"), party).toMatchObject({ democrat: 0, republican: 2 });
            expect(at("WV"), party).toMatchObject({ democrat: 0, republican: 2 });
            expect(at("TX").republican, party).toBeGreaterThan(at("TX").democrat);
            expect(at("MA"), party).toMatchObject({ democrat: 9, republican: 0 });
            // The share-of-lean split tied sixteen even delegations exactly in half.
            // Colorado and Minnesota are four apiece on the roster itself.
            const ties = STATE_IDS.filter((_, index) => house[index].democrat > 0 && house[index].democrat === house[index].republican);
            expect(ties, party).toEqual(["CO", "MN"]);
        }
    });
    it("takes the first seats of a small swing from the states that already send both parties", () => {
        const roster = STATE_IDS.map((id) => rosterSeats(id));
        const house = partySeats(founded("republican", "narrow"));
        const moved = STATE_IDS.filter((_, index) => house[index].democrat !== roster[index].democrat);
        expect(moved.length).toBeGreaterThan(0);
        for (const id of moved) {
            const row = roster[STATE_IDS.indexOf(id)];
            expect(row.democrat > 0 && row.republican > 0, id).toBe(true);
        }
    });
    it("moves from the roster only the seats the founding election moved, and fills the vacancies", () => {
        const campaign = founded("democrat");
        const roster = STATE_IDS.map((id) => rosterSeats(id));
        const house = partySeats(campaign);
        const rosterDemocrats = roster.reduce((sum, row) => sum + row.democrat, 0);
        const rosterRepublicans = roster.reduce((sum, row) => sum + row.republican, 0);
        const elected = house.reduce((sum, row) => sum + row.democrat, 0);
        const vacancies = HOUSE_DELEGATION_TABLE.reduce((sum, row) => sum + row.vacant + row.independent, 0);
        expect(house.reduce((sum, row) => sum + row.other, 0)).toBe(0);
        const swing = Math.abs(elected - rosterDemocrats) + Math.abs(435 - elected - rosterRepublicans);
        expect(seatsMoved(roster, house)).toBeLessThanOrEqual(swing + vacancies);
    });
});
describe("an election moves the closest seats first", () => {
    it("flips the most Republican seats Democrats hold when Republicans gain, wherever they are", () => {
        // The roster with its three open seats counted Republican, so the gain is
        // taken only from Democrats.
        const held = STATE_IDS.map((id) => {
            const row = rosterSeats(id);
            return { democrat: row.democrat, republican: row.republican + row.other, other: 0 };
        });
        const gain = 6;
        const target = {
            democrat: held.reduce((sum, row) => sum + row.democrat, 0) - gain,
            republican: held.reduce((sum, row) => sum + row.republican, 0) + gain,
        };
        const after = electHouse(held, target);
        const democraticSeats = STATE_IDS.flatMap((id, index) => seatLeans(id)
            .slice(0, held[index].democrat)
            .map((lean) => ({ state: id, lean }))).sort((a, b) => b.lean - a.lean);
        const expectedLoss = new Map();
        for (const seat of democraticSeats.slice(0, gain))
            expectedLoss.set(seat.state, (expectedLoss.get(seat.state) ?? 0) + 1);
        STATE_IDS.forEach((id, index) => {
            expect(held[index].democrat - after[index].democrat, id).toBe(expectedLoss.get(id) ?? 0);
        });
    });
    it("reads each state's seats so the roster's holders sit on their own side of even", () => {
        for (const id of STATE_IDS) {
            const row = rosterSeats(id);
            const leans = seatLeans(id);
            if (row.democrat > 0)
                expect(leans[row.democrat - 1], id).toBeLessThan(0);
            if (row.republican > 0)
                expect(leans[leans.length - row.republican], id).toBeGreaterThan(0);
        }
    });
    it("moves nothing when the chamber's counts do not change", () => {
        const campaign = founded("republican");
        const before = partySeats(campaign);
        const unchanged = recompose(campaign.congress, { house: 0, senate: 0 }, campaign.people, campaign.founding.nation, campaign.turn, campaign.states);
        const next = apply(campaign, {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            narration: { summary: "a quiet November" },
            effects: [{ kind: "congress", set: unchanged.congress }, ...unchanged.delegationEffects],
        });
        expect(partySeats(next)).toEqual(before);
    });
    it("changes exactly the seats a midterm swing names", () => {
        const campaign = founded("democrat");
        const before = partySeats(campaign);
        const swung = recompose(campaign.congress, { house: -9, senate: 0 }, campaign.people, campaign.founding.nation, campaign.turn, campaign.states);
        const next = apply(campaign, {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            narration: { summary: "midterm" },
            effects: [{ kind: "congress", set: swung.congress }, ...swung.delegationEffects],
        });
        expect(seatsMoved(before, partySeats(next))).toBe(9);
    });
});
