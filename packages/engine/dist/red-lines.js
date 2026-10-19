import { readPlayerCommitments } from "./ledger-reading.js";
import { selectActiveConflicts, selectNation } from "./state.js";
// The families. Grouped by what the sentence is actually about, because that is
// what decides which acts cross it: a line about territory is crossed by force
// on the ground, a line about a strait by a blockade, a line about the system
// of government by an operation against it, and a line about economic
// sovereignty by the money rather than by the army — and it is answered in
// kind, not with a war.
const FORCE_ON_ITS_SOIL = { instruments: ["military"], crossedFrom: 2, answeredAt: 3 };
const TERRITORY = { instruments: ["military"], crossedFrom: 2, answeredAt: 3 };
const APPROACHES = { instruments: ["military"], crossedFrom: 3, answeredAt: 3 };
const TRANSIT = { instruments: ["military", "economic"], crossedFrom: 3, answeredAt: 3 };
const THE_REGIME = { instruments: ["covert", "military"], crossedFrom: 3, answeredAt: 4 };
const THE_ARSENAL = { instruments: ["military", "covert"], crossedFrom: 3, answeredAt: 4 };
const EXISTENCE = { instruments: ["military"], crossedFrom: 4, answeredAt: 5 };
const ITS_ALLIES = { instruments: ["military"], crossedFrom: 4, answeredAt: 4 };
const ITS_OWN_POLICY = { instruments: ["economic"], crossedFrom: 4, answeredAt: 2 };
const ITS_ALIGNMENT = { instruments: ["covert", "economic"], crossedFrom: 3, answeredAt: 3 };
/**
 * Every authored `RedLine.id`, and what it means to cross it.
 *
 * Keyed on the id rather than parsed out of the sentence: the sentence is
 * written for the player and rewording it must not silently change what the
 * government will answer. `red-lines.test.ts` fails if the dataset ever ships
 * an id this table does not carry, so a new line cannot arrive undeclared.
 */
export const RED_LINE_RULES = {
    // Somebody else's force inside its borders.
    "border-inviolability": FORCE_ON_ITS_SOIL,
    "border-provocation": FORCE_ON_ITS_SOIL,
    "border-security": FORCE_ON_ITS_SOIL,
    "border-sovereignty": FORCE_ON_ITS_SOIL,
    "non-intervention": FORCE_ON_ITS_SOIL,
    "sovereignty-over-security": FORCE_ON_ITS_SOIL,
    "homeland-defense": FORCE_ON_ITS_SOIL,
    "national-security": FORCE_ON_ITS_SOIL,
    "capital-control": FORCE_ON_ITS_SOIL,
    // Ground, and who holds it.
    "border-integrity": TERRITORY,
    "territorial-claims": TERRITORY,
    "territorial-control": TERRITORY,
    "territorial-integrity": TERRITORY,
    "territorial-unity": TERRITORY,
    "territorial-waters": TERRITORY,
    "kashmir-status": TERRITORY,
    "occupied-feature": TERRITORY,
    "island-territory": TERRITORY,
    "delta-territory": TERRITORY,
    "south-atlantic-claim": TERRITORY,
    "unilateral-status-change": TERRITORY,
    "strategic-depth": TERRITORY,
    // The water and air it watches, short of its own ground.
    "arctic-sovereignty": APPROACHES,
    "baltic-security": APPROACHES,
    "high-north": APPROACHES,
    "maritime-approaches": APPROACHES,
    "maritime-claims": APPROACHES,
    "north-sea-approaches": APPROACHES,
    "archipelagic-integrity": APPROACHES,
    "fishing-waters": APPROACHES,
    "sovereign-airspace": APPROACHES,
    // The lanes it sits on and lives off.
    "canal-access": TRANSIT,
    "danish-straits-transit": TRANSIT,
    "gulf-shipping": TRANSIT,
    "malacca-transit": TRANSIT,
    "sea-lane-access": TRANSIT,
    // Who governs it, and whether that is anyone else's business.
    "governance-model": THE_REGIME,
    "regime-security": THE_REGIME,
    "system-continuity": THE_REGIME,
    "succession-integrity": THE_REGIME,
    // What it holds, or is building, that nobody else may touch.
    "nuclear-program": THE_ARSENAL,
    "nuclear-deterrent": THE_ARSENAL,
    "dam-control": THE_ARSENAL,
    "tooling-transfer": THE_ARSENAL,
    "oil-sovereignty": THE_ARSENAL,
    // The last one.
    "existential-threats": EXISTENCE,
    // What it has signed, and who it has signed it with.
    "alliance-obligation": ITS_ALLIES,
    "collective-defense": ITS_ALLIES,
    "patron-alliance": ITS_ALIGNMENT,
    "military-neutrality": ITS_ALIGNMENT,
    "neutrality": ITS_ALIGNMENT,
    "non-alignment": ITS_ALIGNMENT,
    "sovereign-neutrality": ITS_ALIGNMENT,
    // Its own policy, answered with the instrument it was crossed with.
    "eu-fiscal-sovereignty": ITS_OWN_POLICY,
    "sovereign-development": ITS_OWN_POLICY,
    "sovereignty-over-migration": ITS_OWN_POLICY,
};
/**
 * How long a crossing stays answerable.
 *
 * A government that has been struck answers in the weeks after, not for the
 * rest of the campaign: past this the act is a grudge on the relationship,
 * which is where the record of it belongs and where it already decays.
 */
export const CROSSING_ANSWERABLE_FOR = 8;
/** Whether a committed act is the kind of thing this line was drawn against. */
function crosses(rule, instrument, rung) {
    return rule.instruments.includes(instrument) && rung >= rule.crossedFrom;
}
/**
 * The lines this government declared that somebody has crossed lately.
 *
 * Two records are read, and both are records of acts that actually happened.
 * The player's own commitments are stated on the ledger — instrument, rung and
 * target — so a strike on Iran's declared sites is legible as exactly that. A
 * war the actor is currently defending is the other: an invasion in progress
 * crosses every line a country has, and nobody has to look up which.
 *
 * Nothing here reads an NPC's commitments against a third party, because the
 * ledger does not record which government took a world action — only that one
 * did. A crossing this module cannot see is better than a crossing it invents.
 */
export function crossingsAgainst(campaign, holder) {
    const nation = selectNation(campaign, holder)?.base;
    if (!nation || nation.doctrine.redLines.length === 0)
        return [];
    const crossings = [];
    const player = campaign.founding.nation;
    const recent = readPlayerCommitments(campaign).filter((commitment) => commitment.target === holder && campaign.turn - commitment.turn <= CROSSING_ANSWERABLE_FOR);
    for (const redLine of nation.doctrine.redLines) {
        const rule = RED_LINE_RULES[redLine.id];
        if (!rule)
            continue;
        for (const commitment of recent) {
            if (!crosses(rule, commitment.instrument, commitment.rung))
                continue;
            crossings.push({ holder, by: player, redLine, rule, turn: commitment.turn });
        }
        for (const conflict of selectActiveConflicts(campaign)) {
            if (conflict.defender !== holder)
                continue;
            if (!rule.instruments.includes("military"))
                continue;
            crossings.push({ holder, by: conflict.aggressor, redLine, rule, turn: conflict.startedTurn });
        }
    }
    // Heaviest answer first, then most recent, then by id: a government answers
    // the worst thing done to it, and the order has to be the same on every
    // replay when two lines were crossed by the same act.
    return [...crossings].sort((a, b) => b.rule.answeredAt - a.rule.answeredAt || b.turn - a.turn || a.redLine.id.localeCompare(b.redLine.id));
}
/**
 * The crossing this move would be answering, if it is answering one.
 *
 * A move answers a crossing when it is aimed at whoever crossed the line and
 * reaches at least as far up the ladder as the line's own answer: a démarche
 * is not an answer to a strike, and the government said as much itself.
 */
export function answers(crossings, target, rung) {
    return crossings.find((crossing) => crossing.by === target && rung >= crossing.rule.answeredAt);
}
/**
 * How much a government wants a move because it is the answer it promised.
 *
 * Scaled by how far the answer goes past the rung the line itself names, so
 * the promised answer is preferred to an unpromised escalation on top of it —
 * a state that said it would answer a strike does not thereby want a war.
 */
export function redLinePull(crossing, rung) {
    if (!crossing)
        return 0;
    const overshoot = (rung - crossing.rule.answeredAt) / 5;
    return Math.max(0, 1 - overshoot);
}
/** Whether this government's own lines are about ground, which is what a disputed border is. */
export function holdsTerritorialLine(nation) {
    return nation.doctrine.redLines.some((line) => RED_LINE_RULES[line.id] === TERRITORY);
}
