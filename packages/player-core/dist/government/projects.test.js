import { describe, expect, it } from "vitest";
import { PROJECTS, READY_AT_AWARD_MAX, apply, projectPhase } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { departmentServices } from "./services.js";
const campaign = openingCampaign({ seedText: "department-projects" });
function weeks(start, count) {
    let current = start;
    for (let index = 0; index < count; index += 1) {
        const next = projectPhase(current).reduce(apply, current);
        current = { ...next, turn: next.turn + 1 };
    }
    return current;
}
function withQuality(start, id, implementationQuality) {
    const runtime = start.institutions[id];
    return { ...start, institutions: { ...start.institutions, [id]: { ...runtime, implementationQuality } } };
}
const rowOf = (state, id) => departmentServices(state).projects.rows.find((row) => row.id === id);
describe("the departments' grant programs", () => {
    it("says the record starts this week before any program is tracked", () => {
        const reading = departmentServices(campaign).projects;
        expect(reading.rows).toHaveLength(PROJECTS.length);
        expect(reading.rows.every((row) => row.status === "opening")).toBe(true);
        expect(reading.summary).toMatch(/starts at the end of this week/);
    });
    it("names the department, the builder and the body whose review comes first", () => {
        const row = rowOf(weeks(campaign, 1), "reactor-demonstrations");
        expect(row.department).toBe("Department of Energy");
        expect(row.reviewer).toBe("Nuclear Regulatory Commission");
        expect(row.stages.map((stage) => stage.key)).toEqual(["review", "build", "late"]);
        expect(row.stages.reduce((sum, stage) => sum + stage.count, 0)).toBe(row.underway);
    });
    it("reads a stopped review as stopped and points at the commission the President cannot direct, and at the Secretary's pick", () => {
        const stalled = withQuality(withQuality(campaign, "INST-NRC", 0.1), "INST-DOE", 1);
        const row = rowOf(weeks(stalled, 2), "reactor-demonstrations");
        expect(row.status).toBe("stalled");
        expect(row.tone).toBe("bad");
        expect(row.why).toMatch(/^The Nuclear Regulatory Commission isn't finishing its reviews/);
        expect(row.action).toMatch(/is independent, so you can't give it orders/);
        expect(row.action).toMatch(/Secretary of Energy still chooses/);
    });
    it("names the department's own condition when construction is what runs slow", () => {
        const slowBuild = withQuality(withQuality(campaign, "INST-EPA", 0.95), "INST-DOT", 0.3);
        const row = rowOf(weeks(slowBuild, 2), "highway-grants");
        expect(row.status).toBe("slipping");
        expect(row.why).toMatch(/Department of Transportation is building more slowly than planned/);
        expect(row.action).toMatch(/^Department of Transportation: /);
    });
    it("shows the Secretary's pick as how far the next award arrives through review", () => {
        const row = rowOf(weeks(campaign, 1), "highway-grants");
        expect(row.nextAwardReady).toBeGreaterThan(0);
        expect(row.nextAwardReady).toBeLessThanOrEqual(READY_AT_AWARD_MAX);
    });
    it("counts programs by status rather than pooling their late shares", () => {
        const reading = departmentServices(weeks(campaign, 3)).projects;
        const onSchedule = reading.rows.filter((row) => row.status === "on-schedule").length;
        expect(reading.summary.startsWith(`${onSchedule} of ${reading.rows.length} programs on schedule.`)).toBe(true);
        expect(reading.scale).toBeGreaterThanOrEqual(Math.max(...reading.rows.map((row) => row.underway)));
    });
});
