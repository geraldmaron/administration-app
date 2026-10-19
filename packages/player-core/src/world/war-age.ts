import { selectDateOfTurn, type Campaign, type Conflict, type GameDate } from "@admin/engine";
import { CARRIED_CONFLICTS } from "@admin/world";
import { formatDate } from "../format/figures";

// A war the board carried in at the oath is stamped as starting on the oath's
// turn, because that is when this administration's clock began on it. Its
// file must not read that stamp as the war's age: a war under way since 2022
// is not "running 9 weeks". Where the carried-conflicts table records when the
// fighting began, that date is the age; where it does not, the file says only
// that it predates the oath.

type Since = { readonly date: GameDate; readonly precision: "month" | "day" };

function parseSince(since: string): Since | undefined {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(since);
  if (!match) return undefined;
  return {
    date: { year: Number(match[1]), month: Number(match[2]), day: Number(match[3] ?? 1) },
    precision: match[3] ? "day" : "month",
  };
}

/** When a carried war's fighting began, from the table the board read it from. Undefined for a war this term started or a pair the table does not date. */
function carriedWarSince(conflict: Conflict): Since | undefined {
  if (!conflict.inherited) return undefined;
  const row = CARRIED_CONFLICTS.find(
    (entry) => entry.kind === "interstate" && entry.parties[0] === conflict.aggressor && entry.parties[1] === conflict.defender,
  );
  return row ? parseSince(row.since) : undefined;
}

function sinceWords(since: Since): string {
  // formatDate is the one place month names live; a month-precision date drops its day.
  return since.precision === "day" ? formatDate(since.date) : formatDate(since.date).replace(/ \d+,/, "");
}

function weeksWords(weeks: number): string {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

function isBefore(a: GameDate, b: GameDate): boolean {
  return a.year * 10000 + a.month * 100 + a.day < b.year * 10000 + b.month * 100 + b.day;
}

/**
 * How long a war has run, in the one sentence its file's standfirst carries
 * after the cause. A carried war with no date on record says nothing of its
 * age, because its cause already says it predates the oath.
 */
export function warAgeLine(campaign: Campaign, conflict: Conflict): string {
  const over = conflict.status !== "active";
  const weeks = Math.max(1, (conflict.endedTurn ?? campaign.turn) - conflict.startedTurn);
  if (!conflict.inherited) return over ? `It ended after ${weeksWords(weeks)}.` : `Going on for ${weeksWords(weeks)}.`;
  const since = carriedWarSince(conflict);
  const oath = selectDateOfTurn(campaign, 1);
  const began = since
    ? `Under way since ${sinceWords(since)}.`
    : isBefore(conflict.inherited.asOf, oath)
      ? `Under way since at least ${formatDate(conflict.inherited.asOf)}.`
      : "";
  const ended = over ? `It ended ${weeksWords(weeks)} into this term.` : "";
  return [began, ended].filter((part) => part.length > 0).join(" ");
}

/**
 * The date a war's beat is filed under. A carried war's opening beats sit on
 * the turn before the first week, which the calendar would date a week before
 * the oath; they are what the administration found on taking office, so they
 * are dated to the oath.
 */
export function warBeatDate(campaign: Campaign, turn: number): GameDate {
  return selectDateOfTurn(campaign, Math.max(1, turn));
}
