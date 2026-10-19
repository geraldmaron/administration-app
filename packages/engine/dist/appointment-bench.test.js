import { describe, expect, it } from "vitest";
import { FEDERAL_JUDGE_ROLE } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { vacancyBenchEffects } from "./appointment-bench.js";
import { appointmentPool, fromCircuit } from "./appointment-pool.js";
import { isServingOfficer } from "./appointment-eligibility.js";
import { createSave, loadSave } from "./save.js";
import { removeOfficer } from "./career-incumbents.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
const OFFICE = "OFF-SCOTUS-SEAT-1";
const founded = foundedForBalance("appointments-bench").campaign;
function world(campaign, effects) {
    const packet = { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "A seat opens." }, effects };
    return apply(campaign, packet);
}
const created = (effects) => effects.flatMap((effect) => (effect.kind === "person" && effect.create ? [effect.create] : []));
describe("the bench a vacancy brings", () => {
    it("draws judges who read law and sit on a court today", () => {
        const bench = created(vacancyBenchEffects(founded, OFFICE));
        expect(bench).toHaveLength(3);
        for (const judge of bench) {
            expect(judge.base.education.field).toBe("law");
            expect(judge.base.career.at(-1)?.archetype).toBe("judiciary");
            expect(judge.base.eligibleRoles).toEqual([FEDERAL_JUDGE_ROLE]);
            expect(judge.base.nationality).toBe(founded.founding.nation);
            expect(judge.currentRole).toBeUndefined();
        }
    });
    it("names the same people for the same seat on the same day, and writes them once", () => {
        const first = vacancyBenchEffects(founded, OFFICE);
        expect(vacancyBenchEffects(founded, OFFICE)).toEqual(first);
        const stocked = world(founded, first);
        expect(vacancyBenchEffects(stocked, OFFICE)).toEqual([]);
        const count = Object.keys(stocked.people).length;
        appointmentPool(stocked, OFFICE);
        expect(Object.keys(stocked.people)).toHaveLength(count);
    });
    it("survives a save and a reload exactly", () => {
        const stocked = world(founded, vacancyBenchEffects(founded, OFFICE));
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(stocked))));
        for (const judge of created(vacancyBenchEffects(founded, OFFICE))) {
            expect(reloaded.people[judge.base.id]).toEqual(stocked.people[judge.base.id]);
        }
        expect(appointmentPool(reloaded, OFFICE).map((row) => row.person.base.id)).toEqual(appointmentPool(stocked, OFFICE).map((row) => row.person.base.id));
    });
    it("draws a new bench when a seat filled and emptied again opens on another day", () => {
        const first = created(vacancyBenchEffects(founded, OFFICE, 10)).map((judge) => judge.base.id);
        const later = created(vacancyBenchEffects(founded, OFFICE, 400)).map((judge) => judge.base.id);
        expect(later).toHaveLength(3);
        expect(later.some((id) => first.includes(id))).toBe(false);
    });
    it("draws a circuit seat's judges from its own circuit", () => {
        const seat = CIRCUIT_SEATS.find((entry) => entry.circuit === "Fifth");
        for (const judge of created(vacancyBenchEffects(founded, seat.office)))
            expect(fromCircuit(judge.base, "Fifth")).toBe(true);
    });
    it("stocks the Joint Chiefs with serving officers when the Chairman is removed", () => {
        const removed = removeOfficer(founded, "INST-JCS");
        if (!removed.ok)
            throw new Error(removed.reason);
        const officers = created(removed.packet.effects);
        for (const officer of officers)
            expect(isServingOfficer(officer.base)).toBe(true);
        expect(appointmentPool(apply(founded, removed.packet), "OFF-JOINTCHIEFS-HEAD").length).toBeGreaterThanOrEqual(3);
    });
    it("draws nothing for a seat whose bench the cast already staffs", () => {
        expect(vacancyBenchEffects(founded, "OFF-TREASURY-SEC")).toEqual([]);
        expect(vacancyBenchEffects(founded, "OFF-FDA-HEAD")).toEqual([]);
    });
});
