# Commodities and price-share sources (W5 prep)

All URLs opened 2026-09-24. Every figure in `commodities.tsv` and `price-shares.tsv` carries a `source_id`
that resolves to a row below. `[F]` marks a fact taken directly from an opened source; `[I]` marks an
inference or a value that could not be pinned to a primary table within this session's research budget.
No figure in either TSV was carried from memory or from a source that was not opened.

## Energy

**EIA-FAQ709**: U.S. Energy Information Administration, "What countries are the top producers and
consumers of oil?" `https://www.eia.gov/tools/faqs/faq.php?id=709&t=6`
[F] Top-ten table for "petroleum and other liquids" (EIA's broad definition, not crude oil alone),
sourced to EIA's International Energy Statistics database, current as of April 11, 2024, covering 2023.
Gives each country's million-barrels-per-day figure and percent of world total, and states the top three
producers (US, Saudi Arabia, Russia) were 44% of the world total that year under this broad definition.

**EIA-TIE64125**: U.S. Energy Information Administration, Today in Energy, "U.S. crude oil production
[2023]," published 2024-03-11. `https://www.eia.gov/todayinenergy/detail.php?id=64125`
[F] Uses EIA's narrower "crude oil" definition (excludes NGLs and other liquids). States 2023 US crude
production of 12.9 million b/d (a record, sixth consecutive year as world's top producer under this
definition), a December 2023 monthly record above 13.3 million b/d, and that the US, Russia and Saudi
Arabia combined were 40% (32.8 million b/d) of 2023 global crude output. This is the source of the gap
between the 22%/44% figures in EIA-FAQ709 (broad "petroleum and other liquids") and the narrower
"crude oil" figures used in the `production_narrow` rows; the two EIA series are not interchangeable
and a writer should not average or mix them.

**EIA-TIE64844**: U.S. Energy Information Administration, Today in Energy, "The United States remained
the world's largest liquefied natural gas exporter in 2024," published 2025-03-27.
`https://www.eia.gov/todayinenergy/detail.php?id=64844`
[F] Ranks the top five 2024 LNG exporters with Bcf/d figures (US 11.9; Australia and Qatar each in a
stable 10.2-10.7 range over 2020-2024; Russia 4.4; Malaysia 3.7), sourced to Cedigaz data cited by EIA.
No world total is given in the article, so no world-share percentage could be computed for these rows.

**EIA-TIE65025**: U.S. Energy Information Administration, Today in Energy, "U.S. natural gas production
remained flat in 2024," published 2025-04-17. `https://www.eia.gov/todayinenergy/detail.php?id=65025`
[F] US-only: marketed production averaged 113 Bcf/d in 2024 (dry gas production 37.72 Tcf for the year,
0.2% above 2023). Explicitly checked and confirmed this article carries no international ranking or
other countries' figures; do not use it as a source for a world natural-gas-production comparison.

**SECONDARY-UNVERIFIED** (natural gas production, non-US countries)
[I] Could not open a primary EIA or IEA table with a clean by-country natural gas production ranking
within this session's budget: EIA's international rankings pages (`eia.gov/international/rankings/...`)
and IEA's `Global Energy Review 2025` natural gas page are both JavaScript-rendered dashboards that a
text fetch cannot read, and IEA returned HTTP 403 to a direct fetch. The US-1073.7-bcm/25.6%-share and
Russia-609.4-bcm/14.5%-share figures, and the Iran/China/Canada/Qatar/Australia rank-order for third
through seventh place, come from search-engine summaries of secondary aggregators (Visual Capitalist,
Investing News Network) that say they are citing IEA or EIA figures, but this session did not open the
underlying IEA table to check the numbers. Treat these rows as directional only. If W5/5E needs
calibration-grade natural gas production shares, pull EIA's International Energy Statistics API or a
downloaded IEA World Energy Balances table directly rather than trusting this note.

## Grain and oilseeds (USDA FAS PSD)

**USDA-GRAIN-2026-09**: USDA Foreign Agricultural Service, "Grain: World Markets and Trade," September
2026 circular. `https://apps.fas.usda.gov/psdonline/circulars/grain.pdf`
[F] Official USDA FAS Production, Supply and Distribution (PSD) tables, released alongside that month's
WASDE. Wheat and corn rows in `commodities.tsv` are drawn from "World Wheat Production, Consumption, and
Stocks," "World Wheat, Flour, and Products Trade," "World Corn Production, Consumption, and Stocks," and
"World Corn Trade"; all using each table's **2024/25 column**, the last fully realized marketing year in
this September 2026 release, not the still-moving 2026/27 forecast column the same tables also carry.
Marketing years are local per country (see the circular's "Other Notes" page for each major exporter's
window); trade-year figures are normalized to a uniform July/June (wheat) or October/September (corn)
window across countries for comparability, per the circular's own endnote. World totals in each `WORLD_TOTAL`
row are the table's own "World Total" line, not a sum I recomputed.

**USDA-OILSEEDS-2026-09**: USDA Foreign Agricultural Service, "Oilseeds: World Markets and Trade,"
September 2026 circular. `https://apps.fas.usda.gov/psdonline/circulars/oilseeds.pdf`
[F] Soybean rows are drawn from "Table 16: World Soybeans and Products Supply and Distribution" (world
totals, million MT, aggregate of local marketing years), "Table 21: United States Soybeans..." (local MY
September/August), "Table 22: Brazil Soybeans..." (local MY January/December) and "Table 23: Argentina
Soybeans..." (local MY April/March), all using the **2024/25 row**. China's domestic soybean production
figure (20,650 thousand MT) is from "Table 27: China Oilseeds and Products," 2024/25 column; China's much
larger soybean **import** figure (around 108,000 thousand MT that year, visible in the same table) is not
reproduced in `commodities.tsv` since the brief asked for producers and exporters, but a writer should
know China is the demand side of this market, not a supply side.
[I] Table figures for individual countries were read by extracting the PDF pages as rendered images and
transcribing the printed numbers; USDA's own PSD Online database (`fas.usda.gov/data/production`) is the
authoritative machine-readable source if a figure here needs to be re-verified to the exact digit.

## Minerals and fertilizer (USGS Mineral Commodity Summaries 2025)

All four of the following are chapters of the same document: U.S. Geological Survey, *Mineral Commodity
Summaries 2025*, released January 2025 (data year 2024, current-year figures marked "e" for estimated in
the source and carried as `2024e` in the TSV; the rare earths chapter's headline figures are not "e"-flagged
in the source, so that vintage is written as plain `2024`). Top-level document:
`https://pubs.usgs.gov/periodicals/mcs2025/mcs2025.pdf`.

**USGS-MCS2025-COPPER**: `https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-copper.pdf`
[F] "World Mine and Refinery Production and Reserves" table, 2024e mine-production column, copper content.
Also carries US-specific detail (Arizona ~70% of US mine output) and notes China's refinery output (about
12,000 thousand MT) far exceeds its mine output (1,800 thousand MT); China refines ore it does not mine.

**USGS-MCS2025-LITHIUM**: `https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-lithium.pdf`
[F] "World Mine Production and Reserves" table, 2024e column, lithium content. US production is marked
"W" (withheld to avoid disclosing company proprietary data) in the source itself, and the source's own
"World total" excludes the US for this reason; carried into the TSV as `WORLD_TOTAL_EX_US`, not a plain
world total. US net import reliance "over 50%" is stated directly in the source's salient-statistics table.

**USGS-MCS2025-RAREEARTHS**: `https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-rare-earths.pdf`
[F] "World Mine Production and Reserves" table, 2024 column, REO (rare-earth-oxide) equivalent. Burma,
Thailand and Nigeria figures are themselves footnoted by USGS as "estimated based on reported import data
for China" (source: Zen Innovations, Global Trade Tracker), not those governments' own statistics; carried
into the TSV note. Separately, the chapter's "Import Sources" line states US imports of rare-earth
compounds and metals were 70% from China, 13% Malaysia, 6% Japan, 5% Estonia (2020-23 average); this is
downstream processing dependency, a materially different and tighter chokepoint than the mining share, and
is called out in the `WORLD_TOTAL` row's note so a writer does not conflate the two.

**USGS-MCS2025-POTASH**: `https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-potash.pdf`
[F] "World Mine Production and Reserves" table, 2024e column, K2O equivalent. The source's own narrative
text separately states Canada was "the leading exporter of potash in the world in 2024" (not a table figure)
and describes Belarus's sanctioned exporter rerouting shipments via Russian ports and rail to China after
Lithuania ended port-transit access in 2022; both carried as notes since they are text claims, not the
tabulated production figures.

**USGS-MCS2025-NITROGEN**: `https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-nitrogen.pdf`
[F] "World Ammonia Production and Reserves" table, 2024e column, nitrogen content. This chapter is titled
"Nitrogen (Fixed)—Ammonia," and USGS does not publish a separate by-country urea production table in this
document; ammonia is urea's feedstock (about 88% of US ammonia output goes to fertilizer use, including
urea, per the source), so the ammonia figures are the closest primary-sourced proxy available for urea
capacity, not urea itself. Flagged in every `nitrogen_ammonia` row's note.

## Retail price components and consumer-basket weights

**EIA-GASEXPLAINED**: U.S. Energy Information Administration, "Gasoline explained: Factors affecting
gasoline prices." `https://www.eia.gov/energyexplained/gasoline/factors-affecting-gasoline-prices.php`
[F] Gives the retail-gasoline-price component breakdown (crude oil / refining costs and profit /
distribution and marketing / taxes) both as a 2025 annual average and as a 2016-2025 ten-year average.
The 2025 average retail price for regular gasoline was $3.10/gallon. Two independent reads of this page
(one via a search-engine synthesis, one via a direct fetch of the page) disagreed on which of "refining"
and "taxes" was 14.3% versus 16.6% for the 2025 figure; the TSV uses the direct-fetch reading of the primary
page (refining 14.3%, taxes 16.6%) as the more trustworthy of the two, and this note records the discrepancy
so it can be re-checked against the live page rather than silently trusted.

**USDA-ERS-FOODDOLLAR**: USDA Economic Research Service, "Food Dollar Series: Summary Findings."
`https://www.ers.usda.gov/data-products/food-dollar/summary-findings`
[F] States the 2024 farm share (11.8 cents per dollar of domestically produced food, at-home plus
away-from-home combined) and marketing share (88.2 cents), and names food services (38.6 cents), the three
farm-production sub-lines (crops 2.5, livestock 3.3, forestry/fishing/ag services 0.9) and agribusiness (3.0
cents) as industry-group shares.
[I] The summary-findings page, as fetched in this session, did not surface individual cents-per-dollar
figures for the remaining named industry groups in ERS's fuller series (food processing, packaging,
transportation, wholesale trade, retail trade, energy, non-agribusiness finance and insurance, advertising,
legal and accounting); these are folded into the `other_industry_groups_unallocated` residual row
(100 minus the six named shares) rather than invented. The full disaggregated table lives in ERS's
underlying data files (`ers.usda.gov/data-products/food-dollar-series/documentation`); pull that directly
if W5 needs a specific one of those groups.

**BLS-CPI-RI-2025**: U.S. Bureau of Labor Statistics, "Relative importance of components in the Consumer
Price Indexes: U.S. city average, December 2025."
`https://www.bls.gov/cpi/tables/relative-importance/2025.htm`
[F] CPI-U relative-importance table (percent of all items), priced on 2024 expenditure weights, for food,
food at home, food away from home, energy, energy commodities, gasoline (all types), energy services,
electricity, and utility (piped) gas service. Every value in the `cpi_relative_importance` rows is read
directly off this table with no arithmetic applied.

## What this note does not cover

- No LNG or natural gas world-total denominator was found in an opened primary source, so no world-share
  percentage could be computed for the `lng` rows (values are absolute Bcf/d only).
- Coal, uranium, steel/iron ore, aluminum, and other bulk commodities the brief did not ask for are not
  in either TSV.
- Every figure is a **production or export share**, not a price-elasticity or a tariff-pass-through
  estimate; W5/5E's rate and pass-through modeling needs separate research if it is to cite a magnitude
  for how a supply shock in one of these rows would move a price.

## Revision pass (2026-09-24)

A second session checked both tables against the W5 briefs and the adversarial review (`../challenge.md` F5). It added `price-anchors.tsv` and corrected `price-shares.tsv`. Every source below was opened on 2026-09-24; reads through the fetch tool are marked, because its small model can misread a chart.

**EIA-STEO-2026-09**: U.S. Energy Information Administration, *Short-Term Energy Outlook*, global oil section, released 2026-09-09. `https://www.eia.gov/outlooks/steo/report/global_oil.php` (read through the fetch tool). [F] Brent averaged $69 a barrel in 2025 (historical); forecasts of $91 for 2026 and $74 for 2027; August 2026 averaged $91, $7 above July, with Middle East exports constrained and a renewed US blockade of Iran's oil exports after attacks on tankers in the Strait of Hormuz. EIA's annual spot-price history pages (`/dnav/pet/hist/RBRTEA.htm`, `RWTCA.htm`) did not render through the fetch tool.

**USDA-WASDE-675**: USDA, *World Agricultural Supply and Demand Estimates*, WASDE-675, 2026-09-11. `https://www.usda.gov/oce/commodity/wasde/wasde0926.pdf` (the PDF was saved and its pages 1, 11, 12 and 15 read as images). [F] Season-average farm prices, dollars a bushel: wheat 5.52 (2024/25), 5.06 (2025/26 estimate), 6.40 (2026/27 projection); corn 4.24, 4.15, 4.80; soybeans 10.00, 10.50, 12.00.

**EIA-GASDIESEL**: EIA, *Gasoline and Diesel Fuel Update*. `https://www.eia.gov/petroleum/gasdiesel/` (read through the fetch tool). [F] The May 2026 breakdown of a $4.48 gallon of regular: crude oil 52%, refining 22%, distribution and marketing 15%, taxes 12%.

**EIA-GASEXPLAINED, re-read.** A fourth read of the "Factors affecting gasoline prices" page returned crude 51.4% again, but put refining at 16.6% and taxes at 14.3% (and, for 2016-2025, refining 17.4%, taxes 15.0%), the reverse of this table's reading. Across the researcher's two reads, the challenge's two and this one, only crude's share never moved. Arithmetic favors this table's reading: taxes are a per-gallon amount, and 16.6% of $3.10 (about 51 cents) sits close to May 2026's 12% of $4.48 (about 54 cents), while 14.3% (about 44 cents) does not (inference). The pump price therefore scales only the crude share and holds taxes as cents (`../briefs.md` 5E-AC4); the three smaller labels are not test values.

**USDA-ERS-FOODDOLLAR, re-read.** The summary findings page (`https://www.ers.usda.gov/data-products/food-dollar/summary-findings`, read through the fetch tool) carries three series, and the first pass mixed two of them:
- *Marketing bill series:* farm share 11.8 cents and marketing share 88.2 for all food in 2024; **food at home 18.5 cents** (18.4 in 2023); food away from home 7.1 cents (7.5 in 2023).
- *Industry group series:* farm production 6.7 cents (crops 2.5, livestock 3.3, forestry, fishing and agricultural services 0.9); agribusiness 3.0; food services 38.6. The page itemizes no other group.
- *Primary factor series:* salaries and benefits 54.1, property income 32.7, output taxes 7.2.

So crops' 2.5 cents is part of the industry group series' 6.7-cent farm production group, not of the marketing bill's 11.8-cent farm share, and the old residual (40.9) mixed the two series. The corrected residual is 51.7 inside the industry group series. The grocery bill reads the food-at-home farm share (18.5 cents). The page gives no crop share for food at home; applying the all-food industry group's crop fraction (2.5 of 6.7) to it is inference and is labeled as a planning value where 5E uses it.
