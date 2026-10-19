import { formatSignedPoints, type DigestView, type StateMove } from "@admin/player-core";
import { StateName } from "../../media/StateName";
import { Door } from "../../shell/Door";

const dirOf = (delta: number): "up" | "down" => (delta > 0 ? "up" : "down");

function MoverList({ title, moves, none, span }: { readonly title: string; readonly moves: readonly StateMove[]; readonly none: string; readonly span: number }) {
  return (
    <div className="dg-movers">
      <h3 className="dg-movers__title">{title}</h3>
      {moves.length === 0 ? (
        <p className="dg-none">{none}</p>
      ) : (
        <ol className="dg-movers__list">
          {moves.map((move) => (
            <li key={move.id}>
              <Door href={move.href} className="dg-movers__row" aria-label={`${move.name}: ${move.text}`}>
                <span className="dg-movers__name"><StateName id={move.id} name={move.name} /></span>
                <span className="dg-movers__bar" aria-hidden="true">
                  <span data-dir={dirOf(move.delta)} style={{ inlineSize: `${Math.min(100, (Math.abs(move.delta) / span) * 100)}%` }} />
                </span>
                <span className="ui-valence-ink dg-movers__figure" data-valence={move.delta > 0 ? "good" : "bad"}>{formatSignedPoints(move.delta)}</span>
              </Door>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** The five states that rose most and fell most, on one scale, each opening its state. */
export function Movers({ view }: { readonly view: DigestView }) {
  const { risers, fallers } = view.digest;
  const span = Math.max(0.002, ...[...risers, ...fallers].map((move) => Math.abs(move.delta)));
  return (
    <div className="dg-movers__pair">
      <MoverList title="Rose most" moves={risers} none="No state rose." span={span} />
      <MoverList title="Fell most" moves={fallers} none="No state fell." span={span} />
    </div>
  );
}
