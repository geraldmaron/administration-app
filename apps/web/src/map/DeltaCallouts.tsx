import { stateApprovals, type Campaign } from "@admin/engine";
import { formatSignedPoints } from "@admin/player-core";
import { MapCard } from "./MapCards";
import { regionKey, type RegionTable } from "./data";

export interface StateMove {
  readonly id: string;
  readonly delta: number;
}

/** Below a tenth of a point a move is not worth a card. */
const NOTICEABLE = 0.001;
const CALLOUTS = 3;

/** The states whose approval moved most between two campaigns, largest move first, ties by id. */
export function largestMoves(before: Readonly<Record<string, number | undefined>>, after: Readonly<Record<string, number | undefined>>, count = CALLOUTS): readonly StateMove[] {
  return Object.keys(after)
    .flatMap((id) => {
      const was = before[id];
      const now = after[id];
      return was === undefined || now === undefined || Math.abs(now - was) < NOTICEABLE ? [] : [{ id, delta: now - was }];
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.id.localeCompare(b.id))
    .slice(0, count);
}

/**
 * The payoff of an act, said on the map: the states it moved most, each
 * with its move. The lens colors every state; these name the few worth
 * reading first. The full list is in the map's table.
 */
export function DeltaCallouts({ baseline, campaign, table }: { readonly baseline: Campaign | null; readonly campaign: Campaign | null; readonly table: RegionTable }) {
  if (!baseline || !campaign) return null;
  const moves = largestMoves(stateApprovals(baseline) as Readonly<Record<string, number | undefined>>, stateApprovals(campaign) as Readonly<Record<string, number | undefined>>);
  return (
    <>
      {moves.map((move, i) => {
        const name = table.byKey.get(regionKey("states", move.id))?.name ?? move.id;
        const up = move.delta > 0;
        return (
          <MapCard key={move.id} id={`delta:${move.id}`} anchor={`state:${move.id}`} priority={i} label={`${name}: approval ${formatSignedPoints(move.delta)} points`}>
            <p className="map-card__title delta-card">
              {name}{" "}
              <span className="delta-card__move" data-up={up ? "true" : "false"}>
                <span aria-hidden="true">{up ? "▲" : "▼"}</span> {formatSignedPoints(move.delta)} pts
              </span>
            </p>
          </MapCard>
        );
      })}
    </>
  );
}
