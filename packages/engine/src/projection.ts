import type { Campaign } from "./state.js";
import type { OrderProjection } from "./orders.js";
import { COURT_TIMING_DAYS } from "./court-procedure.js";
import type { PolicyStanceProjection } from "./policy-draft.js";
import type { PeaceProjection } from "./peace.js";
import type { AuthorizationProjection } from "./force-authorization.js";
import type { ConfirmationProjection } from "./congress.js";
import type { AppropriationProjection } from "./appropriation.js";
import { AUTHORIZATION_TERM_TURNS } from "./congress.js";
import type { LobbyProjection } from "./lobbying.js";
import type { WillingnessProjection } from "./willingness.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { pledgeAtStakeLine, pledgesAtStake } from "./pledges.js";
import type { MetricDeltas } from "./effect-types.js";

// One shape over the eight per-instrument projections.
//
// Every instrument already projects honestly — the number shown is the number
// rolled against — but each projection speaks its own dialect, so a surface
// that wants to put an order beside a treaty beside a whip count has to learn
// eight vocabularies. This file translates each projection into one normalized
// bundle without computing anything of its own: every figure in a bundle is a
// figure the source projection already carried, and where an instrument's
// model simply does not price something, the bundle says so in `notModeled`
// rather than inventing a plausible-looking estimate.

export type ImpactDirection = "up" | "down";

/**
 * A band, not a decimal. The projections themselves are precise because they
 * are rolled against; a cross-instrument summary reprinting three decimal
 * places would be claiming a precision the comparison does not have.
 */
export type MagnitudeBand = "slight" | "moderate" | "major";

export type ImpactConfidence = "modeled" | "estimated" | "not-modeled";

/**
 * Only horizons something in the engine actually computes: an effect that
 * lands when the packet applies, a clock the instrument itself carries, or a
 * standing position held for the rest of the term. No "medium term" — nothing
 * computes one.
 */
export type ImpactHorizon = "next-turn" | "authored-clock" | "term";

export type ProjectionImpact = {
  /** A metric key, a nation-stat path, or an institutional surface ("congress"). */
  readonly domain: string;
  readonly direction: ImpactDirection;
  readonly band: MagnitudeBand;
  readonly horizon: ImpactHorizon;
  readonly confidence: ImpactConfidence;
};

export type ProjectionOdds = {
  /** What the roll decides, in the words a screen prints beside the figure. */
  readonly label: string;
  /** 0..1, and exactly the chance the act will roll against — never restated. */
  readonly chance: number;
};

/**
 * What can take the act back. "Judicially" is its own class because it is the
 * asymmetry the unilateral track turns on: the courts can undo what an order
 * did and cannot return what it cost.
 */
export type ReversibilityClass = "reversible" | "judicially-reversible" | "irreversible";

export type ProjectionInstrument =
  | "executive-order"
  | "policy-stance"
  | "treaty-ratification"
  | "peace"
  | "force-authorization"
  | "confirmation"
  | "appropriation"
  | "lobbying";

export type ProjectionRisk = "war" | "removal";

export type ProjectionBundle = {
  readonly instrument: ProjectionInstrument;
  readonly title: string;
  readonly impacts: readonly ProjectionImpact[];
  /** Passed through from the source projection, never rescaled. */
  readonly cost: MetricDeltas;
  /** Present only where the act actually rolls; a counted vote has no odds. */
  readonly odds?: ProjectionOdds;
  /**
   * Present only where the act is an ask: somebody other than the President has
   * to be willing, and the desk should say how willing before the President
   * commits. Seed-independent, like the rest of the bundle.
   */
  readonly counterpart?: ProjectionCounterpart;
  readonly reversibility: ReversibilityClass;
  /** Ids only — nations, people, posts. Prose names stay in the projections. */
  readonly affected: readonly string[];
  /** The source projection's own reasoning, as prose lines. */
  readonly assumptions: readonly string[];
  /** What this instrument's model honestly does not simulate. */
  readonly notModeled: readonly string[];
  /** The authored clock, in turns, where the instrument carries one. */
  readonly clockTurns?: number;
  readonly risks: readonly ProjectionRisk[];
};

/** Who is being asked, and what the ask looks like from their side. */
export type ProjectionCounterpart = {
  /** An id — a person, a post, a capital. Prose names stay in the projections. */
  readonly id: string;
  readonly willingness: WillingnessProjection;
};

// --- Banding ----------------------------------------------------------------

// Metrics and nation stats live on clamped 0..1 scales, so one pair of edges
// bands them all: below the smaller edge a delta is inside the week's ordinary
// noise, above the larger it is the kind of move a whole policy program makes.
const SLIGHT_METRIC_DELTA = 0.02;
const MAJOR_METRIC_DELTA = 0.06;

// Treasury is money, not a 0..1 scale, so it bands relative to what is in the
// account: the same $180M is a rounding error to a full treasury and a major
// commitment to a drained one.
const SLIGHT_TREASURY_SHARE = 0.02;
const MAJOR_TREASURY_SHARE = 0.08;

function bandOf(magnitude: number, slightEdge: number, majorEdge: number): MagnitudeBand {
  if (magnitude >= majorEdge) return "major";
  if (magnitude >= slightEdge) return "moderate";
  return "slight";
}

export function metricImpact(
  domain: string,
  delta: number,
  horizon: ImpactHorizon,
  treasury: number,
  confidence: ImpactConfidence,
): ProjectionImpact {
  const band =
    domain === "treasury"
      ? bandOf(Math.abs(delta) / Math.max(1, treasury), SLIGHT_TREASURY_SHARE, MAJOR_TREASURY_SHARE)
      : bandOf(Math.abs(delta), SLIGHT_METRIC_DELTA, MAJOR_METRIC_DELTA);
  return { domain, direction: delta >= 0 ? "up" : "down", band, horizon, confidence };
}

function metricImpacts(
  deltas: MetricDeltas,
  horizon: ImpactHorizon,
  treasury: number,
  confidence: ImpactConfidence,
): ProjectionImpact[] {
  return Object.entries(deltas).flatMap(([domain, delta]) =>
    delta === undefined || delta === 0 ? [] : [metricImpact(domain, delta, horizon, treasury, confidence)],
  );
}

// --- Adapters ---------------------------------------------------------------

/**
 * An order's costs and stat effects land the week it is signed; the review
 * clock is real but is a ruling window on a challenge, not an expiration the
 * instrument runs on, so it appears as an assumption line rather than a clock.
 */
export function bundleOrder(campaign: Campaign, projection: OrderProjection): ProjectionBundle {
  const treasury = campaign.player.metrics.treasury;
  const statImpacts = Object.entries(projection.order.nationEffects).flatMap(([path, delta]) =>
    delta === undefined || delta === 0 ? [] : [metricImpact(path, delta, "next-turn" as const, treasury, "modeled")],
  );
  return {
    instrument: "executive-order",
    title: projection.order.name,
    impacts: [...metricImpacts(projection.cost, "next-turn", treasury, "modeled"), ...statImpacts],
    cost: projection.cost,
    odds: { label: "Challenged in court", chance: projection.challengeChance },
    reversibility: "judicially-reversible",
    affected: projection.minister ? [projection.minister.base.id] : [],
    assumptions: [
      ...pledgesAtStake(campaign, { kind: "order", order: projection.order.id }).map(pledgeAtStakeLine),
      projection.reasoning,
      `A challenged order stays in force unless a court grants interim relief, ${COURT_TIMING_DAYS.interim.min} to ${COURT_TIMING_DAYS.interim.max} days after the suit is filed; the merits take ${COURT_TIMING_DAYS.lowerMerits.min} to ${COURT_TIMING_DAYS.lowerMerits.max} days.`,
    ],
    notModeled: [
      "How other governments read a domestic order.",
      "The standing a strike-down has already cost is not returned.",
    ],
    risks: ["removal"],
  };
}

/** A stance is the one act priced twice: once at signing, then every week held. */
export function bundlePolicyStance(campaign: Campaign, projection: PolicyStanceProjection): ProjectionBundle {
  const treasury = campaign.player.metrics.treasury;
  return {
    instrument: "policy-stance",
    title: `${projection.stance.name} (${projection.domain})`,
    impacts: [
      // The enactment cost lands exactly as priced, the week it is signed.
      ...metricImpacts(projection.enactment, "next-turn", treasury, "modeled"),
      // The standing weekly effect is not a priced packet the way the
      // enactment cost is — it is what the stance is authored to do for as
      // long as it holds, read off the same reasoning line the assumptions
      // carry, and it never rolls against anything. "Estimated" says so.
      ...metricImpacts(projection.perTurn, "term", treasury, "estimated"),
    ],
    cost: projection.enactment,
    reversibility: "reversible",
    affected: projection.chair ? [projection.chair] : [],
    assumptions: [
      ...pledgesAtStake(campaign, { kind: "policy", domain: projection.domain, stance: projection.stance.id }).map(pledgeAtStakeLine),
      projection.reasoning,
    ],
    notModeled: [
      "How well the seated chair carries it week to week beyond the quality reading.",
      "What the country's mood does to a program adopted against it.",
    ],
    risks: [],
  };
}


/** Settlement is deterministic against willingness; the projection is the whole model. */
export function bundlePeace(projection: PeaceProjection): ProjectionBundle {
  return {
    instrument: "peace",
    title: `Terms with ${projection.counterpartName}`,
    impacts: [],
    cost: {},
    reversibility: "irreversible",
    affected: [projection.counterpart, projection.conflict.id],
    assumptions: [projection.reasoning],
    notModeled: [
      "What the settlement does to standing and readiness. The settlement itself lands that.",
      "The territorial terms; the engine settles the war, not the map.",
    ],
    risks: ["war"],
  };
}

/** The count is deterministic; the clock is the authorization's own term. */
export function bundleForceAuthorization(projection: AuthorizationProjection): ProjectionBundle {
  return {
    instrument: "force-authorization",
    title: projection.title,
    impacts: [],
    cost: {},
    reversibility: "reversible",
    affected: [projection.target],
    assumptions: [
      projection.reasoning,
      `Prospects: ${projection.forecast.likelihood} (${projection.forecast.confidence} confidence).`,
    ],
    notModeled: [
      "What being refused costs. The refusal itself prices that.",
      "What the war authorized would cost to fight.",
    ],
    clockTurns: AUTHORIZATION_TERM_TURNS,
    risks: ["war"],
  };
}

export function bundleConfirmation(projection: ConfirmationProjection): ProjectionBundle {
  return {
    instrument: "confirmation",
    title: "Confirmation of a nominee",
    impacts: [],
    cost: {},
    reversibility: "reversible",
    affected: [projection.nominee, projection.role],
    assumptions: [projection.reasoning],
    notModeled: ["What the hearing does to the nominee's public standing."],
    risks: [],
  };
}

/** The vote is disposition and nothing else; the allocation is the budget draft's. */
export function bundleAppropriation(projection: AppropriationProjection): ProjectionBundle {
  return {
    instrument: "appropriation",
    title: "Appropriation for the coming year",
    impacts: [],
    cost: {},
    reversibility: "reversible",
    affected: [],
    assumptions: [projection.reasoning],
    notModeled: ["The allocation itself. The budget draft prices what the money does."],
    clockTurns: TURNS_PER_YEAR,
    risks: [],
  };
}

/**
 * The one instrument here whose whole effect is a disposition it already states.
 *
 * Lobbying is also the first ask on the board — the member has to be willing —
 * so the counterpart rides through as an argument rather than being read off the
 * projection: the projection's own module owns what it weighs, and until it
 * weighs the member there is nothing to pass and the bundle says nothing.
 */
export function bundleLobbying(
  campaign: Campaign,
  projection: LobbyProjection,
  counterpart?: ProjectionCounterpart,
): ProjectionBundle {
  const treasury = campaign.player.metrics.treasury;
  return {
    instrument: "lobbying",
    title: `${projection.play.name}: ${projection.target}`,
    counterpart: counterpart ?? projection.counterpart,
    impacts: [
      ...metricImpacts(projection.play.cost, "next-turn", treasury, "modeled"),
      // The member's own move if it lands is `rapportIfGood`, a real
      // priced figure; this row reuses the play's authored gain as a proxy
      // for what the whole chamber feels, and the projection's own chamber
      // math (`chamberIfGood` against `chamberBefore`) is the true count —
      // not this one member's constant. The row stays, because a single
      // member's move is still worth a line, but its confidence says plainly
      // that the domain it is filed under is not the domain it was computed
      // on.
      metricImpact("congress", projection.play.gain, "next-turn", treasury, "not-modeled"),
    ],
    cost: projection.play.cost,
    // Ordinary play reads likelihood from the forecast; the engine still rolls
    // against successChance. Exact roll percentages stay off the bundle.
    reversibility: "reversible",
    affected: [projection.post],
    assumptions: [
      projection.reasoning,
      `Prospects: ${projection.forecast.likelihood} (${projection.forecast.confidence} confidence).`,
    ],
    notModeled: ["What the member remembers of it next year."],
    risks: [],
  };
}

// --- The gate ---------------------------------------------------------------

export type MaterialDecision = {
  readonly material: boolean;
  /** Which thresholds tripped, in the words a screen could print. */
  readonly reasons: readonly string[];
};

// Below this share of the treasury a price is routine business; at or above
// it, the act is committing money the administration will feel.
const MATERIAL_COST_SHARE = 0.05;

// A war or removal exposure below these odds is the ordinary friction of
// governing; at or above it the roll itself is the decision.
const MATERIAL_RISK_ODDS = 0.25;

// One domain moving is an adjustment; this many moving at once is the kind of
// act whose second-order consequences the player should read before taking.
const MATERIAL_DOMAIN_SPREAD = 3;

/**
 * Whether a decision deserves the full workbench before it is taken.
 * Deterministic: the same bundle against the same treasury always answers the
 * same, because a gate that flickered would train the player to ignore it.
 */
export function materialDecisionGate(bundle: ProjectionBundle, treasury: number): MaterialDecision {
  const reasons: string[] = [];
  const spend = Math.abs(bundle.cost.treasury ?? 0);
  if (spend / Math.max(1, treasury) >= MATERIAL_COST_SHARE) {
    reasons.push("It commits a material share of the treasury.");
  }
  // A war instrument is material even without odds — the count may be
  // deterministic, but what it authorizes is not routine business.
  if (bundle.risks.includes("war")) reasons.push("It puts war on the table.");
  if (bundle.risks.includes("removal") && (bundle.odds?.chance ?? 0) >= MATERIAL_RISK_ODDS) {
    reasons.push("The odds of your own institutions refusing it are real.");
  }
  if (bundle.reversibility === "irreversible") reasons.push("There is no taking it back.");
  const domains = new Set(bundle.impacts.map((impact) => impact.domain));
  if (domains.size >= MATERIAL_DOMAIN_SPREAD) {
    reasons.push("It moves the country on several fronts at once.");
  }
  if (bundle.clockTurns !== undefined) reasons.push("It starts a clock the constitution will call in.");
  return { material: reasons.length > 0, reasons };
}
