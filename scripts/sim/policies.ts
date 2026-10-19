// Five ways of being a president, written as deterministic rules.
//
// These are not models of real players. They bracket the space so a claim about
// failure ("a neglectful president is removed on turn N") is a measured
// distribution rather than an opinion, and so the two questions the owner
// actually asked — can a bad player fail, and can a bad player coast — are
// asked of the same engine the app runs.
//
// Every rule is total and every tie breaks on an id, so a seed replays exactly.
import { candidateTargetsForBalance } from "../../packages/engine/dist/balance-harness.js";
import {
  INSTRUMENT_IDS,
  RUNG_LEVELS,
  projectAction,
  projectReply,
  roomCounselOnReply,
} from "../../packages/engine/dist/index.js";
import type {
  ActionProjection,
  Campaign,
  ConversationScript,
  ConversationTone,
  MetricCost,
  ReplyOption,
  ReplyProjection,
  ResolutionRequest,
  RngStreams,
} from "../../packages/engine/dist/index.js";
import type { CastScenario } from "../../packages/content/dist/index.js";

export const ARCHETYPES = ["reckless", "passive", "neglectful", "steady", "optimal-ish"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export type InstrumentOption = { readonly request: ResolutionRequest; readonly projection: ActionProjection };

/** How hard an answer reads, on one scale, whatever kind of commitment it is. */
const TONE_FORCE: Readonly<Record<ConversationTone, number>> = {
  conciliatory: 0,
  evasive: 1,
  principled: 2,
  firm: 3,
  coercive: 4,
};

/** Positions and instruments compared on the same axis: a rung is worth its level. */
function force(option: ReplyOption): number {
  if (option.commitment.kind === "instrument") return option.commitment.rung;
  if (option.commitment.kind === "join") return 5;
  return TONE_FORCE[option.tone];
}

const METRIC_WEIGHT = { approval: 1, stability: 1, standing: 1, militaryReadiness: 0.5 } as const;

/** What a cost takes away, in one number. Treasury is read as a share of what is in it. */
export function harmOf(campaign: Campaign, cost: MetricCost): number {
  let harm = 0;
  for (const [field, weight] of Object.entries(METRIC_WEIGHT)) {
    const delta = cost[field as keyof typeof METRIC_WEIGHT] ?? 0;
    if (delta < 0) harm += -delta * weight;
  }
  const treasury = cost.treasury ?? 0;
  if (treasury < 0) harm += -treasury / Math.max(1, campaign.player.metrics.treasury);
  return harm;
}

/** What a cost gives back, on the same scale. */
function gainOf(campaign: Campaign, cost: MetricCost): number {
  let gain = 0;
  for (const [field, weight] of Object.entries(METRIC_WEIGHT)) {
    const delta = cost[field as keyof typeof METRIC_WEIGHT] ?? 0;
    if (delta > 0) gain += delta * weight;
  }
  const treasury = cost.treasury ?? 0;
  if (treasury > 0) gain += treasury / Math.max(1, campaign.player.metrics.treasury);
  return gain;
}

/** Whether the money moves out of the treasury at all — what "never funds aid" means. */
function spends(projection: ReplyProjection): boolean {
  return (projection.cost.treasury ?? 0) < 0;
}

/**
 * Trouble at home versus trouble abroad, in the engine's own terms: a scenario
 * whose counterpart is the player's own nation is a domestic week. The cast
 * `pick: "none"` is exactly that, so this needs no content vocabulary of its
 * own and cannot drift from what the director actually staged.
 */
export function isDomestic(campaign: Campaign, cast: CastScenario): boolean {
  return cast.counterpart === campaign.founding.nation;
}

export type ScoredReply = {
  readonly option: ReplyOption;
  readonly projection: ReplyProjection;
};

function available(scored: readonly ScoredReply[]): readonly ScoredReply[] {
  const live = scored.filter((entry) => entry.projection.available);
  return live.length > 0 ? live : scored;
}

/** Highest force wins; then the cheapest way of applying it; then the id. */
function mostForceful(campaign: Campaign, scored: readonly ScoredReply[]): ScoredReply {
  return [...available(scored)].sort(
    (a, b) =>
      force(b.option) - force(a.option) ||
      harmOf(campaign, a.projection.cost) - harmOf(campaign, b.projection.cost) ||
      a.option.id.localeCompare(b.option.id),
  )[0]!;
}

/** Least force wins; then the cheapest; then the id. Never spends if it can help it. */
function mildest(campaign: Campaign, scored: readonly ScoredReply[]): ScoredReply {
  const thrifty = available(scored).filter((entry) => !spends(entry.projection));
  const field = thrifty.length > 0 ? thrifty : available(scored);
  return [...field].sort(
    (a, b) =>
      force(a.option) - force(b.option) ||
      harmOf(campaign, a.projection.cost) - harmOf(campaign, b.projection.cost) ||
      a.option.id.localeCompare(b.option.id),
  )[0]!;
}

/** Which of the player's readings is currently worst, normalized to its own scale. */
export function worstMetric(campaign: Campaign, openingTreasury: number): keyof typeof METRIC_WEIGHT | "treasury" {
  const metrics = campaign.player.metrics;
  const readings: Array<[keyof typeof METRIC_WEIGHT | "treasury", number]> = [
    ["approval", metrics.approval],
    ["stability", metrics.stability],
    ["standing", metrics.standing],
    ["militaryReadiness", metrics.militaryReadiness],
    ["treasury", metrics.treasury / Math.max(1, openingTreasury)],
  ];
  return [...readings].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]![0];
}

/** Whatever most helps (or least hurts) the reading that is currently worst. */
function repairsWorst(campaign: Campaign, scored: readonly ScoredReply[], openingTreasury: number): ScoredReply {
  const worst = worstMetric(campaign, openingTreasury);
  const on = (projection: ReplyProjection) => {
    const raw = projection.cost[worst] ?? 0;
    return worst === "treasury" ? raw / Math.max(1, openingTreasury) : raw;
  };
  return [...available(scored)].sort(
    (a, b) =>
      on(b.projection) - on(a.projection) ||
      harmOf(campaign, a.projection.cost) - harmOf(campaign, b.projection.cost) ||
      a.option.id.localeCompare(b.option.id),
  )[0]!;
}

/**
 * Greedy on the projection the game itself shows: expected gain against certain
 * harm, with the room's own opinion as the tiebreak. A position carries no
 * odds, so it is read at certainty — which is what the screen says too.
 */
function greedy(
  campaign: Campaign,
  script: ConversationScript,
  scored: readonly ScoredReply[],
): ScoredReply {
  const value = (entry: ScoredReply) => {
    const odds = entry.projection.successChance ?? 1;
    return odds * gainOf(campaign, entry.projection.cost) - harmOf(campaign, entry.projection.cost);
  };
  const support = (entry: ScoredReply) => {
    const room = roomCounselOnReply(campaign, script, entry.projection);
    return room.reduce(
      (sum, voice) => sum + (voice.kind !== "counsel" ? 0 : voice.stance === "for" ? 1 : voice.stance === "against" ? -1 : 0),
      0,
    );
  };
  return [...available(scored)].sort(
    (a, b) => value(b) - value(a) || support(b) - support(a) || a.option.id.localeCompare(b.option.id),
  )[0]!;
}

export type Policy = {
  readonly id: Archetype;
  /** What this president legislates the week they take office. */
  readonly openingProgram: readonly string[];
  chooseReply(campaign: Campaign, cast: CastScenario, scored: readonly ScoredReply[]): ScoredReply;
  /** One act of state a week, or none. */
  chooseInstrument(campaign: Campaign, options: readonly InstrumentOption[]): InstrumentOption | undefined;
};

function affordable(campaign: Campaign, option: InstrumentOption): boolean {
  return Math.abs(option.projection.cost.treasury ?? 0) <= campaign.player.metrics.treasury;
}

/** The heaviest thing on the shelf that can be paid for. */
function heaviest(campaign: Campaign, options: readonly InstrumentOption[], ceiling = 5): InstrumentOption | undefined {
  const usable = options.filter((option) => affordable(campaign, option) && option.request.rung <= ceiling);
  return [...usable].sort(
    (a, b) =>
      b.request.rung - a.request.rung ||
      (a.projection.cost.treasury ?? 0) - (b.projection.cost.treasury ?? 0) ||
      a.request.instrument.localeCompare(b.request.instrument),
  )[0];
}

/** Only odds it likes, and a year of headroom kept in the accounts. */
function careful(campaign: Campaign, options: readonly InstrumentOption[]): InstrumentOption | undefined {
  const floor = campaign.player.metrics.treasury * 0.9;
  const viable = options.filter(
    (option) =>
      affordable(campaign, option) &&
      option.projection.successChance >= 0.6 &&
      campaign.player.metrics.treasury + (option.projection.cost.treasury ?? 0) >= floor,
  );
  return [...viable].sort(
    (a, b) =>
      b.projection.successChance - a.projection.successChance ||
      a.request.rung - b.request.rung ||
      a.request.instrument.localeCompare(b.request.instrument),
  )[0];
}

export const POLICIES: Readonly<Record<Archetype, Policy>> = {
  reckless: {
    id: "reckless",
    openingProgram: ["civil-emergency-powers", "industry-extraction", "defense-conscription", "security-surveillance"],
    chooseReply: (campaign, _cast, scored) => mostForceful(campaign, scored),
    chooseInstrument: (campaign, options) => heaviest(campaign, options),
  },
  passive: {
    id: "passive",
    openingProgram: [],
    chooseReply: (campaign, _cast, scored) => mildest(campaign, scored),
    chooseInstrument: () => undefined,
  },
  neglectful: {
    id: "neglectful",
    openingProgram: [],
    // Foreign policy is the whole of the job; the country itself is somebody
    // else's problem, answered with whatever costs least attention.
    chooseReply: (campaign, cast, scored) =>
      isDomestic(campaign, cast) ? mildest(campaign, scored) : mostForceful(campaign, scored),
    chooseInstrument: (campaign, options) => heaviest(campaign, options, 3),
  },
  steady: {
    id: "steady",
    openingProgram: ["civil-open-society", "security-disclosure", "trade-open", "fiscal-investment"],
    chooseReply: (campaign, _cast, scored) => repairsWorst(campaign, scored, campaign.player.metrics.treasury),
    chooseInstrument: (campaign, options) => careful(campaign, options),
  },
  "optimal-ish": {
    id: "optimal-ish",
    openingProgram: ["civil-open-society", "fiscal-investment", "trade-open", "security-disclosure"],
    chooseReply: (campaign, cast, scored) => greedy(campaign, cast.script, scored),
    chooseInstrument: (campaign, options) => careful(campaign, options),
  },
};

/** Every reply on the desk, priced the way the screen prices it. */
export function scoreReplies(
  campaign: Campaign,
  cast: CastScenario,
  streams: RngStreams,
): readonly ScoredReply[] {
  return cast.script.options.map((option) => ({
    option,
    projection: projectReply(campaign, cast.script, option, streams),
  }));
}

/** Every act of state on the shelf this week, priced by the resolver itself. */
export function instrumentOptions(campaign: Campaign, streams: RngStreams): readonly InstrumentOption[] {
  const actor = campaign.founding.nation;
  const options: InstrumentOption[] = [];
  for (const target of candidateTargetsForBalance(campaign)) {
    for (const instrument of INSTRUMENT_IDS) {
      for (const rung of RUNG_LEVELS) {
        const request: ResolutionRequest = { actor, target, instrument, rung };
        const projected = projectAction(campaign, request, streams);
        if (projected.ok) options.push({ request, projection: projected.projection });
      }
    }
  }
  return options;
}
