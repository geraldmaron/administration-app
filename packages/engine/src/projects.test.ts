import { describe, expect, it } from "vitest";
import type { PersonId, RoleId } from "@admin/world";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { createSave, loadSave } from "./save.js";
import { seatCabinetOffice, type InstitutionId } from "./institutions.js";
import { vacates } from "./appointments.js";
import { workIsLawful } from "./executive-work.js";
import {
  PROJECTS,
  READY_AT_AWARD_MAX,
  awardReadiness,
  isLate,
  openingProjects,
  plannedWeeks,
  projectDefinition,
  projectDepartment,
  projectPhase,
  projectTick,
  selectProjectPace,
  type ProjectDefinition,
  type ProjectPace,
  type ProjectRuntime,
} from "./projects.js";
import type { Campaign } from "./state.js";

const { campaign: FOUNDED } = foundedForBalance("projects");

function def(id: Parameters<typeof projectDefinition>[0]): ProjectDefinition {
  const found = projectDefinition(id);
  if (!found) throw new Error(`no program ${id}`);
  return found;
}

function withQuality(campaign: Campaign, id: InstitutionId, implementationQuality: number): Campaign {
  const runtime = campaign.institutions[id]!;
  return { ...campaign, institutions: { ...campaign.institutions, [id]: { ...runtime, implementationQuality } } };
}

function withCompetence(campaign: Campaign, role: RoleId, competence: number): Campaign {
  const id = campaign.player.cabinet[role]!;
  const person = campaign.people[id]!;
  return { ...campaign, people: { ...campaign.people, [id]: { ...person, base: { ...person.base, competence } } } };
}

function run(start: ProjectRuntime, program: ProjectDefinition, weeks: number, pace: ProjectPace, readiness = 0, from = 0): ProjectRuntime {
  let current = start;
  for (let week = 0; week < weeks; week += 1) current = projectTick(current, program, pace, from + week, readiness);
  return current;
}

const ON_PLAN: ProjectPace = { review: 0.7, build: 0.7 };

describe("the programs are lawful work", () => {
  it("names owners and reviewers the catalog gives the authority to, each rolled up to its own department", () => {
    for (const program of PROJECTS) expect(workIsLawful(program.work), program.id).toBe(true);
    expect(PROJECTS.map(projectDepartment)).toEqual(["INST-DOT", "INST-DOE"]);
  });
});

describe("a program week counts every project once", () => {
  it("keeps what is underway equal to what was underway, plus the award, less what finished", () => {
    const program = def("highway-grants");
    let runtime = openingProjects(program, 0);
    for (let week = 0; week < 120; week += 1) {
      const next = projectTick(runtime, program, { review: week % 5 === 0 ? 0.2 : 0.8, build: 0.6 }, week, 0.3);
      expect(next.underway.length).toBe(runtime.underway.length + next.last!.awarded - next.last!.completed);
      expect(next.completed).toBe(runtime.completed + next.last!.completed);
      runtime = next;
    }
    expect(runtime.completed).toBeGreaterThan(0);
  });

  it("opens with the pipeline the plan would have, none of it late", () => {
    const program = def("reactor-demonstrations");
    const opened = openingProjects(program, 40);
    expect(opened.underway.length).toBeGreaterThan(0);
    expect(opened.underway.some((project) => isLate(project, program, 40))).toBe(false);
    expect(opened.completed).toBe(0);
  });

  it("finishes on plan at the planning pace and late below it", () => {
    const program = def("highway-grants");
    const empty: ProjectRuntime = { id: program.id, openedTurn: 0, underway: [], completed: 0, completedLate: 0 };
    const onPlan = run(empty, program, plannedWeeks(program) + 12, ON_PLAN);
    expect(onPlan.completed).toBeGreaterThan(0);
    expect(onPlan.completedLate).toBe(0);
    const slow = run(empty, program, plannedWeeks(program) * 2, { review: 0.4, build: 0.4 });
    expect(slow.completedLate).toBeGreaterThan(0);
  });
});

describe("a project cannot be built before its review clears", () => {
  it("stops every review while the reviewing body is not clearing its stage, however healthy the department", () => {
    const program = def("reactor-demonstrations");
    const stalled = withQuality(withQuality(FOUNDED, "INST-DOE", 1), "INST-NRC", 0.1);
    const pace = selectProjectPace(stalled, program);
    expect(pace).toMatchObject({ review: 0, build: 1, reviewer: "INST-NRC" });
    const empty: ProjectRuntime = { id: program.id, openedTurn: 0, underway: [], completed: 0, completedLate: 0 };
    const later = run(empty, program, 120, pace, 0.3);
    expect(later.underway.every((project) => project.review === 0.3 && project.build === 0)).toBe(true);
    expect(later.completed).toBe(0);
  });

  it("moves reviews at the reviewer's pace, which nothing the department does changes", () => {
    const program = def("highway-grants");
    const weakDot = selectProjectPace(withQuality(FOUNDED, "INST-DOT", 0.3), program);
    const strongDot = selectProjectPace(withQuality(FOUNDED, "INST-DOT", 1), program);
    expect(weakDot.review).toBe(strongDot.review);
    expect(weakDot.build).toBeLessThan(strongDot.build);
  });
});

describe("the Secretary picks the projects", () => {
  const TRANSPORTATION = "role-transportation-secretary" as RoleId;

  it("sends a competent Secretary's awards further through review, and nothing else about the week", () => {
    const program = def("highway-grants");
    const strong = withCompetence(FOUNDED, TRANSPORTATION, 0.95);
    const weak = withCompetence(FOUNDED, TRANSPORTATION, 0.15);
    expect(awardReadiness(strong, program)).toBeCloseTo(READY_AT_AWARD_MAX * 0.95, 9);
    expect(awardReadiness(weak, program)).toBeCloseTo(READY_AT_AWARD_MAX * 0.15, 9);
    expect(selectProjectPace(strong, program)).toEqual(selectProjectPace(weak, program));
  });

  it("reads an acting Secretary, and nobody when nobody runs the chair", () => {
    const program = def("highway-grants");
    const holder = FOUNDED.player.cabinet[TRANSPORTATION]!;
    const resigned = apply(FOUNDED, {
      source: "action",
      actor: "player",
      turn: FOUNDED.turn,
      narration: { summary: "The Secretary resigns." },
      effects: vacates(FOUNDED, TRANSPORTATION, "resigned", holder),
    });
    const acting = resigned.people[resigned.institutions["INST-DOT"]!.actingLeader!]!;
    expect(awardReadiness(resigned, program)).toBeCloseTo(READY_AT_AWARD_MAX * acting.base.competence, 9);
    expect(awardReadiness(seatCabinetOffice(FOUNDED, TRANSPORTATION, undefined), program)).toBe(0);
  });
});

describe("the project phase", () => {
  it("opens every program on a campaign that has none, and awards on its first week", () => {
    const at = { ...FOUNDED, turn: 9 };
    const next = projectPhase(at).reduce(apply, at);
    for (const program of PROJECTS) {
      expect(next.projects?.[program.id]?.openedTurn).toBe(9);
      expect(next.projects?.[program.id]?.last?.awarded).toBe(1);
    }
  });

  it("survives a save, and reads an earlier save as having no programs rather than inventing them", () => {
    const tracked = projectPhase(FOUNDED).reduce(apply, FOUNDED);
    expect(loadSave(JSON.parse(JSON.stringify(createSave(tracked)))).projects).toEqual(tracked.projects);
    const { projects: _none, ...untracked } = tracked;
    expect(loadSave({ schemaVersion: 57, campaign: untracked }).projects).toBeUndefined();
  });

  it("leaves the pipeline and the department where they were when the chair changes hands", () => {
    const TRANSPORTATION = "role-transportation-secretary" as RoleId;
    const tracked = projectPhase(FOUNDED).reduce(apply, FOUNDED);
    const emptied = seatCabinetOffice(tracked, TRANSPORTATION, undefined);
    const someone = Object.values(tracked.people).find((person) => person.alive && person.currentRole === undefined)!.base.id as PersonId;
    for (const campaign of [emptied, seatCabinetOffice(emptied, TRANSPORTATION, someone)]) {
      expect(campaign.projects).toEqual(tracked.projects);
      expect(campaign.institutions["INST-DOT"]!.capacity).toBe(tracked.institutions["INST-DOT"]!.capacity);
    }
  });
});
