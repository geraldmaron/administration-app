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

export type ChokepointFlowRow = {
  readonly chokepoint: string;
  readonly commodity: string;
  /** The governments on its shores: a war with any of them as a party contests the strait. */
  readonly littoral: readonly string[];
  /** 0..1 of world supply of the commodity that passes the strait. */
  readonly share: number;
  /** 0..1 of the strait's own flow a pipeline or a sea detour can carry when it is shut. */
  readonly bypass: number;
  readonly basis: string;
  readonly source: string;
  readonly opened: string;
};

const WOTC = "https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/";
const TIE_HORMUZ = "https://www.eia.gov/todayinenergy/detail.php?id=65504";
const TIE_RED_SEA = "https://www.eia.gov/todayinenergy/detail.php?id=63446";

// prettier-ignore
export const CHOKEPOINT_FLOWS: readonly ChokepointFlowRow[] = [
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
  // "a third of globally traded urea" (UN News 1168074, 2026-08-04, opened 2026-10-25), stated
  // over the nitrogen market's own denominator, world ammonia production in nitrogen terms
  // (150,000 kt N, USGS Mineral Commodity Summaries 2025, the producer table's source): world
  // urea trade is at least 37.6 Mt in 2023 (WITS HS 310210, the larger of reported exports and
  // imports, opened 2026-10-25; India, Russia and Qatar do not report, so this undercounts), urea
  // is 46.65 percent nitrogen, so the strait's urea is at least 5.8 Mt N: 0.039, a lower bound.
  { chokepoint: "CP-HORMUZ", commodity: "nitrogen", littoral: ["IRN", "OMN"], share: 0.039, bypass: 0, basis: "a third of globally traded urea (UN News, 2026-08-04); traded urea at least 37.6 Mt in 2023 (WITS, the larger of reported exports and imports, an undercount: India, Russia and Qatar do not report), 46.65 percent nitrogen, so at least 5.8 Mt N, of 150,000 kt N world ammonia production (USGS MCS 2025): 0.039; no pipeline carries urea, so no bypass", source: "https://news.un.org/en/story/2026/08/1168074 https://wits.worldbank.org/trade/comtrade/en/country/ALL/year/2023/tradeflow/Exports/partner/WLD/product/310210 https://wits.worldbank.org/trade/comtrade/en/country/ALL/year/2023/tradeflow/Imports/partner/WLD/product/310210", opened: "2026-10-25" },
];
