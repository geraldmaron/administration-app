import { describe, expect, it } from "vitest";
import { INSTITUTION_CATALOG, INSTITUTION_IDS, OFFICE_IDS, deriveImplementationQuality, foundingInstitutions, implementationTerms, institutionChildren, institutionDef, institutionPhase, institutionTick, institutionsWithAuthority, leaderRoleOf, leadsInstitution, officeDef, officeInstitution, seatCabinetOffice, seatOfficer, selectDeliveryShortfall, selectExecutiveCapacity, vacancyDrag, } from "./institutions.js";
import { AGENCY_HEAD_ROLE } from "@admin/world";
import { apply } from "./effects.js";
import { JUDICIARY_SEAT_ROLE } from "./judiciary.js";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
function runtimeFor(id) {
    const runtime = foundingInstitutions()[id];
    if (!runtime)
        throw new Error(`no founding runtime for ${id}`);
    return runtime;
}
describe("the executive branch as a catalog", () => {
    it("is a graph, not a cabinet table", () => {
        // The rejection criterion is explicit: the executive branch must not remain
        // a seven-seat proxy. Fifteen departments alone exceeds that, and the
        // catalog carries the components under them as well.
        expect(INSTITUTION_CATALOG.length).toBeGreaterThan(50);
        const departments = INSTITUTION_CATALOG.filter((def) => def.kind === "department");
        expect(departments).toHaveLength(15);
    });
    it("gives every id exactly once, and every office exactly once", () => {
        expect(new Set(INSTITUTION_IDS).size).toBe(INSTITUTION_IDS.length);
        expect(new Set(OFFICE_IDS).size).toBe(OFFICE_IDS.length);
    });
    it("never names a parent that is not itself in the catalog", () => {
        const ids = new Set(INSTITUTION_IDS);
        for (const def of INSTITUTION_CATALOG) {
            if (def.parent === undefined)
                continue;
            expect(ids.has(def.parent), `${def.id} names missing parent ${def.parent}`).toBe(true);
        }
    });
    it("keeps a child below its parent in the tier order", () => {
        for (const def of INSTITUTION_CATALOG) {
            if (!def.parent)
                continue;
            const parent = institutionDef(def.parent);
            expect(parent).toBeDefined();
            expect(def.tier).toBeGreaterThanOrEqual(parent.tier);
        }
    });
    it("resolves every office back to the institution that holds it", () => {
        for (const id of OFFICE_IDS) {
            expect(officeDef(id)).toBeDefined();
            expect(officeInstitution(id)).toBeDefined();
        }
    });
});
describe("the boundaries the game must not collapse", () => {
    it("keeps the FBI, the CIA and ODNI three separate institutions", () => {
        // A named rejection criterion: these three treated as one agency.
        const fbi = institutionDef("INST-FBI");
        const cia = institutionDef("INST-CIA");
        const odni = institutionDef("INST-ODNI");
        expect(fbi).toBeDefined();
        expect(cia).toBeDefined();
        expect(odni).toBeDefined();
        expect(new Set([fbi.id, cia.id, odni.id]).size).toBe(3);
        // Different parents, which is the structural half of the distinction.
        expect(fbi.parent).toBe("INST-DOJ");
        expect(cia.parent).toBe("INST-ODNI");
        expect(odni.parent).toBeUndefined();
    });
    it("gives each of the three a discipline the others do not have", () => {
        expect(institutionDef("INST-CIA").authorities).toContain("covert-action");
        expect(institutionDef("INST-CIA").authorities).not.toContain("federal-investigation");
        expect(institutionDef("INST-FBI").authorities).toContain("federal-investigation");
        expect(institutionDef("INST-FBI").authorities).not.toContain("covert-action");
        expect(institutionDef("INST-ODNI").authorities).toContain("intelligence-integration");
        expect(institutionDef("INST-NSA").capabilities).toContain("signals-intelligence");
    });
    it("puts the policy rate beyond the President's reach", () => {
        // The President nominates and cannot direct. Independence plus a removal
        // rule that is never at-will is what says so in the data, and a rejection
        // criterion turns on it. The two Fed offices do not share one rule:
        // 12 U.S.C. § 242 makes a governor removable for cause and writes no way at
        // all to end the four-year chairmanship, so the chair is the one office in
        // this government the President cannot reach.
        const fed = institutionDef("INST-FED");
        expect(fed.independence).toBe("independent");
        expect(fed.authorities).toContain("policy-rate");
        for (const office of fed.offices) {
            expect(office.removal, office.id).not.toBe("at-will");
            expect(office.termYears).toBeGreaterThan(0);
        }
        expect(fed.offices.find((office) => office.id === "OFF-FED-CHAIR").removal).toBe("term-protected");
        expect(fed.offices.find((office) => office.id === "OFF-FED-GOVERNOR").removal).toBe("for-cause");
        // And nothing in the executive branch holds the rate as its own authority.
        const rateHolders = institutionsWithAuthority("policy-rate");
        expect(rateHolders.map((def) => def.id)).toEqual(["INST-FED"]);
    });
    it("gives independent regulators fixed terms, and never a seat held at pleasure", () => {
        for (const def of INSTITUTION_CATALOG.filter((entry) => entry.independence === "independent")) {
            for (const office of def.offices) {
                expect(office.removal, `${office.id} should not serve at pleasure`).not.toBe("at-will");
            }
        }
    });
    it("does not assume one Vacancies Act rule for every seat", () => {
        // A named mission requirement. Several distinct acting authorities have to
        // be in use, or the per-office metadata is decoration.
        const authorities = new Set(INSTITUTION_CATALOG.flatMap((def) => def.offices.map((office) => office.actingAuthority)));
        expect(authorities.size).toBeGreaterThanOrEqual(3);
        expect(authorities.has("vacancies-act")).toBe(true);
        expect(authorities.has("statutory-succession")).toBe(true);
        expect(authorities.has("board-quorum")).toBe(true);
    });
    it("gives the Joint Chiefs advice rather than command", () => {
        const jcs = institutionDef("INST-JCS");
        expect(jcs.capabilities).toContain("advice");
        expect(jcs.capabilities).not.toContain("force-projection");
    });
});
describe("founding", () => {
    it("inherits a staffed government with its political leadership gone", () => {
        // The actual opening position of an American presidency, and the reason
        // the first months are about appointments whether the player likes it or not.
        const runtimes = foundingInstitutions();
        const dod = runtimes["INST-DOD"];
        expect(dod.vacancy).toBe(true);
        expect(dod.staffing).toBeGreaterThan(0.8);
        expect(dod.backlog).toBe(0);
    });
    it("leaves nothing in the catalog unseeded", () => {
        const runtimes = foundingInstitutions();
        for (const id of INSTITUTION_IDS) {
            expect(runtimes[id], `${id} has no founding runtime`).toBeDefined();
        }
    });
    it("does not open a vacancy at a body with no political office", () => {
        const runtimes = foundingInstitutions();
        expect(runtimes["INST-CONGRESS"].vacancy).toBe(false);
        expect(runtimes["INST-JUDICIARY"].vacancy).toBe(false);
    });
});
describe("what a vacancy costs", () => {
    it("costs more the longer the chair stays empty", () => {
        const base = runtimeFor("INST-DOD");
        const week = vacancyDrag({ ...base, vacantDays: 7 });
        const year = vacancyDrag({ ...base, vacantDays: 365 });
        expect(week).toBeGreaterThan(0);
        expect(year).toBeGreaterThan(week);
    });
    it("costs nothing at all when the office is filled", () => {
        expect(vacancyDrag({ ...runtimeFor("INST-DOD"), vacancy: false, vacantDays: 400 })).toBe(0);
    });
    it("is eased but not erased by an acting officer", () => {
        const base = { ...runtimeFor("INST-DOD"), vacantDays: 200 };
        const empty = vacancyDrag(base);
        const acting = vacancyDrag({ ...base, actingLeader: "PER-X" });
        expect(acting).toBeGreaterThan(0);
        expect(acting).toBeLessThan(empty);
    });
});
describe("what an institution actually delivers", () => {
    const def = institutionDef("INST-DHS");
    it("falls when the body is politicized", () => {
        const base = runtimeFor("INST-DHS");
        const clean = deriveImplementationQuality({ ...base, vacancy: false }, def);
        const bent = deriveImplementationQuality({ ...base, vacancy: false, politicization: 0.8 }, def);
        expect(bent).toBeLessThan(clean);
    });
    it("falls when work has piled up", () => {
        const base = { ...runtimeFor("INST-DHS"), vacancy: false };
        expect(deriveImplementationQuality({ ...base, backlog: 90 }, def)).toBeLessThan(deriveImplementationQuality(base, def));
    });
    it("falls when the appropriation does not cover the mandate", () => {
        const base = { ...runtimeFor("INST-DHS"), vacancy: false };
        expect(deriveImplementationQuality({ ...base, budgetAdequacy: 0.3 }, def)).toBeLessThan(deriveImplementationQuality(base, def));
    });
    it("insulates an independent body from the same neglect", () => {
        // What independence buys, in both directions: less damaged by neglect and
        // less improved by attention.
        const fed = institutionDef("INST-FED");
        const dhs = institutionDef("INST-DHS");
        const neglected = { ...runtimeFor("INST-FED"), vacancy: true, vacantDays: 300, backlog: 60 };
        const sameAtDhs = { ...runtimeFor("INST-DHS"), vacancy: true, vacantDays: 300, backlog: 60 };
        const fedLoss = fed.foundingCapacity - deriveImplementationQuality(neglected, fed);
        const dhsLoss = dhs.foundingCapacity - deriveImplementationQuality(sameAtDhs, dhs);
        expect(fedLoss).toBeLessThan(dhsLoss);
    });
    it("is exactly the sum of the terms that explain it", () => {
        const fed = institutionDef("INST-FED");
        const cases = [
            [def, { ...runtimeFor("INST-DHS"), vacancy: true, vacantDays: 120, backlog: 30, politicization: 0.4 }, undefined],
            [fed, { ...runtimeFor("INST-FED"), vacancy: false, backlog: 12 }, 0.6],
        ];
        for (const [body, runtime, competence] of cases) {
            const t = implementationTerms(runtime, body, competence);
            const sum = t.staffing + t.morale + t.budget + t.capacity + t.leader - t.vacancy - t.politicization - t.backlog;
            expect(deriveImplementationQuality(runtime, body, competence)).toBeCloseTo(Math.min(1, Math.max(0, sum)), 3);
        }
    });
    it("never leaves the 0..1 range however bad it gets", () => {
        const ruined = {
            ...runtimeFor("INST-DHS"),
            staffing: 0,
            morale: 0,
            budgetAdequacy: 0,
            capacity: 0,
            politicization: 1,
            backlog: 5000,
            vacancy: true,
            vacantDays: 2000,
        };
        const quality = deriveImplementationQuality(ruined, def);
        expect(quality).toBeGreaterThanOrEqual(0);
        expect(quality).toBeLessThanOrEqual(1);
    });
});
describe("the week the executive branch has", () => {
    it("accumulates backlog at a body that cannot keep up", () => {
        const def = institutionDef("INST-VA");
        const struggling = {
            ...runtimeFor("INST-VA"),
            staffing: 0.3,
            morale: 0.2,
            budgetAdequacy: 0.3,
            capacity: 0.3,
        };
        const tick = institutionTick(struggling, def, 7);
        expect(tick.changes.backlog).toBeGreaterThan(struggling.backlog);
    });
    it("drains backlog at a body that is running well", () => {
        const def = institutionDef("INST-VA");
        const healthy = {
            ...runtimeFor("INST-VA"),
            vacancy: false,
            staffing: 0.95,
            morale: 0.8,
            budgetAdequacy: 0.95,
            capacity: 0.9,
            backlog: 40,
        };
        const tick = institutionTick(healthy, def, 7);
        expect(tick.changes.backlog).toBeLessThan(40);
    });
    it("charges a vacancy in morale as well as in delivery", () => {
        const def = institutionDef("INST-VA");
        const empty = runtimeFor("INST-VA");
        const filled = { ...empty, vacancy: false };
        expect(institutionTick(empty, def, 7).changes.morale).toBeLessThan(institutionTick(filled, def, 7).changes.morale);
    });
    it("lets politicization fade rather than sticking forever", () => {
        const def = institutionDef("INST-VA");
        const bent = { ...runtimeFor("INST-VA"), politicization: 0.5 };
        expect(institutionTick(bent, def, 7).changes.politicization).toBeLessThan(0.5);
    });
    it("emits one packet for the whole branch rather than one per agency", () => {
        const campaign = buildCampaign();
        const packets = institutionPhase(campaign);
        expect(packets).toHaveLength(1);
        expect(packets[0].actor).toBe("world");
        expect(packets[0].provenance?.origin).toBe("institution");
    });
    it("moves state through apply() and nowhere else", () => {
        const campaign = buildCampaign();
        const before = campaign.institutions["INST-DOD"].vacantDays;
        const [packet] = institutionPhase(campaign);
        const after = apply(campaign, packet);
        expect(after.institutions["INST-DOD"].vacantDays).toBeGreaterThan(before);
        // The original is untouched: the phase is pure.
        expect(campaign.institutions["INST-DOD"].vacantDays).toBe(before);
    });
});
describe("reading the branch as a whole", () => {
    it("weights a department more heavily than a five-person board", () => {
        const campaign = buildCampaign();
        const hollowDefense = {
            ...campaign,
            institutions: {
                ...campaign.institutions,
                "INST-DOD": { ...campaign.institutions["INST-DOD"], implementationQuality: 0.1 },
            },
        };
        const hollowBoard = {
            ...campaign,
            institutions: {
                ...campaign.institutions,
                "INST-NLRB": { ...campaign.institutions["INST-NLRB"], implementationQuality: 0.1 },
            },
        };
        expect(selectExecutiveCapacity(hollowDefense)).toBeLessThan(selectExecutiveCapacity(hollowBoard));
    });
    it("leaves independent bodies out of the executive's own capacity", () => {
        // The Federal Reserve running well is not the administration executing well,
        // and counting it as such would let a president take credit for it.
        const campaign = buildCampaign();
        const fedRuined = {
            ...campaign,
            institutions: {
                ...campaign.institutions,
                "INST-FED": { ...campaign.institutions["INST-FED"], implementationQuality: 0 },
            },
        };
        expect(selectExecutiveCapacity(fedRuined)).toBe(selectExecutiveCapacity(campaign));
    });
    it("reads a hollowed branch as a shortfall against a working one, and a working one as none", () => {
        const campaign = buildCampaign();
        // Every institution at its founding capacity with nothing vacant is the
        // reference itself, so a branch in that state owes the public nothing.
        const whole = {
            ...campaign,
            institutions: Object.fromEntries(Object.entries(campaign.institutions).map(([id, runtime]) => [id, { ...runtime, vacancy: false, vacantDays: 0 }])),
        };
        expect(selectDeliveryShortfall(whole)).toBe(0);
        // Every office empty for long enough that the drag has ramped in full.
        const hollow = {
            ...campaign,
            institutions: Object.fromEntries(Object.entries(campaign.institutions).map(([id, runtime]) => [
                id,
                { ...runtime, vacancy: true, vacantDays: 400 },
            ])),
        };
        expect(selectDeliveryShortfall(hollow)).toBeGreaterThan(0.9);
        expect(selectDeliveryShortfall(hollow)).toBeLessThanOrEqual(1);
        // An acting officer is worth something: the same branch, led by deputies,
        // is marked down less than one led by nobody.
        const acting = {
            ...campaign,
            institutions: Object.fromEntries(Object.entries(hollow.institutions).map(([id, runtime]) => [
                id,
                { ...runtime, actingLeader: "PER-1" },
            ])),
        };
        expect(selectDeliveryShortfall(acting)).toBeLessThan(selectDeliveryShortfall(hollow));
    });
    it("names the children of a department", () => {
        const children = institutionChildren("INST-DHS").map((def) => def.id);
        expect(children).toContain("INST-FEMA");
        expect(children).toContain("INST-CISA");
    });
});
describe("one writer for who holds a chair", () => {
    const ROLE = "role-defense-minister";
    const FIRST = "PER-FIRST";
    const SECOND = "PER-SECOND";
    function withTwo() {
        const base = buildCampaign();
        return {
            ...base,
            people: {
                ...base.people,
                [FIRST]: { base: { ...person, id: FIRST, loyalty: 0.4 }, alive: true },
                [SECOND]: { base: { ...person, id: SECOND, loyalty: 0.8 }, alive: true },
            },
        };
    }
    it("names the role each kind of body's leader holds", () => {
        expect(leaderRoleOf(institutionDef("INST-DOD"))).toBe(ROLE);
        expect(leaderRoleOf(institutionDef("INST-FEMA"))).toBe(AGENCY_HEAD_ROLE);
        expect(leaderRoleOf(institutionDef("INST-SCOTUS-SEAT-1"))).toBe(JUDICIARY_SEAT_ROLE);
        expect(leadsInstitution("OFF-DEFENSE-SEC")).toBe(true);
        expect(leadsInstitution("OFF-DEFENSE-DEP")).toBe(false);
    });
    it("moves the person with the chair: the one seated takes the role, the one displaced gives it up", () => {
        const first = seatCabinetOffice(withTwo(), ROLE, FIRST);
        expect(first.people[FIRST].currentRole).toBe(ROLE);
        expect(first.people[FIRST].loyaltyAtAppointment).toBe(0.4);
        expect(first.institutions["INST-DOD"].leader).toBe(FIRST);
        const second = seatCabinetOffice(first, ROLE, SECOND);
        expect("currentRole" in second.people[FIRST]).toBe(false);
        expect("loyaltyAtAppointment" in second.people[FIRST]).toBe(false);
        expect(second.people[SECOND].currentRole).toBe(ROLE);
        const emptied = seatCabinetOffice(second, ROLE, undefined);
        expect("currentRole" in emptied.people[SECOND]).toBe(false);
        expect(emptied.institutions["INST-DOD"].vacancy).toBe(true);
    });
    it("keeps the baseline of somebody seated where they already sit", () => {
        const seated = seatCabinetOffice(withTwo(), ROLE, FIRST);
        const drifted = { ...seated, people: { ...seated.people, [FIRST]: { ...seated.people[FIRST], base: { ...seated.people[FIRST].base, loyalty: 0.9 } } } };
        expect(seatCabinetOffice(drifted, ROLE, FIRST).people[FIRST].loyaltyAtAppointment).toBe(0.4);
    });
    it("leads a body below the cabinet the same way, and ends its acting authority", () => {
        const base = withTwo();
        const acting = {
            ...base,
            institutions: { ...base.institutions, "INST-FEMA": { ...base.institutions["INST-FEMA"], actingLeader: SECOND, actingExpiresDay: 300 } },
        };
        const led = seatOfficer(acting, "INST-FEMA", FIRST);
        expect(led.institutions["INST-FEMA"].leader).toBe(FIRST);
        expect(led.institutions["INST-FEMA"].actingLeader).toBeUndefined();
        expect(led.institutions["INST-FEMA"].vacancy).toBe(false);
        expect(led.people[FIRST].currentRole).toBe(AGENCY_HEAD_ROLE);
        expect(led.people[SECOND].currentRole).toBeUndefined();
        const replaced = seatOfficer(led, "INST-FEMA", SECOND);
        expect(replaced.people[FIRST].currentRole).toBeUndefined();
        expect(replaced.people[SECOND].currentRole).toBe(AGENCY_HEAD_ROLE);
    });
    it("seats a department's officer through its cabinet chair", () => {
        const led = seatOfficer(withTwo(), "INST-DOD", FIRST);
        expect(led.player.cabinet[ROLE]).toBe(FIRST);
        expect(led.people[FIRST].currentRole).toBe(ROLE);
    });
});
