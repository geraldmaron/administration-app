import { AGE_BUCKET_EDGES, SERVICES, WEEKLY_INTAKE, ageBands, institutionDef, institutionInProse, institutionOpening, lateShare, pendingTotal, selectWorkDelivery, serviceDepartment, } from "@admin/engine";
import { institutionReason } from "./delivery.js";
import { departmentProjects, independentAction } from "./projects.js";
import { executiveTree } from "./executive-tree.js";
const STATUS_LABELS = {
    opening: "Not yet tracked",
    "keeping-up": "Keeping up",
    "falling-behind": "Falling behind",
    delayed: "Delayed",
    "cutting-corners": "Saying no to clear cases",
    failing: "Failing",
    stopped: "Stopped",
};
const STATUS_TONES = {
    opening: "neutral",
    "keeping-up": "good",
    "falling-behind": "watch",
    delayed: "watch",
    "cutting-corners": "bad",
    failing: "bad",
    stopped: "bad",
};
// Worst first, for the order rows are listed in.
const SEVERITY = ["stopped", "failing", "cutting-corners", "delayed", "falling-behind", "keeping-up", "opening"];
const AGE_LABELS = ["Under 4 weeks", "4 to 13 weeks", "13 to 26 weeks", "Over 26 weeks"];
const AGE_KEYS = ["fresh", "month", "quarter", "half"];
// Past these a service is failing rather than behind: half its cases late, or
// one decision in seven wrong.
const FAILING_LATE = 0.5;
const FAILING_WRONG = 0.15;
const BEHIND_LATE = 0.2;
const SHORTCUT_SHARE = 0.1;
const pct = (value) => `${Math.round(value * 100)}%`;
const weeksText = (value) => `${value < 10 ? value.toFixed(1) : Math.round(value)} weeks`;
function nameOf(id) {
    return institutionDef(id)?.name ?? id;
}
function statusOf(runtime, def, delivery, last) {
    if (delivery.status === "blocked")
        return "stopped";
    // Ahead of failing, because refusals pushed through under pressure are the
    // cause of the errors and the lateness a failing reading would describe.
    if (last.decided > 0 && last.pressured / last.decided >= SHORTCUT_SHARE)
        return "cutting-corners";
    const late = lateShare(runtime, def);
    const wrong = last.decided === 0 ? 0 : last.errors / last.decided;
    if (late >= FAILING_LATE || wrong >= FAILING_WRONG)
        return "failing";
    // A slow approval is only news when it is what leaves the service behind.
    const behind = last.arrivals + last.rework > last.decided + last.withdrawn || late >= BEHIND_LATE;
    if (!behind)
        return "keeping-up";
    return delivery.status === "delayed" ? "delayed" : "falling-behind";
}
function whyOf(status, row) {
    const { def, delivery, last } = row;
    const wrong = last.decided === 0 ? 0 : last.errors / last.decided;
    const binding = delivery.binding ? nameOf(delivery.binding) : "";
    if (status === "stopped")
        return `${institutionOpening(binding)} isn't giving its approvals, so no ${def.unit} can be finished.`;
    if (status === "cutting-corners")
        return `${pct(last.pressured / last.decided)} of last week's ${def.unit} were closed by ${def.shortcut?.kind === "plea" ? "forcing plea deals" : "pushing through refusals"} to shrink the pile of waiting cases, and ${pct(wrong)} of all decisions were wrong.`;
    if (status === "failing")
        return `${pct(row.late)} of ${def.unit} have waited longer than ${def.standardWeeks} weeks, and ${pct(wrong)} of last week's decisions were wrong.`;
    if (status === "delayed")
        return `Falling behind because every case needs ${institutionInProse(binding)}'s approval, and that approval comes more slowly than ${institutionInProse(nameOf(def.work.owner))} can work.`;
    if (status === "falling-behind")
        return `Deciding fewer ${def.unit} than come in. There's ${weeksText(row.pending / WEEKLY_INTAKE)} of new cases waiting, and ${pct(row.late)} have waited more than ${def.standardWeeks} weeks.`;
    return `Keeping up with new cases. ${row.late > 0 ? `${pct(row.late)} have waited` : "Nothing has waited"} more than ${def.standardWeeks} weeks.`;
}
function actionOf(campaign, status, def, delivery, seatTitle) {
    if (status === "keeping-up")
        return "Nothing needed.";
    if (status === "cutting-corners") {
        return def.shortcut?.kind === "plea"
            ? `The ${seatTitle} is letting prosecutors push people into plea deals to clear cases faster. Someone with more integrity in the job would have each case go to trial or be dropped based on the facts.`
            : `The ${seatTitle} is turning cases down instead of deciding them. Someone with more integrity in the job would decide each case properly.`;
    }
    const body = (status === "stopped" || status === "delayed") && delivery.binding ? delivery.binding : def.work.owner;
    if (body !== def.work.owner && institutionDef(body)?.independence === "independent")
        return independentAction(nameOf(body));
    const reason = institutionReason(campaign, body);
    // With nothing dragging it, the body is doing what it was built to do and
    // the work still outruns it; saying "nothing is dragging it" as the remedy
    // would point the President at nothing.
    if (reason === "Nothing is holding it back")
        return `${institutionOpening(nameOf(body))} has nothing holding it back, but it isn't big enough for this much work.`;
    return `${nameOf(body)}: ${reason}.`;
}
function ages(runtime, def) {
    const lateFrom = AGE_BUCKET_EDGES.indexOf(def.standardWeeks) + 1;
    const bands = runtime ? ageBands(runtime) : [0, 0, 0, 0];
    return AGE_KEYS.map((key, index) => ({
        key,
        label: AGE_LABELS[index],
        weeks: bands[index] / WEEKLY_INTAKE,
        late: index >= lateFrom,
    }));
}
function rowOf(campaign, def, nodes) {
    const runtime = campaign.services?.[def.id];
    const delivery = selectWorkDelivery(campaign, def.work);
    const department = serviceDepartment(def);
    const node = nodes.get(def.work.owner) ?? nodes.get(department);
    const seatTitle = nodes.get(department)?.title ?? "Secretary";
    const last = runtime?.last;
    const status = runtime && last ? statusOf(runtime, def, delivery, last) : "opening";
    const label = status === "cutting-corners" && def.shortcut?.kind === "plea" ? "Forcing plea deals to clear cases" : STATUS_LABELS[status];
    const pending = runtime ? pendingTotal(runtime) : 0;
    const late = runtime ? lateShare(runtime, def) : 0;
    return {
        id: def.id,
        name: def.name,
        department: nameOf(department),
        owner: nameOf(def.work.owner),
        href: node?.href ?? "",
        emblem: node?.emblem ?? "",
        status,
        statusLabel: label,
        tone: STATUS_TONES[status],
        standardWeeks: def.standardWeeks,
        ages: ages(runtime, def),
        pendingWeeks: pending / WEEKLY_INTAKE,
        lateShare: late,
        ...(last && last.decided > 0 ? { wrongShare: last.errors / last.decided } : {}),
        ...(def.shortcut?.kind === "refusal" && last && last.decided > 0 ? { refusedShare: last.refused / last.decided } : {}),
        why: runtime && last ? whyOf(status, { def, delivery, late, last, pending }) : "Its record starts at the end of this week.",
        action: runtime && last ? actionOf(campaign, status, def, delivery, seatTitle) : "Nothing yet.",
    };
}
function summaryOf(rows) {
    if (rows.every((row) => row.status === "opening"))
        return "Tracking of the departments' case work starts at the end of this week.";
    const keeping = rows.filter((row) => row.status === "keeping-up").length;
    const worst = rows[0];
    const lead = `${keeping} of ${rows.length} services keeping up.`;
    return worst.status === "keeping-up" ? `${lead} Nothing is behind.` : `${lead} The worst is ${worst.name.toLowerCase()}: ${worst.statusLabel.toLowerCase()}.`;
}
export function departmentServices(campaign) {
    const nodes = new Map(executiveTree(campaign)
        .flatMap((section) => section.nodes.flatMap((node) => [node, ...node.children]))
        .map((node) => [node.institution, node]));
    const rows = SERVICES.map((def) => rowOf(campaign, def, nodes)).sort((a, b) => SEVERITY.indexOf(a.status) - SEVERITY.indexOf(b.status) || a.name.localeCompare(b.name));
    const scaleWeeks = Math.max(8, Math.ceil(Math.max(...rows.map((row) => row.pendingWeeks))));
    return { rows, summary: summaryOf(rows), scaleWeeks, projects: departmentProjects(campaign, nodes) };
}
