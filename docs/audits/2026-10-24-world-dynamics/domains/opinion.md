# Domain audit: domestic opinion, elections and ripple timing

Date: 2026-10-24. Probe file: `packages/engine/src/__probes__/opinion.probe.test.ts` (19 tests; 11 pass, 8 fail; each failure is a reproduced break). Run: `cd packages/engine && npx vitest run src/__probes__/opinion.probe.test.ts` (about 3 seconds; reads are static, no weekly sim).

## Verdict

The approval spine is sound: a bounded, deterministic bloc model with no tracking noise, a capped polarization stock, a capped war rally and a salience hold that ends after eight weeks. Idle-term runs on three seeds stayed inside 0.505 to 0.628 with a largest one-week move of 0.021 (exploratory run, not in the probe file because it takes two minutes).

The weak points are the edges the owner asked about: midterms are far too mild when the President is unpopular, a serial war can hold a rally up indefinitely, a contraction costs nothing, an oil shock does not hurt approval, and an authored scandal flag never expires.

## Sources opened

- Gallup, midterm seat loss: https://news.gallup.com/poll/242093/midterm-seat-loss-averages-unpopular-presidents.aspx (opened). President's party lost an average of 37 House seats when approval was below 50%, 14 above 50%.
- Gallup, approval and re-election: https://news.gallup.com/poll/311825/presidential-job-approval-related-reelection-historically.aspx (opened). Final approval: Obama 2012 52 won, G.W. Bush 2004 48 won, Clinton 1996 54 won, Reagan 1984 58 won, Carter 1980 37 lost, G.H.W. Bush 1992 34 lost. Every incumbent at 50 or higher won.
- Gallup, highest approval: https://news.gallup.com/poll/271628/highest-gallup-presidential-job-approval-rating.aspx (opened). 90% for G.W. Bush, Sept. 21-22, 2001; 89% for G.H.W. Bush in 1991.
- G. Elliott Morris, rally analysis: https://www.gelliottmorris.com/p/i-graphed-every-presidents-approval-2026-03-13 (opened; partly paywalled). Gulf War net approval +29, Iraq +17. Secondary analysis, not Gallup.
- A search result (not opened, so not relied on) put the average midterm House loss since 1946 near 25 to 28 and Truman 1946 at -54 seats.

Unverified: lowest Gallup readings (Truman 22, Nixon 24, G.W. Bush 25, from memory); Abramowitz Time-for-Change coefficients (I confirmed only that the model uses net approval, second-quarter growth and time in office, from a search snippet); any measured gas-price-to-approval elasticity; the claim that a repeat war rallies less (the Morris page excerpt did not address it).

## Controls

Status key: held, partial, lacks, contradicted.

| # | Control and real benchmark | Engine | Evidence |
|---|---|---|---|
| C1 | Approval stays in the polarized-era band; weekly moves small | held | Idle runs 0.505 to 0.628, max weekly move 0.021. Probe 1c passes (0.579 at week 94). |
| C2 | Approval floor reaches the historic low (Gallup lows are mid-20s, unverified) | held | Every judgment at 0 gives a headline of 0.177; own identifiers 0.562. `electorate.ts:43` slope floor. Probe 1a passes. |
| C3 | Approval ceiling near 0.90 | held | All judgments at 1, no war: 0.801. Probe 1b passes. |
| C4 | Rally size in the polarized era (Iraq net +17) | held | Drawn-in war lifts the headline 14.8 points at week 0, 13.4 at week 4, 10.8 at 13, 8.0 at 26, 4.9 at 52. `opinion-war.ts:49-50`. Probe 2a passes. |
| C5 | A rally decays and is not re-bought by serial wars | partial | Per-war decay is held. No memory that a public rallies once: `opinion-war.ts:89` takes the max over live wars, each restarting at 1.86. See B1. |
| C6 | Economy feeds approval: unemployment and inflation | held | 10% unemployment lowers the prosperity target 0.120; 9% inflation lowers it 0.091 (`opinion-causes.ts` economyTerms). Probe 3b passes. |
| C7 | Recession costs approval | contradicted | Negative growth is floored at zero: `opinion-causes.ts:313`. See B2. |
| C8 | Inflation magnitude (Biden 2021-22 fell roughly 15 points on CPI near 9%; share attributable to inflation is unverified) | partial | 9% CPI moves the headline 2.3 points at full catch-up (0.604 to 0.581). See B3. |
| C9 | Gas and foreign price shocks feed approval with lag | lacks | A Gulf war lifting crude 45% moved US CPI inflation only 0.2 to 0.5 points and approval the wrong way. See B4. |
| C10 | Midterm: President's party loses seats at the base rate, more when unpopular (Gallup: 37 below 50%, 14 above) | partial | Direction held: loses at every approval below 0.70. Magnitude: -18 House at approval 0.39, -33 at the floor. Strong President -9. `election-seating.ts:62,78`. See B5. |
| C11 | Midterm Senate loss | held | -4 to -6 in a class-up year at low approval (probe 4b passes; an odd calendar year gives 0 by design). |
| C12 | Incumbency advantage and re-election threshold (50+ always won, 48 won, 37 lost) | held | Approval 0.556 wins (share 0.524), 0.472 loses (0.481), 0.39 loses. `elections.ts:181` (+0.03). Probe 5 passes. Threshold lands about two points higher than Bush 2004. |
| C13 | Record penalties capped and floored at 1974 | held | `elections.ts:400`, tested in `elections.test.ts`. |
| C14 | Do-nothing term is punished | held | `noLawSigned` at `elections.ts:321`. A static probe with no laws lost at approval 0.63, so probes add six laws. |
| C15 | Polarization stock bounded and reverting | held | 520 maximal-divisive weeks reach 1.249976; unifying reaches 0.850025. Probe 6 passes. |
| C16 | Salience peaks, then is priced in | held | War is loud for weeks 0 to 7 and quiet from week 8 (probe 9 passes). `opinion.ts:249`. |
| C17 | Recurring writers cannot pin a judgment | partial | Background writers are capped at 0.05 a week (`turn-loop.ts:112`). Decisions are deliberately uncapped. |
| C18 | Repeated and concurrent scandals compound, then fade | partial | Dated scandals sum and fade (`press-scandal.ts:200-215`). Authored flags without a turn stamp never fade. See B6. |
| C19 | Salience speeds revision toward the target without flipping its sign | contradicted | A loud driver revises at 0.20 in both directions. See B4. |
| C20 | State approval is a reading of the national figure | held | `regional-opinion.ts` solves an offset so the population-weighted mean equals the headline. Display only. |
| C21 | Poll noise is seeded and bounded | held | `poll.ts`, ±3 points; existing tests. |
| C22 | Well-connected people move more than peripheral ones | not checked here | Covered by `person-network-influence.test.ts`; outside this domain. |

## Breaks

### B1. Serial wars hold the rally up (medium, reproduced)

Probe 2b. Eight invasions opened seven weeks apart (aggressor is the President's country, no `opening` tag). The rally after the first war was +13.2 points. At week 56 the headline was still +8.2 points above a no-war control, against an expectation of 4 or less. Each war restarts at 1.86 valence units, and the stock takes the max, so the floor of the plateau is half the peak.

Mechanism: `opinion-war.ts:49-50` computes the rally from the war's own start, and `opinion-war.ts:89` takes the max. The comment above `warOpinionTerms` says "a public rallies once, to the newest war" but the code gives every new war a full rally.

Caveat: this isolates the rally term. The war's unease and casualty terms still bill security, and unauthorized force costs vote share (`elections.ts` `unauthorizedForce`, 0.03 each, capped 0.12). Net farm profit is not shown.

Fix: damp the starting size of each new war's rally by the rally already live or recently spent (a decaying "fatigue" stock on the campaign, about 0.5 per prior rally in the last 52 weeks). Model: opus (touches `warOpinionTerms`, which feeds the headline and a save field).

### B2. A contraction costs nothing (high, reproduced)

Probe 3a. Prosperity target is 0.6254 at growth 0 and 0.6254 at growth -5%, jobs and prices equal. `opinion-causes.ts:313` is `Math.max(0, growth) * 2`. Only unemployment and inflation can punish a recession, and both lag the output fall. Real models (Abramowitz uses second-quarter growth; Fair uses growth near the election) treat growth as a signed term.

Fix: make the term signed, with a smaller weight on the negative side if wanted (for example 2.0 positive, 1.5 negative), then rerun the balance harness since this moves every economy. Model: sonnet for the edit, opus to read the balance results.

### B3. Inflation and unemployment move the headline too little (medium, reproduced)

Probe 3c. At full catch-up, 9% CPI lowers the headline 2.3 points (0.604 to 0.581). The prosperity target drops 0.09, prosperity is 0.28 of the weight, and valence slope is 12 logits per unit, so the term is diluted. Historic episodes show double-digit drops, though the portion due to inflation is not isolated and the benchmark is unverified. The probe threshold of six points is a judgment.

Fix: either raise the inflation coefficient (1.5 to about 3) or add a salience-linked "misery" term that scales with the economyPain level. Needs calibration against a sourced approval-on-CPI series. Model: opus for calibration; do not edit by guess.

### B4. A foreign oil shock lifts approval in the short run and barely reaches prices (high, reproduced)

Probe 10. A Gulf war (Iran against Saudi Arabia, intensity 0.8) raised crude from 1.12 to 1.55 of reference (+39% at week 4, +47% at week 26) and flipped `pumpShock` on at week 13. US inflation moved 0.2 to 0.5 points over the control and cost-of-living scar stayed at 0. Prosperity mood at week 13 was 0.672 with the war and 0.622 without; headline was 0.604 with the war and 0.594 without, so approval was 1.0 point higher in the war arm.

Two mechanisms:
1. Pass-through is weak (commodity/macro domain; refer to that report). A 40 to 47% crude rise with a gasoline share of CPI near 3 to 4% would add about 1 to 2 points to headline CPI; the engine adds 0.2 to 0.5.
2. `pumpShock` multiplies prosperity weight (`opinion.ts:147`) and makes the driver revise at 0.20 instead of 0.06 (`opinion.ts` `driftOpinion`). When the mood sits below its target, as it does after the oath in this build, the "bad news" salience speeds the mood up. Salience should raise sensitivity, not convert a negative story into faster recovery.

Fix: (a) feed pump price into the prices term directly, as a lagged level (opus, with the commodity owner); (b) when a story is loud, accelerate revision only when the target is moving against the mood, or key the faster rate to the sign of the story (sonnet for the scoped rule, in `driftOpinion`).

### B5. Midterms are too mild for an unpopular President (high, reproduced)

Probe 4. House change by approval (uniform judgments, six laws signed, steady history, calendar-correct midterm turn 94):

| Approval | Vote share | House | Senate |
|---|---|---|---|
| 0.27 | 0.374 | -26 | -5 |
| 0.39 | 0.457 | -18 | -4 |
| 0.47 | 0.499 | -15 | -4 |
| 0.59 | 0.564 | -9 | -3 |
| 0.70 | 0.632 | -3 | -3 |
| floor 0.18 | 0.291 | -33 | -6 |

Gallup: -37 average below 50%, -14 above. The engine gives -18 near 40% and -33 at the floor (Truman 1946 at 27% lost 54, per an unopened search result, so treat that as unverified). The engine also never gains House seats, even at 0.70. Cause: `election-seating.ts:62,78` set a 0.12 sensitivity and a 0.04 structural penalty, then `houseSeatsMoved` shrinks the move by `(1 - |lean|)` per state. The comment says 0.12 produces "a rout costs forty", but the measured rout is 33.

Fix: raise house sensitivity to about 0.25 and re-tune the penalty so the 0.59 row stays near -12; verify against Gallup's two averages. Add the two Gallup anchors as test fixtures. Model: sonnet (scoped constants plus test), with a balance run by the owner.

### B6. An authored scandal flag never expires (high, reproduced)

Probes 7a and 7b. A scenario that sets `scandal:probe-affair` without a turn stamp creates a scandal with intensity 1, stage "developing", still live 104 weeks later (`press-scandal.ts:242`). At mood equal to target the headline is 0.570 against 0.604 clean, a permanent 3.4 points. `applyFlag` (`effects.ts:403`) does not stamp; only `markedFlags` does, and nothing requires content to use it. The "nothing permanently pins a metric" rule is broken for this path.

Not checked: whether any shipped scenario sets an unstamped `scandal:` flag. Search `packages/content` for `scandal:` sets before assuming this is live; the engine permits it.

Fix: treat an unstamped scandal flag as breaking on the first week the engine sees it (stamp in `scandalPhase`), so it ages like every dated story; add an audit rule that rejects `scandal:` flag sets without the marker. Model: sonnet.

## Passes worth keeping

- No farming of approval through the headline itself: it is derived, with no setter, and `recomputeApproval` is the only writer (`opinion.ts` around the `recomputeApproval` docblock).
- Approval is bounded in (0, 1) by the logistic and stock cap. All six judgments at 0 or 1 stay inside the sourced Gallup extremes. No metric goes negative.
- Existing coverage I did not duplicate: tracking-poll band and determinism, rally half-life and blockade zero, term clock dates, record caps and the 1974 floor, polarization reversion.

## Recommended order

1. B6 and B2 (small, clearly wrong, sonnet).
2. B5 (sonnet, owner runs the balance harness).
3. B4 salience sign rule (sonnet), then the pass-through work with the commodity owner (opus).
4. B1 (opus).
5. B3 only after a sourced calibration series exists.

## What I did not check

- Weekly-sim effects of any fix; all probes are static reads except probe 10 (three phases, 26 weeks) and the exploratory idle run.
- Presidential electoral-college mapping across states, governors' races, and contingent election.
- Removal pressure, the 25th Amendment path and the caucus-break curve (`removal.ts`, `inability.ts`).
- Cohort strain, turnout shifts, party beliefs and press framing.
- Whether a player can actually open eight invasions in 56 weeks through the real act path (probe uses `openOrEscalate`).
- Gas-price elasticity sources, Fair-model coefficients and the real lowest Gallup readings.
- Second-term honeymoon: `honeymoonValence` uses the absolute campaign turn, so a second term gets none. Real second terms also start lower, so this is probably fine; not tested.
