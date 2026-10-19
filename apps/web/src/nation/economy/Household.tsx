import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { bilateralTradePartners, formatMoney, householdReadings, place, tradeBalance, type BilateralTrade, type HouseholdReading } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Collection, Gauge, Icon, Series, SortHeader, SortPicker, Stat, sortRows, useSort, type IconName, type SortOption } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { valenceOf } from "../../shell/valence";
import { domainOf } from "./scale";

const GLYPH: Readonly<Record<HouseholdReading["key"], IconName>> = { pump: "commodityRefinedFuel", grocery: "sectorFoodProcessing", "home-energy": "sectorUtilities" };

function Bill({ reading }: { readonly reading: HouseholdReading }) {
  const values = reading.points.filter((point) => point.kind !== "projected").map((point) => point.value);
  const ahead = reading.points.filter((point) => point.kind === "projected").length;
  return (
    <li className="eco-bill" data-stance={reading.stance} data-valence={valenceOf(reading.stance)}>
      <Stat
        label={
          <>
            <Icon name={GLYPH[reading.key]} size={18} /> {reading.label}
          </>
        }
        value={<span className="ui-valence-ink eco-figure" data-valence={valenceOf(reading.stance)}>{reading.figure}</span>}
        period={reading.sinceOath}
        reading={values.length > 1 ? <Series label={`Recorded weeks, in ${reading.unit}`} values={values} domain={domainOf(values)} format={(value) => value.toFixed(2)} /> : <p className="nation-note">Not enough recorded weeks for a trend.</p>}
      />
      {ahead > 0 ? <p className="economy-projection"><Icon name="schedule" size={16} /><span>Modeled forward path: {reading.points.filter((point) => point.kind === "projected").map((point) => point.value.toFixed(2)).join(" → ")} {reading.unit}. Projection, not recorded history.</span></p> : null}
      <p className="nation-note">
        {reading.lag}
      </p>
    </li>
  );
}

type PartnerSort = "name" | "exports" | "imports" | "share";

const PARTNER_OPTIONS: readonly SortOption<PartnerSort>[] = [
  { key: "name", label: "Partner" },
  { key: "exports", label: "Exports to" },
  { key: "imports", label: "Imports from" },
  { key: "share", label: "Share of US goods trade" },
];

// The share is each partner's slice of the same total, so ranking by the total ranks the share even when the text is not assessed.
const PARTNER_VALUE = {
  name: (row: BilateralTrade) => row.name,
  exports: (row: BilateralTrade) => row.exports,
  imports: (row: BilateralTrade) => row.imports,
  share: (row: BilateralTrade) => row.imports + row.exports,
} as const;

const byPartnerName = (a: BilateralTrade, b: BilateralTrade): number => a.name.localeCompare(b.name);

/** The pump, the grocery bill and the heating and power bill, each with the weeks its lag has already decided. */
export function Household({ campaign }: { readonly campaign: Campaign }) {
  return (
    <section className="eco-panel" aria-labelledby="economy-household">
      <h2 id="economy-household" className="eco-panel__title">
        What households pay
      </h2>
      <ul className="eco-measures">
        {householdReadings(campaign).map((reading) => (
          <Bill key={reading.key} reading={reading} />
        ))}
      </ul>
    </section>
  );
}

/** The balance of goods trade and the partners behind it, each partner's goods in both directions, largest first. */
export function Trade({ campaign }: { readonly campaign: Campaign }) {
  const trade = tradeBalance(campaign);
  const larger = Math.max(trade.imports, trade.exports, 1);
  const [sort, onSort, setSort] = useSort<PartnerSort>({ key: "share", direction: "descending" });
  const found = useMemo(
    () =>
      (Object.keys(campaign.nations) as NationId[])
        .flatMap((id): BilateralTrade[] => {
          const row = bilateralTradePartners(campaign, id);
          return row && row.imports + row.exports > 0 ? [row] : [];
        }),
    [campaign],
  );
  const partners = useMemo(() => sortRows(found, sort, PARTNER_VALUE, byPartnerName), [found, sort]);
  return (
    <>
      <section className="eco-panel" aria-labelledby="economy-trade">
        <h2 id="economy-trade" className="eco-panel__title">
          Goods trade balance
        </h2>
        <div className="eco-trade">
          <Stat label="Goods, a year" value={`${trade.balance < 0 ? "Deficit of " : "Surplus of "}${formatMoney(Math.abs(trade.balance))}`} period="Exports less imports" />
          <div className="eco-trade__bars">
            <Gauge shape="meter" label="Exports" value={trade.exports / larger} valueText={formatMoney(trade.exports)} />
            <Gauge shape="meter" label="Imports" value={trade.imports / larger} valueText={formatMoney(trade.imports)} />
          </div>
        </div>
        <p className="nation-note">Every partner&rsquo;s goods trade as the measures in force leave it. Tariffs and embargoes are set on each country&rsquo;s act desk.</p>
      </section>
      <section className="eco-panel" aria-labelledby="economy-partners">
        <h2 id="economy-partners" className="eco-panel__title">
          Partners
        </h2>
        <SortPicker options={PARTNER_OPTIONS} sort={sort} onSort={setSort} />
        <div className="eco-table-wrap">
          <table className="eco-table eco-table--stack">
            <caption className="ui-visually-hidden">Goods trade with each partner, a year. Select a column to sort.</caption>
            <thead>
              <tr>
                <SortHeader label="Partner" sortKey="name" sort={sort} onSort={onSort} />
                <SortHeader label="Exports to" sortKey="exports" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
                <SortHeader label="Imports from" sortKey="imports" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
                <SortHeader label="Share of US goods trade" sortKey="share" sort={sort} onSort={onSort} first="descending" align="end" className="eco-table__num" />
              </tr>
            </thead>
            <Collection
              as="tbody"
              items={partners}
              initial={10}
              resetKey={`${sort.key}:${sort.direction}`}
              noun="partners"
              empty="The United States trades no goods with any government."
              render={(row) => (
                <tr key={row.nation} className="ui-row-target">
                  <th scope="row">
                    <Door href={place.country(row.nation)} className="ui-row-link">
                      {row.name}
                    </Door>
                  </th>
                  <td className="eco-table__num" data-label="Exports to">{row.exportsText}</td>
                  <td className="eco-table__num" data-label="Imports from">{row.importsText}</td>
                  <td className="eco-table__num" data-label="Share of US goods trade">{row.usShareText ?? "Not assessed"}</td>
                </tr>
              )}
            />
          </table>
        </div>
      </section>
    </>
  );
}
