import { useState } from "react";
import { formatDate, type TimelineRow } from "@admin/player-core";
import { Button, EmptyState, IconBadge, type IconBadgeTone } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { entryMark } from "./entry-mark";
import "./entry-row.css";
import { recordHref, type RecordSearch } from "./search";

/** How many entries the list shows before it offers more. */
const PAGE = 40;
const BIG_PAGE = 400;

/** Marks that mean force read red, whoever acted. */
const FORCE_MARKS = new Set(["conflict", "shield", "instrumentMilitary", "instrumentCovert"]);

function toneOf(row: TimelineRow, mark: string): IconBadgeTone {
  if (FORCE_MARKS.has(mark)) return "red";
  return row.actor === "player" ? "gold" : "blue";
}

function Row({ row, selected, search }: { readonly row: TimelineRow; readonly selected: boolean; readonly search: RecordSearch }) {
  const mark = entryMark(row.systems, row.actor);
  const moves = row.moves.slice(0, 2);
  return (
    <li className="rec-row" data-selected={selected ? "true" : undefined}>
      <Door href={recordHref({ ...search, entry: row.id })} className="rec-row__link" aria-current={selected ? "true" : undefined} data-entry={row.id}>
        <IconBadge name={mark} tone={toneOf(row, mark)} size={36} className="rec-row__mark" />
        <span className="rec-row__body">
          <span className="rec-row__meta">
            <time>{formatDate(row.date)}</time> · {row.actorWord}
            {row.subject ? ` · ${row.subject.label}` : ""}
          </span>
          <span className="rec-row__what">{row.headline}</span>
          {moves.length > 0 ? (
            <span className="rec-row__moves">
              {moves.map((move) => (
                <span key={move.key} className="rec-row__move" data-direction={move.delta > 0 ? "up" : "down"}>
                  <span aria-hidden="true">{move.delta > 0 ? "▲" : "▼"}</span> {move.label} {move.text}
                </span>
              ))}
              {row.moves.length > moves.length ? <span className="rec-row__more">+{row.moves.length - moves.length} more readings</span> : null}
            </span>
          ) : null}
        </span>
      </Door>
    </li>
  );
}

/** The entries newest first, 40 at a time with the true count in view. The list is remounted when the filters change, so a new search starts at the top. */
export function RecordList({ rows, total, selectedId, search }: { readonly rows: readonly TimelineRow[]; readonly total: number; readonly selectedId: string | undefined; readonly search: RecordSearch }) {
  const [shown, setShown] = useState(PAGE);
  if (total === 0) return <EmptyState icon="emptyRecord" title="Nothing recorded yet">Your first decision, order or appointment will appear here.</EmptyState>;
  if (rows.length === 0) return <EmptyState icon="emptyRecord" title="No entry matches those filters">Clear a filter or change the words to see the rest of the term.</EmptyState>;
  const selectedAt = selectedId === undefined ? -1 : rows.findIndex((row) => row.id === selectedId);
  const visible = Math.min(rows.length, Math.max(shown, selectedAt < 0 ? 0 : Math.ceil((selectedAt + 1) / PAGE) * PAGE));
  const remaining = rows.length - visible;
  return (
    <div className="rec-list">
      <ol className="rec-rows" aria-label="Record entries, newest first">
        {rows.slice(0, visible).map((row) => (
          <Row key={row.id} row={row} selected={row.id === selectedId} search={search} />
        ))}
      </ol>
      <div className="rec-list__foot">
        <p className="rec-count">
          Showing {visible.toLocaleString("en-US")} of {rows.length.toLocaleString("en-US")} entries, newest first
        </p>
        {remaining > 0 ? (
          <div className="rec-list__more">
            <Button kind="secondary" size="sm" onClick={() => setShown(visible + PAGE)}>
              Show {Math.min(PAGE, remaining)} older
            </Button>
            {remaining > BIG_PAGE ? (
              <Button kind="ghost" size="sm" onClick={() => setShown(visible + BIG_PAGE)}>
                Show {BIG_PAGE} older
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
