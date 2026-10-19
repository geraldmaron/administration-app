import { useMemo } from "react";
import { COHORT_AXES, type CohortAxisId } from "@admin/world";
import type { Campaign } from "@admin/engine";
import { COHORT_AXIS_LABELS, STATE_GROUP_METHOD, place, stateGroupGrid, type GridRow } from "@admin/player-core";
import { Choice, SortHeader, nextSort, type SortState } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { percent } from "./draw";
import "./state-groups.css";
import type { NationSearch, NationPatch, GroupSortKey } from "../state/nation-search";

type SortKey = GroupSortKey;

const AXIS_OPTIONS = COHORT_AXES.map((axis) => ({ value: axis, label: COHORT_AXIS_LABELS[axis] }));

/** How far from even a cell has to be before its color is at full strength, in share. */
const FULL_HEAT = 0.3;

function valueOf(row: GridRow, key: SortKey): number | string {
  if (key === "name") return row.name;
  if (key === "approval") return row.approval;
  return row.cells.find((cell) => cell.cohort === key)?.support ?? 0;
}

function sortRows(rows: readonly GridRow[], sort: SortState<SortKey>): readonly GridRow[] {
  const sign = sort.direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = valueOf(a, sort.key);
    const right = valueOf(b, sort.key);
    const order = typeof left === "string" ? left.localeCompare(right as string) : left - (right as number);
    return order * sign || a.name.localeCompare(b.name);
  });
}

/** A cell's color: the side of even it falls on, and how far, so the grid reads as a diverging scale around half. */
function heat(support: number): React.CSSProperties & Record<string, string> {
  return { "--heat": String(Math.min(1, Math.abs(support - 0.5) / FULL_HEAT)) };
}

function Cell({ support, label, href, id }: { readonly support: number; readonly label: string; readonly href: string; readonly id: string }) {
  return (
    <td className="elec-heat__cell" data-side={support >= 0.5 ? "for" : "against"} style={heat(support)} aria-label={label}>
      <Door id={id} href={href} aria-label={`${label}. Inspect this community.`} className="elec-heat__target">{percent(support)}</Door>
    </td>
  );
}

/** Every state against every group of one cut of the country, colored around half, sortable by any column. */
export function StateGroups({ campaign, search, onSearch }: { readonly campaign: Campaign; readonly search: NationSearch; readonly onSearch: (patch: NationPatch) => void }) {
  const axis = search.group ?? "place";
  const sort: SortState<SortKey> = { key: search.groupSort ?? "approval", direction: search.groupDirection ?? "descending" };
  const onSort = (key: SortKey, first?: "ascending" | "descending") => { const next = nextSort(sort, key, first); onSearch({ groupSort: next.key, groupDirection: next.direction }); };
  const grid = useMemo(() => stateGroupGrid(campaign, axis), [campaign, axis]);
  const rows = useMemo(() => sortRows(grid.rows, sort), [grid, sort]);
  const pickAxis = (group: CohortAxisId) => onSearch({ group, groupSort: undefined, groupDirection: undefined });
  if (grid.rows.length === 0) return null;
  return (
    <section className="elec-panel" aria-labelledby="elec-heat">
      <h2 id="elec-heat" className="elec-panel__title">
        Groups, state by state
      </h2>
      <Choice legend="Cut the country by" layout="segments" options={AXIS_OPTIONS} value={axis} onChange={pickAxis} />
      <div className="elec-heat__wrap" role="region" aria-labelledby="elec-heat" tabIndex={0}>
        <table className="elec-heat">
          <caption className="ui-visually-hidden">Approval among each {grid.axisName.toLowerCase()} group in every state. Select a column to sort.</caption>
          <thead>
            <tr>
              <SortHeader label="State" sortKey="name" sort={sort} onSort={onSort} className="elec-heat__state" />
              <SortHeader label="All" detail="approval" sortKey="approval" sort={sort} onSort={onSort} first="descending" align="end" className="elec-heat__col" />
              {grid.groups.map((group) => (
                <SortHeader key={group.cohort} label={group.name} detail={`${percent(group.national)} nationally`} sortKey={group.cohort} sort={sort} onSort={onSort} first="descending" align="end" className="elec-heat__col" />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.state}>
                <th scope="row" className="elec-heat__state">
                  <Door href={`${place.state(row.state)}?view=people`}>{row.name}</Door>
                </th>
                <Cell id={`state-group-${row.state}-all`} href={`${place.state(row.state)}?view=people`} support={row.approval} label={`${row.name}: ${percent(row.approval)} approve`} />
                {row.cells.map((cell, index) => (
                  <Cell key={cell.cohort} id={`state-group-${row.state}-${cell.cohort}`} href={`${place.state(row.state)}?view=people&cohort=${cell.cohort}`} support={cell.support} label={`${grid.groups[index]!.name} in ${row.name}: ${percent(cell.support)}`} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="elec-note">{STATE_GROUP_METHOD}</p>
    </section>
  );
}
