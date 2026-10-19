import { bilateralGoods, selectLiveMeasures, tradeEdgesWith, tradeSector, } from "@admin/engine";
import { formatDate, formatRatio } from "../format/figures";
import { formatMoney } from "../format/money";
import { place } from "../navigation/places";
import { goodsTradeShare } from "./standing";
const KIND_WORDS = {
    tariff: "Tariff",
    sanctions: "Sanctions",
    "asset-restriction": "Asset freeze",
    "export-control": "Export controls",
    embargo: "Embargo",
};
/** A share of trade as a reader says it: whole percents once it is large, a tenth of a point while it is small. */
export function formatShare(share) {
    if (share >= 0.1)
        return formatRatio(share);
    return share < 0.001 ? "Under 0.1%" : `${(share * 100).toFixed(1)}%`;
}
function measureRow(measure) {
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
function balanceLine(imports, exports, name) {
    const gap = exports - imports;
    if (Math.abs(gap) < 1)
        return `Trade with ${name} is about even.`;
    return gap < 0 ? `The United States buys ${formatMoney(-gap)} more a year from ${name} than it sells to it.` : `The United States sells ${formatMoney(gap)} more a year to ${name} than it buys from it.`;
}
function partnerRows(campaign, nation) {
    const dependence = campaign.nations[nation]?.stats.trade.tradeDependence ?? {};
    return Object.entries(dependence)
        .filter(([id, share]) => share > 0 && campaign.nations[id] !== undefined && id !== nation)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([id, share]) => ({
        nation: id,
        name: campaign.nations[id].base.identity.name,
        share,
        shareText: formatShare(share),
        href: place.country(id),
    }));
}
/**
 * One country's trade with the United States and with the world. Undefined for
 * the President's own country and for an id the board does not carry.
 */
export function bilateralTradePartners(campaign, nation) {
    const runtime = campaign.nations[nation];
    if (!runtime || nation === campaign.founding.nation)
        return undefined;
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
        sectors: tradeEdgesWith(campaign, nation).flatMap((edge) => {
            const def = tradeSector(edge.sector);
            if (!def)
                return [];
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
