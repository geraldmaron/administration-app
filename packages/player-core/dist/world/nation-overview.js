import { projectVote, projectedStateCalls, selectDeclaredEmergencies, stateApprovals, weeksToLapse, emergencyCauseLabel, } from "@admin/engine";
import { STATE_IDS, stateById } from "@admin/world";
import { formatRatio, polishCompactFigure } from "../format/figures";
import { formatMoney } from "../format/money";
import { place } from "../navigation/places";
import { conditionReadings } from "./board-state";
// The Nation screen's reading of the country: approval as the country gives
// it, the same figure spread across the fifty-one places that make it up, the
// electoral call it would produce this week, and what the states are living
// through. Every figure is read off the engine; nothing here is stored.
/** The four lenses the Nation screen offers, the default first. */
export const NATION_LENSES = ["approval", "call", "lean", "population"];
export const NATION_LENS_NAMES = {
    approval: "Approval",
    call: "Election forecast",
    lean: "Party lean",
    population: "Population",
};
export function isNationLens(value) {
    return typeof value === "string" && NATION_LENSES.includes(value);
}
const ELECTORS = 538;
const MAJORITY = 270;
/** Lean in points, the way a reader says it: D+12, R+4, Even. Negative lean is Democratic. */
export function leanWords(lean) {
    const points = Math.round(Math.abs(lean) * 100);
    if (points === 0)
        return "Even";
    return lean < 0 ? `D+${points}` : `R+${points}`;
}
/** A headcount, rounded the way a reader says it: 5.9 million, 734 thousand. */
export function peopleWords(people) {
    if (people >= 1_000_000)
        return `${(people / 1_000_000).toFixed(people >= 10_000_000 ? 0 : 1)} million`;
    if (people >= 1_000)
        return `${Math.round(people / 1_000)} thousand`;
    return `${Math.round(people)}`;
}
/** Gross state product, which the dataset keeps in USD millions like every other money figure. */
export function outputWords(usdMillions) {
    return polishCompactFigure(formatMoney(usdMillions));
}
export function callWords(call) {
    if (call.administrationVotes > 0 && call.administrationVotes < call.electoralVotes) {
        return `Split, ${call.administrationVotes} of ${call.electoralVotes} for you`;
    }
    // `share` is always the administration's; a state against you is read by the opposition's share of it.
    const winning = call.winner === "administration" ? call.share : 1 - call.share;
    return `${call.winner === "administration" ? "For you" : "Against you"}, ${formatRatio(winning)}`;
}
const BANDS = [
    { key: "under-35", label: "Under 35%", below: 0.35 },
    { key: "35-45", label: "35 to 45%", below: 0.45 },
    { key: "45-55", label: "45 to 55%", below: 0.55 },
    { key: "55-65", label: "55 to 65%", below: 0.65 },
    { key: "over-65", label: "65% or more", below: Number.POSITIVE_INFINITY },
];
function approvalBands(rows) {
    return BANDS.map((band, index) => {
        const floor = index === 0 ? Number.NEGATIVE_INFINITY : BANDS[index - 1].below;
        const inside = rows.filter((row) => row.approval >= floor && row.approval < band.below);
        return { key: band.key, label: band.label, states: inside.length, electoralVotes: inside.reduce((sum, row) => sum + row.electoralVotes, 0) };
    });
}
function medianOf(values) {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0)
        return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/** One row per state the campaign carries, in `STATE_IDS` order. */
export function stateRows(campaign) {
    const approvals = stateApprovals(campaign);
    const calls = new Map(projectedStateCalls(campaign, projectVote(campaign).share).map((call) => [call.state, call]));
    const conditions = conditionReadings(campaign);
    return STATE_IDS.flatMap((id) => {
        const runtime = campaign.states[id];
        const approval = approvals[id];
        const call = calls.get(id);
        if (!runtime || approval === undefined || !call)
            return [];
        return [
            {
                id,
                name: runtime.base.name,
                approval,
                call,
                callText: callWords(call),
                lean: runtime.lean,
                leanText: leanWords(runtime.lean),
                population: runtime.population,
                populationText: peopleWords(runtime.population),
                electoralVotes: runtime.base.electoralVotes,
                conditions: conditions.filter((reading) => reading.state === id).length,
                href: place.state(id),
            },
        ];
    });
}
/** The value a lens ranks a row by, highest first, and the words it is read in. */
export function stateLensValue(row, lens) {
    switch (lens) {
        case "approval":
            return { rank: row.approval, text: `${formatRatio(row.approval)} approve` };
        case "call":
            return { rank: row.call.share, text: row.callText };
        case "lean":
            // Ranked from the Democratic end, which is how the map's legend reads left to right.
            return { rank: -row.lean, text: row.leanText };
        case "population":
            return { rank: row.population, text: row.populationText };
    }
}
/** The rows ranked by a lens, highest first, ties by name: the accessible table beside the map. */
export function rankStates(rows, lens) {
    return [...rows].sort((a, b) => stateLensValue(b, lens).rank - stateLensValue(a, lens).rank || a.name.localeCompare(b.name));
}
function emergencyRows(campaign) {
    return selectDeclaredEmergencies(campaign).map((emergency) => {
        const state = emergency.scope.kind === "state" ? emergency.scope.state : undefined;
        return {
            id: emergency.id,
            title: `Emergency declared: ${emergencyCauseLabel(emergency.cause)}`,
            reach: state ? (stateById.get(state)?.name ?? state) : "the whole country",
            weeksLeft: Math.max(0, weeksToLapse(emergency, campaign.turn)),
            ...(state ? { href: place.state(state) } : {}),
        };
    });
}
/** The country as the Nation screen reads it this week. */
export function nationOverview(campaign) {
    const rows = stateRows(campaign);
    const forYou = rows.reduce((sum, row) => sum + row.call.administrationVotes, 0);
    return {
        approval: campaign.player.metrics.approval,
        electoral: { forYou, against: ELECTORS - forYou, total: ELECTORS, needed: MAJORITY },
        bands: approvalBands(rows),
        median: medianOf(rows.map((row) => row.approval)),
        rows,
        conditions: conditionReadings(campaign),
        emergencies: emergencyRows(campaign),
    };
}
