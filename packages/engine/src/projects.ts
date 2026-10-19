import type { RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import { institutionDef, type InstitutionId } from "./institutions.js";
import { APPROVAL_FLOOR, selectWorkDelivery, slowestApproval, type WorkDef } from "./executive-work.js";
import { selectChairRunner } from "./appointments.js";

// A grant program as project delivery: awards made, each project cleared by
// the review another body owns, then built, then finished on time or late.
//
// A queue is the wrong model for this work. Nothing arrives to be decided; a
// department picks projects, and each one then spends months in a review the
// department does not run and years being built at the pace the department
// can manage. So a project moves through two serial stages. The first is the
// approval its work declares (an environmental review, a construction license):
// it advances at the approving body's pace, and stops when that body is not
// clearing its stage at all. The second is construction, at the owner's own
// delivery. A healthy department cannot build what has not been approved.
//
// The Secretary is read in one place: the award. The Secretary's office picks
// the projects, and a competent one picks projects that arrive further through
// their review. That is a choice the department controls, unlike the review's
// pace, which belongs to the reviewing body.
//
// Only the projects underway and the running totals are stored; late counts
// and stage counts are derived on read.

export type ProjectId = "highway-grants" | "reactor-demonstrations";

export type ProjectDefinition = {
  readonly id: ProjectId;
  readonly name: string;
  /** What one award is, in prose. */
  readonly unit: string;
  readonly portfolio: RoleId;
  /** The owner builds; an approval edge is the review each project must clear first. */
  readonly work: WorkDef;
  /** One award every this many weeks. */
  readonly awardEveryWeeks: number;
  /** The review, in weeks at the pace the department plans on. */
  readonly reviewWeeks: number;
  /** Construction, in weeks at the pace the department plans on. */
  readonly buildWeeks: number;
};

export type Project = {
  /** The week the award was made; before the record began for an inherited project. */
  readonly awarded: number;
  /** Share of the review done, 0..1. */
  readonly review: number;
  /** Share of construction done, 0..1; it starts only when the review is done. */
  readonly build: number;
};

export type ProjectWeek = {
  readonly awarded: number;
  /** The review share the week's award arrived with; absent when nothing was awarded. */
  readonly readyAtAward?: number;
  readonly reviewed: number;
  readonly completed: number;
  readonly completedLate: number;
};

export type ProjectRuntime = {
  readonly id: ProjectId;
  readonly openedTurn: number;
  readonly underway: readonly Project[];
  /** Finished since the record began, and of those, how many past their plan. */
  readonly completed: number;
  readonly completedLate: number;
  readonly last?: ProjectWeek;
};

/** How fast each stage moves this week, as the delivery of the body that runs it, 0..1. */
export type ProjectPace = {
  readonly review: number;
  readonly build: number;
  /** The reviewing body, when there is one. */
  readonly reviewer?: InstitutionId;
};

// A department plans its schedule on a body working at this delivery. Faster
// than this finishes early; slower runs late.
export const PLAN_PACE = 0.7;
// The most of its review a project can arrive with: even the best-chosen
// project still has the reviewing body's own decision ahead of it.
export const READY_AT_AWARD_MAX = 0.6;

export function plannedWeeks(def: ProjectDefinition): number {
  return def.reviewWeeks + def.buildWeeks;
}

export function isLate(project: Project, def: ProjectDefinition, turn: number): boolean {
  return turn - project.awarded > plannedWeeks(def);
}

/** The share of construction a project of this age would have done on plan, with its review done first. */
function onPlan(age: number, def: ProjectDefinition): Project {
  if (age < def.reviewWeeks) return { awarded: 0, review: age / def.reviewWeeks, build: 0 };
  return { awarded: 0, review: 1, build: (age - def.reviewWeeks) / def.buildWeeks };
}

/**
 * The pipeline a department already has when its record begins: one award per
 * interval back across the plan, each where the plan would have it. None is
 * late, because nothing on the record says it is; it is the same assumption a
 * new campaign makes.
 */
export function openingProjects(def: ProjectDefinition, turn: number): ProjectRuntime {
  const count = Math.ceil(plannedWeeks(def) / def.awardEveryWeeks) - 1;
  const underway = Array.from({ length: Math.max(0, count) }, (_, index) => {
    const age = (index + 1) * def.awardEveryWeeks;
    return { ...onPlan(age, def), awarded: turn - age };
  });
  return { id: def.id, openedTurn: turn, underway, completed: 0, completedLate: 0 };
}

// Weekly steps of 1/n do not sum to exactly 1 in floating point; a stage this
// close to done is done, or a project on plan would finish a week late.
const DONE = 1 - 1e-9;

function step(share: number, pace: number, weeks: number): number {
  const next = share + pace / (PLAN_PACE * weeks);
  return next >= DONE ? 1 : next;
}

function advance(project: Project, def: ProjectDefinition, pace: ProjectPace): Project {
  if (project.review < 1) return { ...project, review: step(project.review, pace.review, def.reviewWeeks) };
  return { ...project, build: step(project.build, pace.build, def.buildWeeks) };
}

/**
 * One week of a program. `readiness` is how far through its review the week's
 * award arrives, from whoever signs it; read only in a week an award is due.
 *
 * Every project is counted once: those underway, plus the award, less those
 * finished, are underway next week.
 */
export function projectTick(runtime: ProjectRuntime, def: ProjectDefinition, pace: ProjectPace, turn: number, readiness: number): ProjectRuntime {
  const due = (turn - runtime.openedTurn) % def.awardEveryWeeks === 0;
  const award: readonly Project[] = due ? [{ awarded: turn, review: readiness, build: 0 }] : [];
  const moved = [...runtime.underway.map((project) => advance(project, def, pace)), ...award];
  const reviewed = runtime.underway.filter((project, index) => project.review < 1 && moved[index]!.review >= 1).length;
  const finished = moved.filter((project) => project.build >= 1);
  const completedLate = finished.filter((project) => isLate(project, def, turn)).length;
  return {
    ...runtime,
    underway: moved.filter((project) => project.build < 1),
    completed: runtime.completed + finished.length,
    completedLate: runtime.completedLate + completedLate,
    last: { awarded: award.length, ...(due ? { readyAtAward: readiness } : {}), reviewed, completed: finished.length, completedLate },
  };
}

// --- The programs ------------------------------------------------------------

const seat = (id: string): RoleId => id as RoleId;

export const PROJECTS: readonly ProjectDefinition[] = [
  {
    // Federal-aid highway and transit grants clear an environmental review
    // before a shovel goes in; the Environmental Protection Agency is the
    // review the model names, and Transportation cannot build around it.
    id: "highway-grants",
    name: "Highway and transit grants",
    unit: "projects",
    portfolio: seat("role-transportation-secretary"),
    work: {
      id: "highway-grants",
      name: "Grant projects",
      owner: "INST-DOT",
      authority: "infrastructure-grants",
      dependencies: [{ kind: "approval", institution: "INST-EPA", authority: "permitting" }],
    },
    awardEveryWeeks: 4,
    reviewWeeks: 26,
    buildWeeks: 78,
  },
  {
    // A demonstration reactor cannot be built without a construction permit
    // from the Nuclear Regulatory Commission, an independent commission the
    // President does not direct; the Energy Department funds and builds.
    id: "reactor-demonstrations",
    name: "Advanced reactor demonstrations",
    unit: "reactors",
    portfolio: seat("role-energy-secretary"),
    work: {
      id: "reactor-demonstrations",
      name: "Reactor demonstrations",
      owner: "INST-DOE",
      authority: "research",
      dependencies: [{ kind: "approval", institution: "INST-NRC", authority: "nuclear-licensing" }],
    },
    awardEveryWeeks: 26,
    reviewWeeks: 78,
    buildWeeks: 156,
  },
];

export function projectDefinition(id: ProjectId): ProjectDefinition | undefined {
  return PROJECTS.find((def) => def.id === id);
}

/** The department a program rolls up to: its owner if the owner is one, else the owner's parent. */
export function projectDepartment(def: ProjectDefinition): InstitutionId {
  const owner = institutionDef(def.work.owner);
  return owner?.kind === "department" || owner?.parent === undefined ? def.work.owner : owner.parent;
}

/** How fast each stage moves this week: the slowest review body, stopped below the approval floor, then the owner. */
export function selectProjectPace(campaign: Campaign, def: ProjectDefinition): ProjectPace {
  const reviewer = slowestApproval(campaign, def.work);
  const build = selectWorkDelivery(campaign, { ...def.work, dependencies: def.work.dependencies.filter((edge) => edge.kind === "support") }).capacity;
  if (!reviewer) return { review: build, build };
  return { review: reviewer.quality < APPROVAL_FLOOR ? 0 : reviewer.quality, build, reviewer: reviewer.institution };
}

/**
 * How far through its review the program's next award arrives: the competence
 * of whoever runs the portfolio, acting or confirmed. With nobody in the chair
 * the career staff award down the list, and the project starts its review at
 * the beginning.
 */
export function awardReadiness(campaign: Campaign, def: ProjectDefinition): number {
  const runner = selectChairRunner(campaign, def.portfolio);
  return runner?.alive ? READY_AT_AWARD_MAX * runner.base.competence : 0;
}

/**
 * The week of every program. A save from before programs were tracked has
 * none; each opens this week with the pipeline a new campaign assumes, and
 * records from here.
 */
export const projectPhase: TurnPhase = (state: Campaign) => {
  const projects = PROJECTS.map((def) =>
    projectTick(state.projects?.[def.id] ?? openingProjects(def, state.turn), def, selectProjectPace(state, def), state.turn, awardReadiness(state, def)),
  );
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", systems: ["institutions"] },
      narration: { summary: "The departments' grant projects move through review and construction." },
      effects: [{ kind: "institution", projects }],
    },
  ];
};
