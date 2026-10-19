import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, US_ID, WHITE_HOUSE_STAFF_ROLE_IDS, worldDataset, } from "@admin/world";
import { foundedForBalance, HARNESS_PRESIDENTS } from "./balance-harness.js";
import { crossesTheAisle } from "./cast-fit.js";
import { POLITICAL_OFFICE_INSTITUTIONS } from "./career-incumbents.js";
import { selectActing } from "./appointments.js";
import { institutionDef } from "./institutions.js";
import { castRejections, resolveFoundingCast } from "./founding-cast.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, validateFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { STAFF_BENCH_ROLES, staffCandidates } from "./white-house.js";
import { runningMateCandidates, vicePresidentLiaison } from "./vice-president.js";
import { breakSenateTie } from "./senate-tie.js";
import { chamberDisposition, SENATE_LIAISON_BOUND, senateLiaison } from "./hill.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
const PARTIES = ["democrat", "republican", "independent"];
/**
 * The political appointments the founding makes on the President's behalf: the
 * running mate and the three staff posts. The cabinet is the player's own
 * choice, and a cross-party secretary is one they may make on purpose. The four
 * political offices below the cabinet open under a career acting instead,
 * waiting on the President's nominations.
 */
function politicalOffices(campaign) {
    const staff = Object.entries(campaign.founding.staff ?? {});
    return [...(campaign.vicePresident ? [["vice-president", campaign.vicePresident]] : []), ...staff];
}
describe("the offices a President fills with their own side, and the four waiting on the Senate", () => {
    for (const party of PARTIES) {
        for (const seed of ["cast-a", "cast-b", "cast-c", "cast-d", "cast-e"]) {
            it(`are held by nobody from across the aisle at the oath (${party}, ${seed})`, () => {
                const { campaign } = foundedForBalance(seed, party);
                const president = { party, ideology: HARNESS_PRESIDENTS[party] };
                const offices = politicalOffices(campaign);
                expect(offices.length).toBe(1 + 3);
                for (const id of POLITICAL_OFFICE_INSTITUTIONS) {
                    const office = campaign.institutions[id];
                    expect(office.leader, id).toBeUndefined();
                    expect(office.vacancy, id).toBe(true);
                    expect(office.actingLeader, id).toBeDefined();
                    expect(selectActing(campaign, institutionDef(id).offices[0].id), id).toBe(office.actingLeader);
                }
                for (const [office, person] of offices) {
                    const holder = campaign.people[person].base;
                    expect(crossesTheAisle(holder, president), `${office}: ${holder.name} (${holder.party})`).toBe(false);
                }
                // A party President's default cabinet is their own party too, because
                // every shortlist leads with it.
                if (party === "independent")
                    return;
                for (const [role, person] of Object.entries(campaign.player.cabinet)) {
                    if (role === campaign.founding.leadRole)
                        continue;
                    const holder = campaign.people[person].base;
                    expect(crossesTheAisle(holder, president), `${role}: ${holder.name}`).toBe(false);
                }
            });
        }
    }
});
describe("the White House staff", () => {
    it("fills every post, each from the part of the cast that post comes from", () => {
        const { campaign } = foundedForBalance("staff-benches");
        for (const post of WHITE_HOUSE_STAFF_ROLE_IDS) {
            const id = campaign.founding.staff?.[post];
            expect(id, post).toBeDefined();
            const holder = campaign.people[id];
            expect(holder.currentRole).toBe(post);
            expect(holder.base.eligibleRoles.some((role) => STAFF_BENCH_ROLES[post].includes(role)), post).toBe(true);
        }
        expect(campaign.institutions["INST-PRESIDENCY"].leader).toBe(campaign.founding.staff?.["role-chief-of-staff"]);
        expect(campaign.institutions["INST-NSC"].leader).toBe(campaign.founding.staff?.["role-national-security-adviser"]);
    });
    it("takes the player's own pick for a post and fills only what they left open", () => {
        const seed = makeCampaignSeed("staff-pick");
        const pool = generateFoundingPool(seed, worldDataset);
        const president = { party: "democrat", ideology: HARNESS_PRESIDENTS.democrat };
        const second = staffCandidates(pool, US_ID, president, "role-press-secretary")[1].person.id;
        const cast = resolveFoundingCast(pool, US_ID, { ...president, age: 60 }, {
            cabinet: {},
            staff: { "role-press-secretary": second },
        });
        expect(cast.staff["role-press-secretary"]).toBe(second);
        expect(cast.staff["role-chief-of-staff"]).toBeDefined();
        expect(cast.runningMate).toBeDefined();
        expect(new Set([cast.runningMate, ...Object.values(cast.staff)]).size).toBe(4);
    });
});
describe("what the founding refuses about the ticket and the staff", () => {
    const seed = makeCampaignSeed("cast-refusals");
    const pool = generateFoundingPool(seed, worldDataset);
    const president = { party: "democrat", ideology: HARNESS_PRESIDENTS.democrat };
    const republicans = { party: "republican", ideology: HARNESS_PRESIDENTS.republican };
    const leader = { ...defaultLeaderDraft(), name: "Test Leader", ideology: HARNESS_PRESIDENTS.democrat };
    const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool, president)).map(([role, list]) => [
        role,
        list[0].id,
    ]));
    it("refuses a running mate from the other party", () => {
        const rival = runningMateCandidates(pool, US_ID, { ...republicans, age: 60 })[0].person.id;
        const refused = castRejections(pool, US_ID, president, { cabinet, runningMate: rival });
        expect(refused.map((rejection) => rejection.subject)).toContain("runningMate");
        expect(validateFounding(worldDataset, { cabinet, leader, runningMate: rival }, pool).ok).toBe(false);
    });
    it("refuses a chief of staff from across the aisle, or from a bench the post is not drawn from", () => {
        const rival = staffCandidates(pool, US_ID, republicans, "role-chief-of-staff")[0].person.id;
        const journalist = staffCandidates(pool, US_ID, president, "role-press-secretary")[0].person.id;
        const refused = castRejections(pool, US_ID, president, { cabinet, staff: { "role-chief-of-staff": rival } });
        expect(refused.map((rejection) => rejection.subject)).toEqual(["role-chief-of-staff"]);
        const misplaced = castRejections(pool, US_ID, president, { cabinet, staff: { "role-chief-of-staff": journalist } });
        expect(misplaced.map((rejection) => rejection.subject)).toEqual(["role-chief-of-staff"]);
    });
    it("refuses one person named for two posts, on the second", () => {
        const treasury = cabinet["role-treasury-minister"];
        const refused = castRejections(pool, US_ID, president, {
            cabinet,
            staff: { "role-national-security-adviser": treasury },
        });
        expect(refused.map((rejection) => rejection.subject)).toContain("role-national-security-adviser");
        for (const rejection of refused)
            expect(rejection.explanation).not.toMatch(/error|invalid|undefined/i);
    });
});
// The running mate and the three West Wing posts are named, ranked and seated.
// The Chief of Staff is read every week: their hold on the building is a share
// of each Secretary's break rate and of what a break costs (cabinet.ts), and
// the order the Desk hears the departments in. The running mate presides over
// the Senate with a liaison term every Senate count reads, and moves the
// country only in a half year in which the Senate counts something; on this
// seed, with nobody sent up, it does not, and the pin stays until one does.
describe("what the ticket and the West Wing reach once the oath is taken", () => {
    const seed = makeCampaignSeed("reach");
    const bench = generateFoundingPool(seed, worldDataset);
    const leader = { ...defaultLeaderDraft(), name: "Reach President", age: 60 };
    const president = { party: leader.party, ideology: leader.ideology, age: leader.age };
    const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, bench, president)).map(([role, list]) => [role, list[0].id]));
    const placed = new Set(Object.values(cabinet).map(String));
    const lastFree = (ids) => [...ids].reverse().find((id) => !placed.has(id));
    const phases = campaignTurnPhases(CHARTER_USA_CONSTITUTION);
    const HALF_YEAR = 26;
    const outcome = (extra) => {
        let campaign = sealFounding(seed, worldDataset, { cabinet, leader, ...extra });
        for (let week = 0; week < HALF_YEAR; week += 1)
            campaign = advanceTurn(campaign, phases);
        return JSON.stringify({ metrics: campaign.player.metrics, opinion: campaign.player.opinion, feed: campaign.feed.length, ledger: campaign.ledger.length });
    };
    const defaults = outcome({});
    const staff = Object.fromEntries(WHITE_HOUSE_STAFF_ROLE_IDS.map((post) => [post, lastFree(staffCandidates(bench, US_ID, president, post).map((candidate) => candidate.person.id))]));
    const runningMate = lastFree(runningMateCandidates(bench, US_ID, president).map((candidate) => candidate.person.id));
    // Without this, a seal that refused the swap would pass the pins below for the wrong reason.
    it("seals the swapped staff and running mate, so the pins compare choices that were really made", () => {
        const sealed = sealFounding(seed, worldDataset, { cabinet, leader, staff });
        expect(sealed.founding.staff).toEqual(staff);
        expect(sealFounding(seed, worldDataset, { cabinet, leader, runningMate }).vicePresident).toBe(runningMate);
        expect(Object.values(staff)).not.toEqual(Object.values(sealFounding(seed, worldDataset, { cabinet, leader }).founding.staff ?? {}));
    });
    it("moves the country when the staff are swapped for the last names on their lists", () => {
        expect(outcome({ staff })).not.toBe(defaults);
    }, 60_000);
    // A running mate does next to nothing to a quiet half-year, and a model that
    // made the pick move national metrics on its own would be the unrealistic one.
    // What the ticket has to be is read where a Vice President acts: the Senate's
    // chair, which breaks a 50-50 simple majority and carries a small liaison term
    // into every Senate count, and the office first in the line of succession.
    it("reads the running mate where a Vice President acts: the tie, the Senate's count, the succession", () => {
        const tied = { chamber: "senate", yeas: 50, nays: 50, required: 51, passed: false };
        for (const choice of [{}, { runningMate }]) {
            const sealed = sealFounding(seed, worldDataset, { cabinet, leader, ...choice });
            const mate = sealed.vicePresident;
            if ("runningMate" in choice)
                expect(mate).toBe(runningMate);
            const broken = breakSenateTie(sealed.congress, tied);
            expect(broken.passed).toBe(true);
            expect(broken.tieBrokenBy).toBe(mate);
            const { presidingOfficer: _chair, ...emptyChair } = sealed.congress;
            const liaison = senateLiaison(sealed.congress);
            expect(liaison).toBeCloseTo(Math.max(-SENATE_LIAISON_BOUND, Math.min(SENATE_LIAISON_BOUND, vicePresidentLiaison(sealed, mate))), 6);
            expect(chamberDisposition(sealed.congress, "senate", undefined, sealed.people) - chamberDisposition(emptyChair, "senate", undefined, sealed.people)).toBeCloseTo(liaison, 2);
            expect(sealed.institutions[VICE_PRESIDENCY_INSTITUTION_ID]?.leader).toBe(mate);
        }
    }, 60_000);
});
