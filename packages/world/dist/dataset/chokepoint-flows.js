// What passes each strait and what can go around it: `seed/chokepoint-flows.tsv`,
// cell for cell. A strait reaches a world price only through a row here, and a
// row exists only where both the flow and the bypass were read off a page: a
// strait whose detour has no stated capacity is left without a price effect
// rather than given an invented one.
//
// Sources, opened 2026-10-13:
// - EIA, "World Oil Transit Chokepoints" (updated 2026-03-03), Table 1 and the
//   Hormuz section: https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/
// - EIA, Today in Energy, "Amid regional conflict, the Strait of Hormuz remains
//   critical oil chokepoint" (2025-06-16): https://www.eia.gov/todayinenergy/detail.php?id=65504
// - EIA, Today in Energy, "Red Sea disruptions increase oil flows around Cape of
//   Good Hope" (2024-10-11): https://www.eia.gov/todayinenergy/detail.php?id=63446
const WOTC = "https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/";
const TIE_HORMUZ = "https://www.eia.gov/todayinenergy/detail.php?id=65504";
const TIE_RED_SEA = "https://www.eia.gov/todayinenergy/detail.php?id=63446";
// prettier-ignore
export const CHOKEPOINT_FLOWS = [
    // 20.9 Mb/d of 104.4 Mb/d world liquids supply in 1H25 (WOTC Table 1); "about
    // 2.6 million b/d of capacity from the Saudi and UAE pipelines could be
    // available to bypass" (TIE 65504): 2.6 / 20.9 = 0.124.
    { chokepoint: "CP-HORMUZ", commodity: "crude", littoral: ["IRN", "OMN"], share: 0.2, bypass: 0.124, basis: "20.9 of 104.4 Mb/d world liquids supply (1H25); 2.6 Mb/d of spare Saudi and UAE pipeline capacity over the 20.9", source: `${WOTC} ${TIE_HORMUZ}`, opened: "2026-10-13" },
    // "around one-fifth of global liquefied natural gas trade also transited the
    // Strait of Hormuz in 2024" (TIE 65504). The bypass pipelines it names are
    // crude lines, so nothing carries the LNG around.
    { chokepoint: "CP-HORMUZ", commodity: "lng", littoral: ["IRN", "OMN"], share: 0.2, bypass: 0, basis: "about one-fifth of world LNG trade (2024); the bypass pipelines EIA names carry crude and none carries LNG", source: TIE_HORMUZ, opened: "2026-10-13" },
    // 8.7 Mb/d in 2023 (TIE 63446) of 102.6 Mb/d world liquids supply in 2023
    // (WOTC Table 1): 0.085. Under the Houthi attacks the strait fell to 4.0 Mb/d
    // while the Cape route rose from 6.0 to 9.2 (TIE 63446): 3.2 of the 4.7 lost
    // went around, 0.68.
    { chokepoint: "CP-BAB-EL-MANDEB", commodity: "crude", littoral: ["YEM", "DJI", "ERI"], share: 0.085, bypass: 0.68, basis: "8.7 Mb/d in 2023 of 102.6 Mb/d world liquids supply; under attack in 2024 the strait lost 4.7 Mb/d and the Cape gained 3.2", source: `${TIE_RED_SEA} ${WOTC}`, opened: "2026-10-13" },
];
