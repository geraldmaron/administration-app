import { describe, expect, it } from "vitest";
import { STATE_IDS } from "@admin/world";
import { foundedForBalance, playCampaign } from "../balance-harness.js";
import { campaignTurnPhases } from "../turn-phases.js";
import { advanceTurn } from "../turn-loop.js";
import { createRngStreams } from "../rng.js";
import { selectConditions, type Campaign } from "../state.js";
import { ACUTE_CONDITIONS } from "../condition-kinds.js";
import { openCondition } from "../condition-onset.js";
import { placeUsOnset } from "../us-placement.js";
import { obligationPhase } from "../obligations.js";
import { IMPACT_CALIBRATION } from "../impact-catalog.js";
import { CIRCUIT_SEATS } from "../lower-bench.js";
import { JUDICIARY_SEAT_INSTITUTIONS } from "../judiciary.js";
import { COUPS_PER_YEAR, observeWeek, startCensus, type WorldCensus } from "./census.js";

// Domain: the world's event stream at home and abroad, read off the campaign's
// records (census.ts says why never off the feed). Every assertion states the
// realistic expectation, so a failure is a reproduced break; a target the
// methodology challenge found unsourced or mis-specified is an `it.todo` that
// says why, beside a report-only test that still prints the reading.
// Benchmarks: docs/audits/2026-10-24-world-dynamics/domains/events.md. Verdicts:
// METHODOLOGY.md §2 and PROGRAM.md. The engagement and corpus-coverage probes
// drive player-core, so they live in packages/player-core/src/__probes__.

const IDLE_SEEDS = ["ev-1", "ev-2", "ev-3"];
const IDLE_WEEKS = 208;
const YEARS = IDLE_WEEKS / 52;

type ImpactRow = { readonly hazard: string; readonly deaths: number };

type IdleRun = {
  readonly seed: string;
  readonly usConds: readonly { readonly kind: string; readonly severity: number }[];
  readonly usImpact: readonly ImpactRow[];
  readonly usRecordKinds: ReadonlySet<string>;
  readonly worldCondsByKind: Readonly<Record<string, number>>;
  readonly narration: readonly string[];
  readonly deadNonJudges: number;
  /** Members of Congress seated at any week of the run who are dead at its end: deaths in office, since nobody out of office is drawn. */
  readonly congressDeaths: number;
  readonly census: WorldCensus;
};

const memo = new Map<string, IdleRun>();

function judgeIds(campaign: Campaign): ReadonlySet<string> {
  const seats = [...JUDICIARY_SEAT_INSTITUTIONS, ...CIRCUIT_SEATS.map((seat) => seat.id)];
  return new Set(seats.flatMap((id) => campaign.institutions[id as keyof typeof campaign.institutions]?.leader ?? []));
}

function memberIds(campaign: Campaign): readonly string[] {
  return (campaign.congress.members ?? []).filter((member) => member.vacancy === undefined).map((member) => member.person as string);
}

function idleRun(seed: string): IdleRun {
  const cached = memo.get(seed);
  if (cached) return cached;
  const { campaign, charter } = foundedForBalance(seed);
  const phases = campaignTurnPhases(charter);
  const us = campaign.founding.nation;
  let world: Campaign = campaign;
  let census = startCensus(campaign);
  let judges = judgeIds(campaign);
  let members = new Set(memberIds(campaign));
  for (let week = 0; week < IDLE_WEEKS; week += 1) {
    world = advanceTurn(world, phases);
    census = observeWeek(census, world);
    judges = new Set([...judges, ...judgeIds(world)]);
    members = new Set([...members, ...memberIds(world)]);
  }
  const conds = selectConditions(world);
  const usImpact = Object.values(world.impactEvents ?? {})
    .filter((event) => event.spec.nation === us)
    .map((event) => {
      const mechanism = event.spec.mechanism as { readonly kind: string; readonly hazard?: string };
      return { hazard: mechanism.hazard ?? mechanism.kind, deaths: event.totals.deaths };
    });
  const usConds = conds.filter((c) => c.nation === us).map((c) => ({ kind: c.kind as string, severity: c.severity }));
  const worldCondsByKind = conds
    .filter((c) => c.nation !== us)
    .reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.kind]: (acc[c.kind] ?? 0) + 1 }), {});
  const run: IdleRun = {
    seed,
    usConds,
    usImpact,
    usRecordKinds: new Set([...usConds.map((c) => c.kind), ...usImpact.map((e) => e.hazard)]),
    worldCondsByKind,
    // Every applied packet's narration (the ledger, uncapped) and every item the
    // wire filed. A packet's summary is not its headline, so neither alone is
    // the record; what the weekly cap folded away survives only as a digest count.
    narration: [...world.ledger.map((entry) => entry.description), ...world.feed.map((item) => item.headline)],
    deadNonJudges: Object.values(world.people).filter((p) => p.alive === false && !judges.has(p.base.id as string)).length,
    congressDeaths: [...members].filter((id) => world.people[id as keyof typeof world.people]?.alive === false).length,
    census,
  };
  memo.set(seed, run);
  return run;
}
const idle = () => IDLE_SEEDS.map(idleRun);
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const perYear = (pick: (r: IdleRun) => number) => sum(idle().map(pick)) / (IDLE_SEEDS.length * YEARS);

describe("A. the home hazard stream", () => {
  it("opens four to twelve significant acute conditions at home per year (the design target holds)", () => {
    const rate = perYear((r) => r.usConds.filter((c) => (ACUTE_CONDITIONS as readonly string[]).includes(c.kind)).length);
    console.log("[events:A] US acute conditions/yr", rate);
    expect(rate).toBeGreaterThanOrEqual(4);
    expect(rate).toBeLessThanOrEqual(12);
  }, 1_800_000);

  it("reports hurricane landfalls, heat and tornado deaths, and the onset severity range (report only)", () => {
    const landfalls = idle().map((r) => r.usConds.filter((c) => c.kind === "cyclone").length);
    const deaths = (hazard: string) => perYear((r) => sum(r.usImpact.filter((e) => e.hazard === hazard).map((e) => e.deaths)));
    const { campaign } = foundedForBalance("ev-sev");
    const streams = createRngStreams(campaign.seed);
    const severities = Array.from({ length: 4000 }, (_, i) =>
      openCondition(campaign, { nation: campaign.founding.nation, kind: "flood", chance: 1 }, streams.stream("sev-probe", i)).severity);
    console.log("[events:A] US hurricane landfalls per run", landfalls, "heat deaths/yr", deaths("heat-wave"), "tornado deaths/yr", deaths("tornado"),
      "onset severity range", Math.min(...severities), Math.max(...severities));
    expect(landfalls.length).toBe(IDLE_SEEDS.length);
  }, 1_800_000);

  it.todo("hurricane landfall rate: no comparable primary benchmark opened (NHC climatology carried no figures); Wave 3 hazard calibration sets the band");
  it.todo("heat mortality: aggregate death-certificate counts cannot calibrate selected acute incidents; Wave 3 fits per-hazard fatality to a comparable incident series");
  it.todo("severity tail: an onset never at 0.9 does not prove no catastrophic outcome; Wave 3 fits exposure, vulnerability and footprint, then asserts the outcome distribution");

  it("almost never places a city-scope tornado in New York City (a handful touched down in the city since records began)", () => {
    const { campaign } = foundedForBalance("ev-place");
    const draws = 3000;
    const nyc = Array.from({ length: draws }, (_, i) => placeUsOnset(campaign, campaign.founding.nation, "tornado", "city", (i + 0.5) / draws))
      .filter((p) => /new-york/.test(String(p.city ?? ""))).length;
    console.log("[events:A] tornado city-scope placements in New York City", nyc / draws);
    expect(nyc / draws).toBeLessThan(0.02);
  });

  it("does not file a Stafford request from every state for one nation-scope heat wave (a request follows affected geography and state capacity)", () => {
    const { campaign } = foundedForBalance("ev-staff");
    const streams = createRngStreams(campaign.seed);
    const opened = openCondition(campaign, { nation: campaign.founding.nation, kind: "heat-wave", chance: 1 }, streams.stream("stafford-probe"));
    const cond = { ...opened, scope: "nation" as const, state: undefined, city: undefined, startedTurn: campaign.turn };
    const seeded: Campaign = { ...campaign, conditions: { ...campaign.conditions, [cond.id]: cond } };
    const requests = obligationPhase(seeded)
      .flatMap((packet) => packet.effects)
      .filter((effect) => "setStaffordRequest" in effect && effect.setStaffordRequest !== undefined).length;
    console.log("[events:A] Stafford requests for one nation-scope heat wave", requests, "of", STATE_IDS.length, "states");
    expect(requests).toBeLessThan(STATE_IDS.length);
  });

  it("cites a source for event calibration (DECISIONS §4.11; the impact catalog says provisional with no references)", () => {
    expect(IMPACT_CALIBRATION.sourceRefs.length).toBeGreaterThan(0);
  });
});

describe("B. event families the owner named, as home records", () => {
  // A family exists at home only if the engine writes a record of it there: a
  // condition, an incident or an impact event. The kind vocabulary is closed,
  // so a family with no kind cannot be generated however long the run.
  const families: readonly [string, RegExp][] = [
    ["cyberattack", /^cyber/],
    ["terror or mass-casualty attack", /terror|mass-casualty|shooting|attack/],
    ["labor strike", /strike|stoppage/],
    ["bank failure", /bank|financial-panic/],
    ["hostage or wrongful detention", /hostage|detention/],
  ];
  for (const [name, kind] of families) {
    it(`records at least one ${name} at home across ${IDLE_SEEDS.length} idle four-year runs`, () => {
      const kinds = idle().flatMap((r) => [...r.usRecordKinds]);
      const hits = kinds.filter((k) => kind.test(k)).length;
      console.log(`[events:B] ${name}: home records ${hits}; home record kinds seen`, [...new Set(kinds)].sort());
      expect(hits).toBeGreaterThan(0);
    }, 1_800_000);
  }
});

describe("C. the world acting without the player", () => {
  // Read off the ledger's narration and the filed wire. A zero means no
  // recorded event said so in three four-year runs; it does not trace every
  // path, which is Wave 3's work for the families that need one.
  const domestic: readonly [string, RegExp][] = [
    ["governor against legislature (veto, override, special session)", /governor.*(veto|legislature)|legislature.*(governor|override)|special session/i],
    ["Federal Reserve independence dispute", /(Federal Reserve|Fed chair|Fed governor).*(fire|remov|pressure|defies|dispute|independence|attack)/i],
    ["primary challenge to an incumbent", /primary (challenge|election)|primaried/i],
    ["congressional subpoena or investigation", /subpoena|indict|special counsel|inquiry/i],
    ["cabinet leak or infighting", /\bleaks?\b|feud|clash with the (secretary|chief of staff)/i],
  ];
  for (const [name, re] of domestic) {
    it(`records ${name} without the player acting`, () => {
      const hits = idle().flatMap((r) => r.narration.filter((line) => re.test(line)));
      console.log(`[events:C] ${name}`, hits.length, hits.slice(0, 2));
      expect(hits.length).toBeGreaterThan(0);
    }, 1_800_000);
  }

  it("lets someone other than a judge die in four years (members of Congress alone die in office a few times a year)", () => {
    const dead = idle().map((r) => r.deadNonJudges);
    console.log("[events:C] people dead other than judges, per idle run", dead);
    expect(Math.min(...dead)).toBeGreaterThan(0);
  }, 1_800_000);

  // Band from the succession lane's sourced counts: 48 members of Congress
  // died in office from 2000 to October 2026 (3.6 a Congress) and 16 from
  // January 2021 (5.5 a Congress). A four-year run spans two Congresses, so the
  // expectation is about 7 to 11; the band is widened for three seeds.
  it("kills 4 to 16 members of Congress in office in each four-year run (3.6 to 5.5 a Congress, observed)", () => {
    const deaths = idle().map((r) => r.congressDeaths);
    console.log("[events:C] members of Congress dead in office, per idle run", deaths);
    expect(Math.min(...deaths)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...deaths)).toBeLessThanOrEqual(16);
  }, 1_800_000);

  it("opens at least ten judicial vacancies in four years across the modeled bench (floor is a judgment; benchmark unverified)", () => {
    const vacancies = idle().map((r) => r.census.judicialVacancies);
    console.log("[events:C] judicial seats vacated per run", vacancies, "circuit seats", CIRCUIT_SEATS.length);
    expect(Math.min(...vacancies)).toBeGreaterThanOrEqual(10);
  }, 1_800_000);

  it("lets no international body lose more than two members in four years (OPEC lost three in eight, BRICS none)", () => {
    const worst = idle().reduce<Record<string, number>>((acc, r) => {
      const next = { ...acc };
      for (const [org, n] of Object.entries(r.census.exits)) next[org] = Math.max(next[org] ?? 0, n);
      return next;
    }, {});
    console.log("[events:C] most exits per body in any run", worst, "accessions per run", idle().map((r) => r.census.accessions));
    expect(Math.max(0, ...Object.values(worst))).toBeLessThanOrEqual(2);
  }, 1_800_000);

  it(`seats ${COUPS_PER_YEAR.min} to ${COUPS_PER_YEAR.max} successful coups a year worldwide, counted from dated coup records`, () => {
    const rate = perYear((r) => r.census.coups);
    console.log("[events:C] successful coups/yr (records)", rate, "per run", idle().map((r) => r.census.coups),
      "elections/yr", perYear((r) => r.census.elections));
    expect(rate).toBeGreaterThanOrEqual(COUPS_PER_YEAR.min);
    expect(rate).toBeLessThanOrEqual(COUPS_PER_YEAR.max);
  }, 1_800_000);

  it("reports fiscal-crisis and energy-shortage spells abroad (report only)", () => {
    console.log("[events:C] fiscal-crisis spells/yr", perYear((r) => r.worldCondsByKind["fiscal-crisis"] ?? 0),
      "energy-shortage/yr", perYear((r) => r.worldCondsByKind["energy-shortage"] ?? 0));
    expect(idle().length).toBe(IDLE_SEEDS.length);
  }, 1_800_000);
  it.todo("fiscal-crisis rate: a fiscal-crisis spell is not a sovereign default, so a default count is not its denominator; define the condition's real-world referent first");
});

describe("E. passive and hyperactive campaigns through the balance harness", () => {
  it("passive president's cabinet stays inside the existing term bands (term-balance.test.ts: 2 to 8 departures, 6 to 15 leaks)", () => {
    const out = playCampaign("ev-1", "passive", 208);
    console.log("[events:E] passive cabinetBreaks", out.cabinetBreaks, "scandals", out.scandals.broken, "turns", out.turnsPlayed, "ending", out.ending);
    const departures = out.cabinetBreaks.resignation + out.cabinetBreaks.challenge;
    expect(departures).toBeGreaterThanOrEqual(2);
    expect(departures).toBeLessThanOrEqual(8);
    expect(out.cabinetBreaks.leak).toBeGreaterThanOrEqual(6);
    expect(out.cabinetBreaks.leak).toBeLessThanOrEqual(15);
  }, 1_800_000);

  it.todo("reckless scandal rate: scandals should follow exposed misconduct, not an annual quota; assert scandal origins against the acts that expose misconduct once that link is specified");
});
