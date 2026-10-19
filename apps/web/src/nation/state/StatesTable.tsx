import { useMemo, useState } from "react";
import type { UsParty } from "@admin/engine";
import { Bar, Choice, Collection, Field, Icon, SortHeader, Sparkline, Tag, nextSort, type SortState } from "@admin/ui-web";
import type { Valence } from "../../shell/valence";
import { Door } from "../../shell/Door";
import { NO_FILTER, filterStates, sortStates, type StateFilter, type StateSortKey, type StateTableRow } from "./states-table";
import { StateName } from "../../media/StateName";
import { formatSignedPoints, place } from "@admin/player-core";

const PARTY_CHOICES: readonly {
  readonly value: UsParty | "any";
  readonly label: string;
}[] = [
  { value: "any", label: "Any governor" },
  { value: "democrat", label: "Democratic" },
  { value: "republican", label: "Republican" },
];

const PARTY_LETTER: Readonly<Record<UsParty, string>> = {
  democrat: "D",
  republican: "R",
  independent: "I",
};

const GLYPH: Readonly<Record<Valence, string>> = {
  good: "▲",
  watch: "⚠",
  bad: "▼",
  neutral: "",
};

const COLUMN_LABELS: Readonly<Record<Exclude<StateSortKey, "reading">, string>> = {
  name: "State",
  governor: "Governor",
  change: "Since last week",
  flags: "Flags",
};

function Flags({ row }: { readonly row: StateTableRow }) {
  // A quiet state's cell stays empty, so the few flagged rows stand out instead of a column of "None".
  if (row.conditions === 0 && !row.declared)
    return (
      <span className="states-table__none">
        <span aria-hidden="true">—</span>
        <span className="ui-visually-hidden">None</span>
      </span>
    );
  return (
    <span className="states-table__flags">
      {row.conditions > 0 ? (
        <Tag tone="caution" icon="caution">
          {row.conditions} {row.conditions === 1 ? "condition" : "conditions"}
        </Tag>
      ) : null}
      {row.declared ? (
        <Tag tone="identity" icon="order">
          Declared
        </Tag>
      ) : null}
    </span>
  );
}

export type StatesTableProps = {
  readonly rows: readonly StateTableRow[];
  readonly filter?: StateFilter;
  readonly onFilter?: (filter: StateFilter) => void;
  readonly sort?: SortState<StateSortKey>;
  readonly onSortChange?: (sort: SortState<StateSortKey>) => void;
  /** What the reading column is: the name of the lens the tiles are drawing. */
  readonly readingLabel: string;
  /** Whether the reading is approval, the only lens with a weekly record to show beside it. */
  readonly withRecord: boolean;
  /** The state lit on the map beside the table, if any. */
  readonly selected?: string | undefined;
  /** Given, each row can light its state on the map, and a state chosen on the map is pinned above the pages. */
  readonly onSelect?: (id: string | undefined) => void;
  /** Beside a map: the search and the readings only, ten rows a page. */
  readonly compact?: boolean;
};

/** The week's move in one state's approval, inked by whether it helped, with its record from the oath. */
/** A week's move in tenths of a point, the precision the Digest and the map key use; whole points read a typical week as zero. */
function weekPoints(change: number): string {
  return Math.abs(change) < 0.0005 ? "No change" : `${formatSignedPoints(change)} pts`;
}

/** The arrow and ink follow the same tenth-of-a-point line as the figure, so a printed −0.1 never sits beside a flat mark. */
function weekDirection(change: number): { readonly glyph: string; readonly valence: Valence } {
  if (Math.abs(change) < 0.0005) return { glyph: "▬", valence: "neutral" };
  return change > 0 ? { glyph: "▲", valence: "good" } : { glyph: "▼", valence: "bad" };
}

function Move({ row }: { readonly row: StateTableRow }) {
  if (row.change === undefined) return <span className="states-table__none">No earlier week</span>;
  const { glyph, valence } = weekDirection(row.change);
  return (
    <span className="states-table__move">
      <span className="ui-valence-ink" data-valence={valence}>
        {glyph} {weekPoints(row.change)}
      </span>
      {row.history.length > 1 ? <Sparkline values={row.history} valence={valence} /> : null}
    </span>
  );
}

type RowProps = {
  readonly row: StateTableRow;
  readonly readingLabel: string;
  readonly withRecord: boolean;
  readonly compact: boolean;
  readonly selected: boolean;
  readonly onSelect: ((id: string | undefined) => void) | undefined;
};

/** One state: its name opens the dossier; the pin, where offered, lights it on the map beside the table. */
function StateRow({ row, readingLabel, withRecord, compact, selected, onSelect }: RowProps) {
  return (
    <tr className="ui-row-target" data-selected={selected ? "true" : undefined}>
      {onSelect ? (
        <td className="states-table__locate">
          <button type="button" className="states-table__locate-button" aria-pressed={selected} aria-label={selected ? `Clear ${row.name} from the map` : `Show ${row.name} on the map`} onClick={() => onSelect(selected ? undefined : row.id)}>
            <Icon name="mapPin" size={16} />
          </button>
        </td>
      ) : null}
      <th scope="row">
        <Door href={row.href} className="ui-row-link">
          <StateName id={row.id} name={row.name} />
        </Door>
      </th>
      {compact ? null : (
        <td className="states-table__gov-col" data-label="Governor">
          {row.governor ? (
            <span>
              {row.governorId ? <Door href={place.person(row.governorId)}>{row.governor}</Door> : row.governor}{" "}
              {row.party ? (
                <span className="states-table__party" data-party={row.party}>
                  ({PARTY_LETTER[row.party]})
                </span>
              ) : null}
            </span>
          ) : (
            <span className="states-table__none">No governor</span>
          )}
        </td>
      )}
      <td className={row.valence ? "states-table__num ui-valence-ink" : "states-table__num"} data-valence={row.valence} data-label={readingLabel}>
        <span className="states-table__reading">
          <span>
            {row.valence ? <span aria-hidden="true">{GLYPH[row.valence]} </span> : null}
            {row.reading}
          </span>
          {row.meter ? (
            <Bar
              label={`${row.name}: ${row.reading}`}
              value={row.meter.value}
              tone={row.valence ?? "neutral"}
              {...(row.meter.mark === undefined ? {} : { marks: [{ at: row.meter.mark, label: "Even" }] })}
              {...(row.meter.from === undefined ? {} : { from: row.meter.from })}
            />
          ) : null}
        </span>
      </td>
      {withRecord ? (
        <td className="states-table__num" data-label="Since last week">
          <Move row={row} />
        </td>
      ) : null}
      {compact ? null : (
        <td className="states-table__num" data-label="Flags" data-empty={row.conditions === 0 && !row.declared ? "true" : undefined}>
          <Flags row={row} />
        </td>
      )}
    </tr>
  );
}

/** The state chosen on the map, kept above the pages so the choice is always in view whatever page or sort the table is on. */
function Chosen({ row, readingLabel, onSelect }: { readonly row: StateTableRow; readonly readingLabel: string; readonly onSelect: (id: string | undefined) => void }) {
  return (
    <p className="states-table__chosen" aria-live="polite">
      <Icon name="mapPin" size={16} />
      <span>
        <Door href={row.href}>
          <StateName id={row.id} name={row.name} />
        </Door>
        : {readingLabel.toLowerCase()} {row.reading}
        {row.change === undefined ? "" : `, ${weekPoints(row.change)} since last week`}
      </span>
      <button type="button" className="states-table__clear" onClick={() => onSelect(undefined)}>
        Clear
      </button>
    </p>
  );
}

function Filters({ filter, setFilter, compact }: { readonly filter: StateFilter; readonly setFilter: (next: StateFilter) => void; readonly compact: boolean }) {
  return (
    <div className="states-table__filters">
      <Field label="Find a state or governor">{(control) => <input {...control} type="search" className="ui-input" value={filter.query} onChange={(event) => setFilter({ ...filter, query: event.currentTarget.value })} />}</Field>
      {compact ? null : (
        <>
          <Choice legend="Governor's party" layout="segments" options={PARTY_CHOICES} value={filter.party} onChange={(party) => setFilter({ ...filter, party })} />
          <label className="states-table__check">
            <input type="checkbox" checked={filter.flaggedOnly} onChange={(event) => setFilter({ ...filter, flaggedOnly: event.currentTarget.checked })} />
            Only states with a condition or declaration
          </label>
        </>
      )}
    </div>
  );
}

/**
 * All the states in one sortable, filterable, paged table. Every row opens
 * that state's dossier, and the count of rows shown is always visible. Beside
 * a map it is compact, and each row can light its state there.
 */
export function StatesTable({ rows, readingLabel, withRecord, selected, onSelect, compact = false, filter: controlledFilter, onFilter, sort: controlledSort, onSortChange }: StatesTableProps) {
  const [localFilter, setLocalFilter] = useState<StateFilter>(NO_FILTER);
  const [localSort, setLocalSort] = useState<SortState<StateSortKey>>({ key: "name", direction: "ascending" });
  const filter = controlledFilter ?? localFilter;
  const sort = controlledSort ?? localSort;
  const setFilter = (next: StateFilter) => { setLocalFilter(next); onFilter?.(next); };
  const onSort = (key: StateSortKey, first?: "ascending" | "descending") => { const next = nextSort(sort, key, first); setLocalSort(next); onSortChange?.(next); };
  const shown = useMemo(() => sortStates(filterStates(rows, filter), sort.key, sort.direction), [rows, filter, sort]);
  const sortLabel = (sort.key === "reading" ? readingLabel : COLUMN_LABELS[sort.key]).toLowerCase();
  const columns = (compact ? 2 : 4) + (withRecord ? 1 : 0) + (onSelect ? 1 : 0);
  const filtering = filter !== NO_FILTER && (filter.query !== "" || filter.party !== "any" || filter.flaggedOnly);
  const chosen = selected ? rows.find((row) => row.id === selected) : undefined;
  return (
    <div className="states-table" data-compact={compact ? "true" : undefined}>
      <Filters filter={filter} setFilter={setFilter} compact={compact} />
      {chosen && onSelect ? <Chosen row={chosen} readingLabel={readingLabel} onSelect={onSelect} /> : null}
      <p className="states-table__count" aria-live="polite">
        {shown.length} of {rows.length} states. Sorted by {sortLabel}.{" "}
        {filtering ? <button type="button" className="states-table__clear" onClick={() => setFilter(NO_FILTER)}>Clear filters</button> : null}
      </p>
      <div className="states-table__wrap">
        <table className="states-table__table">
          <caption className="ui-visually-hidden">All states, with {compact ? "" : "governor, "}{readingLabel.toLowerCase()}{compact ? "" : " and flags"}</caption>
          <thead>
            <tr>
              {onSelect ? <th scope="col" className="states-table__locate"><span className="ui-visually-hidden">On the map</span></th> : null}
              <SortHeader label={COLUMN_LABELS.name} sortKey="name" sort={sort} onSort={onSort} />
              {compact ? null : <SortHeader label={COLUMN_LABELS.governor} sortKey="governor" sort={sort} onSort={onSort} className="states-table__gov-col" />}
              <SortHeader label={readingLabel} sortKey="reading" sort={sort} onSort={onSort} first="descending" align="end" className="states-table__num" />
              {withRecord ? <SortHeader label={COLUMN_LABELS.change} sortKey="change" sort={sort} onSort={onSort} first="descending" align="end" className="states-table__num" /> : null}
              {compact ? null : <SortHeader label={COLUMN_LABELS.flags} sortKey="flags" sort={sort} onSort={onSort} first="descending" align="end" className="states-table__num" />}
            </tr>
          </thead>
          <Collection
            as="tbody"
            columns={columns}
            items={shown}
            initial={compact ? 10 : 15}
            noun="states"
            resetKey={`${readingLabel}:${sort.key}:${sort.direction}:${filter.query}:${filter.party}:${filter.flaggedOnly}`}
            render={(row) => <StateRow key={row.id} row={row} readingLabel={readingLabel} withRecord={withRecord} compact={compact} selected={selected === row.id} onSelect={onSelect} />}
          />
        </table>
        {shown.length === 0 ? <p className="brief-section__note">No state matches. Clear the filters to see all {rows.length}.</p> : null}
      </div>
    </div>
  );
}
