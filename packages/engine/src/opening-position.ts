import type { Nation, NationBands, Person, RoleId } from "@admin/world";
import { openingApproval, type OpeningElectorate } from "./opinion.js";
import { openingBudgetAuthority } from "./funding.js";
import type { MetricSet } from "./state.js";

// What a government is worth on the day it takes office.
//
// Until now a campaign opened on its nation's own readings and nothing else:
// the same four numbers whoever the player was and whoever they had seated. A
// founding that spends five screens choosing a cabinet and then starts every
// campaign from an identical position is not asking the player to choose, it is
// asking them to browse.
//
// So the opening position is the nation *as governed*. The country supplies the
// baseline — its treasury, its regime's hold, its forces, its reach — and the
// people about to run it supply the difference. A ministry is only ever as good
// as the hand on it, which is the same premise stewardship.ts already runs the
// rest of the campaign on; this is that premise applied to turn one.
//
// Every movement is returned with the reason for it. A player who opens two
// points of stability down should be able to read why, and the answer should be
// a person they chose rather than a number the engine kept to itself.

export type OpeningMetric = Exclude<keyof MetricSet, "approval">;

export type OpeningContribution = {
  readonly metric: OpeningMetric;
  readonly delta: number;
  /** The seat responsible, or the lead role where it is the player themselves. */
  readonly role: RoleId;
  readonly person: string;
  readonly reason: string;
};

/**
 * Why one performance reading opens where it does, stated in the same terms the
 * normalization is done in: what the office is expected to command, what the
 * country actually holds, and the daylight between the two.
 */
export type OpeningExpectation = {
  readonly metric: Exclude<OpeningMetric, "treasury">;
  /** The nation's own absolute capability, on its own 0..1 scale. */
  readonly held: number;
  /** What a government at this nation's tier is expected to command. */
  readonly expected: number;
  /** The reading the player actually opens on. */
  readonly opening: number;
  readonly reason: string;
};

export type OpeningPosition = {
  /** The nation ungoverned: what the country brings before anyone is seated. */
  readonly baseline: MetricSet;
  /**
   * How each performance reading was normalized against peer expectation. The
   * baseline is not the nation's raw stats, so this is the account of the
   * daylight between the two — without it a player could read why their cabinet
   * moved them and not why they started where they did.
   */
  readonly expectations: readonly OpeningExpectation[];
  readonly contributions: readonly OpeningContribution[];
  /** Baseline plus every contribution, clamped, with approval settled last. */
  readonly metrics: MetricSet;
};

import {
  GENERIC_PORTFOLIO,
  GENERIC_REACH,
  LEADER_PORTFOLIO,
  PORTFOLIOS,
  PORTFOLIO_REACH,
  TRAIT_PUSHES,
  type PortfolioPush,
} from "./opening-portfolios.js";

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// A head of government is not one more minister. They chair the room, they are
// the face of the administration abroad, and their own competence is felt
// across every file rather than one — so their readings and their disposition
// both weigh heavier than a colleague's.
const LEADER_WEIGHT = 1;
const MINISTER_WEIGHT = 0.5;

// --- What each chair is actually responsible for. -------------------------

/** What the cabinet's mean loyalty is worth to the government's opening footing. */
const CABINET_LOYALTY_WEIGHT = 0.1;

const MATERIAL_DELTA = 0.005;

function isMaterial(metric: OpeningMetric, delta: number, treasury: number): boolean {
  // Treasury is money rather than points, so its floor scales with the country:
  // a million is a rounding error in a large account and a real sum in a small one.
  const floor = metric === "treasury" ? Math.max(1, treasury * MATERIAL_DELTA) : MATERIAL_DELTA;
  return Math.abs(delta) >= floor;
}

function pushContribution(
  push: PortfolioPush,
  person: Person,
  role: RoleId,
  treasury: number,
  scale = 1,
): OpeningContribution | undefined {
  const offset = (person[push.attribute] - 0.5) * push.weight * scale;
  const delta = round3(push.metric === "treasury" ? offset * treasury : offset);
  if (!isMaterial(push.metric, delta, treasury)) return undefined;
  return { metric: push.metric, delta, role, person: person.name, reason: push.reason(person, delta > 0) };
}

function traitContributions(
  person: Person,
  role: RoleId,
  weight: number,
  treasury: number,
  reach: readonly OpeningMetric[] | undefined,
  seatCount: number,
): OpeningContribution[] {
  return person.traits.flatMap((trait) =>
    TRAIT_PUSHES[trait].flatMap((push): OpeningContribution[] => {
      if (reach && !reach.includes(push.metric)) return [];
      // A disposition reaches the shared reading on the same terms a portfolio
      // does: sixteen pragmatic ministers are not sixteen times as steadying.
      const scaled = push.delta * weight * scaleFor(push.metric, seatCount);
      const delta = round3(push.metric === "treasury" ? scaled * treasury : scaled);
      if (!isMaterial(push.metric, delta, treasury)) return [];
      return [
        {
          metric: push.metric,
          delta,
          role,
          person: person.name,
          reason: `${person.name} is ${trait}: ${push.note}.`,
        },
      ];
    }),
  );
}

/**
 * The cabinet size the per-seat weights above were tuned against.
 *
 * Every seat contributes, and the contributions are summed — which is right for
 * a portfolio (a treasury minister moves the treasury, and a second one would
 * not) and wrong for the administrative push every chair gets just for being a
 * ministry that runs itself. Summed unnormalized, that push makes the *size* of
 * the cabinet set the country's opening footing: seating the full fifteen
 * departments rather than five put stability at 1.000 on inauguration day, a
 * reading with no room above it that nothing the player did could ever raise.
 *
 * That is the defect this file already records having fixed once from the other
 * direction, for standing. A bigger government is not a steadier country, so
 * the generic administrative contribution is scaled to hold its total constant
 * as chairs are added: what varies is how good the ministers are, not how many
 * of them there are.
 */
const REFERENCE_CABINET_SEATS = 6;

function administrativeScale(seatCount: number): number {
  return seatCount <= REFERENCE_CABINET_SEATS ? 1 : REFERENCE_CABINET_SEATS / seatCount;
}

/**
 * The one reading every chair contributes to, and the only one that is scaled.
 *
 * The first version of this scaled by whether a portfolio was *declared*, on
 * the reasoning that a declared portfolio is a specific claim about a specific
 * ministry — there is one Treasury, and weakening it because the cabinet grew
 * would be wrong. That reasoning holds for a metric one building owns. It does
 * not hold for `stability`, which is the government's general footing and which
 * almost every department plausibly moves: declaring ten more portfolios that
 * each push it put the reading straight back on its ceiling, which is the same
 * defect arriving through the front door instead of the back.
 *
 * So the axis is the metric, not the declaration. A metric a ministry owns
 * sums, because two ministries moving the treasury really is twice the
 * movement. The shared one is normalized, because a bigger cabinet is not a
 * steadier country.
 */
const SHARED_METRIC: OpeningMetric = "stability";

function scaleFor(metric: OpeningMetric, seatCount: number): number {
  return metric === SHARED_METRIC ? administrativeScale(seatCount) : 1;
}

function seatContributions(
  person: Person,
  role: RoleId,
  isLeader: boolean,
  treasury: number,
  seatCount: number,
): OpeningContribution[] {
  const portfolio = isLeader ? LEADER_PORTFOLIO : (PORTFOLIOS[role as string] ?? GENERIC_PORTFOLIO);
  // The head of government speaks for the whole country rather than for a
  // department, so their contribution is not a share of a cabinet and is never
  // scaled. Everyone else is scaled per metric; see `scaleFor`.
  const seats = isLeader ? REFERENCE_CABINET_SEATS : seatCount;
  const fromReadings = portfolio
    .map((push) => pushContribution(push, person, role, treasury, scaleFor(push.metric, seats)))
    .filter((entry): entry is OpeningContribution => entry !== undefined);
  const weight = isLeader ? LEADER_WEIGHT : MINISTER_WEIGHT;
  const reach = isLeader ? undefined : (PORTFOLIO_REACH[role as string] ?? GENERIC_REACH);
  return [...fromReadings, ...traitContributions(person, role, weight, treasury, reach, seats)];
}

function cabinetLoyaltyContribution(
  ministers: readonly Person[],
  leadRole: RoleId,
): OpeningContribution | undefined {
  if (ministers.length === 0) return undefined;
  const mean = ministers.reduce((sum, person) => sum + person.loyalty, 0) / ministers.length;
  const delta = round3((mean - 0.5) * CABINET_LOYALTY_WEIGHT);
  if (!isMaterial("stability", delta, 0)) return undefined;
  return {
    metric: "stability",
    delta,
    role: leadRole,
    person: "The cabinet",
    reason:
      delta > 0
        ? "The cabinet is loyal enough that the government's arguments will stay inside the room."
        : "This cabinet's loyalty is thin, and everyone outside the room can already tell.",
  };
}

// The budget authority an administration opens with is not a share of the
// economy and is not cash. It is a carry share of the discretionary
// appropriation Congress has already enacted — see `openingBudgetAuthority` in
// funding.ts, which owns both the share and the reason for it. It is also the
// most the founding can open on: the seats' treasury pushes may take authority
// away (a corrupt minister) but never add to it (`appropriationBound`).
//
// It used to be nine percent of GDP, which for the United States founded a
// president on 2,474,896: an unappropriated wallet 1.73 times the entire
// discretionary budget of the country. There is no quantity of money a
// President holds without a vote, and a founding that opened on one made every
// later price in the game unreadable against it.

// --- Performance against expectation, not capability copied across. -------
//
// The player's readings are how well the office is being *held*, which is not
// the same fact as what the country can do. Copying the nation's absolute stats
// onto the panel made those two one number, and for a superpower that number
// was pinned: the United States opens holding diplomatic reach of 0.95, so the
// standing reading opened at 1.00 and could only ever fall. Every diplomatic
// success it might have reported was invisible, and a reading with no room
// above it tells a player either that the game is broken or that there is
// nothing left to play for.
//
// So the opening is normalized against what a government at this nation's tier
// is expected to command. Holding 0.95 reach as a great power is normal for the
// office and opens mid-scale; holding it as a middle power would be
// extraordinary and opens high. The daylight is what the reading is about, and
// it is small in both directions on purpose — a president's first week is not
// where a term is won.

/**
 * What each tier is expected to command, tier 1 through 5.
 *
 * These are peer expectations, not averages of the roster: what a country of
 * this weight is *held to*. They rise with tier because more is asked of a
 * great power's diplomacy than of a microstate's, which is exactly why holding
 * the same absolute figure means something different in each.
 */
const STANDING_EXPECTED: readonly number[] = [0.15, 0.3, 0.46, 0.63, 0.85];
const READINESS_EXPECTED: readonly number[] = [0.35, 0.45, 0.55, 0.66, 0.78];
const STABILITY_EXPECTED: readonly number[] = [0.34, 0.45, 0.56, 0.66, 0.73];

/** Where a government that meets expectation exactly opens. */
const PAR = 0.5;

/**
 * What a point of daylight is worth on the panel.
 *
 * Above one, because meeting expectation is the common case and a reading that
 * barely moved off par for a genuinely exceptional inheritance would be a
 * reading nobody could tell apart from the default.
 */
const DAYLIGHT_WEIGHT = 1.5;

/**
 * How far from par an inheritance alone can carry the reading.
 *
 * Approached and never reached, which is why the curve below saturates rather
 * than clamping. A clamp at the same figure would put an extraordinary
 * inheritance flat against the bound, which is the exact defect this whole
 * normalization exists to remove — it would simply move the pinning from the
 * top of the roster to the top of the tier.
 */
const OPENING_SPREAD = 0.35;

const tierExpectation = (table: readonly number[], tier: number): number =>
  table[Math.min(table.length, Math.max(1, tier)) - 1]!;

type Normalized = { readonly opening: number; readonly expected: number };

function normalize(held: number, table: readonly number[], tier: number): Normalized {
  const expected = tierExpectation(table, tier);
  return {
    expected,
    opening: round3(PAR + OPENING_SPREAD * Math.tanh((DAYLIGHT_WEIGHT * (held - expected)) / OPENING_SPREAD)),
  };
}

function expectationReason(
  what: string,
  peers: string,
  held: number,
  expected: number,
): string {
  const gap = held - expected;
  if (Math.abs(gap) < 0.02) return `${what} is exactly what ${peers} are held to, so the office opens at par.`;
  return gap > 0
    ? `${what} runs ahead of what ${peers} are held to, and the office opens with that credit.`
    : `${what} falls short of what ${peers} are held to, and the office opens carrying it.`;
}

/**
 * How each performance reading is derived from the nation, with its reason.
 *
 * Each metric is normalized against the tier that actually sets the expectation
 * for it: what is asked of a country's diplomacy follows its weight in the
 * world, what is asked of its forces follows its military tier, and what is
 * asked of its domestic order follows its wealth — a rich country whose writ is
 * contested is a worse government than a poor one with the same reading.
 */
export function openingExpectations(nation: Nation): readonly OpeningExpectation[] {
  const bands: NationBands = nation.bands;
  const { politics, military, softPower } = nation.stats;
  return [
    {
      metric: "standing",
      held: softPower.diplomaticReach,
      ...normalize(softPower.diplomaticReach, STANDING_EXPECTED, bands.powerTier),
      reason: expectationReason(
        "The reach this government inherits abroad",
        "powers of this weight",
        softPower.diplomaticReach,
        tierExpectation(STANDING_EXPECTED, bands.powerTier),
      ),
    },
    {
      metric: "militaryReadiness",
      held: military.readiness,
      ...normalize(military.readiness, READINESS_EXPECTED, bands.militaryTier),
      reason: expectationReason(
        "The state the services are handed over in",
        "establishments of this size",
        military.readiness,
        tierExpectation(READINESS_EXPECTED, bands.militaryTier),
      ),
    },
    {
      metric: "stability",
      held: politics.regimeStability,
      ...normalize(politics.regimeStability, STABILITY_EXPECTED, bands.wealthTier),
      reason: expectationReason(
        "The hold the government has at home",
        "countries this prosperous",
        politics.regimeStability,
        tierExpectation(STABILITY_EXPECTED, bands.wealthTier),
      ),
    },
  ];
}

export function foundingBaseline(nation: Nation, electorate?: OpeningElectorate): MetricSet {
  const expectations = openingExpectations(nation);
  const readingFor = (metric: OpeningExpectation["metric"]) =>
    expectations.find((entry) => entry.metric === metric)!.opening;
  return {
    // The public the nation already carries, at resting weights. A founding has
    // no board to read salience from, and an opening of zero would read as a
    // country that despises a president who has not been sworn in.
    approval: openingApproval(nation, electorate),
    // Money is not a performance reading. What budget authority can do is
    // decided by how much of it there is against what governing costs, and that
    // ratio is already the same in every capital, so there is nothing here to
    // normalize.
    treasury: openingBudgetAuthority(nation.stats.economy.gdp),
    stability: readingFor("stability"),
    militaryReadiness: readingFor("militaryReadiness"),
    standing: readingFor("standing"),
  };
}

/**
 * The line that says why the seats' treasury pushes stopped at the
 * appropriation, when they reached past it.
 *
 * Budget authority is the part of an enacted appropriation the President is
 * holding, and on the first morning that is the carry share and no more
 * (`authorityCeiling` holds it there every week after). A Treasury Secretary who
 * finds money in the books finds it for the Treasury's general fund, not for the
 * President to obligate, so a slate that pushes past the share opens exactly on
 * it, and the push is worth only what it offsets of the losses the rest of the
 * cabinet brings. Stated as its own line so the contributions still add up to
 * the reading, as `boundedCause` does for a public judgment.
 */
function appropriationBound(summed: number, carryShare: number, leadRole: RoleId): OpeningContribution | undefined {
  const delta = round3(carryShare - summed);
  if (delta >= 0 || !isMaterial("treasury", delta, carryShare)) return undefined;
  return {
    metric: "treasury",
    delta,
    role: leadRole,
    person: "The appropriation",
    reason:
      "Budget authority opens at the quarter of the year's appropriation Congress has enacted, and nothing a secretary finds in the books adds to it.",
  };
}

/**
 * The metrics a campaign actually opens on, and the reason for every point of
 * daylight between them and the nation's own.
 *
 * `cabinet` is the seated slate keyed by chair, `leadRole` the one the player
 * themselves occupies. Pure and total: the same nation and the same people
 * always produce the same opening, which is what lets the founding screen show
 * it live while the player is still choosing.
 */
export function openingPosition(
  nation: Nation,
  cabinet: Readonly<Partial<Record<RoleId, Person>>>,
  leadRole: RoleId,
  leaderExtras: (baselineTreasury: number) => readonly OpeningContribution[] = () => [],
  electorate?: OpeningElectorate,
): OpeningPosition {
  const baseline = foundingBaseline(nation, electorate);
  const seats = Object.entries(cabinet) as [RoleId, Person | undefined][];

  const seatCount = seats.filter(([role]) => role !== leadRole).length;
  const contributions = seats.flatMap(([role, person]) =>
    person ? seatContributions(person, role, role === leadRole, baseline.treasury, seatCount) : [],
  );

  const ministers = seats.filter(([role]) => role !== leadRole).flatMap(([, person]) => (person ? [person] : []));
  const loyalty = cabinetLoyaltyContribution(ministers, leadRole);
  // What the President's own career buys on the first morning, where it buys a
  // reading (founding-leader-hooks.ts): read against the same baseline, listed
  // with the same kind of reason as every minister's line.
  const all = [...contributions, ...(loyalty ? [loyalty] : []), ...leaderExtras(baseline.treasury)];

  const summed = all.reduce<Record<OpeningMetric, number>>(
    (totals, entry) => ({ ...totals, [entry.metric]: totals[entry.metric] + entry.delta }),
    { treasury: baseline.treasury, stability: baseline.stability, militaryReadiness: baseline.militaryReadiness, standing: baseline.standing },
  );
  const bound = appropriationBound(summed.treasury, baseline.treasury, leadRole);

  return {
    baseline,
    expectations: openingExpectations(nation),
    contributions: bound ? [...all, bound] : all,
    metrics: {
      // Carried from the baseline rather than rederived: a cabinet moves
      // stability, readiness, standing and money on the day it is seated, and
      // none of those has reached the public yet. What the country thinks of a
      // president on their first morning is what it thought of the last one.
      approval: baseline.approval,
      treasury: round3(Math.min(baseline.treasury, Math.max(0, summed.treasury))),
      stability: round3(clamp01(summed.stability)),
      militaryReadiness: round3(clamp01(summed.militaryReadiness)),
      standing: round3(clamp01(summed.standing)),
    },
  };
}
