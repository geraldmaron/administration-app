import { useMemo } from "react";
import type { Campaign, CommodityId } from "@admin/engine";
import { commodityBoard, commodityDetail, commodityPriceFigure, formatDate, isCommodityKey, type CommodityRow } from "@admin/player-core";
import { Bar, Choice, Icon, Series, SortHeader, SortPicker, nextSort, sortRows, type SortOption, type SortState } from "@admin/ui-web";
import { COMMODITY_GLYPH } from "../../shell/glyphs";
import { valenceOf } from "../../shell/valence";
import { CommodityDetail } from "./CommodityDetail";
import { domainOf } from "./scale";
import type { CommoditySort, MarketPatch, MarketSearch } from "./market-search";
import "./market-workspace.css";

const OPTIONS: readonly SortOption<CommoditySort>[] = [{ key: "name", label: "Commodity" }, { key: "change", label: "Since the oath" }, { key: "stocks", label: "Stocks against normal cover" }];
const VALUES = {
  registry: () => 0,
  name: (row: CommodityRow) => row.name,
  change: (row: CommodityRow) => row.points[row.points.length - 1]!.value / row.points[0]!.value,
  stocks: (row: CommodityRow) => row.stocks,
};
const DIRECTION = { up: "↑", down: "↓", flat: "▬" } as const;

function Board({ rows, selected, sort, onSort, onSelect }: { readonly rows: readonly CommodityRow[]; readonly selected: CommodityId; readonly sort: SortState<CommoditySort>; readonly onSort: (sort: SortState<CommoditySort>) => void; readonly onSelect: (id: CommodityId) => void }) {
  const shown = sort.key === "registry" ? rows : sortRows(rows, sort, VALUES);
  const column = (key: CommoditySort, first?: "ascending" | "descending") => onSort(nextSort(sort, key, first));
  return <section id="economy-commodities" className="eco-panel market-board" aria-labelledby="commodity-board-title">
    <h2 id="commodity-board-title" className="eco-panel__title">Across the commodity board</h2>
    <p className="nation-note">Current snapshot. Prices use different units and cannot be ranked against one another.</p>
    <SortPicker options={OPTIONS} sort={sort} onSort={onSort} />
    <div className="eco-table-wrap"><table className="eco-table eco-table--commodities eco-table--stack"><caption className="ui-visually-hidden">Every commodity with current price, change since the oath and stocks</caption>
      <thead><tr><SortHeader label="Commodity" sortKey="name" sort={sort} onSort={column} /><th scope="col" className="eco-table__num">Price / index</th><SortHeader label="Since the oath" sortKey="change" sort={sort} onSort={column} first="descending" align="end" /><SortHeader label="Stocks / normal" sortKey="stocks" sort={sort} onSort={column} align="end" /></tr></thead>
      <tbody>{shown.map((row) => <tr key={row.id} className="ui-row-target" data-selected={row.id === selected || undefined}>
        <th scope="row"><button type="button" className="market-subject ui-row-link" aria-pressed={row.id === selected} onClick={() => onSelect(row.id)}><Icon name={COMMODITY_GLYPH[row.id]} size={20} />{row.name}</button><p className="nation-note">{row.reader}</p></th>
        <td className="eco-table__num" data-label="Price / index">{row.figure}</td>
        <td className="eco-table__num ui-valence-ink" data-valence={valenceOf(row.stance)} data-label="Since the oath"><span aria-hidden="true">{DIRECTION[row.changeDirection]} </span>{row.sinceOath.replace(/ since the oath$/, "")}<span className="ui-visually-hidden">, {row.changeDirection}; {row.stance}</span></td>
        <td className="eco-table__num" data-label="Stocks / normal">{Math.round(row.stocks * 100)}% of normal</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

/** Percentage changes share a scale even when the underlying quote units differ. */
function ChangeComparison({ rows, selected, onSelect }: { readonly rows: readonly CommodityRow[]; readonly selected: CommodityId; readonly onSelect: (id: CommodityId) => void }) {
  const changes = rows.map((row) => ({ row, change: (row.points[row.points.length - 1]!.value / row.points[0]!.value - 1) * 100 }));
  const bound = Math.max(5, ...changes.map(({ change }) => Math.abs(change)));
  return <section className="eco-panel market-comparison" aria-labelledby="market-comparison-title">
    <div><h2 id="market-comparison-title" className="eco-panel__title"><Icon name="graph" size={22} />Where pressure is building</h2><p className="nation-note">Price change since the oath · shared percentage scale. Left is falling, right is rising; direction alone is not a verdict.</p></div>
    <div className="market-comparison__axis" aria-hidden="true"><span>−{bound.toFixed(1)}%</span><span>Oath baseline</span><span>+{bound.toFixed(1)}%</span></div>
    <ul className="market-comparison__rows">{changes.map(({ row, change }) => <li key={row.id} className="ui-row-target">
      <button type="button" className="ui-row-link" aria-pressed={row.id === selected} onClick={() => onSelect(row.id)}><Icon name={COMMODITY_GLYPH[row.id]} size={18} />{row.name}</button>
      <Bar value={(change + bound) / (2 * bound)} from={.5} mode="shift" tone="reading" marks={[{ at: .5, label: "Oath baseline" }]} />
      <strong>{change > 0 ? "+" : ""}{change.toFixed(1)}%</strong>
    </li>)}</ul>
  </section>;
}

function Pulse({ row, search, onChange }: { readonly row: CommodityRow; readonly search: MarketSearch; readonly onChange: (patch: MarketPatch) => void }) {
  const last = row.points.length - 1;
  const index = Math.min(search.observation ?? last, last);
  const values = row.points.map((point) => point.value);
  return <section className="eco-panel market-pulse" aria-labelledby="market-pulse-title">
    <div className="market-heading"><h2 id="market-pulse-title" className="eco-panel__title"><Icon name={COMMODITY_GLYPH[row.id]} size={24} />{row.name}</h2><span className="market-label">Recorded history</span></div>
    <div className="market-quote"><strong>{row.figure}</strong><span className="ui-valence-ink" data-valence={valenceOf(row.stance)}>{DIRECTION[row.changeDirection]} {row.sinceOath}</span></div>
    <p className="nation-note">Latest quote · {row.stance === "adverse" ? "Adverse price pressure" : row.stance === "favorable" ? "Favorable price movement" : row.stance === "caution" ? "Price pressure to watch" : "No material price pressure"}</p>
    <Series key={row.id} label={`${row.name} by week`} variant="area" values={values} domain={domainOf(values)} format={(value) => commodityPriceFigure(row.id, value)} labels={row.points.map((point) => point.label)} timeRange={[row.points[0]!.label, row.points[last]!.label]} unitLabel={row.figure.startsWith("Index") ? "Price index · reference level 1.00" : "Price in US dollars, with unit shown on each reading"} showDomain interactive selectedIndex={index} onIndexChange={(observation) => onChange({ observation })} />
    <p className="nation-note">Replay moves only through recorded observations. Prices are converted from the recorded indices. The faint line shows the full recorded history.</p>
    <section className="market-source" aria-label="Source and consequence"><h3 className="market-label">Source & modeled channel</h3><p>{row.provenance}</p><p>{row.reader}. {row.cause ? `Current pressure: ${row.cause}.` : "No current pressure is reported."}</p></section>
  </section>;
}

/** One coordinated subject: history, suppliers, pressures, inputs and the domestic exposure. */
export function MarketWorkspace({ campaign, search, onChange }: { readonly campaign: Campaign; readonly search: MarketSearch; readonly onChange: (patch: MarketPatch) => void }) {
  const rows = useMemo(() => commodityBoard(campaign).flatMap((family) => family.rows), [campaign]);
  const selected = search.measure && isCommodityKey(search.measure) ? search.measure : "crude";
  const detail = useMemo(() => commodityDetail(campaign, selected), [campaign, selected]);
  const choose = (measure: CommodityId) => onChange({ measure, observation: undefined });
  const sort: SortState<CommoditySort> = { key: search.sort ?? "registry", direction: search.direction ?? "ascending" };
  return <div className="market-workspace">
    <header className="market-situation"><Icon name={COMMODITY_GLYPH[selected]} size={32} /><div><p className="market-label">As of {formatDate(campaign.calendar)}</p><h2>{detail.row.reader}</h2><p>{detail.shocks.length > 0 ? `${detail.shocks.length} current supply ${detail.shocks.length === 1 ? "pressure is" : "pressures are"} recorded. Follow the market history and the subjects behind its supply.` : "No supply disruption is recorded for this commodity. Explore its history, suppliers and inputs."}</p></div></header>
    <Choice legend="Commodity" layout="segments" className="market-choices" options={rows.map((row) => ({ value: row.id, label: row.name }))} value={selected} onChange={choose} />
    <div className="market-analysis"><Pulse row={detail.row} search={search} onChange={onChange} /><CommodityDetail campaign={campaign} id={selected} onCommodity={choose} /></div>
    <ChangeComparison rows={rows} selected={selected} onSelect={choose} />
    <Board rows={rows} selected={selected} sort={sort} onSort={(next) => onChange({ sort: next.key, direction: next.direction })} onSelect={choose} />
  </div>;
}
