import type { NationId } from "@admin/world";
import { advanceCycle, drawnCycle, isDrawn, NO_CYCLE, type CycleState } from "./business-cycle.js";
import { costBaseline, crimeBaseline, normalPriceLevel, politicalBaseline, weeksInOffice } from "./macro-baseline.js";
import { driversTarget, macroStep, type MacroStep } from "./macro-drivers.js";
import { restingProgram } from "./governance.js";
import { nextMacroState } from "./macro-state.js";
import { WEEKLY_YEAR_FRACTION } from "./pace.js";
import type { ProgramRestingOffset } from "./policy-stats.js";
import type { Effect } from "./effects.js";
import { vitalCohortEdges } from "./vital-edges.js";
import { createRngStreams } from "./rng.js";
import { selectNation, type Campaign, type NationRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";

export * from "./business-cycle.js";
export * from "./macro-baseline.js";

// The one writer of the evolution law of an economy's growth, inflation and
// unemployment, and of the three political figures with no other restoring
// force: order, standing and the temperature of the street.
//
// Before this phase, those three moved every week from two uncoordinated
// places — a government's standing program pushed them one way, and every
// active condition pushed growth the other — and both were monotone toward a
// clamp with nothing pulling back. Nobody had computed where that fight
// settles, and the answer was: at the clamp. A long campaign ratcheted its way
// to permanently negative growth, which looks like a simulation for about fifty
// turns and is a one-way street.
//
// Giving the three stats a single owner is what makes a standing economic
// condition able to close at all. A recession opens on a reading of growth, so
// if the recession's own weekly cost were also the largest writer of growth,
// its cause would be a function of itself and the recovery it closes on could
// never arrive.
//
// Each rate reverts toward one target, and the target is the sum of its
// drivers (`macro-drivers.ts`), composed there and nowhere else:
//   rest       — the nation's own authored economy (macroBaseline)
//   the cycle  — where the business cycle currently pulls growth
//   programs   — how far the standing program moves the rest
//   impulse    — the budget's push on demand, fading as it is spent
//   crises     — the summed macroPressure of everything it is living through
//   the world  — wars, measures and partners abroad (external-pressure.ts)
//   the gap    — output against its potential: the pull back on growth, and
//                through it on jobs (Okun) and prices (Phillips)
// and a bounded, seeded shock on the step, because an economy that reverts
// smoothly is a spreadsheet and the shock term is the model (MACRO_SHOCK on
// the economic rates, a share of the step on the political ones, MACRO_JITTER).
//
// A program enters here as a shift in the target and never as a write to the
// value, which is the same argument a condition's pressure already made. A
// weekly level write against a proportional reversion settles where the write
// and the reversion step cancel — at the authored figure divided by the
// reversion rate, 25x on the economic rates and 100x on the political ones. So
// an authored tenth of a point of growth was delivering two and a half points
// of it, every government on earth ran one, and the world sat four points above
// the highest resting point this law can produce; no country could read as
// below its own trend, and a recession could not open anywhere.
//
// What a program still writes for itself is the paths with no law behind
// them — readiness, press freedom, corruption, the border. Those are stocks
// a government moves and nothing pulls back, so the level write is the
// delivery, and a president's program stays visible in the phase that
// represents their choices. It is only the rates this file owns the law of
// — growth, inflation, unemployment, `security.crimeIndex` and
// `economy.costOfLiving` — that could not be written that way and mean
// anything.
//
// The politics are here for the same reason the economy was: they were a
// ratchet. Every writer of `regimeStability` lowers it, the weekly writers of
// `protestPressure` mostly raise it, and nothing anywhere brought either back,
// so a long world converged on half its opening order and a permanently
// restive street however it was governed. That is not difficulty, it is a
// one-way street with a graph on it — and because `macroBaseline` is scaled by
// order, it also dragged the whole economic target down underneath the rates
// reverting toward it. They revert more slowly than the economy: a shock to how
// a country is governed is not last quarter's news.

/** How fast a stat closes the gap to its baseline each turn. */
export const REVERSION_RATE = 0.04;

/**
 * The same, for the political figures.
 *
 * Slower on purpose, and this is the one number here chosen rather than
 * measured: at a quarter of the economic rate a country is half way back from
 * a shock to its order after about eight months, which is long enough that a
 * president lives with what they did and short enough that a term is not
 * decided by a bad fortnight in its first year.
 */
export const POLITICAL_REVERSION_RATE = 0.01;

/** The share of a reversion step that variance may add or remove, on the political rates. */
export const MACRO_JITTER = 0.4;

/**
 * The most one week's news can move each economic rate on its own, in the
 * rate's own units, drawn evenly either way.
 *
 * Added to the step rather than multiplied into it. A share of the reversion
 * step is a share of nothing once an economy reaches its resting point, so a
 * settled economy stopped moving and every seed converged on the same one.
 * Against a reversion of four percent a week these settle into a spread of
 * about four tenths of a point of growth, three of inflation and a sixth of a
 * point of unemployment around the resting point: enough that no two campaigns
 * read the same economy, far short of the gap a crisis opens on.
 */
export const MACRO_SHOCK = { growth: 0.0019, inflation: 0.0015, unemployment: 0.00075 } as const;

/**
 * `costOfLiving` is not a mean-reverting equilibrium the way growth,
 * inflation, unemployment and crime are — it is a cumulative index whose own
 * baseline is computed from its own previous value (`costBaseline`). At the
 * ordinary `REVERSION_RATE` the index would compound at roughly a
 * twenty-fifth of its intended rate. Set to 1 so the index simply adopts its
 * computed next value each turn, which is what "cumulative by construction"
 * means in practice. No jitter on this call for the same reason: the
 * randomness is already in `inflation`, and costOfLiving derives from it
 * rather than drawing its own.
 */
export const COST_REVERSION_RATE = 1;

/**
 * Bounds, held to the dataset schema's own ranges. The price index's ceiling
 * sits where no campaign can reach it: two terms at the highest inflation the
 * bound allows multiply prices by 3^8, about 6,561, so a country that runs
 * prices hot is never pinned to a ceiling and read as stable.
 */
export const MACRO_BOUNDS = {
  growth: { min: -0.3, max: 0.3 },
  inflation: { min: -0.1, max: 2 },
  unemployment: { min: 0, max: 1 },
  costOfLiving: { min: 0.1, max: 1e5 },
} as const;

/** Every political figure this phase writes is a share. */
const UNIT = { min: 0, max: 1 } as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Six places, not four, because a law whose quantum is coarser than its own
 * step stops moving before it arrives.
 *
 * At four places the political rates froze wherever they came within 0.01 of
 * their target and the economic rates within 0.0025: the step is the gap times
 * the reversion rate, so a gap under those figures produces a move smaller than
 * a whole quantum and rounds back to where it started.
 */
const roundRate = (value: number) => Math.round(value * 1_000_000) / 1_000_000 + 0;

/**
 * Everything moves where a rate RESTS; nothing is subtracted from where the
 * rate is.
 *
 * The difference is the whole stability of this phase. Subtracting a crisis's
 * pressure every week makes the stat a running total of every week the crisis
 * lasted, and since a nation-scoped condition's pressure is an order of
 * magnitude larger than one proportional reversion step, the total wins and
 * the stat walks to its clamp and stays — the same ratchet Law 8 removed from
 * the conditions, reappearing in the phase that replaced it.
 *
 * Shifting the target instead bounds the whole system by construction: growth
 * cannot fall below its target however long the crisis runs, it approaches
 * that floor asymptotically rather than crashing through it, and when the
 * condition closes the target returns and the economy climbs back on its own.
 */
function nextValue(
  current: number,
  target: number,
  jitter: number,
  rate: number,
  bounds: { readonly min: number; readonly max: number },
  shock = 0,
): number {
  const step = (target - current) * rate * (1 + jitter) + shock;
  return roundRate(clamp(current + step, bounds.min, bounds.max));
}

export function macroEffectsFor(campaign: Campaign, nation: NationId): Effect[] {
  const runtime = selectNation(campaign, nation);
  if (!runtime) return [];
  const cycle = campaign.cycles[nation] ?? NO_CYCLE;
  const stream = createRngStreams(campaign.seed).stream("macro", nation, campaign.turn);
  const draw = () => (stream.next() - 0.5) * 2;
  const jitter = () => draw() * MACRO_JITTER;
  const program = restingProgram(campaign, nation);
  const step = macroStep(campaign, runtime, nation, program);
  const economy = nextEconomy(runtime, step, draw);
  const politics = nextPolitics(runtime, program, jitter);
  const security = nextSecurity(runtime, jitter, normalPriceLevel(runtime, weeksInOffice(campaign)));
  const effects: Effect[] = [];
  if (economy !== undefined || politics !== undefined || security !== undefined) {
    effects.push({
      kind: "nationStat",
      nation,
      setStats: { ...(economy ? { economy } : {}), ...(politics ? { politics } : {}), ...(security ? { security } : {}) },
    });
  }
  effects.push({
    kind: "macroState",
    nation,
    set: nextMacroState(step.state, {
      trendGrowth: step.trendGrowth,
      inflation: economy?.inflation ?? runtime.stats.economy.inflation,
      rule: step.rule,
      rateAdjustment: step.rateAdjustment,
    }),
  });
  effects.push(...cycleEffectsFor(campaign, nation, cycle, step));
  // Cohort strain is a player-only concept (`Campaign.cohorts` carries the
  // player's own sixteen rows, not a per-nation record), so the edge only
  // ever fires for the nation the campaign is played from.
  if (nation === campaign.founding.nation) {
    const normalNext = normalPriceLevel(runtime, weeksInOffice(campaign) + 1);
    effects.push(
      ...vitalCohortEdges(
        campaign.turn,
        { costOfLiving: runtime.stats.economy.costOfLiving, crimeIndex: runtime.stats.security.crimeIndex },
        {
          costOfLiving: economy?.costOfLiving ?? runtime.stats.economy.costOfLiving,
          crimeIndex: security?.crimeIndex ?? runtime.stats.security.crimeIndex,
        },
        { before: normalPriceLevel(runtime, weeksInOffice(campaign)), after: normalNext },
      ),
    );
  }
  return effects;
}

/**
 * The cycle turns on the gap the week's growth target was set against and on
 * the budget's push, never on this week's growth: a turning point gated on
 * growth clearing a line the gap correction was pulling it back from never
 * came. See `advanceCycle`.
 *
 * A cycle not yet drawn is drawn here, the first week the law runs, from the
 * campaign's own seed: at a founding, and on a save that predates the draw.
 * It shapes growth from the week after.
 */
function cycleEffectsFor(campaign: Campaign, nation: NationId, cycle: CycleState, step: MacroStep): Effect[] {
  const draw = createRngStreams(campaign.seed).stream("cycle", nation, campaign.turn);
  const current = isDrawn(cycle) ? cycle : drawnCycle(nation, campaign.turn, { seed: campaign.seed, player: campaign.founding.nation });
  const next = advanceCycle(current, campaign.turn, step.gap, step.impulse, draw);
  if (next === cycle) return [];
  return [{ kind: "cycle", nation, phase: next.phase, amplitude: next.amplitude, enteredTurn: next.enteredTurn }];
}

type NextEconomy = {
  readonly growth: number;
  readonly inflation: number;
  readonly unemployment: number;
  readonly costOfLiving: number;
};

function nextEconomy(runtime: NationRuntime, step: MacroStep, draw: () => number): NextEconomy | undefined {
  const economy = runtime.stats.economy;
  const { drivers } = step;
  const growth = nextValue(economy.growth, driversTarget(drivers.growth), 0, REVERSION_RATE, MACRO_BOUNDS.growth, draw() * MACRO_SHOCK.growth);
  const inflation = nextValue(
    economy.inflation,
    driversTarget(drivers.inflation),
    0,
    REVERSION_RATE,
    MACRO_BOUNDS.inflation,
    draw() * MACRO_SHOCK.inflation,
  );
  const unemployment = nextValue(
    economy.unemployment,
    driversTarget(drivers.unemployment),
    0,
    REVERSION_RATE,
    MACRO_BOUNDS.unemployment,
    draw() * MACRO_SHOCK.unemployment,
  );
  // The one rate in the lattice with no target of its own: an index
  // compounding off its own previous value and this week's inflation,
  // already computed above — see `costBaseline` and `COST_REVERSION_RATE`.
  const costOfLiving = nextValue(
    economy.costOfLiving,
    costBaseline(economy.costOfLiving, inflation, WEEKLY_YEAR_FRACTION),
    0,
    COST_REVERSION_RATE,
    MACRO_BOUNDS.costOfLiving,
  );
  if (
    growth === economy.growth &&
    inflation === economy.inflation &&
    unemployment === economy.unemployment &&
    costOfLiving === economy.costOfLiving
  ) {
    return undefined;
  }
  return { growth, inflation, unemployment, costOfLiving };
}

type NextSecurity = { readonly crimeIndex: number };

/**
 * `security.crimeIndex`'s law. No crisis term (the coupling graph gives
 * crime no direct condition pressure — see `crimeBaseline`'s own note) and
 * no program term (no stance names this path), so this is the plainest of
 * the five: reversion toward a baseline that already carries every coupling
 * the graph wants, because `crimeBaseline` reads this turn's *starting*
 * unemployment and cost of living rather than the values `nextEconomy` just
 * produced.
 */
function nextSecurity(runtime: NationRuntime, jitter: () => number, normalPrice: number): NextSecurity | undefined {
  const baseline = crimeBaseline(runtime, normalPrice);
  const crimeIndex = nextValue(runtime.stats.security.crimeIndex, baseline, jitter(), REVERSION_RATE, UNIT);
  if (crimeIndex === runtime.stats.security.crimeIndex) return undefined;
  return { crimeIndex };
}

type NextPolitics = { readonly regimeStability: number; readonly legitimacy: number; readonly protestPressure: number };

/**
 * No crisis term on any of the three, which is what keeps this a law rather
 * than a second bill. A condition already charges order directly on the week it
 * arrives or deepens; shifting the target as well would make the same event pay
 * twice, once as a level and once as a resting point it never returns from.
 */
function nextPolitics(
  runtime: NationRuntime,
  program: ProgramRestingOffset,
  jitter: () => number,
): NextPolitics | undefined {
  const baseline = politicalBaseline(runtime);
  const politics = runtime.stats.politics;
  const rate = POLITICAL_REVERSION_RATE;
  // No program term on `regimeStability`: no stance names it, and the two that
  // are named revert four times slower than the economy, so a level write here
  // was worth a hundred times its authored figure. Emergency powers, at an
  // authored half a point of the street, was emptying it.
  const regimeStability = nextValue(politics.regimeStability, baseline.regimeStability, jitter(), rate, UNIT);
  const legitimacy = nextValue(
    politics.legitimacy,
    baseline.legitimacy + program["politics.legitimacy"],
    jitter(),
    rate,
    UNIT,
  );
  const protestPressure = nextValue(
    politics.protestPressure,
    baseline.protestPressure + program["politics.protestPressure"],
    jitter(),
    rate,
    UNIT,
  );
  if (
    regimeStability === politics.regimeStability &&
    legitimacy === politics.legitimacy &&
    protestPressure === politics.protestPressure
  ) {
    return undefined;
  }
  return { regimeStability, legitimacy, protestPressure };
}

/**
 * Runs immediately before `conditionPhase`: this week's economy is what this
 * week's conditions read, so the reading has to settle before the conditions
 * that gate on it are drawn.
 *
 * Every nation, in id order, so which economies move is a function of the seed
 * and the turn rather than of object iteration order. One packet, not one per
 * nation: this is the world's background hum, and fifty feed-less packets a
 * week would be fifty entries in a ledger that is supposed to record decisions.
 */
export const macroDriftPhase: TurnPhase = (state) => {
  const effects: Effect[] = [];
  for (const id of (Object.keys(state.nations) as NationId[]).sort((a, b) => (a as string).localeCompare(b as string))) {
    effects.push(...macroEffectsFor(state, id));
  }
  if (effects.length === 0) return [];
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      // The world's weekly hum: kept on the ledger for its causes, marked so
      // the Record, which is a record of decisions, can leave it out.
      background: true,
      narration: { summary: "The world's economies move a week." },
      effects,
    },
  ];
};
