import type { Campaign } from "@admin/engine";
import { place, recordRows } from "@admin/player-core";
import { Collection } from "@admin/ui-web";
import { EntryRow, moveScales } from "../../record/EntryRow";

/**
 * The President's own entries that moved approval, newest first. Each row draws
 * only the approval move, so every bar here is the same reading on one scale.
 */
export function ApprovalActs({ campaign }: { readonly campaign: Campaign }) {
  const rows = recordRows(campaign, "player")
    .filter((row) => row.moves.some((move) => move.key === "approval"))
    .map((row) => ({ ...row, moves: row.moves.filter((move) => move.key === "approval") }));
  const scales = moveScales(rows);
  return (
    <section className="elec-panel" aria-labelledby="elec-acts">
      <h2 id="elec-acts" className="elec-panel__title">
        What your acts did to approval
      </h2>
      <Collection
        items={rows}
        initial={6}
        noun="entries"
        as="ol"
        className="rec-rows"
        empty="None of your acts has moved approval yet. The world moves it every week anyway."
        render={(row) => <EntryRow key={row.id} row={row} href={place.event(row.id)} scales={scales} />}
      />
    </section>
  );
}
