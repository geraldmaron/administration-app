import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { CAREER_INCUMBENT_ROLE, POLITICAL_OFFICE_INSTITUTIONS, careerOffices, removeOfficer, selectInstitutionLedBy, withCareerBench, withCareerIncumbents, } from "./career-incumbents.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
import { apply } from "./effects.js";
import { institutionTick, vacancyDrag } from "./institutions.js";
import { institutionDef } from "./institutions.js";
import { JUDICIARY_SEAT_INSTITUTIONS } from "./judiciary.js";
const AT_WILL_BODY = "INST-FBI";
const FOR_CAUSE_BODY = "INST-SEC";
// The Federal Reserve, whose first office is the four-year chairmanship — the
// one seat in this government the President has no way to end.
const TERM_PROTECTED_BODY = "INST-FED";
function founded(seed) {
    return foundedForBalance(seed).campaign;
}
/**
 * A campaign's cast with the career branch stripped out — the shape
 * `withCareerBench` and `withCareerIncumbents` are handed at a founding, before
 * either has run. Built here rather than loaded from a save, because a save
 * this build cannot read is refused rather than filled in.
 */
/**
 * The bodies a founding seats before the career sweep: the Court, the
 * President's own offices (the Vice President, the chief of staff, the
 * national security adviser) and the political offices filled from the
 * President's party.
 */
const SEATED_BEFORE_THE_SWEEP = new Set([
    ...JUDICIARY_SEAT_INSTITUTIONS,
    VICE_PRESIDENCY_INSTITUTION_ID,
    "INST-PRESIDENCY",
    "INST-NSC",
    ...POLITICAL_OFFICE_INSTITUTIONS,
]);
function withoutCareerBench(campaign) {
    // The Court, the President's own offices and the political offices, like the
    // cabinet, are seated in an earlier founding phase than the generic career
    // sweep — their seats stay put here for the same reason a cabinet seat does,
    // or the career sweep below would be offered a pool too generous, and every
    // id after them would drift. A holder who happens to also carry career-
    // incumbent eligibility has to be exempted from the strip below too, or the
    // seat above keeps naming a person the career bench no longer has any record
    // of.
    const seatInstitutions = SEATED_BEFORE_THE_SWEEP;
    const seatedJustices = new Set(Object.entries(campaign.institutions)
        .filter(([id]) => seatInstitutions.has(id))
        .map(([, runtime]) => runtime.leader ?? runtime.actingLeader)
        .filter((leader) => leader !== undefined));
    const people = Object.fromEntries(Object.entries(campaign.people).filter(([id, runtime]) => seatedJustices.has(id) ||
        !runtime.base.eligibleRoles.some((role) => role === CAREER_INCUMBENT_ROLE)));
    const institutions = Object.fromEntries(Object.entries(campaign.institutions).map(([id, runtime]) => {
        const def = institutionDef(id);
        if (def?.cabinetRole || seatInstitutions.has(id) || runtime.leader === undefined)
            return [id, runtime];
        const { leader: _dropped, ...vacated } = runtime;
        return [id, { ...vacated, vacancy: true, vacantDays: 0 }];
    }));
    return { ...campaign, people, institutions };
}
describe("staffing the branch below the cabinet", () => {
    it("never offers the Vice President's office to the career bench", () => {
        expect(careerOffices().some(({ institution }) => institution.id === VICE_PRESIDENCY_INSTITUTION_ID)).toBe(false);
    });
    it("seats the same incumbents a founding would have, over offices that were empty", () => {
        const fresh = founded("incumbents-seating");
        const stale = withoutCareerBench(fresh);
        expect(stale.institutions[AT_WILL_BODY].leader).toBeUndefined();
        const pool = Object.values(fresh.people).map((runtime) => runtime.base);
        const seated = withCareerIncumbents(withCareerBench(stale.people, pool), stale.institutions);
        const actedFor = new Set(POLITICAL_OFFICE_INSTITUTIONS);
        for (const { institution } of careerOffices()) {
            expect(seated.institutions[institution.id].leader).toBe(fresh.institutions[institution.id].leader);
            // The political offices open under an acting and wait on a nomination; the sweep passes over them.
            expect(seated.institutions[institution.id].vacancy).toBe(actedFor.has(institution.id));
        }
    });
    it("adds the bench it never drew without disturbing the cast it did", () => {
        const fresh = founded("incumbents-bench-backfill");
        const stale = withoutCareerBench(fresh);
        const pool = Object.values(fresh.people).map((runtime) => runtime.base);
        const filled = withCareerBench(stale.people, pool);
        for (const [id, runtime] of Object.entries(stale.people))
            expect(filled[id]).toEqual(runtime);
        expect(Object.keys(filled).length).toBe(Object.keys(fresh.people).length);
    });
});
describe("removing an officer", () => {
    it("opens a real vacancy that costs delivery every week it stays open", () => {
        const campaign = founded("incumbents-removal");
        const def = institutionDef(AT_WILL_BODY);
        const before = campaign.institutions[AT_WILL_BODY].implementationQuality;
        const holder = campaign.institutions[AT_WILL_BODY].leader;
        const result = removeOfficer(campaign, AT_WILL_BODY);
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        const after = apply(campaign, result.packet);
        const runtime = after.institutions[AT_WILL_BODY];
        expect(runtime.leader).toBeUndefined();
        expect("leader" in runtime).toBe(false);
        expect(runtime.vacancy).toBe(true);
        expect(runtime.vacantDays).toBe(0);
        expect(after.people[holder].currentRole).toBeUndefined();
        expect(runtime.implementationQuality).toBeLessThan(before);
        // The drag is the vacancy's own, and it compounds rather than arriving whole.
        const week = institutionTick(runtime, def, 7);
        expect(week.changes.vacantDays).toBe(7);
        expect(vacancyDrag({ ...runtime, vacantDays: 7 })).toBeGreaterThan(0);
        expect(vacancyDrag({ ...runtime, vacantDays: 200 })).toBeGreaterThan(vacancyDrag({ ...runtime, vacantDays: 7 }));
    });
    it("frees the officer to be sent up for something else", () => {
        const campaign = founded("incumbents-freed");
        const holder = campaign.institutions[AT_WILL_BODY].leader;
        expect(selectInstitutionLedBy(campaign, holder)?.id).toBe(AT_WILL_BODY);
        const result = removeOfficer(campaign, AT_WILL_BODY);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(campaign, result.packet);
        expect(selectInstitutionLedBy(after, holder)).toBeUndefined();
    });
    it("refuses what the office's own removal rule refuses", () => {
        const campaign = founded("incumbents-refusals");
        const cabinetBody = removeOfficer(campaign, "INST-STATE");
        expect(cabinetBody.ok).toBe(false);
        const uncaused = removeOfficer(campaign, FOR_CAUSE_BODY);
        expect(uncaused.ok).toBe(false);
        const caused = removeOfficer(campaign, FOR_CAUSE_BODY, "Refused to carry out a lawful instruction.");
        expect(caused.ok).toBe(true);
        if (!caused.ok)
            return;
        // A removal a statute protects against bends the body toward this
        // administration's politics; an at-will one does not.
        const after = apply(campaign, caused.packet);
        expect(after.institutions[FOR_CAUSE_BODY].politicization).toBeGreaterThan(campaign.institutions[FOR_CAUSE_BODY].politicization);
        const empty = removeOfficer(after, FOR_CAUSE_BODY, "Again.");
        expect(empty.ok).toBe(false);
        expect(removeOfficer(campaign, "INST-NOT-REAL").ok).toBe(false);
    });
    // The class the engine enforced and no office in the catalog claimed, which
    // made the strongest of the three removal rules a branch nothing could reach.
    it("refuses a term-protected office outright, whatever cause is written on it", () => {
        const campaign = founded("incumbents-term-protected");
        const office = institutionDef(TERM_PROTECTED_BODY).offices[0];
        expect(office.removal).toBe("term-protected");
        const bare = removeOfficer(campaign, TERM_PROTECTED_BODY);
        expect(bare.ok).toBe(false);
        if (bare.ok)
            return;
        expect(bare.reason).toContain("fixed term");
        const withCause = removeOfficer(campaign, TERM_PROTECTED_BODY, "Held rates too high through an election year.");
        expect(withCause.ok).toBe(false);
        expect(campaign.institutions[TERM_PROTECTED_BODY].leader).toBeDefined();
    });
});
