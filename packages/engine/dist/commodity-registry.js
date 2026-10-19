import { CHOKEPOINT_FLOWS, COMMODITY_PRODUCERS } from "@admin/world";
import { COMMODITY_IDS, openingCommodityIndex } from "./commodities.js";
const ENERGY = { sensitivity: 2.5, speed: 0.35, weeklyCap: 0.12, spare: 0.03, coverWeeks: 8, elasticity: 0.08, residual: 0.01 };
const GAS = { ...ENERGY, spare: 0.01, coverWeeks: 10 };
/**
 * Crude's sensitivity, fitted to the 2026 closure of Hormuz fed as net supply
 * lost. EIA's Short-Term Energy Outlook puts Brent at $71 on February 27, the
 * day before the closure (March 2026 edition), a March average of $103 (April
 * edition) and an April average of $117 (July edition), with production shut
 * in at 8.89 Mb/d in March and 10.4 in April (July edition, Table 1) against
 * world production of 108.42 Mb/d in 4Q25 (October edition, Table 3a); all
 * opened 2026-10-13 at https://www.eia.gov/outlooks/steo/. Fed those losses
 * and a full-intensity Hormuz route's risk, the kernel at 2.5 read 22% under
 * April. At 5 it reads $100 at week 4 (3% under March) and $109 at week 8 (7%
 * under April), inside a tolerance of 10% at each, and a full-intensity war on
 * the Bab el-Mandeb still moves Brent under 5% in twelve weeks, as 2024 did
 * (Brent $83 in November 2023 and $81 for 2024, EIA). No gas case is sourced,
 * so the gas markets keep the planning value.
 */
const CRUDE = { ...ENERGY, sensitivity: 5 };
const FOOD = { sensitivity: 2, speed: 0.2, weeklyCap: 0.08, spare: 0, coverWeeks: 16, elasticity: 0.08, residual: 0.008 };
const FERTILIZER = { sensitivity: 1.8, speed: 0.15, weeklyCap: 0.08, spare: 0.01, coverWeeks: 12, elasticity: 0.1, residual: 0.008 };
const METAL = { sensitivity: 1.5, speed: 0.2, weeklyCap: 0.06, spare: 0.01, coverWeeks: 6, elasticity: 0.1, residual: 0.01 };
const MINERAL = { sensitivity: 2.5, speed: 0.1, weeklyCap: 0.1, spare: 0, coverWeeks: 10, elasticity: 0.06, residual: 0.01 };
/**
 * Every sourced strait the commodity passes, from the world's flow table
 * (`CHOKEPOINT_FLOWS`). A strait with no row there has no price effect, which
 * is the honest reading of a flow or a bypass nobody has measured.
 */
function routesFor(id) {
    return CHOKEPOINT_FLOWS.filter((row) => row.commodity === id).map((row) => ({
        chokepoint: row.chokepoint,
        share: row.share,
        bypass: row.bypass,
        littoral: row.littoral,
        provenance: `${row.basis} (${row.source}, opened ${row.opened})`,
    }));
}
const HARVEST = ["drought", "flood", "heat-wave", "wildfire"];
export const COMMODITY_DEFS = {
    crude: { id: "crude", name: "Crude oil", family: "crude", reader: "pump", params: CRUDE, routes: routesFor("crude"), inputs: [], hitBy: ["cyclone"] },
    "natural-gas": {
        id: "natural-gas",
        name: "Natural gas",
        family: "gas",
        reader: "home-energy",
        params: GAS,
        routes: [],
        inputs: [],
        hitBy: ["cyclone", "winter-storm"],
        // Planning values: the only non-US gas shares on file are unverified secondary reads.
        planningProducers: { USA: 0.25, RUS: 0.15, IRN: 0.06, CHN: 0.06, CAN: 0.05, QAT: 0.04 },
    },
    lng: {
        id: "lng",
        name: "Liquefied natural gas",
        family: "gas",
        reader: "home-energy",
        params: GAS,
        routes: routesFor("lng"),
        inputs: [],
        hitBy: ["cyclone"],
        // Planning values: EIA gives the five largest exporters' volumes and no world total.
        planningProducers: { USA: 0.22, AUS: 0.19, QAT: 0.19, RUS: 0.08, MYS: 0.07 },
    },
    wheat: { id: "wheat", name: "Wheat", family: "grains", reader: "grocery", params: FOOD, routes: [], inputs: [{ from: "nitrogen", weight: 0.1, lagWeeks: 26 }], hitBy: HARVEST },
    corn: { id: "corn", name: "Corn", family: "grains", reader: "grocery", params: FOOD, routes: [], inputs: [{ from: "nitrogen", weight: 0.15, lagWeeks: 26 }], hitBy: HARVEST },
    soybeans: { id: "soybeans", name: "Soybeans", family: "grains", reader: "grocery", params: FOOD, routes: [], inputs: [{ from: "potash", weight: 0.08, lagWeeks: 26 }], hitBy: HARVEST },
    potash: { id: "potash", name: "Potash", family: "fertilizer", reader: "farm-costs", params: FERTILIZER, routes: [], inputs: [], hitBy: [] },
    nitrogen: { id: "nitrogen", name: "Nitrogen fertilizer", family: "fertilizer", reader: "farm-costs", params: FERTILIZER, routes: [], inputs: [{ from: "natural-gas", weight: 0.5, lagWeeks: 8 }], hitBy: [] },
    copper: { id: "copper", name: "Copper", family: "metals", reader: "factory-inputs", params: METAL, routes: [], inputs: [], hitBy: ["earthquake", "flood"] },
    lithium: { id: "lithium", name: "Lithium", family: "minerals", reader: "defense-tech", params: MINERAL, routes: [], inputs: [], hitBy: [] },
    "rare-earths": { id: "rare-earths", name: "Rare earths", family: "minerals", reader: "defense-tech", params: MINERAL, routes: [], inputs: [], hitBy: [] },
};
const ANCHORED = new Set(["crude", "wheat", "corn", "soybeans"]);
export function isAnchored(id) {
    return ANCHORED.has(id);
}
/**
 * The level a market rests at: the opening planning ratio for a commodity with
 * a sourced anchor, 1 for the rest, which have no sourced price and are read as
 * an index on the oath.
 */
export function referenceIndex(id) {
    return isAnchored(id) ? openingCommodityIndex(id) : 1;
}
function sourcedShares(id, metric) {
    return COMMODITY_PRODUCERS.filter((row) => row.commodity === id && row.metric === metric).map((row) => ({ nation: row.nation, share: row.share }));
}
/** Each listed producer's share of world output, from the production rows alone. */
export function productionShares(id) {
    return sourcedShares(id, "production");
}
const sharesCache = new Map();
/**
 * Who supplies the world market. A grain's world price is set by what is
 * traded, so where the table carries exporters their shares stand in for the
 * market; elsewhere production does, and a commodity with neither on file reads
 * its planning shares.
 */
export function supplierShares(id) {
    const known = sharesCache.get(id);
    if (known)
        return known;
    const exports = sourcedShares(id, "exports");
    const production = sourcedShares(id, "production");
    const planning = Object.entries(COMMODITY_DEFS[id].planningProducers ?? {}).map(([nation, share]) => ({ nation: nation, share }));
    const shares = exports.length > 0 ? exports : production.length > 0 ? production : planning;
    sharesCache.set(id, shares);
    return shares;
}
/** A nation's share of the world market for one commodity, 0 where it is not a listed supplier. */
export function supplierShare(id, nation) {
    return supplierShares(id).find((row) => row.nation === nation)?.share ?? 0;
}
export const COMMODITY_FAMILIES = ["crude", "gas", "grains", "fertilizer", "metals", "minerals"];
export function commoditiesIn(family) {
    return COMMODITY_IDS.filter((id) => COMMODITY_DEFS[id].family === family);
}
