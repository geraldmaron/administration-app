# Coercion and war follow-ups: built and measured, 2026-10-13

Branch `feat/coercion-followups`, based at `011d0c042`. This closes out what BL-151 (`SMALLER-CHANGE.md`) and BL-154 (`WAR-LOSSES.md`) left open, under the owner's answers of 2026-10-13 in `docs/audits/2026-10-12-data-model/OWNER-QUESTIONS.md` (Q1 to Q4, Q23, Q24).

## Outcome

Other governments' coercion is under control on the twelve passive terms SMALLER-CHANGE.md measured: acts of force on the relationship record fell from 17 to 0 and NPC-opened wars from 13 to 0, and the China-Russia war that held Brent above $90 for 73 weeks in coercion-6 no longer happens (16 weeks there now). Most of the fall is the owner's nuclear rule: 11 of the 17 acts were against a declared arsenal with delivery (China and Russia on each other, India on Pakistan, Myanmar on China) and are now refused; the other six (China on Myanmar, in seeds where Myanmar and China also fought wars the after runs no longer have) did not recur, and this measurement does not separate why. The per-term cap of 8 never bound (the busiest term had 5 before); the pair cooldown would have stopped the repeats. NPC strait closures were 0 before and after; the one closure in both columns is Saudi Arabia's war with Iran, carried from the opening board.

**Top risk: weeks above $90 did not fall (135 → 131).** Crude's kernel now passes a shock through about twice as hard, fitted to the 2026 Hormuz closure, and that doubles the price effect of shock inputs that are planning values. On the two seeds that rose most, the peak was not a war: coercion-5 peaked at $116.76 in week 45 with four United States cyclones charged together (0.039 + 0.037 + 0.022 + 0.020 of world crude, each a `CONDITION_OUTPUT_LOSS` share of the whole national output), and coercion-11 at $116.15 in week 138 under "measures on United States" (0.066 of world crude: another government's sanctions charged at the US supplier share times severity times `SANCTION_BITE`) plus a cyclone (0.034). Those readings come from one diagnostic replay of the two seeds after the measurement (`commodityShocks` at each seed's peak week). Before the refit the same inputs produced 9 and 47 weeks above $90 on those seeds. Two fixes, either sufficient for these seeds, neither built here: charge a nation's simultaneous conditions of one kind at the heaviest rather than the sum, and scale a measure on a producer by the imposer's share of the producer's buyers. Reverting `CRUDE` to the energy planning value (2.5) would undo the kernel fit instead.

Held fronts now lose at one rate whatever their drift beneath the line, so a front held near the line loses fewer and one drifting near zero loses more: the carried Armenia-Azerbaijan war reads 21 killed a week on every seed (10 to 38 before, by drift), Israel-Syria 74 (129 and 136), and India-Pakistan in coercion-11, fought as well as held, 353 across its 54 weeks (535). Civilian deaths are now counted: 3,355 in India-Pakistan over those 54 weeks, 798 and 1,140 in the two Israel-Syria wars. Approval at a term's end moved by under 0.005 on every seed (mean 0.4697 → 0.4701).

## What changed

| Item | Change | Where |
|---|---|---|
| NPC frequency caps | One dated ledger rations other governments' acts by family: a cap on acts in any 208 weeks, a rest on the thing acted on. Acts of force (military rungs 3 to 5): 8 a term, a pair rests 26 weeks (planning values for the owner to set). Strait closures (a war newly opened with a government on a priced strait's shores, where no war already contests it): 2 a term, a strait rests 104 weeks (the owner's Q24 rate). The agent refuses a rationed act before it prices it; the President is never rationed. | `npc-tempo.ts`, `coercion-tempo.ts`, `npc-agent.ts#weigh`, `npc-turn.ts#npcTempoRecord` |
| Per-flag passage (Q23) | Each littoral party to the war that contests a strait lets through cargo bound for itself, its co-belligerents, a government aligned with it either way, or one it reads at disposition 0.3 or better (a planning value), and never its enemies in the war. The price is fed only the stopped share. Hormuz crude has a sourced cargo split; every other strait, and cargo the source files under a region, is stopped with any ship. In a war between Iran and the United States, Iran passes China's cargo and stops 0.634 of Hormuz crude. | `strait-passage.ts`, `commodity-shocks.ts#routeShock`, world `chokepoint-cargo.ts` |
| Hull losses (Q4) | Where the President's government is at war with an enemy that can fire on ships and has naval formations deployed toward it, one hull at most a week is lost at 0.003 a hull-week at full intensity, named from the Naval Vessel Register in the class sent. It leaves the deployment (wound down at zero, which lifts a blockade) and the order of battle; 10% of the catalog crew is killed, filed against the population and the war's casualty band. Crews are never named. | `hull-losses.ts`, `war-tick.ts`, world `us-hulls.ts` |
| Held fronts (BL-154) | Below the 0.2 line a side loses at the Korean static line's rate: 0.000384 killed a week per person in contact, 6.36 wounded for each killed. | `war-attrition.ts` |
| War money once (BL-154) | The deployment keeps the bill. A war the President pays for through an active currency commitment toward the war or the enemy carries no share of output on the fiscal statement, and the war tick no longer draws the President's authority. | `fiscal-impulse.ts#warOutlayShare`, `war-tick.ts#attritionEffects` |
| Deterrence (Q2) | Blockade, strike and invasion are refused by anyone against a government with a declared arsenal and delivery (`declared` not false, `deliveryTriad`): the United States, Russia, China, the United Kingdom, France, India and Pakistan. Below that line, a nuclear defender now drags rung 3 as well as 4 and 5 (`DETERRED_RUNGS` was `[4, 5]`). | `instrument-gates.ts#outsideNuclearDeterrence`, `resolution.ts` |
| "Hits back" on rungs 1 and 2 | Removed: an exercise or a forward deployment puts no force on the target to fire on, so a failure is all `repulsed`. | `force-failure.ts#hitsBackHarder`, `resolution.ts#risksFor` |
| Kernel undershoot | Crude's sensitivity refitted from 2.5 to 5 against the 2026 Hormuz closure, fed as net loss; the gas markets keep 2.5. | `commodity-registry.ts`, `commodity-calibration.test.ts` |
| Civilian deaths | The defender's civilians die at 0.3 of the defending side's soldiers killed each war week, filed against its population and kept on `Conflict.civilianDeaths`. | `war-attrition.ts#civilianDeaths` |

## Why the deployment keeps the war's money

A war was billed three ways: `WAR_OUTLAYS` (2% of potential output a year for an aggressor, times intensity) on the fiscal statement, the deployment's weekly commitment on the President's authority, and a weekly draw of up to 4% of that authority in `war-tick.ts#attritionEffects`. The engine's own accounting already says what a commitment is: `national-books.ts#usOutlays` treats commitments as paid from authority inside the discretionary line, so their dollars are already on the statement once. The war-tick draw billed the same authority a second time, and `WAR_OUTLAYS` billed the same dollars a second time on the statement. The commitment is the bill priced from what the units sent cost (DECISIONS §6.8), so it is the one kept. `WAR_OUTLAYS` stays for a war the President fights with nothing committed and for every other government, whose commitments are never billed. The reserves drain on every belligerent's `economy.reserves` stays: it is the foreign-reserve stock, not the budget.

Consequence for the player: a US war paid by deployment no longer shows on the statement's "world" driver; it shows on the authority the deployment draws. If the owner wants the statement to carry a war, the alternative is to bill the deployment's dollars as a supplemental above the line and stop drawing them from authority.

## Sourced figures

All opened 2026-10-13.

| Figure | Value | Source |
|---|---|---|
| Hormuz crude and condensate by destination, 1H25 (Mb/d) | China 5.400, India 2.049, South Korea 1.747, Japan 1.705, other Asia and Oceania 2.257, Europe 0.586, United States 0.427, Saudi Arabia 0.018, other 0.557 | EIA, World Oil Transit Chokepoints (updated 2026-03-03), Figure 5 data: https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/excel/Chokepoints_FY2026_F5.xlsx |
| US hulls in commission | 11 carriers (CVN 68 class 10, CVN 78 1), 83 cruisers and destroyers (CG 47 5, DDG 51 76, DDG 1000 2), 31 amphibious ships, 47 active attack submarines | Naval Vessel Register, USS Ships in Commission (site updated 2026-08-11): https://www.nvr.navy.mil/nvr/getpage.htm?pagetype=activeincommission |
| Hull loss rate | Two warships (Tripoli, Princeton) put out of action by mines inside about six weeks with about 115 US warships in theater: 2 / (6 × 115) ≈ 0.003 a hull-week | Navy, "USN in Desert Shield, Desert Storm": https://gulflink.health.mil/histories/db/navy/usnavy_053.html and usnavy_056.html (no page date) |
| Crew killed on a lost hull (planning value 0.1) | Sheffield 20 of 281, Coventry 19 of 287, Ardent 22 of 177 (sunk, 1982; secondary counts on Wikipedia); Stark 37 killed, hit and saved (1987) | Navy report usnavy_018.html; the 1982 counts are secondary and labeled so in the code |
| Held-front rate | US Army divisions on static defensive lines, January 1951 to July 1953: 3,629 killed in action over 3,494 division-days at a mean strength of 18,926; 17,549 wounded admitted and 5,549 returned to duty the same day | Reister, Battle Casualties and Medical Statistics: U.S. Army Experience in the Korean War, Table 26: https://thekwe.org/topics/casualties/surgeon_general/p_ch2.htm |
| Civilians per soldier killed | 0.32 (more than 10,000 civilians verified by 2024-02-21 against 31,000 Ukrainian soldiers by 2024-02-25) and 0.29 (12,654 by 2025-02-21 against 43,000 by 2024-12-08) | https://ukraine.un.org/en/261245-two-year-update-protection-civilians-impact-hostilities-civilians-24-february-2022; https://kyivindependent.com/zelensky-31-000-ukrainian-soldiers-killed-in-action/; https://ukraine.ohchr.org/en/Civilian-Harm-and-Human-Rights-Abuses-Persist-in-Ukraine-as-War-Enters-Fourth-Year; https://www.pravda.com.ua/eng/news/2024/12/08/7488226/ |
| Kernel case, 2026 Hormuz | Brent $71 on Feb 27 (March 2026 STEO); March average $103 (April STEO); April $117 (July STEO); shut-ins 8.89 Mb/d in March and 10.4 in April (July STEO, Table 1); world production 108.42 Mb/d in 4Q25 (October STEO, Table 3a) | https://www.eia.gov/outlooks/steo/archives/mar26.pdf, apr26.pdf, jul26.pdf; https://www.eia.gov/outlooks/steo/ |
| Kernel case, 2024 Red Sea | Brent $83 in November 2023; $81 for 2024; strait flow 8.7 to 4.0 Mb/d | https://www.eia.gov/outlooks/steo/archives/dec23.pdf; https://www.eia.gov/todayinenergy/detail.php?id=63446 |

Kernel fit: fed the March then April shut-ins from $71 with a full-intensity Hormuz route's risk, crude at sensitivity 2.5 read $86.5 at week 4 and $91.2 at week 8 (16% and 22% under the monthly averages). At 5 it reads $100.3 and $109.2 (3% and 7% under), inside the stated tolerance of 10% at each, and the full-intensity Bab el-Mandeb route term moves Brent 2.9% in twelve weeks (under the 5% the 2024 case allows). At 6 it would read 2% over and 1% under; 5 is the smallest round value inside tolerance, because every war's route term reaches the same kernel.

## Measured: other governments over a passive term

All runs: passive proxy, Democrat, `foundedForBalance` on seeds `coercion-0` to `coercion-11`, 208 weeks. "Before" is the engine `dist/` committed at `011d0c042`; "after" is this branch's engine source. Both read this branch's world source. "Acts of force on the record" counts blockade, strike and invasion events on relationship histories with a government other than the United States as actor; an attempt that leaves no event is not counted (the after ledger shows one such attempt, in coercion-9). Measured once, in one process, with the command at the end.

| | Before | After |
|---|---|---|
| Acts of force on the record | 17 (8 blockades, 9 strikes) | 0 |
| Wars opened by other governments | 13 | 0 |
| Strait closures made by other governments (most in one term) | 0 (0) | 0 (0) |
| Strait closures from every cause | 1 (the carried Saudi-Iran war) | 1 (the same) |
| Weeks Brent above $90, of 2,496 | 135 | 131 |
| Mean Brent | $76.79 | $76.90 |
| Mean approval at the end | 0.4697 | 0.4701 |

| Seed | Acts of force on the record (blockade/strike/invasion), before → after | Busiest pairs, before → after | Wars opened, before → after | Brent mean, before → after | Brent max, before → after | Weeks Brent > $90, before → after | Approval at the end, before → after |
|---|---|---|---|---|---|---|---|
| coercion-0 | 5 (3/2/0) → 0 | CHN>RUS:3 RUS>CHN:2 → - | 3 → 0 | $78.33 → $73.91 | $87.85 → $75.04 | 0 → 0 | 0.4477 → 0.4491 |
| coercion-1 | 0 (0/0/0) → 0 | - → - | 0 → 0 | $74.46 → $74.71 | $77.68 → $79.8 | 0 → 0 | 0.4222 → 0.4221 |
| coercion-2 | 0 (0/0/0) → 0 | - → - | 0 → 0 | $74.17 → $74.31 | $77.11 → $79.38 | 0 → 0 | 0.5435 → 0.5477 |
| coercion-3 | 3 (2/1/0) → 0 | CHN>RUS:2 IND>PAK:1 → - | 3 → 0 | $76.58 → $74.77 | $91.62 → $79.67 | 6 → 0 | 0.4579 → 0.4584 |
| coercion-4 | 4 (2/2/0) → 0 | CHN>MMR:2 CHN>RUS:1 MMR>CHN:1 → - | 2 → 0 | $76.78 → $77.96 | $84.34 → $91.87 | 0 → 8 | 0.4312 → 0.4312 |
| coercion-5 | 0 (0/0/0) → 0 | - → - | 0 → 0 | $76.48 → $78.25 | $96.26 → $116.76 | 9 → 18 | 0.4803 → 0.4802 |
| coercion-6 | 1 (1/0/0) → 0 | CHN>RUS:1 → - | 1 → 0 | $85.55 → $82.92 | $102.67 → $96.45 | 73 → 16 | 0.4558 → 0.4566 |
| coercion-7 | 0 (0/0/0) → 0 | - → - | 0 → 0 | $74.66 → $75.1 | $80.76 → $86.55 | 0 → 0 | 0.5391 → 0.5391 |
| coercion-8 | 0 (0/0/0) → 0 | - → - | 0 → 0 | $74.53 → $74.78 | $77.89 → $80.48 | 0 → 0 | 0.4726 → 0.4727 |
| coercion-9 | 3 (0/3/0) → 0 | CHN>MMR:3 → - | 3 → 0 | $74.35 → $74.5 | $77.34 → $78.41 | 0 → 0 | 0.4508 → 0.45 |
| coercion-10 | 1 (0/1/0) → 0 | CHN>MMR:1 → - | 1 → 0 | $74.32 → $74.53 | $76.99 → $79.76 | 0 → 0 | 0.4759 → 0.4759 |
| coercion-11 | 0 (0/0/0) → 0 | - → - | 0 → 0 | $81.27 → $87.05 | $96.63 → $116.15 | 47 → 89 | 0.4594 → 0.4586 |

The before column differs slightly from SMALLER-CHANGE.md's after column (133 weeks above $90 there, 135 here; coercion-3 6 against 4) because the engine moved between `38f028039` and `011d0c042` (the war-loss model, the appointments pool and others).

Wars, per seed, as `aggressor-defender:status:weeks:killed a week (both sides, band midpoints):civilians` (after only; civilians were not counted before):

| Seed | Before | After |
|---|---|---|
| coercion-6 | ARM-AZE settled 64 weeks, 10/w; ISR-SYR settled 42 weeks, 129/w; CHN-RUS settled 69 weeks, 1,533/w | ARM-AZE settled 64 weeks, 21/w, 131 civilians; ISR-SYR settled 42 weeks, 74/w, 798 civilians |
| coercion-8 | VEN-GUY settled 40 weeks, 3/w; ISR-SYR settled 60 weeks, 136/w | VEN-GUY 40 weeks, 2/w; ISR-SYR 60 weeks, 74/w, 1,140 civilians |
| coercion-11 | IND-PAK settled 54 weeks, 535/w; ARM-AZE settled 48 weeks, 30/w | IND-PAK settled 54 weeks, 353/w, 3,355 civilians; ARM-AZE 48 weeks, 21/w, 96 civilians |

## Declined, with the reason

| Item | Why |
|---|---|
| Bypass capacities for Malacca, Suez, Panama, the Turkish and Danish straits | Re-read EIA's World Oil Transit Chokepoints (updated 2026-03-03). Malacca's alternatives (Sunda, Lombok, the Myanmar-China pipeline) carry no capacity. Suez and SUMED's only stated capacity, SUMED's 2.5 Mb/d, is part of the route, and its Cape detour is the one the Bab el-Mandeb row already counts in the 2024 episode. Panama's crude (0.1 Mb/d) fits inside the Trans-Panama pipeline's spare (864,000 b/d capacity, about 400,000 used), so a row would carry no net loss, and its products have only sea detours of up to 8,000 miles with no capacity. The Turkish straits' alternatives are named without capacities and carry other crude. The Danish straits' Kiel Canal took about 0.2 Mb/d of products in small tankers. No row was added. |
| Per-flag splits beyond Hormuz crude | The pages opened split the Suez Canal and SUMED by destination (Figure 7), not the Bab el-Mandeb, and no LNG split was opened. Those straits close to every flag alike. |
| Pricing a blockade's import cut | Every blockade on station is inside the war it opened, and the war already carries the target's inflation term (`external-pressure.ts`, `WAR_PRESSURE.defender.inflation` 0.03 at full intensity, set on what a year of war does). An import-shortage term would bill the same shortages again, and no opened source gives an import-cut pass-through. |
| A non-US wounded-per-killed curve | The sources found put non-US high-intensity wars at 2.6 to 4.2 wounded per killed (UK Falklands 777 / 255 = 3.0, https://www.royalnavymuseums.org.uk/news/falklands-40-impact; Russia in Georgia 283 / 67 = 4.2, EU fact-finding mission, https://rrc.ge/law/DaskvnTaliavin_20_09_2009_E.htm), around the US heavy figure of 3.2 the curve already uses there. The light end has only Israel 2023-24 (5,569 / 891 = 6.25, all-cause deaths, a news report of IDF figures), close to the held-front 6.36 that now applies to every government below the line. No change. |
| Hull losses for other navies | Only the US register names hulls; other navies keep losing people through the casualty model. |
| NPC strait closures by joining a war | The cap gates the agent's acts. A littoral government that joins a war through `war-join.ts` contests the strait without consulting the ledger; the measurement counts closures from every cause. |

## Not run

By instruction: no workspace build, typecheck, lint, full suite, verify sweep, Playwright or balance harness; BL-154's acceptance asks for the balance harness, and it is the integrator's to run. No campaign run puts the United States at war, so hull losses are proven by `hull-losses.test.ts` (rate, naming, deployment and fleet, deaths, replay) and not measured over a term; a US blockade of Iran under per-flag passage and the refitted kernel was not re-measured either. Targeted vitest only, on the files added or changed and on the engine tests around them, run against the world package's source through a scratch alias; one 12-seed measurement.

## Commands

From the worktree root (`~/.admin-app-wt/coercion-followups`), with no build:

```bash
# The measurement (one process, both engines; "before" is the committed dist at 011d0c042):
node_modules/.bin/vite-node -c docs/audits/2026-10-12-coercion-geography/probes/follow-ups/vite-node.config.mjs \
  docs/audits/2026-10-12-coercion-geography/probes/follow-ups/probe-tempo.mjs packages/engine/dist packages/engine/src 208 12
```

Targeted tests were run with vitest against `packages/engine/src`, aliasing `@admin/world` to `packages/world/src/index.ts` (the engine's tests otherwise read the world's committed `dist/`, which does not carry the two new tables): the new files (`npc-tempo`, `coercion-tempo`, `strait-passage`, `hull-losses`, `commodity-calibration`), the changed ones (`conflicts`, `war-attrition`, `npc-agent`, `fiscal-impulse`, `hill-ledger-golden`), and 43 engine test files around them (blockades, commodities, contest, external pressure, fiscal, force failure, household prices, instruments, markets, national books, the NPC agent and turn, resolution, red lines, pursuits, geography, war opinion, every war module, save, week-play, path parity): all pass. In `packages/world`, `seed-tables.test.ts` and the new `naval-tables.test.ts` pass. Source-only gates run individually: `verify-rule-seams`, `verify-file-size`, `verify-american-spelling`, `verify-us-units`, `verify-no-history-references`, `verify-disposition-readers`, `verify-trade-measure-kinds`, `verify-opinion-causes` pass. The engine was typechecked against the world's source with a scratch tsconfig that writes no build info; eslint on the changed files is clean.

## Integration, 2026-10-14: the two shock fixes

The measurement above left weeks with Brent above $90 at 131 (and 200 once the integrated tree was measured on the same seeds). A diagnostic replay of `coercion-11` found the held-up price was one government's measures on the United States priced as a 6.6% world supply loss: the whole of American crude, removed by one buyer's tariff. Two fixes landed in `commodity-shocks.ts`:

1. Several shocks on one producer's output charge the heaviest, not the sum (`6e052172b`).
2. A measure keeps a seller's output only from the buyer that imposed it, by the dataset's modeled partner share; a United States measure keeps its full reach, because its sanctions carry through the dollar system (`221357a2b`). The August 2026 Iran case stays inside its band.

Re-measured on the same twelve seeds, passive, 208 weeks: weeks above $90 fell to 0; the highest week was $88 and term means ran $74 to $77.
