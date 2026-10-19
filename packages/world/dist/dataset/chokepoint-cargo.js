// Where a strait's cargo is bound: `seed/chokepoint-cargo.tsv`, cell for cell.
// A government that closes a strait can let ships bound for its friends through
// and stop the rest, so what a closure takes off the market depends on whose
// cargo it stops. A destination the source does not split by country is a
// bucket no denier can tell apart, and is stopped with any ship. A strait with
// no rows here is closed to every flag alike.
//
// Source, opened 2026-10-13: EIA, "World Oil Transit Chokepoints" (updated
// 2026-03-03), Figure 5 data, "ByDestination" sheet (crude oil and condensate
// through the Strait of Hormuz by destination, first half of 2025):
// https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/excel/Chokepoints_FY2026_F5.xlsx
/** The destinations the source names only as a region or a remainder. */
export const CARGO_BUCKETS = ["other-asia-oceania", "europe", "other"];
const F5 = {
    period: "1H25",
    source: "https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/excel/Chokepoints_FY2026_F5.xlsx",
    opened: "2026-10-13",
};
// prettier-ignore
export const CHOKEPOINT_CARGO = [
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "CHN", mbd: 5.4, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "IND", mbd: 2.049, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "KOR", mbd: 1.747, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "JPN", mbd: 1.705, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "other-asia-oceania", mbd: 2.257, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "europe", mbd: 0.586, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "USA", mbd: 0.427, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "SAU", mbd: 0.018, ...F5 },
    { chokepoint: "CP-HORMUZ", commodity: "crude", destination: "other", mbd: 0.557, ...F5 },
];
