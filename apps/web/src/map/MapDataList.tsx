import { memo, useId, useRef, useState, type KeyboardEvent } from "react";
import { SortHeader, sortRows, useSort } from "@admin/ui-web";
import type { LegendEntry } from "./lenses/contract";
import type { LensRow } from "./lenses/contract";
import { rovingStep, clusterName, type MarkCluster } from "./marks/cluster";

export interface MapDataListProps {
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly lensName: string;
  readonly levelName: string;
  readonly legend: readonly LegendEntry[];
  readonly rows: readonly LensRow[];
  readonly marks: readonly MarkCluster[];
  /** A row took focus: the map shows where it is. */
  readonly onPreview: (ref: string | null) => void;
  readonly onChoose: (ref: string) => void;
  readonly onChooseMark: (cluster: MarkCluster) => void;
}

/**
 * The lens as text: the accessible data table, the keyboard's way across the
 * map (arrow keys step through the ranked rows, not through geometry), and
 * the whole map under forced colors. Closed, only its toggle is reachable,
 * and the toggle stays out of sight until it has focus.
 */
export const MapDataList = memo(function MapDataList(props: MapDataListProps) {
  const headingId = useId();
  const { open, onToggle, lensName, levelName, rows } = props;
  return (
    <section className={open ? "map-data map-data--open" : "map-data"} aria-labelledby={headingId}>
      <button type="button" className="map-data__toggle" aria-expanded={open} onClick={onToggle}>
        {open ? "Hide the map data" : "Show the map data as a list"}
      </button>
      <div className="map-data__panel">
        <h2 id={headingId} className="map-data__title">
          {lensName}, by {levelName}
        </h2>
        <Legend legend={props.legend} />
        {rows.length === 0 ? <p className="map-data__empty">This lens colors nothing here.</p> : <RowTable {...props} />}
        {props.marks.length > 0 ? <MarkList marks={props.marks} onChooseMark={props.onChooseMark} /> : null}
      </div>
    </section>
  );
});

function Legend({ legend }: { readonly legend: readonly LegendEntry[] }) {
  if (legend.length === 0) return null;
  return (
    <ul className="map-data__legend" aria-label="Legend">
      {legend.map((entry) => (
        <li key={entry.label}>
          <span className="map-data__swatch" style={{ background: entry.color }} aria-hidden="true" />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

type RowSort = "place" | "reading";

const ROW_VALUE = {
  place: (row: LensRow) => row.name,
  reading: (row: LensRow) => row.rank,
} as const;

const byName = (a: LensRow, b: LensRow): number => a.name.localeCompare(b.name);

function RowTable({ rows: ranked, lensName, onPreview, onChoose }: MapDataListProps) {
  const [sort, onSort] = useSort<RowSort>({ key: "reading", direction: "descending" });
  const rows = sortRows(ranked, sort, ROW_VALUE, byName);
  const [cursor, setCursor] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>): void => {
    const next = rovingStep(cursor, event.key, rows.length);
    if (next === null) return;
    event.preventDefault();
    setCursor(next);
    buttons.current[next]?.focus();
  };
  const active = Math.min(cursor, Math.max(0, rows.length - 1));
  return (
    <table className="map-data__table">
      <caption className="map-data__caption">{lensName}{sort.key === "reading" && sort.direction === "descending" ? ", ranked" : ""}. Arrow keys move through the list.</caption>
      <thead>
        <tr>
          <SortHeader label="Place" sortKey="place" sort={sort} onSort={onSort} />
          <SortHeader label="Reading" sortKey="reading" sort={sort} onSort={onSort} first="descending" />
        </tr>
      </thead>
      <tbody onKeyDown={onKeyDown} onBlur={() => onPreview(null)}>
        {rows.map((row, index) => (
          <tr key={row.ref}>
            <th scope="row">
              <button
                type="button"
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                tabIndex={index === active ? 0 : -1}
                onFocus={() => {
                  setCursor(index);
                  onPreview(row.ref);
                }}
                onClick={() => onChoose(row.ref)}
              >
                {row.name}
              </button>
            </th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MarkList({ marks, onChooseMark }: { readonly marks: readonly MarkCluster[]; readonly onChooseMark: (cluster: MarkCluster) => void }) {
  return (
    <>
      <h3 className="map-data__subtitle">Pinned on the map</h3>
      <ul className="map-data__marks">
        {marks.map((cluster) => (
          <li key={cluster.key}>
            <button type="button" onClick={() => onChooseMark(cluster)}>
              {clusterName(cluster)}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
