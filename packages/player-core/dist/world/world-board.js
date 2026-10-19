import { conflictsAsParty, outstandingInstrumentActs, outstandingIssuedAuthorizationActs, selectActiveConflicts, selectExpectedRetaliation, selectFeed, selectRelationship, selectTreaties, tradeSector, } from "@admin/engine";
import { TRUST_STANCE_CUTS, formatDate, trustWord } from "../format/figures";
import { place } from "../navigation/places";
import { intensityWord } from "./conflict-intensity";
import { rankedFeed } from "./feed-rank";
import { worldLeaderRows } from "./leaders";
import { forcesByHost } from "./us-presence";
import { formatShare } from "./trade-partners";
import { boardStance, goodsTradeShare, standingToward } from "./standing";
import { WORLD_REGIONS, WORLD_REGION_NAMES, worldRegionOf } from "./world-regions";
// The World mode's home: every other government ranked for a lens, the ones
// that moved lately, what the President already has in motion abroad, and the
// wars on the board. Every row is read off the engine; nothing here is stored.
export const WORLD_LENSES = ["standing", "forces", "trade"];
const onAxis = (trust) => (trust + 1) / 2;
/** The standing axis's bands as spans of 0..1, read off the same cuts the band words are, so a drawn boundary and the word beside it cannot disagree. */
export const STANDING_BANDS = [
    { stance: "adverse", word: trustWord("adverse"), from: 0, to: onAxis(TRUST_STANCE_CUTS.caution) },
    { stance: "caution", word: trustWord("caution"), from: onAxis(TRUST_STANCE_CUTS.caution), to: onAxis(TRUST_STANCE_CUTS.neutral) },
    { stance: "neutral", word: trustWord("neutral"), from: onAxis(TRUST_STANCE_CUTS.neutral), to: onAxis(TRUST_STANCE_CUTS.favorable) },
    { stance: "favorable", word: trustWord("favorable"), from: onAxis(TRUST_STANCE_CUTS.favorable), to: 1 },
];
const STANCE_FRACTION = { favorable: 1, neutral: 0.67, caution: 0.34, adverse: 0.1, unread: 0 };
const STANCE_RANK = { favorable: 4, neutral: 3, caution: 2, adverse: 1, unread: 0 };
function presenceWord(share) {
    if (share >= 0.25)
        return "A large US presence";
    if (share >= 0.05)
        return "A sizable US presence";
    return "A small US presence";
}
export function atWarWith(campaign) {
    const home = campaign.founding.nation;
    return new Set(selectActiveConflicts(campaign).flatMap((conflict) => {
        const aggressors = [conflict.aggressor, ...conflict.joined.aggressor];
        const defenders = [conflict.defender, ...conflict.joined.defender];
        return aggressors.includes(home) ? defenders : defenders.includes(home) ? aggressors : [];
    }));
}
/** Every other government ranked for a lens, the accessible twin of the map's own colors. */
export function worldRows(campaign, lens) {
    const presence = lens === "forces" ? forcesByHost(campaign) : new Map();
    const most = Math.max(1, ...presence.values());
    const war = atWarWith(campaign);
    const scored = worldLeaderRows(campaign).map((leader) => {
        const stance = boardStance(standingToward(campaign, leader.nation));
        const common = { nation: leader.nation, name: leader.nationName, capital: leader.capital, adjective: leader.adjective, href: place.country(leader.nation), stance, atWar: war.has(leader.nation), region: worldRegionOf(leader.region) };
        if (lens === "forces") {
            const personnel = presence.get(leader.nation) ?? 0;
            return { row: { ...common, value: personnel > 0 ? presenceWord(personnel / most) : "No US troops", fraction: Math.sqrt(personnel / most) }, rank: personnel };
        }
        if (lens === "trade") {
            const share = goodsTradeShare(campaign, leader.nation) ?? 0;
            return { row: { ...common, value: formatShare(share), fraction: Math.sqrt(Math.min(1, share / 0.2)) }, rank: share };
        }
        const key = stance ?? "unread";
        // Where their trust actually sits, so two governments in one band are not drawn as one. The word stays the band's.
        const trust = key === "unread" ? undefined : selectRelationship(campaign, leader.nation, campaign.founding.nation)?.trust;
        const fraction = trust === undefined ? STANCE_FRACTION[key] : onAxis(Math.max(-1, Math.min(1, trust)));
        return { row: { ...common, value: key === "unread" ? "Unread" : trustWord(key), fraction }, rank: STANCE_RANK[key] + (trust === undefined ? 0 : fraction / 10) };
    });
    return scored.sort((a, b) => b.rank - a.rank || a.row.name.localeCompare(b.row.name)).map((entry) => entry.row);
}
/** The rows a search matches: the government's name, its capital, or the adjective it goes by. */
export function searchWorldRows(rows, query) {
    const text = query.trim().toLowerCase();
    if (text === "")
        return rows;
    return rows.filter((row) => [row.name, row.capital, row.adjective].some((field) => field.toLowerCase().includes(text)));
}
const MOVER_WEEKS = 4;
const MOVERS_SHOWN = 5;
function weeksAgo(now, turn) {
    const weeks = Math.max(0, now - turn);
    return weeks === 0 ? "This week" : weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}
const nameOf = (campaign, id) => campaign.nations[id]?.base.identity.name ?? id;
// A government moved when something passed between it and the United States, or when it acted or was acted on.
// A disaster at home is news about it, not a move, so it ranks below any of them.
const LEDGER_WEIGHT = 3000;
const KIND_WEIGHT = { conflict: 2500, "player-action": 2000, "npc-action": 2000, bloc: 1500, operator: 1200 };
const OTHER_WEIGHT = 500;
function foreign(campaign, id) {
    return id !== undefined && id !== campaign.founding.nation && campaign.nations[id] !== undefined;
}
/** What the wire and the relationship ledger put against a government within the window, newest and heaviest first. */
function sightings(campaign) {
    const since = campaign.turn - MOVER_WEEKS;
    const home = campaign.founding.nation;
    const fromFeed = rankedFeed(campaign, selectFeed(campaign).filter((item) => item.turn >= since && item.kind !== "drift")).flatMap((item, index) => {
        const nations = [item.actor, item.target].filter((id) => foreign(campaign, id));
        return nations.map((nation) => ({ nation, turn: item.turn, headline: item.headline, weight: (KIND_WEIGHT[item.kind] ?? OTHER_WEIGHT) - index }));
    });
    const fromLedger = Object.keys(campaign.nations).flatMap((nation) => {
        if (nation === home)
            return [];
        const event = [selectRelationship(campaign, home, nation), selectRelationship(campaign, nation, home)].flatMap((tie) => tie?.history ?? []).filter((entry) => entry.turn >= since).sort((a, b) => b.turn - a.turn)[0];
        return event ? [{ nation, turn: event.turn, headline: event.description, weight: LEDGER_WEIGHT }] : [];
    });
    return [...fromFeed, ...fromLedger];
}
function moversOf(campaign) {
    const best = new Map();
    for (const sighting of sightings(campaign)) {
        const known = best.get(sighting.nation);
        if (!known || sighting.weight > known.weight)
            best.set(sighting.nation, sighting);
    }
    return [...best.values()]
        .sort((a, b) => b.weight - a.weight || b.turn - a.turn || a.nation.localeCompare(b.nation))
        .slice(0, MOVERS_SHOWN)
        .map((sighting) => ({
        nation: sighting.nation,
        name: nameOf(campaign, sighting.nation),
        href: place.country(sighting.nation),
        headline: sighting.headline,
        when: weeksAgo(campaign.turn, sighting.turn),
        stance: boardStance(standingToward(campaign, sighting.nation)),
    }));
}
function inFlightOf(campaign) {
    const operations = outstandingInstrumentActs(campaign).map((act) => ({
        id: act.id,
        kind: "operation",
        title: act.title,
        detail: `Being prepared. First report by ${formatDate(act.dueDate)}.`,
        href: place.countryAct(act.request.target),
    }));
    const asks = outstandingIssuedAuthorizationActs(campaign).map((act) => ({
        id: act.id,
        kind: "authorization",
        title: act.title,
        detail: `Congress is considering it. The House and Senate vote by ${formatDate(act.dueDate)}.`,
        href: place.countryAct(act.target),
    }));
    const treaties = selectTreaties(campaign)
        .filter((record) => record.status === "signed")
        .map((record) => ({ id: record.id, kind: "treaty", title: record.title, detail: "Signed, and waiting for the Senate.", href: place.treaty(record.id) }));
    const answers = selectExpectedRetaliation(campaign).map((record) => ({
        id: record.id,
        kind: "retaliation",
        title: `${nameOf(campaign, record.by)} may hit back at your tariff`,
        detail: `Expected to target ${tradeSector(record.sector)?.name.toLowerCase() ?? record.sector} in ${Math.max(0, record.dueTurn - campaign.turn)} weeks.`,
        href: place.country(record.by),
    }));
    return [...operations, ...asks, ...treaties, ...answers];
}
function warRow(campaign, conflict, party) {
    const weeks = Math.max(1, campaign.turn - conflict.startedTurn + 1);
    const hot = intensityWord(conflict.intensity);
    return {
        id: conflict.id,
        headline: `${nameOf(campaign, conflict.aggressor)} and ${nameOf(campaign, conflict.defender)}`,
        weeks,
        intensity: conflict.intensity,
        intensityText: hot,
        youAreParty: party.has(conflict.id),
        href: place.war(conflict.id),
    };
}
/** The movers, what is in flight and the wars, for the World's home. */
export function worldWatchlist(campaign) {
    const party = new Set(conflictsAsParty(campaign).map((conflict) => conflict.id));
    return {
        movers: moversOf(campaign),
        inFlight: inFlightOf(campaign),
        wars: selectActiveConflicts(campaign).map((conflict) => warRow(campaign, conflict, party)),
    };
}
const EMPTY = { favorable: 0, neutral: 0, caution: 0, adverse: 0, unread: 0 };
function tally(rows) {
    return rows.reduce((counts, row) => {
        const key = row.stance ?? "unread";
        return { ...counts, [key]: counts[key] + 1 };
    }, EMPTY);
}
function notability(row) {
    if (row.atWar)
        return 3;
    if (row.stance === "adverse")
        return 2;
    return row.stance === "favorable" ? 1 : 0;
}
function tileOf(region, rows) {
    const notable = [...rows]
        .filter((row) => notability(row) > 0)
        .sort((a, b) => notability(b) - notability(a) || a.name.localeCompare(b.name))
        .slice(0, 4)
        .map((row) => row.nation);
    return { region, name: WORLD_REGION_NAMES[region], total: rows.length, counts: tally(rows), atWar: rows.filter((row) => row.atWar).length, notable };
}
/** Every other government counted by its standing toward the US, overall and for each part of the world. */
export function worldOverview(campaign) {
    const rows = worldRows(campaign, "standing");
    return {
        total: rows.length,
        counts: tally(rows),
        atWar: rows.filter((row) => row.atWar).length,
        regions: WORLD_REGIONS.map((region) => tileOf(region, rows.filter((row) => row.region === region))),
    };
}
