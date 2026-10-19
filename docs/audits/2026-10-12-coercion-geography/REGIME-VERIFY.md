# Regime change design: adversarial verification, 2026-10-13

Checks `REGIME-CHANGE.md` (same folder) against committed engine and world `dist/` on `codex/simulation-depth-completion`, with source cited file:line. Read-only: no build, no workspace tests, no verify sweep, no Playwright, no balance harness. Probes ran one at a time from the repository root. Three extra scratch probes (war ratio, dial sensitivity, projection multipliers) lived outside the repository; their logic is described where used.

## Verdict

**Design as written: rejected. The structure is kept, with controls.** The act family, the legal and exposure routing, the prerequisites and the NPC caps are sound. The equations are not ready to calibrate:

1. As specified, the contest term never fires against 7 of the 11 targets in the design's own worked examples.
2. The dials fail the design's own C1 test once the test's 104-week window is applied.
3. The Venezuela fit gives a 96.5% fall over the six years the design says it reproduces.

The casualty claim holds exactly, and source review turned up a second war defect the design missed: a US invasion of a small state is never decisive, so no successor is seated.

**Recommended first slice** (details in section 4): fix casualties, decisiveness and reach (S0), then add coup support, political action through elections, and decapitation on the existing coup, election and succession paths. Measure that at 12 seeds before building hold, contenders or occupation.

---

## 1. "What exists today"

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| E1 | No act replaces a government; covert rung 5 is a one-shot stability write | **PARTLY CONFIRMED** | No act seats anyone, and `applyLeadership` moves no relationship (`world-effects.ts:46-56`). Rung 5 is exactly `regimeStability −0.15·jitter`, trust −0.4 and the flag (`instruments.ts:226-241`). But the stability write *does* raise the existing coup hazard, whose regime-survival term reads stability (`foreign-politics.ts:285-293`). For Haiti it goes from 0.00176 to about 0.0032 a week at 0.231. So an act can cause a fall indirectly; it cannot choose the successor. A decisive war defeat also seats a successor (`war-outcomes.ts:138-143`), but see E3b. |
| E2 | Haiti 0.37 → 0.044 over 80 weeks, same president | **CONFIRMED, one correction** | Reproduced exactly: 0.044 against 0.363, the same `PER-HTI-president-3` in both runs, 4 unfounded, standing 0.594 against 0.674, approval 0.574 against 0.579. "Five covert regime actions" is wrong: 7 orders went out by week 80 (weeks 0, 13 … 78); 4 landed, 2 failed and 1 was in progress. This is one seed. The probe's `scandals` column reads `s.scandals`, which does not exist (scandals are derived), so it cannot show whether the two failures produced a `covert-failure` scandal. |
| E3 | Venezuela invasion, US 110,993–141,824 casualties, from the whole active force | **CONFIRMED (formula exact), with three corrections** | See E3a–E3c below. |
| E4 | Iraq and Afghanistan unreachable; Canada and Venezuela reachable | **CONFIRMED, broader than stated** | `PROJECTION_CAPS[5] = 1.3` (`instrument-gates.ts:156`); multiplier `1 + (km/8000)·(1 − 0.7·lift)`, or 1 with a shared border (`geography.ts:26-38`). US multipliers: CAN 1, CUB 1, HTI 1.11, VEN 1.15, PAN 1.15, GBR 1.27 (pass); LBY 1.36, SYR 1.44, IRQ 1.46, IRN 1.47, KWT 1.49, SAU 1.50, JPN 1.50, AFG 1.52, KOR 1.52, DEU 1.31, UKR 1.36, TWN 1.58 (refused). Kuwait 1991 is unreachable too. `basesAbroad` (750 for the US) is not read by `forceProjectionCost`. |
| E5 | Covert cost is a GDP share and invisible against the refill | **CONFIRMED** | `INSTRUMENT_UNIT_COST.covert.treasuryOfGdp = 0.0001923` × GDP × rung weight × reach (`resolution.ts:243, 270-283`). Reserved at issue (`instrument-issued.ts:46, 63`) and refunded at execution (`:109`). Act minus control: −$23M (t3), −$158M (t4), $0 (t10). DECISIONS §6.8 retired GDP-share pricing for force acts with the reason quoted in the design. |
| R4 | `destabilized:` flag read only by the inquiry | **CONFIRMED** | Readers: `committee-inquiry.ts:71-72` only. The coup term named "destabilized" reads war (1) or a live condition (0.5) (`foreign-politics.ts:274-283`). |
| P1 | Menu table | **CONFIRMED** | Every row reproduced, e.g. HTI covert-5 −$20,543.88M, odds 0.53, exposure 0.0675; CAN 0.40 against IRN 0.29. |
| P2 | Coup ceiling | **CONFIRMED** | 195 of 195 have an armed rival. VEN 0.00866, HTI 0.00666, IRN and CUB 0.00367, PAN 0.00306. Venezuela's higher rate on `regime-0` comes from a VEN–GUY war that is live at founding on that seed (destabilization = 1). |
| P5 | NPC tempo | **CONFIRMED (one seed)** | No NPC covert-4/5 or military-5; covert-2: 9, covert-3: 2. Window: 22 elections, 1 coup (SOM), 1 resignation. The 24-entry window (`state-world.ts:141`) cannot count a term's coups. |
| R9 | War outlay 2% of GDP × intensity for an aggressor | **CONFIRMED** | `WAR_OUTLAYS.aggressor = 0.02` (`fiscal-impulse.ts:118-131`). |

### E3a. The casualty formula, exactly

`war-attrition.ts`:
- `PRINCIPAL_ENGAGED_SHARE = 0.5`, `JOINER_ENGAGED_SHARE = 0.1` (`:17-18`).
- `WEEKLY_CASUALTY_RATE = 0.02` (`:26`).
- `engagedPersonnel = activeHeadcount(principal)·0.5 + Σ activeHeadcount(joiner)·0.1` (`:62-66`).
- `weekly = engaged · 0.02 · intensity · (0.5 + pressure)` (`:73-75`).
- Accumulated by `accumulateCasualties` (`:89-106`) from `war-tick.ts:404`, where `pressure` is `posturedPressure(campaign, conflict, clamp01(1/(1+ratio)))` with no swing (`war-tick.ts:398, 354-360`). For the President's side it is multiplied by the theater's posture factor, which was 0.95 here.

US `activeHeadcount` is 1,388,484, so engaged is 694,242 whatever is sent. At intensity 0.5 and pressure 0.5, that is 6,942 a week. The design's "about 6,900" holds. It applies to every war on the board. A US joiner is charged 138,848 engaged, about 1,390 a week at intensity 0.5.

### E3b. What the design missed in the same run

The scratch war-ratio probe (same seed `regime-2`, military-5 at step 0) logged `strengthRatio` each week:
- The ratio was **1.22–1.26** throughout the war. The US was carrying 0.42–0.45 of the pressure, so it was not a lopsided fight in the engine's eyes.
- The war ended at week 23 on defender exhaustion 0.88. That is a "collapse", which is decisive only if `ratio ≥ DECISIVE_RATIO = 2` (`war-tick.ts:108, 231-233`). It was not decisive, so `succession()` returned nothing (`war-outcomes.ts:138-143`).
- That, not chance, is why the invasion "changed nothing about who governs". `sideStrength` uses projection profile scores, not force size (`war-tick.ts:44-53`). Any US invasion of a small state lands near parity, and its collapse will rarely seat a successor.
- Losses run opposite to size. Venezuela had 61,500 engaged and lost 7,892–20,787; the US lost about ten times that. On the founding board the NPC war VEN–GUY charges Venezuela 214 a week against Guyana's 4, because each side's losses scale only with its own force.

### E3c. What the number means and where it lands

- **The source says "killed and wounded"** (`war-attrition.ts:21-26`), but `casualtyCost` reads the band midpoint as "dead" (`opinion-war.ts:33-37, 81`). At a midpoint of about 126,400 the security judgment loses `0.08·log10(1 + 1264) = 0.248`, essentially the 0.25 cap (`opinion-war.ts:22-25`). So every sizeable US war already sits at the casualty cap.
- **"Every war wrong by two orders of magnitude" (§13) is overstated.** For two large armies the rate is the stated intent (`:21-24`, "hundreds of thousands a year"). The defect is structural (losses ignore the opponent and the committed force) and severe for expeditionary and asymmetric wars, which means every US war.

---

## 2. The design

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| D1 | The contest term goes into `coupTerms` "through the same `weigh` call", so it fires wherever hold is low enough | **REFUTED as specified** | `coupHazard` returns `undefined` when `regimeStability ≥ 0.45`, before any term is weighed (`foreign-politics.ts:236, 303-305`). At founding, GTM 0.55, CUB 0.75, IRN 0.60, NIC 0.55, PAN 0.68, CHL 0.70 and PRK 0.85 are all above it. Coup support moves only the military contender, not stability, so the §6.1 numbers for Cuba (10.4%) and Guatemala (36.9%), and the Iran and North Korea rows, cannot happen. The cooldown helper is also coup-only (`recentlySeizedPower`, `:296-300`), and the coup path seats `armedRival` partyless (`:475-479`). Successors drawn from contenders need their own seat path and their own ceiling rule. |
| D2 | The dials sit inside O'Rourke's band (C1) | **REFUTED by the design's own test** | Using the `calc-regime.mjs` equations over C1's own 104-week window: HTI 0.759, VEN 0.732, IRQ 0.592, MLI 0.415 (band 30–55% for H < 0.45: three of four fail). For H > 0.55: CUB 0.319, PRK 0.271, CHL 0.431, PAN 0.506 (band < 15%: all fail, setting D1 aside). IRN (H 0.547) is 0.668. The design reported 52-week figures only. |
| D3 | Venezuela recognition reproduces "the 2019–2025 record" | **REFUTED** | The same equations run for 312 weeks give **96.5%** fallen; the record is no fall in six years. The weekly `S −0.001` and `K` drift take H down without bound. R = 0.3 is also below the design's own definition (the coalition's share of world GDP); R = 0.55 gives 22.5% at 52 weeks. US and EU GDP shares were not opened here, so the R value is a planning question. |
| D4 | Subtracting the founding hazard keeps the world's rate unchanged | **PARTLY REFUTED** | It holds with no record. Once a record exists, drift since founding is billed to the sponsor. In the `regime-0` control, Venezuela's stability fell from 0.35 to 0.10 by week 41 with no US act, and that drift alone gives p_add 0.0086 a week (36% a year). The reference should be the no-operation counterfactual at today's H, not the founding values. |
| D5 | Fitted, not overfitted | **NEEDS VALIDATION** | Changing slope, threshold or ceiling by ±25% gives Haiti 33–49%, Cuba 5.8–17%, Venezuela recognition 12–19.5%. Four rows set three dials, and there is no held-out case. |
| D6 | Two-year half-life "as O'Rourke's data says it does" (§0) | **REFUTED as a citation**; §4.6's "inference" label is correct | The H-Diplo/ISSF 13-3 roundtable (opened) says installed regimes were "no more or less likely to cast United Nations votes with, adopt a similar foreign policy portfolio to, or increase trade with the United States" over the following decade, and gives no time profile. A +0.6 start with a 104-week half-life still leaves about +0.17 averaged over ten years, which is hard to square with "no more likely". The same source says the US "was most likely to succeed when it moved against weak states that were both democratic and an ally", and that covert change "was successful against weak governments with little geostrategic value". The hold formula makes democracies the hardest targets. R10's complaint (Canada 0.40 > Iran 0.29) is not supported by that source. |
| D7 | O'Rourke figures (64 covert, 6 overt, 25 successes, 39% against 66%, first 18 offensive failed, about half for preventive and hegemonic, civil war and mass killing) | **CONFIRMED** | H-Diplo/ISSF 13-3, opened. |
| D8 | Preble: most failed to remain covert; 44 of 64 backed authoritarian forces | **CONFIRMED** | War on the Rocks, 2019, opened. The source's "failed to remain covert" includes disclosure after the fact; the design's in-operation hazard measures a different quantity, so C2 is a planning band, not a fit. |
| D9 | Downes and Monten table: 10/60, 16/38, 13/17; civil war 10 of 39; 57 of 63 | **Numbers CONFIRMED; attribution and use REFUTED** | Table 1 is in Nomikos's letter, not in Downes and Monten's work. They reply that they are "not persuaded that FID is a superior category", and their own figure is 4 of 10 institutional FIRCs (Yale PDF, opened). The two ends the democracy line is fitted to (0.17 nondemocracy-initiated, 0.76 FID after 1918) describe the *intervener's* type and intent, not target preconditions. Fitting `0.17 + 0.59·Q` on Q (target wealth, factionalism, prior democracy) is a category error. |
| D10 | Venezuela 2019–26 | **PARTLY CONFIRMED** | CRS IF10230 (opened): 57 countries; 4.8M left by December 2019; −35% in 2019; Russia, Cuba, Turkey, Iran backing; efforts to make security forces abandon Maduro failed. WDET/NPR, 2026-01-03 (opened): strike, Maduro and Cilia Flores captured and flown out, SDNY indictment. AP via PBS, 2026-08-29/30 (opened): Delcy Rodríguez "acting president"; 100-year rights; US gets "55% effective output"; "No text of any agreement has been released". **Not in either opened source:** "his vice president" and "with US warships offshore". The L = 0.6 "naval presence" leverage in §6.2 rests on the unverified part. CRS also names Cuba as Maduro's military and intelligence supporter; the powerTier-weighted patron term picks Russia (0.217) and cannot see Cuba's role. |
| D11 | Iraq fit: 4,418 deaths by week 388, $1,308.7B | **CONFIRMED arithmetic; the fit is circular** | CRS RL32492 (opened): 4,418 OIF deaths = 3,481 hostile + 937 nonhostile; 31,994 wounded. μ is one parameter fitted to that one total, so C6 passes for Iraq by construction. 21% of the deaths are nonhostile and do not scale with insurgency. $1,308.7B is plan × brigade-year anchor (`force-cost-anchors.ts:37`, CPI rows `:22, 26`), not a model output. The year profile rises in years 5–7 (762, 600, 449 a year), while the design itself concedes violence fell in 2007–08. |
| D12 | S0a test: a sized invasion of Venezuela "under 2,000 US killed" | **NEEDS VALIDATION; likely fails as written** | The engine has no killed count. With engaged = the rung-5 package (8 BCT = 32,000 by `forceAssetPersonnel`) and the observed pressure and length, the result is about 294 killed and wounded a week × 19 weeks ≈ 5,600. Anchors (CRS RL32492, opened): Desert Storm 148 hostile deaths; Just Cause 23; Urgent Fury 19. The fix also needs a rate that reads the opponent, a killed/wounded split, and the decisive ratio (E3b). Headcount per brigade is inconsistent: 4,000 per BCT in the package against 9,000 per brigade in the occupation (§4.8). |
| D13 | Content hooks `covert-exposed:<target>`, `occupation:<target>:year-N`, … | **CONFLICTS with DECISIONS §7.7** | §7.7: a closed `deed:` grammar; content "may gate on the unbound forms … never gate on a bound one". These hooks are bound to target ids. |
| D14 | Arithmetic in §4–6 (holds, Φ, exposure 14.5%/23.2%/29.5%, decapitation 0.445, ceiling 96%) | **CONFIRMED** | `calc-regime.mjs` reproduced every figure. Venezuela's `militaryTier` is 2 in the data, as assumed. |

---

## 3. What the design missed in existing code

1. **Elections and confidence votes.** Political action and recognition reach a fall only through the coup hazard. The engine already decides scheduled selections by an `incumbentStanding` draw (`foreign-politics.ts:187-196`) and parliamentary falls by `confidenceRate` (`:213-226`). Chile 1964 and 1970 and Nicaragua 1990 (all in the design's own case table) went through elections. Political action should lower `incumbentStanding` at the next selection and raise the confidence rate. It is cheaper, and it is how the cases actually happened.
2. **Insurgency operators.** `operators.ts` already models armed movements: `insurgency` kind, pressure from insurgency, factionalism and legitimacy (`:49-55`); caps of 2 per host and 12 worldwide (`:89-90`). Carried civil wars map to an insurgency operator (`carried-conflicts.ts:31-33`). The design's "armed contender" is a second variant of the same thing. Extend the operator with a sponsor list and strength instead.
3. **Succession on decisive defeat exists but cannot fire for the US** (E3b). Fixing decisiveness is the cheapest way to make an invasion change a government.
4. **War settlement already moves relationships.** Grudges on loser → victor and joiners (`war-outcomes.ts:125-132`); the probe showed Venezuela's trust toward the US at −0.094. R3's "no relationship edge moves" is true of the seat writer only.
5. **Exposure on success already exists** with its own seeded stream (`covert-exposure.ts:7-31`). The inquiry opens only for a landed player rung 5 via the flag (`committee-inquiry.ts:68-80`). A failed covert act is the `covert-failure` charge (`scandal-origins.ts:156-163`). The design keeps these; the weekly exposure hazard should reuse that stream discipline.
6. **Patron data.** `doctrine.alignmentPull` is authored per nation (`nations*.ts`). The patron term ignores it and uses relationship alignment × powerTier only.

---

## 4. Required changes and the recommended first slice

### Required before any regime equation is calibrated

1. **S0a casualties.**
   - Engaged = the committed package for an expeditionary principal (the design's fix).
   - The weekly rate also reads the opponent's engaged force or the strength ratio.
   - Keep killed and wounded as separate bands, and make `casualtyCost` read killed.
   - Anchors: Just Cause 23, Urgent Fury 19, Desert Storm 148 hostile deaths (CRS RL32492).
2. **S0a′ decisiveness.** A defender collapse against a much larger committed force must be decisive, so a won invasion seats a successor through the existing `successionPacket`.
3. **S0 reach from basing**, as R6 proposes.
4. **The contest ceiling.** State how the sponsored term bypasses `COUP_STABILITY_CEILING`, or have coup support lower stability. Otherwise D1 stands.
5. **Reference point.** p_add is measured against the no-operation counterfactual at today's state (D4).
6. **Windows.** Restate C1, C5 and C7 with explicit windows and run them at 104 and 312 weeks; the current dials fail them (D2, D3).
7. **Sources.** Correct the citations: O'Rourke gives no half-life (D6); the FIRC table is Nomikos's and categorizes interveners, not targets (D9). Drop or open the unverified Venezuela details (D10).
8. **Model choices the sources argue against.** Revisit two of them: democracies as the hardest covert targets (D6), and insurgency rising as troops leave with no countervailing term (D11).
9. **Content hooks.** Fit them to the §7.7 deed grammar (D13).

### Recommended first slice (one recommendation)

S0 above, then three acts on paths that already exist:
- **Coup support:** a standing covert operation that adds a decaying sponsored term to the existing coup hazard, past the ceiling. The successor is the existing `armedRival`, with a sponsor alignment delta that decays.
- **Political action:** lowers `incumbentStanding` at the target's next selection and raises `confidenceRate`.
- **Decapitation:** a strike-gated act that seats the charter successor through `successionPacket`.

Every act carries a weekly exposure hazard into the existing scandal and inquiry paths, and NPCs get the per-pair cooldown and per-term cap.

This ships "the President can overthrow a government, through the right channel, with a successor the player can see". It costs four small additions and no new state machine. Measure it at 12 seeds (fall rates by target over 104 weeks, NPC tempo, approval), then decide whether hold, contenders, recognition and occupation earn their place. **Strongest failure mode of the slice:** the coup term alone recreates the "Canada and Haiti alike" menu. The control is to gate it on the existing armed-rival ambition and regime proneness, which already differ by target.

---

## 5. Commands run (from the repository root)

```bash
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-menu.mjs regime-0
node docs/audits/2026-10-12-coercion-geography/probes/probe-coup-pool.mjs regime-0
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-2 VEN military 5 104 0
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-1 HTI covert 5 104 13
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-0 VEN covert 5 52 0
node docs/audits/2026-10-12-coercion-geography/probes/probe-npc-regime.mjs regime-0 104
node docs/audits/2026-10-12-coercion-geography/probes/calc-regime.mjs
```

Scratch probes, outside the repository and not committed:
- **War ratio:** the same `regime-2` invasion, logging `strengthRatio`, `posturePressureFactor`, `engagedPersonnel` and the casualty band each week.
- **Dial sensitivity:** `calc-regime.mjs`'s equations with C1 at 104 weeks, recognition at 312 weeks, ±25% on each dial, the drift-only p_add, and each target's stability against 0.45.
- **Projection multipliers:** `forceProjectionCost(USA, t)` across 20 targets.
- **Founding wars:** `weeklyCasualties` for the wars live at founding.

Sources opened for this check: H-Diplo/ISSF 13-3; Preble, War on the Rocks 2019; Nomikos / Downes and Monten correspondence (Yale PDF); CRS IF10230 (2020-01-30); WDET/NPR 2026-01-03; AP via PBS 2026-08-29 (updated 08-30); CRS RL32492 (2020-07-29). Not reopened: army.mil (Panama's 27,000 troops and 324 wounded), the Church Committee report, the NSArchive EBBs, SIGAR, the Iraq Inquiry, CRS RL33110 and RL33142, EIA, Air & Space Forces.
