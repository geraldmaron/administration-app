import { useState } from "react";
import { OPERATION_KIND_LABELS, type OperationKind, type OperationRow, type OperationTone } from "@admin/player-core";
import { Button, Collection, SortHeader, SortPicker, sortRows, useSort, type SortOption, type SortValue } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { NameLink, StatusChip } from "./parts";
import type { SecurityAct } from "./security-act";
import "../../washington/congress/tables.css";

type OperationKey = "attention" | "operation" | "kind" | "theater" | "stage" | "cost" | "weeks" | "review";

const OPTIONS: readonly SortOption<OperationKey>[] = [
  { key: "attention", label: "Needs a look" },
  { key: "operation", label: "Operation" },
  { key: "kind", label: "Kind" },
  { key: "theater", label: "Theater" },
  { key: "stage", label: "Stage" },
  { key: "cost", label: "Weekly cost" },
  { key: "weeks", label: "Weeks running" },
  { key: "review", label: "Weeks to review" },
];

/** Flagged first, then a watch stage, then the rest, so the opening order is what needs a President. */
const TONE_RANK: Readonly<Record<OperationTone, number>> = { bad: 0, watch: 1, neutral: 3, good: 2 };

const VALUE: Readonly<Record<OperationKey, (row: OperationRow) => SortValue>> = {
  attention: (row) => (row.flag ? 0 : TONE_RANK[row.tone] + 1),
  operation: (row) => row.subject.name,
  kind: (row) => row.kindLabel,
  theater: (row) => row.theater?.abbr,
  stage: (row) => TONE_RANK[row.tone],
  cost: (row) => row.weekly,
  weeks: (row) => row.weeks,
  review: (row) => row.reviewIn,
};

const blank = <span className="cell-quiet">—</span>;

function Line({ row, onOpen }: { readonly row: OperationRow; readonly onOpen: (act: SecurityAct) => void }) {
  return (
    <tr className="ui-row-target sec-ops__row" data-tone={row.tone}>
      <th scope="row" data-label="Operation">
        <strong>
          <NameLink href={row.subject.href}>{row.subject.name}</NameLink>
        </strong>
        {row.kind === "covert" ? <span className="data-table__sub sec-ops__what">{row.what}</span> : null}
        {row.flag ? (
          <span className="ui-valence-ink sec-ops__flag" data-valence={row.flag.tone}>
            ⚠ {row.flag.text}
          </span>
        ) : null}
      </th>
      <td data-label="Kind">{row.kindLabel}</td>
      <td data-label="Theater">
        {row.theater ? (
          <Door href={row.theater.href} className="ui-row-link">
            {row.theater.abbr}
          </Door>
        ) : (
          blank
        )}
      </td>
      <td data-label="Stage">
        <StatusChip tone={row.tone}>{row.stage}</StatusChip>
      </td>
      <td data-label="Weekly cost" className="data-table__num">
        {row.weeklyText ?? blank}
      </td>
      <td data-label="Weeks running" className="data-table__num">
        {row.weeks}
      </td>
      <td data-label="Review" className="data-table__num">
        {row.reviewIn === undefined ? <span className="cell-quiet">No end date</span> : row.reviewIn <= 0 ? "Due" : `${row.reviewIn} ${row.reviewIn === 1 ? "week" : "weeks"}`}
      </td>
      <td data-label="Change" className="sec-ops__act">
        <Button kind="secondary" size="sm" onClick={() => onOpen(row.act)}>
          {row.act.kind === "close-finding" ? "Close the finding" : "Change it"}
        </Button>
      </td>
    </tr>
  );
}

function KindFilter({ rows, kind, onKind }: { readonly rows: readonly OperationRow[]; readonly kind: OperationKind | undefined; readonly onKind: (kind: OperationKind | undefined) => void }) {
  const kinds = (Object.keys(OPERATION_KIND_LABELS) as OperationKind[]).filter((entry) => rows.some((row) => row.kind === entry));
  return (
    <div className="service-picker" role="group" aria-label="Kind of operation">
      <Button kind="secondary" size="sm" className="service-picker__option" aria-pressed={kind === undefined} onClick={() => onKind(undefined)}>
        All {rows.length}
      </Button>
      {kinds.map((entry) => (
        <Button key={entry} kind="secondary" size="sm" className="service-picker__option" aria-pressed={kind === entry} onClick={() => onKind(entry)}>
          {OPERATION_KIND_LABELS[entry]} {rows.filter((row) => row.kind === entry).length}
        </Button>
      ))}
    </div>
  );
}

/**
 * Every operation still open, covert findings and commitments abroad on one
 * table: sortable by any column, filterable by kind and paged. Each row links
 * to its subject and its theater, and its button opens the same reviewed act
 * as before.
 */
export function OperationsTable({ rows, onOpen }: { readonly rows: readonly OperationRow[]; readonly onOpen: (act: SecurityAct) => void }) {
  const [kind, setKind] = useState<OperationKind | undefined>();
  const [sort, onSort, setSort] = useSort<OperationKey>({ key: "attention", direction: "ascending" });
  const order = new Map(rows.map((row, index) => [row.id, index] as const));
  const shown = sortRows(kind ? rows.filter((row) => row.kind === kind) : rows, sort, VALUE, (a, b) => order.get(a.id)! - order.get(b.id)!);
  return (
    <div className="sec-table">
      <KindFilter rows={rows} kind={kind} onKind={setKind} />
      <SortPicker options={OPTIONS} sort={sort} onSort={setSort} />
      <table className="data-table ui-table--stack sec-ops__table">
        <caption className="ui-visually-hidden">Open operations. Select a column heading to sort.</caption>
        <thead>
          <tr>
            <SortHeader label="Operation" sortKey="operation" sort={sort} onSort={onSort} />
            <SortHeader label="Kind" sortKey="kind" sort={sort} onSort={onSort} />
            <SortHeader label="Theater" sortKey="theater" sort={sort} onSort={onSort} />
            <SortHeader label="Stage" sortKey="stage" sort={sort} onSort={onSort} />
            <SortHeader label="Weekly cost" sortKey="cost" sort={sort} onSort={onSort} first="descending" align="end" />
            <SortHeader label="Weeks" detail="running" sortKey="weeks" sort={sort} onSort={onSort} first="descending" align="end" />
            <SortHeader label="Review" detail="in" sortKey="review" sort={sort} onSort={onSort} align="end" />
            <th scope="col">
              <span className="ui-visually-hidden">Change</span>
            </th>
          </tr>
        </thead>
        <Collection as="tbody" columns={8} items={shown} initial={10} noun="operations" resetKey={`${kind ?? "all"}:${sort.key}:${sort.direction}`} empty="No operation is open." render={(row) => <Line key={row.id} row={row} onOpen={onOpen} />} />
      </table>
    </div>
  );
}
