# Force-act prices: sources and caveats

Written 2026-10-10 for `src/dataset/seed/force-cost-anchors.tsv` and its table `src/dataset/force-cost-anchors.ts`, which the engine prices every military rung from (`packages/engine/src/force-costs.ts`; the rule is `docs/DECISIONS.md` §6.8). Every source below was opened on 2026-10-10. Requests were made with a generic user agent and carried no personal identifiers.

## What the table prices, and how

Each rung's money is the units it sends times a US price per unit, in 2026 dollars, then the acting government's cost index, then the distance factor on the up-front part only.

| Rung | Unit | Up front, per unit | Each week it stays out, per unit | Read from |
|---|---|---|---|---|
| 1 Exercises | one exercise | $18.5M | none | `exercise-cost` |
| 2 Forward deploy | aircraft carrier (its strike group) | 7 days of the group, $28.5M | $28.5M | `carrier-year-direct`, `air-wing-year-direct`, `destroyer-year-direct`, `strike-group-escorts`, `transit-days` |
| 3 Blockade | surface combatant | 7 days of the ship, $1.56M | $1.56M | `destroyer-year-direct`, `transit-days` |
| 4 Limited strike | fighter | 2 strike sorties at $2.19M, $4.38M | none | `odyssey-dawn-cost`, `odyssey-dawn-strike-sorties`, `strike-sorties-per-aircraft` |
| 5 Expeditionary invasion | brigade combat team | its equipment shipped, $32M | $213M | `brigade-shipping`, `brigade-year-in-theater` |

The weekly bill is the force's standing commitment (`commitmentPhase`), so the act's own price covers only what the commitment does not: the passage to station, the strike, the shipping.

**Dollars.** A money row carries the year its dollars are in, and the engine carries it to 2026 by BLS CPI-U annual averages (2008 215.303, 2011 224.939, 2017 245.120, 2018 251.107). 2026 is the January to August average, 331.655, because the year's own average is not yet published. CBO's FY2017 and CRS's FY2008 figures are fiscal-year dollars carried by the calendar-year index, which is close enough for a price and is said so here.

## Sources opened

1. **CBO, *The U.S. Military's Force Structure: A Primer* (July 2016), Summary Table 1.** Read from a copy of the CBO PDF at `https://www.defensedaily.com/wp-content/uploads/post_attachment/139103.pdf`, because cbo.gov returned 403 to the request. Rows used, FY2017 dollars, annual operating and support cost per unit, direct (the unit itself) and total (with its support and overhead): aircraft carrier 470 direct / 1,180 total; carrier air wing 330 / 910; Arleigh Burke destroyer (DDG-51) 60 / 140. The table seeds the direct figures: the unit's own running cost is the nearest public figure to what sending it out adds. They are peacetime costs and carry crew pay, so they overstate the strictly incremental cost of a deployment rather than understate it. The 2021 edition of the primer could not be opened.
2. **Hendrix, *At What Cost a Carrier?* (CNAS, March 2013), p. 5.** Read from the CNAS PDF at `https://s3.us-east-1.amazonaws.com/files.cnas.org/documents/CNAS-Carrier_Hendrix_FINAL.pdf`. "Costs about $6.5 million per day to operate each strike group," a group being the carrier, its air wing, five surface combatants and one attack submarine. The table takes the group's composition from here (`strike-group-escorts`, 5), not the daily figure, which is a life-cycle cost from a think tank. In 2026 dollars it is $9.3M a day, against the CBO-built group's $4.1M; the difference is roughly CBO's total-against-direct gap.
3. **Stars and Stripes, "Pentagon estimates canceled war games with South Korea would have cost $14 million" (2018-07-11),** `https://www.stripes.com/news/2018-07-11/pentagon-estimates-canceled-war-games-with-south-korea-would-have-cost-14-million-1499498.html`. "Would have cost the Pentagon about $14 million, according to defense officials": Ulchi Freedom Guardian, about ten days, 17,500 US troops in 2017. A reported figure from a defense spokesman, without a breakdown, so a secondary source for an on-record number.
4. **CRS R41725, *Operation Odyssey Dawn (Libya): Background and Issues for Congress* (2011-03-30),** `https://www.everycrsreport.com/files/20110330_R41725_bb82159244743cdcd092ea840833f4ac98a4d92d.html`. DoD's incremental cost "about $550 million through March 28, 2011 … about $340 million is for munitions," not counting the replacement of the F-15E that was lost.
5. **Defense Department briefing slides, 28 March 2011, 11:00 EDT,** `https://web.archive.org/web/2012id_/http://www.defense.gov/news/d20110328slides1.pdf`, slide 2. US sorties 983 of every kind, 370 of them strike sorties; 192 US Tomahawks launched. The transcript of the same briefing (`https://web.archive.org/web/20121222214902/http://www.defense.gov/transcripts/transcript.aspx?transcriptid=4803`) repeats the 983. The table prices a strike sortie as the whole $550M over the 370 strike sorties: everything the campaign spent to put those sorties over their targets, tankers, surveillance and Tomahawks with them, which is what a strike package sent alone has to carry too.
6. **AP via PBS NewsHour, "Trump's troop reversals in Europe could cost taxpayers millions, officials say" (2026-06-05),** `https://www.pbs.org/newshour/politics/trumps-troop-reversals-in-europe-could-cost-taxpayers-millions-officials-say`. "Sending it cost the military $32 million, said U.S. Transportation Command": one armored brigade's equipment, Texas to Poland, ship charter and loading included. One way; the troops' own travel is not in it. A news report quoting the agency.
7. **CRS R40682, *Troop Levels in the Afghan and Iraq Wars, FY2001-FY2012* (2009-07-02),** `https://www.everycrsreport.com/reports/R40682.html`, Table B-1, "Average Cost per Brigade Combat Team-Equivalent": $7.2 billion in FY2008 for Iraq (military personnel, operations and investment). CRS counts brigade equivalents at 9,000 troops each with their support (Table 2's notes), against 157,775 troops in country on average that year. The same report gives the surge as 15 to 20 brigades with a peak near 165,000 troops, which is about 8,000 a brigade, so the 9,000 is a fair count.
8. **BLS CPI-U.** 2011, 2017, 2018 and the 2026 January to August average from the BLS public data API, timeseries CUUR0000SA0 (`https://api.bls.gov/publicAPI/`). 2008 from the BLS historical CPI-U table, December 2023 vintage (`https://www.bls.gov/cpi/tables/supplemental-files/historical-cpi-u-202312.pdf`), read off the table: 2008 annual average 215.303, which the twelve monthly figures reproduce.

## Planning values

Two rows are the game's own figures and say so in the table:

- **`strike-sorties-per-aircraft`, 2.** A limited strike as one wave and a re-strike. Over Libya the first ten days averaged far more sorties than that; a limited strike is the opening blow, not a campaign.
- **`transit-days`, 7.** A forward carrier group or a blockading ship is charged a week of its daily cost to reach station before its weekly bill begins. No source isolates a surge or transit cost.

## Cross-checks, not seeded

These were opened and agree with the seeded figures, but are not in the table because nothing reads them:

- **The 2026 air campaign over Iran.** Defense News, "Price tag for Epic Fury tops $11 billion in first six days, Pentagon tells Congress" (2026-03-12), `https://www.defensenews.com/news/pentagon-congress/2026/03/12/price-tag-for-epic-fury-tops-11-billion-in-first-six-days-pentagon-tells-congress`; Stars and Stripes on the DoD Lead Inspector General's report (2026-09-15), `https://www.stripes.com/theaters/us/2026-09-15/dodig-iran-war-cost-munitions-22860181.html`: "$33.4 billion" through 2026-06-29, "$22.3 billion" of it munitions, over about 36,000 combat sorties. That is $0.93M a combat sortie; the Libya figure is $0.82M a sortie of every kind in 2026 dollars, and $2.19M a strike sortie. The IG report itself could not be opened.
- **A carrier's day in 2026.** Newsweek (2026-08-17), `https://www.newsweek.com/how-much-uss-lincoln-costing-congress-probes-9-month-deployment-12332036`, quoting a former Comptroller: the Lincoln and its air wing "likely costs around $5.5 million each day," on CBO estimates it does not name. The seeded carrier and air wing come to $3.0M a day direct.
- **Red Sea operations.** CRS Insight IN12301 (2024-09-06), `https://www.everycrsreport.com/files/2024-09-06_IN12301_f9c44eec965fbbf33a4941c7550d84534e7db2df.html`, on the $2.4B FY2024 supplemental for CENTCOM operations and replacing munitions. A blockade's munitions are drawn from the munitions stocks (`munitions.ts`), so the blockade's money carries the ships' running cost only.
- **Iraq per troop.** CRS RL33110, *The Cost of Iraq, Afghanistan, and Other Global War on Terror Operations Since 9/11* (2014-12-08), pp. 44-45: about $490,000 a troop a year in Iraq in FY2005, rising to about $800,000 in FY2008, which at 9,000 troops a brigade is the same $7.2B.

## The cost index for other governments

A government other than the United States pays the US price times its military spending per active service member over the US figure, read off the dataset's own `military.budget` and `military.activeHeadcount` (sourced with the founding data). It is **derived**: spending per service member carries pay, equipment and upkeep together, which is what an operation draws on. A government with no standing force (no headcount or no budget in the dataset) pays the US price, the only sourced one.

The index was checked against NATO's *Defence Expenditure of NATO Countries (2014-2025)* (`https://www.nato.int/content/dam/nato/webready/documents/finance/def-exp-2025-en.pdf`, data to 2025-06-03), whose Table 2 (spending, current USD) over Table 7 (military personnel) gives 2024 estimates in thousands of dollars per service member: United States about 719, United Kingdom 609, Germany 505, France 315, Poland 159, Türkiye 59. Against the US, that is 0.85, 0.70, 0.44, 0.22 and 0.08; the dataset's index reads 0.71, 0.47, 0.44, 0.29 and 0.07. Same order and scale; the dataset is not rewritten to match one alliance's accounting. The 2025 edition has no per-personnel table of its own, so these are a derivation from two of its tables.

## Distance

The up-front price is multiplied by the engine's existing projection factor (`geography.ts`, `forceProjectionCost`: 1 plus the distance over 8,000 km, of which airlift and sealift forgive up to 70 percent, and 1 across a shared border). It is a game rule, not a measurement: a passage or a strike flown from farther off costs more fuel, tanker hours and days. It does not touch the weekly bill, whose days on station cost the same wherever the station is.

## What is thin

- No public figure isolates the incremental cost of a deployment for any unit; every running cost here is a full peacetime operating cost, so the weekly bills are upper bounds on the incremental cost.
- The exercise, the brigade's shipping and the cross-checks above are reported figures from the press quoting officials, not budget documents.
- The strike sortie rests on one campaign's first ten days. A strike flown entirely by standoff missiles (`strikesByMissile`) is priced the same way, by the aircraft the package names.

## Domestic deployments (opened 2026-10-25)

Added for the federal force a President can send into a state (`packages/engine/src/locale-acts.ts`): the Guard federalized under 10 U.S.C. §12406, the Guard a governor deploys at the President's request under 32 U.S.C. §502(f), and active-duty troops under the Insurrection Act. Requests were made with a generic user agent and carried no personal identifiers.

| Act | Weekly bill | Read from |
|---|---|---|
| Federalize the Guard | 3,000 members at $19.5M per 1,000 a month: about $13.5M a week | `guard-domestic-thousand-month`, `guard-call-up` |
| Ask the governor to deploy the Guard | the same 3,000 for 8 weeks, charged up front: about $108M | `guard-domestic-thousand-month`, `guard-call-up` |
| Send in active-duty troops | the border deployment's $132M over 12 weeks, in 2026 dollars: about $14.5M a week | `active-border-deployment-cost`, `active-border-deployment-weeks`, `cpi-2018`, `cpi-2026` |

A month is 365.25 / 12 days. The up-front $20M to federalize and $25M to move a brigade, and the officer-year of about $300k loaded that prices the enforcement acts, stay the game's planning values; no row reads them.

1. **NPR via OPB, "Trump's National Guard deployments could cost over $1 billion this year, CBO projects" (2026-01-28),** `https://www.opb.org/article/2026/01/28/cbo-projects-national-guard-deployments-could-cost-over-dollar1-billion-this-year/`. "The CBO estimates that it could cost between $18 million and $21 million for every additional 1,000 soldiers"; a member's pay, health care, lodging, food and transportation run "$311 to $607 per day"; the 2025 deployments cost about $496 million. The estimate answered 11 senators led by Sen. Jeff Merkley.
2. **CBS News, "Troop deployments to U.S. cities cost nearly half a billion dollars in 2025,"** `https://www.cbsnews.com/news/troop-deployments-to-u-s-cities-cost-nearly-half-a-billion-dollars-in-2025/`. "Deploying 1,000 members of the National Guard to any city would cost $18 to $21 million per month, depending mainly on the city's cost of living"; the Washington, D.C. deployment "could cost around $55 million per month if the size of the deployment continues at about 2,950 members," which is $18.6M per 1,000 and agrees with the range. `guard-call-up` takes its 3,000 from that size.
3. **Military.com, "Cost of Deploying Active-Duty Troops to Border: $132 Million and Counting" (2019-01-29),** `https://www.military.com/daily-news/2019/01/29/cost-deploying-active-duty-troops-border-132-million-and-counting.html`. "About $132 million has been spent on the active-duty troops who began deploying to Texas, Arizona and California in early November," Vice Adm. Michael Gilday, the Joint Staff's operations director, to the House Armed Services Committee; "about 5,900 active-duty troops initially deployed," down to "about 2,100." `active-border-deployment-weeks` is the span from early November 2018 to the hearing, rounded to 12.

### What is thin

- The CBO document itself was not opened (cbo.gov refused the request); its figures are read as two outlets reported them.
- The border figure has no stated start date and covers a force that shrank by nearly two-thirds, so its weekly rate is an average over a falling head count, not a brigade's steady cost.
- Not opened in this pass, and not seeded: the Los Angeles deployment's reported $134M for 60 days (Military Times), which would be about $15.6M a week; the size of the June 2025 Los Angeles order; the Portland and Chicago head counts; a brigade combat team's head count; and the FBI and ICE per-officer costs the planning pass named as cross-checks on the $300k officer-year.
