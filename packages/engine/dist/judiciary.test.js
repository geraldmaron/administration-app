import { describe, expect, it } from "vitest";
import { CABINET_ROLES, CHARTER_PRESIDENTIAL_REPUBLIC, Person } from "@admin/world";
import { buildCampaign, person, withWeeksElapsed } from "./__fixtures__/campaign.js";
import { benchMembersForReview, judiciaryBenchSeats, JUDICIARY_SEAT_COUNT, JUDICIARY_SEAT_INSTITUTIONS, seatFoundingJustices, selectJudiciaryBench, } from "./judiciary.js";
import { foundingInstitutions } from "./institutions.js";
import { executiveOrder } from "./orders.js";
import { openNomination, nominationPhase } from "./nomination.js";
import { selectActiveNominations } from "./nomination-stages.js";
import { apply } from "./effects.js";
import { strikeDownChance } from "./strike-odds.js";
const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;
function benchCampaign(scores) {
    const base = buildCampaign();
    const people = Object.fromEntries(scores.map((integrity, index) => {
        const id = `bench-engine-${index}`;
        const runtime = {
            base: Person.parse({
                ...person,
                id: id,
                name: `Justice ${index}`,
                eligibleRoles: ["role-journalist"],
                integrity,
                competence: integrity,
                ideology: { economicLeftRight: index * 0.1 - 0.4, authLibertarian: 0, nationalistGlobalist: 0 },
            }),
            alive: true,
        };
        return [id, runtime];
    }));
    return { ...base, people };
}
describe("selectJudiciaryBench", () => {
    it("returns up to nine seats ranked by integrity and competence", () => {
        const campaign = buildCampaign();
        const bench = selectJudiciaryBench(campaign);
        expect(bench.seats.length).toBeLessThanOrEqual(JUDICIARY_SEAT_COUNT);
        expect(bench.chiefJustice).toBe(bench.seats[0]);
    });
    it("excludes anyone eligible for a cabinet role", () => {
        const campaign = buildCampaign();
        const seated = new Set(selectJudiciaryBench(campaign).seats);
        const cabinetEligible = Object.values(campaign.people).filter((runtime) => runtime.base.eligibleRoles.some((role) => CABINET_ROLES.includes(role)));
        for (const runtime of cabinetEligible) {
            expect(seated.has(runtime.base.id)).toBe(false);
        }
    });
    it("is deterministic and unaffected by cabinet occupancy", () => {
        const campaign = buildCampaign();
        const before = selectJudiciaryBench(campaign).seats;
        const emptied = { ...campaign, player: { ...campaign.player, cabinet: {} } };
        expect(selectJudiciaryBench(emptied).seats).toEqual(before);
        expect(judiciaryBenchSeats(campaign).flatMap((seat) => (seat.personId ? [seat.personId] : []))).toEqual(before);
    });
    it("seats only the country's own nationals", () => {
        // The pool is every person in the world. Unfiltered, the nine highest
        // integrity-and-competence people anywhere took the seats, and the United
        // States Supreme Court was seated with foreign nationals.
        const campaign = buildCampaign();
        const bench = selectJudiciaryBench(campaign);
        for (const personId of bench.seats) {
            const runtime = campaign.people[personId];
            expect(runtime, "a seated justice is somebody the campaign carries").toBeDefined();
            expect(runtime.base.nationality).toBe(campaign.founding.nation);
        }
    });
    it("breaks score ties by person id", () => {
        const tied = benchCampaign(Array(12).fill(0.7));
        const first = selectJudiciaryBench(tied).seats;
        const second = selectJudiciaryBench(tied).seats;
        expect(first).toEqual(second);
        expect(first).toEqual([...first].sort());
    });
});
describe("strikeDownChance with bench", () => {
    it("stays within the judicial uncertainty band", () => {
        const construction = executiveOrder("order-emergency-construction");
        const controls = executiveOrder("order-border-controls");
        const bench = benchMembersForReview(buildCampaign());
        for (const order of [construction, controls]) {
            const chance = strikeDownChance(CHARTER, order, bench);
            expect(chance).toBeGreaterThanOrEqual(0.05);
            expect(chance).toBeLessThanOrEqual(0.9);
        }
    });
    it("weighs a farther bench median differently from an aligned one", () => {
        const order = executiveOrder("order-emergency-construction");
        const aligned = benchMembersForReview(benchCampaign([0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4]));
        const offsetCampaign = benchCampaign([0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4]);
        const offsetPeople = Object.fromEntries(Object.entries(offsetCampaign.people).map(([id, runtime], index) => [
            id,
            {
                ...runtime,
                base: Person.parse({
                    ...runtime.base,
                    ideology: {
                        economicLeftRight: index * 0.2 - 0.8,
                        authLibertarian: 0.4,
                        nationalistGlobalist: 0.2,
                    },
                }),
            },
        ]));
        const offset = benchMembersForReview({ ...offsetCampaign, people: offsetPeople });
        expect(strikeDownChance(CHARTER, order, aligned)).not.toBe(strikeDownChance(CHARTER, order, offset));
    });
});
// --- The stored bench --------------------------------------------------------
//
// A campaign that has never seated anyone through the nine seat institutions
// reads the fallback above, unchanged — every test up to this point is that
// campaign. Once at least one seat has a stored occupant, `resolvedSeats`
// switches to reading the other eight off their own institutions too, and
// that is the behavior these cases prove: a seat's occupant is fixed to
// whoever was actually confirmed to it, not to whoever currently ranks best.
function justice(id, overrides = {}) {
    return Person.parse({
        ...person,
        ...overrides,
        id: id,
        name: overrides.name ?? `Justice ${id}`,
        eligibleRoles: overrides.eligibleRoles ?? ["role-journalist"],
    });
}
/**
 * A campaign whose bench is read off the stored seat institutions: each
 * `seats` entry assigns a person (already dropped into `campaign.people`) to
 * that seat number (1 is the Chief Justice's).
 */
function seatedCampaign(seats) {
    const base = buildCampaign();
    const people = { ...base.people };
    const institutions = { ...base.institutions };
    for (const [seatNumber, seatPerson] of Object.entries(seats)) {
        const institutionId = JUDICIARY_SEAT_INSTITUTIONS[Number(seatNumber) - 1];
        people[seatPerson.id] = { base: seatPerson, alive: true };
        institutions[institutionId] = { ...institutions[institutionId], leader: seatPerson.id, vacancy: false };
    }
    return { ...base, people, institutions };
}
describe("the bench is stored, not re-derived", () => {
    it("keeps a seat's occupant fixed even once a far stronger candidate exists in the cast", () => {
        const incumbent = justice("seat-3-incumbent", { integrity: 0.5, competence: 0.5 });
        let campaign = seatedCampaign({ 3: incumbent });
        expect(judiciaryBenchSeats(campaign)[2].personId).toBe(incumbent.id);
        // The exact shape of person the old live derivation would have promoted
        // into seat 3 the moment it appeared in the cast.
        const outsider = justice("outsider", { integrity: 0.99, competence: 0.99 });
        campaign = { ...campaign, people: { ...campaign.people, [outsider.id]: { base: outsider, alive: true } } };
        expect(judiciaryBenchSeats(campaign)[2].personId).toBe(incumbent.id);
        expect(selectJudiciaryBench(campaign).seats).not.toContain(outsider.id);
    });
    it("reports an unfilled seat vacant even though qualified nationals exist to fill it", () => {
        // Structurally unreachable under the old live derivation: as long as nine
        // qualifying nationals existed anywhere in the cast, every seat always
        // read filled. A stored seat can be honestly empty.
        const campaign = seatedCampaign({ 1: justice("chief") });
        const seats = judiciaryBenchSeats(campaign);
        expect(seats[0].vacant).toBe(false);
        expect(seats[1].vacant).toBe(true);
        expect(seats[1].personId).toBeUndefined();
        expect(seats[1].name).toBe("Vacant seat");
    });
    it("leaves a dead justice's seat vacant across turns, promoting nobody into it", () => {
        const departed = justice("seat-5-departed", { integrity: 0.8, competence: 0.8 });
        let campaign = seatedCampaign({ 5: departed });
        campaign = { ...campaign, people: { ...campaign.people, [departed.id]: { base: departed, alive: false } } };
        for (let turn = 0; turn < 10; turn += 1) {
            const seat = judiciaryBenchSeats(campaign)[4];
            expect(seat.vacant).toBe(true);
            expect(seat.personId).toBeUndefined();
            campaign = withWeeksElapsed(campaign, 1);
            for (const packet of nominationPhase(campaign))
                campaign = apply(campaign, packet);
        }
    });
    it("fills a vacant seat only once the Senate confirms it — the same stage a cabinet chair fills at — and only then", () => {
        // Seat 9 anchors the campaign onto the stored schema; seat 7 is the one
        // under test and starts genuinely unfilled.
        let campaign = seatedCampaign({ 9: justice("anchor") });
        campaign = { ...campaign, congress: { ...campaign.congress, disposition: 0.9 } };
        const nominee = justice("new-justice", {
            integrity: 0.9,
            competence: 0.9,
            ambition: 0.3,
            ideology: { economicLeftRight: 0.6, authLibertarian: 0, nationalistGlobalist: 0 },
        });
        campaign = { ...campaign, people: { ...campaign.people, [nominee.id]: { base: nominee, alive: true } } };
        const opened = openNomination(campaign, "OFF-SCOTUS-SEAT-7", nominee.id);
        expect(opened.ok).toBe(true);
        if (!opened.ok)
            return;
        campaign = apply(campaign, opened.packet);
        // The pipeline seats an officer at "confirmed" and treats "sworn-in" as
        // the terminal formality seven days later — the same writer, unedited,
        // that already fills a cabinet chair (see nomination.test.ts's
        // "confirmation seats somebody"). A judicial seat is modeled on that
        // exact mechanism, so it fills on the identical stage.
        let turns = 0;
        while (selectActiveNominations(campaign).length > 0 && turns < 80) {
            const nomination = Object.values(campaign.nominations)[0];
            const stillPending = nomination.stage !== "confirmed" && nomination.stage !== "sworn-in";
            expect(judiciaryBenchSeats(campaign)[6].vacant, `stage ${nomination.stage} at turn ${turns}`).toBe(stillPending);
            campaign = withWeeksElapsed(campaign, 1);
            for (const packet of nominationPhase(campaign))
                campaign = apply(campaign, packet);
            turns += 1;
        }
        expect(Object.values(campaign.nominations)[0].stage).toBe("sworn-in");
        const seat = judiciaryBenchSeats(campaign)[6];
        expect(seat.vacant).toBe(false);
        expect(seat.personId).toBe(nominee.id);
        expect(benchMembersForReview(campaign).some((member) => member.ideology.economicLeftRight === 0.6)).toBe(true);
    });
});
describe("seatFoundingJustices", () => {
    function candidatePool() {
        const justices = Array.from({ length: 9 }, (_, index) => justice(`pool-justice-${index}`, { integrity: 0.9 - index * 0.01, competence: 0.9 - index * 0.01 }));
        const cabinetMaterial = justice("pool-cabinet-material", {
            integrity: 0.99,
            competence: 0.99,
            eligibleRoles: ["role-defense-minister"],
        });
        return Object.fromEntries([...justices, cabinetMaterial].map((base) => [base.id, { base, alive: true }]));
    }
    it("seats the nine best-ranked non-cabinet-eligible nationals into the nine seat institutions", () => {
        const people = candidatePool();
        const seated = seatFoundingJustices(people, foundingInstitutions(), "USA");
        for (let index = 0; index < JUDICIARY_SEAT_COUNT; index += 1) {
            const institutionId = JUDICIARY_SEAT_INSTITUTIONS[index];
            expect(seated.institutions[institutionId].leader).toBe(`pool-justice-${index}`);
            expect(seated.institutions[institutionId].vacancy).toBe(false);
            expect(seated.people[`pool-justice-${index}`].currentRole).toBeDefined();
        }
        // The cabinet-eligible candidate outscores every seated justice, and is
        // seated nowhere: the exclusion the bench has always carried.
        expect(Object.values(seated.institutions).every((runtime) => runtime.leader !== "pool-cabinet-material")).toBe(true);
    });
    it("does nothing to either record when there is nobody to seat", () => {
        const people = {};
        const institutions = foundingInstitutions();
        const seated = seatFoundingJustices(people, institutions, "USA");
        expect(seated.people).toBe(people);
        expect(seated.institutions).toBe(institutions);
    });
});
