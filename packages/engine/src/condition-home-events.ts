import type { NationId } from "@admin/world";
import { HOME_EVENT_CONDITIONS, type HomeEventCondition } from "./condition-kinds.js";
import { NO_CYCLE } from "./business-cycle.js";
import { booksFor } from "./national-books.js";
import { nationName } from "./naming.js";
import { selectRelationship } from "./state-selectors.js";
import { selectActiveConditions, type Campaign, type ConditionScope, type NationRuntime } from "./state.js";

// Whether one of the home events opens this week, and what it is called.
//
// Each family has a sourced base rate and an eligible cause read off the
// campaign, and each rate counts only the cases that reach a President. The
// ordinary run of each family is the population the significant case is drawn
// from, which is what keeps more incidence from meaning more stops at the Desk:
//
// - Major work stoppages (1,000 or more workers): BLS, 15 a year on average over
//   2005-2017 (Table 1, Work stoppages involving 1,000 or more workers) and 31
//   in 2024 (series WSU100), the rise arriving with the 2021-2023 price surge.
// - Bank failures: FDIC BankFind, 559 failures from 2005 to 2024, and 12 banks of
//   $10 billion or more in assets (excluding open-bank assistance), every one
//   inside two stress windows: September 2008 to April 2010, and March to May
//   2023.
// - Mass killings: the Mother Jones public mass shootings series, 116 from 2005
//   to 2024 (5.8 a year), 22 of them killing ten or more (1.1 a year).
// - Americans held hostage or wrongfully detained: the Foley Foundation, 422
//   U.S. nationals from 2001 to July 2023 (about 19 a year) and 14 new cases in
//   2025, held in 19 countries.
//
// Which share of each family reaches a President is a design judgment, stated
// beside each constant. Every chance is the weekly hazard of an annual rate,
// `1 - exp(-rate × 7 / 365)`.

const weekly = (perYear: number): number => 1 - Math.exp((-Math.max(0, perYear) * 7) / 365);

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function ramp(value: number, lo: number, hi: number): number {
  return hi <= lo ? (value >= hi ? 1 : 0) : clamp01((value - lo) / (hi - lo));
}

/**
 * The share of foreign intrusions on the United States that become a
 * President's file: a pipeline, a hospital chain, a federal network. A design
 * value. The operator phase records about two notable intrusions into American
 * systems a year once crews have rooted (five seeds, four years each), so one in
 * two gives the President about one a year; the rest stay records of their own.
 */
export const CYBER_ESCALATION = 0.5;

/**
 * Strikes that reach a President in a calm labor market, and what a full
 * real-wage squeeze adds. BLS's count of major stoppages doubled when prices
 * outran wages (15 a year to 31), so a full squeeze more than triples the
 * national ones, which are a sliver of the major count either way.
 */
export const STOPPAGE_CALM_PER_YEAR = 0.3;
export const STOPPAGE_SQUEEZE_PER_YEAR = 0.7;

/**
 * A large bank failing: almost never in calm water, and about once a year
 * while rates are climbing fast or the cycle is in a slump. Every $10 billion
 * failure in the FDIC record from 2005 to 2024 fell inside one of two stress
 * windows. One episode at a time: a second failure while the first runs is that
 * episode deepening, not a new file.
 */
export const BANK_CALM_PER_YEAR = 0.02;
export const BANK_STRESS_PER_YEAR = 1;

/** Mass killings of ten or more people, Mother Jones, 2005 to 2024. No sourced state dependency, so the rate is flat. */
export const MASS_KILLINGS_PER_YEAR = 1.1;

/**
 * Americans held by a hostile government that reach a President, per year at
 * one unit of captor weight. Foley's 14 to 27 new cases a year include many held
 * by armed groups and many the public never hears of; about one in ten is a
 * President's file. The founding world carries about 2.3 units of captor weight
 * (China, Cuba, Iran, Kazakhstan, North Korea and Russia, and Belarus on some
 * seeds), which gives about two a year.
 */
export const DETENTION_PER_CAPTOR_WEIGHT = 0.8;

/** How hostile a government has to be toward Washington before it holds an American as leverage. */
const CAPTOR_TRUST_CEILING = -0.2;

type Candidate = { readonly nation: NationId; readonly kind: HomeEventCondition; readonly chance: number };

function cyberChance(campaign: Campaign, home: NationId): number {
  const suffix = `:${campaign.turn}`;
  const intrusions = Object.values(campaign.impactEvents ?? {}).filter(
    (event) => event.spec.nation === home && event.spec.source === "operator" && event.spec.mechanism.kind === "cyber" && event.spec.id.endsWith(suffix),
  ).length;
  return 1 - Math.pow(1 - CYBER_ESCALATION, intrusions);
}

/** How far prices are outrunning the country's own normal, 0..1 at four points over it. */
function wageSqueeze(runtime: NationRuntime): number {
  return ramp(runtime.stats.economy.inflation - runtime.base.stats.economy.inflation, 0, 0.04);
}

function bankStress(campaign: Campaign, runtime: NationRuntime): number {
  const books = booksFor(campaign, runtime);
  const rise = ramp(books.rates.market - books.anchor.market, 0.01, 0.03);
  const phase = (campaign.cycles[runtime.base.id] ?? NO_CYCLE).phase;
  const slump = phase === "contraction" || phase === "trough" ? 0.6 : 0;
  return Math.max(rise, slump);
}

/** Every government hostile enough to hold an American, with how much it weighs, in id order. */
export function captorWeights(campaign: Campaign): readonly { readonly nation: NationId; readonly weight: number }[] {
  const home = campaign.founding.nation;
  return (Object.keys(campaign.nations) as NationId[])
    .filter((id) => id !== home)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .flatMap((id) => {
      const trust = selectRelationship(campaign, id, home)?.trust ?? 0;
      const press = campaign.nations[id]!.stats.politics.pressFreedom;
      if (trust > CAPTOR_TRUST_CEILING) return [];
      return [{ nation: id, weight: Math.round(-trust * (1 - press) * 1000) / 1000 }];
    });
}

/** The government holding the American, drawn by captor weight off one roll. */
export function detentionCaptor(campaign: Campaign, roll: number): NationId | undefined {
  const captors = captorWeights(campaign);
  const total = captors.reduce((sum, captor) => sum + captor.weight, 0);
  if (total <= 0) return undefined;
  let cursor = clamp01(roll) * total;
  for (const captor of captors) {
    cursor -= captor.weight;
    if (cursor <= 0) return captor.nation;
  }
  return captors[captors.length - 1]?.nation;
}

function eventChance(campaign: Campaign, kind: HomeEventCondition, runtime: NationRuntime): number {
  switch (kind) {
    case "cyberattack":
      return cyberChance(campaign, runtime.base.id);
    case "work-stoppage":
      return weekly(STOPPAGE_CALM_PER_YEAR + STOPPAGE_SQUEEZE_PER_YEAR * wageSqueeze(runtime));
    case "bank-failure":
      return weekly(BANK_CALM_PER_YEAR + BANK_STRESS_PER_YEAR * bankStress(campaign, runtime));
    case "mass-casualty-attack":
      return weekly(MASS_KILLINGS_PER_YEAR);
    case "wrongful-detention":
      return weekly(DETENTION_PER_CAPTOR_WEIGHT * captorWeights(campaign).reduce((sum, captor) => sum + captor.weight, 0));
  }
}

/** The kinds that run as one file at a time: a second while the first runs is the same episode. */
const ONE_AT_A_TIME: ReadonlySet<HomeEventCondition> = new Set(["work-stoppage", "bank-failure"]);

/** The home events eligible this week, in kind order, with their weekly chances. */
export function homeEventCandidates(campaign: Campaign): readonly Candidate[] {
  const home = campaign.founding.nation;
  const runtime = campaign.nations[home];
  if (!runtime) return [];
  const active = new Set(selectActiveConditions(campaign).filter((c) => c.nation === home).map((c) => c.kind as string));
  return HOME_EVENT_CONDITIONS.flatMap((kind) => {
    if (ONE_AT_A_TIME.has(kind) && active.has(kind)) return [];
    const chance = eventChance(campaign, kind, runtime);
    return chance > 0 ? [{ nation: home, kind, chance }] : [];
  });
}

/** Where each home event happens: a mass killing in one city, a failed bank in its state, the rest across the country. */
export const HOME_EVENT_SCOPE: Readonly<Record<HomeEventCondition, ConditionScope>> = {
  cyberattack: "nation",
  "work-stoppage": "nation",
  "bank-failure": "region",
  "mass-casualty-attack": "city",
  "wrongful-detention": "nation",
};

/** The onset line a home event files, in plain words, with the place or the captor named. */
export function homeEventDescription(campaign: Campaign, kind: HomeEventCondition, place: string, captor?: NationId): string {
  switch (kind) {
    case "cyberattack":
      return "Hackers working for a foreign government have broken into systems the country runs on.";
    case "work-stoppage":
      return "A national strike has stopped work across an industry the country depends on.";
    case "bank-failure":
      return `Regulators have closed a large bank ${place}, and depositors are pulling money from others like it.`;
    case "mass-casualty-attack":
      return `A gunman has killed at least ten people ${place}.`;
    case "wrongful-detention": {
      const name = captor ? campaign.nations[captor]?.base.identity : undefined;
      return name ? `The government of ${nationName(name)} is holding an American citizen on charges Washington calls false.` : "A foreign government is holding an American citizen on charges Washington calls false.";
    }
  }
}
