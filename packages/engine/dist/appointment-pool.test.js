import { describe, expect, it } from "vitest";
import { AGENCY_HEAD_ROLE } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { appointmentPool, POOL_MINIMUM } from "./appointment-pool.js";
import { hasLegalCareer, isServingOfficer, seatKindOf, yearsOutOfUniform } from "./appointment-eligibility.js";
import { vacancyBenchEffects } from "./appointment-bench.js";
import { dismissMinister } from "./appointments.js";
import { removeOfficer } from "./career-incumbents.js";
import { fillVacantOffices, openNomination } from "./nomination.js";
import { institutionDef, selectVacancies } from "./institutions.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
const SEEDS = ["appointments-probe", "appointments-pool-a", "appointments-pool-b", "appointments-pool-c"];
const SCIENCE = new Set(["medicine", "natural-sciences"]);
function world(campaign, effects) {
    const packet = { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "A seat opens." }, effects };
    return apply(campaign, packet);
}
function committed(campaign, result) {
    if (!result.ok)
        throw new Error(result.reason);
    return apply(campaign, result.packet);
}
/** A court seat emptied the way the yearly vacancy phase empties one: the seat, the justice, and the bench it brings. */
function openCourtSeat(campaign, institution, office) {
    const holder = campaign.institutions[institution]?.leader;
    return world(campaign, [
        ...(holder ? [{ kind: "person", person: holder, changes: { currentRole: undefined, judicialRetired: true } }] : []),
        { kind: "institution", institution, vacate: true },
        ...vacancyBenchEffects(campaign, office),
    ]);
}
const founded = new Map(SEEDS.map((seed) => [seed, foundedForBalance(seed).campaign]));
const campaignOf = (seed) => founded.get(seed);
const studied = (row) => row.person.base.education.field;
describe("the appointment pool", () => {
    it.each(SEEDS)("offers the Chief Justice's seat lawyers and a judge first (%s)", (seed) => {
        const open = openCourtSeat(campaignOf(seed), "INST-SCOTUS-SEAT-1", "OFF-SCOTUS-SEAT-1");
        const pool = appointmentPool(open, "OFF-SCOTUS-SEAT-1");
        expect(pool.length).toBeGreaterThanOrEqual(POOL_MINIMUM.justice);
        expect(pool.every((row) => hasLegalCareer(row.person.base))).toBe(true);
        expect(pool[0].person.base.career.some((post) => post.archetype === "judiciary")).toBe(true);
        expect(pool[0].reasons.some((reason) => reason.kind === "tenure")).toBe(true);
    });
    it.each(SEEDS)("offers a circuit seat lawyers from its own circuit (%s)", (seed) => {
        const seat = CIRCUIT_SEATS.find((entry) => entry.circuit === "Ninth");
        const open = openCourtSeat(campaignOf(seed), seat.id, seat.office);
        const pool = appointmentPool(open, seat.office);
        expect(pool.every((row) => hasLegalCareer(row.person.base))).toBe(true);
        expect(pool[0].reasons).toContainEqual({ kind: "home-circuit", circuit: "Ninth" });
    });
    it.each(SEEDS)("ranks health and science agencies by medicine and the sciences, and fills four of them with four people (%s)", (seed) => {
        const bodies = ["INST-FDA", "INST-CDC", "INST-NIH", "INST-EPA"];
        // The EPA opens vacant at the founding, under a career acting; the rest are emptied.
        const open = bodies.reduce((campaign, body) => (campaign.institutions[body]?.leader ? committed(campaign, removeOfficer(campaign, body)) : campaign), campaignOf(seed));
        expect(bodies.every((body) => open.institutions[body]?.vacancy)).toBe(true);
        for (const office of ["OFF-FDA-HEAD", "OFF-CDC-HEAD", "OFF-NIH-HEAD"]) {
            const top = appointmentPool(open, office)[0];
            const medical = top.person.base.career.some((post) => post.archetype === "medicine") || SCIENCE.has(studied(top));
            expect(medical).toBe(true);
        }
        expect(appointmentPool(open, "OFF-EPA-ADMIN")[0].reasons.some((reason) => reason.kind === "career" || reason.kind === "study")).toBe(true);
        const sent = fillVacantOffices(open, ["OFF-FDA-HEAD", "OFF-CDC-HEAD", "OFF-NIH-HEAD", "OFF-EPA-ADMIN"]);
        const nominees = sent.flatMap((packet) => packet.effects.flatMap((effect) => (effect.kind === "nomination" && effect.nomination ? [effect.nomination.nominee] : [])));
        expect(nominees).toHaveLength(4);
        expect(new Set(nominees).size).toBe(4);
    });
    it.each(SEEDS)("never offers the Secretary of Defense somebody inside the statutory wait (%s)", (seed) => {
        const open = committed(campaignOf(seed), dismissMinister(campaignOf(seed), "role-defense-minister"));
        const pool = appointmentPool(open, "OFF-DEFENSE-SEC");
        expect(pool.length).toBeGreaterThan(0);
        for (const row of pool) {
            const out = yearsOutOfUniform(row.person.base);
            expect(out === undefined || out >= 7).toBe(true);
        }
    });
    it.each(SEEDS)("leads the Attorney General's list with a lawyer where the bench has one (%s)", (seed) => {
        const open = committed(campaignOf(seed), dismissMinister(campaignOf(seed), "role-attorney-general"));
        const pool = appointmentPool(open, "OFF-JUSTICE-SEC");
        if (!pool.some((row) => hasLegalCareer(row.person.base)))
            return;
        expect(hasLegalCareer(pool[0].person.base)).toBe(true);
    });
    it.each(SEEDS)("offers the Joint Chiefs only serving officers, generated when the cast has too few (%s)", (seed) => {
        const open = committed(campaignOf(seed), removeOfficer(campaignOf(seed), "INST-JCS"));
        const pool = appointmentPool(open, "OFF-JOINTCHIEFS-HEAD");
        expect(seatKindOf("OFF-JOINTCHIEFS-HEAD")).toBe("joint-chiefs");
        expect(pool.length).toBeGreaterThanOrEqual(POOL_MINIMUM["joint-chiefs"]);
        expect(pool.every((row) => isServingOfficer(row.person.base))).toBe(true);
    });
    it.each(SEEDS)("offers at least the minimum for every seat open at the founding (%s)", (seed) => {
        const campaign = campaignOf(seed);
        for (const runtime of selectVacancies(campaign)) {
            const office = institutionDef(runtime.id)?.offices[0]?.id;
            const kind = office ? seatKindOf(office) : undefined;
            if (!office || !kind)
                continue;
            expect(appointmentPool(campaign, office).length, office).toBeGreaterThanOrEqual(POOL_MINIMUM[kind]);
        }
    });
    it("gives no credit for a role the President's charter does not have", () => {
        // The CIA opens vacant at the founding: its director is the new President's to name.
        const open = campaignOf("appointments-probe");
        expect(open.institutions["INST-CIA"]?.vacancy).toBe(true);
        // The pool's last name: far enough from the ceiling that a credit would show.
        const top = appointmentPool(open, "OFF-DCIA").at(-1);
        const id = top.person.base.id;
        const as = (roles) => ({
            ...open,
            people: { ...open.people, [id]: { ...top.person, base: { ...top.person.base, eligibleRoles: roles } } },
        });
        const score = (state) => appointmentPool(state, "OFF-DCIA").find((row) => row.person.base.id === id)?.score;
        expect(score(as(["role-monarch", "role-junta-chairman"]))).toBe(score(as(["role-journalist"])));
        expect(score(as([AGENCY_HEAD_ROLE]))).toBeGreaterThan(score(as(["role-journalist"])));
        for (const row of appointmentPool(open, "OFF-DCIA")) {
            if (row.reasons.some((reason) => reason.kind === "agency-bench")) {
                expect(row.person.base.eligibleRoles.some((role) => role === AGENCY_HEAD_ROLE)).toBe(true);
            }
        }
    });
    it("is read from state and never writes it", () => {
        const campaign = campaignOf("appointments-probe");
        const people = campaign.people;
        appointmentPool(campaign, "OFF-SCOTUS-SEAT-1");
        appointmentPool(campaign, "OFF-JOINTCHIEFS-HEAD");
        expect(campaign.people).toBe(people);
        expect(Object.keys(campaign.people)).toHaveLength(Object.keys(people).length);
    });
    it("is empty for a seat the Senate does not confirm, and the nomination is refused", () => {
        const campaign = campaignOf("appointments-probe");
        const office = institutionDef("INST-USSS").offices[0].id;
        expect(seatKindOf(office)).toBeUndefined();
        expect(appointmentPool(campaign, office)).toEqual([]);
        const anybody = Object.values(campaign.people).find((runtime) => runtime.alive && runtime.currentRole === undefined);
        const open = committed(campaign, removeOfficer(campaign, "INST-USSS"));
        expect(openNomination(open, office, anybody.base.id)).toMatchObject({ ok: false, reason: expect.stringContaining("not confirmed by the Senate") });
    });
});
