// Where a strait's cargo is loaded: `seed/chokepoint-origins.tsv`, cell for cell. An exporter
// behind a strait the war closes loses the share of its sales abroad that loads there; the reader is
// `packages/engine/src/commodity-pressure.ts#strandedShare`. A strait or a commodity with no rows here
// falls back to the exporter's authored dependence on the strait (`geo.chokepointDependence`).
//
// Source, opened 2026-10-25: EIA, "World Oil Transit Chokepoints" (updated 2026-03-03), Figure 5
// data, "CrudeByOrigin_F5" sheet (crude oil and condensate through the Strait of Hormuz by origin,
// first half of 2025):
// https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/excel/Chokepoints_FY2026_F5.xlsx
const F5 = { period: "1H25", source: "https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/excel/Chokepoints_FY2026_F5.xlsx", opened: "2026-10-25" };
// prettier-ignore
export const CHOKEPOINT_ORIGINS = [
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "SAU", mbd: 5.553, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "IRQ", mbd: 3.285, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "ARE", mbd: 2.052, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "IRN", mbd: 1.594, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "KWT", mbd: 1.49, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "QAT", mbd: 0.663, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", origin: "other", mbd: 0.109, ...F5 },
];
