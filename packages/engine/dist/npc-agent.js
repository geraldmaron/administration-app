import { agendaTheme } from "@admin/world";
import { selectNation, selectRelationshipsFrom } from "./state.js";
import { disposition, grudgeWeight } from "./relationships.js";
import { INSTRUMENT_COERCION, INSTRUMENT_IDS, RUNG_LEVELS } from "./instruments.js";
import { projectAction } from "./resolution.js";
import { focusFor } from "./pursuits.js";
import { coercionCause, propensityFor } from "./propensity.js";
import { ratificationDrag, regimeSurvivalDrive } from "./governance.js";
import { answers, crossingsAgainst, redLinePull } from "./red-lines.js";
import { probePricingMultiplier, revealedPreference } from "./revealed-preference.js";
import { stampOf, weigh as weighWillingness } from "./willingness.js";
import { appetite, inwardPull, liveTemperament } from "./temperament.js";
import { leaderRapportBetween } from "./foreign-leader.js";
import { leaderPersonalityOn } from "./leader-index.js";
import { engagementAffinity, engagementCandidates, projectReceive } from "./engagement.js";
import { coercionClaims } from "./coercion-tempo.js";
import { firstTempoRefusal } from "./npc-tempo.js";
// --- Preference tables ---
// How much each instrument serves each kind of aim. A nation whose campaign
// agendas are about revenue reaches for trade before it reaches for troops,
// and one whose aims are inward-facing reaches outward for little at all.
// Assistance serves aims the coercive four serve badly: a state chasing
// standing gives, a state buying a client's autonomy from somebody else gives,
// and a state whose whole security problem is a neighbor coming apart gives
// before it shoots. Only a purely inward agenda finds it close to pointless.
const THEME_AFFINITY = {
    security: { diplomatic: 0.35, economic: 0.35, covert: 0.7, military: 0.9, assistance: 0.5 },
    economic: { diplomatic: 0.5, economic: 0.95, covert: 0.3, military: 0.15, assistance: 0.55 },
    prestige: { diplomatic: 0.95, economic: 0.45, covert: 0.2, military: 0.25, assistance: 0.85 },
    autonomy: { diplomatic: 0.6, economic: 0.6, covert: 0.5, military: 0.3, assistance: 0.55 },
    internal: { diplomatic: 0.45, economic: 0.4, covert: 0.35, military: 0.2, assistance: 0.25 },
};
// An agenda with no classified theme should not push the nation anywhere.
const NEUTRAL_AFFINITY = 0.5;
const WEIGHTS = {
    agendaFit: 1,
    intentMatch: 0.9,
    opportunity: 0.6,
    escalationFit: 0.5,
    restraint: 1,
    affordability: 1,
    propensity: 0.9,
    focus: 1,
    salience: 0.7,
    redLine: 1.2,
    survival: 0.5,
};
// Below this, doing nothing is the better move. Set so that a nation with no
// aim served, poor odds and real costs holds rather than acting for the sake
// of it — an NPC that acts every turn is noise, not behavior.
const ACT_THRESHOLD = 1.8;
// A single action may not commit more than this share of the reserves that
// back it. Above it the move is not expensive, it is unfundable.
const MAX_RESERVE_COMMITMENT = 0.25;
// What one rung above the ratification line costs a government that has to be
// ratified. Set so that a cabinet answerable to a chamber this week pays about
// a third of a term for a limited strike and two thirds for an invasion, and a
// junta pays neither.
const RATIFICATION_STEP = 0.3;
const JITTER_SPREAD = 0.04;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// The government as it decides this week: its authored record, this
// campaign's rolled stats, and the temperament its seated leader moves. Every
// term below reads the temperament off this, never off the dataset traits.
function liveNation(campaign, id) {
    const runtime = selectNation(campaign, id);
    if (!runtime)
        throw new Error(`no nation ${id} in this campaign`);
    return { ...runtime.base, stats: runtime.stats, traits: liveTemperament(campaign, id) ?? runtime.traits };
}
// --- Terms ---
// Weighted across the nation's rolled agendas, so the aims it happens to hold
// this campaign — not its authored archetype — decide what it reaches for.
function agendaFit(actor, instrument) {
    const agendas = actor.traits.agendas;
    const totalWeight = agendas.reduce((sum, a) => sum + a.weight, 0);
    if (totalWeight === 0)
        return NEUTRAL_AFFINITY;
    const weighted = agendas.reduce((sum, agenda) => {
        const theme = agendaTheme(agenda.id);
        const affinity = theme ? THEME_AFFINITY[theme][instrument] : NEUTRAL_AFFINITY;
        return sum + affinity * agenda.weight;
    }, 0);
    return weighted / totalWeight;
}
// How far two leaders' personal rapport moves how one government reads the
// other: a pair who get on read a quarrel a little more kindly, a pair who
// cannot stand each other a little worse. Small beside the record between the
// two countries, which is what a government mostly acts on.
const RAPPORT_PULL = 0.08;
// How badly the actor currently reads the target, folding trust, tension,
// live grudges and the coercion this government has landed on it through the
// same disposition score the rest of the engine uses. The campaign is what
// carries that last term: the record of what was done to a nation lives in
// the flag set, not on the relationship.
function hostility(relationship, actor, campaign) {
    const base = (1 - disposition(relationship, campaign)) / 2;
    const grudgeDrive = clamp01(grudgeWeight(relationship)) * actor.traits.vengefulness;
    const rapport = leaderPersonalityOn() ? leaderRapportBetween(campaign, actor.id, relationship.to) : 0;
    return clamp01(base * 0.75 + grudgeDrive * 0.25 - rapport * RAPPORT_PULL);
}
// A nation reaches for the level of coercion that matches how it reads the
// target: a friendly neighbor gets a démarche, a resented one gets worse.
// Aggression shifts the whole scale up without erasing the reading.
function intentMatch(instrument, actor, relationship, campaign) {
    const temper = actor.traits;
    const wanted = clamp01(hostility(relationship, actor, campaign) * 0.7 + temper.aggression * 0.3);
    return 1 - Math.abs(wanted - INSTRUMENT_COERCION[instrument]);
}
// How far up the ladder this nation is willing to step at all, independent of
// who the target is.
function escalationFit(rung, actor) {
    return 1 - Math.abs(rung / 5 - appetite(actor.traits));
}
// The things that stop a nation short of what it would otherwise like to do:
// a legalistic state balks at covert work and at the top of the ladder, an
// isolationist one balks at acting abroad at all, and a reliable one does not
// casually turn on a nation it has signed something with.
function restraint(request, actor, relationship, ratification) {
    // Legalism and transparency both brake covert work, for different reasons
    // and so they compound: a legalistic state balks because the thing is
    // unlawful, a transparent one because it could not keep it quiet if it
    // tried. An opaque state with no scruples has neither brake.
    const temper = actor.traits;
    const covertScruple = request.instrument === "covert" ? temper.legalism * 0.35 + temper.transparency * 0.3 : 0;
    // A blockade opens a war the first time it lands, so it is weighed as the
    // strike is: the same scruple and the same chamber stand in front of it.
    const height = request.instrument === "military" && request.rung === 3 ? 4 : request.rung;
    const ladderScruple = height >= 4 ? temper.legalism * 0.25 * (height - 3) : 0;
    // Isolationism is the strongest brake in the set: a nation that has decided
    // its business is its own does not merely prefer cheaper moves, it declines
    // to reach outward at all.
    const inward = inwardPull(temper);
    const treatyScruple = relationship.treaties.length > 0 ? temper.reliability * 0.4 * INSTRUMENT_COERCION[request.instrument] : 0;
    // The one brake that is a fact about the constitution rather than about the
    // personality. A government that can lose a confidence vote this week cannot
    // open a front without carrying the chamber, and an elected one answers for
    // it at a date it does not control; a throne or a junta answers to nobody it
    // has to persuade in advance. It bites only at the top of the ladder, which
    // is where ratification is actually the question.
    const assemblyDrag = height >= 4 ? ratification * RATIFICATION_STEP * (height - 3) : 0;
    return -(covertScruple + ladderScruple + inward + treatyScruple + assemblyDrag);
}
/**
 * How much of this government's foreign policy is about this country.
 *
 * The agent used to rank targets on `opportunity` alone among the terms that
 * separate one country from another, which made the hardest target on the board
 * the least interesting one — and the United States is the hardest target on
 * every board. So the world's governments spent a hundred weeks pressing
 * whoever was softest, and the President was acted on six times in a thousand.
 * Difficulty is not the same fact as importance. This is importance: the
 * country's own weight, how much of this actor's trade runs through it, how
 * much force it reads pointed this way, and whether the actor's own doctrine
 * names it or shares a border with it.
 */
function salience(actor, target, relationship) {
    const named = actor.doctrine.alignmentPull.some((id) => id === target.id);
    const adjacent = actor.geo.neighbors.some((id) => id === target.id);
    const weight = (target.bands.powerTier - 1) / 4;
    return clamp01(weight * 0.35 +
        relationship.tradeDependence * 0.25 +
        relationship.militaryThreat * 0.2 +
        (named || adjacent ? 0.2 : 0));
}
/**
 * What a government losing its own hold does about it.
 *
 * Scaled by how coercive the move is, because that is the axis the two answers
 * differ on: a shaky government whose elite is united reaches for something it
 * can be seen winning, and one whose elite is at each other's throats has no
 * attention left to spend on anybody else's country. A secure government reads
 * zero and is deciding on the other terms, which is the common case.
 */
function survival(runtime, instrument) {
    return regimeSurvivalDrive(runtime) * INSTRUMENT_COERCION[instrument];
}
// Money already spent is not a preference, it is a bill: the closer an action
// comes to the reserves that fund it, the harder it pushes back.
function affordability(projection, actor) {
    const spend = Math.abs(projection.cost.treasury ?? 0);
    const reserves = actor.stats.economy.reserves;
    if (reserves <= 0)
        return -1;
    return -clamp01(spend / (reserves * MAX_RESERVE_COMMITMENT));
}
function canFund(projection, actor) {
    const spend = Math.abs(projection.cost.treasury ?? 0);
    return spend <= actor.stats.economy.reserves * MAX_RESERVE_COMMITMENT;
}
function scoreTerms(campaign, request, projection, actor, targetNation, relationship, standing, answering, streams, turn) {
    const draw = streams
        .stream("npc-agent", request.actor, request.target, request.instrument, request.rung, turn)
        .next();
    return {
        agendaFit: agendaFit(actor, request.instrument),
        intentMatch: intentMatch(request.instrument, actor, relationship, campaign),
        opportunity: projection.successChance,
        escalationFit: escalationFit(request.rung, actor),
        restraint: restraint(request, actor, relationship, standing.ratification),
        affordability: affordability(projection, actor),
        propensity: propensityFor(request.instrument, actor, targetNation),
        focus: focusFor(campaign, request.actor, request.target, request.rung),
        salience: salience(actor, targetNation, relationship),
        redLine: redLinePull(answering, request.rung),
        survival: survival(standing.runtime, request.instrument),
        jitter: (draw - 0.5) * JITTER_SPREAD,
    };
}
export function scoreOf(terms) {
    const weighted = terms.agendaFit * WEIGHTS.agendaFit +
        terms.intentMatch * WEIGHTS.intentMatch +
        terms.opportunity * WEIGHTS.opportunity +
        terms.escalationFit * WEIGHTS.escalationFit +
        terms.restraint * WEIGHTS.restraint +
        terms.affordability * WEIGHTS.affordability +
        terms.propensity * WEIGHTS.propensity +
        terms.focus * WEIGHTS.focus +
        terms.salience * WEIGHTS.salience +
        terms.redLine * WEIGHTS.redLine +
        terms.survival * WEIGHTS.survival +
        terms.jitter;
    return Math.round(weighted * 10000) / 10000;
}
// --- Enumeration ---
// Every rung of every instrument against a target the record gives a cause to
// coerce; only assistance against one it gives none, since giving needs no
// quarrel.
function everyRequest(actor, targets, coercible) {
    const requests = [];
    for (const target of targets) {
        const instruments = coercible.has(target) ? INSTRUMENT_IDS : ["assistance"];
        for (const instrument of instruments) {
            for (const rung of RUNG_LEVELS)
                requests.push({ actor, target, instrument, rung });
        }
    }
    return requests;
}
// Ranking is by score, then by a stable key, so two candidates that score
// identically still order the same way on every replay.
function candidateOrder(a, b) {
    if (b.score !== a.score)
        return b.score - a.score;
    const key = (c) => `${c.request.target}:${c.request.instrument}:${c.request.rung}`;
    return key(a).localeCompare(key(b));
}
function weigh(campaign, request, actorNation, outward, standing, measure, streams) {
    // The world's rate comes before the price: an act the term has no room for
    // is not a candidate however well it scores.
    const rationed = firstTempoRefusal(campaign, coercionClaims(campaign, request));
    if (rationed)
        return { rejection: { request, reason: rationed, missingCapability: "room in the world's tempo for this act" } };
    const projected = projectAction(campaign, request, streams);
    if (!projected.ok) {
        return { rejection: { request, reason: projected.reason, missingCapability: projected.missingCapability } };
    }
    if (!canFund(projected.projection, actorNation)) {
        return {
            rejection: {
                request,
                reason: `${actorNation.identity.name} cannot fund ${projected.projection.rungName} against ${request.target} out of its reserves`,
                missingCapability: `reserves covering ${Math.round(Math.abs(projected.projection.cost.treasury ?? 0))}M`,
            },
        };
    }
    const answering = answers(standing.crossings, request.target, request.rung);
    const terms = scoreTerms(campaign, request, projected.projection, actorNation, liveNation(campaign, request.target), outward.get(request.target), standing, answering, streams, campaign.turn);
    return {
        candidate: {
            request,
            rungName: projected.projection.rungName,
            projection: projected.projection,
            // A state that has watched the player concede prices its next probe
            // cheaper. Only the player is read this way: the profile is derived from
            // the player's own record, and no such record is kept for an NPC.
            score: scoreOf(terms) * (request.target === campaign.founding.nation ? measure : 1),
            terms,
            ...(answering ? { answering } : {}),
        },
    };
}
// --- The presidency as a target ---
// How much cheaper a presidency facing removal reads abroad at the height of
// the pressure, and how much dearer one the world holds in high standing reads
// at the top of that scale. Planning values: a weighting on the probe price the
// record already sets, bounded so it never outvotes the record itself.
const BRINK_DISCOUNT = 0.25;
const STANDING_DETERRENCE = 0.3;
const EXPOSURE_FLOOR = 0.7;
const EXPOSURE_CEILING = 1.3;
/**
 * What the President's own position does to the price of a move against them:
 * a government fighting for its survival at home is a cheaper target, and one
 * other capitals deal with on good terms is a dearer one. Centered so a
 * presidency at middling standing and under no pressure prices nothing.
 */
export function presidencyExposure(campaign) {
    const brink = clamp01(campaign.removal.pressure);
    const standing = clamp01(campaign.player.metrics.standing);
    const exposure = 1 + BRINK_DISCOUNT * brink - STANDING_DETERRENCE * (standing - 0.5);
    return Math.max(EXPOSURE_FLOOR, Math.min(EXPOSURE_CEILING, exposure));
}
/** The whole price a government puts on a move against the President: the record's reading and the presidency's own position. */
export function playerTargetMeasure(campaign, actorTraits) {
    return probePricingMultiplier(revealedPreference(campaign), actorTraits) * presidencyExposure(campaign);
}
/**
 * How much a government would get from an engagement, on the agent's own
 * scale. An engagement is an act as well, so it answers to the same terms and
 * lands in the same argmax as a coercive rung, but it needs no priced ripple
 * walk: its effect is a fixed bounded warming, and whether the other side would
 * receive it is the one reading the agent needs. It weighs a little less than a
 * rung that moves something, so a world of friendly calls does not crowd out a
 * government's actual quarrels.
 */
const ENGAGEMENT_WEIGHT = 0.85;
const RECEIVE_ODDS = { likely: 0.8, close: 0.5, unlikely: 0.2 };
function engagementTerms(campaign, request, actor, relationship, streams) {
    const draw = streams.stream("npc-agent", request.actor, request.target, "engagement", request.kind, campaign.turn).next();
    const temper = actor.traits;
    return {
        agendaFit: engagementAffinity(temper),
        intentMatch: 1 - hostility(relationship, actor, campaign),
        opportunity: RECEIVE_ODDS[projectReceive(campaign, request).forecast],
        escalationFit: 1 - appetite(temper),
        restraint: -inwardPull(temper) * 0.5,
        affordability: 0,
        propensity: 0,
        focus: 0,
        salience: salience(actor, liveNation(campaign, request.target), relationship),
        redLine: 0,
        survival: 0,
        jitter: (draw - 0.5) * JITTER_SPREAD,
    };
}
function scoreEngagements(campaign, actor, outward, targets, streams) {
    return engagementCandidates(campaign, actor.id, targets)
        .map((request) => {
        const terms = engagementTerms(campaign, request, actor, outward.get(request.target), streams);
        return { request, terms, score: Math.round(scoreOf(terms) * ENGAGEMENT_WEIGHT * 10000) / 10000 };
    })
        .sort((a, b) => b.score - a.score || `${a.request.target}:${a.request.kind}`.localeCompare(`${b.request.target}:${b.request.kind}`));
}
function decisionContext(campaign, actor, options) {
    const actorRuntime = selectNation(campaign, actor);
    if (!actorRuntime)
        throw new Error(`no nation ${actor} in this campaign`);
    const actorNation = liveNation(campaign, actor);
    const outward = new Map(selectRelationshipsFrom(campaign, actor).map((r) => [r.to, r]));
    const allowed = options.targets ? new Set(options.targets) : undefined;
    const targets = [...outward.keys()].filter((t) => !allowed || allowed.has(t));
    // What this government's constitution, its own condition and the lines it has
    // publicly drawn bring to every candidate. Hoisted: none of the three is a
    // fact about the target.
    const standing = {
        ratification: ratificationDrag(actorRuntime),
        crossings: crossingsAgainst(campaign, actor),
        runtime: actorRuntime,
    };
    // What the President's record and position say about pressing them. Hoisted:
    // the profile reads the whole ledger, so recomputing it per candidate would
    // make the scan quadratic in the length of the campaign.
    const measure = playerTargetMeasure(campaign, actorNation.traits);
    return { actorNation, outward, targets, standing, measure };
}
export function decideNpcAction(campaign, actor, streams, options = {}) {
    const context = decisionContext(campaign, actor, options);
    const { actorNation, outward, targets, standing, measure } = context;
    const coercible = new Set(targets
        .filter((target) => coercionCause(campaign, actorNation, target, outward.get(target), standing.crossings) !== undefined)
        .map((target) => target));
    const ranked = [];
    const rejected = [];
    for (const request of everyRequest(actor, targets, coercible)) {
        const weighed = weigh(campaign, request, actorNation, outward, standing, measure, streams);
        if ("rejection" in weighed)
            rejected.push(weighed.rejection);
        else
            ranked.push(weighed.candidate);
    }
    ranked.sort(candidateOrder);
    const best = ranked[0];
    const engagement = scoreEngagements(campaign, actorNation, outward, targets, streams)[0];
    if (engagement && engagement.score >= ACT_THRESHOLD && (!best || engagement.score > best.score)) {
        return { actor, turn: campaign.turn, ranked, rejected, engaged: engagement };
    }
    const hold = holdReasonFor(actor, best);
    return { actor, turn: campaign.turn, ranked, rejected, ...(hold ? { holdReason: hold } : { chosen: best }) };
}
/** Why a nation did nothing, where it did nothing. */
function holdReasonFor(actor, best) {
    if (!best)
        return `${actor} has no move it is capable of making`;
    if (best.score < ACT_THRESHOLD)
        return `${actor} sees nothing worth the cost this turn`;
    return undefined;
}
// Where each of the agent's terms comes from, under the key a stamped reason
// names it by. The agent keeps camelCase fields for its own arithmetic; the
// decision record speaks the vocabulary every other actor's stamp speaks.
const STAMPED_TERMS = {
    agendaFit: { key: "agenda-fit", source: "interest" },
    intentMatch: { key: "intent-match", source: "situation" },
    opportunity: { key: "opportunity", source: "situation" },
    escalationFit: { key: "escalation-fit", source: "trait" },
    restraint: { key: "restraint", source: "trait" },
    affordability: { key: "affordability", source: "situation" },
    propensity: { key: "propensity", source: "situation" },
    focus: { key: "focus", source: "interest" },
    salience: { key: "salience", source: "interest" },
    redLine: { key: "red-line", source: "obligation" },
    survival: { key: "survival", source: "situation" },
};
const round4 = (v) => Math.round(v * 10000) / 10000 || 0;
/**
 * The agent's terms as the decision model's weighted terms, in the order the
 * agent declares them. `scale` is the pricing a government applies to a move
 * against the President it has watched concede, which multiplies the whole
 * score and so multiplies every term's share of it.
 */
export function toTerms(terms, scale = 1) {
    return Object.keys(STAMPED_TERMS).map((field) => ({
        key: STAMPED_TERMS[field].key,
        source: STAMPED_TERMS[field].source,
        value: round4(terms[field] * WEIGHTS[field] * scale),
    }));
}
/**
 * The reason of record for the move a government chose: its weighted terms
 * against the line below which it would have held. Recomputed from what the
 * decision already holds and draws nothing, so stamping a move cannot change
 * which move was made. An intelligence read whatever the act was, because why a
 * foreign government did something is its own counsel even when the act is not.
 */
export function npcActStamp(campaign, decision) {
    const chosen = decision.chosen;
    if (!chosen)
        return undefined;
    const { request } = chosen;
    const scale = request.target === campaign.founding.nation ? playerTargetMeasure(campaign, liveNation(campaign, request.actor).traits) : 1;
    const noiseBound = round4((JITTER_SPREAD / 2) * scale);
    const willingness = weighWillingness("npc-act", toTerms(chosen.terms, scale), {
        threshold: ACT_THRESHOLD,
        noiseBound,
        noise: Math.max(-noiseBound, Math.min(noiseBound, round4(chosen.terms.jitter * scale))),
    });
    return stampOf(willingness, request.actor, request.target, "intelligence");
}
/**
 * The reason of record for an engagement a government chose over every
 * coercive move: the same terms at the weight the argmax gave them. The other
 * side's decision to receive it is stamped by the engagement itself.
 */
export function npcEngagementStamp(decision) {
    const engaged = decision.engaged;
    if (!engaged)
        return undefined;
    const noiseBound = round4((JITTER_SPREAD / 2) * ENGAGEMENT_WEIGHT);
    const willingness = weighWillingness("npc-act", toTerms(engaged.terms, ENGAGEMENT_WEIGHT), {
        threshold: ACT_THRESHOLD,
        noiseBound,
        noise: Math.max(-noiseBound, Math.min(noiseBound, round4(engaged.terms.jitter * ENGAGEMENT_WEIGHT))),
    });
    return stampOf(willingness, engaged.request.actor, engaged.request.target, "intelligence");
}
// The one-line "why" behind a decision, derived from the same weighted terms
// the stamp records rather than written alongside them: the term that pulled
// hardest toward the move, by the key a reason names it with.
export function explainNpcDecision(decision) {
    if (decision.engaged) {
        const { request, terms } = decision.engaged;
        const leading = [...toTerms(terms)].sort((a, b) => b.value - a.value)[0];
        return `${request.actor} chooses a ${request.kind} with ${request.target}, led by ${leading.key}.`;
    }
    if (!decision.chosen)
        return decision.holdReason ?? `${decision.actor} holds.`;
    const { request, rungName, terms, projection } = decision.chosen;
    const leading = [...toTerms(terms)].sort((a, b) => b.value - a.value)[0];
    return (`${request.actor} chooses ${rungName} against ${request.target} ` +
        `(${Math.round(projection.successChance * 100)}% success), led by ${leading.key}.`);
}
