import { economyRecord, stateApprovals } from "@admin/engine";
import { computeMilitaryMetrics, debtToGdp } from "@admin/world";
import { selfNation } from "./subjects.js";
const clamp01 = (value) => Math.min(1, Math.max(0, value));
/** A course with this week's live reading in place of any sample stamped this week. */
function withLive(campaign, points, live) {
    const settled = points.filter((point) => point.turn < campaign.turn);
    return live === undefined ? settled : [...settled, { turn: campaign.turn, value: live }];
}
/**
 * `metricHistory` carries no turn of its own: it is the week-opening reading of
 * each closed week, newest last, so its last entry is last week's and the
 * entries before it count back one week each (into the inherited quarter
 * before the oath on a young campaign).
 */
function playerCourse(campaign, key) {
    const history = campaign.player.metricHistory;
    const first = campaign.turn - history.length;
    const closed = history.map((snapshot, index) => ({ turn: first + index, value: snapshot[key] }));
    return [...closed, { turn: campaign.turn, value: campaign.player.metrics[key] }];
}
function selfRuntime(campaign) {
    return campaign.nations[selfNation(campaign)];
}
function selfStat(read) {
    return (campaign) => {
        const runtime = selfRuntime(campaign);
        return runtime ? read(runtime) : undefined;
    };
}
function economyCourse(rate) {
    return (campaign) => {
        const recorded = economyRecord(campaign).map((sample) => ({ turn: sample.turn, value: sample[rate] }));
        return withLive(campaign, recorded, selfRuntime(campaign)?.stats.economy[rate]);
    };
}
/** A state's jobless rate is the country's carried through the state's authored standing against it, as the economy board reads it. */
function stateUnemploymentAt(campaign, id, national) {
    const anchor = campaign.states[id]?.base.character.vitalAnchor.unemployment;
    return anchor === undefined ? undefined : clamp01(national + anchor);
}
function stateUnemploymentCourse(campaign, id) {
    return economyCourse("unemployment")(campaign).flatMap((point) => {
        const value = stateUnemploymentAt(campaign, id, point.value);
        return value === undefined ? [] : [{ turn: point.turn, value }];
    });
}
function stateApprovalCourse(campaign, id) {
    const recorded = (campaign.stateApprovalHistory ?? []).flatMap((sample) => {
        const value = sample.approval[id];
        return value === undefined ? [] : [{ turn: sample.turn, value }];
    });
    return withLive(campaign, recorded, stateApprovals(campaign)[id]);
}
function playerMetric(key, label, unit, format, history) {
    return {
        id: key,
        label,
        unit,
        format,
        better: "up",
        ...(format === "usd-millions" ? {} : { domain: [0, 1] }),
        subjects: history ? ["self", "self-at", "history"] : ["self", "self-at"],
        visibility: "published",
        self: (campaign) => campaign.player.metrics[key],
        course: (campaign) => playerCourse(campaign, key),
        ...(history ? { history } : {}),
    };
}
function economyRate(rate, label, unit, better) {
    return {
        id: rate,
        label,
        unit,
        format: "percent",
        better,
        subjects: ["self", "self-at", "nation", "history"],
        visibility: "published",
        self: selfStat((runtime) => runtime.stats.economy[rate]),
        course: economyCourse(rate),
        nation: (runtime) => runtime.stats.economy[rate],
        history: rate,
    };
}
function nationStat(id, label, unit, format, better, visibility, read) {
    return {
        id,
        label,
        unit,
        format,
        better,
        ...(format === "index" ? { domain: [0, 1] } : {}),
        subjects: ["self", "nation"],
        visibility,
        self: selfStat((runtime) => read(runtime.stats)),
        nation: (runtime) => read(runtime.stats),
    };
}
const softPower = (stats) => (stats.softPower.diplomaticReach + stats.softPower.culturalReach) / 2;
const tradeReliance = (stats) => Math.max(0, ...Object.values(stats.trade.tradeDependence));
const APPROVAL = {
    ...playerMetric("approval", "Approval", "share of Americans who approve", "share", "approval-landmarks"),
    subjects: ["self", "self-at", "state", "history"],
    state: (campaign, id) => stateApprovals(campaign)[id],
    stateCourse: stateApprovalCourse,
};
const UNEMPLOYMENT = {
    ...economyRate("unemployment", "Unemployment", "share of the labor force out of work", "down"),
    subjects: ["self", "self-at", "nation", "state", "history"],
    state: (campaign, id) => {
        const national = selfRuntime(campaign)?.stats.economy.unemployment;
        return national === undefined ? undefined : stateUnemploymentAt(campaign, id, national);
    },
    stateCourse: stateUnemploymentCourse,
};
export const COMPARE_METRICS = {
    approval: APPROVAL,
    treasury: playerMetric("treasury", "Budget authority", "USD millions", "usd-millions", "treasury-scale"),
    stability: playerMetric("stability", "Stability", "score, 0 to 1", "index"),
    militaryReadiness: playerMetric("militaryReadiness", "Military readiness", "% of full readiness", "share"),
    standing: playerMetric("standing", "Standing abroad", "score, 0 to 1", "index"),
    growth: economyRate("growth", "Growth", "yearly change in what the economy produces", "up"),
    inflation: economyRate("inflation", "Inflation", "yearly change in prices", "down"),
    unemployment: UNEMPLOYMENT,
    debtToGdp: nationStat("debtToGdp", "Debt compared with economy", "debt as a share of what the economy produces in a year", "share", "down", "published", debtToGdp),
    militaryStrength: nationStat("militaryStrength", "Military strength", "strength score, 0 to 1", "index", "up", "assessed", (stats) => computeMilitaryMetrics(stats).forceIndex),
    regimeStability: nationStat("regimeStability", "Government stability", "score, 0 to 1", "index", "up", "assessed", (stats) => stats.politics.regimeStability),
    softPower: nationStat("softPower", "Influence abroad", "reach through diplomacy and culture, 0 to 1", "index", "up", "published", softPower),
    tradeReliance: nationStat("tradeReliance", "Reliance on top trade partner", "share of trade through one partner", "share", "down", "published", tradeReliance),
};
export const COMPARE_METRIC_IDS = Object.keys(COMPARE_METRICS);
export function compareMetric(id) {
    return COMPARE_METRIC_IDS.includes(id) ? COMPARE_METRICS[id] : undefined;
}
