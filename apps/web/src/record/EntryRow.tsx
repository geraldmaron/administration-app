import { formatDate, type ReadingMove, type RecordRow } from "@admin/player-core";
import { IconBadge, Movement, movementScale } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { moveValence } from "../shell/valence";
import { entryMark } from "./entry-mark";
import "./entry-row.css";

/** How many readings a summary row draws before it says how many more moved. */
const SHOWN_MOVES = 3;

/**
 * One bar scale per unit across every row in a list, so two bars of the same
 * length mean the same amount wherever they sit. Dollars never share a scale
 * with points.
 */
export type MoveScales = { readonly points: number; readonly money: number };

const isMoney = (move: ReadingMove): boolean => move.key === "treasury";

export function moveScales(rows: readonly RecordRow[]): MoveScales {
  const moves = rows.flatMap((row) => row.moves);
  return {
    points: movementScale(moves.filter((move) => !isMoney(move)).map((move) => move.delta)),
    money: movementScale(moves.filter(isMoney).map((move) => move.delta)),
  };
}

// The largest point move leads, since it is what the act is remembered for;
// money is in another unit and cannot be ranked against points, so it follows.
function ranked(moves: readonly ReadingMove[]): readonly ReadingMove[] {
  return [...moves].sort((a, b) => Number(isMoney(a)) - Number(isMoney(b)) || Math.abs(b.delta) - Math.abs(a.delta));
}

/** A Record entry as a summary list shows it: its mark, its date, what happened, and the readings it moved drawn to one scale. */
export function EntryRow({ row, href, scales }: { readonly row: RecordRow; readonly href: string; readonly scales: MoveScales }) {
  const moves = ranked(row.moves);
  const shown = moves.slice(0, SHOWN_MOVES);
  return (
    <li className="rec-row entry-row">
      <Door href={href} className="rec-row__link">
        <IconBadge name={entryMark(row.systems, row.actor)} tone={row.actor === "player" ? "gold" : "blue"} size={28} className="rec-row__mark" />
        <span className="rec-row__body">
          <span className="rec-row__meta">
            <time>{formatDate(row.date)}</time>
          </span>
          <span className="rec-row__what">{row.headline}</span>
          {shown.length > 0 ? (
            <span className="entry-row__moves">
              {shown.map((move) => (
                <Movement key={move.key} label={move.label} value={move.delta} scale={isMoney(move) ? scales.money : scales.points} text={move.text} valence={moveValence(move.delta)} />
              ))}
              {moves.length > shown.length ? <span className="rec-row__more">+{moves.length - shown.length} more readings</span> : null}
            </span>
          ) : (
            <span className="rec-row__more">No national reading moved</span>
          )}
        </span>
      </Door>
    </li>
  );
}
