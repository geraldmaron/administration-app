import type { PersonRecord, OfficeRecordRow } from "@admin/player-core";
import { Collection, SortHeader, SortPicker, sortRows, useSort, type SortOption } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { DossierSection } from "../../shell/dossier/Dossier";
import "../congress/tables.css";
import "./person-record.css";

/** "order" is the order the record is kept in (newest first); it has no header, so nothing is re-sorted until a column is pressed. */
type RecordSort = "order" | "matter" | "outcome" | "cast" | "standing";

const VALUE = {
  order: () => 0,
  matter: (row: OfficeRecordRow) => row.title,
  outcome: (row: OfficeRecordRow) => row.outcome,
  cast: (row: OfficeRecordRow) => row.cast,
  standing: (row: OfficeRecordRow) => row.standing,
} as const;

// A vote is a fact, not a verdict, so the mark is a glyph with the word beside it in the ordinary ink.
const CAST_MARK = { yea: "✓", nay: "✕", strike: "▼", uphold: "✓", agreed: "✓", declined: "✕", acted: "" } as const;

function RecordTable({ record, name }: { readonly record: PersonRecord; readonly name: string }) {
  const [sort, onSort, setSort] = useSort<RecordSort>({ key: "order", direction: "ascending" });
  const { columns } = record;
  const options: readonly SortOption<RecordSort>[] = [
    { key: "matter", label: columns.matter },
    ...(columns.outcome ? [{ key: "outcome" as const, label: columns.outcome }] : []),
    ...(columns.cast ? [{ key: "cast" as const, label: columns.cast }] : []),
    ...(columns.standing ? [{ key: "standing" as const, label: columns.standing }] : []),
  ];
  const shown = sort.key === "order" ? record.rows : sortRows(record.rows, sort, VALUE);
  return (
    <>
      <SortPicker options={options} sort={sort} onSort={setSort} />
      <table className="person-record data-table data-table--stack">
        <caption className="ui-visually-hidden">{record.title}: {name}</caption>
        <thead>
          <tr>
            <SortHeader label={columns.matter} sortKey="matter" sort={sort} onSort={onSort} />
            {columns.outcome ? <SortHeader label={columns.outcome} sortKey="outcome" sort={sort} onSort={onSort} /> : null}
            {columns.cast ? <SortHeader label={columns.cast} sortKey="cast" sort={sort} onSort={onSort} /> : null}
            {columns.standing ? <SortHeader label={columns.standing} sortKey="standing" sort={sort} onSort={onSort} /> : null}
          </tr>
        </thead>
        <Collection
          as="tbody"
          items={shown}
          initial={8}
          resetKey={`${sort.key}:${sort.direction}`}
          noun="decisions"
          render={(row) => (
            <tr key={row.key} className="ui-row-target">
              <th scope="row" data-label={columns.matter}>
                <Door href={row.href} className="ui-row-link">
                  {row.title}
                </Door>
                <span className="person-record__date">{row.detail}</span>
              </th>
              {columns.outcome ? <td data-label={columns.outcome}>{row.outcome}</td> : null}
              {columns.cast ? (
                <td data-label={columns.cast} data-vote={row.castKey} className="person-record__cast">
                  <span>
                    <span aria-hidden="true">{CAST_MARK[row.castKey]} </span>
                    {row.cast}
                  </span>
                </td>
              ) : null}
              {columns.standing ? <td data-label={columns.standing}>{row.standing}</td> : null}
            </tr>
          )}
        />
      </table>
    </>
  );
}

function Facts({ record }: { readonly record: PersonRecord }) {
  if (record.facts.length === 0) return null;
  return (
    <dl className="person-record__facts">
      {record.facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.href ? <Door href={fact.href}>{fact.value}</Door> : fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What this person has done in the chair they hold, open by default: the decisions with the vote, or the facts a governor or foreign leader has. */
export function RecordInOffice({ record, name, n }: { readonly record: PersonRecord; readonly name: string; readonly n: number }) {
  return (
    <DossierSection id="person-record" n={n} icon={record.kind === "bench" ? "court" : record.kind === "floor" ? "subjectChamber" : "mapPin"} title={record.title} {...(record.note ? { note: record.note } : {})}>
      <Facts record={record} />
      {record.rows.length > 0 ? <RecordTable record={record} name={name} /> : <p className="hill-note">{record.empty}</p>}
    </DossierSection>
  );
}
