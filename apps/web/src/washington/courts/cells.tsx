import type { ReactNode } from "react";
import type { ChamberVote, MetricCost } from "@admin/engine";
import { costLines } from "@admin/player-core";
import { Icon } from "@admin/ui-web";

/** No senators have made recorded public commitments on this nominee. */
export function SenateMeter({ vote }: { readonly vote: ChamberVote }) {
  const seats = vote.yeas + vote.nays;
  return (
    <div className="count-meter" data-valence="neutral">
      <strong>Senate support unresolved</strong>
      <p>0–{seats} votes uncommitted. {vote.required} needed for confirmation.</p>
    </div>
  );
}

export function NoneCell({ children }: { readonly children: ReactNode }) {
  return <span className="cell-quiet">{children}</span>;
}

export function CostCell({ cost }: { readonly cost: MetricCost }) {
  const lines = costLines(cost);
  return lines.length === 0 ? <NoneCell>Nothing</NoneCell> : <strong className="cell-cost">{lines.join("; ")}</strong>;
}

export function LinesCell({ lines, none }: { readonly lines: readonly string[]; readonly none: string }) {
  if (lines.length === 0) return <NoneCell>{none}</NoneCell>;
  return (
    <ul className="cell-list">
      {lines.map((line) => (
        <li key={line}>
          <Icon name="caution" size={14} />
          {line}
        </li>
      ))}
    </ul>
  );
}
