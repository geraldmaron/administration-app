// The time gate: commit-time copy may not narrate weeks or months that have not
// passed yet.
//
// Everything in `commitTimePassages` is on screen the instant the player
// commits, and the next Continue is at most a week away. A line that says the
// conviction came inside eight weeks is contradicted by the first thing the
// player does after reading it. What such a line can say instead is what is
// true tonight, a forecast a speaker is entitled to ("it could take months"),
// or a precedent ("the last time, it took years"). Anything that really does
// happen months on belongs in a later scenario gated on `agedAtLeast`, where
// the months have actually gone by.
import {
  COMMIT_WINDOW_DAYS,
  DAYS_PER_UNIT,
  FORECAST_MARKERS,
  MONTH_NAME,
  ORDINAL_VALUES,
  PRECEDENT_MARKERS,
  SAME_NIGHT_DAYS,
  TIME_SHAPES,
  UP_TO_NOW_MARKERS,
  type TimeShape,
} from "./audit-lexicon-time.js";
import type { Passage } from "./passage-audit.js";
import type { ScenarioDef } from "./scenario.js";
import { passages } from "./scenario-audit-contract.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
import { spelledValue } from "./scenario-audit-impact.js";

export type TimeFindingKind =
  // An anchored interval past the commit window, narrated as already over.
  | "commit-time-flash-forward"
  // A short anchored interval, or a duration that does not say when it ran.
  | "commit-time-elapsed";

/**
 * The time family by name, so a test holding a pack to zero findings can leave
 * the shipped debt to the ratchet in scenario-audit-time-baseline.test.ts.
 */
export const TIME_FINDING_KINDS: ReadonlySet<string> = new Set<TimeFindingKind>([
  "commit-time-flash-forward",
  "commit-time-elapsed",
]);

export type TimeClaim = {
  readonly phrase: string;
  readonly shape: string;
  /** The interval the phrase claims, or undefined for a season, a month or a year's end. */
  readonly days: number | undefined;
  readonly severity: "error" | "warning";
};

const VAGUE_COUNTS: Readonly<Record<string, number>> = {
  a: 1,
  an: 1,
  the: 1,
  that: 1,
  "a couple of": 2,
  "couple of": 2,
  "a few": 3,
  few: 3,
  several: 3,
  some: 3,
  many: 3,
  "half a": 0.5,
  "a dozen": 12,
};

function countValue(count: string | undefined, unit: string): number | undefined {
  if (count === undefined) return unit.endsWith("s") ? 2 : 1;
  const key = count.toLowerCase().replace(/\s+/g, " ");
  if (/^\d+$/.test(key)) return Number(key);
  return VAGUE_COUNTS[key] ?? spelledValue(key);
}

function ordinalValue(ordinal: string): number {
  const key = ordinal.toLowerCase();
  return ORDINAL_VALUES[key] ?? Number.parseInt(key, 10);
}

/** A season or a harvest, read as a quarter of a year. */
const SEASON_DAYS = 91;

function unitDays(unit: string): number {
  const singular = unit.toLowerCase().replace(/s$/, "");
  if (singular === "morning" || singular === "evening") return 1;
  if (singular === "term") return 4 * 365;
  return DAYS_PER_UNIT[singular] ?? SEASON_DAYS;
}

/** The interval a match claims, in days. Undefined when the shape names a point rather than a span. */
function intervalOf(groups: Readonly<Record<string, string | undefined>> | undefined): number | undefined {
  const unit = groups?.unit;
  if (unit === undefined) return undefined;
  const ordinal = groups?.ordinal;
  if (ordinal !== undefined) return (ordinalValue(ordinal) - 1) * unitDays(unit);
  const count = countValue(groups?.count, unit);
  return count === undefined ? undefined : count * unitDays(unit);
}

function severityOf(shape: TimeShape, days: number | undefined): TimeClaim["severity"] | undefined {
  if (days !== undefined && days <= SAME_NIGHT_DAYS) return undefined;
  if (shape.anchored) return days === undefined || days > COMMIT_WINDOW_DAYS ? "error" : "warning";
  return days === undefined || days > COMMIT_WINDOW_DAYS ? "warning" : undefined;
}

type Located = TimeClaim & { readonly start: number; readonly end: number };

function claimsInSentence(sentence: string): readonly Located[] {
  if (sentence.trimEnd().endsWith("?")) return [];
  if (PRECEDENT_MARKERS.test(sentence) || FORECAST_MARKERS.test(sentence.replace(MONTH_NAME, ""))) return [];
  const upToNow = UP_TO_NOW_MARKERS.test(sentence);
  const found = TIME_SHAPES.filter((shape) => !(upToNow && shape.excusedUpToNow)).flatMap((shape) =>
    [...sentence.matchAll(shape.pattern)].flatMap((match): Located[] => {
      const days = intervalOf(match.groups);
      const severity = severityOf(shape, days);
      if (severity === undefined) return [];
      const start = match.index ?? 0;
      return [{ phrase: match[0].trim(), shape: shape.name, days, severity, start, end: start + match[0].length }];
    }),
  );
  // Overlapping shapes ("spent the following twelve months") are one claim, read at its strongest.
  const ranked = [...found].sort((a, b) => (a.severity === b.severity ? a.start - b.start : a.severity === "error" ? -1 : 1));
  const kept = ranked.reduce<readonly Located[]>(
    (chosen, claim) => (chosen.some((other) => claim.start < other.end && other.start < claim.end) ? chosen : [...chosen, claim]),
    [],
  );
  return [...kept].sort((a, b) => a.start - b.start);
}

/**
 * Every claim of elapsed time a piece of commit-time copy makes, in reading
 * order. Sentences and dash-set clauses are read one at a time, so a forecast
 * in one does not excuse a flash-forward in the next.
 */
export function timeClaimsIn(text: string): readonly TimeClaim[] {
  return text
    .split(/(?<=[.!?;])\s+|\s*[—–]\s*/)
    .flatMap((sentence) => claimsInSentence(sentence).map(({ start: _start, end: _end, ...claim }) => claim));
}

/** A scenario's copy that is on screen the moment the player commits. */
export function commitTimePassages(def: ScenarioDef): readonly Passage[] {
  return passages(def).filter(
    (passage) =>
      passage.label === "context.inaction" ||
      passage.label.startsWith("rejoinder for") ||
      passage.label.startsWith("remembered for") ||
      passage.label.startsWith("press for"),
  );
}

export type TimeFinding = {
  readonly kind: TimeFindingKind;
  readonly severity: "error" | "warning";
  readonly label: string;
  readonly phrase: string;
  readonly message: string;
};

function messageFor(label: string, claim: TimeClaim): string {
  const when = claim.days === undefined ? "a season or more" : `about ${Math.round(claim.days)} days`;
  const head = `the ${label} is shown the moment the decision is made, and "${claim.phrase}" narrates ${when} as already gone by`;
  return claim.severity === "error"
    ? `${head}. Say what is true tonight, give it to a speaker as a forecast ("it could take months"), or move it into a later scenario gated on agedAtLeast`
    : `${head}, or leaves open when it ran. Keep commit-time copy inside the week the player is in`;
}

/** The time findings for any set of commit-time passages, shared by every family of authored copy. */
export function timeFindingsIn(commitTime: readonly Passage[]): readonly TimeFinding[] {
  return commitTime.flatMap((passage) =>
    timeClaimsIn(passage.text).map((claim) => ({
      kind: claim.severity === "error" ? ("commit-time-flash-forward" as const) : ("commit-time-elapsed" as const),
      severity: claim.severity,
      label: passage.label,
      phrase: claim.phrase,
      message: messageFor(passage.label, claim),
    })),
  );
}

export function auditTimeFraming(def: ScenarioDef, findings: FindingSink): void {
  for (const finding of timeFindingsIn(commitTimePassages(def))) {
    findings.push({ kind: finding.kind, severity: finding.severity, scenario: def.id, message: finding.message });
  }
}
