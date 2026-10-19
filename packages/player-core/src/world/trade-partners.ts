import {
  bilateralGoods,
  selectLiveMeasures,
  tradeEdgesWith,
  tradeSector,
  type Campaign,
  type TradeMeasure,
  type TradeMeasureKind,
} from "@admin/engine";
import type { NationId, SectorId } from "@admin/world";
import { formatDate, formatRatio } from "../format/figures";
import { formatMoney } from "../format/money";
import { place } from "../navigation/places";
import { goodsTradeShare } from "./standing";

// A country's trade, from both ends: what the United States buys from it and
// sells to it, which measures are in force on that flow, and where the country
// itself sends the rest of its trade. The first is the President's to move;
// the second is the web of ties an act on this country reaches.

export type TradePartnerRow = {
  readonly nation: NationId;
  readonly name: string;
  /** Share of the country's own trade that runs to this partner, 0..1. */
  readonly share: number;
  readonly shareText: string;
  readonly href: string;
};

export type TradeSectorRow = {
  readonly sector: string;
  readonly name: string;
  /** The dataset sector this one rolls into, which names its glyph. */
  readonly rollup: SectorId;
  /** What the United States buys from this government in these goods, a year, in USD millions. */
  readonly imports: number;
  /** What the United States sells it in these goods, a year, in USD millions. */
  readonly exports: number;
  readonly importsText: string;
  readonly exportsText: string;
  /** Whether a tariff is the instrument for these goods; others are licensed or controlled. */
  readonly tariffable: boolean;
  /** Whole percent of tariff in force on the goods the United States buys. */
  readonly tariffPercent: number;
};

export type MeasureRow = {
  readonly id: string;
  readonly kind: TradeMeasureKind;
  readonly kindWord: string;
  readonly sectorName: string;
  /** "25%" for a tariff; absent for a prohibition, which has no rate. */
  readonly rateText?: string;
  readonly since: string;
  /** The administration's own measure, which it can lift; the partner's answer is not its to lift. */
  readonly ours: boolean;
  /** The trade law an American tariff was imposed under, where the save recorded one. */
  readonly statute?: string;
};

export type BilateralTrade = {
  readonly nation: NationId;
  readonly name: string;
  /** This country's share of all US goods trade, 0..1; absent when the United States trades no goods. */
  readonly usShare?: number;
  readonly usShareText?: string;
  /** All goods the United States buys from it and sells it, a year, in USD millions. */
  readonly imports: number;
  readonly exports: number;
  readonly importsText: string;
  readonly exportsText: string;
  /** The gap between the two, in a sentence a reader can use. */
  readonly balanceLine: string;
  readonly sectors: readonly TradeSectorRow[];
  readonly measures: readonly MeasureRow[];
  readonly partners: readonly TradePartnerRow[];
};

const KIND_WORDS: Readonly<Record<TradeMeasureKind, string>> = {
  tariff: "Tariff",
  sanctions: "Sanctions",
  "asset-restriction": "Asset freeze",
  "export-control": "Export controls",
  embargo: "Embargo",
};

/** A share of trade as a reader says it: whole percents once it is large, a tenth of a point while it is small. */
export function formatShare(share: number): string {
  if (share >= 0.1) return formatRatio(share);
  return share < 0.001 ? "Under 0.1%" : `${(share * 100).toFixed(1)}%`;
}

function measureRow(measure: TradeMeasure): MeasureRow {
  return {
    id: measure.id,
    kind: measure.kind,
    kindWord: KIND_WORDS[measure.kind],
    sectorName: measure.kind === "embargo" ? "All goods" : (tradeSector(measure.sector)?.name ?? measure.sector),
    ...(measure.kind === "tariff" ? { rateText: `${Math.round(measure.rate * 100)}%` } : {}),
    since: formatDate(measure.imposedDate),
    ours: measure.origin === "us",
    ...(measure.statute ? { statute: measure.statute } : {}),
  };
}

function balanceLine(imports: number, exports: number, name: string): string {
  const gap = exports - imports;
  if (Math.abs(gap) < 1) return `Trade with ${name} is about even.`;
  return gap < 0 ? `The United States buys ${formatMoney(-gap)} more a year from ${name} than it sells to it.` : `The United States sells ${formatMoney(gap)} more a year to ${name} than it buys from it.`;
}

function partnerRows(campaign: Campaign, nation: NationId): readonly TradePartnerRow[] {
  const dependence = campaign.nations[nation]?.stats.trade.tradeDependence ?? {};
  return Object.entries(dependence)
    .filter(([id, share]) => share > 0 && campaign.nations[id as NationId] !== undefined && id !== nation)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, share]) => ({
      nation: id as NationId,
      name: campaign.nations[id as NationId]!.base.identity.name,
      share,
      shareText: formatShare(share),
      href: place.country(id),
    }));
}

/**
 * One country's trade with the United States and with the world. Undefined for
 * the President's own country and for an id the board does not carry.
 */
export function bilateralTradePartners(campaign: Campaign, nation: NationId): BilateralTrade | undefined {
  const runtime = campaign.nations[nation];
  if (!runtime || nation === campaign.founding.nation) return undefined;
  const name = runtime.base.identity.name;
  const goods = bilateralGoods(campaign, nation);
  const share = goodsTradeShare(campaign, nation);
  return {
    nation,
    name,
    ...(share !== undefined ? { usShare: share, usShareText: formatShare(share) } : {}),
    imports: goods.imports,
    exports: goods.exports,
    importsText: formatMoney(goods.imports),
    exportsText: formatMoney(goods.exports),
    balanceLine: balanceLine(goods.imports, goods.exports, name),
    sectors: tradeEdgesWith(campaign, nation).flatMap((edge): TradeSectorRow[] => {
      const def = tradeSector(edge.sector);
      if (!def) return [];
      return [
        {
          sector: edge.sector,
          name: def.name,
          rollup: def.rollup,
          imports: edge.imports,
          exports: edge.exports,
          importsText: formatMoney(edge.imports),
          exportsText: formatMoney(edge.exports),
          tariffable: def.instrument === "tariff",
          tariffPercent: Math.round(edge.tariffRate * 100),
        },
      ];
    }).sort((a, b) => b.imports + b.exports - (a.imports + a.exports) || a.name.localeCompare(b.name)),
    measures: selectLiveMeasures(campaign)
      .filter((measure) => measure.target === nation)
      .sort((a, b) => b.imposedTurn - a.imposedTurn || a.id.localeCompare(b.id))
      .map(measureRow),
    partners: partnerRows(campaign, nation),
  };
}
