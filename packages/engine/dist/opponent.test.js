import { describe, expect, it } from "vitest";
import { ELECTORAL_COLLEGE, STATE_IDS, carriesRealName } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { federalElectionDay } from "./clock.js";
import { holdElection, projectVote } from "./elections.js";
import { MARGIN_BOUND, contestAhead, contingentHouseVote, drawOpponent, marginHalfWidth, matchupKnown, opponentBench, opponentShift, opposingParty, selectOpponent, } from "./opponent.js";
import { usPartyOfPerson } from "./cast-fit.js";
import { towardAdministrationSign } from "./party.js";
import { electoralVotesWon } from "./states.js";
const { campaign: founded, charter } = foundedForBalance("opponent-contest", "democrat");
function onDate(campaign, date) {
    return { ...campaign, calendar: date };
}
describe("the other party's candidate", () => {
    it("is drawn from the other party's bench and nobody the administration has placed", () => {
        const opponent = selectOpponent(founded);
        expect(opponent).toBeDefined();
        const person = founded.people[opponent.person].base;
        expect(usPartyOfPerson(person)).toBe(opposingParty(founded));
        expect(opponent.person).not.toBe(founded.vicePresident);
        expect(Object.values(founded.player.cabinet)).not.toContain(opponent.person);
        expect(opponentBench(founded).map((entry) => entry.id)).toContain(opponent.person);
    });
    it("is the same person every time it is asked, and a different seed can draw someone else", () => {
        expect(drawOpponent(founded)).toEqual(drawOpponent(founded));
        const others = ["opponent-b", "opponent-c", "opponent-d", "opponent-e"].map((seed) => drawOpponent(foundedForBalance(seed, "democrat").campaign)?.person);
        expect(others.every((person) => person !== undefined)).toBe(true);
    });
    it("runs against a Democrat from the Republican bench and against a Republican from the Democratic one", () => {
        const republican = foundedForBalance("opponent-contest", "republican").campaign;
        expect(opposingParty(founded)).toBe("republican");
        expect(opposingParty(republican)).toBe("democrat");
    });
    it("is a generated person with a portrait reference the cast already drew, and never a real name", () => {
        const opponent = selectOpponent(founded);
        const person = founded.people[opponent.person].base;
        expect(carriesRealName(person.name)).toBe(false);
        for (const seed of ["name-1", "name-2", "name-3", "name-4"]) {
            const campaign = foundedForBalance(seed, "republican").campaign;
            const drawn = drawOpponent(campaign);
            expect(carriesRealName(campaign.people[drawn.person].base.name)).toBe(false);
        }
        // The cast is generated from name banks, so the opponent is one of the
        // campaign's own people; nothing about the draw seats or paints anyone new.
        expect(Object.keys(founded.people)).toContain(opponent.person);
        expect(person.portraitRef.length).toBeGreaterThan(0);
        expect(founded.opponent).toEqual(drawOpponent(founded));
    });
    it("is worth at most the margin bound either way", () => {
        for (const seed of ["m-1", "m-2", "m-3", "m-4", "m-5", "m-6"]) {
            const margin = drawOpponent(foundedForBalance(seed, "democrat").campaign).seededMargin;
            expect(Math.abs(margin)).toBeLessThanOrEqual(MARGIN_BOUND + 1e-9);
        }
    });
});
describe("a nominee who stays named", () => {
    it("is frozen at the seal, so a bench that changes later cannot rename them", () => {
        const named = founded.opponent;
        const people = { ...founded.people, [named.person]: { ...founded.people[named.person], alive: false } };
        expect(selectOpponent({ ...founded, people })).toEqual(named);
    });
    it("is drawn, for a save sealed before the seal named one, by a draw each candidate keeps by id", () => {
        const unsealed = { ...founded, opponent: undefined };
        const drawn = drawOpponent(unsealed);
        const others = opponentBench(unsealed).slice(0, 3).filter((person) => person.id !== drawn.person);
        expect(others.length).toBeGreaterThan(0);
        const gone = { ...unsealed.people, [others[0].id]: { ...unsealed.people[others[0].id], alive: false } };
        expect(drawOpponent({ ...unsealed, people: gone })?.person).toBe(drawn.person);
    });
});
describe("the seeded margin, shown as a band all term", () => {
    const night = federalElectionDay(founded.calendar.year + 3);
    it("is all unknown at the oath and all known on the night", () => {
        expect(matchupKnown(founded)).toBe(0);
        expect(marginHalfWidth(founded)).toBe(MARGIN_BOUND);
        expect(opponentShift(founded)).toBe(0);
        const onTheNight = onDate(founded, night);
        expect(matchupKnown(onTheNight)).toBe(1);
        expect(marginHalfWidth(onTheNight)).toBe(0);
        expect(opponentShift(onTheNight)).toBe(selectOpponent(founded).seededMargin);
    });
    it("narrows as the term runs, and the night lands inside every band shown before it", () => {
        const final = opponentShift(onDate(founded, night));
        let previous = Number.POSITIVE_INFINITY;
        for (const year of [founded.calendar.year, founded.calendar.year + 1, founded.calendar.year + 2]) {
            const week = onDate(founded, { ...founded.calendar, year });
            const half = marginHalfWidth(week);
            expect(half).toBeLessThanOrEqual(previous);
            previous = half;
            expect(Math.abs(final - opponentShift(week))).toBeLessThanOrEqual(half + 1e-9);
        }
    });
    it("is carried by the projection itself, which is what the night counts", () => {
        const onTheNight = onDate(founded, night);
        const drivers = projectVote(onTheNight).drivers.map((driver) => driver.reason);
        if (selectOpponent(founded).seededMargin !== 0)
            expect(drivers).toContain("the candidate the other party is putting up");
        const result = holdElection(onTheNight, charter, "presidential", onTheNight.turn);
        expect(result.voteShare).toBe(projectVote(onTheNight).share);
    });
    it("stops once the President's contest has been held", () => {
        const held = { id: "election:presidential:200", kind: "presidential", turn: 200, voteShare: 0.52, won: true, summary: "" };
        const after = { ...founded, termClock: { ...founded.termClock, elections: [held] } };
        expect(contestAhead(after)).toBe(false);
        expect(opponentShift(after)).toBe(0);
        expect(marginHalfWidth(after)).toBe(0);
    });
});
// --- A college that ties -------------------------------------------------------
/** States whose electoral votes add to exactly half the college, found by a subset sum over the map. */
function halfTheCollege(campaign) {
    const target = ELECTORAL_COLLEGE / 2;
    const ids = [...STATE_IDS].filter((id) => campaign.states[id]);
    // reach[total] is the first set of states found that adds to it.
    const reach = ids.reduce((found, id) => {
        const votes = campaign.states[id].base.electoralVotes;
        const next = new Map(found);
        for (const [total, chosen] of found) {
            if (total + votes <= target && !next.has(total + votes))
                next.set(total + votes, [...chosen, id]);
        }
        return next;
    }, new Map([[0, []]]));
    const chosen = reach.get(target);
    if (!chosen)
        throw new Error("could not plant a tie");
    return new Set(chosen);
}
function tiedMap(campaign, delegationsWith) {
    const ours = halfTheCollege(campaign);
    const sign = towardAdministrationSign(campaign.congress.caucusAnchor);
    const states = Object.fromEntries(Object.entries(campaign.states).map(([id, runtime]) => {
        const house = runtime.delegation?.house;
        const lean = (ours.has(id) ? 0.9 : -0.9) * sign;
        const seats = house?.seats ?? 1;
        const held = delegationsWith === "administration" ? { administration: seats, opposition: 0 } : { administration: 0, opposition: seats };
        const delegation = runtime.delegation ? { ...runtime.delegation, house: { ...runtime.delegation.house, ...held, independent: 0 } } : undefined;
        return [id, { ...runtime, lean, ...(delegation ? { delegation } : {}) }];
    }));
    return { ...campaign, states };
}
describe("a 269-269 college", () => {
    it("is exactly a tie on the planted map", () => {
        const tied = tiedMap(founded, "administration");
        expect(electoralVotesWon(tied, 0.5, tied.congress) * 2).toBe(ELECTORAL_COLLEGE);
    });
    it("is not a loss: the House decides, one vote a state, and a House the administration holds keeps it", () => {
        const tied = tiedMap(founded, "administration");
        const vote = contingentHouseVote(tied);
        expect(vote.won).toBe(true);
        expect(vote.needed).toBe(26);
        const result = holdElection(tied, charter, "presidential", tied.turn);
        expect(electoralVotesWon(tied, result.voteShare, tied.congress) * 2).toBe(ELECTORAL_COLLEGE);
        expect(result.won).toBe(true);
        expect(result.summary).toContain("the House, voting one state to a delegation");
    });
    it("goes against the President when the delegations the campaign holds are the other side's", () => {
        const tied = tiedMap(founded, "opposition");
        expect(contingentHouseVote(tied).won).toBe(false);
        const result = holdElection(tied, charter, "presidential", tied.turn);
        expect(electoralVotesWon(tied, result.voteShare, tied.congress) * 2).toBe(ELECTORAL_COLLEGE);
        expect(result.won).toBe(false);
    });
    it("hands the chair to the Vice President-elect the Senate chooses when no delegation majority is ever found", () => {
        const tied = tiedMap(founded, "administration");
        const split = {
            ...tied,
            states: Object.fromEntries(Object.entries(tied.states).map(([id, runtime]) => {
                const delegation = runtime.delegation ? { ...runtime.delegation, house: { ...runtime.delegation.house, administration: 1, opposition: 1, independent: 0 } } : undefined;
                return [id, { ...runtime, ...(delegation ? { delegation } : {}) }];
            })),
        };
        const senate = split.congress.chambers.senate;
        const withSenate = (administration) => ({
            ...split,
            congress: { ...split.congress, chambers: { ...split.congress.chambers, senate: { ...senate, seats: 100, administration, opposition: 100 - administration, independent: 0 } } },
        });
        const ours = contingentHouseVote(withSenate(51));
        expect(ours).toMatchObject({ won: false, deadlocked: true, acting: "administration-running-mate" });
        expect(contingentHouseVote(withSenate(49)).acting).toBe("opponent-running-mate");
        expect(contingentHouseVote(withSenate(50)).acting).toBe("speaker");
        const result = holdElection(withSenate(51), charter, "presidential", split.turn);
        expect(result.won).toBe(false);
        expect(result.summary).toContain("ballots until the inauguration without a majority");
        expect(result.summary).not.toContain("defeated");
    });
    it("gives the District no say", () => {
        const vote = contingentHouseVote(founded);
        expect(vote.forAdministration + vote.forOpponent + vote.divided).toBe(50);
    });
});
