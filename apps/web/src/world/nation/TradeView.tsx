import { Card } from "@admin/ui-web";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import type { NationFile, TradePartnerRow, TradeSectorRow } from "@admin/player-core";
import { place } from "@admin/player-core";
import { Collection, Flag, Gauge, Icon, SortPicker, Stat, StatRow, Tag, sortRows, useSort } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import { barPercent, rowsToShow, tradeGlyph, tradeScale } from "./trade-rows";
import { countryActHref } from "./country-search";
import "./country.css";

const SECTORS_FIRST = 8;
const PARTNERS_FIRST = 8;

/** The figures sit in the cells beside the bars, so the bars are the picture and the cells are the data. */
function PairedBars({ row, scale }: { readonly row: TradeSectorRow; readonly scale: number }) {
  return (
    <span className="pair" aria-hidden="true">
      <span className="pair__bar pair__bar--buy" style={{ inlineSize: `${barPercent(row.imports, scale)}%` }} />
      <span className="pair__bar pair__bar--sell" style={{ inlineSize: `${barPercent(row.exports, scale)}%` }} />
    </span>
  );
}

function Legend({ name }: { readonly name: string }) {
  return (
    <p className="pair-legend">
      <span className="pair-legend__item">
        <span className="pair-legend__key pair-legend__key--buy" aria-hidden="true" /> The United States buys from {name}
      </span>
      <span className="pair-legend__item">
        <span className="pair-legend__key pair-legend__key--sell" aria-hidden="true" /> The United States sells to {name}
      </span>
    </p>
  );
}

type SectorRowProps = { readonly row: TradeSectorRow; readonly scale: number; readonly picked: boolean; readonly onPick: (sector: string | undefined) => void };

function SectorRow({ row, scale, picked, onPick }: SectorRowProps) {
  return <li className="trade-category" data-picked={picked || undefined}>
    <button type="button" className="trade-category__pick" aria-pressed={picked} onClick={() => onPick(picked ? undefined : row.sector)}>
      <span className="trade-category__identity"><Icon name={tradeGlyph(row)} size={24} /><strong>{row.name}</strong>{picked ? <Tag tone="identity">Selected</Tag> : null}</span>
      <PairedBars row={row} scale={scale} />
      <span className="trade-category__values">
        <span><small>US imports / year</small><strong>{row.importsText}</strong></span>
        <span><small>US exports / year</small><strong>{row.exportsText}</strong></span>
        <span><small>Tariff in force</small><strong>{row.tariffPercent > 0 ? `${row.tariffPercent}%` : "None"}</strong></span>
      </span>
    </button>
  </li>;
}

/** The default is ranked by value; the shared picker orders comparable categories. */
type SectorSort = "ranked" | "goods" | "imports" | "exports" | "tariff";

const SECTOR_VALUE = {
  ranked: (row: TradeSectorRow) => row.imports + row.exports,
  goods: (row: TradeSectorRow) => row.name,
  imports: (row: TradeSectorRow) => row.imports,
  exports: (row: TradeSectorRow) => row.exports,
  tariff: (row: TradeSectorRow) => row.tariffPercent,
} as const;

function Sectors({ file, sector, onSector }: { readonly file: NationFile; readonly sector: string | undefined; readonly onSector: (sector: string | undefined) => void }) {
  const { trade } = file;
  const scale = tradeScale(trade.sectors);
  const [sort, , setSort] = useSort<SectorSort>({ key: "ranked", direction: "descending" });
  const shown = sortRows(trade.sectors, sort, SECTOR_VALUE);
  return (
    <Card role="region" aria-label={`Goods traded with ${file.name}`} className="country-group">
      <h3 className="country-group__heading">Goods traded with {file.name}, {sort.key === "ranked" ? "ranked by value, " : ""}a year</h3>
      <Legend name={file.name} />
      <p className="country-line">Bars share one scale across all categories. Very small positive flows use a minimum visible mark; exact annual values appear on each card.</p>
      {trade.sectors.find((row) => row.sector === sector) ? <SelectedGoods file={file} sector={sector} /> : <p className="country-line">Choose a category to inspect its trade flows and available action.</p>}
      {trade.sectors.length === 0 ? (
        <p className="brief-section__note">The United States trades no goods with {file.name}.</p>
      ) : (
        <>
          <SortPicker alwaysVisible options={[{ key: "ranked", label: "Trade value" }, { key: "goods", label: "Category" }, { key: "imports", label: "US imports" }, { key: "exports", label: "US exports" }, { key: "tariff", label: "Tariff in force" }]} sort={sort} onSort={setSort} />
          <Collection as="ul" className="trade-categories" items={shown} initial={rowsToShow(shown, SECTORS_FIRST, sector)} resetKey={`${sort.key}:${sort.direction}`} noun="kinds of goods" render={(row) => <SectorRow key={row.sector} row={row} scale={scale} picked={row.sector === sector} onPick={onSector} />} />
        </>
      )}
    </Card>
  );
}

function SelectedGoods({ file, sector }: { readonly file: NationFile; readonly sector: string | undefined }) {
  const row = file.trade.sectors.find((entry) => entry.sector === sector);
  if (!row) return null;
  return <Card role="region" className="trade-inspector" aria-label={`${row.name}: selected trade category`}>
    <div className="trade-category__identity"><Icon name={tradeGlyph(row)} size={24} /><h4>{row.name}</h4><Tag tone="identity">Selected category</Tag></div>
    <p className="country-line">US imports {row.importsText}; US exports {row.exportsText} a year. {row.tariffPercent}% tariff currently in force.</p>
    {row.tariffable && row.imports > 0 ? <Door href={countryActHref(file.nation, { option: "tariff", sector: row.sector }, { view: "economy", sector: row.sector })} className="ui-button ui-button--secondary">Draft tariff · {row.name}</Door>
      : <p className="country-line">{row.tariffable ? "No US imports in this category to tariff." : "These goods use licensing or controls rather than this tariff instrument."}</p>}
    <AuthorityHelp topic="tariffs" compact />
    <p className="country-line">The draft carries this category into the rate, impact comparison and presidential review. No order is issued here.</p>
  </Card>;
}

function PartnerLine({ partner }: { readonly partner: TradePartnerRow }) {
  const src = nationFlagUrl(partner.nation);
  return (
    <li className="partner ui-card-door">
      <Door href={partner.href} className="partner__door ui-card-door__link">
        <Flag name={partner.name} {...(src ? { src } : {})} height={18} decorative />
        <span>{partner.name}</span>
      </Door>
      <Gauge shape="meter" label={`${partner.name}, share of its trade`} labelHidden value={partner.share} valueText={partner.shareText} />
    </li>
  );
}

function Partners({ file }: { readonly file: NationFile }) {
  const { partners } = file.trade;
  return (
    <div className="country-group">
      <h3 className="country-group__heading">Where {file.name} sends its trade, share of its total trade, a year</h3>
      <Collection
        items={partners}
        initial={PARTNERS_FIRST}
        noun="trade partners"
        className="partner-list"
        render={(partner) => <PartnerLine key={partner.nation} partner={partner} />}
        empty="No trade partner stands out. Its trade is spread thin."
      />
      <p className="brief-section__note">The lines on the map run to its six largest partners. Their weight is the share of its trade.</p>
    </div>
  );
}

/** The direction of goods flows is an accounting comparison, not a welfare verdict. */
function BalanceChip({ imports, exports }: { readonly imports: number; readonly exports: number }) {
  const gap = exports - imports;
  const level = Math.abs(gap) < 1;
  return (
    <span className="ui-valence-chip" data-valence="neutral">
      {level ? "Balanced goods flows" : gap > 0 ? "US goods surplus" : "US goods deficit"}
    </span>
  );
}

/** Trade with the United States by goods, then with the world by partner: every kind of goods and every partner, ranked, with the totals in view. */
export function TradeView({ file, sector, onSector }: { readonly file: NationFile; readonly sector: string | undefined; readonly onSector: (sector: string | undefined) => void }) {
  const { trade } = file;
  return (
    <>
      <div className="country-group">
        <h3 className="country-group__heading">Trade with the United States, a year</h3>
        <StatRow layout="comparison">
          <Stat layout="comparison" label="Share of US goods trade" value={trade.usShareText ?? "None"} />
          <Stat layout="comparison" label="You buy" value={<>{trade.importsText}<small>a year</small></>} />
          <Stat layout="comparison" label="You sell" value={<>{trade.exportsText}<small>a year</small></>} />
        </StatRow>
        <p className="country-line">
          <BalanceChip imports={trade.imports} exports={trade.exports} /> {trade.balanceLine}
        </p>
      </div>
      <Sectors file={file} sector={sector} onSector={onSector} />
      <Partners file={file} />
      <Door href={place.economyView("trade")} className="ui-button ui-button--secondary">US trade · global exposure and measures</Door>
    </>
  );
}
