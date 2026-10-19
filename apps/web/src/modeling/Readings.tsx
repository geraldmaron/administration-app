import { formatMoney, formatRatio, type ModelingBand, type ModelingDelta, type ModelingGroupMove, type ModelingMover, type ModelingUnit } from "@admin/player-core";
import type { Valence } from "../shell/valence";

export const formatFor = (unit: ModelingUnit) => (value: number): string => (unit === "money" ? formatMoney(value) : formatRatio(value));

/** A figure that printed as zero has no direction, whatever its sign underneath. */
const moved = (delta: ModelingDelta): boolean => /^[+−]/.test(delta.text);

/** Good or bad for the President, but only when every run agrees on the direction. */
export function deltaValence(delta: ModelingDelta): Valence {
  if (delta.agreement === "same" || delta.agreement === "mixed" || !moved(delta)) return "neutral";
  return (delta.agreement === "higher") === (delta.better === "higher") ? "good" : "bad";
}

const glyph = (text: string): string => (text.startsWith("+") ? "▲" : text.startsWith("−") ? "▼" : "▬");

export function Figure({ text, valence }: { readonly text: string; readonly valence: Valence }) {
  return (
    <span className="mdl-figure ui-valence-ink" data-valence={valence}>
      {glyph(text)} {text}
    </span>
  );
}

/** One symmetric axis for a set of moves, never narrower than a floor, so near-zero moves are not stretched into drama. */
export function axisOf(spreads: readonly ModelingBand[], unit: ModelingUnit): number {
  return Math.max(unit === "money" ? 1 : 0.005, ...spreads.flatMap((spread) => [Math.abs(spread.low), Math.abs(spread.high)]));
}

const position = (value: number, scale: number): number => 50 + (Math.max(-scale, Math.min(scale, value)) / scale) * 50;

/** A difference from zero: the bar to the median and a hairline across the runs' range. */
function DivergingBar({ spread, scale, valence }: { readonly spread: ModelingBand; readonly scale: number; readonly valence: Valence }) {
  const [from, to] = [Math.min(position(0, scale), position(spread.median, scale)), Math.max(position(0, scale), position(spread.median, scale))];
  return (
    <span className="mdl-bar" data-valence={valence} aria-hidden="true">
      <span className="mdl-bar__zero" />
      <span className="mdl-bar__range" style={{ insetInlineStart: `${position(spread.low, scale)}%`, inlineSize: `${position(spread.high, scale) - position(spread.low, scale)}%` }} />
      <span className="mdl-bar__fill" style={{ insetInlineStart: `${from}%`, inlineSize: `${Math.max(to - from, 0.6)}%` }} />
    </span>
  );
}

/** A dot at the median and a line across the runs' range, on an axis with zero marked; hollow gray when the runs disagree on direction. */
export function DotRange({ spread, scale, valence, split }: { readonly spread: ModelingBand; readonly scale: number; readonly valence: Valence; readonly split: boolean }) {
  return (
    <span className="mdl-dot" data-valence={valence} data-split={split || undefined} aria-hidden="true">
      <span className="mdl-dot__zero" />
      <span className="mdl-dot__range" style={{ insetInlineStart: `${position(spread.low, scale)}%`, inlineSize: `${position(spread.high, scale) - position(spread.low, scale)}%` }} />
      <span className="mdl-dot__mark" style={{ insetInlineStart: `${position(spread.median, scale)}%` }} />
    </span>
  );
}

export function MoverList({ movers }: { readonly movers: readonly ModelingMover[] }) {
  return (
    <ol className="mdl-movers__list">
      {movers.map((mover) => (
        <li key={mover.metric} className="mdl-movers__item">
          <span className="mdl-movers__label">{mover.label}</span>
          <Figure text={mover.text} valence={deltaValence(mover)} />
        </li>
      ))}
    </ol>
  );
}

/** The groups one alternative helps or hurts, as diverging bars on one axis. */
export function GroupList({ title, moves, scale, empty }: { readonly title: string; readonly moves: readonly ModelingGroupMove[]; readonly scale: number; readonly empty: string }) {
  return (
    <div className="mdl-groups__side">
      <h4 className="mdl-groups__head">{title}</h4>
      {moves.length === 0 ? (
        <p className="mdl-note">{empty}</p>
      ) : (
        <ul className="mdl-groups__list">
          {moves.map((move) => {
            const valence: Valence = move.median > 0 ? "good" : "bad";
            return (
              <li key={move.cohort} className="mdl-groups__row">
                <span className="mdl-groups__name">{move.name}</span>
                <DivergingBar spread={move} scale={scale} valence={valence} />
                <Figure text={move.text} valence={valence} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
