import { climbingRung, MEASURED_RUNG } from "./balance-proxies.js";
import { INSTRUMENT_IDS, RUNG_LEVELS } from "./instruments.js";
import { projectAction } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { selectNation, selectRelationshipsFrom } from "./state.js";
// How a proxy chooses what to do in a week of the balance harness: which
// capitals it is weighing, what it can afford there, and which of that it
// reaches for. Beside the harness rather than inside it, so the loop that runs
// a campaign and the dials that stand in for a player can each be read alone.
// Bounded so the harness costs the same regardless of how many nations the
// dataset grows to, and because a player does not in practice consider every
// capital on earth each week.
const CANDIDATE_TARGETS = 6;
/** A projection cheap enough to be free: high odds, trivial price, nobody objects. */
const FREE_WIN_CHANCE = 0.9;
const FREE_WIN_TREASURY_SHARE = 0.005;
// The nations a player would plausibly be weighing this turn. Ranked the way
// a player's attention actually is — whoever they are most exposed to and
// most at odds with — rather than alphabetically, which would have measured
// the economic ladder against six countries United States does not trade with and
// concluded the ladder was inert.
export function candidateTargetsForBalance(campaign) {
    const player = selectNation(campaign, campaign.founding.nation);
    const dependence = player?.stats.trade.tradeDependence ?? {};
    const neighbors = new Set((player?.base.geo.neighbors ?? []).map((n) => n));
    return selectRelationshipsFrom(campaign, campaign.founding.nation)
        .map((rel) => ({
        to: rel.to,
        salience: (dependence[rel.to] ?? 0) * 2 + rel.tension + rel.militaryThreat + (neighbors.has(rel.to) ? 1 : 0),
    }))
        .sort((a, b) => b.salience - a.salience || a.to.localeCompare(b.to))
        .slice(0, CANDIDATE_TARGETS)
        .map((c) => c.to);
}
export function optionsThisTurn(campaign) {
    const streams = createRngStreams(campaign.seed);
    const actor = campaign.founding.nation;
    const options = [];
    for (const target of candidateTargetsForBalance(campaign)) {
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of RUNG_LEVELS) {
                const request = { actor, target, instrument, rung };
                const projected = projectAction(campaign, request, streams);
                if (projected.ok)
                    options.push({ request, projection: projected.projection });
            }
        }
    }
    return options;
}
export function affordable(campaign, option) {
    const spend = Math.abs(option.projection.cost.treasury ?? 0);
    return spend <= campaign.player.metrics.treasury;
}
export function isFreeWin(campaign, option) {
    const spend = Math.abs(option.projection.cost.treasury ?? 0);
    const treasury = Math.max(1, campaign.player.metrics.treasury);
    return (option.projection.successChance >= FREE_WIN_CHANCE &&
        spend / treasury <= FREE_WIN_TREASURY_SHARE &&
        option.projection.ripples.length === 0);
}
/**
 * How each player picks, out of what they can pay for.
 *
 * One function over the dials rather than one arm per proxy: a population of
 * thirteen written as a switch is thirteen places for a rule to drift, and the
 * question the population exists to answer — does *this* dial move the outcome
 * — can only be asked if the dials are the only thing that differs.
 *
 * The bracket proxies' comparators are reproduced exactly. `heaviest` sorts on
 * rung then price and reads no odds at all, which is what makes `reckless`
 * reckless; `surest` sorts on odds then reaches for the gentlest rung that
 * carries them.
 */
export function chooseOption(campaign, profile, options, step, horizon) {
    const affordableHere = options.filter((o) => affordable(campaign, o));
    if (affordableHere.length === 0)
        return undefined;
    // A floor above 1 is a player who never acts. Expressed as a dial rather
    // than as a case so `passive` is a row in the table like everyone else.
    if (profile.oddsFloor > 1)
        return undefined;
    const preferred = profile.instruments.length === 0
        ? affordableHere
        : affordableHere.filter((o) => profile.instruments.includes(o.request.instrument));
    // A player who reaches for one instrument still governs in a week where that
    // instrument has nothing to offer; they simply do not get their first choice.
    const pool = preferred.length > 0 ? preferred : affordableHere;
    const viable = pool.filter((o) => {
        if (profile.freeWinsOnly && !isFreeWin(campaign, o))
            return false;
        if (o.projection.successChance < profile.oddsFloor)
            return false;
        // The reserve is measured against the treasury the player is holding this
        // week, which is the figure they would actually be looking at.
        const floor = campaign.player.metrics.treasury * profile.reserveShare;
        return campaign.player.metrics.treasury + (o.projection.cost.treasury ?? 0) >= floor;
    });
    if (viable.length === 0)
        return undefined;
    return ranked(viable, profile, step, horizon)[0];
}
function ranked(viable, profile, step, horizon) {
    const sorted = [...viable];
    switch (profile.rungBias) {
        case "heaviest":
            sorted.sort((a, b) => b.request.rung - a.request.rung || (a.projection.cost.treasury ?? 0) - (b.projection.cost.treasury ?? 0));
            break;
        case "surest":
            sorted.sort((a, b) => b.projection.successChance - a.projection.successChance || a.request.rung - b.request.rung);
            break;
        case "climbing": {
            const want = climbingRung(step, horizon);
            sorted.sort((a, b) => Math.abs(a.request.rung - want) - Math.abs(b.request.rung - want) ||
                b.projection.successChance - a.projection.successChance);
            break;
        }
        case "measured":
            sorted.sort((a, b) => Math.abs(a.request.rung - MEASURED_RUNG) - Math.abs(b.request.rung - MEASURED_RUNG) ||
                b.projection.successChance - a.projection.successChance);
            break;
    }
    return sorted;
}
