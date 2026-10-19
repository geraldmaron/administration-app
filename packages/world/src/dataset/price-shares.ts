// What share of a household price each component carries: `seed/price-shares.tsv`,
// cell for cell. The series column keeps the food dollar's marketing bill and
// its industry groups apart, because a share read across the two is wrong.

export type PriceShareRow = {
  readonly reading: string;
  readonly component: string;
  /** 0..1 of the reading. */
  readonly share: number;
  readonly series: string;
  readonly period: string;
  readonly source: string;
  readonly opened: string;
};

// prettier-ignore
export const PRICE_SHARES: readonly PriceShareRow[] = [
  { reading: "gasoline_price", component: "crude_oil", share: 0.514, series: "EIA retail breakdown", period: "2025_annual_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "refining_costs_and_profit", share: 0.143, series: "EIA retail breakdown", period: "2025_annual_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "distribution_and_marketing", share: 0.178, series: "EIA retail breakdown", period: "2025_annual_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "taxes", share: 0.166, series: "EIA retail breakdown", period: "2025_annual_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "crude_oil", share: 0.517, series: "EIA retail breakdown", period: "2016-2025_10yr_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "refining_costs_and_profit", share: 0.15, series: "EIA retail breakdown", period: "2016-2025_10yr_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "distribution_and_marketing", share: 0.159, series: "EIA retail breakdown", period: "2016-2025_10yr_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "taxes", share: 0.174, series: "EIA retail breakdown", period: "2016-2025_10yr_avg", source: "EIA-GASEXPLAINED", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "crude_oil", share: 0.52, series: "EIA retail breakdown", period: "2026-05", source: "EIA-GASDIESEL", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "refining_costs_and_profit", share: 0.22, series: "EIA retail breakdown", period: "2026-05", source: "EIA-GASDIESEL", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "distribution_and_marketing", share: 0.15, series: "EIA retail breakdown", period: "2026-05", source: "EIA-GASDIESEL", opened: "2026-09-24" },
  { reading: "gasoline_price", component: "taxes", share: 0.12, series: "EIA retail breakdown", period: "2026-05", source: "EIA-GASDIESEL", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_share", share: 0.118, series: "marketing bill", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "marketing_share", share: 0.882, series: "marketing bill", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_share_food_at_home", share: 0.185, series: "marketing bill", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_share_food_away_from_home", share: 0.071, series: "marketing bill", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "food_services_industry_group", share: 0.386, series: "industry group", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_production_industry_group", share: 0.067, series: "industry group", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_production_crops", share: 0.025, series: "industry group", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_production_livestock", share: 0.033, series: "industry group", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "farm_production_forestry_fishing_ag_services", share: 0.009, series: "industry group", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "food_dollar", component: "agribusiness", share: 0.03, series: "industry group", period: "2024", source: "USDA-ERS-FOODDOLLAR", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "food", share: 0.13698, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "food_at_home", share: 0.08325, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "food_away_from_home", share: 0.05373, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "energy", share: 0.06383, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "energy_commodities", share: 0.0312, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "gasoline_all_types", share: 0.02895, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "energy_services", share: 0.03262, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "electricity", share: 0.02489, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
  { reading: "cpi_relative_importance", component: "utility_piped_gas_service", share: 0.00773, series: "CPI-U relative importance", period: "2025-12", source: "BLS-CPI-RI-2025", opened: "2026-09-24" },
];
