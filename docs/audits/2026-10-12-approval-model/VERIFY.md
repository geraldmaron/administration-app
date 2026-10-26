# Adversarial verification of AUDIT.md (approval model), 2026-10-12

Read-only. Engine `dist/` at `d56b9a97a`, no engine/world/content source modified in the tree. One probe process at a time; no build, workspace tests, verify sweep or Playwright. The verifier's own probes are in the session scratchpad (`$V = <scratch path>`): `vprobe.mjs` (actual election `voteShare`, vote drivers, decisionHistory, fiscalSpace, standing/readiness clamps, polarization-zero week), `strain.mjs`, `turnout-max.mjs`, `fiscal.mjs`. All cited web sources were fetched and read in this session (`$V/web/`).

## Bottom line

The audit's measurements reproduce: founding symmetry, stance table, compression grid, toll table, bloc table, the prudent-D 208-week run, the steady-state drag. Most findings hold. Five overreach: F1 (its evidence can't tell the two models apart), F4 (the player *is* shown the coalitions, and the passive example is misreported and wouldn't flip), F11 (an attribution artifact), F12 (it missed the war rally and uses the wrong yardstick), F20 (the loop is stable without its caps). The redesign is **needs validation, not accepted with controls**. Its slopes contradict a source the audit itself cites. Its symmetry test contradicts its sourcing control. Its ballot formula shrinks the turnout channel it is meant to make matter. Its rally fix and caucus gate are left unspecified. And a much cheaper set of fixes gets most of its headline behavior.

## A probe artifact first

`probe-approval.mjs` reads `e.share ?? e.result?.share`, but the harness record field is `voteShare` (`balance-harness.ts:142-149`). So no election result was ever printed, and the audit's "lost re-election with 47.3%" is the projection the observer saw at turn 198, not the election. The actual result: **0.455** (`node $V/vprobe.mjs balance-0 passive democrat 208`).

## Findings

| # | Verdict | Evidence |
|---|---|---|
| F1 party invisible | **PARTLY CONFIRMED** | Founding D/R identical: reproduced (`probe-static.mjs`). But that evidence doesn't separate the two models: any symmetric model gives identical foundings, and the redesign's own acceptance test 1 *requires* it. The current headline already has a party-blind partisan structure (`POLARIZATION_ANCHOR`, `opinion.ts:153-166`: "two blocs that will not move"). The audit's own §8.2 table shows it at p=0.6 within 0.04 of the bloc headline for raw 0.2–0.8. Party does enter: cohort baselines relative to the President's party (DECISIONS §5.8), `cohortAlignment` (`turnout.ts:78-87`), party-beliefs polarization (`party-beliefs.ts:186-199`), caucus counts, coattails, hill rapport. What is actually missing is a party-specific *issue* response in the headline, which §13.9 deliberately keeps out. The real defect is F2. |
| F2 polarization drains | **CONFIRMED** | Zero at week 155 (prudent D) and 160 (passive D, populist seed 1) (`vprobe.mjs`); unity ends 0.979–0.987. The code contradicts itself: `impact-model.ts:193` calls polarization "the only one a government cannot buy back", yet `opinionPhase` heals it 0.004 every week (`opinion.ts:725`). One divisive decision (+0.012, `impact-model.ts:208`) offsets only 3 weeks of decay. Even reckless play gained only about 0.03 over 77 weeks (0.596 → 0.320 against 0.308 of decay). Pew 2014 figures verified (64→92%, 70→94%; very unfavorable 17→43% R, 16→38% D). |
| F3 polarization ×3 | **CONFIRMED** (source) | `opinion-causes.ts` unity `1 − p`; `opinion.ts:339` compression; `opinion.ts:512` inertia. S2 is a tuning-legibility judgment, not a defect in output. |
| F4 scored by an unseen number | **PARTLY CONFIRMED** | The gap is real and can bite: populist midterm headline 0.465 vs coalition 0.357 → vote 0.422 (−22 House seats). "Not shown" is false: `apps/web/src/nation/electorate/Coalitions.tsx` renders the three coalitions with drivers, and the projection with drivers feeds `raceReading` / `defeatReading` (`player-core/.../congress-reading.ts:197, 307`). The passive example: actual share 0.455. Drivers at turn 198: coalitions −0.018, no budget −0.02, broken first-100-day pledges −0.03, incumbency +0.03. Reading the headline (0.519) instead gives +0.007, so the share is 0.480 and the President **still loses**. The record penalties decided that election, not the split. |
| F5 stance free lunch | **CONFIRMED** | Week-1 table reproduced. Over a term (`fiscal.mjs balance-2`, investment-only vs careful): the flat constants are worth +0.0585 coalition. The delayed offsets the static probe can't see (borrowing −0.017 × 0.3, public accounts −0.036 × 0.15) take back about 0.011. Net about +0.048 coalition, about +0.017 vote. That is a real free lunch, but only about a quarter of seed 2's 0.068 vote gap; the rest is the headline gap. |
| F6 cohorts inert | **CONFIRMED, stronger than stated** | It isn't a harness artifact. The populist run carries strain in 24 weeks (weights up to 0.52) and turnout stays at 0.001 (`strain.mjs`). Synthetic worst case, full-weight strain on every pro- or anti-administration cohort: turnoutShift 0.001–0.002 against the 0.03 cap (`turnout-max.mjs`). Inert by construction: alignment is bounded to ±0.29 by `1 − spread`, the intensity term is symmetric, and supports are centered. |
| F7 stale "sixteen" | **CONFIRMED**, undercounted | Also `demos.ts:115, 421`, `turnout.ts:95, 160`. |
| F8 condition ×5 | **PARTLY CONFIRMED** | All five channels apply to relief conditions only, meaning disasters and unrest (`opinion-causes.ts` `reliefConditions` excludes standing kinds). Economic standing conditions (housing-crunch, fiscal-crisis, energy-shortage) have three (stability, drag, treasury); recession and the two shocks have no drag at all (`condition-impacts.ts:136-152`). |
| F9 weekly drag = 1/r offset | **CONFIRMED** | Offset d/r = 0.0833 at d = 0.005 (the audit's 0.078 is d(1−r)/r, which depends on observation order; immaterial). Example: pandemic drag 0.03 at weight 0.5 gives a −0.25 standing offset on services. |
| F10 no mood budget | **CONFIRMED**, with nuance | Only `MAX_TURN_POLARIZE` exists. The BL-142 plan does route contested acts into the six judgments through existing channels (PLAN line 162), but it also plans a double-billing test (line 200) and "under a point" per culture act (line 256). The risk is real but partly anticipated. |
| F11 approval is the world's | **PARTLY REFUTED** | `approval-attribution.ts:101` credits only policyPhase, budgetPhase and pledgePhase to the player. A stance's effect on growth through `macroDriftPhase`, and the conditions a program prevents, are booked to "world". Movement is also summed as an absolute, so noise counts. The 82/13.5 split can't show that decisions don't matter. The impact-model "mostly costs" point stands. |
| F12 rallies tiny | **PARTLY CONFIRMED** | Toll table reproduced exactly. The audit missed `opinion-war.ts:13-16` (`RALLY_PEAK` 0.15, 6-week half-life on the security target), worth about 1.3 headline points at p = 0 and 0.7 at p = 0.6 (calculation). So "the model has neither" is false: there is a fade, and polarization does damp it. The +35 yardstick comes from 2001. The audit's own Gallup source (245996) says that under record polarization Trump "had no presidential honeymoon and has yet to benefit from a 'rally event'". "Order of magnitude too small" doesn't hold for the P = 1 founding the audit recommends. |
| F13 standing saturates | **CONFIRMED** | No reversion found. Clamped (≥0.999 or ≤0.001) in 126 of 208 weeks for prudent D and 136 for populist (stuck at 0). |
| F14 readiness island | **CONFIRMED** | Populist exactly 0.694 every week; prudent 0.718–0.720. Harness proxies may never commit forces (untested). |
| F15 fiscalSpace units | **CONFIRMED** | `fragility.ts:222`. fiscalSpace = 1.000 in every week of three runs (treasury minimum 181,512). |
| F16 salience on levels | **PARTLY CONFIRMED** | `disorder` (protest > 0.4 against a 0.35 founding) fired 130 of 208 weeks: a level trigger. `conditionActive` fires while a disaster is live, which is news while it lasts; only long dwells make it stale. |
| F17 stability ≈ economy | **CONFIRMED** | Coefficient argument (0.256 vs 0.28) as stated. Observed attribution agrees: security 0.186–0.19 vs prosperity 0.149–0.167 of moved approval (prudent, passive). |
| F18 removal reads approval ×5 | **PARTLY CONFIRMED** | Five paths confirmed (`removal.ts:294-306`, `metrics.ts:69` includes the revision, `removal-votes.ts:129`, `fragility.ts:206`), but they are a count, not a weight. decisionHistory adds at most 0.006–0.007 pressure (`vprobe.mjs`), against beats at 0.45. The Congress path is 0.55 × 0.55 × 0.129 ≈ 0.039 per unit of approval, against unpopularity's 0.331. The noise ratchet exists but is immaterial. |
| F19 Congress ignores party | **PARTLY CONFIRMED** | `dispositionTarget` (`congress.ts:439-453`) has no seat term. But every binding vote (bills, impeachment, conviction) is counted by caucus seats (`congress-votes.ts:270-300`, `removal-votes.ts`). Party control already decides outcomes; it is only absent from the pressure scalar. |
| F20 press loop | **PARTLY REFUTED** | The loop exists, but its gain is about 0.4 × (0.5 × lens integrity+competence ≈ 0.13 + coverageDriver ≈ 0.155) ≈ 0.11. That is stable without the caps (amplification about 1.13). "Held in check only by the caps" is wrong. |
| F21 too generous | **CONFIRMED** | Prudent mean 0.571, max 0.618. Gallup averages verified (Biden 42.2, Trump 41.1, Obama 47.9, GW Bush 49.4, Carter 45.5, Truman 45.4). The game's own `benchmarks.ts:73-79` sets the polarized-era ceiling at 0.55. |
| F22 removal slow | **UNCERTAIN** (inference, not measured) | Populist ended at approval 0.356, which already meets the approval half of the caucus gate. The binding half was pressure (max 0.453 against 0.60), not the partisan base. |
| F23 mixed decay | **CONFIRMED** (hygiene) | |
| F24 vacancies count | **PARTLY CONFIRMED** | −0.15 per seat (`opinion-causes.ts:513-515`). Bounded by seat count and the target clamp, so not literally unbounded; the scale defect stands. |
| F25 opening ≠ target | **CONFIRMED** | `opinion.ts:244` vs `opinion-causes.ts:254-287`; prosperity 0.55 → 0.66 by week 28 (prudent, reckless). |

**Missed by the audit (observed, not investigated):** prudent D won the midterm popular vote at 0.544 and still lost 11 House seats (`vprobe.mjs`); the midterm seat model is worth a look. The fixed +0.03 honeymoon doesn't scale with polarization, though Gallup records no Trump honeymoon under record polarization.

## The redesign: **needs validation** (not accepted with controls)

**What holds.** Every table in §8.2 reproduces (`calc-blocs.mjs`). With erosion applied, the reckless run reads 0.342 at t54 and **0.256 at t78** (today 0.303), so scandal-driven failure is not made safer. The issue-term arithmetic is right.

**What breaks.**

1. **κ contradicts the cited source.** Gallup (245996) shows Republican approval of Bush falling from 91 (year 4) to 73 (year 7), and to 67 in year 8 with overall approval in "the high 20s or low 30s". With B_p = B(1 − 0.6P), a −1.6 logit drop in own-party approval needs V = −1.41, outside V's stated [−1, 1]. It also puts independents at about 1% and the headline at about 0.21. So the model can't reach Bush 2008 without scandal erosion. Real partisans do leave over plain failure, which the design rules out. κ and G must be fit to Gallup's party series across rising and falling presidencies, not set by hand.
2. **G is fit to a record, not a norm.** A gap of 0.834 at V = 0 sits above every Gallup *annual* average in the table (maximum 79, Trump year 2). §8.1's "Gallup 65–92" cites the 92 the audit itself said it does not rely on.
3. **The symmetry test fights the sourcing control.** Control (1) requires sourced bloc shares. Acceptance test 1 requires D and R medians within 0.01. Real party ID is asymmetric (Gallup's own page sidebar: "More continue to identify as Democrats than as Republicans"). A 0.04 share difference moves the headline about 0.04 × 0.83 ≈ 0.033 by the President's party. Choose one: symmetric shares by design (then they aren't sourced) or party asymmetry as content (then drop test 1).
4. **The ballot formula shrinks turnout by L.** `ballot = 0.5 + L·(turnout-weighted approval − 0.5)` puts bloc turnout inside the 0.36 leverage, so a composition shift reaches the vote at a third of its size. Today's `turnoutShift` adds directly. Put the turnout effect outside L (headline-equivalent approval × L plus a direct turnout-composition term), or test 7 will fail for structural reasons, as F6 already does.
5. **Rallies are capped and underspecified.** The headline is bounded at 0.742 (V = 1), so test 3's "no week above 0.75" is vacuous. Raising h from 0.5 to 0.7 takes ΔV = 0.72 (36 raw points); 0.86 is out of reach. (2 − P) at P = 1 is ×1, which leaves today's +1.8 points. Q6's "a third to half of 2001" has no stated base magnitude behind it. Specify the rally as a bloc-logit term with its own magnitude, or drop F12's premise for a P = 1 founding.
6. **The caucus gate on a_own is unspecified and changes behavior now.** `BREAK_APPROVAL` 0.36 / 0.24 are calibrated to *overall* approval (`removal-votes.ts:100-108`). a_own ≥ 0.77 at any V without erosion, so the gate would close for every non-scandal presidency. Today, incompetent play can open it (populist reached 0.356). That decides owner Q1 by construction. Settle Q1 and re-source the thresholds first.
7. **Seats in the Congress pressure term would bill party control twice**, since every removal and bill vote already counts caucus seats. That breaks the audit's own "bill each cause once" rule.
8. **Deleting stability from security (item 6) is underspecified.** The security target loses its base (about 0.5 at founding), dropping the headline about 11 points unless a constant replaces it. Unrest and protest would then reach approval only through salience and competence's 0.036. Name the replacement terms.
9. **The I_b cap conflicts with the BL-142 plan.** ±0.6 logit on independents is up to about 6 headline points, against the plan's accepted "one ordinary culture act is worth under a point" (PLAN lines 256, 300) and DECISIONS §13.9. The cap must be total per bloc across issues, and the owner has to amend §13.9 explicitly.

**A simpler alternative gets most of the benefit.** Current `approvalOf` at a fixed p = 0.6 tracks the bloc headline within 0.04 over raw 0.2–0.8 (§8.2 table, reproduced). So the S1 problems close without a new layer:

1. Make polarization revert to the founding value instead of zero (F2).
2. Point the ballot at the headline minus honeymoon, keeping the named drivers (F4).
3. Delete the flat stance constants (F5).
4. Turn the weekly drags into target terms and add a mood budget (F8–F10).
5. Fix the units, standing reversion and level salience (F13, F15, F16).
6. Make cohort turnout effective by un-damping it, since cohorts already carry party-relative baselines (F6).

What the blocs add beyond that is a per-bloc reading for issue agreement and the caucus. That can come later as a grouping of the cohort layer (cohorts → own/ind/opp by baseline) once BL-142's issue scoring exists, rather than as a parallel electorate built before it.

**Verdict:** needs validation. Before any bloc build: (a) ship the six cheap fixes above and re-measure; (b) fit G and κ to Gallup's party series across at least one rising and one falling presidency; (c) resolve the symmetry-vs-sourced-shares conflict; (d) move turnout outside L; (e) answer Q1 and re-source the caucus thresholds; (f) specify the rally magnitude and the security base; (g) amend §13.9 with a total I_b cap.

## Commands run

```bash
cd .
node docs/audits/2026-10-12-approval-model/probes/probe-static.mjs
node docs/audits/2026-10-12-approval-model/probes/probe-approval.mjs balance-0 prudent democrat 208
node docs/audits/2026-10-12-approval-model/probes/probe-approval.mjs balance-0 reckless democrat 208
node docs/audits/2026-10-12-approval-model/probes/calc-blocs.mjs $V/..   # the audit's out-*.json snapshots
node $V/vprobe.mjs balance-0 passive democrat 208
node $V/vprobe.mjs balance-0 prudent democrat 208
node $V/vprobe.mjs balance-1 populist democrat 208
node $V/strain.mjs balance-1 populist democrat 104
node $V/turnout-max.mjs
node $V/fiscal.mjs balance-2 careful-without-fiscal
node $V/fiscal.mjs balance-2 investment-only
node -e '...toll table, drag steady state, war-rally peak, bloc fits (κ vs Bush, G gap, rally ΔV, reckless with erosion)...'
```

Not run: prudent R, and populist/reckless through the original probe (covered by `vprobe.mjs` on the same seeds); `probe-paths.mjs`; `probe-drift-mood.mjs`; any multi-seed balance.
