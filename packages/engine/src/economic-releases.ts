/**
 * Dated economic releases on the civil calendar, and the figure each carries.
 *
 * Each rule takes a date and says whether that day is a release. The figure a
 * release prints is the one the engine computed for that week. The weekly step
 * stores it as the release is issued (`recordReleases`), and a stored figure is
 * never recomputed: reading an old release returns what was printed then. No
 * release stops the clock.
 *
 * The standing rules, with their exceptions named:
 * - The jobs report comes on the first Friday of the month. When that Friday is
 *   New Year's Day it moves to the next Friday; when it is Independence Day it
 *   comes the Thursday before.
 * - The consumer price index comes inside the 10th to the 14th: the Wednesday
 *   in that window. Five days hold a Wednesday only some months; otherwise it
 *   comes on the window's Thursday, or failing that its Tuesday, so every month
 *   has exactly one.
 * - The advance estimate of output comes on the last Thursday of the month after
 *   a quarter closes, about four weeks after it.
 * - The Federal Reserve's decision is released on its meeting's decision day.
 */
import { addDays, compareDates, weekdayOf, type Weekday } from "./clock.js";
import { isFomcDecision } from "./monetary.js";
import { selectNation, type Campaign, type GameDate, type ReleaseKind } from "./state.js";
import type { ReleaseObservation } from "./state-world.js";

const WEDNESDAY: Weekday = 3;
const THURSDAY: Weekday = 4;
/** 0 is Sunday, so Friday is 5. */
const FRIDAY: Weekday = 5;

function firstFriday(year: number, month: number): GameDate {
  for (let day = 1; day <= 7; day += 1) {
    const date = { year, month, day };
    if (weekdayOf(date) === FRIDAY) return date;
  }
  return { year, month, day: 1 };
}

const sameDay = (a: GameDate, b: GameDate) => compareDates(a, b) === 0;

/** The day the month's jobs report comes out, holiday exceptions applied. */
export function jobsReleaseDay(year: number, month: number): GameDate {
  const friday = firstFriday(year, month);
  if (month === 1 && friday.day === 1) return addDays(friday, 7);
  if (month === 7 && friday.day === 4) return addDays(friday, -1);
  return friday;
}

export function isJobsRelease(date: GameDate): boolean {
  return sameDay(date, jobsReleaseDay(date.year, date.month));
}

const TUESDAY: Weekday = 2;
const CPI_WINDOW: readonly number[] = [10, 11, 12, 13, 14];

function cpiReleaseDay(year: number, month: number): number {
  const on = (weekday: Weekday) => CPI_WINDOW.find((day) => weekdayOf({ year, month, day }) === weekday);
  // Any five days in a row hold a Tuesday, a Wednesday or a Thursday.
  return on(WEDNESDAY) ?? on(THURSDAY) ?? on(TUESDAY)!;
}

export function isCpiRelease(date: GameDate): boolean {
  return date.day === cpiReleaseDay(date.year, date.month);
}

const GDP_MONTHS: readonly number[] = [1, 4, 7, 10];

function lastThursday(year: number, month: number): GameDate {
  const nextMonth = month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
  let day = addDays(nextMonth, -1);
  while (weekdayOf(day) !== THURSDAY) day = addDays(day, -1);
  return day;
}

export function isGdpRelease(date: GameDate): boolean {
  return GDP_MONTHS.includes(date.month) && sameDay(date, lastThursday(date.year, date.month));
}

/** The same planning day the rate is set. The release and the decision do not drift. */
export function isFomcRelease(date: GameDate): boolean {
  return isFomcDecision(date);
}

const RULES: Readonly<Record<ReleaseKind, (date: GameDate) => boolean>> = {
  jobs: isJobsRelease,
  cpi: isCpiRelease,
  gdp: isGdpRelease,
  fomc: isFomcRelease,
};

export const RELEASE_KINDS: readonly ReleaseKind[] = ["jobs", "cpi", "gdp", "fomc"];

/** One release on the calendar: what came out, the day it did, and the figure it printed, as a fraction. */
export type EconomicRelease = { readonly kind: ReleaseKind; readonly date: GameDate; readonly figure?: number };

/** The kinds that fall on a day. */
export function releaseKindsOn(date: GameDate): readonly ReleaseKind[] {
  return RELEASE_KINDS.filter((kind) => RULES[kind](date));
}

/** The figure a release prints this week: the rate the engine computed, as a fraction. */
export function releaseFigure(campaign: Campaign, kind: ReleaseKind): number | undefined {
  const economy = selectNation(campaign, campaign.founding.nation)?.stats.economy;
  if (!economy) return undefined;
  if (kind === "jobs") return economy.unemployment;
  if (kind === "cpi") return economy.inflation;
  if (kind === "gdp") return economy.growth;
  return campaign.markets?.fed?.rate ?? campaign.macro?.[campaign.founding.nation]?.policyRate;
}

const releaseId = (kind: ReleaseKind, date: GameDate, vintage: number) =>
  `release:${kind}:${date.year}-${date.month}-${date.day}:v${vintage}`;

/** The latest vintage issued for a release, if one was stored. */
function issuedFigure(campaign: Campaign, kind: ReleaseKind, date: GameDate): ReleaseObservation | undefined {
  const found = (campaign.releases?.issued ?? []).filter((o) => o.kind === kind && sameDay(o.date, date));
  return found.reduce<ReleaseObservation | undefined>((best, o) => (best && best.vintage >= o.vintage ? best : o), undefined);
}

/**
 * The figure a release printed: the stored one when it was issued, the live one
 * only inside the week now closing (it will be stored at the next step), and
 * nothing for an older release this save never recorded. An absent figure is
 * not a zero and is not backfilled from today's economy.
 */
function withFigure(campaign: Campaign, kind: ReleaseKind, date: GameDate): EconomicRelease {
  const stored = issuedFigure(campaign, kind, date);
  const figure =
    stored?.value ??
    (compareDates(date, addDays(campaign.calendar, -6)) >= 0 && compareDates(date, campaign.calendar) <= 0
      ? releaseFigure(campaign, kind)
      : undefined);
  return figure === undefined ? { kind, date } : { kind, date, figure };
}

/** The releases that fall on a day, each with the figure it printed. */
export function releasesOn(campaign: Campaign, date: GameDate): readonly EconomicRelease[] {
  return releaseKindsOn(date).map((kind) => withFigure(campaign, kind, date));
}

/**
 * Store the figure of every release dated in the seven days ending today that
 * has no stored vintage. Idempotent, so calling it twice in a week changes
 * nothing; the first call in a week fixes the printed value.
 */
export function recordReleases(campaign: Campaign): Campaign {
  const issued = campaign.releases?.issued ?? [];
  const added: ReleaseObservation[] = [];
  for (const { kind, date } of releasesBetween(addDays(campaign.calendar, -6), campaign.calendar)) {
    if (issuedFigure(campaign, kind, date)) continue;
    const value = releaseFigure(campaign, kind);
    if (value === undefined) continue;
    added.push({ id: releaseId(kind, date, 1), kind, date, value, vintage: 1, evidence: "simulated" });
  }
  if (added.length === 0) return campaign;
  const last = { ...(campaign.releases?.last ?? {}) };
  for (const o of added) last[o.kind] = o.date;
  return { ...campaign, releases: { last, issued: [...issued, ...added] } };
}

/** Every release dated from `from` to `to`, both days included, oldest first. */
export function releasesBetween(from: GameDate, to: GameDate): readonly { readonly kind: ReleaseKind; readonly date: GameDate }[] {
  const found: { kind: ReleaseKind; date: GameDate }[] = [];
  for (let day = from; compareDates(day, to) <= 0; day = addDays(day, 1)) {
    for (const kind of releaseKindsOn(day)) found.push({ kind, date: day });
  }
  return found;
}

/** The releases of the seven days ending today, for the week's feed. */
export function releasesThisWeek(campaign: Campaign): readonly EconomicRelease[] {
  return releasesBetween(addDays(campaign.calendar, -6), campaign.calendar).map(({ kind, date }) => withFigure(campaign, kind, date));
}

/** The next date each kind comes out, on or after `from`. */
export function nextReleases(from: GameDate): readonly { readonly kind: ReleaseKind; readonly date: GameDate }[] {
  return RELEASE_KINDS.flatMap((kind) => {
    for (let offset = 0; offset < 120; offset += 1) {
      const day = addDays(from, offset);
      if (RULES[kind](day)) return [{ kind, date: day }];
    }
    return [];
  });
}
