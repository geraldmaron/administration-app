# Home hazard rates and exposure: sources and caveats

Written 2026-10-25 for `src/dataset/state-hazards.ts` (`US_SIGNIFICANT_HAZARDS_PER_YEAR`, `US_HAZARD_RATE_SERIES`, `STATE_HAZARD_EXPOSURE`, `HAZARD_EXPOSURE_FLOOR`, `CITY_TORNADOES_PER_YEAR`) and the engine readers that use them (`packages/engine/src/condition-onset.ts`, `us-placement.ts`, `impact-catalog.ts`, `obligations.ts`). Every source below was opened on 2026-10-25. The counting was done by short scripts over the downloaded files; the rules they applied are stated here so the tables can be rebuilt.

## Sources opened

1. **NOAA NCEI, U.S. Billion-Dollar Weather and Climate Disasters,** `https://www.ncei.noaa.gov/access/billions/events-US-1980-2024.csv` (CPI-adjusted cost, unadjusted cost, deaths per event). NOAA stopped updating the product in 2025; 2024 is its last year. Read for 2005 to 2024 (286 events): severe storms 8.4 a year, tropical cyclones 2.0, flooding 1.45, drought 0.9, wildfire 0.8, winter storms 0.6, freezes 0.15. The drought class carries the heat waves (its events are named "drought and heat wave"). Per-event means and medians for the costliest 40 percent of each type are what the impact catalog is fitted to (see `impact-catalog.ts`). Losses were $137 billion a year unadjusted over 2020 to 2024.
2. **OpenFEMA, `FemaWebDisasterDeclarations` v1,** `https://www.fema.gov/api/open/v1/FemaWebDisasterDeclarations`, filtered to declaration dates 2005-01-01 to 2024-12-31 (2,698 declarations, one row per declaration). Counted per state and divided by twenty: Flood, Mud/Landslide, Dam/Levee Break and Coastal Storm major disasters as flood; Hurricane, Tropical Storm and Typhoon major disasters as cyclone; Winter Storm, Snowstorm, Severe Ice Storm and Freezing major disasters as winter storm; Earthquake major disasters as earthquake; and every Fire declaration (major disaster, emergency and fire-management assistance) as wildfire, because the fire record is in the fire-management grants (992 against 43 fire major disasters). Only the fifty states and DC are kept. FEMA files most flooding under "Severe Storm", so the flood row is a relative weight between states, not a flood count. The record names no heat incident and one drought emergency in the twenty years.
3. **OpenFEMA, `DeclarationDenials` v1,** `https://www.fema.gov/api/open/v1/DeclarationDenials`, request dates 2005 to 2024: 217 major-disaster and 37 emergency turndowns, against about 1,280 major-disaster declarations in source 2.
4. **NOAA Storm Prediction Center, `1950-2024_actual_tornadoes.csv`,** `https://www.spc.noaa.gov/wcm/data/1950-2024_actual_tornadoes.csv`. Read for 1995 to 2024, one row per tornado (year and tornado number unique; segment rows skipped): 1,254 tornadoes and 72 deaths a year. State rows are tornadoes per state divided by thirty. City rows are tornadoes whose track starts or ends within fifteen miles (great-circle) of each dataset city's coordinates, divided by thirty; New York City has ten in the thirty years, Oklahoma City seventy-two.
5. **HHS ASPR, Public Health Emergency Declarations,** `https://aspr.hhs.gov/legal/PHE/Pages/default.aspx`. Initial determinations for disease, 2005 to 2024: 2009 H1N1, 2016 Zika (Puerto Rico), 2020 COVID-19, 2022 mpox. The opioid determination (2017) is not an outbreak and is not counted.
6. **NWS, Weather Related Fatality and Injury Statistics,** `https://www.weather.gov/hazstat/`, with the 2024 summary (`/media/hazstat/sum24.pdf`) and the 80-year fatality table (`/media/hazstat/81year_2025.pdf`). Thirty-year averages, 1996 to 2025: tornado 73 deaths a year, flood 94, hurricane wind 50, heat 180, cold 30, winter 33. Used as a cross-check on annual deaths, not as a fitting target, because Storm Data counts every event and the game's conditions are the significant ones.
7. **FEMA, Notice of Adjustment of Statewide Per Capita Impact Indicator,** Federal Register document 2026-19855 (2026-09-29), `https://www.federalregister.gov/documents/2026/09/29/2026-19855/notice-of-adjustment-of-statewide-per-capita-impact-indicator`: $1.94 per capita for incidents on or after 2025-10-01.
8. **CRS IF12834, *FEMA: Increased Demand and Capacity Strains* (2024-12-02),** `https://www.congress.gov/crs_external_products/IF/PDF/IF12834/IF12834.1.pdf`: 63 major-disaster declarations a fiscal year over the latest ten; Disaster Relief Fund obligations near $40 billion a year since 2020.

## Judgments, not measurements

- **The significant share (`HOME_SIGNIFICANT_SHARE`, 0.4).** A President's condition is the costliest four in ten billion-dollar events. Earthquakes and outbreaks are taken whole, because their series are already declaration-level.
- **Drought and heat split the NOAA drought class evenly** (0.45 a year each).
- **The public share of losses** (a quarter for hazards that destroy structures, one two-hundredth for heat and drought) is an approximation from sources 1, 2 and 8, not a per-event fact.
- **Add-half smoothing** (`HAZARD_EXPOSURE_FLOOR`): an eligible state the record never names keeps half an event over the record's span.

## Not checked

- Hurricane landfall counts by state from NHC HURDAT2 were not opened; the cyclone row is the declaration record.
- No per-city series was built for any hazard but tornadoes.
- The CPI adjustment is NOAA's own.
