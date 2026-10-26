# Adversarial verification of AUDIT.md (coercion at sea), 2026-10-12

Read-only against committed `dist/` (engine `instruments-military.js` last committed 2026-10-10, no engine/world source modified). One probe process at a time; no build, workspace tests, verify sweep or Playwright. The verifier's own probes are in the session scratchpad (`$V = <scratch path>`): `draft.mjs` (menu priced on the player's sized package), `basis.mjs` (cost basis per rung), `tre.mjs` (budget-authority ceiling), `ripples.mjs` (ripples, contest, risks), `preset.mjs` (founding conflicts and Hormuz shock), `npc.mjs` (NPC blockades over a term), `twice.mjs` (two blockades of Iran). Web pages fetched this session are in `$V/web/`.

## Bottom line

The single-blockade measurements reproduce exactly. The audit's core diagnosis holds: the rung-3 write is a permanent cut to the target's imports, and a first blockade reaches no market, no war and no War Powers clock. Four things are overstated or missed.

1. **The menu numbers aren't the player's.** `probe-menu` and the projection in `probe-blockade` send a bare request, so they price the preferred package (8 hulls, 200 airframes, 8 brigades). The app sizes the package against the target first (`player-core/src/act/preview.ts` `instrumentDraft` → `composeForcePackages` → `specAgainst`). On that path, a blockade of Iran projects $11.44M up front and $7.78M a week, the same package the order commits. The "$18.31M projected vs $7.78M issued" gap is an artifact of the harness.
2. **The escalation chain already exists. It just needs a second act.** A second blockade of Iran inside 20 weeks opens a US–Iran war, and the existing Hormuz route shock fires. Over the next nine weeks Brent went $74.5 → $88.9, the pump $3.22 → $3.53 and approval −0.020 against control (`twice.mjs coercion-1 3 5 16`). F3 and F12 are true of one act, not of the system.
3. **Money is the wrong scarcity.** `player.metrics.treasury` is budget authority, and the apportionment phase refills it every week up to a ceiling ($27,499M released each week, ceiling $357,485M at founding, `fiscal.ts:352-385`, `tre.mjs`). A $7.78M operation and a $100M operation both leave the treasury pinned. Repricing (F7, §5.4) changes almost nothing the player feels. The binding costs are hulls, readiness and the munitions stock (`munitions.ts`: `naval-interceptors` for rung 3, `DRAW_PER_WAR_WEEK` 0.02, a 156-week restock lead).
4. **NPCs already blockade at a high tempo, and the imports cut compounds.** Over one passive term, China blockaded Russia 11 times and Russia's imports ended at 0.070 of founding (`npc.mjs coercion-0`). Israel blockaded Lebanon 4 times and Lebanon ended at 0.352 (`npc.mjs coercion-1`). That is direct evidence for the redesign's named failure mode, and it makes F2 worse than stated.

The redesign is **needs validation**, not accepted with controls. A smaller change gets most of the benefit; it is described at the end.

## Findings

| # | Verdict | Evidence |
|---|---|---|
| F1 one menu | **CONFIRMED, plus more** | `instruments-military.ts:102-234`; `npc-agent.ts:338-346` `everyRequest` loops every rung. Missed: China can blockade the **United States** ($5.26M, p 0.23; `probe-menu`). Blockade odds come from a rung-agnostic contest whose layer weights put ground (0.26) above sea (0.13) for a naval act (`contest.ts:169-185`, projection `contest.layers`, `ripples.mjs`). |
| F2 imports one-shot | **CONFIRMED, understated** | `instruments-military.ts:150`; coercion-1 imports 30,000 vs 40,000 for t3–t9. The cut also compounds under repeat blockades (RUS 0.070, LBN 0.352 of founding after one term). There is a second perverse reader the audit missed: `instruments-economic.ts:348` `inDifficulty` reads reserves/imports, so a blockade makes the target look *less* in need of stabilization aid. |
| F3 no propagation | **PARTLY CONFIRMED** | Holds for a single act: crude, LNG, inflation and target growth are identical to control in all three seeds (re-run). It fails for a repeated act: the second blockade opens a war through `forceOnTheBoard` (`instrument-records.ts:74-79`), and `routeShock` then gives route loss 0.042–0.059 and risk 0.025–0.036, Brent to $88.9 by t17 (`twice.mjs`). |
| F4 Hormuz only | **CONFIRMED** | `commodity-registry.ts:82-90`. Note: in the `world-2026` preset the held ISR–IRN front already puts a live Hormuz shock in place at the oath (route 0.015/0.009, `preset.mjs`), so §2.1's "no chokepoint state at the oath in either" holds only for the seeded board. |
| F5 no strait act | **CONFIRMED** | YEM→SAU refused at naval 0.1 (`probe-menu`). The EIA figures it cites are confirmed (sources below). |
| F6 unweighted exposure | **CONFIRMED** | `geography.ts:76-83`; IRN 0.2, CHN 0.79 reproduced. The cause: `applyGeography` keeps only chokepoint ids and drops the weights (`world/src/dataset/geography.ts:520-524`). |
| F7 underpriced | **PARTLY CONFIRMED** | $1.5569M per hull-week reproduced. But (a) the money isn't felt (point 3 above); (b) the $11.3B anchor is a whole air campaign, not a blockade; (c) Del Toro's "almost $1B" includes intercepts of Iran's April 2024 attack on Israel in the eastern Mediterranean (Marine Insight text), so $38M a week is not a Red Sea-only rate. |
| F8 inverted costs | **PARTLY REFUTED** | The audit compares up-front costs only. Invasion carries a weekly sustainment bill: Canada on the player's package is $128M up front plus **$853M a week**, against a one-off $377M strike (`draft.mjs`; preferred package: $256M + $1,706M/wk). Blockade vs exercise: $11.44M + $7.78M/wk passes the $27.18M exercise in week 3. What remains is a headline-figure presentation defect, not an economic inversion. |
| F9 binary draw | **CONFIRMED, plus more** | `resolution.ts` `resolveAction` single draw. Missed: the projection advertises a 22% "escalation" risk ("Iran hits back harder instead of backing down"), but `riskContribution` (`resolution.ts:659-688`) gives it the same tension +0.1·sev, grudge and standing as "repulsed". No retaliation exists behind the label. A failed blockade spends no readiness and opens no commitment. |
| F10 legal status | **CONFIRMED** | `war-powers-report.ts:205-209` (rung 3 → `equipped-for-combat`), `:370` (the 60 days run only on hostilities), `congress.ts:250`. The UN intro note confirms that Art. 3(c) covers port blockade; the verbatim article text was not opened. |
| F11 no retaliation | **PARTLY CONFIRMED** | The direct answer is missing, and the "escalation" risk is a label only (F9). Missed: third-party ripples exist and already price alliance costs (USA→CAN: 30 NATO "bloc-partner" ripples at 0.072 each, `ripples.mjs`), and grudges feed the NPC agent. Gap: the US–Japan bilateral alliance draws no "ally" ripple when the US blockades Japan. |
| F12 public never feels it | **PARTLY REFUTED** | −0.0013 at t9 reproduced for one act. Through the existing war path the gap is −0.020 by t17 (`twice.mjs`). Note that "approval audit F7" is that audit's summary item 7, and its own VERIFY found the war rally (`opinion-war.ts:13-16`) the original audit missed. |
| F13 sizing, reach | **CONFIRMED** | `force-packages.ts:91-115` (naval only); `PROJECTION_CAPS` `{3:2, 4:1.5, 5:1.3}` (`instrument-gates.ts:156`). |
| F14 thin data | **PARTLY CONFIRMED** | There are 61 authored rows, 12 of them empty. But a prior already derives weights for every unauthored coastal nation (`REGION_CHOKEPOINTS` and `COUNTRY_CHOKEPOINTS`, `geography.ts:449-487`). §5.2's "derive weights for the 135 nations" build step already exists; the defect is that the weights are dropped (F6). |
| F15 keep list | **CONFIRMED, incomplete** | It also omits what already prices a war: `warOutlayShare` (`fiscal-impulse.ts:119-133`), the war-tick reserve drain and attrition (`war-tick.ts:150-176`), `worldOpinionEffects` on aggressors, `warOpinionTerms` (rally, unease, casualties), the munitions stock, and ripples. |
| F16 opening world | **CONFIRMED** | `carried-conflicts.tsv:9` (crude $103.08 on 2026-09-23, "an end to the blockade", a phased reopening of Hormuz). Seeded coercion-0 has no conflicts; coercion-1 and coercion-2 carry ARM–AZE. |

**Probe hygiene.** `probe-blockade`'s `rel` field reads IRN→USA through its fallback, not USA→IRN. Its output shows threat 0.838 unchanged, so the audit's "USA→IRN militaryThreat 0.705" is not supported by the probe it cites. Every other number in §2 reproduces: 0.41 odds, $7.78M commitment, readiness 0.646 vs 0.688, treasury −114/−61, kernel table, worked-example arithmetic.

## Sources (opened by the verifier)

| Claim | Verdict |
|---|---|
| **EIA Q2 2026 Hormuz 4.9 vs 21.6 Mb/d** (the audit's unopened figure) | **CONFIRMED.** STEO Global Energy Security Data supplement, released 2026-08-12 (https://www.eia.gov/outlooks/steo/report/energysecurity/article.php), Tables 2 and 4. Same tables: Bab el-Mandeb **5.4 → 8.1**, Malacca 24.9 → 16.6, Hormuz LNG 10.5 → 0.8 Bcf/d, world total oil supply 103.9 → 99.7 Mb/d. |
| STEO 2026-10-06: Sept $114, $131 on Sept 15, shut-ins 10.9 / 5.8 / 4.8, 4.5 in Q4, inventories −1.9 Mb/d in Q3, Brent $69 / $96 / $84 | **CONFIRMED** (https://www.eia.gov/outlooks/steo/ and `report/global_oil.php`). The same page also says the East-West line was carrying **more than 5.0 Mb/d** before the attacks, and EIA assumes "convoys through the Strait of Hormuz". Brent at $81 for 2024 was not found in what I opened. |
| "Brent averaged $85 in June, down $32 from April" | **CONFIRMED but misattributed.** It is in the **July** 2026 STEO (`archives/jul26.pdf`), which gives the May shut-in peak as 11.2, not 10.9, and reports inventory draws of about **5 Mb/d in 2Q26**. |
| EIA TIE 2025-06-16 (Hormuz) and 2024-10-11 (Red Sea) | **CONFIRMED** (`todayinenergy/detail.php?id=65504`, `id=63446`). |
| Marine Insight 2024-04-17 (Del Toro) | **CONFIRMED** with the scope caveat in F7. |
| UN AVL, GA Res. 3314 | Paragraph (c) covering port blockade confirmed (intro note, `legal.un.org/avl/pdf/ha/da/da_e.pdf`). |
| The Fiscal Times 2026-03-11, Reuters via MarineLink 2026-06-10, Just Security 2026-03-15 | **Not opened** (search blocked; Just Security returned 403). Unverified. |

**What the sources do to the calibration.** The kernel's `loss` is world supply lost before inventories respond. The audit's 0.167 row is the *gross* Hormuz flow drop. Of the 16.7 Mb/d that stopped passing the strait, part was rerouted: Bab el-Mandeb rose 2.7 Mb/d as Yanbu exports grew. The supply actually lost was about 11 Mb/d of peak shut-ins, with about 5 Mb/d drawn from inventories. At loss 0.11 the kernel gives $96 (w4) and $100 (w8) against an April monthly average of about $117. So "the kernel lands near the 2026 path" holds only with an input of the wrong kind. The kernel undershoots by roughly 15%, and its calibration has to be redone on net loss.

## The redesign: **needs validation**

**What holds.** The worked-example arithmetic reproduces: Brent $74.7 → $110.5 at w8, $116 at w26; spare-stranded $116.7 and $123.5; pump $4.06 (+26.2%); $41.0 / $61.5 / about $100M a week. Making a belligerent blockade hostilities, deleting the imports write, and contested state with no owner are right for the game. The audit's own Red Sea episode supports the detour-vs-loss distinction, since Brent barely moved in 2024.

**What breaks.**
1. **D can't reach its worked value.** With M = 1, N = 0.35 and X ≤ 1, D_Iran is at most 0.805, not 0.85.
2. **The Houthi check is mis-stated.** With D = 0.6 and guard = 0.6, flow is 1 − 0.6·0.88 = **0.47**, not 0.53. The 0.53 is the subtracted term. 0.47 fits the 0.46 target better.
3. **Guardians vanish.** `G = naval·prox·basing` with `prox = exp(−dist/1500 km)` from home gives the US about 0.0007 at Hormuz, so escort is near zero. The "US distant blockade at Malacca" on the same path has the same problem. Proximity must be measured from deployed position or bases.
4. **Escort is weak by construction.** With ε = 0.2, a full escort lifts Iran-case flow from about 0.2 to about 0.3, which leaves the player's stated answer (§5.7) mostly cosmetic. EIA's own assumption is that convoys restore flow. Fit ε to 2026 convoy data, not only to the 2024 Red Sea.
5. **The contest hazard guarantees the failure mode.** `P = σ(−3 + …)` is weekly. At zero inputs it is 4.7% a week. A plausible Iran with no blockade comes out near 3% a week, which is about 99.9% over 208 weeks. Specify a per-term base rate, then per-week, before any cap.
6. **The bypass is static and uncoupled.** It is a fraction of 2.6 Mb/d "available". In 2026 more than 5 Mb/d ran through East-West, and that bypass exits through the Red Sea. Attacks on it sent Brent to $131. Model the bypass as absolute capacity that depends on Bab el-Mandeb flow and pipeline state.
7. **Stage A doesn't follow §5.5.** `s·cutX·(1−leak)` with cutX 0.7 and leak 0.3 gives 0.0196, not 0.028. Define cutX net of leak or fix the example.
8. **Mines need clamps.** `mines' = mines·(1−clear) − 0.02 + laid` with `clear = Σ…` unbounded can go negative. Clamp both.
9. **The readiness drain locks out the counter-move.** −0.004 per hull-week on a 14-hull package is −0.056 a week against 0.02 recovery (`capacity.ts`). That puts the US below the strike gate (0.45) in about seven weeks, which also locks out "hold open".
10. **The cost model double-bills a war.** Once the blockade opens a conflict, `warOutlayShare`, the war-tick reserve drain and attrition already charge it. And dollars are invisible behind the authority refill. Use the munitions stock (naval-interceptors), hulls and readiness as the costs, and bill each cause once.
11. **The approval coupling has moved.** VERIFY of the approval audit replaced the bloc model with a cheaper path: cheap fix 4 (drags become target terms, plus a mood budget, i.e. items 6–7) and fix 5 (level salience, item 8). The rally redesign (item 9) is not in that path. The coercion design still holds, because it adds no mood writer, but §5.13 has to drop V and blocs and route casualties through the existing `warOpinionTerms` (`RALLY_PEAK` 0.15, half-life 6 weeks). New risk: once a first blockade opens a war, every blockade buys a rally (about +0.007 the week the war opened in `twice.mjs`). Damp or cap the rally for wars the President starts.
12. **Scalability.** Twenty X rows and port counts are thin for 196 governments. Use the existing region prior for dependence weights, and refuse rows where X is unauthored rather than defaulting it.

**The smaller change that gets most of the benefit.** Recommended first, measured before any maritime family:
1. Rung 3 becomes hostilities: `INTRODUCTION_BY_RUNG[3] = "hostilities"`, `MAJOR_FORCE_RUNGS` includes 3, and `forceOnTheBoard` opens a conflict on the first blockade. This reuses the existing war → `routeShock` → kernel → pump → CPI → approval chain shown in `twice.mjs`.
2. Delete the imports write. Add a blockade term in `coercionsInForce` (export cut on the target's supplier share, `stopsImposerSales` false) that lasts while the deployment commitment does.
3. Generalize `routeShock` to every chokepoint with a littoral custodian list and sourced commodity shares (EIA Table 2), with the bypass as capacity. Give a detour strait freight cost, not supply loss.
4. Carry the dependence weights through `applyGeography` and delete `chokepointExposure`.
5. Make the "escalation" risk real (the target answers with its own force act), and recalibrate the kernel on net loss.

This fixes F2, F3, F4, F6, F10 and most of F11 and F12. It leaves F1, F5 and F9 (strait acts, escort, mines, contest) for a second step, and that step should come only after a balance pass shows NPC tempo is under control (11 blockades a term by one pair today).

**Verdict and required changes before build:** (a) ship the smaller change and measure Brent, approval and NPC tempo over 12 seeds; (b) recalibrate the kernel against net supply loss (shut-ins, inventory draws), using July and October 2026 STEO; (c) fix the D range, guardian proximity, ε, mines clamp and Stage A definition; (d) restate the contest hazard per term and add a per-pair cooldown; (e) replace dollar repricing with munitions stock and readiness, and add no new war cost on top of `warOutlayShare` and the war tick; (f) rewrite §5.13 against the cheaper approval path and existing `warOpinionTerms`, and decide whether self-started wars rally; (g) open the three unverified sources or drop them.

## Commands run

```bash
cd .
node docs/audits/2026-10-12-coercion-geography/probes/probe-blockade.mjs coercion-0 IRN 8
node docs/audits/2026-10-12-coercion-geography/probes/probe-blockade.mjs coercion-1 IRN 8
node docs/audits/2026-10-12-coercion-geography/probes/probe-blockade.mjs coercion-2 IRN 8
node docs/audits/2026-10-12-coercion-geography/probes/probe-menu.mjs coercion-0
node docs/audits/2026-10-12-coercion-geography/probes/probe-kernel.mjs
node docs/audits/2026-10-12-coercion-geography/probes/probe-worked.mjs
node $V/draft.mjs; node $V/basis.mjs; node $V/tre.mjs; node $V/ripples.mjs; node $V/preset.mjs
node $V/npc.mjs coercion-0 208; node $V/npc.mjs coercion-1 208
node $V/twice.mjs coercion-1 3 5 16
curl EIA STEO (overview, report/global_oil.php, report/energysecurity/article.php, pdf/steo_text.pdf, archives/jul26.pdf),
     EIA TIE id=65504 and id=63446, legal.un.org/avl/ha/da/da.html and pdf/ha/da/da_e.pdf, Marine Insight 2024-04-17
```

Not run: multi-seed balance, the world-2026 preset blockade, a second-act strike (instead of a second blockade), and anything that would show whether the NPC blockade counts are lower bounds (relationship history may be trimmed).
