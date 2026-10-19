import { institutionDef } from "./institutions.js";
import { APPROVAL_FLOOR, selectWorkDelivery, slowestApproval } from "./executive-work.js";
import { selectChairRunner } from "./appointments.js";
// A department plans its schedule on a body working at this delivery. Faster
// than this finishes early; slower runs late.
export const PLAN_PACE = 0.7;
// The most of its review a project can arrive with: even the best-chosen
// project still has the reviewing body's own decision ahead of it.
export const READY_AT_AWARD_MAX = 0.6;
export function plannedWeeks(def) {
    return def.reviewWeeks + def.buildWeeks;
}
export function isLate(project, def, turn) {
    return turn - project.awarded > plannedWeeks(def);
}
/** The share of construction a project of this age would have done on plan, with its review done first. */
function onPlan(age, def) {
    if (age < def.reviewWeeks)
        return { awarded: 0, review: age / def.reviewWeeks, build: 0 };
    return { awarded: 0, review: 1, build: (age - def.reviewWeeks) / def.buildWeeks };
}
/**
 * The pipeline a department already has when its record begins: one award per
 * interval back across the plan, each where the plan would have it. None is
 * late, because nothing on the record says it is; it is the same assumption a
 * new campaign makes.
 */
export function openingProjects(def, turn) {
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
function step(share, pace, weeks) {
    const next = share + pace / (PLAN_PACE * weeks);
    return next >= DONE ? 1 : next;
}
function advance(project, def, pace) {
    if (project.review < 1)
        return { ...project, review: step(project.review, pace.review, def.reviewWeeks) };
    return { ...project, build: step(project.build, pace.build, def.buildWeeks) };
}
/**
 * One week of a program. `readiness` is how far through its review the week's
 * award arrives, from whoever signs it; read only in a week an award is due.
 *
 * Every project is counted once: those underway, plus the award, less those
 * finished, are underway next week.
 */
export function projectTick(runtime, def, pace, turn, readiness) {
    const due = (turn - runtime.openedTurn) % def.awardEveryWeeks === 0;
    const award = due ? [{ awarded: turn, review: readiness, build: 0 }] : [];
    const moved = [...runtime.underway.map((project) => advance(project, def, pace)), ...award];
    const reviewed = runtime.underway.filter((project, index) => project.review < 1 && moved[index].review >= 1).length;
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
const seat = (id) => id;
export const PROJECTS = [
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
export function projectDefinition(id) {
    return PROJECTS.find((def) => def.id === id);
}
/** The department a program rolls up to: its owner if the owner is one, else the owner's parent. */
export function projectDepartment(def) {
    const owner = institutionDef(def.work.owner);
    return owner?.kind === "department" || owner?.parent === undefined ? def.work.owner : owner.parent;
}
/** How fast each stage moves this week: the slowest review body, stopped below the approval floor, then the owner. */
export function selectProjectPace(campaign, def) {
    const reviewer = slowestApproval(campaign, def.work);
    const build = selectWorkDelivery(campaign, { ...def.work, dependencies: def.work.dependencies.filter((edge) => edge.kind === "support") }).capacity;
    if (!reviewer)
        return { review: build, build };
    return { review: reviewer.quality < APPROVAL_FLOOR ? 0 : reviewer.quality, build, reviewer: reviewer.institution };
}
/**
 * How far through its review the program's next award arrives: the competence
 * of whoever runs the portfolio, acting or confirmed. With nobody in the chair
 * the career staff award down the list, and the project starts its review at
 * the beginning.
 */
export function awardReadiness(campaign, def) {
    const runner = selectChairRunner(campaign, def.portfolio);
    return runner?.alive ? READY_AT_AWARD_MAX * runner.base.competence : 0;
}
/**
 * The week of every program. A save from before programs were tracked has
 * none; each opens this week with the pipeline a new campaign assumes, and
 * records from here.
 */
export const projectPhase = (state) => {
    const projects = PROJECTS.map((def) => projectTick(state.projects?.[def.id] ?? openingProjects(def, state.turn), def, selectProjectPace(state, def), state.turn, awardReadiness(state, def)));
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
