import type { MetricStance } from "@admin/player-core";

// The figures the Nation screens print, in one place so a share reads the same
// on the topline, a bloc, a group and a state. Every helper is pure.

/** Whether a reading is in the President's favor, as the cue scale draws it. */
export type Valence = "good" | "watch" | "bad" | "neutral";

const FROM_STANCE: Readonly<Record<MetricStance, Valence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" };

/** A reading with no stance is plain data, which is neutral rather than an error. */
export function valenceOf(stance: MetricStance | undefined): Valence {
  return stance === undefined ? "neutral" : FROM_STANCE[stance];
}

/** The Text tone a valence is inked in. */
export const VALENCE_TEXT = { good: "success", watch: "warning", bad: "danger", neutral: "primary" } as const;

/** The track tone a valence fills in; plain data is drawn as a reading, not a judgment. */
export const VALENCE_TRACK = { good: "good", watch: "watch", bad: "bad", neutral: "reading" } as const;

export const percent = (share: number): string => `${Math.round(share * 100)}%`;

/** A difference of two shares in whole points, signed; the minus is a real minus sign. */
export function signedPoints(delta: number): string {
  const points = Math.round(delta * 100);
  if (points === 0) return "0 pts";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} pts`;
}

/** A share difference in tenths of a point: a bloc's weekly moves are small, and whole points read them as zero. */
export const tenths = (delta: number): number => Math.round(delta * 1000) / 10;

export function signedTenths(delta: number): string {
  const value = tenths(delta);
  return value === 0 ? "0 pts" : `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)} pts`;
}

export function signedPercent(share: number): string {
  const points = Math.round(share * 100);
  return points === 0 ? "0%" : `${points > 0 ? "+" : "−"}${Math.abs(points)}%`;
}

/** How far division sits from the 2020s level, as a share of it, in words. */
export function againstEraWords(againstEra: number): string {
  const points = Math.round(Math.abs(againstEra) * 100);
  return points === 0 ? "At the 2020s level" : `${points}% ${againstEra > 0 ? "above" : "below"} the 2020s level`;
}

export const moveGlyph = (delta: number): string => (Math.round(delta * 100) > 0 ? "▲" : Math.round(delta * 100) < 0 ? "▼" : "▬");

/** Higher is better for the President on every reading these screens draw. */
export function deltaValence(delta: number): Valence {
  const points = Math.round(delta * 100);
  return points > 0 ? "good" : points < 0 ? "bad" : "neutral";
}

/** The valence of a signed figure already known to be nonzero, whatever its size. */
export const signValence = (delta: number): Valence => (delta > 0 ? "good" : delta < 0 ? "bad" : "neutral");

/** A gap against the country, in whole points or tenths where whole points would hide it. */
export function gapText(gap: number, inTenths = false): string {
  const points = inTenths ? Math.round(gap * 1000) / 10 : Math.round(gap * 100);
  if (points === 0) return "level";
  return `${points > 0 ? "▲ +" : "▼ −"}${inTenths ? Math.abs(points).toFixed(1) : Math.abs(points)} pts`;
}

/** Weeks, said as a count: "1 week", "3 weeks". */
export const weeks = (count: number): string => `${count} ${count === 1 ? "week" : "weeks"}`;

/** The eyebrow over a state's own pages: the state by its formal name, the way a proclamation would give it. */
export const stateEyebrow = (id: string, name: string): string => (id === "DC" ? "District of Columbia" : `State of ${name}`);

/** What a lean figure such as "D+26" says, since the letters and the number mean nothing to a reader who has not met the notation. */
export function leanMeaning(text: string): string {
  const match = /^([DR])\+(\d+)$/.exec(text);
  if (!match) return "Even means neither party has a usual edge here.";
  return `${text} means ${match[1] === "D" ? "Democrats" : "Republicans"} usually win it by about ${match[2]} points.`;
}
