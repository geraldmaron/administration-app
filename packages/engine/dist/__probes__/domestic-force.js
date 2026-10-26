import { STATE_IDS } from "@admin/world";
import { balanceSeeds, playCampaign } from "../balance-harness.js";
import { apply } from "../effects.js";
import { selectActiveConditions } from "../state.js";
import { conditionFlagsToSet, conditionId } from "../condition-onset.js";
import { markedFlags } from "../marked-flags.js";
import { takeLocaleAct } from "../locale-act-effects.js";
import { localeAct, localeAvailability, openRequests } from "../locale-acts.js";
import { federalServiceGround, insurrectionGround, insurrectionGrounds, liveLocaleMissions, liveProclamation, unrestReaching, } from "../locale-missions.js";
import { requestCourtOrder } from "../court-orders.js";
export const SCENARIOS = {
    S0: { id: "S0", label: "natural: no planted unrest" },
    S1: { id: "S1", label: "unrest 0.6 in Minnesota, governor opposed at 0.30, protest +0.10",
        shock: { severity: 0.6, disposition: 0.3, protest: 0.1 } },
    S2: { id: "S2", label: "unrest 0.5 in Minnesota, governor assenting at 0.60",
        shock: { severity: 0.5, disposition: 0.6, protest: 0 } },
    S3: { id: "S3", label: "S1 with national insurgency pressure at 0.25",
        shock: { severity: 0.6, disposition: 0.3, protest: 0.1, insurgency: 0.25 } },
    // §252 answers federal law the ordinary course could not enforce. In S1 the
    // missions bring the unrest under 0.5 before an injunction can be granted
    // and defied, which is the statute working; this is the case where it fails.
    S4: { id: "S4", label: "persistent unrest: 0.9 in Minnesota, governor opposed at 0.30, protest +0.25",
        shock: { severity: 0.9, disposition: 0.3, protest: 0.25 } },
};
export const POLICY_LABELS = {
    P0: "never acts",
    P1: "assent path: task force, priority, Guard request, §251 troops only",
    P2: "escalates: property surge, priority, court applications, proclaim then troops, federalize, one re-up",
    P3: "spams every force act and application every week",
};
/** The balance grid's scenarios. S4 is census-only: it exists to open §252, and a year of it costs eight more runs per policy. */
export const SCENARIO_IDS = ["S0", "S1", "S2", "S3"];
export const POLICY_IDS = ["P0", "P1", "P2", "P3"];
export const DESIGNED = ["S1", "S2", "S3"];
export const TARGET = "MN";
/** The week the scenario's unrest is planted: a month in, so the opening program has landed first. */
export const INJECT_STEP = 4;
export const WEEKS = 52;
export const SEED_COUNT = 8;
export const domesticForceSeeds = (count = SEED_COUNT) => balanceSeeds(count);
const GROUND_KEYS = ["251", "252", "253", "regular-forces", "rebellion", "invasion", "proclamation", "surveil-under-order"];
const zeroTally = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
const EMPTY_NATURAL = {
    weeks: 0, reachingStateWeeks: 0, placedStateWeeks: 0, nationOnlyStateWeeks: 0, nationOnly253: 0,
    open: zeroTally(["251", "252", "253"]), troopsPathWeeks: 0, rebellionWeeks: 0,
};
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value) => Math.min(1, Math.max(0, value));
// --- The planted unrest ---
/**
 * The scenario's shock as one world packet: the unrest condition placed in
 * the target state, the governor's disposition set, and the national pressures
 * moved. Planted once; from then on the world's own weekly rules run it.
 */
export function injectionPacket(campaign, scenario) {
    const shock = SCENARIOS[scenario].shock;
    const us = campaign.founding.nation;
    const nation = campaign.nations[us];
    if (!shock || !nation)
        return undefined;
    const condition = {
        id: conditionId("unrest", us, campaign.turn, TARGET), nation: us, kind: "unrest", scope: "region",
        severity: shock.severity, startedTurn: campaign.turn, status: "active",
        beats: [{ turn: campaign.turn, description: "Unrest breaks out across Minnesota." }],
        place: TARGET, state: TARGET,
    };
    const governor = campaign.states[TARGET]?.governor;
    const effects = [
        { kind: "condition", set: condition },
        { kind: "flag", set: markedFlags(conditionFlagsToSet(condition), campaign.turn) },
        ...(governor ? [{ kind: "state", state: TARGET, reason: "The probe sets the governor's standing.",
                setGovernor: { ...governor, disposition: shock.disposition } }] : []),
        { kind: "nationStat", nation: us, setStats: {
                politics: { protestPressure: round3(clamp01(nation.stats.politics.protestPressure + shock.protest)) },
                ...(shock.insurgency !== undefined ? { security: { insurgencyPressure: shock.insurgency } } : {}),
            } },
    ];
    return { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "Unrest breaks out across Minnesota." }, effects };
}
const act = (id, when = () => true) => ({
    label: id,
    take: (state, target) => (when(state, target) ? takeLocaleAct(state, target, id, "unrest") : undefined),
});
const application = (kind) => ({
    label: `apply:${kind}`,
    take: (state, target) => {
        const result = requestCourtOrder(state, target, kind);
        return result.ok && !result.filed ? { ok: false, reason: "Justice did not file" } : result;
    },
});
const missionLive = (state, target, id) => liveLocaleMissions(state, target).some((mission) => mission.act === id);
const notLive = (id) => (state, target) => !missionLive(state, target, id);
/** Troop orders this administration has signed for the state, so a re-up is counted off the record, not a counter. */
function troopSends(state, target) {
    return state.orders.filter((record) => record.subject?.kind === "locale-mission"
        && record.subject.act === "troops" && record.subject.state === target).length;
}
const quiet = (state, target) => !liveProclamation(state, target) && !missionLive(state, target, "troops");
const ASSENT_PATH = [
    act("task-force", notLive("task-force")),
    act("priority", notLive("priority")),
    act("request-deployment", (state, target) => openRequests(state, target).length > 0),
    act("proclaim", (state, target) => insurrectionGround(state, target) === "251" && quiet(state, target)),
    act("troops", (state, target) => {
        const subject = liveProclamation(state, target)?.subject;
        return subject?.kind === "locale-mission" && subject.ground === "251" && !missionLive(state, target, "troops");
    }),
];
/** One troop mission and one re-up: a third would be the spam policy's. */
const MAX_TROOP_SENDS = 2;
const ESCALATION = [
    act("property-surge", notLive("property-surge")),
    act("priority", notLive("priority")),
    application("injunction-enforcement"),
    // Not on the plan's escalation list; without it no surveillance order ever
    // exists in the run and the surveillance path could not be counted at all.
    application("title-iii-order"),
    act("proclaim", (state, target) => insurrectionGround(state, target) !== undefined && quiet(state, target)
        && troopSends(state, target) < MAX_TROOP_SENDS),
    act("troops", (state, target) => liveProclamation(state, target) !== undefined && !missionLive(state, target, "troops")
        && troopSends(state, target) < MAX_TROOP_SENDS),
    act("federalize", (state, target) => federalServiceGround(state, target) !== undefined && !missionLive(state, target, "federalize")),
];
const SPAM = [
    ...["property-surge", "task-force", "priority", "immigration-operation", "proclaim", "troops", "federalize", "surveil-under-order"]
        .map((id) => act(id)),
    application("injunction-enforcement"),
    application("title-iii-order"),
    application("search-warrant"),
];
const POLICIES = { P0: [], P1: ASSENT_PATH, P2: ESCALATION, P3: SPAM };
/** An incident's own opinion move: integrity and unity both charged, which no other locale effect does together. */
function incidentsIn(packet) {
    return packet.effects.filter((effect) => effect.kind === "opinion"
        && (effect.deltas.integrity ?? 0) < 0 && (effect.deltas.unity ?? 0) < 0).length;
}
/** Walk the policy's steps in order, each against the state the last one left. */
export function policyWeek(state, policy, target) {
    return POLICIES[policy].reduce((week, step) => {
        const taken = step.take(week.state, target);
        if (!taken?.ok)
            return week;
        return { state: apply(week.state, taken.packet), packets: [...week.packets, taken.packet],
            acts: [...week.acts, step.label], incidents: week.incidents + incidentsIn(taken.packet) };
    }, { state, packets: [], acts: [], incidents: 0 });
}
// --- The census, read each week on the state the President acts on ---
function homeUnrest(campaign) {
    return selectActiveConditions(campaign).filter((condition) => condition.nation === campaign.founding.nation && condition.kind === "unrest");
}
/** The state a policy aims at: the target in a designed scenario, else the worst placed unrest at home. */
export function policyTarget(campaign, scenario) {
    if (scenario !== "S0")
        return unrestReaching(campaign, TARGET) ? TARGET : undefined;
    return homeUnrest(campaign).filter((condition) => condition.state !== undefined)
        .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))[0]?.state;
}
const add = (tally, key, by = 1) => (by === 0 ? tally : { ...tally, [key]: tally[key] + by });
/** Fold one week of every home state into the natural tally. */
export function observeNatural(tally, campaign) {
    const unrest = homeUnrest(campaign);
    const national = unrest.some((condition) => condition.state === undefined);
    const placed = new Set(unrest.flatMap((condition) => (condition.state ? [condition.state] : [])));
    const reached = national ? STATE_IDS : STATE_IDS.filter((state) => placed.has(state));
    const rows = reached.map((state) => ({ state, grounds: insurrectionGrounds(campaign, state), placed: placed.has(state) }));
    const nationOnly = rows.filter((row) => !row.placed);
    const opened = (ground) => rows.filter((row) => row.grounds[ground]).length;
    return {
        weeks: tally.weeks + 1,
        reachingStateWeeks: tally.reachingStateWeeks + rows.length,
        placedStateWeeks: tally.placedStateWeeks + placed.size,
        nationOnlyStateWeeks: tally.nationOnlyStateWeeks + nationOnly.length,
        nationOnly253: tally.nationOnly253 + nationOnly.filter((row) => row.grounds["253"]).length,
        open: { "251": tally.open["251"] + opened("251"), "252": tally.open["252"] + opened("252"), "253": tally.open["253"] + opened("253") },
        troopsPathWeeks: tally.troopsPathWeeks + (rows.some((row) => row.grounds["251"] || row.grounds["253"]) ? 1 : 0),
        rebellionWeeks: tally.rebellionWeeks + (federalServiceGround(campaign, TARGET) === "rebellion" ? 1 : 0),
    };
}
/** Which paths are open in one state this week. */
export function openPaths(campaign, state) {
    const grounds = insurrectionGrounds(campaign, state);
    const service = federalServiceGround(campaign, state);
    const surveil = localeAct("surveil-under-order");
    const open = [
        grounds["251"] && "251", grounds["252"] && "252", grounds["253"] && "253",
        service === "regular-forces" && "regular-forces", service === "rebellion" && "rebellion", service === "invasion" && "invasion",
        liveProclamation(campaign, state) !== undefined && "proclamation",
        surveil !== undefined && localeAvailability(campaign, state, surveil, "unrest").ok && "surveil-under-order",
    ];
    return new Set(open.filter((key) => key !== false));
}
function trackTarget(tracker, campaign, step) {
    if (step < INJECT_STEP)
        return tracker;
    const open = openPaths(campaign, TARGET);
    const openWeeks = GROUND_KEYS.reduce((tally, key) => add(tally, key, open.has(key) ? 1 : 0), tracker.openWeeks);
    const firstOpen = Object.fromEntries([...open].filter((key) => tracker.firstOpen[key] === undefined).map((key) => [key, step - INJECT_STEP]));
    return { ...tracker, openWeeks, firstOpen: { ...tracker.firstOpen, ...firstOpen } };
}
function countActs(acts, taken) {
    return taken.reduce((tally, label) => ({ ...tally, [label]: (tally[label] ?? 0) + 1 }), acts);
}
/** One week of the President's habit: plant the shock on its week, census the state, then act. */
function decideWeek(tracker, campaign, step, scenario, policy) {
    const planted = step === INJECT_STEP ? injectionPacket(campaign, scenario) : undefined;
    const state = planted ? apply(campaign, planted) : campaign;
    const injectedId = planted ? conditionId("unrest", campaign.founding.nation, campaign.turn, TARGET) : undefined;
    const observed = trackTarget({ ...tracker, natural: observeNatural(tracker.natural, state),
        ...(injectedId ? { injectedId } : {}) }, state, step);
    const target = step >= INJECT_STEP ? policyTarget(state, scenario) : undefined;
    const week = target ? policyWeek(state, policy, target) : undefined;
    const next = week
        ? { ...observed, acts: countActs(observed.acts, week.acts), incidents: observed.incidents + week.incidents } : observed;
    return { tracker: next, packets: [...(planted ? [planted] : []), ...(week?.packets ?? [])] };
}
function observeAfter(tracker, campaign) {
    const step = tracker.observed;
    const condition = tracker.injectedId ? campaign.conditions[tracker.injectedId] : undefined;
    const closed = tracker.injectedId !== undefined && tracker.resolvedStep === undefined && condition?.status !== "active";
    return {
        ...tracker,
        observed: step + 1,
        protest: campaign.nations[campaign.founding.nation]?.stats.politics.protestPressure ?? tracker.protest,
        ...(closed ? { resolvedStep: step } : {}),
    };
}
const START = { natural: EMPTY_NATURAL, openWeeks: zeroTally(GROUND_KEYS), firstOpen: {}, acts: {}, incidents: 0, observed: 0, protest: 0 };
export function runDomesticForce(scenario, policy, seed, weeks = WEEKS) {
    let tracker = START;
    const outcome = playCampaign(seed, "passive", weeks, undefined, undefined, {
        decide: (state, step) => {
            const decided = decideWeek(tracker, state, step, scenario, policy);
            tracker = decided.tracker;
            return decided.packets;
        },
        observeWeek: (state) => {
            tracker = observeAfter(tracker, state);
        },
    });
    const planted = tracker.injectedId !== undefined;
    const resolved = tracker.resolvedStep !== undefined;
    return {
        scenario, policy, seed,
        ...(planted ? { resolved, weeksToResolve: resolved ? tracker.resolvedStep - INJECT_STEP + 1 : tracker.observed - INJECT_STEP + 1 } : {}),
        standingChange: round3(outcome.final.standing - outcome.opening.standing),
        approvalChange: round3((outcome.final.approval - outcome.opening.approval) * 100),
        peakPressure: outcome.peakPressure,
        removed: outcome.removed,
        finalProtest: round3(tracker.protest),
        incidents: tracker.incidents,
        acts: tracker.acts,
        targetOpenWeeks: tracker.openWeeks,
        targetFirstOpen: tracker.firstOpen,
        natural: tracker.natural,
        turnsPlayed: outcome.turnsPlayed,
    };
}
export const FULL_GRID = SCENARIO_IDS.flatMap((scenario) => POLICY_IDS.map((policy) => ({ scenario, policy })));
export function runGrid(cells, seeds = domesticForceSeeds(), weeks = WEEKS) {
    return cells.flatMap((cell) => seeds.map((seed) => runDomesticForce(cell.scenario, cell.policy, seed, weeks)));
}
// --- Summaries and paired comparisons ---
export function median(values) {
    if (values.length === 0)
        return Number.NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export const cellRuns = (runs, scenario, policy) => runs.filter((run) => run.scenario === scenario && run.policy === policy);
export const METRICS = {
    weeks: (run) => run.weeksToResolve ?? Number.NaN,
    standing: (run) => run.standingChange,
    approval: (run) => run.approvalChange,
    pressure: (run) => run.peakPressure,
    protest: (run) => run.finalProtest,
    incidents: (run) => run.incidents,
};
/** Per-seed pairs of two policies in one scenario, matched by seed. */
export function paired(runs, scenario, a, b) {
    const others = new Map(cellRuns(runs, scenario, b).map((run) => [run.seed, run]));
    return cellRuns(runs, scenario, a).flatMap((run) => {
        const other = others.get(run.seed);
        return other ? [[run, other]] : [];
    });
}
/** The median over seeds of a's metric less b's. */
export const pairedDifference = (runs, scenario, a, b, metric) => median(paired(runs, scenario, a, b).map(([x, y]) => metric(x) - metric(y)));
/** The median over seeds of a's metric over b's. */
export const pairedRatio = (runs, scenario, a, b, metric) => median(paired(runs, scenario, a, b).map(([x, y]) => metric(x) / metric(y)));
/**
 * Whether a run is at least as good as another on every axis a President
 * weighs and better on one: faster to resolve, more standing, more approval,
 * less removal pressure.
 */
export function dominates(a, b) {
    const axes = [
        METRICS.weeks(b) - METRICS.weeks(a), a.standingChange - b.standingChange, a.approvalChange - b.approvalChange, b.peakPressure - a.peakPressure,
    ];
    return axes.every((gap) => gap >= 0) && axes.some((gap) => gap > 0);
}
export const dominatedSeeds = (runs, scenario, a, b) => paired(runs, scenario, a, b).filter(([x, y]) => dominates(x, y)).length;
const fixed = (value, digits = 3) => (Number.isFinite(value) ? value.toFixed(digits) : "  n/a");
function actsLine(runs) {
    const totals = runs.reduce((tally, run) => Object.entries(run.acts).reduce((inner, [label, count]) => ({ ...inner, [label]: (inner[label] ?? 0) + count }), tally), {});
    const entries = Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.length ? entries.map(([label, count]) => `${label} ${fixed(count / runs.length, 1)}`).join(", ") : "none";
}
/** One scenario's table: a row per policy, medians over seeds. */
export function scenarioTable(runs, scenario) {
    const header = `[${scenario}] ${SCENARIOS[scenario].label}\n  policy  n  weeks(res)  standingΔ  approvalΔpts  peakPress  removed  protest52  incidents`;
    const rows = POLICY_IDS.flatMap((policy) => {
        const cell = cellRuns(runs, scenario, policy);
        if (cell.length === 0)
            return [];
        const resolved = cell.filter((run) => run.resolved).length;
        const removed = cell.filter((run) => run.removed).length;
        return [`  ${policy}      ${cell.length}  ${fixed(median(cell.map(METRICS.weeks)), 1)}(${resolved})    ${fixed(median(cell.map(METRICS.standing)))}`
                + `     ${fixed(median(cell.map(METRICS.approval)), 2)}        ${fixed(median(cell.map(METRICS.pressure)))}      ${removed}       `
                + `${fixed(median(cell.map(METRICS.protest)))}      ${fixed(median(cell.map(METRICS.incidents)), 1)}\n      acts/run: ${actsLine(cell)}`];
    });
    return [header, ...rows].join("\n");
}
/** The paired comparisons the pass criteria read, printed whether or not they pass. */
export function pairedLines(runs, scenario) {
    const has = (policy) => cellRuns(runs, scenario, policy).length > 0;
    const lines = [];
    if (has("P1") && has("P2"))
        lines.push(`  P2 dominates P1 in ${dominatedSeeds(runs, scenario, "P2", "P1")} of ${paired(runs, scenario, "P2", "P1").length} seeds; `
            + `standing P2-P1 ${fixed(pairedDifference(runs, scenario, "P2", "P1", METRICS.standing))}, approval P2-P1 ${fixed(pairedDifference(runs, scenario, "P2", "P1", METRICS.approval), 2)} pts`);
    if (has("P0") && has("P1"))
        lines.push(`  weeks P1/P0 ${fixed(pairedRatio(runs, scenario, "P1", "P0", METRICS.weeks), 2)}`);
    if (has("P0") && has("P2"))
        lines.push(`  weeks P2/P0 ${fixed(pairedRatio(runs, scenario, "P2", "P0", METRICS.weeks), 2)}`);
    if (has("P2") && has("P3"))
        lines.push(`  weeks P3-P2 ${fixed(pairedDifference(runs, scenario, "P3", "P2", METRICS.weeks), 1)}, `
            + `peak pressure P3-P2 ${fixed(pairedDifference(runs, scenario, "P3", "P2", METRICS.pressure))}`);
    if (has("P0") && has("P3"))
        lines.push(`  protest52 P3-P0 ${fixed(pairedDifference(runs, scenario, "P3", "P0", METRICS.protest))}`);
    return lines.join("\n");
}
/** In how many runs of a cell each path opened at least once in the target state. */
export function openedIn(runs, key) {
    return runs.filter((run) => run.targetOpenWeeks[key] > 0).length;
}
export function pathTable(runs, cells) {
    const header = `  cell    ${GROUND_KEYS.map((key) => key.padStart(8)).join(" ")}   (runs of the cell the path opened in, target state)`;
    const rows = cells.map((cell) => {
        const runsOf = cellRuns(runs, cell.scenario, cell.policy);
        return `  ${cell.scenario}/${cell.policy}   ${GROUND_KEYS.map((key) => `${openedIn(runsOf, key)}/${runsOf.length}`.padStart(8)).join(" ")}`;
    });
    return [header, ...rows].join("\n");
}
export function naturalLine(runs) {
    const sum = (read) => runs.reduce((total, run) => total + read(run.natural), 0);
    const reaching = sum((tally) => tally.reachingStateWeeks);
    const share = (open, of) => (of > 0 ? fixed(open / of) : "n/a");
    return `  natural over ${runs.length} runs, ${sum((tally) => tally.weeks)} weeks: unrest state-weeks ${reaching} (placed ${sum((tally) => tally.placedStateWeeks)}); `
        + `open share §251 ${share(sum((tally) => tally.open["251"]), reaching)}, §252 ${share(sum((tally) => tally.open["252"]), reaching)}, `
        + `§253 ${share(sum((tally) => tally.open["253"]), reaching)}; §253 on national-only ${sum((tally) => tally.nationOnly253)}/${sum((tally) => tally.nationOnlyStateWeeks)}; `
        + `troops path in ${runs.filter((run) => run.natural.troopsPathWeeks > 0).length}/${runs.length} campaigns; `
        + `rebellion weeks ${sum((tally) => tally.rebellionWeeks)}/${sum((tally) => tally.weeks)}`;
}
