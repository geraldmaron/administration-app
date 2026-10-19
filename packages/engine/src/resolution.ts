import { strikeAssessmentReading, withStrikeAssessment } from "./strike-assessment.js";
import { actionTermsProblem, supportProjection, type SupportChoice, type SupportProjection } from "./action-support.js";
import { hitsBackHarder, failedForceEffects } from "./force-failure.js";
import { strikeCivilianRisk, resolveStrikeHarm, type CivilianRisk } from "./strike-outcomes.js";
import { actionTiming, type ActionTiming } from "./action-timing.js";
import type { Nation, NationId } from "@admin/world";
import { actorForNation, selectNation, selectRelationship, type ActionCommitment, type CasualtyBand, type Campaign, type MetricSet } from "./state.js";
import type { Effect, EffectPacket, EffectSource } from "./effects.js";
import { nationName, sentenceCase } from "./naming.js";
import type { RngStreams } from "./rng.js";
import { forceProjectionCost, projectionOdds, type StagingPoint } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { assessDeterrence, projectConflictConsequence, type ConflictConsequence, type DeterrenceAssessment } from "./conflicts.js";
import { coalitionBacking, withBacking, type CoalitionBacking } from "./coalition.js";
import { createGrudge, repeatDrag } from "./relationships.js";
import { stewardSway } from "./stewardship.js";
import {
  capacityCost,
  covertWatchReportEffect,
  exposedCovertTargetEffect,
  foreignSurveillanceExposed,
  consultationFor,
  rungDefinition,
  type CapabilityCheck,
  type GateShortfall,
  type CapacityCost,
  type Consultee,
  type InstrumentContext,
  type InstrumentId,
  type RungLevel,
} from "./instruments.js";
import type { ForcePackage } from "./force-packages.js";
import { forceActBasis, type ForceCostBasis } from "./force-costs.js";
import { assessContest, type Contest } from "./contest.js";
import { forceDomains, nuclearReading, type ForceDomain, type NuclearReading } from "./forces.js";
import { CONTEST_DIALS } from "./contest-dials.js";
import { wireLine, wireRisk, wireStake, type WireAct } from "./wire.js";
import {
  consequenceContribution,
  drawConsequence,
  type ConsequenceCard,
  type ConsequenceContext,
  type ConsequenceContribution,
  type ConsequenceSituation,
  type ConsequenceValence,
} from "./consequences.js";
import { deedContribution } from "./resolution-deeds.js";
import { projectRipples, rippleContribution } from "./resolution-ripples.js";
import { actProvenance } from "./resolution-provenance.js";
import { covertSuccessExposed, covertSuccessExposureChance } from "./covert-exposure.js";
import { stagedResolutionFor, type ResolutionSequenceEntry, type StagedResolution } from "./resolution-sequence.js";
import type { MetricDeltas } from "./effect-types.js";

export type ResolutionRequest = {
  readonly actor: NationId;
  readonly target: NationId;
  readonly instrument: InstrumentId;
  readonly rung: RungLevel;
  /** Scaleable package. Omitted, the rung's preferred count is used. */
  readonly force?: ForcePackage;
  readonly support?: SupportChoice;
  readonly civilianProtection?: "standard" | "additional-assessment";
  readonly strikeObjective?: import("./strike-assessment.js").StrikeObjective;
  readonly regimeAct?: import("./state-world.js").RegimeAct;
  readonly assessedSite?: { readonly site: NonNullable<import("./impact-event.js").ImpactSpec["site"]>; readonly exposure: import("./impact-event.js").ImpactExposure };
};

// Signed movement per metric (negative = spent), not post-change absolutes —
// the same shape a projection shows the player and a metric effect carries.
export type MetricCost = MetricDeltas;

export type RiskBranch = {
  readonly id: string;
  readonly chance: number; // absolute, not conditional on failure
  readonly description: string;
};

export type RippleRelation = "bloc-partner" | "ally" | "trade-partner" | "bloc-peer" | "domestic";

export type Ripple = {
  readonly nation: NationId;
  readonly relation: RippleRelation;
  readonly magnitude: number;
  readonly reason: string;
};

// Covert work only ripples once somebody knows it happened; everything else
// is visible the moment it lands. This is why a covert rung is worth its
// worse odds — the third-party bill only comes due on exposure.
export type RippleVisibility = "always" | "if-exposed";

export type ActionProjection = {
  readonly request: ResolutionRequest;
  readonly rungName: string;
  readonly timing?: ActionTiming;
  readonly civilianRisk?: CivilianRisk;
  readonly strikeAssessment?: import("./strike-assessment.js").StrikeAssessmentReading;
  readonly support?: SupportProjection;
  /**
   * Always `true` on a projection the resolver returned, and present so that a
   * bare instrument projection satisfies the same shape a scenario reply's
   * projection does.
   *
   * Without it every surface that had a shared way to render a price — one
   * label per metric moved, the odds, the worst branch, the war line, who
   * notices — had to fall back to a local reading for the ladder, and the
   * local reading printed the first cost mark and threw the other three away.
   * A rung that costs money, stability, standing and readiness showed a dollar
   * figure and nothing else.
   */
  readonly available: true;
  readonly cost: MetricCost;
  readonly successChance: number;
  /**
   * The matchup the odds were read off, layer by layer. Present on every
   * projection because a number the player cannot take apart is a number they
   * cannot plan against: this is what lets a surface say *why* a strike is a
   * coin flip and a démarche is not.
   */
  readonly contest: Contest;
  readonly risks: readonly RiskBranch[];
  readonly ripples: readonly Ripple[];
  readonly rippleVisibility: RippleVisibility;
  /** Chance that a successful covert operation is attributed to its actor. Separate from mission success. */
  readonly successExposureChance?: number;
  /**
   * What the defender's arsenal makes of this, present only on the military
   * rungs where it is the question (4 and up). Deterrence is never a locked
   * door: it is already in `successChance`, and it is stated here so the player
   * reads *why* the number is what it is before committing to it.
   */
  readonly deterrence?: DeterrenceAssessment;
  /**
   * What this act would do to the war ledger — start one, or make a running one
   * hotter. Present only where the question arises (military rungs 4 and up).
   * The single largest consequence any act in the game has, and until it was
   * stated here the projection pane did not mention it at all.
   */
  readonly conflict?: ConflictConsequence;
  /**
   * Who in the government has to have heard about this before it is ordered.
   * Role ids rather than titles: the ids are the engine's cross-charter
   * contract and the words a screen prints are presentation.
   */
  readonly consultation: readonly Consultee[];
  /**
   * What the act takes out of the establishment and how many weeks the
   * establishment is short of it afterward. Absent on the rungs that spend no
   * capacity, which is most of them.
   */
  readonly capacity?: CapacityCost;
  /** What the President's backers did to this act: already in `successChance` and `cost`, stated so the screen can say so. */
  readonly coalition?: CoalitionBacking;
  /** How a military rung's money was reached: what is sent, at what price, by how far. */
  readonly costBasis?: ForceCostBasis;
};

export type ProjectionResult =
  | { readonly ok: true; readonly projection: ActionProjection }
  | { readonly ok: false; readonly reason: string; readonly missingCapability: string; readonly shortfall?: GateShortfall };

export type ResolutionResult =
  | { readonly ok: false; readonly reason: string; readonly missingCapability: string; readonly shortfall?: GateShortfall }
  | {
      readonly ok: true;
      readonly projection: ActionProjection;
      readonly success: boolean;
      readonly civilianCasualties?: CasualtyBand;
      readonly risk?: RiskBranch;
      readonly consequence?: ResolvedConsequence;
      /**
       * Which authored step sequence this act plays out as, when one was
       * banked for the situation. Presentation only: the packet below already
       * carries every effect, and a staged act costs exactly what an unstaged
       * one costs.
       */
      readonly staged?: StagedResolution;
      readonly packet: EffectPacket;
    };

// Present only when an authored card was drawn. A caller that supplies no pool
// gets a result with no such key at all, which is the same object the resolver
// has always returned.
export type ResolvedConsequence = {
  readonly id: string;
  readonly valence: ConsequenceValence;
  readonly beats: readonly string[];
};

// The additive options a caller may hand the resolver. Everything in here is
// dressing for an outcome the resolver reaches on its own; omit it and the
// engine behaves exactly as it did before any of this existed.
export type ResolutionExtras = {
  readonly consequences?: readonly ConsequenceCard[];
  readonly context?: ConsequenceContext;
  /**
   * The step sequences this caller has. Most situations are not banked and
   * never will be, so an empty draw is ordinary rather than a failure.
   */
  readonly sequences?: readonly ResolutionSequenceEntry[];
};

// --- Live reads ---

function liveNation(campaign: Campaign, id: NationId): Nation {
  const runtime = selectNation(campaign, id);
  if (!runtime) throw new Error(`no nation ${id} in this campaign`);
  return { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function sharesBorder(actor: Nation, target: Nation): boolean {
  return actor.geo.neighbors.some((n) => (n as string) === (target.id as string));
}

// --- Cost ---

// Rung 1 is a gesture; rung 5 commits the state. The curve is deliberately
// steeper than linear so climbing the ladder is a real decision rather than a
// default.
const RUNG_WEIGHT: Record<RungLevel, number> = { 1: 0.2, 2: 0.45, 3: 1, 4: 2, 5: 3.5 };

// Per-instrument cost of one unit of ladder.
//
// `treasuryOfGdp` is a share of the *acting* nation's annual output: a flat sum
// is a rounding error to a superpower and ruin to a mid-power. Stability,
// standing and readiness are 0..1 metric movement and already relative.
const INSTRUMENT_UNIT_COST: Record<
  InstrumentId,
  { readonly treasuryOfGdp: number; readonly standing: number; readonly stability: number; readonly militaryReadiness: number }
> = {
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
const REACHING_INSTRUMENTS: readonly InstrumentId[] = ["military", "covert", "assistance"];

function projectionMultiplier(instrument: InstrumentId, actor: Nation, target: Nation, staging: readonly StagingPoint[]): number {
  if (!REACHING_INSTRUMENTS.includes(instrument)) return 1;
  if (sharesBorder(actor, target)) return 1;
  return forceProjectionCost(actor, target, staging).multiplier;
}

function militaryBasis(campaign: Campaign, request: ResolutionRequest, actor: Nation, target: Nation, staging: readonly StagingPoint[]): ForceCostBasis | undefined {
  return request.instrument === "military" ? forceActBasis(campaign, actor, request.rung, request.force, projectionMultiplier("military", actor, target, staging)) : undefined;
}

function projectCost(request: ResolutionRequest, actor: Nation, target: Nation, basis: ForceCostBasis | undefined, staging: readonly StagingPoint[]): MetricCost {
  const unit = INSTRUMENT_UNIT_COST[request.instrument];
  const weight = RUNG_WEIGHT[request.rung];
  const reach = projectionMultiplier(request.instrument, actor, target, staging);
  const cost: MetricCost = {
    treasury: basis ? -basis.upFront : -Math.round(unit.treasuryOfGdp * actor.stats.economy.gdp) * weight * reach,
    standing: -unit.standing * weight,
    stability: -unit.stability * weight,
    militaryReadiness: -unit.militaryReadiness * weight,
  };
  // A metric that does not move is not a cost; leaving it out keeps the
  // player-facing projection to the lines that actually matter.
  return Object.fromEntries(Object.entries(cost).filter(([, value]) => value !== 0)) as MetricCost;
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
function contestFor(
  campaign: Campaign,
  request: ResolutionRequest,
  actor: Nation,
  target: Nation,
  tension: number,
): Contest {
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
const DETERRED_RUNGS: readonly RungLevel[] = [3, 4, 5];

// How much a nuclear defender stiffens against the top rungs. This is
// resistance, not prohibition: a deterred attempt is a worse bet, and the
// player is told so and may still take it.
const DETERRENCE_DRAG = CONTEST_DIALS.deterrenceDrag;

function deterrenceFor(campaign: Campaign, request: ResolutionRequest): DeterrenceAssessment | undefined {
  if (request.instrument !== "military" || !DETERRED_RUNGS.includes(request.rung)) return undefined;
  return assessDeterrence(campaign, request.actor, request.target, { expectJoiners: request.rung === 5 });
}

function deterrenceDrag(deterrence: DeterrenceAssessment | undefined): number {
  const allied = 1 - CONTEST_DIALS.alliedDeterrenceDrag * (deterrence?.alliedSeverity ?? 0);
  if (!deterrence?.defenderNuclear) return allied;
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
export function contestBetween(
  campaign: Campaign,
  actor: NationId,
  target: NationId,
  instrument: InstrumentId,
): Contest | undefined {
  if (actor === target) return undefined;
  const actorRuntime = selectNation(campaign, actor);
  const targetRuntime = selectNation(campaign, target);
  if (!actorRuntime || !targetRuntime) return undefined;
  const relationship = selectRelationship(campaign, actor, target);
  const request = { actor, target, instrument, rung: 1 as RungLevel };
  return contestFor(
    campaign,
    request,
    liveNation(campaign, actor),
    liveNation(campaign, target),
    relationship?.tension ?? 0,
  );
}

/** What a government's forces consist of, domain by domain, as this campaign currently holds them. */
export function liveForceDomains(campaign: Campaign, id: NationId): readonly ForceDomain[] | undefined {
  const runtime = selectNation(campaign, id);
  return runtime ? forceDomains(liveNation(campaign, id)) : undefined;
}

/** What a government's arsenal is worth as a threat, as this campaign currently holds it. */
export function liveNuclearReading(campaign: Campaign, id: NationId): NuclearReading | undefined {
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
function chanceFrom(contest: Contest, request: ResolutionRequest, actor: Nation, target: Nation, staging: readonly StagingPoint[]): number {
  const base = contest.baseChance * RUNG_RELIABILITY[request.rung];
  const reachAdjusted =
    (request.instrument === "military" || request.instrument === "covert") && !sharesBorder(actor, target)
      ? projectionOdds(actor, target, base, staging)
      : base;
  return clamp(reachAdjusted, MIN_CHANCE, MAX_CHANCE);
}

// --- Risk ---

// The parties as the player reads about them. Narration is the game's voice,
// so it names countries the way a dispatch would rather than by the ids the
// dataset keys them on.
type Parties = { readonly actor: string; readonly target: string };

type RiskDefinition = {
  readonly id: string;
  readonly weight: number;
  readonly visible: boolean; // does this failure mode expose a covert action?
};

function partiesFor(campaign: Campaign, request: ResolutionRequest): Parties {
  const nameOf = (id: NationId) => selectNation(campaign, id)?.base.identity.name ?? (id as string);
  return { actor: nameOf(request.actor), target: nameOf(request.target) };
}

/**
 * The two countries as a sentence carries them — with the article the dataset
 * says they take. `partiesFor` returns the bare dataset names because that is
 * what the ledger's own keys and the relationship history are written in; every
 * sentence a player reads goes through here instead.
 */
function wireParties(campaign: Campaign, request: ResolutionRequest): { actor: string; target: string } {
  const identityOf = (id: NationId) => selectNation(campaign, id)?.base.identity;
  const named = (id: NationId) => {
    const identity = identityOf(id);
    return identity ? nationName(identity) : (id as string);
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
function wireActFor(
  campaign: Campaign,
  request: ResolutionRequest,
  landed: boolean,
  riskId?: string,
): WireAct {
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
const RISK_DEFINITIONS: Record<InstrumentId, readonly RiskDefinition[]> = {
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

const idsOf = (definitions: readonly RiskDefinition[]): readonly string[] => definitions.map((d) => d.id);

export const RISK_IDS: Readonly<Record<InstrumentId, readonly string[]>> = {
  diplomatic: idsOf(RISK_DEFINITIONS.diplomatic),
  economic: idsOf(RISK_DEFINITIONS.economic),
  covert: idsOf(RISK_DEFINITIONS.covert),
  military: idsOf(RISK_DEFINITIONS.military),
  assistance: idsOf(RISK_DEFINITIONS.assistance),
};

function risksFor(campaign: Campaign, request: ResolutionRequest): readonly RiskDefinition[] {
  // Strike civilian harm has its own roll and can accompany success; a target with nothing to fire back with cannot hit back harder.
  const definitions = request.instrument === "military" && request.rung < 5 ? RISK_DEFINITIONS.military.filter((risk) => risk.id !== "atrocity-scandal") : RISK_DEFINITIONS[request.instrument];
  return request.instrument === "military" && !hitsBackHarder(campaign, request.rung, request.target) ? definitions.filter((risk) => risk.id !== "escalation") : definitions;
}

function projectRisks(campaign: Campaign, request: ResolutionRequest, successChance: number): readonly RiskBranch[] {
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
const COERCION: Record<InstrumentId, number> = { assistance: 0.15, diplomatic: 0.5, economic: 0.7, covert: 0.85, military: 1 };

function severityOf(request: ResolutionRequest): number {
  return COERCION[request.instrument] * (request.rung / 5);
}

// --- The projection contract ---

/** The context a rung reads its gate and its effects from; shared with the success-effects reader. */
export function actionContext(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): InstrumentContext {
  return {
    campaign,
    actor: request.actor,
    target: request.target,
    streams,
    ...(request.force ? { force: request.force } : {}), ...(request.strikeObjective ? { strikeObjective: request.strikeObjective } : {}), ...(request.regimeAct ? { regimeAct: request.regimeAct } : {}),
  };
}

function gateCheck(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): CapabilityCheck {
  return rungDefinition(request.instrument, request.rung).gate(actionContext(campaign, request, streams));
}

// Pure and seed-independent: what the player is shown before committing.
// resolveAction() calls this and nothing else to decide odds, so a projection
// that misrepresents the outcome is impossible by construction rather than by
// discipline.
export function projectAction(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): ProjectionResult {
  request = withStrikeAssessment(campaign, request);
  const termsProblem = actionTermsProblem(campaign, request);
  if (termsProblem) return { ok: false, reason: "Invalid presidential action terms", missingCapability: termsProblem };
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
      missingCapability: check.missingCapability!,
      ...(check.shortfall ? { shortfall: check.shortfall } : {}),
    };
  }

  const actor = liveNation(campaign, request.actor);
  const target = liveNation(campaign, request.target);
  const deterrence = deterrenceFor(campaign, request);
  const capacity = capacityCost(request.instrument, request.rung);
  const conflictConsequence = projectConflictConsequence(
    campaign,
    request.actor,
    request.target,
    request.instrument,
    request.rung,
  );
  // Confirmed participation alone changes the shared forecast and execution.
  const contest = contestFor(campaign, request, actor, target, relationship.tension);
  const coalition = coalitionBacking(campaign, request);
  const staging = stagingPoints(campaign, request.actor, request.target);
  const costBasis = militaryBasis(campaign, request, actor, target, staging);
  const successChance = clamp(
    chanceFrom(contest, request, actor, target, staging) * stewardSway(campaign, request) * deterrenceDrag(deterrence) * (coalition?.oddsMultiplier ?? 1),
    MIN_CHANCE,
    MAX_CHANCE,
  );
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

// --- Effect construction ---

// Non-metric effects plus the signed metric movement they imply. Cost, rung,
// and ripple movement are merged into a single metric effect so the ledger
// entry reads as one net figure per metric rather than a stack of partials.
export type EffectContribution = {
  readonly effects: readonly Effect[];
  readonly metricDeltas: MetricCost;
};

function mergeMetricDeltas(parts: readonly MetricCost[]): MetricCost {
  const merged: Record<string, number> = {};
  for (const part of parts) {
    for (const [key, delta] of Object.entries(part)) {
      merged[key] = (merged[key] ?? 0) + delta;
    }
  }
  return merged as MetricCost;
}

// apply() adds these to live metrics and clamps them, so nothing here resolves
// against current state. Approval is settled from the public, and a zero delta
// is not movement.
function metricEffects(deltas: MetricCost): readonly Effect[] {
  const moved: MetricDeltas = {};
  for (const [key, delta] of Object.entries(deltas) as [keyof MetricSet, number][]) {
    if (key === "approval" || delta === 0) continue;
    moved[key] = delta;
  }
  return Object.keys(moved).length > 0 ? [{ kind: "metric", deltas: moved }] : [];
}

// What a named failure branch actually does. Failure is never a no-op: the
// attempt was made, and the target knows something was tried.
function riskContribution(campaign: Campaign, request: ResolutionRequest, risk: RiskDefinition, visible = risk.visible): EffectContribution {
  const severity = severityOf(request);
  const effects: Effect[] = [];
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

function pickRisk(campaign: Campaign, request: ResolutionRequest, draw: number, successChance: number): RiskDefinition {
  const definitions = risksFor(campaign, request);
  const totalWeight = definitions.reduce((sum, d) => sum + d.weight, 0);
  const failureMass = 1 - successChance;
  let cursor = successChance;
  for (const definition of definitions) {
    cursor += (failureMass * definition.weight) / totalWeight;
    if (draw < cursor) return definition;
  }
  // Floating-point residue at the very top of the range: the last branch owns it.
  return definitions[definitions.length - 1]!;
}

// --- Authored aftermath ---

// The top slice of the success interval: it worked, but only just. The split
// is read off the draw that already happened rather than rolled for, so a
// campaign resolves to exactly what it always did — a partial success is still
// a success, mechanically. What the slice buys is the right to say so, and to
// let an authored card charge for it.
const PARTIAL_SLICE = 0.25;

function valenceOf(success: boolean, draw: number, successChance: number): ConsequenceValence {
  if (!success) return "failure";
  return draw >= successChance * (1 - PARTIAL_SLICE) ? "partial" : "success";
}

type DrawnConsequence = { readonly card: ConsequenceCard; readonly contribution: ConsequenceContribution };

// Consulted only after the branch is known, and drawn on its own stream. Both
// facts matter: a card cannot move the odds it is reacting to, and its draw
// cannot disturb the resolution draw, because streams are pure functions of
// their key and never share state.
function dressOutcome(
  campaign: Campaign,
  request: ResolutionRequest,
  parties: Parties,
  outcome: { readonly valence: ConsequenceValence; readonly riskId?: string; readonly visible: boolean },
  streams: RngStreams,
  extras: ResolutionExtras,
): DrawnConsequence | undefined {
  const pool = extras.consequences ?? [];
  if (pool.length === 0) return undefined;
  const situation: ConsequenceSituation = {
    actor: request.actor,
    target: request.target,
    instrument: request.instrument,
    rung: request.rung,
    valence: outcome.valence,
    ...(outcome.riskId !== undefined ? { riskId: outcome.riskId } : {}),
    ...(extras.context ? { context: extras.context } : {}),
  };
  const stream = streams.stream(
    "consequence",
    request.actor,
    request.target,
    request.instrument,
    request.rung,
    campaign.turn,
  );
  const card = drawConsequence(campaign, pool, situation, stream);
  if (!card) return undefined;
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
function assembleEffects(
  cost: MetricCost,
  parts: readonly EffectContribution[],
  charged: boolean,
): readonly Effect[] {
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
export function resolveAction(
  campaign: Campaign,
  request: ResolutionRequest,
  streams: RngStreams,
  source: EffectSource = "action",
  extras?: ResolutionExtras,
): ResolutionResult {
  const projected = projectAction(campaign, request, streams);
  if (!projected.ok) return projected;
  const { projection } = projected;

  const def = rungDefinition(request.instrument, request.rung);
  const parties = partiesFor(campaign, request);
  const ctx = actionContext(campaign, request, streams);
  // A force package gets its own stream space so a scaled commitment draws
  // independently of an unscaled one; omitted, the key is byte-identical to
  // what it was before force packages existed, or an existing campaign's
  // saved decisions would resolve to a different outcome on replay.
  const draw = streams
    .stream(
      "resolution",
      request.actor,
      request.target,
      request.instrument,
      request.rung,
      ...(request.force ? [request.force.count] : []),
      campaign.turn,
    )
    .next();
  const success = draw < projection.successChance;
  const risk = success ? undefined : pickRisk(campaign, request, draw, projection.successChance);
  const failureVisible = risk?.visible ?? false;

  const outcome: EffectContribution = success
    ? { effects: def.resolve(ctx), metricDeltas: {} }
    : riskContribution(campaign, request, risk!, failureVisible);
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
  const commitment: ActionCommitment = {
    instrument: request.instrument,
    rung: request.rung,
    target: request.target,
    landed: success,
  };
  const harm = resolveStrikeHarm(campaign, request, streams, success);
  const failedForce = !success && request.instrument === "military" ? { effects: failedForceEffects(ctx, request.rung, risk?.id), metricDeltas: {} } : undefined;
  const failedWatch = !success && request.instrument === "covert" && request.rung === 1
    ? covertWatchReportEffect(ctx, failureVisible) : undefined;
  const effects = assembleEffects(
    projection.cost,
    [outcome, ripple, ...(exposedTarget ? [{ effects: [exposedTarget], metricDeltas: {} }] : []), ...(failedForce ? [failedForce] : []), ...(failedWatch ? [{ effects: [failedWatch], metricDeltas: {} }] : []), ...(harm ? [{ effects: harm.effects, metricDeltas: {} }] : []), ...(drawn ? [drawn.contribution] : []), deedContribution(campaign, request.actor, commitment, visible)],
    request.actor === campaign.founding.nation,
  );
  const packet: EffectPacket = {
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
    ...(risk ? { risk: projection.risks.find((r) => r.id === risk.id)! } : {}),
    ...(drawn ? { consequence: { id: drawn.card.id, valence, beats: drawn.contribution.beats } } : {}),
    ...stagedResolutionFor(
      {
        campaignSeed: campaign.seed,
        actor: request.actor,
        target: request.target,
        instrument: request.instrument,
        rung: request.rung,
        turn: campaign.turn,
      },
      valence,
      risk?.id,
      extras?.sequences,
    ),
    packet,
  };
}
