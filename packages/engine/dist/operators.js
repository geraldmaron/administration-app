import { cyberImpactEvent } from "./impact-adapters.js";
import { debtToGdp } from "@admin/world";
import { selectActiveConflicts, selectNation } from "./state.js";
import { selectRelationship } from "./state-selectors.js";
import { createRngStreams } from "./rng.js";
import { nationName, possessive } from "./naming.js";
import { policyStatBounds } from "./policy-stats.js";
import { stampOf, weigh } from "./willingness.js";
// Non-state actors. Their purpose is structural rather than decorative: they
// generate problems with no diplomatic counterparty. A cartel has no foreign
// ministry to call and no interest in being talked to, so a player whose
// whole toolkit is persuasion eventually meets something persuasion does not
// touch. That is the point — not every crisis should be solvable by ringing a
// capital.
//
// Where they appear is not random in the loose sense: an operator grows out
// of the host nation's own security and politics stats, so a corrupt state
// with thin border control grows cartels and a fractured one grows
// insurgencies, and fixing the underlying stat is what makes them rarer.
export const OPERATOR_KINDS = ["cartel", "insurgency", "cyber-crew", "pmc", "market-actor"];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const OPERATOR_PROFILES = {
    cartel: {
        kind: "cartel",
        label: "trafficking network",
        pressure: (n) => clamp01(n.stats.security.corruptionIndex * 0.4 + n.stats.security.crimeIndex * 0.4 + (1 - n.stats.security.borderControl) * 0.2),
        answerableWith: ["covert", "economic", "military"],
        crisis: (host) => `Smugglers are moving drugs and guns through ${nationName(host.identity)} faster than its ports can search them.`,
    },
    insurgency: {
        kind: "insurgency",
        label: "insurgency",
        pressure: (n) => clamp01(n.stats.security.insurgencyPressure * 0.5 + n.stats.politics.factionalism * 0.3 + (1 - n.stats.politics.legitimacy) * 0.2),
        answerableWith: ["military", "covert", "economic"],
        crisis: (host) => `Armed rebels hold ground inside ${nationName(host.identity)} and have turned down every offer of talks.`,
    },
    "cyber-crew": {
        kind: "cyber-crew",
        label: "intrusion crew",
        pressure: (n) => clamp01((1 - n.stats.security.counterIntel) * 0.5 + n.stats.security.corruptionIndex * 0.2 + n.stats.military.branchStrength.cyber * 0.3),
        answerableWith: ["covert", "economic"],
        crisis: (host) => `Hackers working out of ${nationName(host.identity)} have broken into computer systems they should not be able to reach.`,
    },
    pmc: {
        kind: "pmc",
        label: "private military company",
        pressure: (n) => clamp01(n.stats.security.insurgencyPressure * 0.3 + n.stats.security.corruptionIndex * 0.3 + n.stats.military.doctrineQuality * 0.4),
        answerableWith: ["military", "covert", "economic"],
        crisis: (host) => `A hired army registered in ${nationName(host.identity)} is taking jobs nobody will admit to paying for.`,
    },
    "market-actor": {
        kind: "market-actor",
        label: "market bloc",
        pressure: (n) => clamp01(n.stats.economy.inflation * 2 * 0.4 + debtToGdp(n.stats) * 0.3 + n.stats.security.corruptionIndex * 0.3),
        answerableWith: ["economic", "covert"],
        crisis: (host) => `Traders are betting heavily against ${possessive(nationName(host.identity))} currency, and there is nobody to call about it.`,
    },
};
// An operator only takes root where its pressure clears this. Below it the
// host's own institutions are handling the problem, which is what makes
// border control and legitimacy worth spending on.
const TAKE_ROOT_THRESHOLD = 0.45;
// Caps: a host can only sustain so many, and the world only shows so many
// before the feed stops being readable.
export const MAX_OPERATORS_PER_HOST = 2;
export const MAX_OPERATORS = 12;
// Pressure is static from turn to turn, so without this every nation that
// qualifies takes root on the same turn and the world arrives as a wall
// rather than accreting. The ceiling is per turn, so the same set still fills
// out — it just does so over months.
export const MAX_NEW_OPERATORS_PER_TURN = 2;
// How often a live operator presses in a given week, from what its host gives
// it to feed on: the host's own pressure for its kind, a war on the host's
// soil or borders, and the grip of a government that can still hold its
// ground. The weights are planning values, set so a typical rooted operator
// presses about as often as the flat third it used to, and a failing state's
// presses far more often than a stable one's.
const HOST_PRESSURE_WEIGHT = 0.6;
const AT_WAR_WEIGHT = 0.1;
const REGIME_GRIP_WEIGHT = 0.15;
const ACT_RATE_FLOOR = 0.05;
const ACT_RATE_CEILING = 0.8;
// The stamp's noise bound: an act that fired on a rate this close to the floor
// reads as the week's draw rather than as its reasons.
const OPERATOR_REASON_NOISE = 0.1;
function liveNation(campaign, id) {
    const runtime = selectNation(campaign, id);
    return runtime ? { ...runtime.base, stats: runtime.stats, traits: runtime.traits } : undefined;
}
// How exposed a nation is to a given kind of operator, straight out of its
// own numbers. Exposed so a dossier can show it without re-deriving it.
export function operatorPressure(kind, nation) {
    return Math.round(OPERATOR_PROFILES[kind].pressure(nation) * 1000) / 1000;
}
export function operatorId(kind, host, turn) {
    return `op:${kind}:${host}:${turn}`;
}
function hostCount(campaign, host) {
    return campaign.operators.filter((op) => op.nationality === host).length;
}
// Which operators take root this turn. The draw is per host, per kind, per
// turn, so adding a nation never changes what happens anywhere else.
//
// Every (host, kind) whose draw fell under its pressure has taken root, and the
// turn's few slots go to the lowest draw over pressure, which is an even draw
// whatever the pressure was: a host prone to a kind still roots more of it,
// because it fires more often. Walking the hosts in alphabetical order and the
// kinds in table order and stopping at the cap handed every slot to the front
// of both lists. Twelve operators filled from Afghanistan to Azerbaijan, every
// one a cartel, insurgency or market bloc, and no intrusion crew rooted anywhere
// in the world in any measured run.
export function emergingOperators(campaign, streams) {
    const room = Math.min(MAX_NEW_OPERATORS_PER_TURN, MAX_OPERATORS - campaign.operators.length);
    if (room <= 0)
        return [];
    const existing = new Set(campaign.operators.map((op) => op.id));
    const fired = [];
    for (const id of Object.keys(campaign.nations).sort()) {
        const nation = liveNation(campaign, id);
        if (!nation || hostCount(campaign, id) >= MAX_OPERATORS_PER_HOST)
            continue;
        for (const kind of OPERATOR_KINDS) {
            const pressure = OPERATOR_PROFILES[kind].pressure(nation);
            if (pressure < TAKE_ROOT_THRESHOLD)
                continue;
            const draw = streams.stream("operator-emerge", id, kind, campaign.turn).next();
            if (draw >= pressure || existing.has(operatorId(kind, id, campaign.turn)))
                continue;
            fired.push({ host: id, kind, draw: draw / pressure });
        }
    }
    const spawned = [];
    for (const entry of [...fired].sort((a, b) => a.draw - b.draw || (a.host < b.host ? -1 : a.host > b.host ? 1 : 0))) {
        if (spawned.length >= room)
            break;
        // One new operator per host per turn: the world escalates, it does not erupt.
        if (spawned.some((op) => op.nationality === entry.host))
            continue;
        spawned.push({ id: operatorId(entry.kind, entry.host, campaign.turn), kind: entry.kind, nationality: entry.host });
    }
    return spawned;
}
// --- Who an intrusion crew breaks into ---------------------------------------
/** How much a government's hostility toward a victim multiplies the crew's interest in it, at full hostility. */
const HOSTILE_TARGET_WEIGHT = 2;
/**
 * How strongly an intrusion crew draws each victim: the victim's share of the
 * world's output (there is more to steal and more to ransom), raised where the
 * crew's host government is hostile to it, and lowered by the victim's own
 * counterintelligence. The host's own networks are one victim among the rest.
 * A crew that could only break into its own country was a crew that never
 * reached the United States from anywhere.
 */
export function cyberVictimWeights(campaign, host) {
    return Object.keys(campaign.nations).sort().flatMap((id) => {
        const stats = campaign.nations[id].stats;
        const hostility = id === host ? 0 : Math.max(0, -(selectRelationship(campaign, host, id)?.trust ?? 0));
        const weight = stats.economy.gdp * (1 + HOSTILE_TARGET_WEIGHT * hostility) * (1 - 0.5 * stats.security.counterIntel);
        return weight > 0 ? [{ nation: id, weight }] : [];
    });
}
export function cyberVictim(campaign, host, roll) {
    const weights = cyberVictimWeights(campaign, host);
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = Math.min(1, Math.max(0, roll)) * total;
    for (const entry of weights) {
        cursor -= entry.weight;
        if (cursor <= 0)
            return entry.nation;
    }
    return weights[weights.length - 1]?.nation ?? host;
}
// How hard one turn of an operator's work bites the host.
const BITE = 0.01;
// What an operator does to the nation it lives in. Damage lands on the host's
// own stats, so an operator left alone makes its host worse at resisting the
// next one.
//
// The values written are absolutes, not deltas: apply()'s nationStat handler
// merges what it is given over the current stats rather than adding to them,
// so the arithmetic has to happen here, against live state.
function crisisEffects(campaign, host, kind) {
    const stats = selectNation(campaign, host)?.stats;
    if (!stats)
        return [];
    const worse = (current, by) => clamp01(current + by);
    switch (kind) {
        case "cartel":
            return [{ kind: "nationStat", nation: host, setStats: { security: { crimeIndex: worse(stats.security.crimeIndex, BITE) } } }];
        case "insurgency":
            return [{ kind: "nationStat", nation: host, setStats: { politics: { regimeStability: worse(stats.politics.regimeStability, -BITE) } } }];
        case "cyber-crew":
            return [{ kind: "nationStat", nation: host, setStats: { security: { counterIntel: worse(stats.security.counterIntel, -BITE) } } }];
        case "pmc":
            return [{ kind: "nationStat", nation: host, setStats: { politics: { legitimacy: worse(stats.politics.legitimacy, -BITE) } } }];
        case "market-actor": {
            // Inflation is not a share: it is held inside its own range, or a bite on
            // a country already past a hundred percent would halve its inflation.
            const [, ceiling] = policyStatBounds(stats, "economy.inflation");
            return [{ kind: "nationStat", nation: host, setStats: { economy: { inflation: Math.min(ceiling, stats.economy.inflation + BITE) } } }];
        }
    }
}
// The player's own stake. An operator inside the player's borders is felt as
// stability, not as a foreign headline.
function playerEffects(campaign, host) {
    if (host !== campaign.founding.nation)
        return [];
    return [{ kind: "metric", deltas: { stability: -0.01 } }];
}
export function crisisFor(campaign, operator) {
    const host = operator.nationality;
    if (!host)
        return undefined;
    const nation = liveNation(campaign, host);
    const profile = OPERATOR_PROFILES[operator.kind];
    if (!nation || !profile)
        return undefined;
    return {
        operator,
        host,
        headline: profile.crisis(nation),
        answerableWith: profile.answerableWith,
    };
}
const round4 = (value) => Math.round(value * 10000) / 10000;
function hostAtWar(campaign, host) {
    return selectActiveConflicts(campaign).some((war) => war.aggressor === host || war.defender === host || war.joined.aggressor.includes(host) || war.joined.defender.includes(host));
}
/** What sets an operator's weekly act rate, each term already weighted: its host's pressure, a war, and the regime's grip. */
export function operatorActTerms(campaign, operator) {
    const host = operator.nationality ? liveNation(campaign, operator.nationality) : undefined;
    const profile = OPERATOR_PROFILES[operator.kind];
    if (!host || !profile)
        return [];
    return [
        { key: "host-pressure", source: "situation", value: round4(profile.pressure(host) * HOST_PRESSURE_WEIGHT) },
        { key: "destabilized", source: "situation", value: hostAtWar(campaign, host.id) ? AT_WAR_WEIGHT : 0 },
        { key: "regime-survival", source: "situation", value: round4(-host.stats.politics.regimeStability * REGIME_GRIP_WEIGHT) },
    ];
}
/** The weekly chance an operator acts, from its terms, held inside a floor and a ceiling so no host is ever quiet or certain. */
export function operatorActRate(terms) {
    const sum = terms.reduce((total, term) => total + term.value, 0);
    return round4(Math.max(ACT_RATE_FLOOR, Math.min(ACT_RATE_CEILING, sum)));
}
/**
 * The reason of record on an act that fired. Threshold zero because the
 * hazard has already fired: the terms explain the act rather than decide it.
 * Public, because an operator's act is news and the host's condition is not
 * a secret.
 */
function operatorActStamp(operator, terms) {
    const willingness = weigh("operator-hazard", terms, { threshold: 0, noiseBound: OPERATOR_REASON_NOISE, noise: 0 });
    return stampOf(willingness, operator.id, operator.nationality, "public");
}
// The turn phase. Operators emerge where the numbers invite them, then every
// live operator presses its host — the player's nation and NPC nations alike,
// with no special case for either.
export const operatorPhase = (state) => {
    const streams = createRngStreams(state.seed);
    const packets = [];
    const spawned = emergingOperators(state, streams);
    if (spawned.length > 0) {
        const items = spawned.flatMap((operator) => {
            const crisis = crisisFor(state, operator);
            return crisis
                ? [{ turn: state.turn + 1, kind: "operator", visibility: "public", headline: crisis.headline, target: crisis.host }]
                : [];
        });
        packets.push({
            source: "operator",
            actor: "world",
            turn: state.turn,
            narration: { summary: items[0]?.headline ?? "New actors are moving outside any government's writ." },
            effects: [{ kind: "operator", spawn: spawned }, ...(items.length > 0 ? [{ kind: "feed", items }] : [])],
        });
    }
    for (const operator of state.operators) {
        // An operator is a standing problem, not a metronome: it presses on some
        // turns and lies quiet on others, so its host has room to act between
        // rounds and the feed stays readable.
        const terms = operatorActTerms(state, operator);
        if (streams.stream("operator-act", operator.id, state.turn).next() >= operatorActRate(terms))
            continue;
        const crisis = crisisFor(state, operator);
        if (!crisis)
            continue;
        // An intrusion crew strikes wherever it chooses; every other operator presses its host.
        const victim = operator.kind === "cyber-crew" ? cyberVictim(state, crisis.host, streams.stream("operator-victim", operator.id, state.turn).next()) : crisis.host;
        const headline = victim === crisis.host ? crisis.headline : intrusionHeadline(state, crisis.host, victim);
        packets.push({
            source: "operator",
            actor: "world",
            turn: state.turn,
            provenance: { origin: "world", entities: victim === crisis.host ? [crisis.host] : [crisis.host, victim], decision: operatorActStamp(operator, terms) },
            narration: { summary: headline },
            effects: [
                ...crisisEffects(state, operator.kind === "cyber-crew" ? victim : crisis.host, operator.kind),
                ...(operator.kind === "cyber-crew" ? cyberImpactEvent(state, victim, operator.id) : []),
                ...playerEffects(state, victim),
                { kind: "feed", items: [{ turn: state.turn + 1, kind: "operator", visibility: "public", headline, target: victim }] },
            ],
        });
    }
    return packets;
};
function intrusionHeadline(campaign, host, victim) {
    const from = selectNation(campaign, host)?.base.identity;
    const into = selectNation(campaign, victim)?.base.identity;
    return `Hackers working out of ${from ? nationName(from) : host} have broken into computer systems in ${into ? nationName(into) : victim}.`;
}
