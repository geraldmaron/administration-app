import { conditionImpactEvent } from "./impact-adapters.js";
import { independentImpactPressure } from "./impact-lifecycle.js";
import type { NationId } from "@admin/world";
import { isStandingCondition } from "./condition-kinds.js";
import { standingSettling } from "./standing-settling.js";
import { CONDITION_AXIS, hazardNoun, IMPACTS, SCOPE_WEIGHT } from "./condition-impacts.js";
import { selectConflictsInvolving } from "./conflicts.js";
import {
  STABILITY_REVERSION,
  executionQuality,
  legislableDomains,
  policyRestingOffset,
  selectPolicyStance,
  type PolicyDomain,
  type RestingPointPath,
} from "./policy.js";
import { openingExpectations } from "./opening-position.js";
import {
  selectActiveConditions,
  selectNation,
  type Campaign,
  type ConditionKind,
  type FeedItem,
  type NationCondition,
} from "./state.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { createRngStreams, type RngStreams } from "./rng.js";
import { turnsFor } from "./pace.js";
import { nationName, sentenceCase } from "./naming.js";
import type { TurnPhase } from "./turn-loop.js";
import { markedFlags } from "./marked-flags.js";
import type { DecisionStamp } from "./willingness.js";
import { INCIDENT_TAG } from "./article-incidents.js";
import { stateAnswered } from "./obligations.js";
import { missionAttention } from "./locale-missions.js";
import { responseLoadPacket, responseMitigation } from "./response.js";
import {
  claimOnsetSlots,
  conditionFlagsToClear,
  conditionFlagsToSet,
  MAX_NEW_CONDITIONS_PER_TURN,
  MAX_NEW_HOME_CONDITIONS_PER_TURN,
  onsetCandidates,
  openCondition,
  standingHold,
  unrestOnsetReason,
  type OnsetCandidate,
} from "./condition-onset.js";

export {
  claimOnsetSlots,
  conditionFlag,
  conditionId,
  MAX_NEW_CONDITIONS_PER_TURN,
  MAX_NEW_HOME_CONDITIONS_PER_TURN,
  STANDING_ONSET_READS,
  STANDING_PRESSURE,
  standingHold,
  standingPressure,
} from "./condition-onset.js";

// What a country is living through, for weeks at a time. A condition is not an
// event the player answers once: it opens from the nation's own authored
// exposure, it gets worse or better on its own, and every week it is running it
// takes something out of the country. It is also the reason the six
// `geo.disasterExposure` fields are worth authoring — this is what reads them.

// --- Attention: whether anybody is actually working the file ---

// A condition fades because someone is working it. `ATTENDED` is the rate a
// country recovers at while its government is on the file; `UNATTENDED` is
// what is left once the government's own effort is taken out of it — the
// water still goes down and the streets still tire, but on their own clock
// rather than the state's. The gap between them is the cost of a government
// that stopped paying attention, and the floor is deliberately not zero: a
// country is more than its administration, and a wildfire burns out whether
// or not anyone in the capital is watching.
const NATURAL_RECOVERY_ATTENDED = 0.06;
const NATURAL_RECOVERY_UNATTENDED = 0.02;
const RESOLVES_BELOW = 0.08;

// Which department answers this. A flood is worked by the interior ministry
// that moves people out and the treasury that pays for what they come back
// to; a drought is answered by water, land and energy policy rather than by
// the police; a street in revolt is the interior and the services, which is
// what makes unrest a political condition rather than a natural one.
const ANSWERED_BY: Readonly<Record<ConditionKind, readonly PolicyDomain[]>> = {
  pandemic: ["fiscal", "civil"],
  earthquake: ["fiscal", "civil"],
  flood: ["fiscal", "civil"],
  cyclone: ["fiscal", "civil"],
  wildfire: ["fiscal", "civil"],
  drought: ["fiscal", "industry"],
  // A tornado is relief money and emergency management, like a flood. A winter
  // storm is the same two plus the industrial side, because what a region
  // stopped for a week needs is freight moving and power back on. A heat wave is
  // the grid first and public health second, and it is the one weather kind the
  // purse barely answers: money does not cool a city that has no capacity.
  tornado: ["fiscal", "civil"],
  "winter-storm": ["civil", "industry", "fiscal"],
  "heat-wave": ["industry", "civil"],
  unrest: ["civil", "security"],
  // The standing kinds are answered by the departments that hold the levers a
  // government actually has: the purse, and the ministry that writes industrial
  // and labor policy. A recession is not worked by the police.
  recession: ["fiscal", "industry"],
  "inflation-shock": ["fiscal"],
  "unemployment-shock": ["fiscal", "industry"],
  "fiscal-crisis": ["fiscal"],
  "energy-shortage": ["industry", "fiscal"],
  "housing-crunch": ["fiscal", "civil"],
  // The home events: an intrusion is the security services and the industrial
  // regulators who hold the networks; a strike is labor policy; a failed bank is
  // the purse and its regulators; a mass killing is the police power and the
  // services that care for the wounded; an American held abroad is worked by
  // the national-security side of the government.
  cyberattack: ["security", "industry"],
  "work-stoppage": ["industry"],
  "bank-failure": ["fiscal"],
  "mass-casualty-attack": ["security", "civil"],
  "wrongful-detention": ["security"],
};

// How long a signed order still reads as the government working this
// condition rather than a thing it did once and moved on from. Six weeks:
// long enough to cover the response it set in motion, short enough that an
// order from last spring is not still buying this week's recovery rate.
const ATTENTION_WINDOW_DAYS = 42;

function attentionWindowStart(turn: number): number {
  return turn - turnsFor(ATTENTION_WINDOW_DAYS);
}

/**
 * The departments that could answer this condition, filtered to the ones this
 * charter actually seats a minister for. A domain nobody is answerable for
 * cannot be legislated in, and it is not neglect to lack a ministry.
 */
function answerableDomains(campaign: Campaign, kind: ConditionKind): readonly PolicyDomain[] {
  const seated = new Set(legislableDomains(campaign));
  return ANSWERED_BY[kind].filter((domain) => seated.has(domain));
}

/**
 * How much of the machinery that would answer this condition is actually
 * running, between 0 and 1.
 *
 * This is the ordinary business of governing rather than a gesture at the
 * disaster itself: a standing program in the department responsible is what a
 * president has to bring to a flood in week three, when there is nothing left
 * to announce and the work is budget lines and statute. An administration
 * running both answering departments exactly as it inherited them has taken
 * hold of neither, and the country recovers at whatever rate it manages on its
 * own.
 */
function programAttention(campaign: Campaign, kind: ConditionKind): number {
  const domains = answerableDomains(campaign, kind);
  if (domains.length === 0) return 1;
  const live = domains.filter((domain) => !selectPolicyStance(campaign, domain).inherited);
  const axis = CONDITION_AXIS[kind];
  if (!axis) return live.length / domains.length;
  return clamp01(live.reduce((sum, domain) => sum + stanceAnswers(campaign, domain, axis), 0) / domains.length);
}

/**
 * What one chosen stance is worth against this condition: 1 if it pushes the
 * condition's own cause the right way, 0.5 if it moves that cause not at all,
 * and 0 if it pushes it the wrong way.
 *
 * Zero for a wrong-signed stance rather than a negative number, so the reading
 * stays on the same 0..1 scale it always was and a government governing against
 * its own crisis is credited with exactly as much attention as one that never
 * chose a program — which is the claim, and no more than the claim.
 */
function stanceAnswers(
  campaign: Campaign,
  domain: PolicyDomain,
  axis: { readonly path: RestingPointPath; readonly answers: 1 | -1 },
): number {
  const shift = domainShift(campaign, domain, axis.path);
  if (shift === 0) return 0.5;
  return Math.sign(shift) === axis.answers ? 1 : 0;
}

/** How far this one department's stance moves one resting point, in that point's unit. */
function domainShift(campaign: Campaign, domain: PolicyDomain, path: RestingPointPath): number {
  const offset = policyRestingOffset([
    { stance: selectPolicyStance(campaign, domain), quality: executionQuality(campaign, domain) },
  ]);
  return offset[path];
}

/**
 * How much of the state is on this file, on one scale.
 *
 * The question is only ever asked of the player's own government about its own
 * country. Every other capital is presumed to be working its own emergencies:
 * their programs are chosen once, by a scorer, from what their statistics
 * recommend, so reading one as a measure of whether that cabinet is paying
 * attention this week would be reading a founding artifact as a decision
 * nobody made.
 */
/**
 * What a signed order that was *not* aimed at this condition's state is worth.
 *
 * Below 1 on purpose, and above the program floor on purpose. It used to be 1:
 * any order at all, on any subject, bought every condition in the country the
 * fully-attended recovery rate, so tightening border controls eased a flood in
 * Michigan. That was the stand-in this module's own comment admitted to. But
 * dropping it to nothing would say a government visibly governing is absent
 * from a crisis it is not personally standing in, which is just as untrue.
 *
 * This is the single largest balance lever in the emergency work: every
 * condition in the game recovers more slowly than it used to unless the
 * administration actually answers the state living through it.
 */
export const UNTARGETED_ORDER_ATTENTION = 0.5;

export function conditionAttention(campaign: Campaign, condition: NationCondition): number {
  if (condition.nation !== campaign.founding.nation) return 1;
  // A locale act answering this state on this kind is the real thing: someone
  // is working *this* file, not governing in general.
  if (stateAnswered(campaign, condition)) return 1;
  // Orders from before this turn only, so the week an order lands is credited
  // by whatever it did itself.
  const since = attentionWindowStart(campaign.turn);
  const ordered = campaign.orders.some((record) => record.turn < campaign.turn && record.turn >= since);
  const program = programAttention(campaign, condition.kind);
  // A federal mission in the state is worked on this file too, as far as it reaches.
  return Math.max(missionAttention(campaign, condition), ordered ? Math.max(UNTARGETED_ORDER_ATTENTION, program) : program);
}

export function conditionRecoveryRate(attention: number): number {
  return NATURAL_RECOVERY_UNATTENDED + (NATURAL_RECOVERY_ATTENDED - NATURAL_RECOVERY_UNATTENDED) * attention;
}

// --- The weekly tick ---

/**
 * Whether this week's costs include the ones that shock the order of a country.
 *
 * A condition bills two kinds of cost, and only one of them may be charged
 * every week forever.
 *
 * `regimeStability`, `protestPressure` and `insurgencyPressure` have no
 * restoring force anywhere in the engine — every writer of `regimeStability`
 * pushes it down. An acute condition may decrement them each week because it
 * ends, and the total is bounded by how long a flood lasts. A standing
 * condition does not end until the country recovers, so the same decrement is
 * an unbounded sum, and a two-hundred-turn campaign arrives at stability zero
 * whatever the president did. That is the ratchet Law 8 removed from the
 * onset reading, reappearing in a different stat.
 *
 * So a standing condition shocks order when it ARRIVES and when it GETS WORSE,
 * and not on the weeks it merely persists. That is also the truer reading: a
 * recession does not damage a country's order a little more every single week
 * at a constant rate, it does so when it deepens.
 *
 * The continuous costs — reserves, unemployment, and the public's opinion —
 * are charged every week regardless, because all three have restoring forces
 * of their own (the budget refills reserves, `macroDriftPhase` reverts
 * unemployment, and `opinionPhase` moves opinion both ways). A cost billed
 * into a channel that can recover is a cost a government can govern against.
 */
type CostKind = "arriving" | "persisting";

function conditionEffects(
  campaign: Campaign,
  condition: NationCondition,
  cost: CostKind = "arriving",
): Effect[] {
  const runtime = selectNation(campaign, condition.nation);
  if (!runtime) return [];
  const impact = IMPACTS[condition.kind];
  // Scaled by what the government has deployed against it. A multiplier on the
  // bill and never a term of its own, which is what keeps a response inside
  // Law 8 — see response.ts's header.
  const weight = condition.severity * SCOPE_WEIGHT[condition.scope] * responseMitigation(campaign, condition);
  const stats = runtime.stats;
  // An acute condition ends, so its order costs are bounded and stay weekly.
  const standing = isStandingCondition(condition.kind);
  const shocksOrder = cost === "arriving" || !standing;
  const order = shocksOrder ? 1 : 0;
  // Every rate in IMPACTS was calibrated against a condition that ends: a flood
  // runs ten or twenty weeks, so a weekly cost of five points of approval is a
  // total bill of one. A standing condition runs until the country recovers,
  // which can be most of a term, so charging it the same weekly rate bills ten
  // times what the number was ever chosen to mean. This is the difference
  // between a country living through a recession and a country being ground to
  // zero by one — and the grind is not the more realistic of the two, because a
  // public that has priced in a bad economy stops re-pricing it every week.
  const grind = standing && cost === "persisting" ? STANDING_PERSIST_SCALE : 1;
  const effects: Effect[] = [
    {
      kind: "nationStat",
      nation: condition.nation,
      setStats: {
        politics: {
          regimeStability: clamp01(stats.politics.regimeStability - impact.regimeStability * weight * order),
          protestPressure: clamp01(stats.politics.protestPressure + impact.protestPressure * weight * order),
        },
        security: {
          insurgencyPressure: clamp01(stats.security.insurgencyPressure + impact.insurgencyPressure * weight * order),
        },
        economy: {
          // No growth, inflation or unemployment term. All three have exactly
          // one writer, `macroDriftPhase`, which reads this condition's
          // `macroPressure` alongside mean reversion and the government's own
          // program — see ImpactProfile.macroPressure for why a second writer
          // here is the difference between weather and a ratchet.
          reserves: Math.max(0, stats.economy.reserves * (1 - impact.reserveDrain * weight * grind)),
        },
      },
    },
  ];
  if (condition.nation === campaign.founding.nation) {
    effects.push({
      kind: "metric",
      deltas: {
        stability: -impact.regimeStability * weight * order,
        treasury: -campaign.player.metrics.treasury * impact.reserveDrain * weight * grind,
      },
    });
  }
  return effects;
}

/**
 * The summed macro pressure everything a nation is living through puts on it.
 *
 * Read by `macroDriftPhase`, which is the only writer of the stats this
 * pressure applies to. A condition states what it is doing to an economy here;
 * it does not do it, and that separation is the whole of Law 8 in code.
 */
export function conditionMacroPressure(
  campaign: Campaign,
  nation: NationId,
): { readonly growth: number; readonly inflation: number; readonly unemployment: number } {
  let growth = independentImpactPressure(campaign, nation);
  let inflation = 0;
  let unemployment = 0;
  for (const condition of selectActiveConditions(campaign)) {
    if (condition.nation !== nation) continue;
    const impact = IMPACTS[condition.kind];
    const weight = condition.severity * SCOPE_WEIGHT[condition.scope] * responseMitigation(campaign, condition);
    growth += impact.macroPressure.growth * weight;
    inflation += impact.macroPressure.inflation * weight;
    unemployment += impact.macroPressure.unemployment * weight;
  }
  return { growth, inflation, unemployment };
}

/**
 * The stat paths a kind's `IMPACTS` row actually moves.
 *
 * Derived from the row rather than restated beside it, so the Law 8 test is
 * checking the table that ships instead of a second description of it that
 * could agree while the table does not.
 */
export function conditionImpactWrites(kind: ConditionKind): readonly string[] {
  const impact = IMPACTS[kind];
  const writes: string[] = [];
  if (impact.regimeStability !== 0) writes.push("politics.regimeStability");
  if (impact.protestPressure !== 0) writes.push("politics.protestPressure");
  if (impact.insurgencyPressure !== 0) writes.push("security.insurgencyPressure");
  if (impact.reserveDrain !== 0) writes.push("economy.reserves");
  // macroPressure is routed through macroDriftPhase rather than written here,
  // but it still *moves* the stat, so it counts for this check. A recession
  // laundering its growth drag through another phase would be the same loop
  // with an extra step in it.
  if (impact.macroPressure.growth !== 0) writes.push("economy.growth");
  if (impact.macroPressure.inflation !== 0) writes.push("economy.inflation");
  if (impact.macroPressure.unemployment !== 0) writes.push("economy.unemployment");
  return writes;
}

function severityNext(campaign: Campaign, condition: NationCondition, draw: number): number {
  // Symmetric pressure around the recovery floor: most weeks a condition eases,
  // some weeks it gets away from the government entirely. Which floor a week
  // eases toward is the same disaster read against a different government.
  const recovery = conditionRecoveryRate(conditionAttention(campaign, condition));
  // A response scales the condition's progression, not its recovery: the weeks
  // it would have got away from the government are the weeks a deployment is
  // for. The easing half of the same draw is left alone, because a response
  // that also damped the good weeks would be a narrower condition rather than
  // a better-answered one.
  const shock = (draw - 0.5) * 0.25;
  const drift =
    condition.severity + (shock > 0 ? shock * responseMitigation(campaign, condition) : shock) - recovery;
  if (!isStandingCondition(condition.kind)) return clamp01(drift);

  // A standing condition is held up by the state of the country rather than by
  // a clock. Weather ends whether or not anything was done; a recession that
  // timed out while growth was still negative would teach a player that
  // governing is optional, so what opened it also has to be what keeps it open.
  // The government's own recovery rate still applies on top — this is what
  // makes an economic program worth passing rather than a formality — but it
  // cannot close a condition whose cause is still true.
  //
  // The gap from the country's own resting state, not the absolute reading:
  // see `standingHold`. Against the absolute reading a country was held in
  // whatever crisis its ordinary figures happened to name, and could only
  // recover by becoming a different country.
  const runtime = selectNation(campaign, condition.nation);
  if (!runtime) return clamp01(drift);
  const atWar = selectConflictsInvolving(campaign, condition.nation).length > 0;
  const hold = standingHold(runtime, condition.kind, atWar);
  return clamp01(Math.max(drift, hold * STANDING_FLOOR_SHARE));
}

/**
 * How much of a standing condition's severity its own cause holds up.
 *
 * Below 1 on purpose: a government working the file visibly eases a recession
 * even while the economy is still bad, which is the difference between a
 * mechanic that rewards governing and one that only reports the weather. At 1
 * the recovery rate would be decorative until the cause cleared entirely.
 */
export const STANDING_FLOOR_SHARE = 0.7;

/**
 * What a standing condition costs on a week it is merely still true, as a share
 * of what it costs on the week it arrives or deepens.
 *
 * A fifth, because a standing condition runs roughly five to ten times as long
 * as the acute ones every rate in `IMPACTS` was calibrated against. It is the
 * one number here chosen to make a total bill land where the per-week numbers
 * always implied, rather than to hit a target.
 */
export const STANDING_PERSIST_SCALE = 0.2;

/** Where in its own arc a week of a condition stands, as the wire prints it. */
type ConditionPhase = NonNullable<NonNullable<FeedItem["facts"]>["phase"]>;

type Tick = {
  readonly condition: NationCondition;
  readonly effects: Effect[];
  readonly summary: string;
  readonly phase: ConditionPhase;
  /**
   * Whether this week reaches the wire at all.
   *
   * An incident closes the week after it happened, and the close of something
   * that was over the moment it happened is not news. The record still resolves
   * and the flags still clear — the player is simply not told twice about one
   * afternoon.
   */
  readonly files: boolean;
};

/** Closing a record out: resolved this week, flags released, one last beat. */
function closeCondition(
  campaign: Campaign,
  condition: NationCondition,
  effects: Effect[],
  description: string,
): Tick {
  return {
    condition: {
      ...condition,
      severity: 0,
      status: "resolved",
      endedTurn: campaign.turn,
      beats: [...condition.beats, { turn: campaign.turn, description }],
    },
    effects: [...effects, { kind: "flag", clear: conditionFlagsToClear(campaign, condition) }],
    summary: description,
    phase: "over",
    files: filesThisWeek(campaign, condition, "over"),
  };
}

/**
 * Whether a week of this condition reaches the wire.
 *
 * At home, every week does: the player governs the place, and "the fire is still
 * burning in Colorado" is a fact about their week. Abroad, only the weeks that
 * are news — it opened, or it is over. The weekly bulletin that Chad is still in
 * a drought was most of what the feed carried: a hundred foreign conditions each
 * filing a line every week, five hundred items in forty weeks, and nothing in any
 * of them a player could act on or remember. That volume is the reason the feed
 * needed a cap at all, and cutting it at the source is better than capping it
 * afterwards, because a cap can only choose which of the noise to keep.
 */
function filesThisWeek(campaign: Campaign, condition: NationCondition, phase: ConditionPhase): boolean {
  // An incident is over the moment it happened; its close is not a second story.
  if (condition.lifetime === "incident") return false;
  if (condition.nation === campaign.founding.nation) return true;
  return phase === "over";
}

function tickCondition(campaign: Campaign, condition: NationCondition, streams: RngStreams): Tick {
  const stream = streams.stream("condition", condition.id, campaign.turn);
  const runtime = selectNation(campaign, condition.nation);
  const geo = runtime?.base.geo;
  const name = runtime ? nationName(runtime.base.identity) : (condition.nation as string);
  const noun = hazardNoun(condition.kind, geo);

  // An incident was one afternoon. Its whole bill was charged on the week it
  // arrived, so the next tick closes it and charges nothing: a weekly cost on
  // something that is already over is a cost for a state the country is not in.
  if (condition.lifetime === "incident") {
    return closeCondition(campaign, condition, [], `The ${noun.replace(/^an? /, "")} in ${name} is over.`);
  }

  const severity = severityNext(campaign, condition, stream.next());
  // Billed against what the week actually was. A standing condition that has
  // deepened shocks the country's order; one that is merely still true bills
  // the channels that can recover. See conditionEffects' CostKind.
  const worsened = severity > condition.severity + 0.05;
  const effects = conditionEffects(campaign, condition, worsened ? "arriving" : "persisting");

  if (severity < RESOLVES_BELOW) {
    return closeCondition(
      campaign,
      condition,
      effects,
      `${noun} in ${name} is declared over.`.replace(/^./, (c) => c.toUpperCase()),
    );
  }

  const summary = worsened
    ? `${noun} in ${name} is worsening.`.replace(/^./, (c) => c.toUpperCase())
    : `${sentenceCase(name)} is still dealing with ${noun}.`;
  return {
    condition: {
      ...condition,
      severity,
      beats: worsened ? [...condition.beats, { turn: campaign.turn, description: summary }] : condition.beats,
    },
    effects,
    summary,
    // A week that is neither a deepening nor a close is the condition coming
    // down, which is what "easing" names: severity only ever falls otherwise.
    phase: worsened ? "worsening" : "easing",
    files: filesThisWeek(campaign, condition, worsened ? "worsening" : "easing"),
  };
}

/** What a condition item tells the wire about itself, beyond its headline. */
function conditionFacts(campaign: Campaign, condition: NationCondition, phase: ConditionPhase): FeedItem["facts"] {
  const city = condition.city ? campaign.cities[condition.city]?.base.name : undefined;
  const state = condition.state ? campaign.states[condition.state]?.base.name : undefined;
  const dateline = city ?? state;
  return {
    phase,
    ...(dateline ? { dateline } : {}),
    ...(condition.lifetime === "incident" ? { topicTags: [INCIDENT_TAG] } : {}),
  };
}

function packetFor(
  campaign: Campaign,
  summary: string,
  condition: NationCondition,
  effects: readonly Effect[],
  phase: ConditionPhase,
  files = true,
  decision?: DecisionStamp,
): EffectPacket {
  return {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    provenance: {
      origin: "world",
      // Why the street turned, when the street is what opened. Every other kind
      // of condition is weather or arithmetic and has no actor to name.
      ...(decision ? { decision } : {}),
      // The week this condition opened. An onset has none — it is a root, and
      // the record it writes is what every later week of the same condition
      // points back at, so a drought that worsens in June and is declared over
      // in September is one story on the trail rather than three notices.
      ...(condition.causedBy ? { causeIds: [condition.causedBy] } : {}),
      entities: [condition.nation as string],
      locales: [
        ...(condition.state ? [condition.state as string] : []),
        ...(condition.city ? [condition.city as string] : []),
      ],
      systems: ["conditions", condition.kind],
    },
    narration: { summary },
    effects: [
      ...effects,
      { kind: "condition", set: condition },
      ...(files
        ? [
      {
        kind: "feed",
        items: [
          {
            turn: campaign.turn + 1,
            kind: "condition",
            visibility: "public",
            headline: summary,
            target: condition.nation,
            // Where in its own arc the thing being reported stands, so a piece
            // about the first morning of a fire is not written like a piece
            // about the week it came down; the place it happened, so the wire has
            // a dateline; and the tag that routes an incident to its own
            // register, since the composer cannot read a condition record.
            facts: conditionFacts(campaign, condition, phase),
          },
        ],
      } as Effect,
          ]
        : []),
    ],
  };
}

type OnsetRun = { readonly state: Campaign; readonly packets: readonly EffectPacket[] };

/**
 * Walk one queue of candidates, opening at most `budget` of them, applying
 * each packet before the next candidate is considered so a second onset in the
 * same country reads what the first one left.
 *
 * Each candidate's fire-or-not roll comes from its OWN stream, keyed on
 * `(queueKey, nation, kind, turn)` — never a shared cursor walked once per
 * candidate. A shared cursor reads its i-th draw for whichever candidate
 * happens to sit at position i in the list that week, which means adding or
 * removing ANY candidate — a new authored disaster category, a nation that
 * stops qualifying — silently reads a different random number for every
 * candidate after it, for every turn of the whole campaign. That was real:
 * confirmed by adding one low-weight disasterExposure key to a nation and
 * watching an unrelated calibrated balance metric move ~27%, identically
 * regardless of the new key's own weight. Keying per candidate makes a
 * candidate's outcome a pure function of what it IS, never of who else
 * happens to be on the ballot with it. When more fire than `budget` allows,
 * `claimOnsetSlots` decides who opens, and list order does not.
 */
function openOnsets(
  campaign: Campaign,
  candidates: readonly OnsetCandidate[],
  queueKey: string,
  turn: number,
  streams: RngStreams,
  budget: number,
): OnsetRun {
  const packets: EffectPacket[] = [];
  let working = campaign;
  let opened = 0;
  const fired = candidates.map((candidate) => ({ candidate, roll: streams.stream(queueKey, candidate.nation, candidate.kind, turn).next() }));
  // The tie-break has its own stream, keyed on the queue and the turn, so it
  // cannot re-key any candidate's fire-or-not roll.
  const tiebreak = (candidate: OnsetCandidate): number =>
    streams.stream("condition-onset-tiebreak", queueKey, candidate.nation, candidate.kind, turn).next();
  for (const candidate of claimOnsetSlots(fired, fired.length, tiebreak)) {
    if (opened >= budget) break;
    const condition = openCondition(
      working,
      candidate,
      streams.stream("condition-open", candidate.nation, candidate.kind, campaign.turn),
    );
    // openCondition returns the condition already running when the drawn
    // place is occupied. Applying it would bill that event a second time.
    // A refused open does not spend the week's slot.
    if (working.conditions[condition.id]?.status === "active") continue;
    const packet = packetFor(
      working,
      condition.beats[0]!.description,
      condition,
      [
        ...conditionEffects(working, condition),
        ...conditionImpactEvent(working, condition),
        { kind: "flag", set: markedFlags(conditionFlagsToSet(condition), working.turn) },
      ],
      "onset",
      true,
      // Unrest at home is the one onset with somebody to name: who is angry, and
      // what this administration did that angered them.
      condition.kind === "unrest" && condition.nation === campaign.founding.nation
        ? unrestOnsetReason(working)
        : undefined,
    );
    packets.push(packet);
    working = apply(working, packet);
    opened += 1;
  }
  return { state: working, packets };
}

/**
 * The country's order settling back toward where its institutions hold it.
 *
 * Every writer of the President's reading of order pushed it one way or the
 * other and none pulled it back, so a program's weekly cost, a season of
 * continuing resolutions and a cabinet revolt summed without limit. This pulls
 * the reading back by `STABILITY_REVERSION` of the gap a week toward the order
 * the country's institutions hold: its own regime stability as authored, read
 * on the scale the founding opens on, which is the same resting point the
 * regime itself reverts to (`macroDriftPhase`). Not the regime as it stands
 * this week: conditions knock that down faster than it recovers, and over a
 * term a passive country's regime sank from 0.75 to as low as 0.23, so a pull
 * toward it carried that slide into the President's reading as well. A shock
 * still lands where its writer puts it and fades as the country settles.
 * Filed here, and in the background, because it is the country's own weather
 * rather than something the President did.
 */
export function orderSettling(state: Campaign): EffectPacket | undefined {
  const runtime = selectNation(state, state.founding.nation);
  if (!runtime) return undefined;
  const rest = openingExpectations(runtime.base).find((entry) => entry.metric === "stability")!.opening;
  const pull = Math.round(STABILITY_REVERSION * (rest - state.player.metrics.stability) * 10_000) / 10_000;
  if (Math.abs(pull) < 0.0005) return undefined;
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn + 1,
    background: true,
    narration: {
      summary: pull > 0 ? "The country's order recovers a little toward where its institutions hold it." : "The calm the country had been running on eases back toward where its institutions hold it.",
    },
    effects: [{ kind: "metric", deltas: { stability: pull } }],
  };
}

/**
 * The turn phase: every running condition takes its week out of the country,
 * then exposure gets its draw for what opens next — the country the player
 * governs on one queue, the rest of the world on another. Packets are applied
 * as they are built — impacts are written as absolute stats, so two conditions
 * in one country must each read what the one before it left.
 *
 * The two queues are the point. On one shared queue the home nation's draw was
 * the hundred-and-third number in a sequence whose length was set by how many
 * other capitals happened to be eligible that week, and the world's budget was
 * already spent before the queue reached it in a fifth of all weeks. That made
 * unrest at home zero-sum against the health of fifty countries the player does
 * not govern, so the domestic weather moved when the world moved rather than
 * when the country was governed badly.
 */
export const conditionPhase: TurnPhase = (state) => {
  const streams = createRngStreams(state.seed);
  const packets: EffectPacket[] = [];
  let working = state;
  for (const settling of [orderSettling(state), standingSettling(state)]) {
    if (!settling) continue;
    packets.push(settling);
    working = apply(working, settling);
  }

  for (const condition of selectActiveConditions(state)) {
    const tick = tickCondition(working, condition, streams);
    const packet = packetFor(working, tick.summary, tick.condition, tick.effects, tick.phase, tick.files);
    packets.push(packet);
    working = apply(working, packet);
  }

  const candidates = onsetCandidates(working);
  const home = state.founding.nation;
  const athome = openOnsets(
    working,
    candidates.filter((candidate) => candidate.nation === home),
    "condition-onset-home",
    state.turn,
    streams,
    MAX_NEW_HOME_CONDITIONS_PER_TURN,
  );
  const abroad = openOnsets(
    athome.state,
    candidates.filter((candidate) => candidate.nation !== home),
    "condition-onset",
    state.turn,
    streams,
    MAX_NEW_CONDITIONS_PER_TURN,
  );

  return [...packets, ...athome.packets, ...abroad.packets, ...responseLoadPacket(abroad.state)];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
