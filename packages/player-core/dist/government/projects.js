import { PLAN_PACE, PROJECTS, awardReadiness, institutionDef, institutionOpening, isLate, plannedWeeks, projectDepartment, selectProjectPace, } from "@admin/engine";
import { institutionReason } from "./delivery.js";
const STATUS_LABELS = {
    opening: "Not yet tracked",
    "on-schedule": "On schedule",
    slipping: "Slipping",
    failing: "Failing",
    stalled: "Stuck in review",
};
const STATUS_TONES = {
    opening: "neutral",
    "on-schedule": "good",
    slipping: "watch",
    failing: "bad",
    stalled: "bad",
};
const SEVERITY = ["stalled", "failing", "slipping", "on-schedule", "opening"];
// Past this share of projects late a program is failing rather than slipping.
const FAILING_LATE = 0.5;
function nameOf(id) {
    return institutionDef(id)?.name ?? id;
}
/** What to tell the President about a body the President cannot direct. */
export function independentAction(name) {
    return `${institutionOpening(name)} is independent, so you can't give it orders. The work goes only as fast as it does.`;
}
function countsOf(runtime, def, turn) {
    const late = runtime.underway.filter((project) => isLate(project, def, turn));
    const onTime = runtime.underway.filter((project) => !isLate(project, def, turn));
    return { reviewing: onTime.filter((project) => project.review < 1).length, building: onTime.filter((project) => project.review >= 1).length, late: late.length };
}
function statusOf(runtime, pace, counts) {
    const inReview = runtime.underway.some((project) => project.review < 1);
    if (pace.reviewer && pace.review === 0 && inReview)
        return "stalled";
    const underway = runtime.underway.length;
    if (underway > 0 && counts.late / underway >= FAILING_LATE)
        return "failing";
    const slowReview = inReview && pace.review < PLAN_PACE;
    const slowBuild = runtime.underway.some((project) => project.review >= 1) && pace.build < PLAN_PACE;
    return counts.late > 0 || slowReview || slowBuild ? "slipping" : "on-schedule";
}
/** The body holding the program back, if one is: the review first, because nothing is built before it clears. */
function holdingBody(def, pace) {
    if (pace.reviewer && pace.review < PLAN_PACE)
        return pace.reviewer;
    return pace.build < PLAN_PACE ? def.work.owner : undefined;
}
function whyOf(status, def, pace, counts, underway) {
    const holder = holdingBody(def, pace);
    if (status === "stalled")
        return `${institutionOpening(nameOf(pace.reviewer))} isn't finishing its reviews, so no ${def.unit} can start being built.`;
    if (status === "failing")
        return `${counts.late} of ${underway} ${def.unit} are behind their ${plannedWeeks(def)}-week schedule.`;
    if (status === "slipping" && holder === pace.reviewer && holder)
        return `Reviews at ${nameOf(holder)} are taking longer than planned. ${counts.reviewing} ${def.unit} are waiting on them.`;
    if (status === "slipping" && holder)
        return `${institutionOpening(nameOf(holder))} is building more slowly than planned.`;
    if (status === "slipping")
        return `${counts.late} of ${underway} ${def.unit} are behind their ${plannedWeeks(def)}-week schedule.`;
    return `${underway} ${def.unit} on schedule, with ${counts.reviewing} in review and ${counts.building} being built.`;
}
function actionOf(campaign, status, def, pace, seatTitle) {
    if (status === "on-schedule")
        return "Nothing needed.";
    const body = holdingBody(def, pace) ?? def.work.owner;
    if (body !== def.work.owner && institutionDef(body)?.independence === "independent") {
        return `${independentAction(nameOf(body))} The ${seatTitle} still chooses which ${def.unit} to fund. The ones further along in review wait less.`;
    }
    return `${nameOf(body)}: ${institutionReason(campaign, body)}.`;
}
function stagesOf(counts) {
    return [
        { key: "review", label: "In review", count: counts.reviewing },
        { key: "build", label: "Being built", count: counts.building },
        { key: "late", label: "Behind schedule", count: counts.late },
    ];
}
function rowOf(campaign, def, nodes) {
    const runtime = campaign.projects?.[def.id];
    const pace = selectProjectPace(campaign, def);
    const department = projectDepartment(def);
    const node = nodes.get(def.work.owner) ?? nodes.get(department);
    const seatTitle = nodes.get(department)?.title ?? "Secretary";
    const tracked = runtime?.last !== undefined;
    const counts = runtime ? countsOf(runtime, def, campaign.turn) : { reviewing: 0, building: 0, late: 0 };
    const status = runtime && tracked ? statusOf(runtime, pace, counts) : "opening";
    const underway = runtime?.underway.length ?? 0;
    return {
        id: def.id,
        name: def.name,
        unit: def.unit,
        department: nameOf(department),
        owner: nameOf(def.work.owner),
        ...(pace.reviewer ? { reviewer: nameOf(pace.reviewer) } : {}),
        href: node?.href ?? "",
        emblem: node?.emblem ?? "",
        status,
        statusLabel: STATUS_LABELS[status],
        tone: STATUS_TONES[status],
        plannedWeeks: plannedWeeks(def),
        stages: stagesOf(counts),
        underway,
        completed: runtime?.completed ?? 0,
        completedLate: runtime?.completedLate ?? 0,
        nextAwardReady: awardReadiness(campaign, def),
        why: tracked ? whyOf(status, def, pace, counts, underway) : "Its record starts at the end of this week.",
        action: tracked ? actionOf(campaign, status, def, pace, seatTitle) : "Nothing yet.",
    };
}
function summaryOf(rows) {
    if (rows.every((row) => row.status === "opening"))
        return "Tracking of the departments' grant projects starts at the end of this week.";
    const onSchedule = rows.filter((row) => row.status === "on-schedule").length;
    const worst = rows[0];
    const lead = `${onSchedule} of ${rows.length} programs on schedule.`;
    return worst.status === "on-schedule" ? lead : `${lead} The worst is ${worst.name.toLowerCase()}: ${worst.statusLabel.toLowerCase()}.`;
}
export function departmentProjects(campaign, nodes) {
    const rows = PROJECTS.map((def) => rowOf(campaign, def, nodes)).sort((a, b) => SEVERITY.indexOf(a.status) - SEVERITY.indexOf(b.status) || a.name.localeCompare(b.name));
    return { rows, summary: summaryOf(rows), scale: Math.max(1, ...rows.map((row) => row.underway)) };
}
