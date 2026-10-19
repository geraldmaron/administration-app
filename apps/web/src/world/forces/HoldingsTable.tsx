import type { CountedHolding } from "@admin/player-core";
import { SortHeader, SortPicker, sortRows, useSort } from "@admin/ui-web";
import { AssetFigure, AssetName } from "./AssetFigure";
import { unitNoun } from "./units";
import "./forces.css";

/** "order" is the order the force is listed in; it has no header, so nothing is re-sorted until a column is pressed. */
type HoldingSort = "order" | "asset";

const HOLDING_VALUE = {
  order: () => 0,
  asset: (holding: CountedHolding) => holding.label,
} as const;

export type HoldingsTableProps = {
  readonly holdings: readonly CountedHolding[];
  /** Names the table for a screen reader: "What Canada fields". */
  readonly caption: string;
  /** Draws each row's free, abroad and not-ready counts as one bar, for a force that is the President's own to read at a glance. */
  readonly drawn?: boolean;
};

/** One asset's fielded force split into what is free, held abroad and not ready; the counts share a unit, so the parts add to the whole. */
function PostureBar({ holding }: { readonly holding: CountedHolding }) {
  const parts = [
    { key: "free", count: holding.available, word: "free this week" },
    { key: "abroad", count: holding.committed, word: "abroad" },
    { key: "resting", count: holding.belowReadiness, word: "not ready" },
  ];
  const spoken = `${holding.label}: ${parts.map((part) => `${part.count.toLocaleString("en-US")} ${part.word}`).join(", ")}.`;
  return (
    <span className="holdings__bar" role="img" aria-label={spoken}>
      {parts.map((part) => (part.count > 0 ? <span key={part.key} data-part={part.key} style={{ flexGrow: part.count }} /> : null))}
    </span>
  );
}

/**
 * What a force fields, one asset per row: its glyph and name, then fielded,
 * abroad, free this week and not ready this week, each in the
 * asset's own unit. The figures share a row and a column, so a reader compares
 * down a column only within one unit; the unit is named on every row.
 */
export function HoldingsTable({ holdings, caption, drawn = false }: HoldingsTableProps) {
  const [sort, onSort, setSort] = useSort<HoldingSort>({ key: "order", direction: "ascending" });
  const order = new Map(holdings.map((holding, index) => [holding.unitType, index]));
  const shown = sortRows(holdings, sort, { ...HOLDING_VALUE, order: (holding) => order.get(holding.unitType) ?? 0 });
  return (
    <div className="holdings">
      <SortPicker options={[{ key: "order", label: "Listed order" }, { key: "asset", label: "Asset name" }]} sort={sort} onSort={setSort} />
      <table className="holdings__table ui-table--stack">
        <caption className="ui-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <SortHeader label="Asset" sortKey="asset" sort={sort} onSort={onSort} />
            {/* Counts are in each asset's own unit, so ranking a column would set ships against troops; only the asset name sorts. */}
            <th scope="col">Fielded</th>
            <th scope="col">Abroad</th>
            <th scope="col">Free</th>
            <th scope="col">Not ready</th>
            {drawn ? <th scope="col">This week</th> : null}
          </tr>
        </thead>
        <tbody>
          {shown.map((holding) => (
            <tr key={`${holding.branch}:${holding.unitType}`}>
              <th scope="row" data-label="Asset">
                <AssetName unitType={holding.unitType} label={holding.label} />
                <span className="holdings__unit">Counted in {unitNoun(holding.unitType, 2)}</span>
              </th>
              <td data-label="Fielded">
                <AssetFigure unitType={holding.unitType} count={holding.total} />
              </td>
              <td data-label="Abroad">{holding.committed.toLocaleString("en-US")}</td>
              <td data-label="Free this week" className="ui-valence-ink" data-valence={holding.available > 0 ? "good" : "neutral"}>{holding.available.toLocaleString("en-US")}</td>
              <td data-label="Not ready" className="ui-valence-ink" data-valence={holding.belowReadiness > 0 ? "bad" : "neutral"}>
                {holding.belowReadiness > 0 ? "▼ " : ""}
                {holding.belowReadiness.toLocaleString("en-US")}
              </td>
              {drawn ? (
                <td data-label="This week" className="holdings__drawn">
                  <PostureBar holding={holding} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
