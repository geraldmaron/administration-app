# Society and population data model: research brief

Written 2026-10-13 for the owner's data-model pass. Research only; no source was modified. Owner's instruction: "Illnesses, unrest, fatality rates and more should play into population counts in the game." Standard: no precedent, best for the game, no assumptions.

## 0. Recommendation first

1. **Replace the single national population scalar with a ledger: state × age band × sex, updated weekly.** Births, deaths (by cause), international migration and domestic migration are the four flows. Everything else a player reads about population (national total, median age, life expectancy, 65-plus share, natural increase, cohort age shares) is derived from the ledger and never stored. This is the smallest structure that lets illness, unrest, war, disasters and overdoses change counts through a named channel, and it matches DECISIONS 1.10 (derived readings are recomputed) and 4.4 (decompositions sum to aggregates).
2. **Treat international migration as the largest population lever in the game, by an order of magnitude.** In the Census Bureau's own accounting it moved from 2.73 million to 1.26 million in one year, a 0.43% of population swing. COVID-19 excess deaths over three years were about 0.40% of population. Overdose, flu, homicide, disasters and the US wars sit at 0.0002% to 0.03% a year. A game that lets disasters or crime "visibly move" the national count would be inventing a scale. [C from O data, section 3.1]
3. **Make events visible as flows, not stocks.** At national level the stock hardly moves in 4 to 8 years (natural increase is 0.15% a year). Show weekly deaths against an expected band (2019 weekly deaths ran 51,134 to 58,675, sd 4.7% of the mean), a cause-of-death ledger, and excess deaths. At state and city level stocks do move (Katrina: New Orleans city -53% in one year; Florida's domestic net migration fell 93% in three years), so show stocks there.
4. **Model fully:** the population ledger and its four flows; an age-banded epidemic engine with hospital-capacity coupling; overdose as a trending stock-flow; disaster and war tolls as sourced, lagged, state-located events; immigration as a policy flow with separate inflow and outflow; health-insurance coverage as a policy stock; the unrest condition with a heavy-tailed event-size draw. **Derive:** life expectancy, median age, dependency ratios, violent-crime rate, incarceration rate, poverty rate. **Keep as perception layers with their own lag:** crime perception, institutional trust, media trust. **Skip as dynamics:** education attainment, media-platform mix, volunteering, the climate trend (hold as authored exposure drift).
5. **Do not give officials or the President an unsourced coefficient on deaths or damage.** No source I could open quantifies lives saved by a FEMA director's competence. The sourced levers are timing of declarations and relief, the preparedness-to-damage ratio ($1 averts about $15, Healy and Malhotra), and electoral blame. Competence therefore modulates speed, information quality and blame, not the death toll. Section 5.
6. **Verdict: accepted with controls** (section 8). The strongest failure mode is false precision on series that disagree with each other (Census 1.3 million vs CBO's reported 410,000 net immigration for 2025; FBI vs NCVS crime; CDC's two excess-death totals). Carry bands, label provisional vs final, and report with a lag.

## 1. How to read this document

Every number carries a tag. This follows the sibling briefs in this folder.

- **[O]** read on a page, PDF or open-data API response I opened this session. URL or query in section 10.
- **[C]** computed by me from [O] data. The method is stated beside it.
- **[S]** appeared only in a search-result summary, or in a secondary page whose primary I could not open. Unverified; do not build on it without opening the source.
- **[D]** design judgment. No source; stated so it can be challenged.

Access limits that shaped sources. fbi.gov, ucr.fbi.gov, cde.ucr.cjis.gov, the Gallup crime topic page, cbo.gov, the NCBI/PMC article host, the Cambridge journal pages and the AmeriCorps release returned HTTP 403, 404 or an unusable page to my fetches. FBI 2024 figures below come from an AP story on PBS [O], not the FBI. CBO figures are [S]. The Crowd Counting Consortium (CCC) bulk files were not reachable, so 2025 protest counts come from CCC authors' analysis reposted by ZNet [O] and from the Harvard Ash Center's 2021 article on 2020 [O], not from my own pass over the data. Census API calls needed a key; I used the Census Vintage 2025 state CSV instead [O].

Date notes. Today is 2026-10-13. Census Vintage 2025 (released 2026-01-27) and the 2025 income, poverty and insurance report (2026-09-15) are the latest. CDC's overdose page reports data as of 2026-09-06. NOAA's billion-dollar disaster series ends with 2024; the archived climate.gov page states it is not updated [O].

## 2. What the repo does today (observed)

- `packages/engine/src/vitals.ts` applies `population' = population × (1 + (birthRate − deathRate + netMigration) × yearFraction)` weekly. The three rates are authored dataset values with no engine writer; they stay constant for the campaign. The nation's population is distributed to states pro rata. A `PopulationTollEffect` and `stateDeathDeltas` exist for located deaths. The sibling `INVENTORY.md` records that the toll kind is defined and applied but no emitter was found, that war casualties never reduce population, and that `medianAge` and `literacy` have no simulation reader. I read `vitals.ts` lines 1 to 80 myself; the other claims are the inventory's. [O for vitals.ts]
- `STANDING_CONDITIONS` already includes `unrest`; `ACUTE_CONDITIONS` includes `pandemic`, `heat-wave`, `wildfire`, `cyclone`, `flood`, `tornado`, `winter-storm`, `earthquake`, `drought`. A condition opens, worsens or eases, bills weekly, stamps a flag and raises content draw weight (`condition-kinds.ts`). [O]
- `Nation.stats.security.crimeIndex` (0 to 1) is the only crime state; there is no health, trust, poverty or inequality state in the part of `nation.ts` I read (lines 60 to 200). [O]
- The approval design (`docs/audits/2026-10-12-approval-model/DESIGN.md`) already fits a Katrina relief condition (services -0.30, competence -0.08, 26 weeks, RMSE 2.5 points) and a 2020 pandemic-plus-unrest case (RMSE 3.6), and holds a polarization stock `P` anchored at 1.0 for the 2020s. Society metrics here must feed those existing channels and must not write approval a second time (DECISIONS 6.3, 6.4). [O]
- The week is the engine's step; a four-year term is about 208 weeks (DECISIONS 2.4, the sibling economy brief 6.1). The game does not compress calendar time; it compresses attention. The question for every axis is how a real series with annual or monthly cadence becomes a weekly state and a dated release. [O]

## 3. Findings that shape the whole design

### 3.1 Flows set the count, and migration dominates

National components, Census Vintage 2025, years ending June 30 [O file NST-EST2025-ALLDATA.csv; aggregates read directly, total change = natural + international, no residual in the file]:

| Year ending June | Births | Deaths | Natural increase | International net migration | Total change |
|---|---|---|---|---|---|
| 2021 | 3,584,459 | 3,438,423 | 146,036 | 376,026 | 522,062 |
| 2022 | 3,680,380 | 3,456,354 | 224,026 | 1,672,112 | 1,896,138 |
| 2023 | 3,648,896 | 3,154,285 | 494,611 | 2,264,137 | 2,758,748 |
| 2024 | 3,608,217 | 3,093,940 | 514,277 | 2,734,468 | 3,248,745 |
| 2025 | 3,620,461 | 3,101,603 | 518,858 | 1,262,202 | 1,781,060 |

Population was 341.8 million on July 1, 2025; growth 0.5%, down from 1.0%. Census says the NIM decline came from both fewer immigrants and more emigrants, and projects about 321,000 for the year to July 2026. Census measures NIM as immigrants minus emigrants, with immigration from the American Community Survey and emigration estimated from several indicators (CPS trends, DHS removals, Mexico's ENOE survey); emigration is the hard part. [O census.gov press release and Random Samplings blog]

CBO's January 2026 outlook is reported to say net immigration fell to 410,000 in 2025, that other foreign nationals had a net outflow of 360,000, and that deaths exceed births from 2030. That is a different measurement from Census's 1.3 million for the same year. [S: search summary of cbo.gov pages; CBO returned 403]. Whatever the truth, two federal agencies disagree by a factor of three on the biggest population lever. The game should carry a reported figure and a true figure with a gap, not one number (DECISIONS 7.9, an unreliable briefing is played fair).

Scale of one year's change as a share of the 341.8 million population [C]:

| Source | Count | Share of population |
|---|---|---|
| Change in NIM, 2024 to 2025 | -1,472,266 | -0.43% |
| Natural increase, 2025 | 518,858 | +0.15% |
| COVID-19 excess deaths 2020 to 2022 (CDC weighted estimate, sum of three years) | 1,321,766 | 0.40% of the 2020 population (331.6 million) |
| Overdose deaths, 2022 peak (12 months ending December) | 109,413 | 0.033% |
| Suicide, 2024 | 48,824 | 0.014% |
| Flu 2024-25 season (CDC estimate) | 45,000 | 0.013% |
| Homicide, 2023 (World Bank rate 5.76 per 100,000 × population; derived) | about 19,400 | 0.006% |
| NOAA billion-dollar disasters, 2024, direct and indirect | at least 568 | 0.00017% |
| Hurricane Helene, US | at least 250 | 0.00007% |
| Operation Iraqi Freedom US military deaths over the whole war (CRS, as of July 2020) | 4,418 | 0.0015% of a 296 million population (2005) [C] |

Inputs: the COVID row uses the CDC dataset `xkkf-xrst` ("Predicted (weighted)", all causes, United States row), annual sums of `excess_estimate`: 459,421 (2020), 530,876 (2021), 331,469 (2022). CDC's page says its national total is the sum of jurisdictions with negatives set to zero, that a directly computed US total is "approximately 25% lower," and that the method changed on March 15, 2023 [O]. Treat 1.32 million as the top of a band. Observed deaths ran 1.156, 1.181 and 1.108 times the expected count in 2020, 2021 and 2022 [C from the same dataset]. Peak week: 85,126 observed vs 57,671 expected, +47.6%, week ending 2022-01-29; the January 2021 peak was 87,095 vs 59,415 [O].

**Consequence for design.** Of everything the owner listed, only a pandemic and an immigration shift move the national count enough to see. Illness, unrest, fatality rates, disasters and war still belong in the count because they are real deaths, but the game must show them as located flows (state, county, week) and as changes to opinion and stability, where the evidence says they matter, not as national population swings.

### 3.2 State level is where stocks visibly move

Census Vintage 2025, April 2020 base to July 2025 [C from O file]:

- Fastest: Idaho +10.4% (domestic migration +7.1% of base), Florida +8.9% (international +5.2%, natural -0.5%), Texas +8.8%, South Carolina +8.8% (domestic +7.1%), Utah +8.2%.
- Slowest: Hawaii -1.5%, West Virginia -1.5% (natural -2.7% of base), New York -1.0% (domestic -5.2%), Louisiana -0.9%, Illinois -0.8%.
- Seventeen states had more deaths than births in the year to June 2025 (Alabama, Arkansas, Delaware, Florida, Kentucky, Maine, Michigan, Mississippi, Montana, New Hampshire, New Mexico, Ohio, Oregon, Pennsylvania, Rhode Island, Vermont, West Virginia). In the year to June 2021, twenty-six did.
- Crude death rate in 2021 per 1,000 people: Utah 6.6, Alaska 7.4, Colorado 8.0 at the low end; Alabama 13.7, Mississippi 14.1, West Virginia 15.4 at the high end. Age structure and health set this, so a single national death rate hides a 2.3× spread.
- Domestic migration is fast and volatile. Florida's net domestic migration was +310,892 (2022), +183,646 (2023), +22,517 (2025). Ohio went from -32,482 (2021) to +11,926 (2025). South Carolina gained 66,622 in 2025. [O census.gov press release]
- Fastest-growing percent in 2025: South Carolina 1.5%, Idaho 1.4%, North Carolina 1.3%, Texas 1.2%, Utah 1.0%; California, Hawaii, New Mexico, Vermont and West Virginia declined. NIM by state in 2025: Florida 178,674, Texas 167,475, California 109,278, New York 95,634. [O]

Disaster displacement is the one event type that moves a local stock: the city of New Orleans went from 494,294 (July 1, 2005) to 230,172 (2006), -53%, and 384,320 in 2014, 78% of the pre-storm figure nine years on. The metro area went from 1.386 million to 1.040 million (-25%) to 1.252 million in 2014. Metro housing units fell from 592,800 to 438,278 and recovered to 553,627. [O census.gov Facts for Features; percentages C]

### 3.3 Perception differs from measurement, and the gap is itself a variable

- Gallup, October 2023: 77% said there was more crime nationally than a year earlier, 55% locally; 63% called national crime extremely or very serious, a record. Gallup said FBI measurement changes make real trends hard to assess and tied the view to the rise in homicide and coverage of car theft and shoplifting. [O news.gallup.com/poll/544442]
- FBI 2024: murder down "nearly 15%," violent crime down 4.5%, property crime down 8%, from more than 16,000 agencies covering over 325 million people. [O PBS/AP]
- BJS NCVS 2024: violent victimization 23.3 per 1,000 people aged 12 and older, 11.2 per 1,000 reported to police; 1.45% of people had at least one violent victimization, similar to 2023. [O bjs.ojp.gov]

So the game needs a measured crime state and a separate perceived-crime state that responds to news salience and lags a decline. The public judges the President on the perceived one. [D on the mechanism; the gap itself is O]

### 3.4 Release lag, revision and provisional vs final are part of the data

- CDC overdose counts: reported 12-month-ending December 2023 was 106,881; the model-adjusted "predicted" value was 107,966. Provisional estimates cover deaths up to 4 months after the date of death. [O data.cdc.gov `xkb8-kh2a`; CDC page]
- Median days from death to report in the 2020 COVID planning scenario: 19 (18 to 49 years), 21 (50 to 64), 19 (65 and older). Median days from symptom onset to death: 15, 17, 13. [O CDC Planning Scenarios, Sept. 10, 2020]
- Camp Fire's count was lowered to 85 after two sets of remains were matched to one person; Lahaina's count rose to 102 in June 2024, ten months after the fire, when a woman died after 119 days of hospice care. [O ktvu.com; civilbeat.org]
- Heat: about 2,300 death certificates in 2023 mentioned excessive heat, the highest in 45 years of records, while Dessler and Lee estimated about 11,000 heat deaths using excess-death methods, roughly 5× the certificate count. [O AP via nbcsandiego.com]

Design rule: an event has an occurred toll and a reported toll. The reported toll rises with a distribution of lags and can be revised. Briefings carry the reported toll plus a stated uncertainty; the Record shows the final one.

### 3.5 Effects on opinion are conditional and usually small; do not overbill

| Study or series | Finding | Use in the game |
|---|---|---|
| Gallup on Hurricane Katrina | Bush overall job approval averaged 43% (Aug 2005), 44% (Sep), 41% (Oct); Gallup found no discernible effect on overall approval, though Katrina lowered ratings as a strong, decisive leader. [O news.gallup.com/poll/24283] | A disaster bills handling and competence (as the approval design fits), not the headline. |
| Healy and Malhotra, APSR 2009 | Voters reward incumbent presidential parties for disaster relief spending, not preparedness; $1 on preparedness averts about $15 of damage. [O digitalcommons.lmu.edu] | Preparedness is underrewarded; a real tension for the player. |
| Reeves, J. of Politics 2011 | 1981 to 2004: a highly competitive state can expect twice as many presidential disaster declarations as an uncompetitive one; over one point of statewide gain per declaration. [O profiles.wustl.edu] | The declaration is a political act with a measurable electoral value and a cost to denying. |
| Baccini, Brodeur and Weymouth, J. of Population Economics 2021 | County COVID cases lowered Trump's 2016 to 2020 vote share change (instrumented by meat-processing employment); counterfactual: Trump likely wins with 5% fewer cases; some evidence of higher mobilization. [O glabor.org abstract] | Epidemic severity can move votes locally and in swing states; effect heterogeneous (urban, swing, no stay-at-home orders). |
| Wasow, APSR 2020 | Working-paper version: nonviolent black-led protest raised Democratic vote share among whites 1.3 to 1.6%; protester-initiated violence shifted whites 1.6 to 7.9% toward Republicans in 1968 and tipped the election. [O PDF text] | Whether unrest helps or hurts depends on its violence and on who holds the White House; do not give protest a fixed sign. |
| Miller, Johnson and Wherry, QJE 2021 | Medicaid expansion cut annual mortality of near-elderly low-income adults by 0.132 percentage points, 9.4% of the sample mean; driven by fewer disease deaths; grows over time. [O nber.org/papers/w26081] | Insurance coverage is a mortality channel with a lag of years. |
| Levitt, JEP 2004 | Abstract: more police, a larger prison population, the end of the crack epidemic and 1970s abortion legalization together account for the 1990s crime decline; other popular explanations matter far less. [O ideas.repec.org] | Do not tie the crime index to the economy with a made-up slope. |

Two points from this table carry design weight. First, almost none of these effects are on the headline approval; they are on specific judgments, local vote and blame. Second, the sign depends on context (violence of protest, who is blamed, party of the President).

### 3.6 Everything cited as a shock has a base rate that I can only partly source

Hurricanes: the 1991 to 2020 Atlantic average is 14 named storms, 7 hurricanes, 3 major hurricanes [O nhc.noaa.gov/climo]. Billion-dollar disasters: 9.0 a year for 1980 to 2023, 23.0 a year for 2020 to 2024 [O]. Wildfire acres burned have ranged from 2.69 million (2023) to 10.13 million (2015) since 2000, a 3.8× spread [C from O NIFC table]. Pandemics: the only sourced figures I have are the 1918 pandemic (675,000 US deaths; at least 50 million worldwide) and COVID-19. For frequency, a search summary of Marani et al., PNAS 2021, gives a yearly probability between 0.11% and 0.89% for a 1918-intensity epidemic, with a 879-year mean recurrence today [S]. That is not a COVID-scale rate, and the paper's page was blocked. A pandemic base rate for the game is an open item (section 9).

## 4. The axes

Format for each card: definition and unit; measurement; range and speed; drivers and downstream effects with evidence; game form; cadence; calibration series; compression; verdict. "Verdict" uses model (explicit state and rules), derive (computed from other state), perception (separate lagged reading), or skip.

### A. Population dynamics

#### A1. Births and fertility

- **Definition, unit.** Live births; general fertility rate (births per 1,000 women aged 15 to 44); total fertility rate (births per woman).
- **Measurement.** NCHS National Vital Statistics System, from birth certificates; Census components of change for state-by-state estimates.
- **Range and speed.** 2025 provisional births 3,606,400, down 1% from 2024; general fertility rate 53.1 per 1,000; teen birth rate 11.7 per 1,000, down 7%, a record low; cesarean 32.5%. NCHS says the fertility rate has been falling since 2007 [O cdc.gov/nchs/pressroom/releases/20260409]. Total fertility rate (World Bank series): 2.056 (2000), 1.931 (2010), 1.706 (2019), 1.642 (2020), 1.627 (2024) [O API; its source is UN-based, not NCHS]. Crude birth rate: 14.4 (2000), 10.6 (2024). Moves 1% to 2% a year; the steepest recent step is 2019 to 2020 (-0.064 in TFR).
- **Drivers and downstream.** Age structure of women (mechanical), the economy and policy. I did not open any study that quantifies policy elasticities of fertility, so none is stated here. Downstream: school-age population, labor force 18 years out (beyond any term), and the point where deaths exceed births (CBO reported 2030 [S]; already true in 17 states [O]).
- **Game form.** Flow. births = fertility index × women 15 to 44 in state × seasonal weights; the fertility index is a slow-moving state with drift toward the dataset's authored figure.
- **Cadence.** Weekly accrual; annual publication (provisional in spring).
- **Calibration.** NVSS births 2025; Census births by state for the year to June (3,620,461 in 2025 [O]).
- **Compression.** Lag 9 months from any cause to a birth; nothing a President does in a term should be able to move births by more than a few percent. **Gap:** no sourced elasticity, so give the player no lever on births until one is opened.
- **Verdict.** Model as a slow flow; no player lever.

#### A2. Deaths by age and sex (the engine of the ledger)

- **Definition, unit.** Deaths per 100,000 by age band; age-adjusted death rate against the US standard population.
- **Measurement.** NCHS death certificates, final data about 11 months after year end [O].
- **Range and speed.** 2024: 3,072,666 deaths (3,090,964 in 2023); age-adjusted rate 722.1 per 100,000 (750.5 in 2023). Age-specific rates 2024, per 100,000: ages 1 to 4, 25.6; 5 to 14, 14.5; 15 to 24, 66.9; 25 to 34, 124.5; 35 to 44, 213.9; 45 to 54, 386.9; 55 to 64, 859.8; 65 to 74, 1,772.9; 75 to 84, 4,264.0; 85 and older, 13,834.0. Infant mortality 552.5 per 100,000 live births (20,050 infant deaths). Rates fell in every age group except 5 to 14 from 2023 to 2024; the 25 to 34 rate fell 15.9% and the 15 to 24 rate 12.9% in one year, largely the overdose decline [O cdc.gov/nchs/products/databriefs/db548]. Age-adjusted rate by year: 1950, 1,446.0; 2010, 747.0; 2018, 723.6 (the file's `mortality` field) [O data.cdc.gov `w9j2-ggv5`]; 2021, 879.7; 2022, 798.8 [O db492/vsrr023 text].
- **Weekly shape.** 2019 weekly deaths: min 51,134, max 58,675, mean 54,858, sd 2,581 (4.7%) [C from `xkkf-xrst`, United States rows]. Winter peaks. Any event under about 5% of a week's deaths (about 2,700) is lost in seasonal noise; COVID reached +47.6%.
- **Game form.** Flow with age-banded hazards. Weekly deaths per cell = cell population × baseline hazard × seasonal factor × (1 + sum of declared shock multipliers) + located event tolls. Hazards come from the table above; shocks are the sections below. Stochastic rounding uses its own stream key (DECISIONS 1.3).
- **Cadence.** Weekly; monthly and annual reporting.
- **Calibration.** The age-specific table above; the 2019 weekly band; the state crude death rates in 3.2.
- **Compression.** Immediate for acute events, lagged 13 to 17 days from infection to death (CDC planning parameters), reported 19 to 21 days after death. Do not smooth deaths into the baseline; keep a baseline count and an excess count so the player sees "expected vs actual."
- **Verdict.** Model.

#### A3. Deaths by cause

- **Measurement.** NCHS leading causes. 2024 counts (2023 in parentheses): heart disease 683,491 (680,981); cancer 619,876 (613,352); accidents 197,449 (222,698); stroke 166,852; chronic lower respiratory 145,643; Alzheimer 116,022; diabetes 94,445; kidney 55,081; liver 52,274; suicide 48,824 (49,316). Top ten are 70.9% of deaths. COVID-19 as underlying cause fell from 49,932 (2023) to 31,426 (2024), 37.1% down, rank 15 [O db548].
- **Range and speed.** Chronic causes move 0% to 2% a year; accidents moved -11.3% in one year (the overdose fall); COVID moved from 0 to 385,666 COVID-involved deaths in 2020 (provisional, B1).
- **Game form.** A cause ledger of about 12 lines: heart, cancer, stroke, respiratory, Alzheimer, diabetes, kidney, liver, suicide, overdose, firearm-and-other homicide, motor vehicle, infectious epidemic, disaster, war, heat, other. Chronic lines are baseline hazards drifting with age structure; the shock lines (epidemic, overdose, homicide, disaster, war, heat) are the ones other systems write. Cause is an accounting label on a death, derived when the death is booked, so there is one writer per cause line.
- **Verdict.** Model the ledger; derive the chronic lines.

#### A4. Life expectancy at birth

- **Definition.** Period life expectancy computed from that year's age-specific death rates.
- **Range and speed.** 39.1 (1918), 68.2 (1950), 73.7 (1980), 76.8 (2000), 78.7 (2010), 78.7 (2018) [O `w9j2-ggv5`]; 78.8 (2019), 77.0 (2020), 76.4 (2021), 77.5 (2022), 78.4 (2023), 79.0 (2024) [O NCHS briefs]. COVID cost 2.4 years in two years (78.8 to 76.4); the recovery took three years (+2.6). Male 76.5, female 81.4 in 2024. World Bank gives 78.89 for 2024, a slightly different series.
- **Game form.** Derived reading, recomputed from the ledger each time it is shown (DECISIONS 1.10). Never a stored stock and never a lever.
- **Verdict.** Derive.

#### A5. International migration

- **Definition, unit.** Net international migration (NIM) = immigrants minus emigrants, in people per year.
- **Range and speed.** 376,026 (year to June 2021), 1,672,112, 2,264,137, 2,734,468, 1,262,202 (2025); projected about 321,000 for the year to June 2026. World Bank's net migration series: 1.77 million (2019), 0.33 million (2020), 1.29 million (2024). The 2024 to 2025 halving is the largest one-year fall in the five years in the file. State shares in 2025 are concentrated: Florida, Texas, California and New York account for 551,061 of 1,262,202 (43.7%) [C].
- **Drivers and downstream.** Drivers are policy (visa, border, enforcement and removal) and conditions abroad. Census attributes the 2024 to 2025 drop to both lower immigration and higher emigration. Downstream: population, labor force, nativity cohort share, local demand. I did not open a study quantifying the economic effect, so none is stated.
- **Game form.** Policy flow. The player's acts write an immigration inflow and an emigration outflow separately, through the existing standing-program and apply paths (DECISIONS 6.2); allocation to states by 2025 shares with seeded noise; the sum is the NIM. Effects appear within one to three months. Nativity cohort shares move by arrivals and departures only.
- **Cadence.** Weekly flow; annual Census publication (a July-to-June year).
- **Compression.** Immediate-to-lagged: a border or visa act changes monthly arrivals within weeks; a removal program changes emigration at its own pace. Keep reported and true NIM apart.
- **Verdict.** Model; this is the largest lever on the count.

#### A6. Domestic migration between states

- **Definition.** Net movement of residents among states and the District, summing to zero nationally.
- **Range and speed.** Florida +310,892 (2022) to +22,517 (2025); South Carolina +66,622, Alabama +23,358, Ohio +11,926, Michigan +1,796 in 2025 [O]. State five-year domestic net as a share of April 2020 base: Idaho +7.1%, South Carolina +7.1%, New York -5.2%, Hawaii -3.7%, Illinois -3.4%, Louisiana -3.0% [C].
- **Drivers and downstream.** The sources I opened state the flows, not the causes; I did not open a study on housing cost, remote work or taxes, so the game should not hard-code a cause. Disasters displace (Katrina: New Orleans -53% in a year). Downstream: state population mass (DECISIONS 6.3: a reading may steer, never bill twice), House apportionment only at the next census.
- **Game form.** Flow among states, driven by a push-pull index built from reading the state's own conditions (unemployment, cost of living, active disaster) with persistence and mean reversion; zero sum. Apportionment must not change mid-game (the Constitution fixes it at the census); use the founding population for seats and the live population for rates and weights. **Guardrail:** state population change must not write state lean (DECISIONS 5.10); it changes the weight geography gives a cohort's strain, and nothing else.
- **Verdict.** Model as a small zero-sum flow.

#### A7. Age structure

- **Range and speed.** Population aged 65 and older: 12.19% (2000), 15.67% (2019), 17.93% (2024), 18.39% (2025); ages 0 to 14: 21.16% (2000), 18.61% (2019), 17.32% (2024), 17.10% (2025) [O World Bank API]. The 65-plus share has risen by about 0.45 to 0.5 percentage points a year since 2019 [C]. Over eight years that is about 3.7 points, large for a cohort and slow for a game.
- **Game form.** Derived from the ledger. The age cohort axis of DECISIONS 5.8 is the one axis that should change dynamically; the other ten axes hold their founding shares except where an event moves them through a named mechanism.
- **Verdict.** Derive.

#### A8. How events change counts (summary of the channels)

| Event class | Channel to counts | Size, calibrated | Timing | Located |
|---|---|---|---|---|
| Epidemic | Hazard multiplier by age band, with hospital-capacity coupling | COVID: excess 459,421 / 530,876 / 331,469 in 2020 to 2022 (a band, see 3.1) | Waves of weeks; deaths lag infection 13 to 17 days | National, then by state |
| Overdose | Cause line with trend | 52,623 (2015) to 109,413 (2022) to 70,646 (2025) [O] | Monthly, 4-month reporting lag | State |
| Violence | Cause line tied to crime index | World Bank homicide per 100,000: 4.73 (2010), 6.35 (2020), 6.78 (2021), 5.76 (2023) | Weekly | City, state |
| Hurricane, flood, tornado | Located toll plus displacement | Helene 250 (175 direct); Maria 2,975 in Puerto Rico (government estimate, direct and indirect) | Days to weeks, indirect deaths for months | County, state |
| Wildfire | Located toll plus displacement | Camp Fire 85 deaths, more than 14,000 homes; Lahaina 102 | Hours to days | County |
| Heat | Hazard multiplier on old and outdoor-exposed | 2023: about 2,300 certificates, about 11,000 by excess-death estimate [O] | Days | State (Arizona 874 certificates in summer 2023) |
| War | Military cause line, from the cast of units | OIF 4,418; OEF 2,349 (CRS, as of July 2020) | Per operation | State of record |
| Immigration shift | NIM flow | 1.47 million swing in a year | Weeks to months | State |

Sources: section 3.1 and cards below. War casualties currently never reduce population per the sibling inventory; fix by booking each located military death against its state of record (the CRS report tabulates deaths by home state of record, for example the Korean War) [O crs report page]. The mass is tiny nationally and meaningful for opinion (the approval design already prices the dead at 0.08 per tenfold).

### B. Health

#### B1. Disease burden and epidemic dynamics

- **Definition.** Illness, hospitalization and death from a specified disease, per period.
- **Measurement.** CDC surveillance (FluSurv-NET covers about 9% of the population for flu hospitalizations [S]), NCHS death certificates, COVID-NET.
- **Range and speed.** Flu 2024-25: 51 million illnesses, 23 million outpatient visits, 710,000 hospitalizations, 45,000 deaths; the first high-severity season since 2017-18; illnesses and medical visits exceeded 2017-18, hospitalizations equal, deaths lower [O cdc.gov/flu-burden]. COVID-19: waves of weeks, peak weekly excess +47.6%; provisional COVID-involved deaths by year 385,666 (2020), 463,263 (2021), 246,161 (2022) [O `9bhg-hcku`, "By Year"]. 1918: about 675,000 US deaths, at least 50 million worldwide, about one third of the world infected; mortality was high in children under 5, adults 20 to 40 and adults 65 and older [O archive.cdc.gov].
- **Age gradient (the part a game must keep).** COVID-involved deaths by age band, 2020: 85 and older 122,895; 75 to 84 106,319; 65 to 74 82,332; 55 to 64 45,594; 18 to 29 1,489; 0 to 17 199. Aged 65 and older made 80.8% of 2020 COVID-involved deaths, 68.6% in 2021, 78.9% in 2022 [C]. As a share of all deaths in the band in 2020: 12.1% (85 and older), 2.3% (18 to 29), 0.6% (0 to 17) [C]. The 2021 younger-age share rose (Delta). Because the opened tables give deaths, not populations, I do not state hazard ratios.
- **SIR-type parameters (CDC planning scenario 5, "current best estimate," Sept. 10, 2020 [O PDF]).** R0 2.5; infection fatality ratio 0.00003 (ages 0 to 19), 0.0002 (20 to 49), 0.005 (50 to 69), 0.054 (70 and older); 40% of infections asymptomatic; asymptomatic infectiousness 75% of symptomatic; 50% of transmission before symptom onset; exposure to symptom onset about 6 days; serial interval about 6 days; infections-to-reported-cases ratio 11 (range 6 to 24). Among hospitalized: death 2.4% (18 to 49), 10.0% (50 to 64), 26.6% (65 and older); mechanical ventilation 12.0%, 22.1%, 21.1%. Lower and upper bound scenarios: R0 2.0 and 4.0; IFR for 70 and older 0.028 and 0.093. CDC states these are planning parameters, not predictions; the IFR does not account for hospital capacity; and they do not reflect later immunity or treatment. The later record shows how far severity moved: underlying-cause COVID deaths fell from 49,932 (2023) to 31,426 (2024). [O db548]
- **Healthcare capacity coupling.** HHS hospital-capacity data summed across reporting hospitals shows the peak: 161,833 COVID inpatients on 2022-01-19, 20.6% of 783,959 reported staffed inpatient beds; all inpatients 623,202 (79.5% occupancy); adult ICU 26,458 COVID of 82,705 staffed ICU beds (32%) [C from O `healthdata.gov g62h-syeh`; reporting coverage varied, data end 2024-04-27]. Hospital beds per 1,000: 3.49 (2000), 3.03 (2010), 2.72 (2019), 2.68 (2022) [O World Bank]. The sourced lesson for the engine: fatality ratio is not a constant, it moves with strain on capacity; CDC says so itself.
- **Downstream effects.** Deaths (A2, A3); local votes (Baccini et al., 3.5); unemployment in the shock year (World Bank: 3.67% in 2019, 8.06% in 2020, 5.35% in 2021, 3.65% in 2022; GDP growth -2.08% in 2020, +6.15% in 2021) [O API]. The labor-force participation rate fell from 62.85% (2019) to 61.56% (2020) and has not recovered (61.96% in 2024) [O API].
- **Game form.** A pandemic condition (exists as `pandemic`) driving an age-banded SEIR-lite per state: infections drive hospital demand; hospital demand over capacity raises the death ratio; infection-to-death lag 13 to 17 days; death-to-report lag 19 to 21 days. Parameters per strain are authored from the table above, with the strain's R0, IFR vector and immunity as the three authored numbers. Seasonal flu is a baseline condition with a yearly severity draw (51 million illnesses and 45,000 deaths in a high-severity year).
- **Cadence.** Weekly infection state; daily hospital reads.
- **Calibration series.** `xkkf-xrst` (excess deaths), `9bhg-hcku` (deaths by age and year), `g62h-syeh` (capacity), the flu burden estimates.
- **Compression.** Conditional on capacity; distributed across weeks; the President's levers act on R (distancing), IFR (capacity, therapeutics) and timing; no number in the opened sources ties these levers to outcomes, so levers need authored, labeled scales rather than invented elasticities. The 1918 and COVID events are separated by a century of base rate that I could not source (3.6).
- **Verdict.** Model fully, once, shared by every strain; seasonal flu as the baseline.

#### B2. Health insurance coverage

- **Definition, unit.** Share and count of people with coverage; uninsured for the full year.
- **Measurement.** Census CPS ASEC (annual, September release); NHIS; ACS.
- **Range and speed.** 2025: 26.7 million (7.9%) uninsured all year, not statistically different from 2024; public coverage 35.8%; employment-based 53.5%; Medicare 20.1%; Medicaid 17.1% (down 0.5 point); direct purchase 10.5%; private coverage for adults 65 and older 41.5% (-2.8 points); adults 19 to 64 with public coverage 17.3% (-0.5) [O census.gov press release]. I did not open a historical uninsured series, so no steep-move number is stated here (gap).
- **Drivers and downstream.** Federal coverage programs and employment. Medicaid expansion reduced mortality of near-elderly low-income adults by 0.132 percentage points a year (9.4% of the mean), growing over time [O nber.org].
- **Game form.** A stock (covered share by state and program) driven by standing programs (DECISIONS 6.2: programs move resting points, acts write levels). It feeds the hazard multiplier on the lowest-income, near-elderly cells with a multi-year lag, and the uninsured share is a visible index. Do not apply the Medicaid effect to people outside the studied group.
- **Cadence.** Annual publication; weekly state; effect lags years.
- **Verdict.** Model as a policy stock with a sourced mortality channel.

#### B3. Healthcare capacity and spending

- **Range and speed.** Beds per 1,000 fell 3.49 to 2.68 over 22 years; physicians per 1,000 rose 2.60 (2000) to 3.68 (2022); health expenditure 12.49% of GDP (2000), 16.20% (2010), 18.52% (2020), 16.69% (2023) [O World Bank API].
- **Game form.** Capacity is a pair of numbers per state (staffed beds, staffed ICU beds) used only inside the epidemic engine; spending is already a budget line. Do not simulate hospital operations.
- **Verdict.** Derive capacity; model only as an epidemic input.

#### B4. Overdose and despair deaths

- **Definition.** Drug overdose deaths, 12-month-ending count.
- **Range and speed.** 12-month-ending December: 52,623 (2015), 63,938, 70,699, 67,850, 71,130 (2019), 92,478 (2020, +30.0%), 107,573, 109,413 (2022 peak), 106,881 (2023), 80,860 (2024, -24.3%), 70,646 (2025). Predicted 12-month-ending April 2026: 66,937. [O data.cdc.gov `xkb8-kh2a`; changes C]. A 24% fall in one year is the steepest decline in this 2015 to 2025 series; a 30% rise (2020) is the steepest rise.
- **Drivers and downstream.** Drug supply and treatment are the standard explanations; the opened sources state the counts, not a causal share, so the game should not hard-code a driver. Downstream: the accidents line (197,449 in 2024 vs 222,698 in 2023), age-specific mortality at 15 to 44, life expectancy.
- **Game form.** Stock-flow with trend and noise by state, with shocks the player's acts can nudge through authored program effects; reported with a 4-month lag.
- **Verdict.** Model.

### C. Unrest and public order

#### C1. Protest

- **Definition, unit.** Events (marches, rallies, strikes, vigils) and participants per event. CCC counts publicly reported political crowds and excludes meetings, town halls and similar [O ash.harvard.edu].
- **Range and speed.** Spiky. The CCC authors' analysis of the June 14, 2025 No Kings day: 2 to 4.8 million participants in more than 2,150 actions, covering 82% of anti-Trump events with tallied crowds; the 2017 Women's March drew 3.2 to 5.3 million at over 650 locations; Hands Off (April 5, 2025) 919,000 to 1.5 million [O znetwork.org]. For 2020, the Ash Center's February 2021 article counted nearly 12,000 anti-racism events, about 20% of all US protest events over the four years of its dataset phase, roughly 2.7 million participants (conservative), in 3,113 cities and towns, with a peak on June 6, 2020 of more than 700 events in over 600 places [O]. ACLED recorded 1,513 US demonstration events in July 2025, down 44% from June, ; ACLED describes the anti-Trump mobilization as centered on single days of mass action [O acleddata.com]. Search-result figures for counts in 2025 (for example 29,138 political protests by September 30, 2025 against 8,314 a year earlier) are [S].
- **Violence share (the heavy tail).** 2020 events: over 96% had no reported property damage; arrests at nearly 7%; police chemical irritants at 292 events (2.5%); protester injuries at 288 events (2.4%); police injuries at 172 events (1.4%) [O]. 2025 No Kings: over 99.5% of reported protests had no injuries or property damage; damage at 10 locations [O]. The CCC says its figures are undercounts.
- **Drivers and downstream.** Drivers are a salient grievance and the opposition status of the mobilizing group [D]; Pew finds anger at the federal government at its highest in the series for the out-party (Democrats 44% angry in September 2025 vs 34% in 2020) [O]. Downstream: local votes (Wasow, 3.5), perceived security, police capacity, and the unrest condition. I found no study I could open that links protest to GDP, so none is modeled.
- **Game form.** The existing `unrest` condition, with severity driven by the sum of grievance marks and the size of mobilization. Draw event size from a heavy-tailed distribution fitted to CCC (peak days reach millions; the opened sources give no median event size, so fit one from the Dataverse); draw violence as a rare tail (about 0.5% to 4% of events have property damage in the opened data) that rises with police use of force and counter-protest. A violent tail moves the security judgment; peaceful scale moves the issue salience. Per Wasow, the sign of the electoral effect depends on violence, not size.
- **Cadence.** Event-day; weekly rollup; monthly publication.
- **Calibration.** CCC Dataverse (2017 to 2020, 2021 to 2024, 2025 on; monthly); ACLED US.
- **Verdict.** Model the condition; derive protest counts for display from severity.

#### C2. Riots and civil disorder

- **Range and speed.** Rare, short, concentrated. The 2020 uprising is the only large recent case; its peak week had over 700 events in a day with less than 4% property damage. The CCC article for 2020 gives no death count [O].
- **Game form.** The violent tail of C1, plus a separate declared incident (curfew, National Guard, Insurrection Act) that the engine already treats as an emergency power (DECISIONS 6.7).
- **Verdict.** Derive from C1; do not make a second mechanic.

#### C3. Political violence and threats

- **Range and speed.** US Capitol Police threat assessment cases: 8,613 (2020), 9,625 (2021), 7,501 (2022), 8,008 (2023), 9,474 (2024), 14,938 (2025), up about 58% in 2025 and the third annual rise in a row; USCP attributes the rise to online anonymity, rhetoric and outreach that raises reporting [O uscp.gov]. ACLED notes violent flashpoints around migration enforcement in July 2025 [O]. I did not open a count of attacks with deaths.
- **Game form.** A reading, not a stock: threat level derived from polarization (`P`), the opposition's grievance and visible rhetoric events; it feeds the protective-detail cost and a small chance of a located political-violence incident. Keep deaths rare and located.
- **Verdict.** Derive from `P` and grievance; keep incidents authored.

#### C4. Crime

- **Definition.** Violent crime (murder, rape, robbery, aggravated assault) and property crime; two measures: police-reported (FBI) and victimization survey (BJS NCVS).
- **Range and speed.** FBI 2024 vs 2023: murder -15% (nearly), violent -4.5%, property -8%; hate crimes -1.5% but second-highest on record [O PBS/AP]. The FBI primary page was blocked. World Bank homicide per 100,000: 5.54 (2000), 4.73 (2010), 4.93 (2019), 6.35 (2020), 6.78 (2021), 6.51 (2022), 5.76 (2023) [O API]; 2020 is +28.8% over 2019 and 2021 is +37.4% over 2019 [C]; 2021 to 2023 is -15.0% [C]. NCVS 2024: 23.3 violent victimizations per 1,000 aged 12 and older; 11.2 reported to police [O].
- **Drivers and downstream.** Levitt's four factors for the 1990s decline (police numbers, prison population, the crack epidemic's end, abortion legalization) [O abstract]. I opened no study on the 2020 spike's cause, so none is stated. Downstream: deaths (the homicide line, about 19,400 in 2023 [C]), perceived crime and the security judgment (3.3), incarceration (C5), and business and migration decisions (no source opened).
- **Game form.** The existing `crimeIndex` as the measured state, anchored to the founding year and to a calibration table of the real series above; the violent rate derived from it; a separate perceived-crime state that follows the measured one with a lag and responds to salience and partisan frame. Homicide deaths booked into the cause ledger.
- **Cadence.** Weekly; annual FBI publication (August), NCVS (autumn).
- **Compression.** Immediate for a spike event, distributed over months for a trend; the policy levers (police, sentencing) act on the slow resting point (DECISIONS 6.2).
- **Verdict.** Model the index; derive rates; model perception separately.

#### C5. Incarceration

- **Range and speed.** Imprisonment rate (sentenced to more than one year, per 100,000 residents): 479 (2013), 459 (2015), 419 (2019), 357 (2020), 350 (2021), 355 (2022), 360 (2023); the 2019 to 2020 drop is -62 per 100,000 (-14.8%) [C]. Prison population 1,254,200 at year-end 2023, up 24,100 (2%) from 1,230,100; federal 154,093 at year-end 2024 [O]. Local jails: 658,700 people at midyear 2024, a rate of 194 per 100,000, with 68% unconvicted (peak 71% in 2021) [O bjs.ojp.gov]. The black adult rate in 2023 was 1,218 per 100,000 against 88 for Asian and Pacific Islander adults [O BJS]; any game use of it would have to reach cohorts only through a named policy channel (DECISIONS 5.8).
- **Game form.** Derived stock from admissions (crime and sentencing policy) and releases; it feeds the budget and the fiscal line, and Levitt's "prison population" factor, not a new mechanic.
- **Verdict.** Derive.

### D. Social condition and cohesion

#### D1. Poverty

- **Measurement.** Census official poverty rate (CPS ASEC); Supplemental Poverty Measure. 2025: official 10.2% (-0.5 point), 34.5 million people; child 13.4%, a historic low; SPM 13.1%, not statistically different [O census.gov]. The sibling economy brief owns the economic channel.
- **Game form.** Derive from unemployment, real wages and transfers. The post-tax Gini is 8.7% lower than the pre-tax Gini [O], so transfers are visible as a derived effect.
- **Verdict.** Derive. Cohort poverty enters through the existing cohort axes.

#### D2. Inequality and income

- **Range.** Median household income $87,460 in 2025, +2.6% (real); the 90th percentile rose 1.7% and the 10th did not change significantly; women's median full-time earnings rose 3.2%, the female-to-male ratio 83.9% from 80.6% [O]. Gini (World Bank): 40.1 (2000), 40.2 (2010), 41.9 (2019), 39.7 (2021), 41.8 (2024) [O API]. Census's own Gini value was not in the pages I opened.
- **Verdict.** Skip as a dynamic. Hold as a slow label; the economy brief covers wealth shares.

#### D3. Education attainment

- **Range.** Bachelor's or higher by age, 2024: 42.8% (ages 25 to 39), 41.5% (40 to 54), 34.2% (55 and older); women 40.1%, men 37.1% [O census.gov]. The all-adult 38.6% figure is [S] and was not on the Census page I opened. Voter turnout 2024 by education: advanced degree 82.5%, bachelor's 77.2%, high school graduate 52.5% [O].
- **Speed.** Cohort replacement; no event moves it in a term.
- **Verdict.** Skip as a dynamic; it is already a cohort axis (schooling) and a turnout modifier.

#### D4. Social trust

- **Definition.** Share saying most people can be trusted.
- **Range and speed.** General Social Survey 46% (1972) to 34% (2018); Pew 34% (2023-24); roughly flat since 2018. By group: White 40%, Asian 38%, Hispanic 23%, Black 21%; master's or higher 52%, high school or less about a quarter; ages 18 to 29 26%, 65 and older 44%; South 30%, Midwest 38%; highest states New Hampshire, Oregon, Utah near half. In a 2020 to 2025 panel, 25% changed their answer (14% gained trust, 11% lost it) [O pewresearch.org/2025/05/08]. Pew lists associated drivers (polarization, internet use, income inequality, time alone, generational change) as associations, not proven causes.
- **Game form.** A slow state, derived from the polarization stock `P` and economic strain with a decade-scale half-life; effect on turnout and cooperation is unsourced, so it should not gate mechanics. Show it as a label.
- **Verdict.** Skip as a driver; derive as a reading.

#### D5. Institutional trust

- **Range and speed.** Gallup, June 1 to 15, 2026 (n = 1,001): average confidence across 14 institutions 27%, one point above the 2023 record low of 26%; 12 of 14 at or near lows; small business 67%; higher education 38%; large technology companies 20%, a new low; Republicans 13 points more confident than Democrats overall (11 last year); partisan gaps: presidency 70 points, military 46, police 45, Supreme Court 40, church 40 [O news.gallup.com/poll/712436]. Pew: trust in the federal government to do right just about always or most of the time was 17% in September 2025 (Republicans 26%, Democrats 9%), against 77% in 1964; 22% in May 2024 (Democrats 35%, Republicans 11%); 16% in 2023; low individual poll 10% in 2011 [O pewresearch.org/politics/2025/12/04]. Trust in mass media (Gallup, September 2026): 33%, up from a record-low 28% in 2025; Republicans 22% (8% last year), Democrats 50%, independents 31% [O news.gallup.com/poll/714938].
- **Drivers and downstream.** The in-party effect is the strongest pattern: trust flips with who holds the White House (Pew 2024 vs 2025). Downstream effects on compliance or turnout are not in the opened sources.
- **Game form.** A perception reading per bloc, from the approval design's five blocs, with the in-party flip, not a national scalar. It should reuse the existing blocs and not add an electorate (DECISIONS 5.9).
- **Cadence.** Annual survey releases (Gallup June and September, Pew irregular).
- **Verdict.** Perception layer; no mechanical lever.

#### D6. Polarization (affective and ideological)

- **Affective.** Pew 2022: 62% of Republicans and 54% of Democrats had a very unfavorable view of the other party; Republicans calling Democrats immoral 72% (47% in 2016) and Democrats calling Republicans immoral 63% (about 35% in 2016); closed-minded 69% and 83% [O pewresearch.org/politics/2022/08/09]. September 2025: 26% angry and 49% frustrated about the federal government; Democrats angry 44%, Republicans 9%; Republicans content 40%, Democrats 8%. Democratic anger is the highest of either party since 1997; the partisan gap is wider than at any point since 1997 [O].
- **Ideological.** Party-mean DW-NOMINATE distance (first dimension) from Voteview's `HSall_members.csv`, computed by me as Republican mean minus Democratic mean for parties 200 and 100, members including those who replaced others [C]: House 0.523 (80th Congress), 0.539 (90th), 0.573 (95th), 0.645 (100th), 0.777 (105th), 0.808 (110th), 0.892 (118th), 0.910 (119th); Senate 0.484, 0.552, 0.589, 0.608, 0.684, 0.687, 0.895, 0.923. The House gap grew 0.13 between the 100th and 105th Congresses (1987 to 1999), then 0.10 between the 110th and 118th.
- **Game form.** The approval design already holds a bounded polarization stock `P` anchored at 1.0 for the 2020s. Map `P` to both series so the stock has two readable faces: an affective one (Pew very-unfavorable share, bounded 20% to 62% in the record) and an ideological one (DW-NOMINATE gap, 0.52 to 0.92). Both are derived readings of `P` and of Congress's roster, never separate stocks (DECISIONS 1.14: a system is modeled only when it can disagree with itself).
- **Cadence.** Per Congress (two years) for ideological; annual for affective.
- **Verdict.** Keep `P` as the one stock; derive both readings.

#### D7. Media consumption

- **Range and speed.** Pew, August 18 to 24, 2025: often get news from digital devices 56%, television 32%, radio 11%, print 7%; social media at least sometimes 53%, often 21% (25% in 2024, 19% in 2023, 17% in 2022); regularly get news on Facebook 38%, YouTube 35%, Instagram 20%, TikTok 20%, X 12%; TikTok users who regularly get news there rose from 22% (2020) to 55% (2025). Age: television 87% of those 65 and older (often or sometimes) vs 47% of those 18 to 29; digital devices 93% vs 71% [O pewresearch.org/journalism fact sheets]. Pew's 2025 print item was reworded, so the series is not strictly comparable.
- **Game form.** A static cohort attribute (age-linked mix) that sets how fast a story reaches each bloc and how a salience event decays; not a dynamic stock. The existing salience machinery already consumes this.
- **Verdict.** Skip as dynamics; use as cohort exposure weights.

#### D8. Civic participation and turnout

- **Range.** 2024 presidential election: 73.6% (174 million) of citizen voting-age population registered, 65.3% (154 million) voted; in person on Election Day 39.6%, in person early 30.7%, by mail 29.0% [O census.gov press release]. CPS turnout over-reports relative to administrative counts [S on the over-report point; Census itself notes survey estimates]. I did not open a turnout history or the AmeriCorps volunteering release (formal volunteering about 28% in 2023 [S]).
- **Game form.** Turnout is already a bloc mechanic in the approval design; do not add a civic-participation stock.
- **Verdict.** Skip beyond the election model.

### E. Disasters and environment

#### E1. Hurricanes, floods, severe storms

- **Frequency and cost.** NOAA NCEI, 1980 to 2024: 403 billion-dollar events costing over $2.915 trillion (2024 dollars); tropical cyclones 67 events, $1,543.2 billion, 7,211 deaths, $23.0 billion per event; severe storms 203 events, $514.3 billion, 2,145 deaths; inland floods 45 events, $203.0 billion; drought and heat waves 4,658 deaths and $367.5 billion. 2024: 27 events (11 severe storm or hail, 6 tornado outbreaks, 5 tropical cyclones, 2 winter storm or cold wave, 1 wildfire, 1 drought or heat wave, 1 flood), at least 568 deaths, $182.7 billion. The annual event count averaged 9.0 for 1980 to 2023 and 23.0 for 2020 to 2024; the annual cost averaged $64.8 billion for 1980 to 2024 and $149.3 billion for 2020 to 2024 [O climate.gov, an archive as of June 25, 2025, "not being updated or maintained"].
- **Deadliest recent events.** Hurricane Helene: at least 250 US deaths (175 direct), $78.7 billion US damage, the deadliest US hurricane since Katrina; North Carolina 107, South Carolina 50, Georgia 37, Florida 34, Tennessee 18; [O NHC tropical cyclone report PDF for 250, 175 and $78.7 billion]; the state split and the 94 freshwater-flooding deaths come from a search summary of the report's table [S]. Hurricane Maria: Puerto Rico's government estimated 2,975 deaths (direct and indirect), US damage estimate $90 billion (Puerto Rico and the US Virgin Islands) [O NHC Maria report text].
- **Federal declarations (the presidential lever).** Major disaster declarations (type DR) by year from OpenFEMA, one row per disaster number [C from O API]: 45 (2000), 68 (2004), 48 (2005), 75 (2008), 99 (2011), 47 (2012), 43 (2015), 59 (2017), 61 (2019), 104 (2020, of which 57 biological, i.e., COVID-19), 58 (2021), 47 (2022), 71 (2023), 100 (2024), 45 (2025), 57 (2026 to date, October 9). Severe storm is the largest category in nearly every year. The range, 43 to 104, is 2.4×; 2020 and 2024 are the extremes. Emergency (EM) and fire-management (FM) declarations are separate.
- **Drivers and downstream.** Climate and exposure, plus politics: Reeves finds twice as many declarations in competitive states and over one point of statewide gain per declaration [O]; Healy and Malhotra find relief rewarded and preparedness not, with $1 on preparedness averting about $15 of damage [O]. Opinion effect on the headline can be small (Gallup, Katrina) while handling ratings fall. The approval design fits a relief condition at 0.7 severity: services -0.30, competence -0.08, 26 weeks.
- **Game form.** Existing acute conditions, located by state and county, with: a located toll (direct deaths on day 0 to 3, indirect deaths over weeks, booked into the cause ledger and into `stateDeathDeltas`); displacement (a state-to-state migration shock with a recovery half-life measured by Katrina: 78% of the city population back after nine years, which is the long tail, not a typical case [C]); damage in dollars (feeds the economy, DECISIONS 6.3: bill once at the nation); a declaration case on the President's desk with a real clock and a default (DECISIONS 3.4, 3.5).
- **Cadence.** Event-day; the declaration cadence is weeks.
- **Compression.** Immediate (day 0 to 3 direct deaths), lagged (indirect deaths, recovery), distributed (damage spread across quarters).
- **Verdict.** Model with located tolls; derive damage from event class and exposure.

#### E2. Wildfire

- **Range and speed.** Acres burned (NIFC): 5,131,474 (2025), 8,924,884 (2024), 2,693,910 (2023), 7,577,183 (2022), 7,125,643 (2021), 10,122,336 (2020), 10,125,149 (2015); the 2016 to 2025 average is about 7.05 million acres and 63,405 fires a year [C from O table]. Camp Fire 2018: 85 deaths and more than 14,000 homes [O ktvu.com]; Lahaina 2023: 102 deaths [O civilbeat.org]. Peshtigo 1871 at least 1,152 deaths is the historical outlier [S].
- **Game form.** The `wildfire` condition with an annual acreage draw within the observed 2.7 to 10.1 million range, located by state exposure; deaths rare and tail-heavy (tens to about a hundred in the worst modern events); evacuation displacement by county; smoke is a health channel with no source opened, so omit it.
- **Verdict.** Model the condition; deaths and displacement as tolls.

#### E3. Heat

- **Range.** About 2,300 US death certificates mentioned excessive heat in 2023, the highest in 45 years of records, with Arizona 874 in summer 2023; excess-death estimates put 2023 at about 11,000 [O AP]. NOAA counts drought and heat-wave events with 4,658 deaths from 1980 to 2024 [O].
- **Game form.** Hazard multiplier on the oldest cells and outdoor-exposed states in the `heat-wave` condition, booked as a located toll with a certificate count that understates the true count by about 5× (reported vs true, 3.4).
- **Verdict.** Model through the same toll path as other disasters.

#### E4. Climate trend

- **Range and speed.** Contiguous US annual mean temperature (NOAA NCEI): 1901 to 1960 mean 51.91 °F; 2001 to 2010 mean 53.23 °F; 2016 to 2025 mean 54.23 °F; record year 2024 at 55.48 °F, then 2012, 2016, 2025 (54.62) and 2017; linear trend 1970 to 2025 about 0.51 °F per decade [C from O NCEI CSV].
- **Game form.** Over eight years the trend adds about 0.4 °F, below any per-term signal. Hold as an authored exposure drift raising condition frequencies slowly, as the NOAA event-count series suggests (9.0 events a year on the long average vs 23.0 recently), not as a simulated climate.
- **Verdict.** Skip as a dynamic.

### F. Other nations (the 196 governments)

The same identity (births, deaths, net migration) already exists for every nation. UN World Population Prospects 2024: world 8.2 billion in 2024, peak about 10.3 billion in the mid-2080s; global fertility 2.25 births per woman (3.31 in 1990); more than half of countries below replacement (2.1); global life expectancy 73.3 in 2024, having fallen to 70.9 in the pandemic years from 72.6 in 2019 [O WPP2024 Summary of Results PDF]. WHO estimated about 14.9 million excess deaths worldwide in 2020 and 2021 (13.3 to 16.6 million); 84% were in South-East Asia, Europe and the Americas; about 68% in ten countries; 81% in middle-income countries [O who.int]. UCDP counted 61 state-based conflicts in 2024, the most since 1946, with 11 reaching war level, about 160,000 deaths from organised violence, and about 76,000 battle deaths in Ukraine [O uu.se]. Recommendation: for non-US nations, keep the three-rate national identity, let war, disaster and epidemic tolls write deaths through the one `populationToll` path, and hold the full ledger only for the played nation. [D]

## 5. Tracking population counts

### 5.1 Three levels

| Level | Holds | Updated | Why |
|---|---|---|---|
| Ledger (authoritative) | People by state × age band (under 18, 18 to 44, 45 to 64, 65 to 74, 75 to 84, 85 and older) × sex: 51 × 6 × 2 = 612 cells | Weekly | The smallest grain at which mortality, fertility, migration and the sourced age gradients differ. Cheap: 612 integers. |
| Derived readings (never stored) | National and state totals, median age, 65-plus share, dependency ratio, natural increase, period life expectancy, crude death and birth rates | On read | DECISIONS 1.10, 4.4. |
| Cohort shares (the 11 overlapping axes) | Shares within a state | Age: from the ledger. Nativity: from arrivals and departures. The other nine: held at founding values | The 65-plus share moved about 0.5 point a year in the record; cohort shares barely move in a term, and no source I opened gives a race, religion, class or disability mortality gradient to apply. |

Why this grain and not more: the owner's cohort model has overlapping axes, which cannot all be ledgers without an 11-dimensional table. The age-by-state ledger is the partition on which the two sourced facts that matter (age gradient of deaths, state spread of rates) depend.

### 5.2 Weekly update

```
for each state s, age band a, sex x:
  deaths[s,a,x]  = round_seeded( pop[s,a,x] * hazard[a,x] * season(week) * (1 + sum_k shock_k[s,a]) )
                   + located_tolls[s,a,x]                      // disaster, war, incident
  births[s]      = round_seeded( fertility_index[s] * women_15_44[s] / weeks_per_year * season )
  aging          = pop[s,a,x] * (1 / band_width_a) / weeks_per_year   // moves to next band
  intl[s]        = NIM_week * state_share[s]                    // policy flow, signed
  dom[s]         = push_pull_week[s]                            // zero-sum across states
  pop'[s,a,x]    = pop + births(a=0) - deaths + aging_in - aging_out + intl_share + dom_share
```

Rules [D, anchored to the decisions]: every draw has its own stream key (1.3); iteration order is declared (1.4); a cause is booked once, by the system that owns it (one writer per cause line, as 6.4 requires of macro figures); a located toll goes to its state first and spreads only an unlocated remainder (the existing `stateDeathDeltas` behavior); a condition may not write the figure that opens it (6.4), so the epidemic's onset must not read deaths it will itself book.

### 5.3 What the player should see

- A weekly deaths line against the expected band, with excess deaths as the headline when above about 5% (the 2019 seasonal sd).
- The cause ledger for the last four, 12 and 52 weeks.
- Reported vs final tolls for a live event, with an uncertainty range that closes over the lag.
- State and city stocks only where they moved (growth leaders and decliners, as in the Census release).
- Life expectancy and median age as annual releases, derived.
- A migration panel with inflow, outflow and the reported-vs-true gap.

### 5.4 What scale visibly moves what over four to eight years

| Magnitude in a year | Reaches the national count? | Reaches a state? | Example |
|---|---|---|---|
| 1.5 million swing in NIM | Yes (0.4% of population) | Yes (FL, TX, CA, NY take 44%) | 2024 to 2025 |
| 300,000 to 500,000 excess deaths | Yes (0.1% to 0.15%) | Yes | COVID 2020 to 2022 |
| 100,000 deaths (overdose) | Barely (0.03%) | Visible in the cause ledger and in ages 15 to 44 | 2022 peak |
| 20,000 to 50,000 (flu, suicide, homicide) | No | No | 2023 to 2025 |
| Hundreds to a few thousand (disasters, heat, a war) | No | Rarely: a county or a city | Helene 250, Maria 2,975 |
| Displacement of a city | No | Yes for the metro and state | Katrina, New Orleans -53% |

The rule that follows: a disaster, a riot or a crime wave earns visible effect through opinion, blame, local displacement and the economy, not through the national population number.

## 6. Linkage map: what writes what

Each row names one writer and the metrics it bills, with the evidence strength. Nothing here writes approval directly; it feeds the existing six judgments or the blocs (DECISIONS 5.9, 6.3).

| Cause | Writes | Evidence | Note |
|---|---|---|---|
| Epidemic severity | Deaths (age-banded), hospital strain, unemployment and GDP in the shock year, services and competence judgments, local vote | Sourced: age gradient and CDC parameters [O]; macro series [O]; Baccini et al. [O] | Bill the economy once; the approval design already fits pandemic onset at RMSE 3.6. |
| Immigration acts | NIM, state populations, nativity cohort share | Sourced counts [O]; downstream economic effect not opened | Largest lever on counts. |
| Insurance programs | Coverage, near-elderly low-income mortality | Miller, Johnson and Wherry [O] | Lag of years. |
| Crime index | Homicide deaths, perceived crime, security judgment, incarceration | Series [O]; perception gap [O]; Levitt [O] | Perception is a separate lagged state. |
| Protest, violent tail | Unrest condition, security judgment, local vote | CCC counts and violence shares [O]; Wasow [O] | Sign depends on violence and party. |
| Disaster | Located deaths, displacement, damage, services and competence judgments, declaration case | NOAA [O]; Katrina [O]; Gallup [O]; Reeves, Healy and Malhotra [O] | Competence modulates timing and blame. |
| War | Military deaths by state of record, security judgment | CRS table [O]; Mueller fit in the approval design | Booked once; currently not booked. |
| Polarization stock `P` | Affective and ideological readings, threat level, bloc intercepts | Pew, Voteview [O, C] | One stock, derived readings. |
| Unemployment, prices | Poverty (derived), crime (not modeled, no sourced slope) | Economy brief | Do not link crime to the economy by an unsourced slope (Levitt finds the 1990s economy mattered little). |

Evidence strength: causal design with an instrument or natural experiment (Wasow, Baccini et al., Miller et al.); observational with design (Healy and Malhotra, Reeves, Levitt); measurement only (all series).

## 7. Modulation by officials and the President, without invented coefficients

The sibling economy brief states the principle (section 6.3 there): give each official a bounded role, not a coefficient on the outcome. Applied here:

1. **FEMA director.** Speeds the time to a declaration and to relief within the observed cadence; sets the quality of the briefing the President sees on a live event (the reported toll's noise and lag, 3.4); sets recovery speed for displaced populations; sets blame attribution. It does not set the direct death toll, because no source I could open quantifies that effect. [D, anchored to 3.4 and 3.5]
2. **HHS secretary and CDC director.** Information quality and delay on an epidemic; availability of therapeutics and capacity modeled as the IFR and capacity inputs the CDC itself says its parameters omit.
3. **Attorney General and police chiefs.** Enforcement posture sets the violent tail of unrest and the crime resting point through standing programs (DECISIONS 6.2); evidence for the size of the effect is limited to Levitt's qualitative list, so use authored scales labeled as game assumptions.
4. **President's traits.** Attention to disasters and trust-building change the blame term, because the opened evidence says voters reward visible relief (Healy and Malhotra) and competitive-state declarations (Reeves).

## 8. Challenge before committing

- **Strongest failure mode.** False precision on series that disagree, plus a ledger the player never sees move. If the ledger is built but national counts barely change in eight years, the owner's instruction ("illnesses, unrest, fatality rates should play into population counts") looks unmet. Mitigation: show the flows, the located stocks and the cause ledger; tell the player plainly why a national count is stable (section 3.1); let migration and a pandemic move the count when they should.
- **Best alternative.** Keep the three national rates, add weekly `populationToll` bookings by cause, and add a state-level death split; no age bands. It costs less and answers the owner's instruction. It fails on the sourced age gradient (80.8% of 2020 COVID-involved deaths were aged 65 and older; the 65-plus share is itself rising 0.5 point a year), so an epidemic would kill the wrong population and median age would never move. Reject it for epidemics; it is adequate for non-US nations.
- **Other risks.** (a) Over-billing: a death toll, a displacement and an opinion charge for one event must each have one writer. (b) Sensitivity: tolls attached to named groups would violate DECISIONS 5.8; allocate by age, state and exposure only. (c) Revisions: a final toll differing from the reported one must be a designed event, not a bug.
- **Conclusion: accepted with controls.** Controls: stochastic rounding with declared stream keys; one writer per cause; reported vs true; a balance-harness check that a no-event 8-year run reproduces natural increase near 0.15% a year, with 17 states in natural decrease at a founding matched to the year to June 2025; and validation of the epidemic engine against `xkkf-xrst` weekly excess (peak +47.6% vs expected) and 2020 to 2022 totals as a band.

## 9. Gaps and unverified items (closing them before build)

1. Pandemic base rate: the only frequency figure is [S] (Marani et al. abstract via search). Open the paper and pick a rate or declare the game's pandemic frequency a design number.
2. Immigration effects on the economy and labor force; CBO vs Census NIM gap. CBO pages returned 403.
3. Fertility response to economic and policy changes: no elasticity opened.
4. Domestic migration drivers: no study opened.
5. Death-toll effect of FEMA or HHS competence: none found; the game must not invent one.
6. Mortality gradients by race, occupation or religion: none opened; keep the ledger to age, sex and state.
7. FBI primary figures (blocked); FBI-vs-NCVS bridge; the cause of the 2020 homicide spike.
8. CCC bulk data (counts of protests per year, share with injuries or arrests) and ACLED US annual totals.
9. Historical series for uninsured rate, poverty, education attainment and turnout (only single years opened).
10. Hospital-capacity data end in April 2024; the series sums reporting hospitals with varying coverage.
11. Heat-death and wildfire-smoke mortality: only the 2023 certificate count and one excess-death estimate are opened.
12. NOAA's billion-dollar series stopped after 2024; recent costs need another source (NHC reports give per-storm costs).
13. Whether the engine can accept a `populationToll` emitter and a state × age ledger inside its file-size and phase-order rules was not checked (INVENTORY.md notes the toll kind has no emitter).
14. The existing doc-sync surfaces (SCHEMA.md, ARCHITECTURE.md, `stat-consumers.ts`) would change; I did not draft those edits.

## 10. Sources and pulls

Pages and files I opened (figures above read from these):

- NCHS, Mortality in the United States, 2024 (Data Brief 548): https://www.cdc.gov/nchs/products/databriefs/db548.htm and https://www.cdc.gov/nchs/data/databriefs/db548.pdf
- NCHS, Mortality in the United States, 2022 (Data Brief 492): https://www.cdc.gov/nchs/data/databriefs/db492.pdf ; NCHS VSRR 23 (2021 provisional life expectancy): https://www.cdc.gov/nchs/data/vsrr/vsrr023.pdf
- NCHS, Births: Provisional Data for 2025: https://cdc.gov/nchs/pressroom/releases/20260409.html
- CDC open data: overdose deaths `xkb8-kh2a` (https://data.cdc.gov/resource/xkb8-kh2a.json), excess deaths `xkkf-xrst`, COVID deaths by age and year `9bhg-hcku`, life expectancy 1900 to 2018 `w9j2-ggv5`; page https://www.cdc.gov/nchs/nvss/vsrr/covid19/excess_deaths.htm and https://www.cdc.gov/nchs/nvss/vsrr/drug-overdose-data.htm
- CDC COVID-19 Pandemic Planning Scenarios, Sept. 10, 2020: https://stacks.cdc.gov/view/cdc/93432/cdc_93432_DS1.pdf
- CDC flu burden 2024-25: https://cdc.gov/flu-burden/php/data-vis-vac/2024-2025-prevented.html ; 1918 pandemic: https://archive.cdc.gov/www_cdc_gov/flu/pandemic-resources/1918-commemoration/1918-pandemic-history.htm
- HHS hospital capacity `g62h-syeh`: https://healthdata.gov/resource/g62h-syeh.json
- Census Bureau: Vintage 2025 release https://census.gov/newsroom/press-releases/2026/population-growth-slows.html ; NIM blog https://census.gov/newsroom/blogs/random-samplings/2026/01/historic-decline-in-net-international-migration.html ; state file https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/totals/NST-EST2025-ALLDATA.csv ; income, poverty and insurance https://www.census.gov/newsroom/press-releases/2026/income-poverty-health-insurance-coverage.html ; income report https://www.census.gov/library/publications/2026/demo/p60-289.html ; voting https://www.census.gov/newsroom/press-releases/2025/2024-presidential-election-voting-registration-tables.html ; education https://www.census.gov/newsroom/press-releases/2025/educational-attainment-data.html ; Katrina https://www.census.gov/newsroom/facts-for-features/2015/cb15-ff16.html
- World Bank API (`SP.DYN.*`, `SM.POP.NETM`, `SP.POP.65UP.TO.ZS`, `SH.MED.BEDS.ZS`, `SH.XPD.CHEX.GD.ZS`, `VC.IHR.PSRC.P5`, `SP.DYN.LE00.IN`, `SI.POV.GINI`, `NY.GDP.MKTP.KD.ZG`, `SL.UEM.TOTL.ZS`, `SL.TLF.CACT.ZS`): https://api.worldbank.org/v2/country/USA/indicator/
- BJS: Criminal Victimization 2024 https://bjs.ojp.gov/library/publications/criminal-victimization-2024 ; Prisoners in 2023 tables https://bjs.ojp.gov/document/p23st.pdf ; Jail Inmates in 2024 https://bjs.ojp.gov/library/publications/jail-inmates-2024-statistical-tables/web-report
- FBI 2024 as reported by AP/PBS: https://www.pbs.org/newshour/nation/murders-dropped-nearly-15-last-year-fbi-data-shows
- Gallup: confidence in institutions 2026 https://news.gallup.com/poll/712436/confidence-institutions-remains-near-time-low.aspx ; media trust 2026 https://news.gallup.com/poll/714938/trust-news-media-edges-slightly-higher.aspx ; crime 2023 https://news.gallup.com/poll/544442/americans-crime-problem-serious.aspx ; Katrina https://news.gallup.com/poll/24283/little-impact-katrina-bushs-overall-job-ratings.aspx
- Pew: https://www.pewresearch.org/politics/2025/12/04/public-trust-in-government-1958-2025/ ; https://www.pewresearch.org/2025/05/08/americans-trust-in-one-another/ ; https://www.pewresearch.org/politics/2022/08/09/as-partisan-hostility-grows-signs-of-frustration-with-the-two-party-system/ ; https://www.pewresearch.org/short-reads/2025/12/04/as-democrats-anger-spikes-americans-feelings-about-the-federal-government-grow-more-polarized/ ; https://www.pewresearch.org/journalism/fact-sheet/social-media-and-news-fact-sheet/ ; https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/
- Voteview `HSall_members.csv`: https://voteview.com/static/data/out/members/HSall_members.csv (party-mean gap computed by me)
- Harvard Ash Center CCC: https://ash.harvard.edu/programs/crowd-counting-consortium/ and https://ash.harvard.edu/articles/crowd-counting-consortium-contours-of-the-george-floyd-uprising ; No Kings analysis https://znetwork.org/znetarticle/new-data-shows-no-kings-was-one-of-the-largest-days-of-protest-in-us-history/ ; ACLED https://acleddata.com/update/united-states-and-canada-overview-august-2025 ; USCP https://www.uscp.gov/media-center/press-releases/uscp-threat-assessment-cases-2025
- NOAA: billion-dollar disasters (archived) https://www.climate.gov/news-features/blogs/beyond-data/2024-active-year-us-billion-dollar-weather-and-climate-disasters ; NHC climatology https://www.nhc.noaa.gov/climo/ ; Helene https://www.nhc.noaa.gov/data/tcr/AL092024_Helene.pdf ; Maria https://www.nhc.noaa.gov/data/tcr/AL152017_Maria.pdf ; temperature https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/national/time-series/110/tavg/12/12/1895-2025/data.csv
- OpenFEMA: https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries (deduplicated by disaster number)
- NIFC wildfire statistics: https://www.nifc.gov/fire-information/statistics/wildfires
- Camp Fire https://www.ktvu.com/news/officials-confirm-camp-fire-death-toll-drops-to-85 ; Lahaina https://www.civilbeat.org/2024/06/lahaina-wildfire-death-toll-now-at-102/ ; heat deaths (AP) https://www.nbcsandiego.com/news/national-international/record-us-heat-deaths-in-2023-killing-in-areas-that-used-to-handle-the-heat-ap/3529344/
- CRS RL32492 (2020 version, HTML): https://www.everycrsreport.com/files/2020-07-29_RL32492_e7d48d4caf03cdd007922fe2dc0d50d2a5594721.html
- Studies: Healy and Malhotra https://digitalcommons.lmu.edu/econ_fac/4 ; Reeves https://profiles.wustl.edu/en/publications/political-disaster-unilateral-powers-electoral-incentives-and-pre/ ; Baccini et al. https://glabor.org/ (abstract page) ; Wasow working paper PDF https://www.gwern.net/doc/sociology/2020-wasow.pdf ; Miller, Johnson and Wherry https://www.nber.org/papers/w26081 ; Levitt https://ideas.repec.org/a/aea/jecper/v18y2004i1p163-190.html
- UN WPP 2024 Summary of Results: https://population.un.org/wpp/assets/Files/WPP2024_Summary-of-Results.pdf ; WHO excess deaths https://www.who.int/news/item/05-05-2022-14.9-million-excess-deaths-were-associated-with-the-covid-19-pandemic-in-2020-and-2021 ; UCDP https://www.uu.se/en/press/press-releases/2025/2025-06-11-ucdp-sharp-increase-in-conflicts-and-wars

Search-only items marked [S]: CBO Demographic Outlook figures; Marani et al.; CCC 2025 counts beyond the ZNet analysis; the all-adult education figure; AmeriCorps volunteering; the CPS turnout over-report note; FluSurv-NET coverage; Peshtigo.
