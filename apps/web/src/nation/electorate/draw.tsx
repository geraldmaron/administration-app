import type { MetricStance } from "@admin/player-core";
import { valenceOf, type Valence } from "../../shell/valence";

export const percent = (share: number): string => `${Math.round(share * 100)}%`;

/** A difference of two shares in whole points, signed; the minus is a real minus sign. */
export function signedPoints(delta: number): string {
  const points = Math.round(delta * 100);
  if (points === 0) return "0 pts";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} pts`;
}

/** A share difference in tenths of a point: a bloc's weekly moves are small, and rounding them to whole points reads as zero. */
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

/** Higher is better for the President on every reading this screen draws. */
export function deltaValence(delta: number): Valence {
  const points = Math.round(delta * 100);
  return points > 0 ? "good" : points < 0 ? "bad" : "neutral";
}

/** The valence of a signed figure that is already known to be nonzero, whatever its size. */
export const signValence = (delta: number): Valence => (delta > 0 ? "good" : delta < 0 ? "bad" : "neutral");

export function stanceValence(stance: MetricStance): Valence {
  return valenceOf(stance);
}

export type PollMark = { readonly reading: number; readonly low: number; readonly high: number };

/**
 * Approval as settled, filled solid on the same 0..100 scale as the poll that
 * samples it: the poll is a ring on a whisker for its error, so a sample reads
 * as a measurement of the filled bar and never as a second value for it.
 */
export function ApprovalRuler({ settled, valence, poll }: { readonly settled: number; readonly valence: Valence; readonly poll: PollMark }) {
  const at = (share: number) => `${Math.min(1, Math.max(0, share)) * 100}%`;
  return (
    <span className="elec-ruler" data-valence={valence} aria-hidden="true">
      <span className="elec-ruler__track">
        {[0.25, 0.45, 0.65].map((cut) => (
          <span key={cut} className="elec-bar__cut" style={{ insetInlineStart: at(cut) }} />
        ))}
        <span className="elec-ruler__fill" style={{ inlineSize: at(settled) }} />
      </span>
      <span className="elec-ruler__whisker" style={{ insetInlineStart: at(poll.low), inlineSize: `${Math.max(0, poll.high - poll.low) * 100}%` }} />
      <span className="elec-ruler__poll" style={{ insetInlineStart: at(poll.reading) }} />
    </span>
  );
}

/**
 * A reading on a 0..1 scale as a thin bar, with the three stance cuts as
 * hairlines so the eye can tell which band it sits in, and an optional band
 * (the poll's error) drawn behind the mark.
 */
export function ReadingBar({ value, valence, cuts = true, band, target }: { readonly value: number; readonly valence: Valence; readonly cuts?: boolean; readonly band?: readonly [number, number]; readonly target?: number }) {
  return (
    <span className="elec-bar" data-valence={valence} aria-hidden="true">
      {cuts ? (
        <>
          <span className="elec-bar__cut" style={{ insetInlineStart: "25%" }} />
          <span className="elec-bar__cut" style={{ insetInlineStart: "45%" }} />
          <span className="elec-bar__cut" style={{ insetInlineStart: "65%" }} />
        </>
      ) : null}
      {band ? <span className="elec-bar__band" style={{ insetInlineStart: `${band[0] * 100}%`, inlineSize: `${(band[1] - band[0]) * 100}%` }} /> : <span className="elec-bar__fill" style={{ inlineSize: `${Math.min(1, Math.max(0, value)) * 100}%` }} />}
      {band ? <span className="elec-bar__dot" style={{ insetInlineStart: `${value * 100}%` }} /> : null}
      {target === undefined ? null : <span className="elec-bar__target" style={{ insetInlineStart: `${Math.min(1, Math.max(0, target)) * 100}%` }} />}
    </span>
  );
}
