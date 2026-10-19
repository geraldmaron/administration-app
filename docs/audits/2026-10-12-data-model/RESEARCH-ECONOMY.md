# Economy data model: research brief

Date of research: 2026-10-13. Scope: the axes used today to measure the US economy, how each behaves, how each reaches approval and elections, and how to carry each in a game that plays one or two four-year terms. Research only; no source was modified.

## 0. Recommendation first

Model the economy as four layers, not one list of statistics.

1. **Real economy (stocks that persist):** output gap, unemployment (U-3) with its natural rate, participation, real income. These move slowly and drive everything else.
2. **Prices and money (stocks plus shock layers):** core inflation as a slow stock with an expectations anchor, energy and food as fast shock layers on top, the policy rate, the 10-year yield, the mortgage rate, the dollar.
3. **Fiscal and external (annual-scale stocks):** deficit, debt, interest cost, receipts, trade balance, tariffs.
4. **Perception (its own stock, with its own lag and its own filters):** consumer sentiment and the "perceived economy" that approval and elections actually read. The data and the perception diverge for years at a time (section 5.11), so the perception layer cannot be a relabel of the data layer.

The single most important finding for the approval problem: **the literature does not say the economy is a strong, direct driver of weekly approval.** In Gordon's 1956-2024 fit, five economic indicators explain 16% of the variance of quarterly presidential approval; consumer sentiment alone explains 22%; adding the honeymoon and named events lifts R-squared to 0.72 [O, Gordon NBER w33068]. The economy matters more through (a) sentiment, (b) the election-year economy, and (c) the vote than through approval week by week. The audit's "3-6x too weak" claim therefore needs a measured target, not an assumed one (section 6.4 lists the targets and the probe to run).

Model fully: output growth and gap, U-3, core and headline inflation (with gasoline and food split out), real wage and real disposable income, the policy rate, 10-year yield and mortgage rate, federal deficit/debt/interest, gasoline price, consumer sentiment (perception layer), equities.
Derive (computed from the above, not stored): U-6, payrolls, participation response, PCE from CPI, shelter, mortgage-linked housing starts and prices, credit spreads, financial conditions, poverty rate, trade balance, dollar, state and sector unemployment.
Skip as state (display flavor or fixed): Gini and wealth shares, jobless claims, job openings, capacity utilization, auto sales, producer prices.

## 1. How to read this document

Every number carries a tag.

- **[O]** read on a page or PDF I opened this session. URL in section 9.
- **[C]** computed by me from a FRED CSV export pulled 2026-10-13 (series id in the text). FRED redistributes BLS, BEA, Treasury, CBO, Fed, EIA and Michigan data; the underlying agency is named. Vintage matters: later revisions will move these.
- **[S]** appeared in a search-result summary; I did not open the page. Unverified; do not build on it without opening the source.
- **[D]** design judgment. No source; stated so it can be challenged.

Access limits that shaped the sources: cbo.gov, centerforpolitics.org and the Cambridge/ScienceDirect journal pages returned HTTP 403 to fetches. The CBO baseline figures below come from a House Budget Committee staff summary of CBO's February 2026 report [O], which is a restatement, not CBO's own page. I had no presidential approval series to regress on (the UCSB/Gallup table is only a Google Sheet), so approval slopes below come from published studies, not from my own fit.

Data gaps in the FRED exports themselves: CPI and unemployment have no value for October 2025 [C]. A missing release is therefore a real thing in recent US data, and the game's release calendar can skip one.

## 2. Where the economy stands today (the opening condition to calibrate against)

This is not the benign economy of the dataset snapshot. Gasoline, long yields and sentiment are at or near extremes.

| Axis | Latest | Tag |
|---|---|---|
| Real GDP, Q2 2026 | 24,408.0 B chained 2017 dollars, +2.2% annualized (third estimate, Sep 30); Q1 24,274.4 | [O] FRED GDPC1, BEA |
| Nominal GDP, Q2 2026 | 32,563.0 B | [C] GDP |
| Real GDP per capita, Q2 2026 | 71,212; +1.9% over four quarters | [C] A939RX0Q048SBEA |
| Output gap (real GDP over CBO potential) | +1.4% in Q2 2026 | [C] GDPC1 / GDPPOT |
| CBO natural rate of unemployment | 4.39% (2026 Q3) | [C] NROU |
| Unemployment U-3 / U-6 | 4.2% / 7.6% (Sep 2026); Aug was 4.1% | [O] BLS table A-15, FRED UNRATE |
| Payrolls | +29K Sep; three-month average +51K; last 12 months mean +41K, sd 109K | [C] PAYEMS |
| Participation / employment-population | 61.8% / 59.2% (Sep) | [C] CIVPART, EMRATIO |
| Initial claims | 197K (week of Oct 3) | [C] ICSA |
| Job openings | 7.079M (Aug); unemployed 7.109M (Sep) | [C] JTSJOL, UNEMPLOY |
| Avg hourly earnings, production/nonsupervisory | $32.60, +3.3% over 12 months; real change vs CPI -0.4 pt in Aug, negative since Apr 2026 | [C] AHETPI, CPIAUCNS |
| CPI-U all items | 334.131 (Aug), +3.71% over 12 months; +0.40% on the month | [O] FRED CPIAUCSL; yoy [C] |
| Core CPI | +2.76% over 12 months | [C] CPILFESL |
| PCE price index / core PCE | +3.4% (BEA) / +3.01% | [O] BEA / [C] PCEPILFE |
| CPI energy / food at home / food away / shelter | +16.8% / +2.65% / +3.66% / +3.44% over 12 months | [C] CPIENGSL, CUSR0000SAF11, CUSR0000SEFV, CUSR0000SAH1 |
| Regular gasoline | $4.354 a gallon (week of Oct 5); $4.465 the week before; diesel $6.199 | [O] GASREGW / [C] GASDESW |
| WTI crude | $96.24 (Oct 6); monthly average $64.5 in Feb, $91.4 Mar, $100.3 Apr, $102.1 May 2026 | [C] DCOILWTICO, MCOILWTICO |
| Fed funds, effective | 3.75% (Sep); FOMC raised the target to 3.75-4.00% on Sep 16, vote 12-0 | [O] FRED FEDFUNDS; federalreserve.gov statement |
| 10-year / 2-year Treasury | 5.22% / 4.75% (Oct 8); 10-year hit 5.31% on Oct 5, highest since 2020 | [C] DGS10, DGS2 |
| 30-year mortgage | 7.40% (Oct 8); 2020-26 range 2.65% to 7.79% | [C] MORTGAGE30US |
| S&P 500 | 7,807 (Oct 12); VIX 14.84 | [C] SP500, VIXCLS |
| High-yield spread | 3.15 pts (Oct 8) | [C] BAMLH0A0HYM2 |
| Federal receipts / outlays / deficit, Q2 2026 | 6,056 B / 7,755 B / -1,699 B at annual rate (18.6% / 23.8% of GDP) | [C] FGRECPT, FGEXPND, FGDEF |
| Federal interest payments, Q2 2026 | 1,280 B annual rate, 3.9% of GDP | [C] A091RC1Q027SBEA |
| Gross federal debt | $39.46 trillion (Q2 2026); 122.6% of GDP (Q1 2026) | [C] GFDEBTN, GFDEGDQ188S |
| CBO baseline FY2026 | deficit $1.9T (5.8% of GDP), revenue 17.5%, outlays 23.3%, net interest 3.3% rising to 4.6% by 2036, discretionary 5.9%, mandatory 14.2% | [O, House Budget Cmte summary of CBO Feb 2026] |
| Trade balance, goods and services | -$105.6B (Aug); -$53.7B in Mar; worst on record -$133.0B (Mar 2025) | [C] BOPGSTB |
| Imports / exports / net exports | 14.4% / 11.7% / -2.7% of GDP (Q2 2026) | [C] IMPGS, EXPGS, NETEXP |
| Broad dollar index | 121.38 (Oct 2); 130.04 peak Jan 13, 2025 | [C] DTWEXBGS |
| Average statutory tariff rate | 11.1% (Jul 24, 2026), 11.8% by year-end under current law; price-level effect about 0.7%; household cost about $1,100 a year | [O] Yale Budget Lab |
| Michigan sentiment | 51.7 (Aug final); 46.3 (Oct preliminary); series low 44.8 in May 2026 | [O] FRED UMCSENT, sca.isr.umich.edu / [C] low |
| Michigan inflation expectations | 4.7% year-ahead, 3.5% long-run (Oct preliminary) | [O] |
| Conference Board confidence | 81.9 (Sep preliminary), 88.6 in Aug; present situation 109.3; expectations 63.6; labor differential +1.7 | [O] |
| Case-Shiller national | 333.2 (Jul), +1.9% over 12 months; housing starts 1.275M (Aug) | [C] CSUSHPISA, HOUST |
| Median household income / poverty | $87,460 in 2025; official poverty 10.2%; SPM 13.1% | [O] Census |
| Wealth shares | top 1% hold 32.5% of net worth, bottom 50% hold 2.3% (2026 Q1) | [C] WFRBST01134, WFRBSB50215 (Fed DFA) |
| Sahm indicator | 0.00 (Sep 2026) | [O] FRED SAHMREALTIME |

The story these numbers tell: an oil-supply shock (EIA names Middle East hostilities and a constrained Strait of Hormuz [O, STEO Oct 2026]) pushed gasoline from about $2.91 in Feb to $4.48 in May [C]. Output and jobs held (U-3 4.3% to 4.1% over Mar-Aug, GDP +2.2% in Q2). Sentiment fell to a record low. The Fed is now tightening into it. Long yields and mortgage rates are at multi-year highs. That mismatch, a solid labor market and the worst sentiment ever recorded, is the central design case for the perception layer.

## 3. Dynamics: ranges, speeds, lags, shocks

### 3.1 Speeds observed in the data

| Series | Typical month/week-to-month noise | Fastest observed | Source |
|---|---|---|---|
| U-3 | one-month change sd 0.15 pt (1990-2026, excluding 2020 months); no non-2020 month moved more than 0.5 pt | 3.5% (Feb 2020) to 14.8% (Apr 2020) in two months | [C] UNRATE |
| Payrolls | 2015-19 mean +190.5K, sd 82.5K; last 12 months sd 109K around a +41K mean | -20,469K (Apr 2020); worst 2008-09 month -824K (Mar 2009) | [C] PAYEMS |
| CPI month on month | sd 0.25% (1990-2026 excluding 2020-22) | +1.26% (Jun 2022) | [C] CPIAUCSL |
| Gasoline, weekly | sd 2.2% of price (since 2000) | +17.6% in a week; -9.6% in a week | [C] GASREGW |
| Real GDP, quarterly annualized | sd 4.4 pts (since 1990, includes 2020) | -28.0% (Q2 2020), +34.9% (Q3 2020) | [C] GDPC1 |
| Fed funds | moves in 25-50 bp steps at 8 meetings a year | +4.0 pts in ten months (Feb to Dec 2022); -4.6 pts in 15 months (Aug 2007 to Nov 2008) | [C] FEDFUNDS; meeting count [O] federalreserve.gov calendar |
| 10-year yield | | largest 63-trading-day rise +1.50 pts (ending Oct 2022); fall -1.30 pts (ending Apr 2020) | [C] DGS10 |
| S&P 500 | 12-month return mean 14.0%, sd 13.5% (Oct 2016 to Oct 2026 window only) | -33.9% in 23 trading days (Feb 19 to Mar 23, 2020); -25.4% from Jan 3 to Oct 12, 2022 | [C] SP500 (FRED holds only ten years) |
| Michigan sentiment | 2000-19 mean 85.8, sd 12.2 | 56.6 (Feb 2026) to 44.8 (May 2026) | [C] UMCSENT |

### 3.2 Recessions and shock shapes

NBER monthly recession flags give 12 recessions starting between Dec 1948 and Mar 2020, lengths 2 to 18 months [C, USREC]. At 12 starts in 78 years the arrival rate is 0.154 a year, which is 46% for at least one start in a four-year window and 71% in eight years (my arithmetic, a Poisson approximation, [C]). Because roughly half of single-term games would see a recession by chance, the game's cycle engine, not a flat dice roll, should decide it.

| Episode | Shape | Numbers |
|---|---|---|
| 2008-09 (financial, slow burn) | Long, deep, slow to heal | NBER 2008-01 to 2009-07 (18 months); real GDP peak Q2 2008 (16,943) to trough Q2 2009 (16,269), -4.0%; worst quarter -8.5% annualized (Q4 2008); U-3 5.0% (Dec 2007) to 10.0% (Oct 2009), +5.0 pts over 22 months; payrolls peak Dec 2007 (138.4M) to trough Feb 2010 (129.7M), regained May 2014; output gap bottom -5.0% (Q2 2009); S&P not in FRED window; Baa-Aaa spread 3.38 pts in Dec 2008 vs 0.93 average since 1990; VIX 80.9 (Nov 20, 2008); Case-Shiller 184.4 (Mar 2006) to 136.5 (Feb 2012), -26%; housing starts 2,273K (Jan 2006) to 478K (Apr 2009) [C, all] |
| 2020 (pandemic, cliff and V) | Instant cliff, fast rebound | NBER 2020-03 to 2020-05 (2 months); real GDP -9.1% peak to trough (Q4 2019 20,985 to Q2 2020 19,078); U-3 14.8% (Apr), U-6 22.9% (Apr); claims 6.137M (week of Apr 4); payrolls regained Feb 2020 level by Jun 2022; output gap -8.8% (Q2 2020); fed funds 0.05% (Apr 2020); VIX 82.7; S&P -33.9% [C, all] |
| 2022 (inflation, no recession) | Prices spike, jobs hold, policy overshoots then eases | CPI 12-month peak 8.98% (Jun 2022, seasonally adjusted series), core CPI peak 6.62% (Sep 2022), CPI back to 3.1% by Jun 2023 (about 12 months later); food at home peaked at 13.6% (Aug 2022); gasoline $3.53 (Feb 21) to $4.32 (Mar 14), peak $5.006 (Jun 13, 2022); U-3 stayed 3.4-3.7% through mid-2023; fed funds 0.08% to 5.08% in 16 months; mortgage rate 3.10% (Dec 2021) to 6.36% (Dec 2022); housing starts 1,807K (Apr 2022) to 1,296K (Dec 2022), -28% in 8 months; Case-Shiller 12-month growth 20.7% (Mar 2022) to 0.0% (Jun 2023), index down only 2.3% from Jun 2022 to Jan 2023 [C, all] |
| 2026 (oil supply shock, so far) | Sentiment and CPI energy move first; output and jobs have not | WTI $64.5 to $91.4 in one month (Feb to Mar), +42%; gasoline $2.91 to $4.48 by May; CPI energy +22.1% over 12 months in May; core CPI 2.67-2.99% throughout; sentiment 56.6 to 44.8 in three months; U-3 4.3% to 4.1% [C] |

Two lessons from these four.

1. **Output shocks and price shocks have different shapes.** Output shocks (2008, 2020) show up in unemployment within months and take years to heal (payrolls regained after 77 and 28 months from the peak). Price shocks (2022, 2026) show up in CPI and sentiment immediately and fade over about a year once the commodity turns, with unemployment untouched. A single "economy score" cannot carry both.
2. **The Fed's rate and housing move fast; inflation and unemployment barely moved in 2022-23.** Mortgage rates doubled within 12 months, housing starts fell 28% within 8, house-price growth went to zero in 15, and unemployment did not rise. A model where the policy rate always buys a recession would be wrong about the one recent tightening cycle [C].

### 3.3 Policy lags and pass-through (what has a source)

| Link | Evidence | Tag |
|---|---|---|
| Tariff to consumer prices | Full dollar-for-dollar pass-through about seven months after a tariff change; half after three months; 5 to 9 months range, "reasonable but still tentative"; 2025 tariffs raised core goods PCE 3.1% and core PCE 0.8% through Feb 2026; 2025 pass-through lower and slower than 2018-19 | [O] Fed FEDS Note, Apr 8 2026 |
| Tariffs, a dissent | Dallas Fed (May 2026) finds 12-month core goods inflation near zero from Feb 2025 to Mar 2026 once tariffs are accounted for | [S] |
| Crude to pump | Month-over-month change in pump price vs change in WTI, 2000-2026: same month $0.0186 a gallon per $1 a barrel, next month +$0.0098, later months about zero; sum $0.0287, about 65% in month 0 and 34% in month 1. The arithmetic full pass-through is $0.0238 (1 / 42 gallons a barrel). The sum is larger than arithmetic because refining margins rise with crude in shocks | [C] MCOILWTICO, GASREGM; regression is mine |
| Pump price composition | May 2026 at $4.48: crude 52%, refining 22%, distribution and marketing 15%, taxes 12%. Diesel at $5.60: 42 / 25 / 23 / 11 | [O] EIA |
| Federal spending multipliers | Most estimates 0.6 to 1 for spending, -2 to -3 for tax changes; identifies circumstances outside that band | [O] Ramey 2019, NBER w25531 abstract |
| Multipliers by slack | Up to 2.5 in recessions, down to about -1.0 in expansions (Auerbach and Gorodnichenko); military 0.6-1.2 at peak; local multiplier about 1.5 over two years (Nakamura and Steinsson); legislative lags between passage and spending cut the short run | [O] FRBSF Economic Letter 2012-02 |
| Monetary shocks | "Large, relatively rapid, and statistically significant" effects on output and inflation, stronger and quicker than conventional estimates (Romer and Romer, 1969-96 sample). The abstract gives no timing or size | [O] NBER w9866 abstract |
| Monetary lags, magnitudes | I could not open a source with a sourced peak-effect quarter. Use the 2022 episode above (housing within 3-8 months, inflation falling within 12 months, unemployment flat) as the observed shape | [D] |
| Okun | Annual change in U-3 = 1.33 - 0.422 x real GDP growth (1949-2026), r = -0.81; break-even growth 3.15%. Post-1985 slope -0.432, break-even 2.44%. Ball, Leigh and Loungani report -0.37 to -0.39 for output gaps; textbook -0.5 | [C] GDPC1, UNRATE / [S] BLL |
| Oil shocks to output | Hamilton: only count a price rise above its prior three-year high; falls do not mirror rises. Kilian: supply-driven rises hurt output, demand-driven rises raise it for a while | [S]; consistent with 2026 where a supply shock has hit prices and sentiment but not yet GDP [C] |

### 3.4 Asymmetry

Bad news moves behavior and expectations more than good news. A Fed staff paper finds consumption reacts to bad unemployment news but not to good, bad news is more informative to agents, and finds no significant negativity bias in newspaper coverage itself [O, FEDS 2023-001]. For the game: losses should move sentiment and approval faster than equal gains, but this should live in the perception layer, not in the physical economy.

## 4. Political economy: what moves approval, sentiment and votes

### 4.1 Evidence base with effect sizes

| Source | Finding | Tag |
|---|---|---|
| Gordon, NBER w33068 (Oct 2024), data since 1956 | Michigan sentiment is explained by unemployment gap, inflation, growth, inflation acceleration and excess inflation: R-squared 0.45 with unemployment and inflation alone, 0.67 with all five, RMSE 7.1 index points. Sentiment in 2022-24 averaged 16 points below the model. Approval ranges 25 to 91, mean 52; economic indicators alone R-squared 0.16, sentiment alone 0.22, with honeymoon and named events 0.72-0.73. Honeymoon about +10 points in a president's first year; last-year approval about 13 points below first year; approval jumps 13 points on average between a last year and the next president's first year; post-2000 averages about 10 points lower (polarization). In election equations one index point of election-year (Q2-Q3) approval or sentiment is worth about 8 electoral votes; real GDP per capita growth and excess inflation add significance beyond approval | [O] |
| Gordon's indicator definitions | Unemployment enters as the four-quarter average of (U-3 minus NAIRU). Inflation is the headline PCE deflator. Growth is four-quarter real GDP per capita growth minus 1.95. Acceleration is the latest four-quarter inflation minus its average over the last 14 quarters. Excess inflation is the 14-quarter average inflation minus the same average four years earlier | [O] |
| Fair, mid-term House equation, July 31, 2026 | Sample 1918-2022, 27 midterms, R-squared 0.763, SE 2.39. Inflation: -0.370 per point of average absolute GDP-deflator growth over the first 7 quarters. Output: 0.528 per "strong growth" quarter scaled by 15/7, where strong is real per-capita growth above 3.2% annualized. In-party penalty -3.36 points. Economic coefficients are smaller in the midterm equation than in the presidential one, same proportions. For 2026: deflator growth 3.90% over six quarters, 2 strong quarters, predicted Democratic House share 50.89% | [O] |
| Fair, presidential equation (2000 vintage) | Growth +0.691 per point (per capita real GDP, Q2-Q3 of the election year), inflation -0.775 per point (absolute deflator growth, prior eight quarters), good-news quarters +0.837 each | [S], older vintage |
| Hibbs, "Bread and Peace" | Two-party vote = 46.2 + 3.61 x weighted growth of real disposable income per capita - 0.307 x cumulative war deaths (thousands). Weight decay 0.914 per quarter back from the election, which gives a memory half-life of 7.7 quarters (my arithmetic). 14 elections 1952-2004, adjusted R-squared 0.826, RMSE 2.42. Observed weighted growth by term ran from -0.39 (Carter) to 4.21 (Johnson) | [O] |
| Healy and Lenz, AJPS 2014 | Voters say they weigh all four years of a term; in practice they substitute the election-year economy ("end heuristic"). Giving them cumulative growth removes the effect | [S] |
| Abramowitz "Time for Change" | Inputs: late-June net approval, Q2 GDP growth, first-term dummy. First-term advantage worth about 4 points in 2012, reduced to 2.5 after he re-fit for polarization. Correct winner of the popular vote every year since 1988 except 2016 | [S] |
| Gas prices and approval (Wood 2011, Kondik 2022) | Real gas price vs Gallup approval: correlation -0.52, R-squared 0.27 across six presidencies (opened). Updated Feb 1977 to Feb 2022: -0.47 (search-reported). When gas is below $2 the correlation is -0.045. No dollars-to-points slope reported. Authors say the link weakened in recent years | [O] Wood / [S] Kondik |
| Stantcheva, Brookings BPEA 2024 | 80% believe prices rise faster than wages even when hourly wages rose 4.1% vs CPI 3.4% in 2023; median respondent put 2023 inflation at 5%; inflation ranked the top economic and social issue across political groups | [O] |
| Gallup Economic Confidence | Partisan gap averaged 68 points in 2017 (outlook gap 103, current-conditions gap 33, December peak 88); each party is most positive when its own party holds the presidency; Gallup says partisan views seem relatively unaffected by objective conditions; gaps widen before elections | [O] |
| Gerber and Huber | Partisans revise economic assessments sharply after a change in power (2010 panel, [S]); that partisanship changes real spending is contested on replication (McGrath 2017, [S]) | [S] |
| Literature survey (Berlemann and Enkelmann 2014) | About half of US studies find significant unemployment and inflation effects on approval; sample period matters; effects unstable in short sub-samples; a threshold study finds unemployment matters for approval mainly above about 7% | [S] |
| Sahm rule | Recession flagged when the three-month average of U-3 rises 0.50 pt or more above its prior-12-month low; currently 0.00 | [O] FRED SAHMREALTIME |

### 4.2 What this implies for the transmission design

1. **Gaps, not levels.** Every working specification uses unemployment minus the natural rate, inflation relative to the term's own history, and growth relative to trend. The current engine strain is `2 x unemployment + 1.5 x max(0, inflation) - 2 x max(0, growth) + price scar`, in levels [O, `packages/engine/src/opinion-causes.ts`]. Levels penalize a 4.4%-natural-rate economy as if it were slack and ignore growth below zero. Replace levels with gaps.
2. **Real income is the most evidenced single driver of the vote** (Hibbs, 3.61 vote points per point of weighted real disposable income growth per capita, R-squared 0.83). The engine has no real-wage or real-income variable in the approval path [D, from reading `opinion-causes.ts`]. Add one. In the current data it is the clearest perception driver: wages +3.3%, CPI +3.7%, so real pay is negative while payrolls and unemployment look fine [C].
3. **Weight recent quarters, remember the term.** Hibbs's decay (0.914 a quarter, half-life about 7.7 quarters) and Healy-Lenz (end heuristic) disagree on how much earlier years count; both put the most weight on the last year. A weekly game should keep a decaying memory with roughly a two-year half-life for the vote and a short one (months) for approval and sentiment [D, bounded by Hibbs].
4. **Three inflation terms, not one** (current level, acceleration, excess over the prior term). Gordon finds all three significant for sentiment and that "excess inflation" is what voters mean by "the economy" in 2024. A one-time price-level step (2021-22) is remembered as a scar; the engine already has a price-level scar term [O, `opinion-causes.ts`], which is the right idea.
5. **Gasoline is its own salient price.** Correlation with approval is moderate (-0.5 to -0.47) and weakening, which argues for a modest dedicated weight, not zero and not large. Gas is 2.895% of the CPI basket [O, BLS], so it adds little to measured CPI yet dominates what people see weekly.
6. **Asymmetry** (section 3.4): apply it in the perception layer only.
7. **Partisan filter.** Partisans of the president's party read the same economy far more favorably than the other side: Gallup's gap averaged 68 points in 2017 and peaked at 88 in a month (section 4.1). A bloc-by-bloc lens on the perceived economy, with the in-party and out-party swing as its largest parameter, matches the data better than one national score. The apparent paradox in Gallup (partisans respond little to objective conditions) means the non-partisan middle carries the economic signal, so a small share of the electorate has high economic sensitivity. The game's cohort/bloc design (approval-model DESIGN) is the right home for this.
8. **Honeymoon and non-economic events dominate approval variance.** A model that makes the economy a larger share of approval than about a fifth of its variance contradicts the strongest study I opened. A model that makes it a small share of the election outcome contradicts Fair, Hibbs and Gordon, who all find election-year growth, income and excess inflation significant.

### 4.3 Election timing

The vote depends on the election-year economy (Fair: Q2-Q3 growth and absolute inflation over the prior eight quarters; Abramowitz: Q2 growth and June approval; Healy-Lenz: end heuristic; Gordon: Q2-Q3 approval). Across 18 terms since 1953 (inauguration year to October of election year), real per-capita GDP growth averaged 1.9% a year with sd 1.05, the change in unemployment averaged +0.03 pt with sd 1.8 pts (range -3.1 to +2.8), and inflation averaged 3.6% with sd 2.4 (range 0.9 to 10.3) [C, A939RX0Q048SBEA, UNRATE, CPIAUCSL]. That is the dispersion a four-year game should reproduce across seeds.

## 5. The axes

Each card gives: definition and units; range and speed; drivers and downstream effects; game representation; cadence; calibration series; compression; recommendation. "Model" means a stored state with dynamics; "derive" means computed on read from other state; "skip" means no state.

### 5.1 Output and growth

- **Definition and units.** Real GDP: output at constant prices, billions of chained 2017 dollars, seasonally adjusted annual rate, quarterly; BEA releases advance, second and third estimates, so every figure revises [O]. Per capita: real GDP over population. Potential output: CBO's estimate of sustainable output (FRED GDPPOT); output gap = actual / potential - 1 [C].
- **Range and speed.** Quarterly annualized growth since 1990: mean 2.59%, sd 4.37 (includes 2020) [C]; four-quarter growth now 2.19% [C]. Term-level per-capita growth 0.29% to 3.99% a year [C]. Potential growth about 2.2% a year in 2026-27, about 2.0% by 2030 [C, GDPPOT]. Gap: +1.4% now, -5.0% at the 2009 trough, -8.8% in 2020 [C].
- **Drivers and downstream.** Growth drives unemployment through Okun (section 3.3), tax receipts, and sentiment. Fair and Gordon use it directly in votes. It is the one variable every election model includes.
- **Representation.** Stock: output level and a potential stock that grows by a slow rate. Derived: growth rate, gap. Keep the gap as the core state; unemployment, inflation pressure and receipts read it. The engine already holds `potential` in `MacroState` and a four-phase business cycle [O, `macro-state.ts`, `business-cycle.ts`].
- **Cadence.** Weekly internal step; quarterly print with an advance estimate about four weeks after quarter end, then revisions [O, `economic-releases.ts` already does the advance estimate; BEA confirms a three-estimate sequence]. Revisions are a perception feature: the player acts on the first print.
- **Calibration series.** GDPC1, GDPPOT, A939RX0Q048SBEA, GDP.
- **Compression.** The business cycle provides the shock; the gap decays toward zero by policy and by mean reversion; shocks arrive from the commodity, financial and fiscal layers. Distributed: a fiscal impulse is spread over the first two quarters, peak early (section 3.3).
- **Recommend.** Model fully (growth, gap, potential). Derive per-capita. Skip nominal GDP as a driver; derive it for debt ratios.

### 5.2 Labor

- **Definitions.** U-3: unemployed as a share of the civilian labor force (the headline). U-6: unemployed plus all marginally attached plus those part-time for economic reasons, over the labor force plus marginally attached; 7.6% in Sep 2026 versus 4.2% U-3 [O, BLS]. Payrolls: nonfarm employment change. Participation: labor force over population (61.8%). Employment-population ratio (59.2%). Wages: average hourly earnings. Claims: weekly initial filings. Openings: JOLTS.
- **Range and speed.** U-3: 2.5% (May 1953) to 14.8% (Apr 2020) [C]; non-recession monthly noise 0.15 pt; recession pace +5.0 pts in 22 months (2008) [C]. In the twelve recessions since 1948, U-3 within twelve months of the start rose from 2.7-7.4% to 5.7-14.8% [C]. U-6 range 6.6% (Dec 2022) to 22.9% (Apr 2020) [C]. Participation peaked 67.3% (Jan 2000) [C]. Payroll noise is large relative to trend: sd 109K against a +41K mean in the last twelve months [C].
- **Drivers and downstream.** Growth through Okun (3.3). Unemployment above the natural rate lowers wage and price growth; the Fed's reaction function reads it. In the engine the Fed reads a 5% full-employment benchmark [O, `monetary.ts`: `FED_FULL_EMPLOYMENT = 0.05`], while CBO's natural rate is 4.39% [C, NROU] and Gordon uses an adjusted 4.0% from 2018 [O]. Retune to a natural-rate state that can drift.
- **Representation.** Stock: U-3 and the natural rate. Derived: U-6 (U-3 plus a spread that widens in downturns), payrolls (labor-force growth times employment change plus sampling noise), participation response (slow stock, falls in long slumps, recovers slowly). Wages: stock that follows productivity plus a Phillips term; real wage derived as wage growth minus CPI inflation.
- **Cadence.** Monthly jobs report on the first Friday [O, `economic-releases.ts`]; claims weekly (skip).
- **Calibration series.** UNRATE, U6RATE, PAYEMS, CIVPART, EMRATIO, AHETPI or CES0500000003, NROU, ICSA, JTSJOL, USREC.
- **Compression.** Immediate: layoff events that the President sees as a print. Lagged: unemployment follows growth by Okun within the quarter. Conditional: Sahm trigger (+0.50 pt) as the "recession begins" perception event. Modulated: a Labor Secretary or NEC chair affects only the speed of re-employment programs within the observed band (the engine has no evidence-based effect size to give them) [D].
- **Recommend.** Model U-3 and the natural rate and real wage fully. Derive U-6, payrolls, participation, claims. Skip openings and quits.

### 5.3 Prices

- **Definitions.** CPI-U: urban consumer price index, 1982-84 = 100, BLS. PCE price index: BEA, chain-weighted, the Fed's target measure (target 2%, [O] engine uses 0.02 [O, `monetary.ts`]). Core: excluding food and energy. CPI weights (Dec 2025 relative importance, 2024 weights): shelter 35.625, transportation 16.316, medical care 8.423, food at home 8.325, energy 6.383, food away 5.373, new vehicles 3.838, gasoline 2.895, used cars 2.759, apparel 2.368 [O, BLS].
- **Range and speed.** CPI 12-month: 1990-2019 mean 2.45% [C]; 2008 peak 5.50% (Jul) to -1.96% (Jul 2009) [C]; 2022 peak 8.98% (Jun) [C]; now 3.71% with core 2.76% and energy +16.8% [C]. Food at home peaked 13.6% (Aug 2022), 7.6% (Sep 2008), now 2.65%. Shelter peaked 8.16% (Mar 2023), now 3.44%. Core PCE 3.01%, PCE 3.4%.
- **Drivers and downstream.** Core follows the output gap and expectations; energy and food follow commodity prices with the lags in 3.3; tariffs add a step over about seven months. Sentiment, approval and the Fed all read it. Michigan year-ahead expectations 4.7% against 3.7% measured CPI show expectations run above measured inflation in a price shock [O, C].
- **Representation.** Stock: core inflation trend and the expectations anchor (the engine already holds `expectedInflation` with a 104-week half-life, [O, `macro-state.ts`]). Shock layers: gasoline, food at home, home energy from commodity indexes (the engine's `household-prices.ts` already derives pump, grocery and home-energy prices from commodity indexes and CPI weights [O]); tariff step (the engine's `tariff-prices.ts` spreads a step over 26 weeks, which fits the Fed's half at three months and full at seven months [O]). Derived: headline CPI = weighted sum; PCE = CPI less a spread [D, spread to be fit from PCEPI vs CPIAUCSL].
- **Cadence.** Monthly CPI on the Wednesday in the 10th-14th window; monthly PCE with income and outlays [O, `economic-releases.ts`]; gasoline weekly.
- **Calibration series.** CPIAUCSL, CPILFESL, PCEPI, PCEPILFE, CUSR0000SAF11, CUSR0000SEFV, CUSR0000SAH1, CUSR0000SETB01, CPIENGSL, GASREGW, GASREGM, APU000072610 (electricity per kWh), MICH, T5YIE.
- **Compression.** Immediate: pump price (65% within the month, 34% the next). Distributed: tariffs, food (farm share 18.5 cents of the food-at-home dollar in 2024 per the engine's price-shares table [O, `household-prices.ts`]), shelter (lags the market). Conditional: the 2022 scar (a level shift that does not unwind) drives the excess-inflation term.
- **Recommend.** Model core inflation, expectations, gasoline and food at home fully. Derive headline, PCE, shelter, electricity. Skip apparel, vehicles, medical care as separate states unless a policy acts on them.

### 5.4 Interest rates and monetary policy

- **Definitions.** Federal funds target range set by the FOMC; eight scheduled meetings a year (2026: Jan 27-28, Mar 17-18, Apr 28-29, Jun 16-17, Jul 28-29, Sep 15-16, Oct 27-28, Dec 8-9) [O]. Treasury 10-year and 2-year yields, 30-year mortgage rate, Fed balance sheet (WALCL 6.75T now, 8.97T at the Apr 2022 peak [C]).
- **Range and speed.** Funds rate: 0.05% (Apr 2020) to 19.1% (Jun 1981) [C]; 2022-23 rise of 4.0 pts in ten months; 2007-08 cut of 4.6 pts in 15 months [C]. 10-year: 0.52% (Aug 2020) to 5.31% (Oct 2026) [C]. The 2s10s spread is +0.44 now and bottomed at -1.08 (Jul 2023) [C]. Mortgage spread to the 10-year is about 2.2 pts now (7.40 vs 5.22) [C].
- **Drivers and downstream.** The rule reads inflation and the gap; the 10-year reads expected policy, term premium and deficits; the mortgage rate follows the 10-year. Downstream: housing within 3-8 months (5.9), federal interest cost (section 5.5), equity valuations, the dollar, sentiment.
- **Representation.** Stocks: policy rate, 10-year yield. Derived: mortgage rate (10-year plus spread), 2-year, yield-curve slope. The engine's rule moves half-way to the target in about 11 weeks and has an FOMC calendar with tilt and credibility parameters [O, `macro-state.ts`, `monetary.ts`]. Fed chair is the right trait hook: tilt in the reaction weight within the engine's ±0.1 limit, with the real-world justification that no study I opened estimates a chair effect [D].
- **Cadence.** Eight FOMC decisions a year, weekly drift of market rates.
- **Calibration series.** FEDFUNDS, DGS10, DGS2, T10Y2Y, MORTGAGE30US, WALCL, DFII10, T5YIE.
- **Compression.** Lagged: policy to housing (3-8 months observed) and to inflation (about 12 months observed in 2022-23, [C]); to unemployment: no observed lag in 2022-23. Conditional: the same rate change has larger effects when the economy is already weak (no source opened; [D]).
- **Recommend.** Model the policy rate and the 10-year. Derive mortgage and 2-year. Skip the balance sheet except as a stance label.

### 5.5 Fiscal

- **Definitions.** Federal deficit = outlays minus receipts. Debt held by the public and gross debt. Net interest. Mandatory (Social Security, Medicare, Medicaid etc.), discretionary (annual appropriations, defense and nondefense), net interest as a third category. CBO baselines are current-law.
- **Range and speed.** Deficit as a share of GDP: FY2009 -9.8%, FY2020 -14.5%, FY2021 -11.7%, FY2025 -5.8% [C, FYFSGDA188S]. CBO FY2026: 5.8% of GDP, rising to 6.7% by 2036, against a 3.8% 50-year average. Receipts 17.5% of GDP in 2026 vs a 17.3% 50-year average; outlays 23.3% vs 21.2% [O]. Net interest $1.0T (3.3% of GDP) in 2026, third largest item behind Social Security and Medicare, 19% of revenue (9% in 2021), to $2.1T (4.6%) by 2036 [O]. Gross debt/GDP peaked 132.7% (Q2 2020), now 122.6% [C]. FY2025 interest outlays $970.1B vs $658.3B in FY2023 (+47% in two years) [C, FYOINT].
- **Drivers and downstream.** Receipts follow nominal GDP and the cycle; outlays follow the cycle (automatic stabilizers), legislation and interest. Interest cost follows the average rate on a refinancing stock (the 10-year at 5.2% vs a CBO 2026 projection of 4.1% [O] means the baseline's interest path is already stale). Downstream: crowding of the budget, sovereign rating, growth through multipliers (0.6-1 for spending; negative for tax rises; larger when slack), and the President's choice set.
- **Representation.** The engine has deep books already: `national-books.ts`, `fiscal.ts`, `sovereign.ts`, `debt-limit.ts`, `appropriation.ts`, `budget.ts`, sovereign rating and a weekly book [O, directory listing and headers]. Keep these. Add: (1) interest cost computed from a maturity-weighted average rate on the debt stock so that a rate shock reaches the budget over years, not weeks; (2) automatic stabilizers tied to the gap; (3) a multiplier that takes the Auerbach-Gorodnichenko form: lower than 1 in expansions, higher in recessions, with legislative lag [O, FRBSF].
- **Cadence.** Monthly Treasury statement (receipts, outlays); fiscal-year budget cycle; appropriations deadline Oct 1.
- **Calibration series.** FGRECPT, FGEXPND, FGDEF, A091RC1Q027SBEA, GFDEBTN, GFDEGDQ188S, FYFSGDA188S, FYOINT, MTSDS133FMS, MTSR133FMS. CBO tables must be fetched from cbo.gov in a browser (403 here).
- **Compression.** Distributed (spending outlays over quarters), lagged (interest cost reprices slowly), conditional (multiplier by slack). Trait hook: Treasury Secretary and OMB director competence should modulate execution (speed of obligating funds, accuracy of the scoring the President sees), not the multiplier's truth, which is bounded by the 0.6-1 band [D].
- **Recommend.** Model fully (the engine already does most). Derive tax receipts shares and mandatory/discretionary mix from structure. Skip fine breakdowns beyond the three CBO categories.

### 5.6 Trade

- **Definitions.** Trade balance (goods and services, BEA), tariffs (average statutory rate), exchange rate (Fed broad dollar index).
- **Range and speed.** Imports 14.4% of GDP, exports 11.7% [C]. Monthly balance moved from -$53.7B (Mar 2026) to -$105.6B (Aug 2026), worst on record -$133.0B (Mar 2025) [C]. Tariff rate 11.1% statutory (Jul 24, 2026) rising to 11.8% by year-end [O]. The dollar: 130.0 (Jan 2025) to 121.4 now [C]. The Supreme Court struck down IEEPA tariffs in Feb 2026, after which Section 122 and then Section 301 tariffs replaced them [S for the ruling; O for the 122-to-301 change in Yale].
- **Drivers and downstream.** Tariffs raise prices (seven-month pass-through), raise customs revenue ($1.9T over ten years under current law, Yale [O]), and lower trade volumes (the game's volumes fall under the tariff). The balance follows relative growth, the dollar and front-running before tariff dates (the March 2025 record is consistent with that, inference). The dollar follows rate differentials and risk.
- **Representation.** Stocks: tariff schedule by partner and sector (the engine has `trade.ts`, `trade-sectors.ts`, `trade-volume.ts`, `tariff-prices.ts` [O]). Derived: balance, dollar (rate-differential function), customs revenue. Keep the shelf-rise approach in `tariff-prices.ts`.
- **Cadence.** Monthly trade release; tariff decisions are discrete events.
- **Calibration series.** BOPGSTB, NETEXP, EXPGS, IMPGS, DTWEXBGS, IMPCH, Yale Budget Lab.
- **Compression.** Distributed over 7 months for prices, front-loaded for volumes [S]. Exchange-rate pass-through: no source opened; do not model it separately.
- **Recommend.** Model tariffs and trade volumes (exists). Derive the balance and customs revenue. Skip a separate exchange-rate pass-through; keep the dollar as a derived label.

### 5.7 Markets

- **Definitions.** Equity index (S&P 500), volatility (VIX), bond yields, credit spreads (high-yield option-adjusted spread; Baa minus Aaa), financial conditions (Chicago Fed NFCI: zero is average, positive is tighter than average).
- **Range and speed.** See 3.1 and 3.2. NFCI: 3.08 at the 2008 peak, 0.31 in 2020, -0.49 now [C]. Baa-Aaa 0.44 now vs 3.38 (Dec 2008) [C]. High-yield spread 2.59-4.61 pts across Oct 2023 to Oct 2026, 3.15 now [C].
- **Drivers and downstream.** Markets price growth, rates and uncertainty; they feed wealth, investment and sentiment. Evidence for a direct effect of the stock market on approval: none found. Gordon did not need it [O].
- **Representation.** The engine already has an equity index with a crash trigger that stops the clock and starting weights "labeled here, not sourced" [O, `markets.ts`]. Derive credit spreads and NFCI from the same inputs (cycle drag, uncertainty). Record the equity weights as uncalibrated and fit them to the S&P 500 data above.
- **Cadence.** Weekly; crash events interrupt.
- **Calibration series.** SP500, VIXCLS, BAMLH0A0HYM2, BAA, AAA, NFCI, STLFSI4.
- **Compression.** Immediate. Fast fall, slower recovery (2020 fell 33.9% in 23 trading days).
- **Recommend.** Model equities (exists). Derive spreads and conditions. Skip individual stocks.

### 5.8 Energy and commodities

- **Definitions.** Crude (WTI, Brent), gasoline, diesel, natural gas, electricity, food commodities (wheat, corn, soybeans).
- **Range and speed.** WTI monthly Feb-May 2026: 64.5, 91.4, 100.3, 102.1; now about 96-97 [C]. EIA forecasts Brent $105 in Q4 2026, $96 for 2026, $84 for 2027; regular gasoline $3.91 for 2026 and $3.56 for 2027 [O, STEO Oct 2026]. Gasoline range $0.907 (Feb 1999) to $5.006 (Jun 2022) [C].
- **Drivers and downstream.** Supply disruption (Middle East), inventories, refinery spreads (diesel tightness, East Coast distillate stocks 32% below the five-year average [O]), SPR actions (a 40-million-barrel exchange announced Sep 29 [O]). Downstream: pump price, CPI energy, sentiment (2026 record low), political salience of presidential response. Historical oil-to-GDP evidence is mixed (section 3.3).
- **Representation.** The engine has a commodity kernel, registry, shocks, a Hormuz test and policy levers (SPR, etc.) [O, file names]. Keep it. Add to the household-price reading the observed distributed pass-through (65% in month 0, 34% in month 1) and a refining-margin term that widens in supply shocks.
- **Cadence.** Weekly price; STEO-like monthly outlook as a perception release.
- **Calibration series.** DCOILWTICO, MCOILWTICO, GASREGW, GASREGM, GASDESW, DHOILNYH, EIA STEO.
- **Compression.** Shocks arrive as events (embargo, strait closure, pipeline attack) with a duration; prices relax over 6-12 months after the event ends (2022: gasoline fell from $5.006 on Jun 13 to $4.04 by Aug 8, $3.53 by Nov 28 and $3.09 by Dec 26, a 38% drop in six months [C]).
- **Recommend.** Model crude, gasoline and food-at-home fully. Derive diesel, home energy, electricity. Skip natural gas as an independent state unless a policy needs it.

### 5.9 Housing

- **Definitions.** Case-Shiller national home price index (S&P/Cotality, via FRED), housing starts, 30-year mortgage rate, median sale price ($410,700 in Q2 2026), homeownership rate (65.0%), rental vacancy (7.3%), shelter CPI.
- **Range and speed.** House prices fell 26% from Mar 2006 to Feb 2012 [C]. 12-month growth peaked 20.7% (Mar 2022), troughed -12.6% (Mar 2009) [C]. Starts 478K (Apr 2009) to 2,273K (Jan 2006); 1,275K now [C].
- **Drivers and downstream.** Mortgage rate and income; downstream: wealth, construction jobs, shelter inflation with a lag (shelter CPI peaked in Mar 2023, about a year after the price peak [C]). Affordability is a political issue in its own right (no approval estimate found).
- **Representation.** Derive from the mortgage rate and income with a 3-8 month lag for starts and 12-15 months for price growth (2022 shape). Store the index only if a policy touches it.
- **Cadence.** Monthly (starts), monthly (Case-Shiller, two-month lag).
- **Calibration series.** CSUSHPISA, HOUST, MORTGAGE30US, MSPUS, RHORUSQ156N, RRVRUSQ156N, CUSR0000SAH1.
- **Recommend.** Derive. Model fully only if the design includes a housing policy lever (the engine has `housing-conference.test.ts` and `fair-housing-court.ts`; verify before adding).

### 5.10 Inequality and poverty

- **Definitions.** Median household income (Census CPS ASEC), official poverty rate and the Supplemental Poverty Measure, Gini (World Bank series on FRED), wealth shares (Fed Distributional Financial Accounts).
- **Range and speed.** Annual or slower. Median household income $87,460 in 2025, up 2.6% in real terms from $85,210 in 2024 [S for the percent; O for the level]; official poverty 10.2% (down 0.5 pt), SPM 13.1% (not statistically different) [O]. Gini 41.8 in 2024, 41.8 in 2023, 39.7 in 2021 [C, SIPOVGINIUSA]. Top 1% wealth share 22.8% (1989 Q3) to 32.5% (2026 Q1), bottom 50% from 3.5% to 2.3% [C].
- **Drivers and downstream.** Poverty follows unemployment and prices for lower-income households; Stantcheva finds lower-income households cut purchases more in inflation [O]. Approval effect by income: no clean slope found.
- **Representation.** Derive poverty from unemployment and real wages; hold Gini and wealth shares as slow-drifting labels. Cohorts matter more for approval than a national Gini; the bloc design already handles cohort splits.
- **Cadence.** Annual (September Census release).
- **Calibration series.** MEHOINUSA672N, SIPOVGINIUSA, WFRBST01134, WFRBSB50215.
- **Recommend.** Derive poverty. Skip Gini and wealth shares as dynamics.

### 5.11 Consumer sentiment and the perceived economy

- **Definitions.** University of Michigan Index of Consumer Sentiment (1966 Q1 = 100, survey of households), Conference Board Consumer Confidence Index (1985 = 100, online sample via Toluna, labor differential: jobs plentiful minus hard to get) [O]. Gallup Economic Confidence Index. Inflation expectations (Michigan year-ahead 4.7%, long-run 3.5%) [O].
- **Range and speed.** Michigan 44.8 (May 2026) to 112.0 (Jan 2000) [C]; 2008 low 55.3 (Nov 2008); 2022 low 50.0 (Jun 2022); 2019 average 96.0 [C]. Gordon's sentiment range is 54 to 110 through 2024 [O]; 2026 broke it.
- **Perception gap, measured.** A regression of Michigan sentiment on the unemployment rate, the CPI 12-month rate and the pump price, 240 monthly observations 2000-2019, gives sentiment = 126.6 - 4.81 x U-3 - 1.47 x CPI yoy - 3.75 x gas ($/gal) [C, my OLS, no standard errors computed]. It predicts 86.2 for Aug 2026; actual 51.7. For Jun 2022 it predicts 77.6; actual 50.0. Fit to 2021-26 the signs flip (unemployment positive), so the relation is unstable, which agrees with Gordon's finding that 2022-24 sentiment ran 16 points under what indicators predict [O]. Treat the gap as real and large. The Conference Board index (81.9) and Michigan (46.3-51.7) disagree by more than 30 points in level terms; Michigan's questions weight prices and finances, the Conference Board's weight jobs, which is consistent with a price shock under a solid labor market [D interpretation of the survey difference].
- **Drivers and downstream.** Sentiment follows prices (inflation, gas), jobs, and partisan identity; approval and the vote read it (Gordon: 1 point of sentiment worth about 8 electoral votes in the election-year average). A Fed paper finds bad news moves expectations more than good [O].
- **Representation.** Perception stock, not derived. Michigan-style index with: gap-based inputs (section 4.2), a decay toward the data-implied value with a half-life of months, an asymmetric response, an inflation-expectations sub-index that runs above realized inflation in a price shock, and a bloc filter. Keep a second sub-index (jobs-weighted, Conference Board-style) so the game can show the 2026 disagreement. The player should see sentiment, not the hidden target.
- **Cadence.** Michigan preliminary mid-month and final at month end; Conference Board last Tuesday of the month [O].
- **Calibration series.** UMCSENT, MICH, Conference Board (publisher site), Gallup ECI.
- **Compression.** Lagged: sentiment follows indicators with a lag (Gordon notes the model's sentiment dip came two quarters late in 1973 [O]; the 2026 sentiment fall coincided with the oil jump, so the lag to price shocks is short, within the month [C]). Conditional: partisanship.
- **Recommend.** Model fully. This is the key addition.

### 5.12 Regional and state economies

- **Definitions.** State unemployment (BLS LAUS), state GDP (BEA), state incomes.
- **Range and speed.** August 2026 U-3: national 4.1%; DC 5.7%, South Dakota 2.0%; California 5.1%, New York 4.3%, Texas 4.4% [O for DC and SD; C for the three states, NYUR, TXUR, CAUR].
- **Drivers and downstream.** Sector mix and exposure (energy states in an oil shock, manufacturing states under tariffs). State economies decide electoral votes, which is where the presidency and the national average diverge (Gordon: electoral polarization sets a floor of 160 electoral votes since 1988 [O]).
- **Representation.** The engine's state records carry six economic axes (industrial, agricultural, energy, tech, services, defense), urbanization and federal dependence [O, `packages/world/src/schemas/state.ts` line 118 carries state unemployment as an offset from the country; the six axes are in DECISIONS.md]. Derive each state's unemployment as the national rate plus a sector-exposure term driven by the active national shocks (oil up lifts energy states and hurts the others in prices; a tariff hits manufacturing and agriculture).
- **Cadence.** Monthly state release about two weeks after the national.
- **Calibration series.** NYUR, TXUR, CAUR, and the 50 state URs (series ids of the form [state]UR).
- **Compression.** Immediate for sector shocks, lagged for spillovers.
- **Recommend.** Derive. This is the cheapest way to make the economy matter for elections.

### 5.13 Sectors

- **Definitions.** Industrial production (index 2017 = 100: 103.07 in Aug 2026), capacity utilization (76.3%), auto sales (16.4M annual rate in Sep) [C].
- **Representation.** Derive sector shocks from commodity, tariff and rate drivers. The six state axes already exist. Skip industrial production and capacity utilization as state.
- **Recommend.** Skip as separate state; derive sector exposure for states and for tariff targeting.

## 6. Compression: carrying the economy through one or two terms

### 6.1 Time base

The engine runs a weekly turn by default (`DEFAULT_PACE = "weekly"`, [O, `pace.ts`]); four years is about 208 turns. Real macro data is monthly or quarterly. The release layer (`economic-releases.ts`) already prints monthly and quarterly figures from the weekly step [O]. Keep that split: the weekly step moves stocks, releases are what the player and the press see.

### 6.2 Which mechanism for which link

| Mechanism | Use for | Evidence |
|---|---|---|
| Immediate (same turn or within the month) | Pump price after crude; equities; sentiment after a price shock; mortgage rate after the 10-year | 65% of pump pass-through in month 0 [C]; sentiment fell with the Mar-May 2026 oil jump [C] |
| Lagged (fixed delay) | Rate to housing (3-8 months); rate to inflation (about 12 months); sentiment after income changes | 2022-23 episode [C] |
| Distributed (spread over time) | Tariff prices (half at 3 months, full at 7); spending multiplier (most in the first two quarters); oil to pump (two months); interest cost on the debt | Fed note [O]; FRBSF [O]; C |
| Conditional (state-dependent size) | Multiplier by slack; oil shock only counts above the prior three-year high (Hamilton, [S]); approval's response to unemployment mainly above about 7% ([S]); bad-news asymmetry | [O] FRBSF, FEDS; [S] others |
| Modulated by traits | Execution speed and information quality, not the underlying truth | [D] |

### 6.3 Trait modulation without inventing effect sizes

I found no study I could open that quantifies a Treasury Secretary's, NEC chair's or Fed chair's effect on macro outcomes. Do not give an official a coefficient on GDP or inflation. Give each a bounded role:

1. **Information quality.** The competence of the Secretary and the NEC sets the noise and lag of the briefing the President sees (a nowcast before the BEA print; the scoring of a bill). BEA's three-estimate revision process and the October 2025 missing prints [C] show the player's information is already noisy.
2. **Execution speed.** How fast a funded program reaches the economy within the observed multiplier band (0.6-1, [O]); how quickly the Treasury reprices debt issuance.
3. **Crisis response lag.** Weeks between a shock and a usable response package; the legislative lag is real [O, FRBSF].
4. **Fed chair.** Tilt on the reaction weight within the engine's existing limit [O, `FED_TILT_LIMIT`]; credibility premium (25 bp) already modeled [O].

All four sit inside bands the data supports. Anything outside is [D] and should be labeled as such in the design doc.

### 6.4 Targets to calibrate the approval path (and how to test "3-6x too weak")

1. Fit a sentiment equation to Gordon's five indicators on the game's own seeds and require RMSE near 7 index points and the 2022-24 style gap (sentiment 10-16 points below indicators) under a price-led shock.
2. Require economic indicators alone to explain about 15-25% of the variance of quarterly approval in a long simulation (Gordon: 16-22%), with the honeymoon (+10 first year, about -13 last year) and event terms carrying most of the rest.
3. Require election outcomes to move 3.6 vote points per point of weighted real-income growth (Hibbs) and a 1-point change in election-year approval to move about 8 of 538 electoral votes (Gordon) for a mapping consistent with the game's own electoral model.
4. Require the term-level spread of section 4.3 across seeds: per-capita growth sd about 1.05 around 1.9, change in unemployment sd about 1.8, inflation sd about 2.4 around 3.6.
5. Probe: for a +2 pt unemployment gap sustained for a year, a +3 pt inflation gap, and a +$1.50 gas rise, report the game's approval and sentiment change. Compare with a regression of Gallup monthly approval (UCSB American Presidency Project table) on the FRED series in this document. That regression is the missing evidence; I could not run it because the Gallup table is only a Google Sheet.

## 7. What the engine already has (from reading headers, not full files)

I read the opening sections of `macro-state.ts`, `monetary.ts`, `markets.ts`, `household-prices.ts`, `tariff-prices.ts`, `economic-releases.ts`, `business-cycle.ts`, `fiscal.ts`, `trade.ts`, `opinion-causes.ts` and `world/src/schemas/nation.ts`.

| Area | Present | Gap against this research |
|---|---|---|
| Macro | `MacroState` (potential, expectedInflation, policyRate); business cycle with four phases; nation stats with GDP, growth, inflation, unemployment, cost of living, debt, reserves, rating | No natural-rate state (Fed benchmark fixed at 0.05 vs CBO 4.39%); no real wage or real income; no output-gap perception |
| Monetary | FOMC calendar, rule with weights, tilt, credibility premium | Mortgage rate and the curve not seen in the files I read |
| Prices | Household price readings from commodity indexes and CPI weights; tariff step over 26 weeks | Pump pass-through not distributed (65% / 34%); no expectations-vs-realized gap in a price shock |
| Fiscal | Books, sovereign rating, debt limit, appropriations | Interest-cost repricing speed not checked |
| Markets | Equity index and crash trigger with weights marked unsourced | Credit spread and financial conditions not seen |
| Perception | No consumer sentiment index (the word appears only in `lobbying-copy.ts`) | The central gap |
| Approval path | `strain = 2u + 1.5 max(0, pi) - 2 max(0, g) + price scar` in levels | Levels not gaps; no real income, no gasoline term, growth cannot subtract below zero |

## 8. Open items and what I could not verify

- CBO's own pages (403). The CBO figures in this document pass through a House Budget Committee staff summary [O]. The summary also states debt held by the public path; I did not use search-reported figures for it.
- Approval slopes in per-point units: not available from any source I could open. Gordon's regression tables are image content in the PDF. Run the Gallup-on-FRED fit in 6.4.
- Fair's current presidential equation coefficients: the 2026 mid-term paper was opened, the presidential coefficients are 2000-vintage and search-reported.
- Monetary-policy lag magnitudes (peak quarter), exchange-rate pass-through, wealth effect from equities and housing, the Hamilton net-oil-increase rule, Healy and Lenz, Abramowitz, Berlemann and Enkelmann, Kondik's 2022 update, Dallas Fed tariff note: search-reported only.
- The Supreme Court ruling that ended the IEEPA tariffs (Feb 2026) is search-reported; Yale's July 2026 text confirms the Section 122-to-301 replacement.
- FRED series titles and units for A939RX0Q048SBEA, GDPPOT, NROU, A091RC1Q027SBEA, FYOINT, WFRBST01134 and WFRBSB50215 were not opened as pages; I used the CSV values and the standard meaning of the ids. Confirm units on first use.
- FRED holds only ten years of S&P 500 and under three years of the high-yield spread; 2008 equity and spread paths need another source (the Baa-Aaa spread covers 2008).
- Wages: AHETPI ($32.60) is a production-and-nonsupervisory series; CES0500000003 ($37.81) is all private employees. Choose one and say which.

## 9. Sources opened this session

Official and primary:
- BLS Employment Situation table A-15, U-1 to U-6: https://www.bls.gov/news.release/empsit.t15.htm
- BLS CPI relative importance (Dec 2025): https://www.bls.gov/cpi/tables/relative-importance/2025.htm
- BLS state unemployment (Aug 2026): https://www.bls.gov/opub/ted/2026/the-district-of-columbia-had-the-highest-unemployment-rate-5-7-percent-in-august-2026.htm
- BEA GDP: https://www.bea.gov/data/gdp/gross-domestic-product ; BEA PCE: https://www.bea.gov/data/personal-consumption-expenditures-price-index
- Federal Reserve FOMC calendar: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm ; Sep 16, 2026 statement: https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm
- Fed FEDS Note, tariff effects part II (Apr 8, 2026): https://www.federalreserve.gov/econres/notes/feds-notes/detecting-tariff-effects-on-consumer-prices-in-real-time-part-II-20260408.html
- Fed FEDS 2023-001, bad news and good news: https://www.federalreserve.gov/econres/feds/files/2023001pap.pdf
- EIA gasoline and diesel fuel update: https://www.eia.gov/petroleum/gasdiesel/ ; EIA STEO: https://www.eia.gov/outlooks/steo/
- Census: https://www.census.gov/library/publications/2026/demo/p60-290.html and https://www.census.gov/library/publications/2026/demo/p60-291.html
- University of Michigan: https://www.sca.isr.umich.edu/ ; Conference Board: https://www.conference-board.org/topics/consumer-confidence
- Treasury Fiscal Data (dates only, no values): https://fiscaldata.treasury.gov/americas-finance-guide/national-debt/
- IMF WEO landing (no US figures on the page): https://www.imf.org/en/Publications/WEO
- FRED pages opened: GDPC1, UNRATE, CPIAUCSL, FEDFUNDS, UMCSENT, GASREGW, SAHMREALTIME (https://fred.stlouisfed.org/series/<ID>). Other FRED values come from CSV exports at https://fred.stlouisfed.org/graph/fredgraph.csv?id=<ID> pulled 2026-10-13 into the session scratchpad, not the repository.
- CBO Feb 2026 baseline via House Budget Committee summary: https://budget.house.gov/imo/media/doc/cbo_baseline_february_2026.pdf
- Yale Budget Lab, State of U.S. Tariffs (Jul 24, 2026): https://budgetlab.yale.edu/sites/default/files/page_to_pdf/1568/publication_1568.pdf

Research literature:
- Gordon, NBER w33068: https://www.nber.org/system/files/working_papers/w33068/w33068.pdf
- Fair, mid-term House equation (Jul 31, 2026): https://fairmodel.econ.yale.edu/rayfair/pdf/voteps4.pdf
- Hibbs, Bread and Peace: https://mpra.ub.uni-muenchen.de/15910/1/MPRA_paper_15910.pdf
- Ramey 2019: https://www.nber.org/papers/w25531 ; FRBSF 2012: https://www.frbsf.org/research-and-insights/publications/economic-letter/2012/02/government-spending-economic-boost
- Romer and Romer: https://www.nber.org/papers/w9866
- Stantcheva: https://www.brookings.edu/articles/why-do-we-dislike-inflation/
- Gallup partisan gap: https://news.gallup.com/poll/226649/2017-partisan-gap-economic-confidence-one-largest.aspx
- Wood on gas prices and approval: https://www.rasmussenreports.com/public_content/political_commentary/commentary_by_isaac_t_wood/what_fuels_presidential_approval

Engine files read (for the gap table): `packages/engine/src/{macro-state,monetary,markets,household-prices,tariff-prices,economic-releases,business-cycle,fiscal,trade,opinion-causes,pace}.ts`, `packages/world/src/schemas/nation.ts`.
