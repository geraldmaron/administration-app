import { useState } from "react";
import type { TradeSectorRow } from "@admin/player-core";
import { Button, Collection, Field, Icon, Sheet, SortHeader, sortRows, useSort } from "@admin/ui-web";
import { barPercent, rowsToShow, tradeGlyph, tradeScale } from "./trade-rows";
import "./country.css";
import "./tariff-goods.css";

const FIRST = 8;

/** "ranked" is the order by what the United States buys; it has no header, so nothing is re-sorted until a column is pressed. */
type GoodsSort = "ranked" | "goods" | "imports" | "exports" | "tariff";

const GOODS_VALUE = {
  ranked: () => 0,
  goods: (row: TradeSectorRow) => row.name,
  imports: (row: TradeSectorRow) => row.imports,
  exports: (row: TradeSectorRow) => row.exports,
  tariff: (row: TradeSectorRow) => row.tariffPercent,
} as const;

type Props = {
  readonly name: string;
  /** Every kind of goods the United States buys from the government and a tariff can reach, ranked by value. */
  readonly goods: readonly TradeSectorRow[];
  readonly picked: string;
  readonly onPick: (sector: string) => void;
};

/**
 * The goods a tariff could land on, each with what the United States buys and
 * sells in them, a year, and the rate already in force. The picked goods stay
 * in view whatever the ranking puts below the fold, so the comparison never
 * hides the choice it is a comparison of.
 */
function GoodsComparison({ name, goods, picked, onPick }: Props) {
  const scale = tradeScale(goods);
  const [sort, onSort] = useSort<GoodsSort>({ key: "ranked", direction: "ascending" });
  const shown = sort.key === "ranked" ? goods : sortRows(goods, sort, GOODS_VALUE);
  return (
    <fieldset className="tariff-goods">
      <legend>{sort.key === "ranked" ? `Goods, ranked by what the United States buys from ${name} a year` : `Goods a tariff on ${name} could reach`}</legend>
      <div className="trade-table">
        <table className="country-table">
          <caption className="ui-visually-hidden">Goods a tariff on {name} could reach, in US dollars a year</caption>
          <thead>
            <tr>
              <SortHeader label="Goods" sortKey="goods" sort={sort} onSort={onSort} />
              <SortHeader label="You buy" sortKey="imports" sort={sort} onSort={onSort} first="descending" />
              <SortHeader label="You sell" sortKey="exports" sort={sort} onSort={onSort} first="descending" />
              <SortHeader label="In force" sortKey="tariff" sort={sort} onSort={onSort} first="descending" />
            </tr>
          </thead>
          <Collection
            as="tbody"
            columns={4}
            items={shown}
            initial={rowsToShow(shown, FIRST, picked)}
            resetKey={`${sort.key}:${sort.direction}`}
            noun="kinds of goods"
            render={(row) => (
              <tr key={row.sector} className="trade-row ui-row-target" data-picked={row.sector === picked ? "true" : undefined}>
                <th scope="row">
                  <label className="tariff-goods__pick ui-row-link">
                    <input type="radio" name="tariff-goods" value={row.sector} checked={row.sector === picked} onChange={() => onPick(row.sector)} />
                    <Icon name={tradeGlyph(row)} size={24} className="asset-glyph" />
                    <span>{row.name}</span>
                  </label>
                  <span className="pair" aria-hidden="true">
                    <span className="pair__bar pair__bar--buy" style={{ inlineSize: `${barPercent(row.imports, scale)}%` }} />
                    <span className="pair__bar pair__bar--sell" style={{ inlineSize: `${barPercent(row.exports, scale)}%` }} />
                  </span>
                </th>
                <td>{row.importsText}</td>
                <td>{row.exportsText}</td>
                <td>{row.tariffPercent > 0 ? `${row.tariffPercent}%` : "None"}</td>
              </tr>
            )}
          />
        </table>
      </div>
    </fieldset>
  );
}


/** The choice and its evidence stay together; the complete ledger is available without crowding the plan. */
export function TariffGoods({ name, goods, picked, onPick }: Props) {
  const [comparing, setComparing] = useState(false);
  const selected = goods.find((row) => row.sector === picked);
  const scale = tradeScale(goods);
  return (
    <section className="tariff-selection" aria-label="Tariffed goods">
      <Field label="Traded category" hint="One category per order. These are tracked trade categories, not individual products.">
        {(props) => <select {...props} className="ui-input" value={picked} onChange={(event) => onPick(event.target.value)}>
          {goods.map((row) => <option key={row.sector} value={row.sector}>{row.name}</option>)}
        </select>}
      </Field>
      {selected ? <div className="tariff-selection__evidence">
        <div className="tariff-selection__identity"><Icon name={tradeGlyph(selected)} size={24} /><strong>{selected.name}</strong><span>{selected.tariffPercent}% in force</span></div>
        <dl className="tariff-selection__flows">
          <div><dt>US imports / year</dt><dd>{selected.importsText}</dd><span className="pair" aria-hidden="true"><span className="pair__bar pair__bar--buy" style={{ inlineSize: `${barPercent(selected.imports, scale)}%` }} /></span></div>
          <div><dt>US exports / year</dt><dd>{selected.exportsText}</dd><span className="pair" aria-hidden="true"><span className="pair__bar pair__bar--sell" style={{ inlineSize: `${barPercent(selected.exports, scale)}%` }} /></span></div>
        </dl>
        <p className="tariff-selection__basis">Annual trade with {name}, in US dollars. Bars share the largest flow across all eligible categories.</p>
      </div> : null}
      <Button size="sm" onClick={() => setComparing(true)} icon={<Icon name="subjectTrade" size={18} />}>Compare all {goods.length} categories</Button>
      <Sheet open={comparing} onClose={() => setComparing(false)} title="Compare traded categories" lead={`Imports from and exports to ${name}, in US dollars per year.`} placement="wide" foot={<Button kind="primary" onClick={() => setComparing(false)}>Return to tariff</Button>}>
        <GoodsComparison name={name} goods={goods} picked={picked} onPick={onPick} />
      </Sheet>
    </section>
  );
}
