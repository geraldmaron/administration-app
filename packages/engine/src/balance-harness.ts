import { worldDataset, type Charter, type IdeologyVector } from "@admin/world";
import { apply, type EffectPacket } from "./effects.js";
import { defaultLeaderDraft } from "./leader.js";
import { draftCabinetCandidates, generateFoundingPool, resolveFoundingFields, sealFounding, type FoundingChoices } from "./founding.js";
import type { CabinetOutcome } from "./cabinet.js";
import { cabinetPerTerm, countedPhases, mean, type CabinetTally } from "./cast-breaks.js";
import type { Pledge } from "./pledges.js";
import { selectLiveScandals, selectScandals } from "./press-scandal.js";
import { selectScandalOriginCounts } from "./scandal-counts.js";
import type { AdministrationParty } from "./state-legislature.js";
import { INSTRUMENT_IDS, RUNG_LEVELS, type InstrumentId, type RungLevel } from "./instruments.js";
import { BRACKET_PROXIES, PROXY_PROFILES, type ProxyProfile, type SkillProxy } from "./balance-proxies.js";
import { formatPlatform, platformForProgram, type HarnessPlatform } from "./balance-platform.js";
import { affordable, chooseOption, isFreeWin, optionsThisTurn } from "./balance-choice.js";
import { enactPolicy, revenueStatuteRequired } from "./policy-draft.js";
import { answerOffers, voteBudget } from "./balance-budget.js";
import { policyStance } from "./policy.js";
import { transmit } from "./legislation.js";
import { resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { campaignIsOver, holdsElections, selectEnding, TERM_LIMIT, TERM_TURNS, type CampaignEnding } from "./elections.js";
import { selectConditions, type Campaign, type ConditionKind, type ConditionScope, type MetricSet } from "./state.js";
import { INSTITUTION_CATALOG } from "./institutions.js";
import { openNomination, selectNominableFor } from "./nomination.js";
import { selectActiveNominations } from "./nomination-stages.js";
import { awaitsSuccessor } from "./cabinet-departing.js";
import { DAYS_PER_TURN, type TurnPhase, type TurnPhases } from "./turn-loop.js";
import { campaignPhaseSequence } from "./turn-phases.js";
import { advanceUntilAttention } from "./advance.js";
import { OPINION_DRIVERS } from "./opinion.js";
import type { ApprovalMovement, ApprovalPath } from "./opinion-movement.js";
import { attributeWeek, attributedMovement, openAttribution, type PhaseStart } from "./approval-attribution.js";
import {
  ATTRIBUTED_METRICS, DAY_RESOLVERS, attributeMetricWeek, metricShares, openMetricAttribution,
  type AttributedMetric, type MetricAttribution, type StretchShare,
} from "./stability-attribution.js";

// The balance instrument. It is not part of the game: nothing in the player
// app imports it. It exists so that a claim about difficulty ("removal fires
// on roughly a fifth of reckless campaigns") is a measured distribution
// rather than an opinion, and so a later change to a constant has to move a
// number before it is allowed to land.
//
// Everything here is seeded and pure: the same seed list always produces the
// same report, which is what lets a test assert on it.

/**
 * Stand-ins for how a person plays, since there is no human in a test.
 *
 * The population and every dial that defines it live in `balance-proxies.ts`;
 * re-exported here because the harness has always been the import site and a
 * second one would only mean two ways to name the same player.
 */
export { SKILL_PROXIES, BRACKET_PROXIES, PROXY_PROFILES, type SkillProxy, type ProxyProfile } from "./balance-proxies.js";
export { candidateTargetsForBalance } from "./balance-choice.js";

/** A year of weekly turns — the horizon a campaign is balanced against. */
export const HORIZON_TURNS = 52;

/**
 * The horizon that actually reaches the dates the term bends around.
 *
 * `HORIZON_TURNS` is a year, which is the right length for the questions the
 * standing gate asks — removal, the tradeoff mix, whether governing beats not
 * governing — and the wrong length for every question about elections, because
 * the first midterm falls at turn 104 and the contest at 208. Measured at 52
 * turns, the seat swing, the incumbency edge and the constitutional record's
 * drag were arithmetic no campaign in the gate had ever executed. This horizon
 * runs both terms out and one week past the second contest, so a campaign that
 * is never removed and never defeated ends `term-limited` rather than simply
 * stopping mid-term with its clock unread.
 */
export const TERM_HORIZON_TURNS = TERM_TURNS * TERM_LIMIT + 1;

export type CampaignOutcome = {
  readonly seed: string;
  /**
   * The proxy that played it. A profile a measurement builds for itself has no
   * name in the population, so it reads "profile" and the measurement that
   * built it keeps its own label.
   */
  readonly skill: SkillProxy | "profile";
  readonly removed: boolean;
  readonly removalTurn?: number;
  readonly turnsPlayed: number;
  readonly finalPressure: number;
  readonly peakPressure: number;
  readonly beats: number;
  readonly opening: MetricSet;
  readonly final: MetricSet;
  readonly metricSeries: readonly MetricSet[];
  readonly actionsAttempted: number;
  readonly actionsLanded: number;
  /** Turns where the agent had at least one option it could actually afford and pass. */
  readonly turnsWithOptions: number;
  /** Turns whose best option was a free win: high odds, negligible cost, no ripple. */
  readonly freeWinTurns: number;
  /** Turns where every option carried either poor odds or a ripple somebody pays for. */
  readonly tradeoffTurns: number;
  readonly instrumentUse: Readonly<Record<InstrumentId, number>>;
  readonly rungUse: Readonly<Record<RungLevel, number>>;
  /** How the presidency stood when the run ended, in the engine's own word. */
  readonly ending: CampaignEnding;
  /** Whether this campaign's charter puts its executive on a ballot at all. */
  readonly electoral: boolean;
  /** Every fixed date this campaign actually reached, in the order it reached them. */
  readonly elections: readonly ElectionRecord[];
  /** The party the President ran as. */
  readonly party: AdministrationParty;
  /** How often the cabinet broke, by the way it broke, over the campaign as played. */
  readonly cabinetBreaks: Readonly<Record<CabinetOutcome, number>>;
  /** Stories that broke, and the weeks one or more of them was live. */
  readonly scandals: { readonly broken: number; readonly liveWeeks: number; readonly origins: Readonly<Record<string, number>> };
  /**
   * Every condition the player's own country lived through.
   *
   * A claim about a standing kind is a claim about how often it opens and how
   * long it stays, and neither is visible in any per-turn metric: a metric
   * series records what the country felt, not what was happening to it. The
   * ledger the run leaves behind is the only place both are readable.
   */
  readonly conditions: readonly ConditionSpell[];
  /** The platform's promises as the run left them; empty for a run founded on no platform. */
  readonly pledges: readonly Pledge[];
  /** What the President ran on, so every figure can be read against the promises behind it. */
  readonly platform: HarnessPlatform;
  /** Which judgments moved approval over the run, and by which road (the owner's driver-share report). */
  readonly approvalMovement: ApprovalMovement;
  /** Which stretch of the week moved the country's order and the money, falls and rises apart. */
  readonly metricMovement: MetricAttribution;
};

/** One condition's life, flattened to the figures a distribution can be taken over. */
export type ConditionSpell = {
  readonly kind: ConditionKind;
  readonly scope: ConditionScope;
  readonly startedTurn: number;
  /** Weeks it ran. A spell still open at the end counts to the last turn played. */
  readonly dwellTurns: number;
  readonly closed: boolean;
};

/** One contest, flattened to the figures a distribution can be taken over. */
export type ElectionRecord = {
  readonly kind: "midterm" | "presidential";
  readonly turn: number;
  readonly voteShare: number;
  readonly won?: boolean;
  readonly houseSwing?: number;
  readonly senateSwing?: number;
};

export type BalanceReport = {
  /** The party every President in this run ran as. */
  readonly party: AdministrationParty;
  /** The players this run measured, in report order. */
  readonly proxies: readonly SkillProxy[];
  readonly bySkill: Readonly<Record<SkillProxy, SkillSummary>>;
  readonly outcomes: readonly CampaignOutcome[];
};

export type SkillSummary = {
  readonly campaigns: number;
  /** The platform this player ran on, in words; one per player, because it is derived from the program. */
  readonly platform: string;
  readonly removalRate: number;
  readonly medianRemovalTurn?: number;
  readonly beatRate: number; // share of campaigns that opened at least one removal beat
  readonly medianFinalApproval: number;
  readonly medianFinalStability: number;
  /**
   * Reported separately from approval because the headline hides it. Over one
   * year, careful play and passivity move standing and stability in opposite
   * directions by comparable amounts, and neither reaches the headline at more
   * than a season's lag, so approval over this horizon is close to a wash while
   * the underlying difference is enormous. A gate on the headline at this
   * horizon is measuring a lag; a gate on this is measuring the effect.
   */
  readonly medianFinalStanding: number;
  readonly medianTreasuryRatio: number; // final treasury / opening treasury
  readonly approvalRange: number; // median (max - min) of the approval series
  /**
   * Median (last - first) of the approval series: where a year of this kind of
   * play leaves the country's judgment, signed.
   *
   * Reported beside the range because the range alone cannot tell a headline
   * that never moved from one that rose and fell back — and because two real
   * movements running against each other (a polarized country healing while an
   * unstaffed government decays) show up in the range as a flat campaign.
   */
  readonly approvalDrift: number;
  readonly successRate: number;
  readonly freeWinShare: number;
  readonly tradeoffShare: number;
  readonly instrumentShare: Readonly<Record<InstrumentId, number>>;
  readonly rungShare: Readonly<Record<RungLevel, number>>;
  /**
   * Cabinet breaks per campaign, scaled to a four-year term so a one-year run
   * and a two-term run read on one scale. The mean rather than the median,
   * because most campaigns count a handful of each and a median of small
   * integers hides the rate.
   */
  readonly cabinetPerTerm: Readonly<Record<CabinetOutcome, number>>;
  /** Mean scandals broken and live-scandal weeks per campaign, and the share of campaigns that had one at all. */
  readonly scandals: {
    readonly brokenPerCampaign: number;
    readonly liveWeeksPerCampaign: number;
    readonly campaignsWithScandal: number;
    readonly originsPerCampaign: Readonly<Record<string, number>>;
  };
  /** Mean share of approval movement per judgment and per road, across campaigns. */
  readonly approvalDrivers: Pick<ApprovalMovement, "byDriver" | "byPath">;
  /** Each stretch of the week's share of the gross falls and rises in order and money, across campaigns. */
  readonly metricDrivers: Readonly<Record<AttributedMetric, readonly StretchShare[]>>;
  /**
   * The term arc. Every figure here is `undefined` at the standing one-year
   * horizon, because no campaign reaches a fixed date inside 52 turns — an
   * absent measurement rather than a zero, so a gate cannot assert on an
   * election that was never held.
   */
  readonly term?: TermSummary;
};

export type TermSummary = {
  /** Campaigns whose charter puts the executive on a ballot. The rest hold none. */
  readonly electoralCampaigns: number;
  readonly midtermsHeld: number;
  readonly contestsHeld: number;
  readonly medianMidtermShare: number;
  readonly medianMidtermHouseSwing: number;
  readonly medianMidtermSenateSwing: number;
  readonly medianContestShare: number;
  /** Share of contests the incumbent won. Excludes the term-limited non-contest. */
  readonly reelectionRate: number;
  readonly endings: Readonly<Record<CampaignEnding, number>>;
};

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

function meanOrigins(counts: readonly Readonly<Record<string, number>>[]): Readonly<Record<string, number>> {
  const keys = [...new Set(counts.flatMap((count) => Object.keys(count)))].sort();
  return Object.fromEntries(keys.map((key) => [key, round3(counts.reduce((sum, count) => sum + (count[key] ?? 0), 0) / Math.max(1, counts.length))]));
}

/**
 * The Presidents a run can be founded under. Each sits a little toward its own
 * side, mirrored, so a Democrat and a Republican differ by party and by the
 * direction of their politics and by nothing else; the Independent sits at the
 * center, which anchors them on the Democratic caucus.
 */
export const HARNESS_PRESIDENTS: Readonly<Record<AdministrationParty, IdeologyVector>> = {
  democrat: { economicLeftRight: -0.2, authLibertarian: -0.1, nationalistGlobalist: -0.15 },
  republican: { economicLeftRight: 0.2, authLibertarian: 0.1, nationalistGlobalist: 0.15 },
  independent: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
};

export type { HarnessPlatform } from "./balance-platform.js";

/**
 * A campaign founded the way the founding screen's quick oath founds one: the
 * United States under its own constitution, the President of the given party,
 * the best-fitting candidate in every chair, and the ticket, the staff and the
 * mandate left to the founding's own defaults.
 */
/** Which board a harness founding opens on. The battery compares staged wars with and without the carried one. */
export type HarnessWorld = Pick<FoundingChoices, "carriedWorld" | "openingPreset">;

export function foundedForBalance(
  seedText: string,
  party: AdministrationParty = "democrat",
  platform: HarnessPlatform = {},
  world: HarnessWorld = {},
): { readonly campaign: Campaign; readonly charter: Charter } {
  const seed = makeCampaignSeed(seedText);
  const pool = generateFoundingPool(seed, worldDataset);
  const leader = { ...defaultLeaderDraft(), name: "Test Leader", party, ideology: HARNESS_PRESIDENTS[party] };
  const fields = resolveFoundingFields(worldDataset, { cabinet: {}, leader });
  const charter = worldDataset.charters.find((entry) => entry.id === fields.charterId)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, fields.nationId!, pool, leader)).map(([role, people]) => [role, people[0]!.id]),
  );
  const choices: FoundingChoices = { cabinet, leader, ...platform, ...world };
  return { campaign: sealFounding(seed, worldDataset, choices), charter };
}

/** The program so far, and the part of it the President has not got yet. */
type ProgramPursuit = { readonly campaign: Campaign; readonly pending: readonly string[] };

// A program is the other half of the game: measuring instruments alone would
// have measured a player who never opened the policy screen.
//
// Pursued every week rather than declared in the first one, because a domain
// whose substance is revenue is not the President's to adopt by signature: the
// refusal names the bill, and a president who wants the program transmits it
// and takes the count. A proxy that read that refusal once and never looked
// again would be modeling a player who does not read their own screens — and
// it would measure careful government as a presidency that never got its
// signature program, which is a fact about the harness rather than about how
// the country was governed.
function pursueProgram(campaign: Campaign, pending: readonly string[]): ProgramPursuit {
  let working = campaign;
  const outstanding: string[] = [];
  for (const stanceId of pending) {
    const result = enactPolicy(working, stanceId);
    if (result.ok) {
      working = apply(working, result.packet);
      continue;
    }
    const domain = policyStance(stanceId)?.domain;
    const statute = domain ? revenueStatuteRequired(working, domain, stanceId) : undefined;
    // A charter that does not seat the responsible chair refuses the program
    // for good; the proxy simply governs without it, as a player would.
    if (!statute) continue;
    outstanding.push(stanceId);
    // Congress takes one bill at a time and only takes up an act the country
    // has a reason for, so most weeks this is refused and costs nothing. The
    // week it is not, the administration has spent what a transmission costs.
    const sent = transmit(working, statute.actId);
    if (sent.ok) working = apply(working, sent.packet);
  }
  return { campaign: working, pending: outstanding };
}

/**
 * One week of staffing: the biggest unled institution gets a name if the
 * pipeline has room, and a department whose Secretary has announced they are
 * going gets a successor for the Secretary's office only.
 *
 * Biggest first by staff scale, which is the same weighting the delivery
 * reading uses — a president who can only move a few names at a time fills
 * Defense before they fill a five-person board.
 *
 * The width is the proxy's own, not a constant. A real White House runs dozens
 * of nominations in parallel — the process takes four months a name, so a
 * president working five at a time would leave office with most of the
 * government unfilled. Measured at a width of five, eight years of careful
 * government seated eighteen of fifty-two offices, which is not a president
 * being slow; it is a proxy that was never going to staff a government. Floor
 * congestion still bites at every width — the nomination phase stretches each
 * stage on the calendar — so the cost of sending up many at once is real and
 * paid rather than assumed away.
 */
function staffOneOffice(campaign: Campaign, profile: ProxyProfile): Campaign {
  const active = selectActiveNominations(campaign);
  if (active.length >= profile.pipelineWidth) return campaign;
  const pending = new Set(active.map((nomination) => nomination.office));
  const offices = [...INSTITUTION_CATALOG]
    .filter((def) => campaign.institutions[def.id]?.vacancy === true || awaitsSuccessor(campaign, def.cabinetRole))
    .sort((a, b) => b.staffScale - a.staffScale)
    .flatMap((def) => (campaign.institutions[def.id]?.vacancy === true ? def.offices : def.offices.slice(0, 1)).filter((office) => !pending.has(office.id)).slice(0, 1));
  // The pool's best fit for the seat, the name the appointments desk
  // preselects, so the proxy staffs the government the way a player who
  // accepts the defaults does. A seat nobody can be sent up for (one the
  // Senate does not confirm, or an empty pool) is passed over, not retried.
  for (const office of offices) {
    const nominee = selectNominableFor(campaign, office.id)[0];
    const opened = nominee ? openNomination(campaign, office.id, nominee.base.id) : undefined;
    if (opened?.ok) return apply(campaign, opened.packet);
  }
  return campaign;
}

/** A program a run takes up partway through, pursued from that week the way the opening one is. */
export type ScheduledProgram = {
  /** Weeks since the oath: 0 is the first week governed. */
  readonly week: number;
  readonly program: readonly string[];
};

/** What a measurement adds to a run without changing how the proxy plays it. */
export type PlayOptions = {
  readonly schedule?: readonly ScheduledProgram[];
  /** Sees the state each weekly phase plans against, beside the approval attribution that already does. */
  readonly observePhase?: (id: string, state: Campaign) => void;
  /** Sees the campaign each week of the run closes on, so a test can hold the whole state rather than its metrics. */
  readonly observeWeek?: (state: Campaign) => void;
  /**
   * Decisions a measurement takes for the President each week, applied after
   * the proxy's own act: a way to ask what a habit the proxies do not have
   * (overruling the room, say) does to a run without inventing a proxy for it.
   */
  readonly decide?: (state: Campaign, step: number) => readonly EffectPacket[];
  /**
   * Wraps each weekly phase, by its id, before the run walks it. A proof that
   * asks whether some mark on a packet changes the world (strip it from every
   * phase and compare) needs the phase list the player app runs, not a copy of
   * it; without a wrapper the run walks that list exactly as it is.
   */
  readonly wrapPhase?: (id: string, run: TurnPhase) => TurnPhase;
  /** Office-day groups. The default. Pass false for the one-shot Friday tick. */
  readonly layout?: boolean;
};

function wrappedPhases(phases: TurnPhases, charter: Charter, wrap: (id: string, run: TurnPhase) => TurnPhase): TurnPhases {
  const ids = campaignPhaseSequence(charter).map((phase) => phase.id);
  const runs: readonly TurnPhase[] = typeof phases.simulate === "function" ? [phases.simulate] : phases.simulate;
  const simulate = runs.map((run, index) => wrap(ids[index]!, run));
  if (!phases.days) return { ...phases, simulate };
  let cursor = 0;
  const days = phases.days.map((group) => group.map((run) => wrap(ids[cursor++]!, run)));
  return { ...phases, simulate, days };
}

/**
 * One harness week, however many stops the living clock takes inside it.
 *
 * The app's loop halts on every federal Election Day, and an Election Day is a
 * Tuesday: a single seven-day call across that week comes back after three or
 * four days. The harness measures per week and would then have been measuring a
 * half week against every later full one, from November 2030 to the end of the
 * campaign — which skews every term path the gate reads. So the week is driven to
 * seven elapsed days, resuming from each stop the way a player pressing on does,
 * and stopping early only where the presidency itself has ended and there is no
 * next day to simulate.
 */
function advanceOneHarnessWeek(campaign: Campaign, phases: TurnPhases): Campaign {
  let state = campaign;
  let elapsed = 0;
  while (elapsed < DAYS_PER_TURN) {
    const run = advanceUntilAttention(state, { phases, horizonDays: DAYS_PER_TURN - elapsed });
    state = run.campaign;
    if (run.elapsedDays === 0 || run.stopReason === "ended") break;
    elapsed += run.elapsedDays;
  }
  return state;
}

function programDue(schedule: readonly ScheduledProgram[] | undefined, step: number): readonly string[] {
  return (schedule ?? []).filter((entry) => entry.week === step).flatMap((entry) => entry.program);
}

export function playCampaign(
  seedText: string,
  player: SkillProxy | ProxyProfile,
  horizon = HORIZON_TURNS,
  party: AdministrationParty = "democrat",
  platform?: HarnessPlatform,
  options: PlayOptions = {},
): CampaignOutcome {
  const profile = typeof player === "string" ? PROXY_PROFILES[player] : player;
  // Named, the platform is the measurement's; unnamed, the proxy runs on what
  // its own program enacts, as a President is founded.
  const stood = platform ?? platformForProgram(profile.program, party);
  const { campaign: seeded, charter } = foundedForBalance(seedText, party, stood);
  const opened = pursueProgram(seeded, profile.program);
  const founded = opened.campaign;
  let pendingProgram = opened.pending;
  const cabinetBreaks: CabinetTally = { leak: 0, challenge: 0, resignation: 0 };
  let liveScandalWeeks = 0;
  // Deliberately the sequence the player app runs, counted rather than
  // replaced: the harness measures what anyone plays, or it measures nothing.
  const phaseStarts: PhaseStart[] = [];
  const counted = countedPhases(
    charter,
    cabinetBreaks,
    (id, state) => {
      phaseStarts.push({ id, state });
      options.observePhase?.(id, state);
    },
    options.layout !== false,
  );
  const phases = options.wrapPhase ? wrappedPhases(counted, charter, options.wrapPhase) : counted;
  const opening = founded.player.metrics;
  const series: MetricSet[] = [opening];

  let working = founded;
  let actionsAttempted = 0;
  let actionsLanded = 0;
  let turnsWithOptions = 0;
  let freeWinTurns = 0;
  let tradeoffTurns = 0;
  let peakPressure = 0;
  let removalTurn: number | undefined;
  const instrumentUse: Record<InstrumentId, number> = Object.fromEntries(
    INSTRUMENT_IDS.map((instrument) => [instrument, 0]),
  ) as Record<InstrumentId, number>;
  const rungUse: Record<RungLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let attribution = openAttribution(working);
  let metricMovement = openMetricAttribution();
  for (let step = 0; step < horizon; step++) {
    const weekStart = working;
    const due = programDue(options.schedule, step);
    if (due.length > 0) pendingProgram = [...pendingProgram, ...due];
    if (pendingProgram.length > 0) {
      const pursued = pursueProgram(working, pendingProgram);
      working = pursued.campaign;
      pendingProgram = pursued.pending;
    }
    working = voteBudget(working, profile);
    const answered = answerOffers(working, profile);
    working = answered.campaign;
    cabinetBreaks.resignation += answered.accepted;

    const choices = optionsThisTurn(working);
    const usable = choices.filter((o) => affordable(working, o));
    if (usable.length > 0) {
      turnsWithOptions++;
      if (usable.some((o) => isFreeWin(working, o))) freeWinTurns++;
      else tradeoffTurns++;
    }

    const chosen = chooseOption(working, profile, choices, step, horizon);
    if (chosen) {
      const streams = createRngStreams(working.seed);
      const result = resolveAction(working, chosen.request, streams, "action");
      if (result.ok) {
        actionsAttempted++;
        if (result.success) actionsLanded++;
        instrumentUse[chosen.request.instrument]++;
        rungUse[chosen.request.rung]++;
        working = apply(working, result.packet);
      }
    }

    for (const packet of options.decide?.(working, step) ?? []) working = apply(working, packet);

    for (let name = 0; name < profile.nominationsPerWeek; name += 1) {
      working = staffOneOffice(working, profile);
    }

    const decided = working;
    working = advanceOneHarnessWeek(working, phases);
    // The week's days resolve before its tick (press, lobbying, treaties, an
    // election held on its own date), so they are charged as their own stretch
    // of the world rather than left between the President's acts and the first phase.
    const week = [{ id: DAY_RESOLVERS, state: decided }, ...phaseStarts.splice(0)];
    attribution = attributeWeek(attribution, weekStart, decided, week, working);
    metricMovement = attributeMetricWeek(metricMovement, weekStart, decided, week, working);
    options.observeWeek?.(working);
    series.push(working.player.metrics);
    if (selectLiveScandals(working).length > 0) liveScandalWeeks += 1;
    peakPressure = Math.max(peakPressure, working.removal.pressure);
    if (working.removal.resolved) {
      removalTurn = working.turn;
      break;
    }
    // A presidency that loses its contest or serves its second term is over as
    // surely as one that is convicted. Running past that point would count weeks
    // nobody governs and average them into every figure below.
    if (campaignIsOver(working)) break;
  }

  return {
    seed: seedText,
    skill: typeof player === "string" ? player : "profile",
    removed: working.removal.resolved,
    ...(removalTurn !== undefined ? { removalTurn } : {}),
    turnsPlayed: working.turn - founded.turn,
    finalPressure: round3(working.removal.pressure),
    peakPressure: round3(peakPressure),
    beats: working.removal.beats.length,
    opening,
    final: working.player.metrics,
    metricSeries: series,
    actionsAttempted,
    actionsLanded,
    turnsWithOptions,
    freeWinTurns,
    tradeoffTurns,
    instrumentUse,
    rungUse,
    ending: selectEnding(working),
    electoral: holdsElections(charter),
    party,
    cabinetBreaks,
    scandals: {
      broken: selectScandals(working).filter((scandal) => scandal.brokeTurn >= founded.turn).length,
      liveWeeks: liveScandalWeeks,
      origins: selectScandalOriginCounts(working, founded.turn),
    },
    conditions: conditionSpells(working),
    pledges: working.pledges ?? [],
    platform: stood,
    approvalMovement: attributedMovement(attribution),
    metricMovement,
    elections: working.termClock.elections.map((result) => ({
      kind: result.kind,
      turn: result.turn,
      voteShare: result.voteShare,
      ...(result.won !== undefined ? { won: result.won } : {}),
      ...(result.swing ? { houseSwing: result.swing.house, senateSwing: result.swing.senate } : {}),
    })),
  };
}

function conditionSpells(campaign: Campaign): readonly ConditionSpell[] {
  return selectConditions(campaign)
    .filter((condition) => condition.nation === campaign.founding.nation)
    .map((condition) => ({
      kind: condition.kind,
      scope: condition.scope,
      startedTurn: condition.startedTurn,
      dwellTurns: (condition.endedTurn ?? campaign.turn) - condition.startedTurn,
      closed: condition.status !== "active",
    }))
    .sort((a, b) => a.startedTurn - b.startedTurn || a.kind.localeCompare(b.kind));
}

function summarize(outcomes: readonly CampaignOutcome[]): SkillSummary {
  const removed = outcomes.filter((o) => o.removed);
  const attempted = outcomes.reduce((s, o) => s + o.actionsAttempted, 0);
  const landed = outcomes.reduce((s, o) => s + o.actionsLanded, 0);
  const turnsWithOptions = outcomes.reduce((s, o) => s + o.turnsWithOptions, 0);
  const totalUse = INSTRUMENT_IDS.reduce((s, i) => s + outcomes.reduce((t, o) => t + o.instrumentUse[i], 0), 0);
  const instrumentShare = Object.fromEntries(
    INSTRUMENT_IDS.map((i) => [i, totalUse === 0 ? 0 : round3(outcomes.reduce((t, o) => t + o.instrumentUse[i], 0) / totalUse)]),
  ) as Record<InstrumentId, number>;
  const rungShare = Object.fromEntries(
    RUNG_LEVELS.map((r) => [r, totalUse === 0 ? 0 : round3(outcomes.reduce((t, o) => t + o.rungUse[r], 0) / totalUse)]),
  ) as Record<RungLevel, number>;

  return {
    campaigns: outcomes.length,
    platform: formatPlatform(outcomes[0]?.platform ?? {}),
    removalRate: round3(removed.length / outcomes.length),
    ...(removed.length > 0 ? { medianRemovalTurn: median(removed.map((o) => o.removalTurn!)) } : {}),
    beatRate: round3(outcomes.filter((o) => o.beats > 0).length / outcomes.length),
    medianFinalApproval: round3(median(outcomes.map((o) => o.final.approval))),
    medianFinalStability: round3(median(outcomes.map((o) => o.final.stability))),
    medianFinalStanding: round3(median(outcomes.map((o) => o.final.standing))),
    medianTreasuryRatio: round3(median(outcomes.map((o) => o.final.treasury / Math.max(1, o.opening.treasury)))),
    approvalRange: round3(
      median(
        outcomes.map((o) => {
          const approvals = o.metricSeries.map((m) => m.approval);
          return Math.max(...approvals) - Math.min(...approvals);
        }),
      ),
    ),
    approvalDrift: round3(
      median(
        outcomes.map((o) => {
          const approvals = o.metricSeries.map((m) => m.approval);
          return approvals[approvals.length - 1]! - approvals[0]!;
        }),
      ),
    ),
    successRate: attempted === 0 ? 0 : round3(landed / attempted),
    freeWinShare: turnsWithOptions === 0 ? 0 : round3(outcomes.reduce((s, o) => s + o.freeWinTurns, 0) / turnsWithOptions),
    tradeoffShare: turnsWithOptions === 0 ? 0 : round3(outcomes.reduce((s, o) => s + o.tradeoffTurns, 0) / turnsWithOptions),
    instrumentShare,
    rungShare,
    cabinetPerTerm: cabinetPerTerm(outcomes),
    scandals: {
      brokenPerCampaign: round3(mean(outcomes.map((o) => o.scandals.broken))),
      liveWeeksPerCampaign: round3(mean(outcomes.map((o) => o.scandals.liveWeeks))),
      campaignsWithScandal: round3(outcomes.filter((o) => o.scandals.broken > 0).length / Math.max(1, outcomes.length)),
      originsPerCampaign: meanOrigins(outcomes.map((o) => o.scandals.origins)),
    },
    approvalDrivers: meanMovement(outcomes.map((o) => o.approvalMovement)),
    metricDrivers: Object.fromEntries(
      ATTRIBUTED_METRICS.map((metric) => [metric, metricShares(outcomes.map((o) => o.metricMovement), metric)]),
    ) as Record<AttributedMetric, readonly StretchShare[]>,
    ...(outcomes.some((o) => o.elections.length > 0) ? { term: summarizeTerm(outcomes) } : {}),
  };
}

const APPROVAL_PATHS: readonly ApprovalPath[] = ["drift", "decisions", "pledges", "world"];

function meanMovement(runs: readonly ApprovalMovement[]): SkillSummary["approvalDrivers"] {
  const mean3 = (values: readonly number[]) => round3(mean(values));
  return {
    byDriver: Object.fromEntries(OPINION_DRIVERS.map((d) => [d, mean3(runs.map((r) => r.byDriver[d]))])) as ApprovalMovement["byDriver"],
    byPath: Object.fromEntries(APPROVAL_PATHS.map((p) => [p, mean3(runs.map((r) => r.byPath[p]))])) as ApprovalMovement["byPath"],
  };
}

function summarizeTerm(outcomes: readonly CampaignOutcome[]): TermSummary {
  const electoral = outcomes.filter((o) => o.electoral);
  const held = electoral.flatMap((o) => o.elections);
  const midterms = held.filter((e) => e.kind === "midterm");
  // A term-limited presidency records a presidential result with no `won` on
  // it, because nobody stood: counting it as a loss would report a two-term
  // administration as a defeated one.
  const contests = held.filter((e) => e.kind === "presidential" && e.won !== undefined);
  const endings = { "in-office": 0, removed: 0, defeated: 0, "term-limited": 0 } as Record<CampaignEnding, number>;
  for (const outcome of outcomes) endings[outcome.ending] += 1;

  return {
    electoralCampaigns: electoral.length,
    midtermsHeld: midterms.length,
    contestsHeld: contests.length,
    medianMidtermShare: round3(median(midterms.map((e) => e.voteShare))),
    medianMidtermHouseSwing: median(midterms.map((e) => e.houseSwing ?? 0)),
    medianMidtermSenateSwing: median(midterms.map((e) => e.senateSwing ?? 0)),
    medianContestShare: round3(median(contests.map((e) => e.voteShare))),
    reelectionRate: contests.length === 0 ? 0 : round3(contests.filter((e) => e.won === true).length / contests.length),
    endings,
  };
}

export function balanceSeeds(count: number): readonly string[] {
  return Array.from({ length: count }, (_, i) => `balance-${i}`);
}

/**
 * Seeds whose charter actually puts the executive on a ballot.
 *
 * Every seed now founds the United States under its own constitution, so every
 * seed qualifies; the filter stays because a term-arc run is only meaningful
 * over campaigns that reach a fixed date, and asking the founded charter is
 * what keeps that true if a founding ever seats another one. Nothing is skipped
 * or faked here: the charter is founded and asked, so the filter cannot drift
 * from what the phase does.
 */
export function electoralSeeds(count: number, searchLimit = 64): readonly string[] {
  const found: string[] = [];
  for (const seed of balanceSeeds(searchLimit)) {
    if (found.length === count) break;
    if (holdsElections(foundedForBalance(seed).charter)) found.push(seed);
  }
  return found;
}

/**
 * Runs a set of seeds against a set of players.
 *
 * The proxy list is a parameter rather than the whole population, because the
 * two questions the harness answers have different prices. "Do the standing
 * bands still hold" is asked of the three bracket proxies whose numbers are
 * written into `balance.test.ts`, and running the other ten through it would
 * quadruple the gate's cost without moving a single assertion. "Does the shape
 * of the outcome depend on *how* a president governs" can only be asked of the
 * whole population, and is asked in `population-balance.test.ts` at its own
 * seed count. A gate that ran everything everywhere would be slower than both
 * and would answer neither question better.
 */
export function runBalanceHarness(
  seeds: readonly string[],
  horizon = HORIZON_TURNS,
  proxies: readonly SkillProxy[] = BRACKET_PROXIES,
  party: AdministrationParty = "democrat",
  platform?: HarnessPlatform,
): BalanceReport {
  const outcomes: CampaignOutcome[] = [];
  for (const skill of proxies) {
    for (const seed of seeds) outcomes.push(playCampaign(seed, skill, horizon, party, platform));
  }
  return {
    party,
    outcomes,
    proxies,
    bySkill: Object.fromEntries(
      proxies.map((skill) => [skill, summarize(outcomes.filter((o) => o.skill === skill))]),
    ) as Record<SkillProxy, SkillSummary>,
  };
}

function formatDrivers(shares: readonly StretchShare[]): string {
  return shares.slice(0, 5).map((share) => `${share.id} -${share.fell}/+${share.rose}`).join(", ");
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines: string[] = [];
  for (const skill of report.proxies) {
    const s = report.bySkill[skill];
    lines.push(
      `[${report.party} ${skill}] n=${s.campaigns} removal=${s.removalRate} (beats ${s.beatRate}, median turn ${s.medianRemovalTurn ?? "-"}) ` +
        `approval=${s.medianFinalApproval} range=${s.approvalRange} drift=${s.approvalDrift} stability=${s.medianFinalStability} ` +
        `standing=${s.medianFinalStanding} ` +
        `treasury×${s.medianTreasuryRatio} success=${s.successRate} freeWin=${s.freeWinShare} tradeoff=${s.tradeoffShare}`,
    );
    lines.push(`         ${s.platform}`);
    lines.push(
      `         instruments ${INSTRUMENT_IDS.map((i) => `${i} ${s.instrumentShare[i]}`).join(", ")} | ` +
        `rungs ${RUNG_LEVELS.map((r) => `${r}:${s.rungShare[r]}`).join(" ")}`,
    );
    lines.push(
      `         cabinet per term: leaks ${s.cabinetPerTerm.leak}, challenges ${s.cabinetPerTerm.challenge}, ` +
        `resignations ${s.cabinetPerTerm.resignation} | scandals per campaign ${s.scandals.brokenPerCampaign} ` +
        `(live weeks ${s.scandals.liveWeeksPerCampaign}, campaigns with one ${s.scandals.campaignsWithScandal}` +
        `; by origin ${Object.entries(s.scandals.originsPerCampaign).map(([k, v]) => `${k} ${v}`).join(", ") || "none"})`,
    );
    const drivers = s.approvalDrivers;
    lines.push(
      `         approval moved by: ${OPINION_DRIVERS.map((d) => `${d} ${drivers.byDriver[d]}`).join(", ")} | ` +
        `through: ${APPROVAL_PATHS.map((p) => `${p} ${drivers.byPath[p]}`).join(", ")}`,
    );
    lines.push(`         stability moved by: ${formatDrivers(s.metricDrivers.stability)} | treasury moved by: ${formatDrivers(s.metricDrivers.treasury)}`);
    if (s.term) {
      const t = s.term;
      lines.push(
        `         term: electoral=${t.electoralCampaigns} midterms=${t.midtermsHeld} (share ${t.medianMidtermShare}, ` +
          `house ${t.medianMidtermHouseSwing}, senate ${t.medianMidtermSenateSwing}) ` +
          `contests=${t.contestsHeld} (share ${t.medianContestShare}, re-elected ${t.reelectionRate}) | ` +
          `endings ${Object.entries(t.endings).map(([ending, count]) => `${ending} ${count}`).join(", ")}`,
      );
    }
  }
  return lines.join("\n");
}
