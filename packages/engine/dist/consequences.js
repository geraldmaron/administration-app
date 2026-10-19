import { hasFlag, selectNation, selectRelationship } from "./state.js";
import { createGrudge } from "./relationships.js";
import { markedFlags } from "./marked-flags.js";
import { rungCatalogueName, wireLine, wireName, wireStake } from "./wire.js";
import { nationName, possessive } from "./naming.js";
export function rungBand(rung) {
    if (rung <= 2)
        return "low";
    return rung === 3 ? "mid" : "high";
}
// A card's own record in the open flag set. It carries both jobs at once:
// whether a once-only card has already been spent, and whether this campaign
// has seen this aftermath before — which is exactly what a later scenario
// wants to gate on. Riding the existing flag record means no new campaign
// field and no save migration.
export function consequenceFlag(id) {
    return `consequence:${id}`;
}
// A country in an authored beat is written as a bare placeholder, and a bare
// string swap produces "as long as United States wanted it to hold" and
// "United States's service", sentences no desk would file. The name goes in
// with the article a sentence needs, the possessive is
// formed by the rule rather than by the literal apostrophe the template
// carried, and the capital is put back at every sentence boundary the
// substitution may have opened.
function substitute(text, token, name) {
    const articled = nationName(name);
    return text
        .replaceAll(`{{${token}}}'s`, possessive(articled))
        .replaceAll(`{{${token}}}’s`, possessive(articled))
        .replaceAll(`{{${token}}}`, articled);
}
export function renderBeat(text, parties) {
    const rendered = substitute(substitute(text, "actor", parties.actor), "target", parties.target);
    return rendered.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead, letter) => `${lead}${letter.toUpperCase()}`);
}
// --- Eligibility ---
function matchesList(allowed, value) {
    if (!allowed)
        return true;
    return value !== undefined && allowed.includes(value);
}
function matchesRelationship(campaign, situation, conditions) {
    if (conditions.minTension === undefined && conditions.maxTrust === undefined)
        return true;
    const relationship = selectRelationship(campaign, situation.actor, situation.target);
    if (!relationship)
        return false;
    if (conditions.minTension !== undefined && relationship.tension < conditions.minTension)
        return false;
    if (conditions.maxTrust !== undefined && relationship.trust > conditions.maxTrust)
        return false;
    return true;
}
function matchesConditions(campaign, situation, card) {
    const conditions = card.conditions;
    if (!conditions)
        return true;
    if (!matchesList(conditions.scenarioClass, situation.context?.scenarioClass))
        return false;
    if (!matchesList(conditions.tone, situation.context?.tone))
        return false;
    if (conditions.intelFalse !== undefined && conditions.intelFalse !== situation.context?.intelFalse)
        return false;
    for (const flag of conditions.flagsSet ?? [])
        if (!hasFlag(campaign, flag))
            return false;
    for (const flag of conditions.flagsClear ?? [])
        if (hasFlag(campaign, flag))
            return false;
    return matchesRelationship(campaign, situation, conditions);
}
// A risk-specific card is refused on any branch but its own, and is refused
// outright on an outcome that had no failure branch at all.
function matchesRisk(card, situation) {
    if (!card.riskAffinity)
        return true;
    return situation.riskId !== undefined && card.riskAffinity.includes(situation.riskId);
}
export function eligibleConsequences(campaign, pool, situation) {
    const band = rungBand(situation.rung);
    return pool.filter((card) => card.weight > 0 &&
        card.instrument === situation.instrument &&
        card.valence === situation.valence &&
        card.rungBands.includes(band) &&
        matchesRisk(card, situation) &&
        !(card.once === true && hasFlag(campaign, consequenceFlag(card.id))) &&
        matchesConditions(campaign, situation, card));
}
// Weighted, seeded, and stable under replay. The stream is the caller's to
// name, which is how this draw is kept off every stream that already exists.
export function drawConsequence(campaign, pool, situation, stream) {
    const eligible = eligibleConsequences(campaign, pool, situation);
    if (eligible.length === 0)
        return undefined;
    const total = eligible.reduce((sum, card) => sum + card.weight, 0);
    const roll = stream.next() * total;
    let cursor = 0;
    for (const card of eligible) {
        cursor += card.weight;
        if (roll < cursor)
            return card;
    }
    // Floating-point residue at the very top of the range: the last card owns it.
    return eligible[eligible.length - 1];
}
// --- Contribution ---
function relationshipEffect(campaign, situation, direction, deltas) {
    const from = direction === "actor-to-target" ? situation.actor : situation.target;
    const to = direction === "actor-to-target" ? situation.target : situation.actor;
    if (!selectRelationship(campaign, from, to))
        return undefined;
    return { kind: "relationship", from, to, deltas };
}
// The aggrieved party is the one who remembers, and only about something it
// knows happened — so a grudge from an operation nobody caught is dropped
// rather than quietly planted.
function grudgeEffect(campaign, situation, scene, cause, weight) {
    if (!scene.visible)
        return undefined;
    if (!selectRelationship(campaign, situation.target, situation.actor))
        return undefined;
    const vengefulness = selectNation(campaign, situation.target)?.traits.vengefulness ?? 0.5;
    return {
        kind: "relationship",
        from: situation.target,
        to: situation.actor,
        addGrudge: createGrudge(cause, Math.max(0, Math.min(1, weight)), campaign.turn, vengefulness),
    };
}
// The feed is what the player could plausibly have found out. An outcome
// nobody witnessed still reaches them, but as intelligence rather than press —
// the card names the line, never how widely it traveled.
function feedEffect(campaign, situation, scene, headline) {
    return {
        kind: "feed",
        items: [
            {
                turn: campaign.turn,
                kind: "press",
                visibility: scene.visible ? "public" : "intelligence",
                headline: renderBeat(headline, scene.parties),
                actor: situation.actor,
                target: situation.target,
            },
        ],
    };
}
// The act the card is dressing, as the wire desk says it. The parties arrive
// here as bare display names, so the article a sentence needs is put back on
// before anything is composed out of them.
function wireActFor(campaign, situation, scene) {
    return {
        actor: wireName(scene.parties.actor),
        target: wireName(scene.parties.target),
        instrument: situation.instrument,
        rung: situation.rung,
        landed: situation.valence !== "failure",
        ...(situation.riskId !== undefined ? { riskId: situation.riskId } : {}),
        turn: campaign.turn,
    };
}
function firstSentence(text) {
    const match = text.trim().match(/^[^.!?]+[.!?]?/);
    return (match?.[0] ?? text).trim();
}
/**
 * The dispatch an act gets when the card that spoke for it wrote no feed line.
 *
 * Most cards carry beats and no `feed` recipe, and the result was that a player
 * could commit an instrument, read a paragraph of aftermath in the Record, and
 * find nothing at all in the feed — two acts out of three ended in silence on
 * the surface that is supposed to report the world back. The headline is the
 * plain sentence for the act itself, so the feed always says who did what to
 * whom; the card's own first sentence rides along as the particular the piece
 * behind it opens on, because it is the better-written half and it is already
 * true of this outcome.
 */
function fallbackFeedEffect(campaign, situation, scene, card) {
    const act = wireActFor(campaign, situation, scene);
    const beat = card.beats[0];
    const particular = beat ? firstSentence(renderBeat(beat, scene.parties)) : undefined;
    const catalogueName = rungCatalogueName(situation.instrument, situation.rung);
    return {
        kind: "feed",
        items: [
            {
                turn: campaign.turn,
                // The President's own act files under its own kind, so the Desk can
                // read "your order" against the week's foreign traffic instead of
                // dressing the player's strike as somebody else's move.
                kind: situation.actor === campaign.founding.nation ? "player-action" : "npc-action",
                visibility: scene.visible ? "public" : "intelligence",
                headline: wireLine(act),
                actor: situation.actor,
                target: situation.target,
                facts: {
                    stake: particular ?? wireStake(act),
                    ...(catalogueName ? { instrument: catalogueName } : {}),
                },
            },
        ],
    };
}
function scaledDeltas(deltas, scale) {
    const out = {};
    for (const [key, delta] of Object.entries(deltas)) {
        out[key] = delta * scale;
    }
    return out;
}
function recipeEffects(campaign, situation, scene, card) {
    const effects = [];
    const metricDeltas = {};
    for (const recipe of card.effects) {
        if (recipe.kind === "metric") {
            const deltas = recipe.scaleBySeverity ? scaledDeltas(recipe.deltas, scene.severity) : recipe.deltas;
            for (const [key, delta] of Object.entries(deltas)) {
                metricDeltas[key] = (metricDeltas[key] ?? 0) + delta;
            }
            continue;
        }
        const effect = recipe.kind === "relationship"
            ? relationshipEffect(campaign, situation, recipe.direction, recipe.deltas)
            : recipe.kind === "grudge"
                ? grudgeEffect(campaign, situation, scene, recipe.cause, recipe.weight)
                : feedEffect(campaign, situation, scene, recipe.headline);
        if (effect)
            effects.push(effect);
    }
    return { effects, metricDeltas };
}
// What a drawn card actually does, alongside the branch that fired rather than
// instead of it: the outcome already happened, and this deepens it.
export function consequenceContribution(campaign, card, situation, scene) {
    const { effects, metricDeltas } = recipeEffects(campaign, situation, scene, card);
    const wroteFeedLine = card.effects.some((recipe) => recipe.kind === "feed");
    const stamped = [
        ...effects,
        ...(wroteFeedLine ? [] : [fallbackFeedEffect(campaign, situation, scene, card)]),
        // Turn-stamped, because a card's flag is a deed a later scenario is meant
        // to be able to wait on. An unmarked flag reads as old by construction to
        // `agedAtLeast`, so the first follow-up written against an aftermath card
        // would arrive the same week as the thing it follows, at full ripeness.
        { kind: "flag", set: markedFlags([consequenceFlag(card.id), ...(card.sets ?? [])], campaign.turn) },
    ];
    // The counterpart keeps the line, and only when it had reason to notice.
    if (card.remembered && scene.visible && selectRelationship(campaign, situation.target, situation.actor)) {
        stamped.push({
            kind: "relationship",
            from: situation.target,
            to: situation.actor,
            addHistory: { turn: campaign.turn, kind: "consequence", description: renderBeat(card.remembered, scene.parties) },
        });
    }
    return { effects: stamped, metricDeltas, beats: card.beats.map((beat) => renderBeat(beat, scene.parties)) };
}
