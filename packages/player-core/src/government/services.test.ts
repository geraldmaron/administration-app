import { describe, expect, it } from "vitest";
import { SERVICES, apply, cohorts, openingService, servicePhase, type Campaign, type ServiceRuntime } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { departmentServices } from "./services.js";

const campaign = openingCampaign({ seedText: "department-services" });

function week(start: Campaign): Campaign {
  return servicePhase(start).reduce(apply, start);
}

function withQuality(start: Campaign, id: string, implementationQuality: number): Campaign {
  const runtime = start.institutions[id]!;
  return { ...start, institutions: { ...start.institutions, [id]: { ...runtime, implementationQuality } } };
}

function withSecretaryIntegrity(start: Campaign, role: string, integrity: number): Campaign {
  const id = start.player.cabinet[role as keyof typeof start.player.cabinet]!;
  const person = start.people[id]!;
  return { ...start, people: { ...start.people, [id]: { ...person, base: { ...person.base, integrity } } } };
}

/** Every service carrying a backlog most of which is already late. */
function lateEverywhere(start: Campaign): Campaign {
  const services = Object.fromEntries(
    SERVICES.map((def): [string, ServiceRuntime] => [def.id, { ...openingService(def, 0), pending: cohorts({ 0: 100, 6: 150, 18: 300, 26: 200 }) }]),
  );
  return { ...start, services };
}

describe("the departments' services", () => {
  it("says the record starts this week on a campaign that has not yet tracked any", () => {
    const reading = departmentServices(campaign);
    expect(reading.rows).toHaveLength(SERVICES.length);
    expect(reading.rows.every((row) => row.status === "opening" && row.tone === "neutral")).toBe(true);
    expect(reading.summary).toMatch(/starts at the end of this week/);
  });

  it("names the department and the body doing the work, so the Treasury's row is the IRS's work", () => {
    const row = departmentServices(week(campaign)).rows.find((entry) => entry.id === "tax-returns")!;
    expect(row.department).toBe("Department of the Treasury");
    expect(row.owner).toBe("Internal Revenue Service");
    expect(row.href).not.toBe("");
  });

  it("does not let a backlog cleared by refusals read as keeping up", () => {
    const pliant = withSecretaryIntegrity(lateEverywhere(campaign), "role-veterans-secretary", 0.05);
    const row = departmentServices(week(pliant)).rows.find((entry) => entry.id === "disability-claims")!;
    expect(row.status).toBe("cutting-corners");
    expect(row.statusLabel).toBe("Saying no to clear cases");
    expect(row.tone).toBe("bad");
    expect(row.action).toMatch(/Someone with more integrity in the job/);
    expect(row.refusedShare).toBeGreaterThan(0.3);
    expect(row.wrongShare).toBeGreaterThan(0);
  });

  it("stops arms transfers when State is not approving, and says so, whatever the Pentagon's state", () => {
    const stalled = withQuality(withQuality(campaign, "INST-STATE", 0.1), "INST-DOD", 1);
    const row = departmentServices(week(stalled)).rows.find((entry) => entry.id === "arms-transfers")!;
    expect(row.status).toBe("stopped");
    expect(row.why).toMatch(/^The Department of State isn't giving its approvals/);
    expect(row.action).toMatch(/Department of State/);
  });

  it("names a slow approval only when it is what leaves the service behind", () => {
    const slowState = withQuality(withQuality(campaign, "INST-STATE", 0.45), "INST-DOD", 1);
    const behind = departmentServices(week(slowState)).rows.find((entry) => entry.id === "arms-transfers")!;
    expect(behind.status).toBe("delayed");
    expect(behind.why).toMatch(/needs the Department of State's approval, and that approval comes more slowly than the Department of Defense can work/);
    const keepingPace = withQuality(withQuality(campaign, "INST-STATE", 0.9), "INST-DOD", 0.95);
    expect(departmentServices(week(keepingPace)).rows.find((entry) => entry.id === "arms-transfers")!.status).toBe("keeping-up");
  });

  it("summarizes by counting services, not by pooling their rates, and lists the worst first", () => {
    const reading = departmentServices(week(lateEverywhere(campaign)));
    const keeping = reading.rows.filter((row) => row.status === "keeping-up").length;
    expect(reading.summary.startsWith(`${keeping} of ${reading.rows.length} services keeping up.`)).toBe(true);
    expect(reading.rows[0]!.tone).not.toBe("good");
    expect(reading.scaleWeeks).toBeGreaterThanOrEqual(Math.max(...reading.rows.map((row) => row.pendingWeeks)));
  });

  it("reads a caseload cleared by forced pleas as worse, never as more justice done", () => {
    // Most of the caseload past its half-year standard.
    const overdue = (start: Campaign): Campaign => ({
      ...start,
      services: { "federal-cases": { ...openingService(SERVICES.find((def) => def.id === "federal-cases")!, 0), pending: cohorts({ 0: 100, 26: 600 }) } },
    });
    const read = (integrity: number) =>
      departmentServices(week(withSecretaryIntegrity(overdue(campaign), "role-attorney-general", integrity))).rows.find((entry) => entry.id === "federal-cases")!;
    const steady = read(0.95);
    const pliant = read(0.05);
    expect(pliant.lateShare).toBeLessThan(steady.lateShare);
    expect(pliant.status).toBe("cutting-corners");
    expect(pliant.statusLabel).toBe("Forcing plea deals to clear cases");
    expect(pliant.tone).toBe("bad");
    expect(pliant.why).toMatch(/closed by forcing plea deals/);
    expect(pliant.action).toMatch(/go to trial or be dropped based on the facts/);
    expect(pliant.refusedShare).toBeUndefined();
    expect(pliant.wrongShare!).toBeGreaterThan(steady.wrongShare!);
  });

  it("tells the President the courts are not theirs to direct when the courts hold federal cases back", () => {
    const slowCourts = withQuality(withQuality(campaign, "INST-JUDICIARY", 0.4), "INST-DOJ", 1);
    const row = departmentServices(week(slowCourts)).rows.find((entry) => entry.id === "federal-cases")!;
    expect(row.status).toBe("delayed");
    expect(row.action).toMatch(/is independent, so you can't give it orders/);
  });

  it("lists one service for each department, from the Attorney General's to the Interior's", () => {
    const departments = departmentServices(week(campaign)).rows.map((row) => row.department);
    expect(new Set(departments).size).toBe(SERVICES.length);
    expect(departments).toEqual(expect.arrayContaining(["Department of Justice", "Department of the Interior", "Department of Homeland Security"]));
  });
});
