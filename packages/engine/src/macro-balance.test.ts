import { beforeAll, describe, expect, it } from "vitest";
import { debtToGdp, type NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { expectedDwellWeeks, type CyclePhase, type CycleState } from "./business-cycle.js";
import { externalMacroPressure } from "./external-pressure.js";
import { governmentShift } from "./fiscal-impulse.js";
import { selectMacroDrivers } from "./macro-drivers.js";
import { outputGap, selectMacroState } from "./macro-state.js";
import { booksFor, stationaryPrimaryBalance, trendGrowth } from "./national-books.js";
import { createSave, loadSave } from "./save.js";
import { borrowingCapacity, nonErodibleShareOf } from "./sovereign.js";
import type { TradeMeasure } from "./trade.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import type { Campaign, Conflict } from "./state.js";

// The economy's own gate: does it turn, and does the world reach it.
//
// Measured on the whole weekly turn, not on the drift phase alone, because the
// engine value is the one that counts: conditions, programs, wars and the
// books all move the rates the cycle is judged on. Every nation, every week,
// with nobody governing the United States, over two terms.
//
// These are harness-measured bands from the design's prototype, which had no
// conditions, no programs and no policy rule abroad. A band the engine cannot
// meet goes to the orchestrator as a finding; it is never widened here.

const USA = "USA" as NationId;
const MEX = "MEX" as NationId;
const UKR = "UKR" as NationId;
const RUS = "RUS" as NationId;
const POL = "POL" as NationId;
const SEEDS = ["macro-0", "macro-1", "macro-2", "macro-3"] as const;
// The per-contraction clauses need a sample of their own: four seeds give five
// US contractions, too few for a median or to find a tail. These twelve more,
// read only for the United States' unemployment, bring it past twenty.
const RISE_SEEDS = Array.from({ length: 12 }, (_, index) => `macro-${index + 4}`);
const MIN_CONTRACTIONS = 20;
const WEEKS = 416;
const SETTLED = 104;
const TIMEOUT = 900_000;
const PHASES: readonly CyclePhase[] = ["expansion", "peak", "contraction", "trough"];

type Founded = { readonly campaign: Campaign; readonly advance: (campaign: Campaign) => Campaign };

function founded(seed: string): Founded {
  const { campaign, charter } = foundedForBalance(seed, "democrat");
  const phases = campaignTurnPhases(charter);
  return { campaign, advance: (state) => advanceTurn(state, phases) };
}

const pct = (values: readonly number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))]!;
};
const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

/** What one two-term world run measured. Filled week by week while it runs, then read only. */
type WorldTally = {
  usGap: number[];
  usUnemploymentOverRest: number[];
  usRises: number[];
  flips: number;
  changes: number;
  shares: Record<CyclePhase, number>[];
  enteredAll: number;
  nations: number;
  longestTurn: number;
  onsets: number;
  onsetsInSlump: number;
  onsetPhases: Record<string, number>;
  saves: Record<number, string>;
  programs: ProgramCount[];
};

/** Foreign fiscal programs at one week, split by whether the government's books demand consolidation. */
type ProgramCount = {
  readonly week: number;
  readonly free: number;
  readonly freeAusterity: number;
  readonly demanded: number;
  readonly demandedAusterity: number;
};

type WorldRun = Readonly<WorldTally>;

type Tracker = {
  entered: Map<NationId, Set<CyclePhase>>;
  turnRun: Map<NationId, number>;
  longestTurn: number;
  usContractionStart?: number;
  usPeakUnemployment: number;
  lastGrowth?: number;
  lastChange: number;
};

function trackCycles(tracker: Tracker, after: Campaign): void {
  for (const [id, cycle] of Object.entries(after.cycles) as [NationId, CycleState][]) {
    if (cycle.amplitude === 0) continue;
    const seen = tracker.entered.get(id) ?? new Set<CyclePhase>();
    seen.add(cycle.phase);
    tracker.entered.set(id, seen);
    const run = cycle.phase === "peak" || cycle.phase === "trough" ? (tracker.turnRun.get(id) ?? 0) + 1 : 0;
    tracker.turnRun.set(id, run);
    tracker.longestTurn = Math.max(tracker.longestTurn, run);
  }
}

function trackUnitedStates(tracker: Tracker, run: WorldTally, before: Campaign, after: Campaign): void {
  const us = after.nations[USA]!;
  const phaseBefore = before.cycles[USA]?.phase;
  const phase = after.cycles[USA]!.phase;
  const unemployment = us.stats.economy.unemployment;
  run.usGap.push(outputGap(after, USA));
  run.usUnemploymentOverRest.push(unemployment - us.base.stats.economy.unemployment);
  if (phase === "contraction" && phaseBefore !== "contraction") {
    tracker.usContractionStart = unemployment;
    tracker.usPeakUnemployment = unemployment;
  }
  if (tracker.usContractionStart !== undefined) {
    tracker.usPeakUnemployment = Math.max(tracker.usPeakUnemployment, unemployment);
    if (phase === "expansion" && phaseBefore !== "expansion") {
      run.usRises.push(tracker.usPeakUnemployment - tracker.usContractionStart);
      tracker.usContractionStart = undefined;
    }
  }
  const growth = us.stats.economy.growth;
  if (tracker.lastGrowth !== undefined) {
    const change = growth - tracker.lastGrowth;
    if (change !== 0) {
      run.changes += 1;
      if (tracker.lastChange !== 0 && Math.sign(change) !== Math.sign(tracker.lastChange)) run.flips += 1;
      tracker.lastChange = change;
    }
  }
  tracker.lastGrowth = growth;
}

function trackOnsets(run: WorldTally, before: Campaign, after: Campaign): void {
  for (const [id, condition] of Object.entries(after.conditions)) {
    if (condition.kind !== "recession" || before.conditions[id] !== undefined) continue;
    const phase = after.cycles[condition.nation]?.phase ?? "expansion";
    run.onsets += 1;
    if (phase === "contraction" || phase === "trough") run.onsetsInSlump += 1;
    run.onsetPhases[phase] = (run.onsetPhases[phase] ?? 0) + 1;
  }
}

/**
 * Whether a foreign government's books demand consolidation, read from the
 * credit readings and never from the purse that chooses its program: shut out
 * of the markets (rated B or worse, or in a fiscal crisis), or running a
 * structural primary balance more than a point of output below the balance
 * that holds its ratio at founding rates (the fiscal-crisis row's gap).
 */
function consolidationDemanded(campaign: Campaign, nation: NationId): boolean {
  if (borrowingCapacity(campaign, nation) === 0) return true;
  const runtime = campaign.nations[nation]!;
  const books = booksFor(campaign, runtime);
  const us = campaign.founding.nation;
  const holding = stationaryPrimaryBalance({
    ratio: debtToGdp(runtime.stats),
    rate: books.anchor.rate,
    growth: trendGrowth(runtime),
    inflation: campaign.macro?.[nation]?.expectedInflation ?? runtime.base.stats.economy.inflation,
    usInflation: campaign.macro?.[us]?.expectedInflation ?? runtime.base.stats.economy.inflation,
    nonErodible: nonErodibleShareOf(runtime),
  });
  const program = governmentShift(campaign, nation);
  const structural = books.anchor.primaryBalance + (program.take - program.outlays) - (books.anchor.programBalance ?? 0);
  return holding - structural > 0.01;
}

function countPrograms(campaign: Campaign, week: number): ProgramCount {
  const count = { week, free: 0, freeAusterity: 0, demanded: 0, demandedAusterity: 0 };
  for (const nation of Object.keys(campaign.governments) as NationId[]) {
    const austerity = campaign.governments[nation]?.fiscal === "fiscal-austerity" ? 1 : 0;
    if (consolidationDemanded(campaign, nation)) {
      count.demanded += 1;
      count.demandedAusterity += austerity;
    } else {
      count.free += 1;
      count.freeAusterity += austerity;
    }
  }
  return count;
}

function phaseShares(campaign: Campaign): Record<CyclePhase, number> {
  const counts: Record<CyclePhase, number> = { expansion: 0, peak: 0, contraction: 0, trough: 0 };
  const cycles = Object.values(campaign.cycles);
  for (const cycle of cycles) counts[cycle.phase] += 1;
  for (const phase of PHASES) counts[phase] /= Math.max(1, cycles.length);
  return counts;
}

/** Two terms of the world with nobody governing the United States, every nation read every week. */
function runWorld(seed: string, saveAt: readonly number[] = []): WorldRun {
  const { campaign, advance } = founded(seed);
  const run: WorldTally = {
    usGap: [],
    usUnemploymentOverRest: [],
    usRises: [],
    flips: 0,
    changes: 0,
    shares: [],
    enteredAll: 0,
    nations: Object.keys(campaign.nations).length,
    longestTurn: 0,
    onsets: 0,
    onsetsInSlump: 0,
    onsetPhases: {},
    saves: {},
    programs: [],
  };
  const tracker: Tracker = { entered: new Map(), turnRun: new Map(), longestTurn: 0, usPeakUnemployment: 0, lastChange: 0 };
  let state = campaign;
  for (let week = 1; week <= WEEKS; week++) {
    const before = state;
    state = advance(state);
    trackCycles(tracker, state);
    trackUnitedStates(tracker, run, before, state);
    trackOnsets(run, before, state);
    if (week > SETTLED) run.shares.push(phaseShares(state));
    if (saveAt.includes(week)) run.saves[week] = JSON.stringify(createSave(state));
    if (week === SETTLED || week === WEEKS) run.programs.push(countPrograms(state, week));
  }
  run.enteredAll = [...tracker.entered.values()].filter((seen) => seen.size === PHASES.length).length;
  run.longestTurn = tracker.longestTurn;
  return run;
}

describe("two terms of the world, every nation, nobody governing the United States", () => {
  let runs: readonly WorldRun[] = [];
  let rises: readonly number[] = [];
  beforeAll(() => {
    runs = SEEDS.map((seed, index) => runWorld(seed, index === 0 ? [100, 208] : []));
    const all = (read: (run: WorldRun) => readonly number[]) => runs.flatMap(read);
    console.info(
      [
        `H5 over ${SEEDS.length} seeds x ${WEEKS} weeks:`,
        `US gap p5 ${(pct(all((r) => r.usGap), 0.05) * 100).toFixed(2)}% median ${(pct(all((r) => r.usGap), 0.5) * 100).toFixed(2)}% p95 ${(pct(all((r) => r.usGap), 0.95) * 100).toFixed(2)}%`,
        `US gap positive share ${(all((r) => r.usGap).filter((gap) => gap > 0).length / all((r) => r.usGap).length).toFixed(2)}`,
        `US unemployment over rest p5 ${(pct(all((r) => r.usUnemploymentOverRest), 0.05) * 100).toFixed(2)} p95 ${(pct(all((r) => r.usUnemploymentOverRest), 0.95) * 100).toFixed(2)} points`,
        `US unemployment rise per contraction (these ${SEEDS.length} seeds): ${all((r) => r.usRises).map((rise) => (rise * 100).toFixed(2)).join(", ")}`,
        `sign-flip rate ${runs.map((r) => (r.flips / Math.max(1, r.changes)).toFixed(2)).join(", ")}`,
        `nations entering all four phases ${runs.map((r) => (r.enteredAll / r.nations).toFixed(3)).join(", ")}`,
        `longest peak-or-trough spell ${Math.max(...runs.map((r) => r.longestTurn))} weeks`,
        `contraction share after week ${SETTLED}: ${Math.min(...all((r) => r.shares.map((s) => s.contraction))).toFixed(2)}-${Math.max(...all((r) => r.shares.map((s) => s.contraction))).toFixed(2)}`,
        `recession onsets per nation-year ${runs.map((r) => (r.onsets / (r.nations * (WEEKS / 52))).toFixed(3)).join(", ")}; by phase ${JSON.stringify(runs.map((r) => r.onsetPhases))}`,
        `austerity among governments the books do not push / do push, weeks ${SETTLED} and ${WEEKS}: ${runs
          .map((r) => r.programs.map((p) => `${p.freeAusterity}/${p.free} ${p.demandedAusterity}/${p.demanded}`).join(" "))
          .join("; ")}`,
      ].join("\n"),
    );
  }, TIMEOUT);

  beforeAll(() => {
    rises = [...runs.flatMap((run) => run.usRises), ...RISE_SEEDS.flatMap((seed) => runWorld(seed).usRises)];
    const sorted = [...rises].sort((a, b) => a - b).map((rise) => (rise * 100).toFixed(2));
    console.info(`H5 over ${SEEDS.length + RISE_SEEDS.length} seeds: ${rises.length} US contractions, unemployment rise in points ${sorted.join(", ")}`);
  }, TIMEOUT * 3);

  describe("H5: the economy turns instead of sticking", () => {
    it("keeps the United States' gap near zero on the median, and above zero in 40 to 70 percent of weeks", () => {
      const gaps = runs.flatMap((run) => run.usGap);
      expect(Math.abs(pct(gaps, 0.5))).toBeLessThanOrEqual(0.01);
      const positive = gaps.filter((gap) => gap > 0).length / gaps.length;
      expect(positive).toBeGreaterThanOrEqual(0.4);
      expect(positive).toBeLessThanOrEqual(0.7);
    });

    // The ceiling is five and a half points because that is how high real
    // American recessions have taken unemployment above where it started. The
    // postwar average rise from trough to peak is about three and a half
    // points; 1974-75 added 4.2 and 2007-09 about 5.6. A p95 week sits inside
    // the worst of those, and a ceiling of four would call the Great Recession
    // impossible.
    it("keeps US unemployment within a point and a half below its rest and five and a half above it, p5 to p95", () => {
      const over = runs.flatMap((run) => run.usUnemploymentOverRest);
      expect(pct(over, 0.05)).toBeGreaterThanOrEqual(-0.015);
      expect(pct(over, 0.95)).toBeLessThanOrEqual(0.055);
    });

    it("raises US unemployment by one to two and a half points in a median contraction", () => {
      expect(rises.length).toBeGreaterThanOrEqual(MIN_CONTRACTIONS);
      expect(pct(rises, 0.5)).toBeGreaterThanOrEqual(0.01);
      expect(pct(rises, 0.5)).toBeLessThanOrEqual(0.025);
    });

    it("never raises US unemployment by more than four points in one contraction", () => {
      expect(rises.length).toBeGreaterThanOrEqual(MIN_CONTRACTIONS);
      expect(Math.max(...rises)).toBeLessThanOrEqual(0.04);
    });

    it("takes nine nations in ten through all four phases", () => {
      for (const run of runs) expect(run.enteredAll / run.nations).toBeGreaterThanOrEqual(0.9);
    });

    it("holds each phase's share of the world near its share of the expected cycle, and the contraction share between 5 and 35 percent every week", () => {
      const total = PHASES.reduce((sum, phase) => sum + expectedDwellWeeks(phase), 0);
      for (const shares of runs.flatMap((run) => run.shares)) {
        for (const phase of PHASES) expect(Math.abs(shares[phase] - expectedDwellWeeks(phase) / total), phase).toBeLessThanOrEqual(0.2);
        expect(shares.contraction).toBeGreaterThanOrEqual(0.05);
        expect(shares.contraction).toBeLessThanOrEqual(0.35);
      }
    });

    it("leaves no nation at a turning point for more than three years", () => {
      for (const run of runs) expect(run.longestTurn).toBeLessThanOrEqual(156);
    });

    it("keeps week-to-week growth noisy rather than smooth: its change flips sign in at least a quarter of weeks", () => {
      for (const run of runs) expect(run.flips / Math.max(1, run.changes)).toBeGreaterThanOrEqual(0.25);
    });
  });

  describe("H6: a recession names the cycle rather than competing with it", () => {
    it("opens between 0.05 and 0.15 recessions per nation-year", () => {
      for (const run of runs) {
        const rate = run.onsets / (run.nations * (WEEKS / 52));
        expect(rate).toBeGreaterThanOrEqual(0.05);
        expect(rate).toBeLessThanOrEqual(0.15);
      }
    });

    it("opens every recession inside a contraction or a trough", () => {
      for (const run of runs) expect(run.onsetsInSlump).toBe(run.onsets);
    });
  });

  describe("the world's governments", () => {
    // Austerity is the answer to books that demand it. A government that can
    // borrow and whose balance holds its ratio has a choice, and fewer than half
    // of those should make that choice the same way.
    it("keeps austerity under half the fiscal programs among governments whose books do not demand it, at week 104 and at the end", () => {
      for (const run of runs) {
        for (const count of run.programs) expect(count.freeAusterity / count.free, `week ${count.week}`).toBeLessThan(0.5);
      }
    });
  });

  describe("determinism", () => {
    it("replays a seed to a byte-identical save at week 208, and a save reloaded at week 100 continues to the same bytes", () => {
      const first = runs[0]!.saves;
      const { campaign, advance } = founded(SEEDS[0]);
      let straight = campaign;
      let reloaded: Campaign | undefined;
      for (let week = 1; week <= 208; week++) {
        straight = advance(straight);
        if (week === 100) {
          expect(JSON.stringify(createSave(straight))).toBe(first[100]);
          reloaded = loadSave(JSON.parse(first[100]!));
        }
        if (week > 100 && reloaded) reloaded = advance(reloaded);
      }
      expect(JSON.stringify(createSave(straight))).toBe(first[208]);
      expect(JSON.stringify(createSave(reloaded!))).toBe(first[208]);
    }, TIMEOUT);
  });
});

// --- Held experiments: one seed, one change, everything else the same. ---

/** A run of `weeks` with `hold` applied before every week, reading each week's state after it. */
function heldRun(seed: string, weeks: number, hold: (state: Campaign, week: number) => Campaign): Campaign[] {
  const { campaign, advance } = founded(seed);
  const states: Campaign[] = [];
  let state = campaign;
  for (let week = 1; week <= weeks; week++) {
    state = advance(hold(state, week));
    states.push(state);
  }
  return states;
}

const growthOf = (states: readonly Campaign[], nation: NationId, from: number, to: number) =>
  mean(states.slice(from, to).map((state) => state.nations[nation]!.stats.economy.growth));

const PROBE = "macro-probe";

describe("H5: the gap moves prices and the short rate", () => {
  it("lowers US inflation by 0.02 to 0.4 points after 52 weeks at a gap of minus two percent", () => {
    const holdGap = (gap: number) => (state: Campaign) => ({
      ...state,
      macro: { ...state.macro, [USA]: { ...state.macro![USA]!, potential: state.nations[USA]!.stats.economy.gdp * Math.exp(-gap) } },
    });
    const slack = heldRun(PROBE, 52, holdGap(-0.02)).at(-1)!;
    const level = heldRun(PROBE, 52, holdGap(0)).at(-1)!;
    const fall = level.nations[USA]!.stats.economy.inflation - slack.nations[USA]!.stats.economy.inflation;
    console.info(`Phillips: 52 weeks at a -2% gap lowers US inflation ${(fall * 100).toFixed(3)} points`);
    expect(fall).toBeGreaterThanOrEqual(0.0002);
    expect(fall).toBeLessThanOrEqual(0.004);
  }, TIMEOUT);

  describe("a US contraction against the same seed without one", () => {
    const flat = (state: Campaign, week: number): Campaign => ({
      ...state,
      cycles: { ...state.cycles, [USA]: { phase: "expansion", enteredTurn: state.turn - week, amplitude: 0 } },
    });
    const slump = (state: Campaign, week: number): Campaign =>
      week >= 20 && week < 66
        ? { ...state, cycles: { ...state.cycles, [USA]: { phase: "contraction", enteredTurn: state.turn - (week - 20), amplitude: 0.0225 } } }
        : flat(state, week);
    let without: Campaign[] = [];
    let within: Campaign[] = [];
    const rate = (states: readonly Campaign[], week: number) => selectMacroState(states[week - 1]!, USA)!.policyRate;
    const market = (states: readonly Campaign[], week: number) => states[week - 1]!.books![USA]!.rates.market!;
    beforeAll(() => {
      without = heldRun(PROBE, 104, flat);
      within = heldRun(PROBE, 104, slump);
      const pct2 = (value: number) => (value * 100).toFixed(2);
      console.info(
        `Weeks 52 and 104 with a contraction, then without: short rate ${pct2(rate(within, 52))}%/${pct2(rate(within, 104))}% against ${pct2(rate(without, 52))}%/${pct2(rate(without, 104))}%; coupon market rate ${pct2(market(within, 52))}%/${pct2(market(within, 104))}% against ${pct2(market(without, 52))}%/${pct2(market(without, 104))}%`,
      );
    }, TIMEOUT);

    // A mean contraction (the middle of the amplitude range, held for its
    // expected span) is the country's worst ordinary year, and the public's
    // sense of being better off has to feel it: by its deepest point the
    // prosperity judgment sits four to twelve points under the same seed
    // without one.
    it("lowers the prosperity judgment 0.04 to 0.12 at the contraction's trough", () => {
      const shortfall = without.map((state, week) => state.player.opinion.prosperity - within[week]!.player.opinion.prosperity);
      const deepest = Math.max(...shortfall);
      console.info(`H9: a mean contraction lowers prosperity by ${deepest.toFixed(3)} at its deepest (week ${shortfall.indexOf(deepest) + 1})`);
      expect(deepest).toBeGreaterThanOrEqual(0.04);
      expect(deepest).toBeLessThanOrEqual(0.12);
    });

    // Easing, and the coupon rate that follows it. The Fed rule is read once a
    // week, on whatever weekday the week is read on, so a slack labor market
    // reaches the short rate on the eight decision weeks a year the planning
    // calendar holds, and the coupon market prices the short end.
    it("lowers the United States' short rate", () => {
      for (const week of [52, 104]) expect(rate(within, week)).toBeLessThan(rate(without, week));
    });

    // The long end follows the Fed down, but not at once. Thirty-two weeks
    // into a contraction the ten-year has risen about as often as it has
    // fallen: after the eight postwar peaks since 1969 it was higher 32 weeks
    // on in four (1969, 1973, 1980, 1981) and lower in three (Treasury ten-year
    // constant maturity, FRED DGS10). Two years on it was lower in five of the
    // eight and in three of the four since 1990. So the rate is asked to have
    // fallen by week 104, a year past the trough; at week 52 the slump's added
    // borrowing may still hold it up, as it did in half the record.
    it("lowers the United States' coupon market rate by a year after the trough", () => {
      expect(market(within, 104)).toBeLessThan(market(without, 104));
    });
  });
});

const warOf = (intensity: number): Conflict => ({
  id: `war:${RUS}:${UKR}:held`,
  aggressor: RUS,
  defender: UKR,
  joined: { aggressor: [], defender: [POL] },
  startedTurn: 1,
  cause: "a held experiment",
  intensity,
  warSupport: { aggressor: 0.6, defender: 0.8 },
  exhaustion: { aggressor: 0, defender: 0 },
  status: "active",
  beats: [],
});

const embargoOnMexico = (turn: number, lifted?: number): TradeMeasure => ({
  id: `embargo:${MEX}:held`,
  kind: "embargo",
  sector: "autos-light-vehicles" as TradeMeasure["sector"],
  target: MEX,
  rate: 0,
  imposedTurn: turn,
  imposedDate: { year: 2029, month: 1, day: 20 },
  authority: "INST-OFAC",
  origin: "us",
  ...(lifted !== undefined ? { liftedTurn: lifted } : {}),
});

describe("H8: wars and embargoes reach economies from both sides", () => {
  let plain: Campaign[] = [];
  beforeAll(() => {
    plain = heldRun(PROBE, 104, (state) => state);
  }, TIMEOUT);

  it("costs a defender 3 to 8 points of growth over a year at intensity 0.7, an aggressor abroad 0.3 to 1.5, a joiner at most 0.5", () => {
    const held = heldRun(PROBE, 52, (state) => ({ ...state, conflicts: { ...state.conflicts, [warOf(0.7).id]: warOf(0.7) } }));
    const loss = (nation: NationId) => growthOf(plain, nation, 0, 52) - growthOf(held, nation, 0, 52);
    console.info(`War over 52 weeks at 0.7: defender ${(loss(UKR) * 100).toFixed(2)}, aggressor ${(loss(RUS) * 100).toFixed(2)}, joiner ${(loss(POL) * 100).toFixed(2)} points of growth`);
    expect(loss(UKR)).toBeGreaterThanOrEqual(0.03);
    expect(loss(UKR)).toBeLessThanOrEqual(0.08);
    expect(loss(RUS)).toBeGreaterThanOrEqual(0.003);
    expect(loss(RUS)).toBeLessThanOrEqual(0.015);
    expect(loss(POL)).toBeLessThanOrEqual(0.005);
  }, TIMEOUT);

  it("cuts Mexico's first-year growth 2 to 8 points under a US embargo, costs the United States some, and lifting it restores both targets within 52 weeks", () => {
    const embargoed = heldRun(PROBE, 104, (state, week) => ({
      ...state,
      trade: { ...state.trade, measures: { ...state.trade.measures, [embargoOnMexico(1).id]: embargoOnMexico(1, week > 52 ? 53 : undefined) } },
    }));
    const mexico = growthOf(plain, MEX, 0, 52) - growthOf(embargoed, MEX, 0, 52);
    const us = growthOf(plain, USA, 0, 52) - growthOf(embargoed, USA, 0, 52);
    console.info(`Embargo on Mexico, first year: Mexico loses ${(mexico * 100).toFixed(2)}, the United States ${(us * 100).toFixed(3)} points of growth`);
    expect(mexico).toBeGreaterThanOrEqual(0.02);
    expect(mexico).toBeLessThanOrEqual(0.08);
    expect(us).toBeGreaterThan(0);
    const world = (states: readonly Campaign[], nation: NationId, week: number) =>
      selectMacroDrivers(states[week - 1]!, nation).growth.find((driver) => driver.source === "world")!.amount;
    for (const nation of [MEX, USA]) {
      expect(world(embargoed, nation, 52), nation).toBeLessThan(world(plain, nation, 52));
      const restored = [...Array(52).keys()].some((offset) => Math.abs(world(embargoed, nation, 53 + offset) - world(plain, nation, 53 + offset)) < 0.001);
      expect(restored, nation).toBe(true);
    }
    expect(externalMacroPressure(embargoed[51]!, MEX).growth).toBeLessThan(0);
  }, TIMEOUT);
});
