import { metricFraction, type ReadingMove } from "@admin/player-core";
import { Gauge } from "@admin/ui-web";

/**
 * One reading's move, drawn on its own scale: the meter stands at the value
 * after, with a tick where it stood before, so the size of the move is seen
 * before the figures are read.
 */
export function MoveMeter({ move }: { readonly move: ReadingMove }) {
  const after = metricFraction(move.key, move.after);
  const before = metricFraction(move.key, move.before);
  return (
    <Gauge
      shape="meter"
      label={move.label}
      value={after}
      valueText={move.afterText}
      tone={move.delta < 0 ? "risk" : "reading"}
      marks={[{ at: before, label: `Before, ${move.beforeText}` }]}
      caption={`${move.text}, from ${move.beforeText}`}
    />
  );
}

/** Every reading that moved, or the sentence for none. */
export function Moves({ moves, none }: { readonly moves: readonly ReadingMove[]; readonly none: string }) {
  if (moves.length === 0) return <p className="moves__none">{none}</p>;
  return (
    <ul className="moves">
      {moves.map((move) => (
        <li key={move.key}>
          <MoveMeter move={move} />
        </li>
      ))}
    </ul>
  );
}
