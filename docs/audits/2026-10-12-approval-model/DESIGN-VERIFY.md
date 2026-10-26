# Adversarial verification of DESIGN.md (five-bloc electorate), 2026-10-12

Read-only against source and the design. Every `design-*.mjs` probe re-run from the repo root, one at a time; no build, workspace test, verify sweep, Playwright or balance harness. The verifier's own scripts live in the session scratchpad, not the repo (`$D = <scratch path>`): `checks.mjs`, `checks2.mjs`, `lambda.mjs`, `g0.mjs`, `gap.mjs`, `rake.mjs`, `ballot.mjs`, `cb-0.04-*.mjs`. Each imports the design's own `design-blocs.mjs` / `design-sim.mjs` and changes only what is stated below. Web sources were fetched in this session and are listed at the end; nothing is cited that was not opened.

## Bottom line

**Overall: needs validation.** The structure holds up: five blocs reading one valence, a polarization stock that reverts to an anchor, a caucus that reads the President's own identifiers, and turnout as composition. The bloc formula reproduces Gallup's party splits from the headline alone (own 2.3, opposition 1.4, independents 4.4 points RMSE). Slices 0 to 2 can start under the controls below. The calibration claims beyond the bloc core are weaker than the document says, and four of its own acceptance tests fail on its own constants:

1. **The economy failure isn't contained in slice 6.** Today's terms don't just move the economy too little. In 1991–92 they move it the wrong way, and in 2021–22 they barely move it. A real refit will put 1973–74 stagflation into the Watergate replay and 1980 into the Carter rally, and both were tuned with no economy at all.
2. **Two replays prove less than claimed.** Lewinsky (5.5) does worse than a flat line at the series mean (3.8). Iran-Contra (2.7) does worse than a two-level step (2.0).
3. **The midterm fit is wrong in level.** With δ 0.115 the President's party gets 41.0% of the House vote at 45% approval and 48.6% at 63%. The Clerk of the House records 46.6% (Democrats, 2010) and 52.4% (Republicans, 2002), two-party.
4. **Four acceptance criteria fail or contradict each other.** Slice 1's gap band fails at P 0.85, slice 5's two criteria conflict, slice 7's headline caps don't survive a consensus act, and balance test 3 fails at reachable states.
5. **The turnout figure uses a different cap.** The 2.6-point turnout effect comes from a 0.06 cap in the probe. The design specifies 0.04.

## 1. Fit claims

| Claim | Verdict | Evidence |
|---|---|---|
| 17 Gallup party readings, 49 points, RMSE about 2.5 | **CONFIRMED as a fit; PARTLY CONFIRMED as evidence** | `design-fit.mjs` prints BEST rmse 2.481, CHOSEN 2.524. There are 20 free parameters (3 constants plus one free V per reading) against 49 points; 6 Obama readings carry 2 points each with 1 free V. Stronger tests I ran: (a) **headline-only**: solve V from the overall reading alone and predict the split (2020s constants, era P). RMSE own 2.3, opposition 1.4, independents 4.4 (`checks.mjs` §3). Trump Jan 2021 independents 22.8 vs 30, Jan 2020 47.5 vs 42. (b) **Era holdout**: fit on Bush+Obama only, era P from Trump yr1 alone, predict the other five 2017–21 readings from their headlines: RMSE 3.7 (`checks2.mjs` C). The core holds out of sample at about 3–4 points. |
| κ weakly identified | **CONFIRMED, and understated** | The κ profile reproduces (2.544/2.53/2.524/2.481). **λ is unidentified too**: λ = 0, 0.3, 0.65, 1.0 give RMSE 2.552/2.533/2.524/2.563 (`lambda.mjs`). The leaner/pure distinction, which is what five blocs add over three, isn't supported by the approval data. Only G0 is identified (2.0; RMSE 4.38 at 1.6, 3.42 at 2.4; `g0.mjs`). The design's grid stops κ at 0.8, and with λ free the optimum sits at that edge (κ 0.8, λ 0.9, 2.458). At the data's best κ (0.75–0.8 pooled, so 0.85–0.90 on the 2020s scale), the **identifier valence slope goes negative** at P 1.19 (−0.009 to −0.076) and P 1.25 (−0.06 to −0.13). Both are reachable by wedge play. Identifiers would then approve more as the President fails. κ = 0.6 avoids this, but nothing in the design bounds κ·P_max. |
| Bush year 8, Republicans 67, without a scandal | **CONFIRMED** | Pooled fit own 69.1/67, overall 26.9/29.9. Headline-only at P 0.82: own 70.5/67. Gallup 245996 confirms "Republican approval slipped to 67%" with overall "high 20s or low 30s". |
| Rally sizes and fades, 9/11 within 1.8 | **CONFIRMED (fit), PARTLY CONFIRMED (table)** | `design-rallies.mjs` reproduces every row (9/11 ρ 5.18, h 30, RMSE 1.843, +35.1). The table isn't all fitted. Standoff is h 10 (fit: 94), national emergency h 6 (fit: 104, ill-determined), and war launched 2.0–2.4 sits above the Iraq fit (1.86). Those are judgments presented in a "fit to Gallup" table. bin Laden: the doc's admitted misfit (opposition identifiers +6.4) compares a peak to a monthly mean. Averaged over May, the model gives headline +6.1, opposition identifiers +3.1, pure +15.1 (`checks.mjs` §1). Gallup 147920: national +6, Republicans +4, "most of these increases were within a couple of points of the national average of six". Pure independents +15 is untested; Gallup's page gives no figure for that group in text. The 9/11 baseline is 55 (Jun–Aug mean), but the last pre-attack reading was 51 (Sep 7–10, APP sheet). A 51 baseline would raise ρ and the 2020s lift. |
| Scandal replays: Watergate 4.3, Iran-Contra 2.7, Lewinsky 5.5 | **PARTLY CONFIRMED** | All three reproduce (`design-occasions.mjs`: 4.25, 2.741, 5.548). Naive baselines (`checks.mjs` §2): **Lewinsky, flat line at the series mean, 3.8: the model is worse.** A flat line at the start scores 6.1. **Iran-Contra, two-level step (63, then the post-break mean), 2.0: the model is worse.** Watergate beats the series mean (13.5) by a wide margin, but its six beats were placed "at the series' visible drops", so it is in-sample by construction. "One miss: April 1974" is wrong: May 1973 is also off by 8.6 (53.6/45). Lewinsky needs four hand inputs (two siege spans, a prosperity ramp, a backlash rally) and still misses the 1998 rise (Oct 57.8/66, Jan 1999 59.6/69). The model can't produce a scandal that raises approval without hand-placed impulses. |
| S sensitivity: S isn't the lever | **PARTLY REFUTED (circular)** | Reproduced: Watergate 5.238/4.25/5.595/8.551 and G.H.W. Bush 14.9/14.0/12.1/10.2 at S 10/12/16/20. The scandal weight and debt were chosen "to replay Watergate and Iran-Contra" at S = 12, so the scandal fits favor S = 12 by construction. A fair test refits the scandal constants at each S. Iraq improves with S (5.5 → 4.0 at 16). |
| Economy fails (Biden 8.6, G.H.W. Bush 14.0) | **CONFIRMED, and the diagnosis is incomplete** | Both reproduce (8.592, 13.957). The probe never runs the economy terms: it injects prosperity −0.18 and −0.20 by hand. Running the real series through today's terms (`opinion-causes.ts:250-285`: strain = 2u + 1.5·max(0,π) − 2·max(0,g) + price scar; formula confirmed) gives: **G.H.W. Bush**, Sep 1991 u 6.9, π 3.4, g 2.0 → strain 0.149; Jun 1992 u 7.8, π 3.0, g 4.4 → 0.113. **Today's terms say prosperity improved while Gallup fell 66 → 37.** **Biden**, Jun 2021 u 5.9, π 5.3, g 7.1 → Jan 2022 u 4.0, π 7.6, g 6.8: unemployment and inflation nearly cancel (about −0.004), and only the price scar adds a few hundredths. So it isn't "too weak by three to six times". The shape is wrong, and scaling the terms up cannot fix it. In the structure's favor: a joint fit with economy pain co-moving prosperity −0.5, competence −0.25 and services −0.125 reaches **RMSE 4.0** on Jan 1991–Jul 1992, with the Gulf rally refit to ρ 2.5, h 16 against the table's 2.36/20 (`checks2.mjs` A). Slice 6's ≤ 5 target is reachable inside the structure. |
| Caucus break (Clinton 1999 ~2 of 45 vs 0) | **CONFIRMED, weak** | Probe: 1.9 of 45. Senate roll calls opened: 106-1 vote 17, Democrats 0 of 45 guilty; 116-2 vote 33, Republicans 1 of 53; 117-1 vote 59, Republicans 7 of 50. The slope and midpoint are solved exactly through the two 2020/2021 anchors with the ceiling held, so there are zero degrees of freedom. Clinton is the only out-of-sample point, and P(0 of 45 \| p 0.043) ≈ 0.14, so it can't reject the model. |
| Polarization reverts; wedge to ~1.19 | **CONFIRMED** | Wedge 1.095/1.176/1.187/1.188 at weeks 26/104/208/416; quiet holds 1.0; reversion 1.134/1.095/1.047. Balance test 4's "wedge at most +0.25" is vacuous: the stock saturates at about +0.19. |
| Issue terms capped (0.1 per act, 1.7 per term agenda) | **PARTLY REFUTED** | Reproduced for the polarized patterns tested (+0.1, −0.6, +1.7, −0.7). Those patterns are the only ones tested. A **consensus act** (every bloc +0.15, the per-act cap) moves the headline 45 → 46.9; −0.15 gives 43.1. An agenda at the 0.30 cap in every bloc gives 48.7 / 41.2 (`checks.mjs` §4). "An ordinary act under a point" and slice 7's "agenda at cap ≤ 2 points" hold only when agreement splits by party. The caps don't enforce it. |
| Cohorts as bloc mixtures (axes within 0.3–4.2 before raking) | **CONFIRMED, but slice 5 can't pass** | Reproduced exactly. After raking each axis to the national blocs (IPF), cohort two-party baselines drift up to **5.5 points (suburban), 4.2 (race-other), 3.4 (age 35–64)** (`rake.mjs`). Slice 5 requires re-aggregation within 0.1 **and** baselines within 0.5. With a one-parameter tilt plus raking, both can't hold: CES baselines and Gallup 2025 shares aren't mutually consistent at neutral V. |
| Turnout strain moves the vote 2.6 points | **PARTLY REFUTED** | The probe uses `CAP = 0.06` (`design-cohort-blocs.mjs:49`), and the shifts it reports (0.056, 0.05) exceed the design's ±0.04. At the design's cap it is **2.2**, and with the recommended halved coefficients **1.3** (`cb-0.04-0.2.mjs`, `cb-0.04-0.1.mjs`). §2.6 says the cap is per act; §6 says per bloc in total. Pick one. |
| Ballot asymmetry 0.1–0.4 points | **REFUTED as specified** | The 0.1–0.4 comes from scoring the ballot on Pew 2023 registered-voter shares while the headline uses Gallup 2025 adult shares. §2.1 has one share set `s_b`. With the single set the equation specifies, the D–R ballot gap is **2.0 points at equal headline** (A 0.5: 51.0 vs 49.0) and **3.5 at equal record** (V −1: 48.2 vs 44.7) (`ballot.mjs`). |
| Midterms (δ 0.115, 3.74 seats per point) | **REFUTED in level** | Gallup 242093's 18-row table matches the probe's data exactly, and the OLS line reproduces. δ sits near the probe's grid edge (0.12); on a wider grid the optimum is 0.125 (`checks2.mjs` B). The fitted model gives the President's party 41.0% of the House vote at 45% approval and 48.6% at 63%. Clerk of the House: 2010, D 38,854,459 vs R 44,593,666 (two-party D **46.6%**, Obama 45); 2002, R 37,091,270 vs D 33,642,142 (two-party R **52.4%**, Bush 63). The model sits 4–6 points low in both years and makes up for it with a seat slope too flat. The doc flagged it "needs validation"; on those two years it fails. |

## 2. Sources checked

| Source | Design use | Verdict |
|---|---|---|
| Gallup 700499 (Jan 12, 2026) | 27/27 identifiers; 20 lean D, 15 lean R, 10 no lean; quarterly margins R+4 (Q4 2024) to D+8 (Q4 2025) | **CONFIRMED.** The same page says 2024 was R+1 (R leaners fell three, D leaners rose three) and that Democrats had larger edges in "1992 and 1993, 1996 through 1999, and 2006 through 2009". Applying 2025 shares to the 2004–2021 fit and the 1973–92 replays is anachronistic. A symmetric counterfactual (27/17.5/10/17.5/27) moves the fit little (2.54 vs 2.52), so the fit is robust to it. The game still isn't: a 12-point swing in four quarters shows party shares respond to the President, and the design fixes them for the campaign. |
| Pew 2023 RV (2024/04/09) | D+lean 49, R+lean 48; ID 33/32; lean 16/15 | **CONFIRMED.** Pew adds "Partisan leaners often share the same political views and behaviors as those who directly identify". The 0.58 leaner turnout habit is an assumption with no support on this page. |
| Pew 2020 validated vote | turnout 66; loyalty 92 (R+lean) / 94 (D+lean); voters 50/48, nonvoters 46/41 | **CONFIRMED.** Model vote by bloc at Trump 46: own identifiers 95.5 (Pew R identifiers 94), opposition identifiers 3.7, pure 41.4 (Pew independents/other 43 Trump). Good. |
| Gallup 245996 | annual party approval Bush 4–8, Obama, Trump 1–2 | **CONFIRMED** for every value used. Obama years 5 (82/11) and 7 (83/10) are in the same table and were left out of the fit, with no reason given. The page also says Trump "had no presidential honeymoon" under record polarization; the design adds +2.1 at P 1. |
| Gallup 284156, 328637, 354872, 655298 | Jan 2020 94/42/7, 49; Jan 2021 82/30/4, 34; Sep 2021 90/37/6, 43; Biden term 85/39/6 | **CONFIRMED.** |
| Gallup 147920 | bin Laden: 44 → 50, Republicans +4, conservative Republicans +2 | **CONFIRMED** (see the rally row for the "within a couple of points of six" line). |
| Gallup 169907 | rally sizes list | **NOT VERIFIED.** The page returned "Page Not Found" by ID. |
| Gallup 242093 | midterm table | **CONFIRMED**, all 18 rows. |
| APP sheet (Peters), exported tabs | replay series | **CONFIRMED** for every spot-checked reading: 9/11 51/86/90, 66 Sep 2002; Iraq 58/71/59; Katrina 45/46/40; Nixon 67/31/26/24; Carter 32/38/51/58/39; Reagan 63/47/43; G.H.W. Bush 64/82/89/66/52/46/29; Clinton 60/69/73/69; Trump 44/49/43, 46 Oct 2020. The Biden tab wasn't among the exported gids; 2021–22 points weren't checked. |
| Senate roll calls | 1999/2020/2021 counts | **CONFIRMED** (XML tallies above). |
| Roper (Nixon), Mueller, Pew 2014 | | Not re-opened by this verifier; VERIFY.md had opened Pew 2014. |
| BLS/BEA via FRED (UNRATE, CPIAUCSL, A191RL1Q225SBEA) | not used by the design | Opened here to test the economy claim (figures in §1). Also: 1973 Jan → 1974 Aug CPI y/y **3.6% → 10.9%**, unemployment 4.9 → 5.5; Nov 1979 → Mar 1980 CPI 12.6 → 14.6%. |

## 3. Structure

1. **Five blocs vs three.** Leaners can't be identified from approval data (λ flat over 0 to 1). Five blocs are still worth keeping for turnout (leaners and pure vote at different rates) and for the caucus (identifiers only). Their behavior, though, is assumption, not fit. **Control:** label λ and the leaner habit as judgment, and add a sensitivity row (λ 0.3 / 0.65 / 1.0) to the slice-1 and slice-9 outputs.
2. **One polarization figure drives every bloc.** That's sound, but the κ ridge can make the identifier slope negative (§1). **Required:** constrain κ·(P* + Dmax) ≤ 0.9, or floor the slope at a positive value.
3. **Share-weighted headline vs turnout-weighted ballot.** The concept is right. The asymmetry claim depends on a second share set the state doesn't contain (§1). **Required:** either add registered-voter shares to the founding (sourced, Pew) or restate the asymmetry as about 2 points of ballot at equal headline.
4. **Caucus break.** It reads the right quantity. It is exactly identified, its one test is weak, and it's acceptable as a judgment if labeled so. Opposition defections (10 Republicans not guilty in 1999) aren't modeled; that's fine for removal.
5. **Does the economy failure invalidate the rest?** It doesn't invalidate the structure: the joint 1991–92 fit reaches 4.0 inside it. It does invalidate the claim that refitting is confined to slice 6. Watergate ran through 3.6 → 10.9% inflation and Carter's hostage fade through 12.6 → 14.6%. Under any economy pricing strong enough to pass slice 6, those replays (tuned with zero economy) will overshoot, and the Gulf rally half-life moves (20 → 16 jointly). The doc only warns about S. **Required:** every replay in slices 3 and 6 runs with the real monthly economy as input, and the scandal constants, rally table and economy terms are fit jointly before any of them is called "fit".
6. **Shares fixed for the campaign.** Gallup 700499 shows a 12-point leaned swing in four quarters after a change of President. Over an 8-year campaign, fixed shares remove a real and steep channel: a failing President bleeds leaners. **Recommendation:** a slow, bounded leaner drift driven by own-side approval, fit to Gallup's quarterly series.

### Owner questions

- **Q1 (removability):** the arithmetic holds (headline 30, P 1 → own identifiers 77.9, break 0.242). The doc's recommendation stands as stated; the choice is the owner's.
- **Q2 (rally size):** +30.7 at P 1 reproduces. It rests on a 55 baseline, and 51 would raise it.
- **Q3 (party balance):** **disagree with the recommendation as written.** Seeding uniformly across R+4 to D+8 has mean D+2, so Democrats are favored on average, and that is 2–3.5 ballot points per §1. Seed a symmetric range, or let shares drift endogenously (item 6).
- **Q5 (1990s era):** the era P 0.63 is fit to one reading (Clinton yr4: 3 points, 2 free parameters). An era option also needs era shares (Pew: 1994 leaners 15 R / 12 D of voters). It isn't one parameter.
- **Q4, Q6, Q7:** no objection.

### Build slices and acceptance

| Test | Problem |
|---|---|
| Slice 1: identifier gap 75–87 for P 0.85–1.19 | **Fails on the design's own constants:** 74.4 at P 0.85 (`design-electorate.mjs` §5). |
| Slice 1: party replay RMSE ≤ 3 | With a free V per reading almost anything passes. Replace it with the headline-only test (own ≤ 3, opp ≤ 2, ind ≤ 5). |
| Slice 3: Lewinsky, Iran-Contra | Add naive-baseline comparisons. Lewinsky currently loses to a constant. |
| Slice 4: midterm ±10 seats at 40/60 | Two parameters fit two targets exactly. Add the Clerk two-party House vote by midterm year within ±3 points. It currently fails by 4–6 in 2002 and 2010. |
| Slice 5: re-aggregation 0.1 **and** baseline 0.5 | **Mutually unsatisfiable** with tilt plus raking (drift up to 5.5). Needs a two-parameter tilt, or a stated baseline tolerance. |
| Slice 7: agenda ≤ 2 points | Fails for consensus agreement (±3.7 at the cap). Either cap the headline effect of `I_b` directly or require opposite-sign agreement. |
| Balance 3: partisan gap 0.60–0.92 every week | Fails at reachable states: P 0.85 grave scandal 41.1, P 0.85 at V −3.5 57.6 (`gap.mjs`). War, standoff and operation rallies stay inside the band. |
| Balance 4: wedge ≤ +0.25 | Vacuous: saturates at +0.19. Test +0.15 to +0.20. |

### Deletions that something still reads (grep of non-test, non-dist source)

§5.1 covers the approval readers. §7's deletion list misses these consumers:

- `position-assessment.ts:57` reads `POLARIZATION_INERTIA`.
- `player-core/src/record/polarization-reading.ts` reads `POLARIZATION_ANCHOR`, `POLARIZATION_COMPRESSION` and `POLARIZATION_INERTIA`.
- `turn-loop.ts:91`, `party-beliefs.ts` and `content/src/impact-model.ts:208` (`DIVISIVE_POLARIZATION = MAX_TURN_POLARIZE`) read the polarization ceiling the stock replaces.
- `player-core/src/world/war-powers-reading.ts:146` and `apps/web/src/nation/electorate/approval-build.ts:98` call `approvalOf`.
- `player-core/src/desk/approval-breakdown.ts`, `player-core/src/desk/opinion-causes.ts` and `scripts/fixtures/inflation-shock.mjs` read `approvalDrag`.
- Coalition consumers beyond `Coalitions.tsx`: `player-core` `polling/crosstabs.ts`, `polling/opinion-trends.ts`, `economy/coalitions.ts`, `electorate/electorate.ts`, `glossary/record.ts`.

Slice 8 has to name these, or the build breaks.

## 4. Required changes before "accepted with controls"

1. Rewrite §4.4: today's terms move prosperity the wrong way in 1991–92 and about zero in 2021–22. Slice 6 must change the shape (direction since term start, the price-level scar, co-moving competence) and must not simply scale.
2. Jointly refit the scandal constants, the rally table and the economy terms on replays fed with real BLS/BEA series. Re-run Watergate, Carter and the Gulf War.
3. Fix the acceptance tests in the table above: slice 1 band, slice 5 conflict, slice 7 consensus case, balance 3 and 4, a headline-only party test, naive baselines, and House vote share.
4. Bound κ·P_max, or floor the identifier slope.
5. Specify one or two share sets (adults and registered voters) and restate the D–R asymmetry. Change the Q3 recommendation to a symmetric seed or endogenous leaner drift.
6. Make the turnout cap consistent (0.04 per act, or in total), re-run with it, and quote 2.2 / 1.3, not 2.6.
7. Refit δ and seats per point against the Clerk House vote, not only Gallup's seat line.
8. Correct the record: label the rally-table half-lives that are judgments, the "one miss" in Watergate, and λ as unidentified.
9. Add the unlisted readers to §5 and §7.

## Commands run

```bash
cd .
P=docs/audits/2026-10-12-approval-model/probes
node $P/design-fit.mjs            # 7.0 s
node $P/design-rallies.mjs        # 0.7 s
node $P/design-occasions.mjs      # <0.1 s
for s in 10 16 20; do DESIGN_S=$s node $P/design-occasions.mjs | grep rmse; done
node $P/design-electorate.mjs
node $P/design-decisions.mjs
node $P/design-cohort-blocs.mjs
D=<scratch path>
node $D/checks.mjs     # bin Laden monthly mean, naive baselines, headline-only test, consensus I_b, Pew vote by bloc
node $D/checks2.mjs    # joint Gulf rally + economy fit, wider midterm grid, Bush+Obama -> Trump-Biden holdout
node $D/lambda.mjs     # lambda profile, symmetric-share counterfactual
node $D/g0.mjs         # G0 profile, identifier slope sign at alternate kappa
node $D/gap.mjs        # partisan-gap test under rallies, scandals, deep failure
node $D/rake.mjs       # IPF raking per axis and cohort baseline drift
node $D/ballot.mjs     # ballot asymmetry with one share set vs two
node $D/cb-0.04-0.2.mjs; node $D/cb-0.04-0.1.mjs   # turnout routing at the documented cap
grep -rl -w <symbol> packages apps services studio-cli scripts   # deletion readers, dist and tests excluded
```

Sources fetched this session: news.gallup.com/poll/{700499,245996,242093,147920,655298,354872,284156,328637} (169907 returned Page Not Found); pewresearch.org 2024/04/09 partisanship-and-ideology and 2021/06/30 behind-bidens-2020-victory; presidency.ucsb.edu presidential-job-approval and its linked sheet tabs (CSV export); senate.gov roll-call XML 106-1-17, 116-2-33, 117-1-59; clerk.house.gov 2002 and 2010 election statistics; FRED UNRATE, CPIAUCSL, A191RL1Q225SBEA.
