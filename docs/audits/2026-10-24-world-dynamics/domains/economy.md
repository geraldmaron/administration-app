# Domain audit: global economy, commodities, chokepoints, trade and sanctions

Date: 2026-10-24. Probe file: `packages/engine/src/__probes__/economy.probe.test.ts`.
Run: `cd packages/engine && npx vitest run src/__probes__/economy.probe.test.ts` (16 tests: 13 fail, which means 13 reproduced breaks, and 3 pass, which means the control is held). No build, typecheck, lint, full suite or balance harness was run.

## Summary

The commodity kernel is sound as a mechanism. Shocks come from facts the campaign already holds, a price moves through stocks, and a closed strait fades back without ratcheting or oscillating (B12 passes). The pump follows crude at the right ratio (C1 passes). The blockade is an act of war with a War Powers clock and no rally (DECISIONS 6.9, held by `blockades.test.ts`).

The breaks sit where the kernel's output reaches economies and governments:

1. **Who gains and who loses from a closure is wrong.** Kuwait, Qatar and Iraq, whose exports cannot leave the Gulf, are credited with a windfall (B3). The flags a closing state stops carry no more of the shortage than the flags it lets through, which contradicts DECISIONS 6.10 (B4).
2. **Magnitudes are low.** A full-intensity Hormuz war peaks Brent at 1.38 times its resting level, below the 2026 record (B1). Urea does not move at all (B2). A Russian invasion of Ukraine moves wheat 6% (B6).
3. **Whole channels are missing.** Taiwan and semiconductors (B7), US sanctions damaging the target (B8), trade diversion (B10), retaliation reaching US output (B11) and third-party reaction to a blockade (B5) have no path.
4. **One farmable ratchet.** Cycling a tariff on and off adds each cycle's price rise to the price level, and lifting it never takes the rise back (B9).

**Recommendation.** Fix B3, B4 and B8 first, as one opus change to the pressure layer (`commodity-pressure.ts`, `external-pressure.ts`): a per-nation physical-volume channel that reads `passage.stopped` and the strait-dependence of each exporter, plus a sanctions channel that reads the target's world exports rather than its sales to the United States. Those three breaks invert or zero the sign of the answer the player sees. The magnitude breaks (B1, B2, B6) come next. They are table and planning-value changes, and they need the first fix in place to be calibrated correctly.

## Sources opened in this session

| Ref | Source | What it gives | Opened |
|---|---|---|---|
| S1 | EIA, Today in Energy, "Amid regional conflict, the Strait of Hormuz remains critical oil chokepoint", 2025-06-16, https://www.eia.gov/todayinenergy/detail.php?id=65504 | About 20 Mb/d (about 20% of world liquids) in 2024; about one-fifth of LNG trade, mainly Qatar; 2.6 Mb/d of spare Saudi and UAE bypass; 84% of crude to Asia | 2026-10-24 |
| S2 | EIA, World Oil Transit Chokepoints (updated 2026-03-03), https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/ | Hormuz 20.9 Mb/d (1H25); Malacca 23.2; Suez+SUMED 4.9 (SUMED 2.5 capacity); Bab el-Mandeb 4.2; Panama 2.3 (Trans-Panama pipeline 864 kb/d); Turkish Straits 3.7 (BTC, Iraq–Türkiye pipeline); Danish 4.9 (Kiel about 0.2) | 2026-10-24 |
| S3 | EIA, Short-Term Energy Outlook, October 6, 2026, https://www.eia.gov/outlooks/steo/ | Brent 2026 average $96, 4Q26 $105, 2025 $69; Middle East flows "constrained through the fourth quarter of 2026"; US gasoline September 2026 $4.35/gal | 2026-10-24 |
| S4 | UN News, 2026-08-04, https://news.un.org/en/story/2026/08/1168074 (ITC analysis) | Hormuz carries "a third of globally traded urea"; urea exports from Hormuz-dependent economies down 83% (April 2026 against April 2025); LNG down 95% | 2026-10-24 |
| S5 | Hellenic Shipping News, 2026-04-27, https://www.hellenicshippingnews.com/?p=1131388 (citing IEA) | Iran, Iraq, Kuwait, Qatar and Bahrain "rely on the strait to deliver the vast majority of their oil exports" | 2026-10-24 |
| S6 | FAO Food Price Index release, April 2022, https://www.fao.org/newsroom/detail/fao-food-price-index-posts-significant-leap-in-march/en | Wheat +19.7% and maize +19.1% in March 2022; Russia and Ukraine about 30% of wheat exports and 20% of maize exports | 2026-10-24 |
| S7 | World Bank WDI, NY.GDP.MKTP.KD.ZG, Iran: https://api.worldbank.org/v2/country/IRN/indicator/NY.GDP.MKTP.KD.ZG?date=2011:2023&format=json | Iran growth: 2011 +2.6, 2012 -3.7, 2013 -1.5, 2016 +8.8, 2017 +3.0, 2018 -3.7, 2019 -2.4 | 2026-10-24 |
| S8 | World Bank WDI, Russia: https://api.worldbank.org/v2/country/RUS/indicator/NY.GDP.MKTP.KD.ZG?date=2019:2024&format=json | Russia growth: 2021 +5.9, 2022 -1.4, 2023 +4.1 | 2026-10-24 |
| S9 | 42 U.S.C. § 6241, https://www.law.cornell.edu/uscode/text/42/6241 | Full drawdown needs a presidential finding of a "severe energy supply interruption" or an IEP obligation. A limited drawdown is capped at 30 million barrels and 60 days, with a 252.4-million-barrel floor | 2026-10-24 |
| S10 | Amiti, Redding, Weinstein, JEP 33(4) 2019, https://www.aeaweb.org/doi/10.1257/jep.33.4.187 (abstract as returned by search) | Complete pass-through of the 2018 tariffs to US import prices; $1.4B a month in real income loss by end of 2018 | 2026-10-24 (search summary of abstract; full text not read) |
| S11 | Fajgelbaum et al., "The Return to Protectionism", QJE 2020 (search summary of the NBER and Columbia versions) | Net aggregate loss $7.2B (0.04% of GDP); gross $51B; retaliation fell hardest on Republican-leaning tradeable counties | Search summary only: **unverified** |
| S12 | USDA ERS, Amber Waves, 2022-03-07, https://www.ers.usda.gov/amber-waves/2022/march/retaliatory-tariffs-reduced-u-s-states-exports-of-agricultural-commodities | Retaliation cut US farm exports by $13.2B a year (mid-2018 to 2019), China about 95%, soybeans 71% | 2026-10-24 |
| S13 | Insurance Journal, 2024-01-11, reporting Bloomberg Economics, https://www.insurancejournal.com/news/international/2024/01/11/755295.htm | Taiwan war: world -10.2%, US -6.7%, China -16.7%; one-year blockade: US -3.3%, world -5% | 2026-10-24 (secondhand report of a model) |

The following came back only in search snippets and were **not opened**, so the report does not rely on them: the IEA 2022 collective actions (62.7M and 120M barrels; the IEA page returned 403), Iran's 2018–19 export collapse to about 0.2 Mb/d (Iran International), the Kuwait/Qatar/Bahrain no-bypass statement (S&P, 403), and Gulf urea at 40% of exports (OPEC Fund).

## Controls

Status key: held, partial, missing, contradicted.

| ID | Rule the game should obey | Benchmark | Engine | Evidence |
|---|---|---|---|---|
| E1 | A strait moves a price only through its sourced flow net of bypass | S1, S2 | held | `commodity-shocks.ts:104` charges `share*(1-bypass)*stoppedShare`; `chokepoint-flows.tsv:8-10` |
| E2 | A full Hormuz closure lifts Brent to roughly the 2026 record ($96 annual, $105 for 4Q, S3; the repo's own fit cites $117 for April) | S3 | partial | B1: the peak is 1.38 times rest (about $102) at full intensity. A blockade opens the war at intensity 0.5, which peaks at 1.20 (about $89) |
| E3 | LNG through Hormuz (about 20% of trade, no bypass) | S1, S4 | held | `chokepoint-flows.tsv:9`; LNG +16% to 18% by week 8 to 12 at intensity 0.5 |
| E4 | Urea, ammonia and sulfur through Hormuz (a third of urea trade) | S4 | missing | B2: nitrogen 1.01; `commodity-registry.ts:146` gives nitrogen no route |
| E5 | Petrochemicals, aluminum and helium from the Gulf | none opened | missing | No such commodity in `commodities.ts` `COMMODITY_IDS` |
| E6 | Freight and war-risk insurance rise on a contested route | none opened | missing | No freight or insurance reading anywhere in `packages/engine/src` |
| E7 | Exporters whose barrels are stranded behind a strait lose; producers outside it gain | S5 | contradicted | B3: KWT +0.92, QAT +0.92, IRQ +1.26 growth points; `commodity-pressure.ts:99-107` credits every net exporter `exportRent` on price alone |
| E8 | A stopped flag bears more of the shortage than a passed one (DECISIONS 6.10) | DECISIONS 6.10 | contradicted | B4; `passage.stopped` is read only at `commodity-shocks.ts:104` (global loss), and no per-nation reader exists |
| E9 | Importer stress by import dependence (JPN, KOR, IND, CHN) | S1 (84% of flow goes to Asia) | partial | JPN -0.14, KOR -0.08, IND -0.02, CHN -0.007 growth points at week 12. The order follows import dependence, but the sizes are small and the passage decision is ignored (E8) |
| E10 | US gasoline follows crude at about 1/42 of a barrel per gallon, two to five weeks behind | EIA price components | held | C1: 2.31 cents/gal per $1/bbl; `household-prices.ts` `PUMP_LAG` |
| E11 | US CPI rises on the published weights | BLS relative importance (in repo) | held | `commodity-pressure.ts` `usInflation`; +0.41 pt annualized target shift at week 12 of the intensity-0.5 blockade |
| E12 | A blockade is an act of war (GA Res. 3314 art. 3(c)), starts the War Powers clock and buys no rally | DECISIONS 6.9, 5.15 | held | `blockades.test.ts` |
| E13 | Allies and adversaries respond differently to a US blockade of Iran's coast | China buys most of Iran's crude (search snippet, unverified) | contradicted | B5: after 8 weeks, trust toward the US falls by an almost identical 0.137 to 0.140 for CHN, IND, JPN, KOR and RUS against control, and tension moves 0 for all of them |
| E14 | SPR: a full drawdown only on a severe-interruption finding; a limited drawdown of 30M bbl over 60 days above a 252.4M floor | S9 | partial | `commodity-levers.ts` `severeInterruption` holds the finding. The limited drawdown and the IEP or IEA collective action are absent. The release size (1% of world supply for 26 weeks, `commodity-shocks.ts:64`) matches the 2022 scale |
| E15 | No arbitrage: blockade, then release, then reopen earns nothing | owner test 5 | held | The release carries no receipts (`commodity-levers.ts:59` `cost: {}`), a war opened by blockade buys no rally, and B12 shows no ratchet |
| E16 | Shocks fade on plausible lags without ratchet or oscillation | owner test 5 | held | B12: 52 weeks after reopening crude is 1.013, the low is 0.987, and an identical second war peaks at 1.370 against 1.375 |
| E17 | Other chokepoints (Malacca, Suez/SUMED, Panama, Turkish, Danish) propagate where flow and bypass are sourced | S2 now gives bypass capacities | missing | `chokepoint-flows.tsv:5-6` says the alternatives have no capacity on file. S2 now lists SUMED 2.5 Mb/d, Trans-Panama 864 kb/d, BTC and Kiel. Malacca's alternative is a detour, not a capacity |
| E18 | Black Sea grain: a Russia–Ukraine war lifts wheat and maize by the 2022 magnitude | S6 | contradicted | B6: wheat 1.06 at intensity 0.8; `commodity-shocks.ts:38` takes 2% of an aggressor's output and there is no Black Sea route |
| E19 | Taiwan Strait: chips reach US and allied output | S13 | missing | B7: US growth -0.012 points; no semiconductor commodity and no Taiwan route |
| E20 | Tariff border pass-through is near complete | S10 | held | `trade-sectors.ts` `DIFFERENTIATED = 0.96`, `STEEL = 0.75` |
| E21 | Lifting a tariff removes its price wedge, and cycles do not stack | S10 | contradicted | B9; `tariff-prices.ts:75-88` prices only unlifted measures for 26 weeks and never reverses |
| E22 | Trade diverts to third-country suppliers | S11 (unverified) | missing | B10; `trade-volume.ts:115` `measuresLeave` reads only the targeted partner |
| E23 | Retaliation costs the US exports and output for as long as it stands | S12 | partial | B11: zero growth effect. `trade.ts:685,720` books one week of `exportLoss` to the treasury once; `trade-volume.ts:130` cuts the export volume but nothing in macro reads it |
| E24 | Retaliation odds follow leverage and alignment | S12 (China 95% of losses) | held (planning) | `trade.ts` `retaliationOutlook` |
| E25 | US sanctions reach the target's world sales through the dollar (secondary sanctions) in the target's growth | S7, S8 | contradicted | B8: Iran growth moves -0.0001 points under US oil sanctions and -0.0002 under a full embargo. `external-pressure.ts:213` weighs by the target's exports to the imposer, and Iran sells the US almost nothing. The secondary reach exists only for world supply (`commodity-shocks.ts:177`) |
| E26 | Evasion leakage (shadow fleet) grows with time | search snippets (unverified) | missing | `SANCTION_BITE` is a constant 0.3 (`commodity-shocks.ts:58`) |
| E27 | A US blockade lets the US Navy stop cargo, not only Iran | owner test 1 | partial | `strait-passage.ts` counts only littoral belligerents as deniers. In a US blockade, Iran decides who passes, and China's cargo, 26% of Hormuz crude, goes through |

## Breaks

Each break gives the probe's observed numbers. All 13 reproduced on 2026-10-24.

**B1. A full Hormuz closure under-prices Brent (high).** Probe `B1`. Expected a peak of at least 1.5 times rest (about $111) within 16 weeks. Observed 1.381 (about $102). Mechanism: `commodity-shocks.ts:41` `ROUTE_CLOSURE = 0.5`, applied with `stoppedShare` 0.634, gives a route loss of 0.0555. The 2026 shut-ins the kernel was fitted to were 8.9 to 10.4 Mb/d (the repo's citation of STEO; S3 confirms flows constrained through 4Q26). Fix (opus): fit `ROUTE_CLOSURE` and passage against the 2026 shut-in series, so the endogenous closure reproduces the shut-ins the kernel was fitted on. Re-run the `commodity-hormuz.test.ts` August band.

**B2. Urea does not move (high).** Probe `B2`. Expected nitrogen at least 1.15. Observed 1.011. Mechanism: `commodity-registry.ts:146` gives nitrogen no route, and `chokepoint-flows.tsv` has no fertilizer row. Fix (sonnet): add a `CP-HORMUZ nitrogen` row from S4 (one third of urea trade, bypass 0). The kernel then carries it to grains through the existing 26-week input lag.

**B3. Stranded Gulf exporters book a windfall (critical).** Probe `B3`. Expected negative growth. Observed KWT +0.009213, QAT +0.009158, IRQ +0.012611. Mechanism: `commodity-pressure.ts:99-107` pays `exportRent * exported * change` on price alone and never asks whether the barrels can leave. Fix (opus): scale a supplier's export rent by the share of its exports that clears every contested route. A strait-dependence table per exporter, sourced from S2 and S5 and kept in `packages/world`, would supply that share. Charge the lost volume at the pre-shock price.

**B4. Per-flag passage changes the world price only (high; contradicts DECISIONS 6.10).** Probe `B4`. Expected Japan's growth hit, when Iran lets Japan's ships through, to fall by more than the price does (hit ratio below 0.628). Observed price ratio 0.785 and hit ratio 0.858: Japan is hurt relatively more once it is let through. Mechanism: the only reader of `passage.stopped` is the global loss at `commodity-shocks.ts:104`. Fix (opus): add a physical-shortfall term for each stopped destination in `commodity-pressure.ts`, sized from `CHOKEPOINT_CARGO` mbd over the nation's consumption. Do this together with B3, since both need a per-nation volume channel.

**B5. Third parties read a US blockade of Iran identically (medium).** Probe `B5`, run on full `advanceTurn` weeks against a no-action control. Expected China's tension to rise, or China and Japan to part ways. Observed tension change 0 for all five, and trust changes of CHN -0.1401, IND -0.1393, JPN -0.1366, KOR -0.1366, RUS -0.1401. Mechanism: not located in this pass. The uniform drop points to a world-wide deed or reputation term that ignores each government's stake, and nothing reads the blockade target's buyers. Fix (opus): add a third-party reaction keyed to stake (buyers of the target's exports, treaty allies, co-belligerents), routed through the relationship writer.

**B6. Black Sea grain under-reacts (high).** Probe `B6`. Expected wheat at least 1.15 within 8 weeks (FAO: +19.7% in March 2022). Observed 1.061. Mechanism: `commodity-shocks.ts:38` (`aggressor: 0.02`). Russia's own wheat exports barely count, and there is no Turkish Straits or Black Sea port route for grain. Fix (sonnet): add a Black Sea grain route row in the flow table, with Ukraine's ports and Russia's Black Sea share and the bypass the Danube and rail corridors carried (needs a sourced figure), plus a sourced risk premium.

**B7. A Taiwan war leaves the US economy untouched (critical).** Probe `B7`. Expected at most -2 points of US growth (Bloomberg Economics: -6.7% in a war, -3.3% in a blockade, S13). Observed -0.000124. Mechanism: no semiconductor commodity in `commodities.ts`; no Taiwan Strait row; `external-pressure.ts:236` `partnerExposure` moves only US exports with partner growth. Fix (opus): add a semiconductor input market with Taiwan's supply share, read as a growth input cost by `inputIntensity` (the field exists in `trade-sectors.ts`), and a Taiwan Strait route. Content for the scenario family goes to writers-room.

**B8. US sanctions do not hurt the target (critical).** Probe `B8`. Expected at least -2 points of Iran growth (World Bank: -3.7% in 2012 and 2018 from positive trend). Observed -0.000001 under sanctions and -0.000002 under a full embargo. Mechanism: `external-pressure.ts:213` uses `exportShare(target, imposer)`. Iran's exports to the US are near zero, so the dollar-system reach that `commodity-shocks.ts:177` grants for world supply never reaches the target's own economy. Fix (opus): when the United States is the imposer of sanctions or an embargo on a sector it can reach through the dollar, bite on the target's world exports in that sector times `SANCTION_BITE`. Add leakage that grows over time (E26) as a planning value, labeled as such.

**B9. Tariff cycling ratchets the price level (high; farmable).** Probe `B9`. Expected four impose-and-lift cycles to leave no more than one held tariff. Observed held 0.000121 and cycled 0.000484 (4.0 times), with no reversal on lift. Mechanism: `tariff-prices.ts:75` drops lifted measures and `:88` phases each new signature in afresh. Fix (codex, well specified): on lift, phase in a negative step equal to the share of the step already passed through, over the same 26 weeks. Test: held tariff and cycled tariff end at the same level. The magnitude is small at this sector, but the shape compounds across sectors.

**B10. No trade diversion (medium).** Probe `B10`. Expected Vietnam's consumer-electronics imports to rise after a 25% tariff on China's. Observed 69371.79 before and after. Mechanism: `trade-volume.ts:115` `measuresLeave` reads only the targeted partner. Fix (sonnet): reallocate a `substitutability` share of the lost imports to untariffed suppliers in proportion to their recorded share.

**B11. Retaliation never reaches US output (medium).** Probe `B11`. Expected negative US growth pressure while China's tariff on row crops stands (ERS: $13.2B a year). Observed 0. Mechanism: `trade.ts:720` books one week's export loss to the treasury once. `external-pressure.ts` reads no export volumes, and coercions exclude tariffs. Fix (sonnet): price standing retaliation as lost US exports over output in `coercionPressure`. Optionally weight it to farm-state opinion; check that with the opinion domain.

## Held in the probe file

- C1: the pump moves 2.31 cents a gallon per $1 a barrel.
- B12a: crude ends 52 weeks after reopening at 1.013 of rest, with a low of 0.987.
- B12b: a second identical war peaks at 1.370 against the first war's 1.375. No ratchet.

## Owner questions

- When the United States blockades Iran, should the US Navy also be a denier at the strait (E27)? Today Iran decides passage and lets China's cargo through. This is a design call that changes B1's numbers.
- Should a strait shared by one belligerent close fully at intensity 1? `ROUTE_CLOSURE = 0.5` caps it at half. That is the main lever on B1.

## Not checked

- Fiscal and monetary channels (`fiscal*.ts`, `monetary*.ts`, `sovereign*.ts`) beyond what external pressure feeds them. A sovereign default under sanctions was not probed.
- `blocked-assets.ts` and `instruments-economic.ts` beyond the measure records. The Russia 2022 reserve freeze was not benchmarked.
- The IEEPA tariff authority and its 2025–26 litigation, which is absent from `tariff-statutes.ts`. I did not research whether that absence is a deliberate ruling.
- Equity markets (`markets.ts`) and the Fed record under a shock.
- Domestic approval end to end. The pump-shock salience path is held by `commodity-hormuz.test.ts` and was not re-probed.
- The mechanism of B5's uniform trust drop, which is not located.
- NPC-to-NPC sanctions and embargoes beyond the `embargo:` flag path.
- The US net-exporter windfall sign: the US gets +0.02 growth points from an oil spike at week 12. No benchmark for it was opened.
- Multi-seed variance. Every probe runs one seed (`economy-probe`).
