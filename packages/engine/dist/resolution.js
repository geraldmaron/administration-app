import { strikeAssessmentReading, withStrikeAssessment } from "./strike-assessment.js";
import { actionTermsProblem, supportProjection } from "./action-support.js";
import { hitsBackHarder, failedForceEffects } from "./force-failure.js";
import { strikeCivilianRisk, resolveStrikeHarm } from "./strike-outcomes.js";
import { actionTiming } from "./action-timing.js";
import { actorForNation, selectNation, selectRelationship } from "./state.js";
import { nationName, sentenceCase } from "./naming.js";
import { forceProjectionCost, projectionOdds } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { assessDeterrence, projectConflictConsequence } from "./conflicts.js";
import { coalitionBacking, withBacking } from "./coalition.js";
import { createGrudge, repeatDrag } from "./relationships.js";
import { stewardSway } from "./stewardship.js";
import { capacityCost, covertWatchReportEffect, exposedCovertTargetEffect, foreignSurveillanceExposed, consultationFor, rungDefinition, } from "./instruments.js";
import { forceActBasis } from "./force-costs.js";
import { assessContest } from "./contest.js";
import { forceDomains, nuclearReading } from "./forces.js";
import { CONTEST_DIALS } from "./contest-dials.js";
import { wireLine, wireRisk, wireStake } from "./wire.js";
import { consequenceContribution, drawConsequence, } from "./consequences.js";
import { deedContribution } from "./resolution-deeds.js";
import { projectRipples, rippleContribution } from "./resolution-ripples.js";
import { actProvenance } from "./resolution-provenance.js";
import { covertSuccessExposed, covertSuccessExposureChance } from "./covert-exposure.js";
import { stagedResolutionFor } from "./resolution-sequence.js";
// --- Live reads ---
function liveNation(campaign, id) {
    const runtime = selectNation(campaign, id);
    if (!runtime)
        throw new Error(`no nation ${id} in this campaign`);
    return { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function clamp01(value) {
    return clamp(value, 0, 1);
}
function sharesBorder(actor, target) {
    return actor.geo.neighbors.some((n) => n === target.id);
}
// --- Cost ---
// Rung 1 is a gesture; rung 5 commits the state. The curve is deliberately
// steeper than linear so climbing the ladder is a real decision rather than a
// default.
const RUNG_WEIGHT = { 1: 0.2, 2: 0.45, 3: 1, 4: 2, 5: 3.5 };
// Per-instrument cost of one unit of ladder.
//
// `treasuryOfGdp` is a share of the *acting* nation's annual output: a flat sum
// is a rounding error to a superpower and ruin to a mid-power. Stability,
// standing and readiness are 0..1 metric movement and already relative.
const INSTRUMENT_UNIT_COST = {
    diplomatic: { treasuryOfGdp: 0.0000855, standing: 0.012, stability: 0.002, militaryReadiness: 0 },
    economic: { treasuryOfGdp: 0.0002564, standing: 0.008, stability: 0.005, militaryReadiness: 0 },
    // No readiness line, and for a harder reason than `military` below: covert
    // work does not spend the force at all. It spends the clandestine service,
    // which `COVERT_CAPABILITY_COST` bills and `capacityCost` quotes. Charging it
    // to the force closed the military ladder's gates through a channel the
    // player was never shown.
    covert: { treasuryOfGdp: 0.0001923, standing: 0.003, stability: 0.003, militaryReadiness: 0 },
    // No readiness line: the military rungs bill the force through
    // `MILITARY_READINESS_COST`, which the gates are calibrated against and
    // `capacityCost` quotes. No money line: `force-costs.ts` prices the sorties,
    // hulls and brigades an act sends, from what operations have cost.
    military: { treasuryOfGdp: 0, standing: 0.014, stability: 0.01, militaryReadiness: 0 },
    // Aid is the one instrument whose whole cost is the money: it buys standing
    // rather than spending it, and what it takes at home is the argument about
    // spending abroad while there are needs at home — a small stability line,
    // never a standing one.
    assistance: { treasuryOfGdp: 0.0004274, standing: 0, stability: 0.004, militaryReadiness: 0 },
};
// Distance is paid for by anything that has to physically arrive: an airlift of
// relief and an airlift of paratroopers are priced by the same geography.
const REACHING_INSTRUMENTS = ["military", "covert", "assistance"];
function projectionMultiplier(instrument, actor, target, staging) {
    if (!REACHING_INSTRUMENTS.includes(instrument))
        return 1;
    if (sharesBorder(actor, target))
        return 1;
    return forceProjectionCost(actor, target, staging).multiplier;
}
function militaryBasis(campaign, request, actor, target, staging) {
    return request.instrument === "military" ? forceActBasis(campaign, actor, request.rung, request.force, projectionMultiplier("military", actor, target, staging)) : undefined;
}
function projectCost(request, actor, target, basis, staging) {
    const unit = INSTRUMENT_UNIT_COST[request.instrument];
    const weight = RUNG_WEIGHT[request.rung];
    const reach = projectionMultiplier(request.instrument, actor, target, staging);
    const cost = {
        treasury: basis ? -basis.upFront : -Math.round(unit.treasuryOfGdp * actor.stats.economy.gdp) * weight * reach,
        standing: -unit.standing * weight,
        stability: -unit.stability * weight,
        militaryReadiness: -unit.militaryReadiness * weight,
    };
    // A metric that does not move is not a cost; leaving it out keeps the
    // player-facing projection to the lines that actually matter.
    return Object.fromEntries(Object.entries(cost).filter(([, value]) => value !== 0));
}
// --- Odds ---
// Every dial the odds turn on lives in `contest-dials.ts`. These are the names
// this file reads them by; nothing here is a second copy of a balance figure.
const RUNG_RELIABILITY = CONTEST_DIALS.rungReliability;
const MIN_CHANCE = CONTEST_DIALS.floor;
const MAX_CHANCE = CONTEST_DIALS.ceiling;
/**
 * The matchup, assembled once and used twice: it decides the odds and it is
 * handed to the player on the projection so the odds can be taken apart.
 *
 * Distance enters through the contest rather than beside it — `reach` is a
 * layer of a military contest and `access` is a layer of a covert one, and a
 * player who can see that layer lose can act on it (stage closer, buy basing)
 * in a way a flat penalty on the total never allowed.
 */
function contestFor(campaign, request, actor, target, tension) {
    return assessContest({
        actor,
        target,
        instrument: request.instrument,
        tension,
        rung: request.rung,
        habituation: repeatDrag(campaign, actor.id, target.id, request.instrument),
        distanceMultiplier: sharesBorder(actor, target) ? 1 : forceProjectionCost(actor, target, stagingPoints(campaign, actor.id, target.id)).multiplier,
    });
}
// The rungs at which the defender's arsenal is the question rather than a
// background fact: every act of force, the blockade included, since a first
// blockade opens a war. Below that, nothing is worth a warhead to answer.
const DETERRED_RUNGS = [3, 4, 5];
// How much a nuclear defender stiffens against the top rungs. This is
// resistance, not prohibition: a deterred attempt is a worse bet, and the
// player is told so and may still take it.
const DETERRENCE_DRAG = CONTEST_DIALS.deterrenceDrag;
function deterrenceFor(campaign, request) {
    if (request.instrument !== "military" || !DETERRED_RUNGS.includes(request.rung))
        return undefined;
    return assessDeterrence(campaign, request.actor, request.target, { expectJoiners: request.rung === 5 });
}
function deterrenceDrag(deterrence) {
    const allied = 1 - CONTEST_DIALS.alliedDeterrenceDrag * (deterrence?.alliedSeverity ?? 0);
    if (!deterrence?.defenderNuclear)
        return allied;
    // A mutual arsenal buys back part of the drag: the defender's answer is bounded too.
    const severity = deterrence.retaliationSeverity * (deterrence.mutual ? CONTEST_DIALS.deterrenceMutualRelief : 1);
    return (1 - DETERRENCE_DRAG * severity) * allied;
}
/**
 * The matchup between two governments on one instrument, with no act proposed.
 *
 * A dossier needs the comparison before the player has picked a rung — what
 * their air force is against yours is a fact about the pair, not about a
 * decision — and it must be the same comparison the resolver will use when a
 * decision is made. So it is this function, and the projection calls the same
 * assembler. There is no second estimator here either.
 */
export function contestBetween(campaign, actor, target, instrument) {
    if (actor === target)
        return undefined;
    const actorRuntime = selectNation(campaign, actor);
    const targetRuntime = selectNation(campaign, target);
    if (!actorRuntime || !targetRuntime)
        return undefined;
    const relationship = selectRelationship(campaign, actor, target);
    const request = { actor, target, instrument, rung: 1 };
    return contestFor(campaign, request, liveNation(campaign, actor), liveNation(campaign, target), relationship?.tension ?? 0);
}
/** What a government's forces consist of, domain by domain, as this campaign currently holds them. */
export function liveForceDomains(campaign, id) {
    const runtime = selectNation(campaign, id);
    return runtime ? forceDomains(liveNation(campaign, id)) : undefined;
}
/** What a government's arsenal is worth as a threat, as this campaign currently holds it. */
export function liveNuclearReading(campaign, id) {
    const runtime = selectNation(campaign, id);
    return runtime ? nuclearReading(liveNation(campaign, id)) : undefined;
}
/**
 * The contest's own odds, then the difficulty of the rung being attempted, then
 * what it costs to reach the place at all.
 *
 * The reach penalty stays outside the layered edge for military and covert acts
 * because it is a tax on the whole attempt rather than one more thing to win:
 * an air force that beats theirs three times over still flies the same ocean.
 */
function chanceFrom(contest, request, actor, target, staging) {
    const base = contest.baseChance * RUNG_RELIABILITY[request.rung];
    const reachAdjusted = (request.instrument === "military" || request.instrument === "covert") && !sharesBorder(actor, target)
        ? projectionOdds(actor, target, base, staging)
        : base;
    return clamp(reachAdjusted, MIN_CHANCE, MAX_CHANCE);
}
function partiesFor(campaign, request) {
    const nameOf = (id) => selectNation(campaign, id)?.base.identity.name ?? id;
    return { actor: nameOf(request.actor), target: nameOf(request.target) };
}
/**
 * The two countries as a sentence carries them — with the article the dataset
 * says they take. `partiesFor` returns the bare dataset names because that is
 * what the ledger's own keys and the relationship history are written in; every
 * sentence a player reads goes through here instead.
 */
function wireParties(campaign, request) {
    const identityOf = (id) => selectNation(campaign, id)?.base.identity;
    const named = (id) => {
        const identity = identityOf(id);
        return identity ? nationName(identity) : id;
    };
    return { actor: named(request.actor), target: named(request.target) };
}
/**
 * The act, in the shape the wire desk says it out loud in.
 *
 * Both player-facing sentences the resolver produces go through `wire.ts`: the
 * Record entry a decision leaves behind, and the "if it goes wrong" line the
 * player reads before committing. Assembling either out of the rung's
 * *catalogue* name gives "United States attempts Tariff Increase against
 * Alpland", which is a database row read aloud. The catalogue name is for the
 * catalogue.
 */
function wireActFor(campaign, request, landed, riskId) {
    const parties = wireParties(campaign, request);
    return {
        actor: parties.actor,
        target: parties.target,
        instrument: request.instrument,
        rung: request.rung,
        landed,
        ...(riskId ? { riskId } : {}),
        turn: campaign.turn,
    };
}
// The failure mass (1 - successChance) is partitioned across these branches by
// weight, so the named risks are exhaustive: an attempt either succeeds or
// fails in one of the ways listed here. Nothing happens off the projection.
const RISK_DEFINITIONS = {
    diplomatic: [
        { id: "rebuffed", weight: 0.6, visible: true },
        { id: "public-humiliation", weight: 0.4, visible: true },
    ],
    economic: [
        { id: "retaliation", weight: 0.5, visible: true },
        { id: "market-blowback", weight: 0.5, visible: true },
    ],
    covert: [
        { id: "exposure", weight: 0.5, visible: true },
        { id: "asset-lost", weight: 0.3, visible: false },
        { id: "blowback", weight: 0.2, visible: false },
    ],
    military: [
        { id: "repulsed", weight: 0.5, visible: true },
        { id: "escalation", weight: 0.3, visible: true },
        { id: "atrocity-scandal", weight: 0.2, visible: true },
    ],
    // Aid fails in its own ways, and none of them is "the target refused help".
    // It is stolen on the way, it props up the wrong people, or the promise
    // behind it gets called in a week nobody was ready for.
    assistance: [
        { id: "diverted", weight: 0.45, visible: true },
        { id: "captured-by-the-wrong-hands", weight: 0.35, visible: true },
        { id: "guarantee-called", weight: 0.2, visible: true },
    ],
};
const idsOf = (definitions) => definitions.map((d) => d.id);
export const RISK_IDS = {
    diplomatic: idsOf(RISK_DEFINITIONS.diplomatic),
    economic: idsOf(RISK_DEFINITIONS.economic),
    covert: idsOf(RISK_DEFINITIONS.covert),
    military: idsOf(RISK_DEFINITIONS.military),
    assistance: idsOf(RISK_DEFINITIONS.assistance),
};
function risksFor(campaign, request) {
    // Strike civilian harm has its own roll and can accompany success; a target with nothing to fire back with cannot hit back harder.
    const definitions = request.instrument === "military" && request.rung < 5 ? RISK_DEFINITIONS.military.filter((risk) => risk.id !== "atrocity-scandal") : RISK_DEFINITIONS[request.instrument];
    return request.instrument === "military" && !hitsBackHarder(campaign, request.rung, request.target) ? definitions.filter((risk) => risk.id !== "escalation") : definitions;
}
function projectRisks(campaign, request, successChance) {
    const definitions = risksFor(campaign, request);
    const totalWeight = definitions.reduce((sum, d) => sum + d.weight, 0);
    const failureMass = 1 - successChance;
    return definitions.map((d) => ({
        id: d.id,
        chance: (failureMass * d.weight) / totalWeight,
        // A forecast, not a report: the player has not committed yet.
        description: `${sentenceCase(wireRisk({ ...wireActFor(campaign, request, false, d.id), riskId: d.id }))}.`,
    }));
}
// --- Ripples ---
// How coercive each instrument reads to third parties. A démarche between
// capitals barely registers; an invasion is everyone's business.
// Third parties read aid as an alignment rather than as an attack, so it
// registers at the bottom of this scale — not at zero, because a rival of the
// recipient still notices whose crates and whose rifles arrived.
const COERCION = { assistance: 0.15, diplomatic: 0.5, economic: 0.7, covert: 0.85, military: 1 };
function severityOf(request) {
    return COERCION[request.instrument] * (request.rung / 5);
}
// --- The projection contract ---
/** The context a rung reads its gate and its effects from; shared with the success-effects reader. */
export function actionContext(campaign, request, streams) {
    return {
        campaign,
        actor: request.actor,
        target: request.target,
        streams,
        ...(request.force ? { force: request.force } : {}), ...(request.strikeObjective ? { strikeObjective: request.strikeObjective } : {}), ...(request.regimeAct ? { regimeAct: request.regimeAct } : {}),
    };
}
function gateCheck(campaign, request, streams) {
    return rungDefinition(request.instrument, request.rung).gate(actionContext(campaign, request, streams));
}
// Pure and seed-independent: what the player is shown before committing.
// resolveAction() calls this and nothing else to decide odds, so a projection
// that misrepresents the outcome is impossible by construction rather than by
// discipline.
export function projectAction(campaign, request, streams) {
    request = withStrikeAssessment(campaign, request);
    const termsProblem = actionTermsProblem(campaign, request);
    if (termsProblem)
        return { ok: false, reason: "Invalid presidential action terms", missingCapability: termsProblem };
    const def = rungDefinition(request.instrument, request.rung);
    const parties = partiesFor(campaign, request);
    const relationship = selectRelationship(campaign, request.actor, request.target);
    if (!relationship) {
        return {
            ok: false,
            reason: `${parties.actor} has no relationship with ${parties.target} to act through`,
            missingCapability: `an established relationship with ${parties.target}`,
        };
    }
    const check = gateCheck(campaign, request, streams);
    if (!check.ok) {
        return {
            ok: false,
            reason: `${parties.actor} cannot use ${def.name} against ${parties.target}: missing ${check.missingCapability}`,
            missingCapability: check.missingCapability,
            ...(check.shortfall ? { shortfall: check.shortfall } : {}),
        };
    }
    const actor = liveNation(campaign, request.actor);
    const target = liveNation(campaign, request.target);
    const deterrence = deterrenceFor(campaign, request);
    const capacity = capacityCost(request.instrument, request.rung);
    const conflictConsequence = projectConflictConsequence(campaign, request.actor, request.target, request.instrument, request.rung);
    // Confirmed participation alone changes the shared forecast and execution.
    const contest = contestFor(campaign, request, actor, target, relationship.tension);
    const coalition = coalitionBacking(campaign, request);
    const staging = stagingPoints(campaign, request.actor, request.target);
    const costBasis = militaryBasis(campaign, request, actor, target, staging);
    const successChance = clamp(chanceFrom(contest, request, actor, target, staging) * stewardSway(campaign, request) * deterrenceDrag(deterrence) * (coalition?.oddsMultiplier ?? 1), MIN_CHANCE, MAX_CHANCE);
    return {
        ok: true,
        projection: {
            request,
            rungName: def.name,
            timing: actionTiming(campaign, request),
            civilianRisk: strikeCivilianRisk(campaign, request),
            support: supportProjection(campaign, request), strikeAssessment: strikeAssessmentReading(campaign, request),
            available: true,
            cost: withBacking(projectCost(request, actor, target, costBasis, staging), coalition),
            ...(costBasis ? { costBasis } : {}),
            successChance,
            contest,
            risks: projectRisks(campaign, request, successChance),
            ripples: projectRipples(campaign, request, target, severityOf(request), parties.actor),
            rippleVisibility: request.instrument === "covert" ? "if-exposed" : "always",
            ...(request.instrument === "covert" ? { successExposureChance: covertSuccessExposureChance(campaign, request.target) } : {}),
            ...(deterrence ? { deterrence } : {}),
            ...(conflictConsequence ? { conflict: conflictConsequence } : {}),
            consultation: consultationFor(request.instrument, request.rung),
            ...(capacity ? { capacity } : {}),
            ...(coalition ? { coalition } : {}),
        },
    };
}
function mergeMetricDeltas(parts) {
    const merged = {};
    for (const part of parts) {
        for (const [key, delta] of Object.entries(part)) {
            merged[key] = (merged[key] ?? 0) + delta;
        }
    }
    return merged;
}
// apply() adds these to live metrics and clamps them, so nothing here resolves
// against current state. Approval is settled from the public, and a zero delta
// is not movement.
function metricEffects(deltas) {
    const moved = {};
    for (const [key, delta] of Object.entries(deltas)) {
        if (key === "approval" || delta === 0)
            continue;
        moved[key] = delta;
    }
    return Object.keys(moved).length > 0 ? [{ kind: "metric", deltas: moved }] : [];
}
// What a named failure branch actually does. Failure is never a no-op: the
// attempt was made, and the target knows something was tried.
function riskContribution(campaign, request, risk, visible = risk.visible) {
    const severity = severityOf(request);
    const effects = [];
    if (selectRelationship(campaign, request.actor, request.target)) {
        effects.push({
            kind: "relationship",
            from: request.actor,
            to: request.target,
            deltas: { tension: severity * 0.1 },
            addHistory: {
                turn: campaign.turn,
                kind: `failed-${risk.id}`,
                description: `${sentenceCase(wireStake(wireActFor(campaign, request, false, risk.id)))}.`,
            },
        });
    }
    // The target's own grudge, not the actor's — the aggrieved party is the one
    // who remembers, and its vengefulness sets how slowly.
    const towardActor = selectRelationship(campaign, request.target, request.actor);
    if (visible && towardActor) {
        const vengefulness = selectNation(campaign, request.target)?.traits.vengefulness ?? 0.5;
        effects.push({
            kind: "relationship",
            from: request.target,
            to: request.actor,
            addGrudge: createGrudge(risk.id, clamp01(severity * 0.5), campaign.turn, vengefulness),
        });
    }
    return { effects, metricDeltas: visible ? { standing: -severity * 0.02 } : {} };
}
function pickRisk(campaign, request, draw, successChance) {
    const definitions = risksFor(campaign, request);
    const totalWeight = definitions.reduce((sum, d) => sum + d.weight, 0);
    const failureMass = 1 - successChance;
    let cursor = successChance;
    for (const definition of definitions) {
        cursor += (failureMass * definition.weight) / totalWeight;
        if (draw < cursor)
            return definition;
    }
    // Floating-point residue at the very top of the range: the last branch owns it.
    return definitions[definitions.length - 1];
}
// --- Authored aftermath ---
// The top slice of the success interval: it worked, but only just. The split
// is read off the draw that already happened rather than rolled for, so a
// campaign resolves to exactly what it always did — a partial success is still
// a success, mechanically. What the slice buys is the right to say so, and to
// let an authored card charge for it.
const PARTIAL_SLICE = 0.25;
function valenceOf(success, draw, successChance) {
    if (!success)
        return "failure";
    return draw >= successChance * (1 - PARTIAL_SLICE) ? "partial" : "success";
}
// Consulted only after the branch is known, and drawn on its own stream. Both
// facts matter: a card cannot move the odds it is reacting to, and its draw
// cannot disturb the resolution draw, because streams are pure functions of
// their key and never share state.
function dressOutcome(campaign, request, parties, outcome, streams, extras) {
    const pool = extras.consequences ?? [];
    if (pool.length === 0)
        return undefined;
    const situation = {
        actor: request.actor,
        target: request.target,
        instrument: request.instrument,
        rung: request.rung,
        valence: outcome.valence,
        ...(outcome.riskId !== undefined ? { riskId: outcome.riskId } : {}),
        ...(extras.context ? { context: extras.context } : {}),
    };
    const stream = streams.stream("consequence", request.actor, request.target, request.instrument, request.rung, campaign.turn);
    const card = drawConsequence(campaign, pool, situation, stream);
    if (!card)
        return undefined;
    const scene = { severity: severityOf(request), visible: outcome.visible, parties };
    return { card, contribution: consequenceContribution(campaign, card, situation, scene) };
}
// The resolver's own voice, used whenever no authored card was drawn. An
// authored card speaks instead of this line rather than on top of it: it is
// dressing the very branch that fired, so printing both would be the same
// sentence twice in two registers.
//
// Cost, outcome, ripple and any authored deepening merge into one metric
// effect, so the ledger entry still reads as a single net figure per metric
// however many sources moved it.
//
// `charged` is what makes that honest across actors. A metric effect is not
// addressed to a nation — apply() writes it to the administration — so every
// packet built here billed the player, whoever acted. An NPC recalling its own
// ambassador was charging the player's treasury for the flight and taking the
// standing hit out of the player's own reading, three times a turn, invisibly.
// The world's moves move the world (relationships, nation stats, wars); only
// the player's own moves reach the player's panel.
function assembleEffects(cost, parts, charged) {
    const effects = [
        ...parts.flatMap((part) => part.effects),
        ...metricEffects(mergeMetricDeltas([cost, ...parts.map((part) => part.metricDeltas)])),
    ];
    return charged ? effects : effects.filter((effect) => effect.kind !== "metric");
}
// --- Resolution ---
// The single commit path. Every action in the game — player or NPC — goes
// through here, which is why cost, odds, risk and ripples cannot be bypassed
// by a caller that only wants the effects.
export function resolveAction(campaign, request, streams, source = "action", extras) {
    const projected = projectAction(campaign, request, streams);
    if (!projected.ok)
        return projected;
    const { projection } = projected;
    const def = rungDefinition(request.instrument, request.rung);
    const parties = partiesFor(campaign, request);
    const ctx = actionContext(campaign, request, streams);
    // A force package gets its own stream space so a scaled commitment draws
    // independently of an unscaled one; omitted, the key is byte-identical to
    // what it was before force packages existed, or an existing campaign's
    // saved decisions would resolve to a different outcome on replay.
    const draw = streams
        .stream("resolution", request.actor, request.target, request.instrument, request.rung, ...(request.force ? [request.force.count] : []), campaign.turn)
        .next();
    const success = draw < projection.successChance;
    const risk = success ? undefined : pickRisk(campaign, request, draw, projection.successChance);
    const failureVisible = risk?.visible ?? false;
    const outcome = success
        ? { effects: def.resolve(ctx), metricDeltas: {} }
        : riskContribution(campaign, request, risk, failureVisible);
    // Surveillance carries its own seeded exposure finding. Mission success says
    // the watch worked, not that a foreign government attributed it to the actor.
    const watchExposure = success && request.instrument === "covert" && request.rung === 1
        ? outcome.effects.find((effect) => effect.kind === "intelligence" && effect.product?.exposed !== undefined)
        : undefined;
    const visible = watchExposure?.kind === "intelligence" ? watchExposure.product?.exposed === true
        : success && request.instrument === "covert" && request.rung === 1 ? foreignSurveillanceExposed(ctx)
            : success && request.instrument === "covert" ? covertSuccessExposed(campaign, request.actor, request.target, request.rung)
                : success || failureVisible;
    const ripplesApply = projection.rippleVisibility === "always" ? true : visible;
    const ripple = ripplesApply
        ? rippleContribution(campaign, request, projection.ripples)
        : { effects: [], metricDeltas: {} };
    const exposedTarget = success && request.instrument === "covert" && request.rung > 1 && visible
        ? exposedCovertTargetEffect(ctx) : undefined;
    const valence = valenceOf(success, draw, projection.successChance);
    const drawn = extras
        ? dressOutcome(campaign, request, parties, { valence, ...(risk ? { riskId: risk.id } : {}), visible }, streams, extras)
        : undefined;
    // Stated on the packet, not left to the sentence. An authored card replaces
    // the narration wholesale, so this is the only place the instrument, the
    // rung and the outcome survive an aftermath somebody wrote well.
    const commitment = {
        instrument: request.instrument,
        rung: request.rung,
        target: request.target,
        landed: success,
    };
    const harm = resolveStrikeHarm(campaign, request, streams, success);
    const failedForce = !success && request.instrument === "military" ? { effects: failedForceEffects(ctx, request.rung, risk?.id), metricDeltas: {} } : undefined;
    const failedWatch = !success && request.instrument === "covert" && request.rung === 1
        ? covertWatchReportEffect(ctx, failureVisible) : undefined;
    const effects = assembleEffects(projection.cost, [outcome, ripple, ...(exposedTarget ? [{ effects: [exposedTarget], metricDeltas: {} }] : []), ...(failedForce ? [failedForce] : []), ...(failedWatch ? [{ effects: [failedWatch], metricDeltas: {} }] : []), ...(harm ? [{ effects: harm.effects, metricDeltas: {} }] : []), ...(drawn ? [drawn.contribution] : []), deedContribution(campaign, request.actor, commitment, visible)], request.actor === campaign.founding.nation);
    const packet = {
        source,
        actor: actorForNation(campaign, request.actor),
        turn: campaign.turn,
        provenance: actProvenance(campaign, request, effects, visible),
        narration: {
            summary: [drawn ? drawn.contribution.beats.join(" ") : wireLine(wireActFor(campaign, request, success, risk?.id)), harm?.account,
                failedWatch?.kind === "intelligence" && failedWatch.product?.status === "findings"
                    ? "The watch did not achieve its objective, but limited reporting reached the desk." : undefined,
            ].filter(Boolean).join(" "),
        },
        commitment,
        effects,
    };
    return {
        ok: true,
        projection,
        success,
        ...(harm?.casualties ? { civilianCasualties: harm.casualties } : {}),
        ...(risk ? { risk: projection.risks.find((r) => r.id === risk.id) } : {}),
        ...(drawn ? { consequence: { id: drawn.card.id, valence, beats: drawn.contribution.beats } } : {}),
        ...stagedResolutionFor({
            campaignSeed: campaign.seed,
            actor: request.actor,
            target: request.target,
            instrument: request.instrument,
            rung: request.rung,
            turn: campaign.turn,
        }, valence, risk?.id, extras?.sequences),
        packet,
    };
}
