import { campaignFoundingDate, daysBetween, selectConflicts, selectDateOfTurn, selectEnding, selectNation, } from "@admin/engine";
import { plankById } from "@admin/world";
import { formatDate } from "../format/figures";
import { LEGACY_CLOSING, LEGACY_LINES, lawsLine, promisesLine } from "./finale-copy";
function markAt(campaign, founded, turn) {
    const date = selectDateOfTurn(campaign, turn);
    return { at: Math.max(0, daysBetween(founded, date)), date: formatDate(date) };
}
function lawMarks(campaign, founded) {
    return Object.values(campaign.bills)
        .filter((bill) => bill.status === "law")
        .map((bill) => ({
        key: `law:${bill.id}`,
        kind: "law",
        ...markAt(campaign, founded, bill.resolvedTurn ?? bill.introducedTurn),
        label: bill.title,
        tone: (bill.override ? "adverse" : "favorable"),
    }));
}
function electionMarks(campaign, founded) {
    return campaign.termClock.elections.map((result) => ({
        key: `election:${result.id}`,
        kind: "election",
        ...markAt(campaign, founded, result.turn),
        label: result.kind === "midterm" ? "The midterms" : result.won === undefined ? "Not on the ballot" : "Your election",
        tone: (result.won === false ? "adverse" : result.won === true ? "favorable" : "neutral"),
    }));
}
function removalMarks(campaign, founded) {
    return campaign.removal.beats.map((beat, index) => ({
        key: `removal:${index}`,
        kind: "removal",
        ...markAt(campaign, founded, beat.turn),
        label: beat.description,
        tone: "adverse",
    }));
}
function nationName(campaign, id) {
    return selectNation(campaign, id)?.base.identity.name ?? id;
}
function usWars(campaign) {
    const us = campaign.founding.nation;
    return selectConflicts(campaign).filter((conflict) => conflict.aggressor === us || conflict.defender === us || conflict.joined.aggressor.includes(us) || conflict.joined.defender.includes(us));
}
function warOutcome(campaign, conflict) {
    if (conflict.status === "active")
        return { outcome: "Still being fought", tone: "neutral" };
    if (conflict.status === "settled")
        return { outcome: "Ended by agreement", tone: "neutral" };
    const us = campaign.founding.nation;
    const ourSide = conflict.aggressor === us || conflict.joined.aggressor.includes(us) ? "aggressor" : "defender";
    const won = (conflict.status === "aggressor-victory") === (ourSide === "aggressor");
    return won ? { outcome: "Won", tone: "favorable" } : { outcome: "Lost", tone: "adverse" };
}
function legacyWars(campaign, founded) {
    const conflicts = usWars(campaign);
    const wars = conflicts.map((conflict) => ({
        key: conflict.id,
        name: `${nationName(campaign, conflict.aggressor)} against ${nationName(campaign, conflict.defender)}`,
        ...warOutcome(campaign, conflict),
    }));
    const marks = conflicts.map((conflict, index) => ({
        key: `war:${conflict.id}`,
        kind: "war",
        ...markAt(campaign, founded, Math.max(1, conflict.startedTurn)),
        label: wars[index].name,
        tone: "adverse",
    }));
    return { wars, marks };
}
function pledgeMarks(campaign, founded) {
    return (campaign.pledges ?? []).flatMap((pledge) => {
        if (pledge.status === "open" || !pledge.settledDate)
            return [];
        const title = plankById.get(pledge.plank)?.title ?? String(pledge.plank);
        return [{
                key: `pledge:${pledge.id}`,
                kind: "pledge",
                at: Math.max(0, daysBetween(founded, pledge.settledDate)),
                date: formatDate(pledge.settledDate),
                label: `${pledge.status === "kept" ? "Kept" : "Broken"}: ${title}`,
                tone: (pledge.status === "kept" ? "favorable" : "adverse"),
            }];
    });
}
function series(campaign, values) {
    return values.map(({ turn, value }) => ({ label: formatDate(selectDateOfTurn(campaign, turn)), at: turn, value }));
}
function approvalSeries(campaign) {
    const history = campaign.player.metricHistory;
    const closed = history.map((set, index) => ({ turn: campaign.turn - history.length + index, value: set.approval * 100 }));
    return series(campaign, [...closed, { turn: campaign.turn, value: campaign.player.metrics.approval * 100 }]);
}
function economySeries(campaign, pick) {
    return series(campaign, (campaign.economyHistory ?? []).map((sample) => ({ turn: sample.turn, value: sample[pick] * 100 })));
}
function promiseCounts(campaign) {
    const pledges = campaign.pledges ?? [];
    const kept = pledges.filter((pledge) => pledge.status === "kept").length;
    const broken = pledges.filter((pledge) => pledge.status === "broken").length;
    return { kept, broken, open: pledges.length - kept - broken };
}
function recordCounts(campaign) {
    return {
        unauthorizedForce: campaign.congress.unauthorized.length,
        struckDownOrders: campaign.orders.filter((order) => order.review?.status === "struck-down").length,
        overriddenVetoes: Object.values(campaign.bills).filter((bill) => bill.status === "law" && bill.override !== undefined).length,
        removalSteps: campaign.removal.beats.length,
    };
}
/** The record a finished presidency leaves. Undefined while the President is in office. */
export function legacyReading(campaign) {
    const ending = selectEnding(campaign);
    if (ending === "in-office")
        return undefined;
    const founded = campaignFoundingDate(campaign);
    const war = legacyWars(campaign, founded);
    const marks = [
        ...lawMarks(campaign, founded),
        ...electionMarks(campaign, founded),
        ...removalMarks(campaign, founded),
        ...war.marks,
        ...pledgeMarks(campaign, founded),
    ].sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
    const laws = marks.filter((mark) => mark.kind === "law").map((mark) => mark.label);
    const promises = promiseCounts(campaign);
    const hasPromises = promises.kept + promises.broken + promises.open > 0;
    return {
        ending,
        from: formatDate(founded),
        to: formatDate(campaign.calendar),
        span: Math.max(1, daysBetween(founded, campaign.calendar)),
        timelineLine: LEGACY_LINES.timeline,
        marks,
        approval: approvalSeries(campaign),
        unemployment: economySeries(campaign, "unemployment"),
        inflation: economySeries(campaign, "inflation"),
        countryLine: LEGACY_LINES.country,
        laws: { line: laws.length === 0 ? LEGACY_LINES.lawsNone : lawsLine(laws.length), titles: laws },
        promises: { ...promises, line: hasPromises ? promisesLine(promises.kept, promises.broken, promises.open) : LEGACY_LINES.promisesNone },
        wars: { ...(war.wars.length === 0 ? { line: LEGACY_LINES.warsNone } : {}), list: war.wars },
        record: recordCounts(campaign),
        closing: LEGACY_CLOSING[ending],
    };
}
