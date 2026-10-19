import { compareDates, graftDisclosed, selectCausesOf, selectConsequencesOf, selectDecisionLegacy, selectRootCausesOf, selectDateOfTurn, } from "@admin/engine";
import { METRIC_LABELS, OPINION_DRIVER_LABELS, formatRatio, formatSignedPoints, roleTitle } from "../format/figures";
import { formatMoney } from "../format/money";
import { charterOf } from "../campaign/founding-options";
import { eventPlace } from "./event-place";
import { foregroundLedger } from "./foreground";
// The Record's entries as a screen reads them: who acted, when, what moved
// from what to what, and what it answered to. Every figure is read off what
// `apply()` stamped on the ledger; nothing is recomputed against today's board.
export const ACTOR_WORDS = {
    player: "Your administration",
    world: "The world",
    developer: "Developer amendment",
};
export const ORIGIN_WORDS = {
    decision: "Your decision",
    institution: "A government agency acting on its own",
    world: "Another country or group",
    scheduled: "The calendar",
    scenario: "A situation brought to you",
};
const METRIC_KEYS = ["approval", "treasury", "stability", "militaryReadiness", "standing"];
/** Movements smaller than this print as no movement; the ledger keeps float noise from clamps. */
const MOVED = 0.00005;
function figure(key, value) {
    return key === "treasury" ? formatMoney(value) : formatRatio(value);
}
function changeText(key, delta) {
    if (key === "treasury")
        return `${delta >= 0 ? "+" : "−"}${formatMoney(Math.abs(delta))}`;
    return `${formatSignedPoints(delta)} points`;
}
/**
 * The readings as they stood just after the entry at `index`: today's figures
 * with every later entry's recorded change taken back off. Each entry's `cost`
 * is the before/after diff `apply()` measured, so the walk back is exact.
 */
function readingsAfter(campaign, index) {
    const later = campaign.ledger.slice(index + 1);
    return Object.fromEntries(METRIC_KEYS.map((key) => [key, later.reduce((value, entry) => value - (entry.cost?.[key] ?? 0), campaign.player.metrics[key])]));
}
function movesAfter(entry, after) {
    return METRIC_KEYS.flatMap((key) => {
        const delta = entry.cost?.[key] ?? 0;
        if (Math.abs(delta) < (key === "treasury" ? 0.5 : MOVED))
            return [];
        const before = after[key] - delta;
        return [{ key, label: METRIC_LABELS[key], before, after: after[key], delta, text: changeText(key, delta), beforeText: figure(key, before), afterText: figure(key, after[key]) }];
    });
}
/** The readings an entry moved, each from its value before the entry to its value after. */
export function entryMoves(campaign, entry) {
    const index = campaign.ledger.indexOf(entry);
    return index < 0 ? [] : movesAfter(entry, readingsAfter(campaign, index));
}
/**
 * Every entry's moves in one walk back from today's readings, for a screen
 * that reads the whole ledger. Asking `entryMoves` per entry rewinds the
 * ledger each time, which is quadratic over a term of thousands of entries.
 */
export function ledgerMoves(campaign) {
    const moves = new Map();
    let after = { ...campaign.player.metrics };
    for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
        const entry = campaign.ledger[index];
        moves.set(entry, movesAfter(entry, after));
        const before = after;
        after = Object.fromEntries(METRIC_KEYS.map((key) => [key, before[key] - (entry.cost?.[key] ?? 0)]));
    }
    return moves;
}
/** The readings that moved from one set of figures to another: what one act or one run did. */
export function metricMoves(before, after) {
    return METRIC_KEYS.flatMap((key) => {
        const delta = after[key] - before[key];
        if (Math.abs(delta) < (key === "treasury" ? 0.5 : MOVED))
            return [];
        return [{ key, label: METRIC_LABELS[key], before: before[key], after: after[key], delta, text: changeText(key, delta), beforeText: figure(key, before[key]), afterText: figure(key, after[key]) }];
    });
}
/** The readings that moved between two campaigns, from the first's value to the second's. */
export function readingMoves(before, after) {
    return metricMoves(before.player.metrics, after.player.metrics);
}
/** The public judgments an entry moved, heaviest first. */
export function entryJudgments(entry) {
    return Object.keys(OPINION_DRIVER_LABELS).flatMap((driver) => {
        const delta = entry.mood?.[driver] ?? 0;
        return Math.abs(delta) < MOVED ? [] : [{ driver, label: OPINION_DRIVER_LABELS[driver], delta, text: `${formatSignedPoints(delta)} points` }];
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
/** The first sentence of a ledger description, which carries what happened; the rest is how. */
export function headlineOf(description) {
    // An abbreviation ends in a period too ("U.S. Congress"), so a stop after one is not the end of the sentence.
    const match = /^(.+?(?<!\b(?:U\.S|U\.K|St|Mr|Mrs|Ms|Dr|No|vs|Inc|Corp|Jr|Sr))[.!?])(?=\s+[A-Z(])/.exec(description);
    return match?.[1] ?? description;
}
function dateOf(campaign, entry) {
    return entry.causal?.createdDate ?? selectDateOfTurn(campaign, entry.turn);
}
function foreignNationsOf(campaign, entry) {
    const named = (entry.causal?.entities ?? []).filter((id) => id !== campaign.founding.nation && campaign.nations[id] !== undefined);
    return [...new Set(named)];
}
function graftActorWord(campaign, entry) {
    const graft = entry.causal?.graft;
    if (!graft)
        return undefined;
    const title = roleTitle(graft.role, charterOf(campaign).roleTitles);
    const name = campaign.people[graft.person]?.base.name;
    return name ? `${name}, ${title}` : title;
}
/** One ledger entry as a row, with the moves already read off the ledger so a whole-term screen walks it once. */
export function recordRowOf(campaign, entry, id, moves) {
    const graftActor = graftActorWord(campaign, entry);
    return {
        id,
        date: dateOf(campaign, entry),
        actor: graftActor ? "player" : entry.actor,
        actorWord: graftActor ?? ACTOR_WORDS[entry.actor],
        description: entry.description,
        headline: headlineOf(entry.description),
        moves,
        systems: entry.causal?.systems ?? [],
        nations: foreignNationsOf(campaign, entry),
    };
}
/** The Record's timeline, newest first: every entry a president reads that the causal graph can name. */
export function recordRows(campaign, actor) {
    const moves = ledgerMoves(campaign);
    return [...foregroundLedger(campaign)]
        .reverse()
        .filter((entry) => entry.causal !== undefined && (actor === undefined || (entry.causal.graft ? "player" : entry.actor) === actor))
        .map((entry) => recordRowOf(campaign, entry, entry.causal.eventId, moves.get(entry) ?? []));
}
function linkOf(record) {
    return { id: record.causal.eventId, description: record.description, date: record.causal.createdDate };
}
function stagesOf(created, effective, pending) {
    const delayed = effective !== undefined && compareDates(effective, created) > 0;
    if (!delayed) {
        return [
            { key: "issued", label: "Issued", date: created, reached: true, current: false },
            { key: "resolved", label: "In effect", date: created, reached: true, current: true },
        ];
    }
    return [
        { key: "issued", label: "Issued", date: created, reached: true, current: false },
        { key: "under-way", label: "Under way", reached: true, current: pending },
        { key: "resolved", label: "In effect", date: effective, reached: !pending, current: !pending },
    ];
}
/** One entry, read whole, or nothing for an id this administration's ledger does not hold. */
export function recordEntry(campaign, eventId) {
    const entry = campaign.ledger.find((candidate) => candidate.causal?.eventId === eventId);
    if (!entry?.causal || !graftDisclosed(campaign, entry))
        return undefined;
    const effective = entry.causal.effectiveDate;
    const pending = effective !== undefined && compareDates(effective, campaign.calendar) > 0;
    const where = eventPlace(campaign, entry);
    return {
        ...recordRowOf(campaign, entry, eventId, entryMoves(campaign, entry)),
        origin: entry.causal.graft ? "Someone working in your administration" : ORIGIN_WORDS[entry.causal.origin],
        ...(effective && compareDates(effective, entry.causal.createdDate) > 0 ? { effectiveDate: effective } : {}),
        status: pending ? "Started, but not in effect yet" : "In effect",
        stages: stagesOf(entry.causal.createdDate, effective, pending),
        judgments: entryJudgments(entry),
        accounting: entry.accounting ?? [],
        subjects: entry.subjects ?? [],
        causes: selectCausesOf(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).map(linkOf),
        consequences: selectConsequencesOf(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).map(linkOf),
        roots: selectRootCausesOf(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).map(linkOf),
        downstreamCount: selectDecisionLegacy(campaign.ledger.filter((row) => graftDisclosed(campaign, row)), eventId).length,
        camera: where.camera,
        ...(where.selection ? { selection: where.selection } : {}),
    };
}
