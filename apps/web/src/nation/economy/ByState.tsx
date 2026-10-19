import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { formatMoney, place, stateEconomyBoard, type StateEconomyRow } from "@admin/player-core";
import { Collection, SortHeader, SortPicker, sortRows, useSort, type SortOption } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { StateName } from "../../media/StateName";

type Sort = "name" | "unemployment" | "jobsGap" | "pricesGap" | "output";

const OPTIONS: readonly SortOption<Sort>[] = [
  { key: "name", label: "State" },
  { key: "unemployment", label: "Unemployment" },
  { key: "jobsGap", label: "Against the country" },
  { key: "pricesGap", label: "Cost of living" },
  { key: "output", label: "Output" },
];

const VALUE = {
  name: (row: StateEconomyRow) => row.name,
  unemployment: (row: StateEconomyRow) => row.unemployment,
  jobsGap: (row: StateEconomyRow) => row.jobsGap,
  pricesGap: (row: StateEconomyRow) => row.pricesGap,
  output: (row: StateEconomyRow) => row.output,
} as const;

const byName = (a: StateEconomyRow, b: StateEconomyRow): number => a.name.localeCompare(b.name);

const percentOne = (rate: number): string => `${(rate * 100).toFixed(1)}%`;
const signedPoints = (rate: number): string => `${rate < 0 ? "−" : "+"}${(Math.abs(rate) * 100).toFixed(1)} pts`;
/** A state worse off than the country on jobs or prices reads as bad, better as good; a gap under the published precision is level. */
function GapCell({ value, text, label }: { readonly value: number; readonly text: string; readonly label: string }) {
  const level = Math.abs(value) < 0.0005;
  const valence = level ? "neutral" : value > 0 ? "bad" : "good";
  return (
    <td className={level ? "eco-table__num" : "eco-table__num ui-valence-ink"} data-valence={valence} data-label={label}>
      {level ? "" : value > 0 ? "▲ " : "▼ "}
      {text}
    </td>
  );
}

const signedRatio = (ratio: number): string => `${ratio < 0 ? "−" : "+"}${(Math.abs(ratio) * 100).toFixed(0)}%`;

/**
 * Every state's jobs, prices and output against the country, ranked by the
 * measure the President picks. A state's figure is the country's live figure
 * carried through its standing gap, so these are model readings, not surveys.
 */
export function ByState({ campaign }: { readonly campaign: Campaign }) {
  const [sort, onSort, setSort] = useSort<Sort>({ key: "unemployment", direction: "descending" });
  const board = useMemo(() => stateEconomyBoard(campaign), [campaign]);
  const ranked = useMemo(() => sortRows(board.rows, sort, VALUE, byName), [board, sort]);
  if (board.rows.length === 0) return null;
  return (
    <section className="eco-panel" aria-labelledby="economy-states">
      <h2 id="economy-states" className="eco-panel__title">
        By state
      </h2>
      <p className="nation-note">The country&rsquo;s unemployment is {percentOne(board.nationalUnemployment)}. Select a column to rank the states by it.</p>
      <SortPicker options={OPTIONS} sort={sort} onSort={setSort} />
      <div className="eco-table-wrap">
        <table className="eco-table eco-table--stack">
          <caption className="ui-visually-hidden">States ranked by {OPTIONS.find((entry) => entry.key === sort.key)?.label.toLowerCase()}</caption>
          <thead>
            <tr>
              <SortHeader label="State" sortKey="name" sort={sort} onSort={onSort} />
              <SortHeader label="Unemployment" sortKey="unemployment" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
              <SortHeader label="Against the country" sortKey="jobsGap" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
              <SortHeader label="Cost of living against the country" sortKey="pricesGap" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
              <SortHeader label="Output, a year" sortKey="output" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
            </tr>
          </thead>
          <Collection
            as="tbody"
            items={ranked}
            initial={10}
            resetKey={`${sort.key}:${sort.direction}`}
            noun="states"
            render={(row) => (
              <tr key={row.state} className="ui-row-target">
                <th scope="row">
                  <Door href={place.state(row.state)} className="ui-row-link">
                    <StateName id={row.state} name={row.name} />
                  </Door>
                </th>
                <td className="eco-table__num" data-label="Unemployment">{percentOne(row.unemployment)}</td>
                <GapCell value={row.jobsGap} text={signedPoints(row.jobsGap)} label="Against the country" />
                <GapCell value={row.pricesGap} text={signedRatio(row.pricesGap)} label="Cost of living against the country" />
                <td className="eco-table__num" data-label="Output, a year">{formatMoney(row.output)}</td>
              </tr>
            )}
          />
        </table>
      </div>
    </section>
  );
}
