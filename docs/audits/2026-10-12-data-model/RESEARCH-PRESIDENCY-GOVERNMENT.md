# Measuring a President and a government: research for the data model, 2026-10-12

Research only. No source file changed, no build, no tests. The only file written is this one. Scratch scripts and downloaded data lived in the session scratchpad; every computed figure below says how it was computed so it can be rerun.

Labels follow the repo convention. **Fact** is a figure read from a source opened this session, or computed here from one. **Reported** is a figure that reached me only through a web-search summary of a source I did not open; treat it as unverified until opened. **Inference** is a reading of facts. **Recommendation** is a proposal. Where I could not open or compute something, it is listed in section 9 and no number is given.

---

## 0. Summary

**Recommendation.** Do not model "the presidency" as one score. Model three layers, each with its own clock.

1. **Perception layer (fast, weeks to months):** job approval, favorability, issue approval, institutional trust. Approval already exists as the weighted read of six judgments (`OPINION_WEIGHTS` in `packages/engine/src/opinion.ts`: prosperity .28, security .22, services .16, integrity .14, competence .12, unity .08). Keep it. Calibrate it against the measured dynamics in section 2.
2. **Capacity layer (slow stocks, quarters to years):** appointments filled and vacant, career workforce, rulemaking pipeline, judiciary seats, congressional support. These are things a President can build or burn, and they move the services and competence judgments through implementation, not through mood.
3. **Constitutional-health layer (very slow latent, years):** rule of law, constraints on the executive, corruption control, press and election integrity. Never shown as a game meter by default. Published once a year as report cards in the voice of fictional rating bodies, with a publication lag, the way the real indices arrive.

**Model fully:** approval (exists), appointments and vacancies, workforce capacity, legislative support, rule-of-law and constraints latent, scandal (exists in `press-scandal.ts`), trust in government.
**Derive (computed readouts, no state of their own):** favorability, economic and foreign-policy approval, the six Worldwide Governance Indicators for every nation, Freedom House, V-Dem, CPI, WJP style report cards, a GAO-style high-risk list, a promise-kept scoreboard, the end-of-game historian score.
**Skip:** a separate election-integrity meter outside election years, PART-style program scoring, vetoes beyond a discrete act with a count, executive-order counts as an efficacy score.

**Top findings that change design choices.**

- Approval is slow and sticky: monthly autocorrelation about 0.93 (half-life about 9 months), weekly about 0.983. Typical one-month move is 2.4 points (median), 6.5 (90th percentile), 13.7 (99th). Computed from the Gallup series 1945 to Jan 2009 (section 2.1).
- Only about 30 percent of the variance in monthly approval is between presidents (computed). The rest is time-varying. So a President's fixed traits can explain a minority of outcomes; context must carry most of the variance.
- Consumer sentiment explains about 21 percent of within-president monthly approval variance (computed, section 2.2); unemployment and inflation add nothing stable. The literature agrees that economic effects are unstable across samples (Berlemann and Enkelmann survey, opened).
- The six WGI dimensions and the other indices move slowly (US one-year standard deviation of change 0.07 to 0.14 on a roughly plus or minus 2.5 scale, computed) except in rare breaks. The 2024 to 2025 step is the largest one-year fall in the US record for three of six WGI dimensions (computed). The game needs a break mechanism, not a smooth drift.
- Most "efficacy" tallies (executive orders, laws signed, vetoes) are activity counts, not efficacy. They are good as outputs the player produces and bad as scores.

---

## 1. How this was sourced

| Source | How obtained | Status |
|---|---|---|
| Gallup presidential approval statistics and 1,280 poll readings, Truman to Jan 2009 | curl of `news.gallup.com/poll/116677/...` and parse | Fact, opened. Series after Jan 2009 is in a Gallup interactive not parsed here |
| World Bank WGI, six dimensions, US plus HUN, TUR, VEN, POL, BRA, ZAF, 1996 to 2025 | World Bank API, source id 3, `lastupdated` 2026-09-25 | Fact, computed |
| Federal Register executive orders per president per publication year; final rules per year | Federal Register API counts | Fact, computed. Counts are by publication date, not signing date |
| Article III confirmations, medians, by president | Federal Judicial Center `federal-judicial-service.csv` | Fact, computed |
| Senate veto counts | `senate.gov/legislative/vetoes/vetoCounts.htm` | Fact, opened |
| Public laws per Congress | `archives.gov/federal-register/laws/past` and `/119-first-session` | Fact, opened |
| Consumer sentiment, unemployment, CPI, federal employment | FRED CSV (UMCSENT, UNRATE, CPIAUCSL, CES9091000001) | Fact, computed |
| Pew trust in government | `pewresearch.org/politics/2024/06/24/...` and `/2025/12/04/...` | Fact, opened |
| Gallup midterm seat loss | `news.gallup.com/poll/242093/...` | Fact, opened; averages re-checked against its own table |
| C-SPAN 2021 survey | Press release PDF and methodology page | Fact, opened |
| PolitiFact Obameter | `politifact.com/truth-o-meter/promises/obameter/` | Fact, opened, first 100,000 characters |
| GAO high-risk | `gao.gov/high-risk-list`, `gao.gov/highrisk/overview` | Fact, opened |
| WJP 2025 US | Country press release PDF | Fact, opened; overall score not in it |
| Freedom House 2026 | Press release page | Fact, opened |
| V-Dem 2026 | Press release page; dataset page | Fact, opened; US LDI level not published on either |
| Partnership for Public Service | Senate Rules testimony PDF, July 2024 | Fact, opened |
| Berlemann and Enkelmann economic-determinants survey | University abstract page | Fact, opened |
| Transparency International CPI 2024 page | Opened | Fact for scale and global average. US 2025 score is **Reported** only |
| CQ presidential support scores, Canes-Wrone and de Marchi, Rubenzer et al., Piper and Lewis, Gallup confidence in institutions, Gallup Economic Confidence Index, Ballotpedia judicial nominations | Search summaries | **Reported** |

Two cautions on the Gallup parse. The historical page lists polls roughly monthly for early presidents and more densely later, so "monthly" figures use the mean of whatever polls fell in a calendar month and only pairs of consecutive calendar months. And the table I parsed stops at Jan 2009, so the dynamics below describe Truman through George W. Bush. Later presidents' aggregates (Obama 47.9, Trump 41.1, Biden 42.2) are printed on the same page.

---

## 2. Measured dynamics (computed here)

### 2.1 Job approval, Gallup, Truman to Bush 43

**Fact.** Gallup term averages as printed: Truman 45.4, Eisenhower 65, Kennedy 70.1, Johnson 55.1, Nixon 49, Ford 47.2, Carter 45.5, Reagan 52.8, Bush 41 60.9, Clinton 55.1, Bush 43 49.4, Obama 47.9, Trump 41.1 (2017 to 2021), Biden 42.2.
Highs and lows as printed: Truman 87 (Jun 1945) / 22 (Feb 1952); Bush 41 89 (Feb 1991) / 29 (Jul 1992); Bush 43 90 (Sep 2001) / 25 (Oct 2008); Nixon 67 / 24; Carter 75 / 28 (Jun 1979); Reagan 68 / 35 (Jan 1983); Clinton 73 (Dec 1998) / 37 (Jun 1993); Obama 69 / 38; Trump 49 (five times, Jan to May 2020) / 34 (Jan 2021); Biden 57 / 36 (Jul 2024).
Second-term averages as printed: Truman 36.5, Eisenhower 60.5, Johnson 50.3, Nixon 34.4, Reagan 55.3, Clinton 60.6, Bush 43 36.5, Obama 46.7. Mean of those eight second-term averages is 47.6 and of the first-term averages for the same eight presidents (Truman 55.6, Eisenhower 69.6, Johnson 74.2, Nixon 55.8, Reagan 50.3, Clinton 49.6, Bush 43 62.2, Obama 49.1) is 58.3, both my arithmetic. Inference: a second term is on average lower and the spread is huge (Clinton up, Bush 43 down), so it is context, not a decay law.

**Fact (computed).** Across nine presidents Truman to Bush 43, mean approval by months in office:

| Months in office | 0 to 3 | 9 to 12 | 21 to 24 | 33 to 36 | 42 to 46 |
|---|---|---|---|---|---|
| Mean approval, 9 presidents (8 for the last column) | 66.3 | 63.9 | 56.4 | 53.8 | 54.6 |

A typical honeymoon loss is about 12 points over three years. Individual paths vary from Eisenhower (68 to 75, essentially flat) to Carter (68 at start, 31 at month 46 in this series) and Bush 41 (80 at month 12, 43 at month 46).

**Fact (computed).** Month-to-month changes, 640 consecutive-month pairs: standard deviation 4.11 points, mean change minus 0.2, median absolute change 2.4, 90th percentile 6.5, 99th percentile 13.7.
Steepest one-month falls: Bush 41 Sep to Oct 1990, 72 to 57 (budget fight); Truman Jan to Feb 1946, 63 to 49; Eisenhower Aug to Sep 1953, 74 to 61; Carter Feb to Mar 1980, 54 to 41 (this follows a rally in Nov and Dec 1979, 40 to 54); Reagan Dec 1988 to Jan 1989, 63 to 51 (end-of-term artifact); Clinton Apr to May 1993, 55 to 44.
Steepest rises: Bush 43 Aug to Sep 2001, 56 to 76 (+19.7); Carter Dec 1980 to Jan 1981, 34 to 51 (a departing-President lift); Bush 41 Dec 1990 to Jan 1991, 60 to 75 (Gulf War); Johnson Mar to Apr 1968, 36 to 50.

**Fact (computed).** Autoregression of monthly approval, demeaned within each President: phi = 0.928 on 640 pairs. Implied half-life of a deviation from that President's own mean: 9.3 months. Weekly equivalent: 0.928 to the power 12/52 = 0.983.
Variance decomposition of the monthly means (Truman to Bush 43): between-President share 0.298 (total standard deviation 13.4 points).

**Fact (computed).** Rally and decay:
- Bush 43, monthly means: Sep 2001 76, Nov 87, Jan 2002 84, Mar 79, May 76, Jul 72, Sep 67, Nov 66, Jan 2003 60. The rally decayed about 27 points in 14 months (Nov 2001 to Jan 2003).
- Bush 41: Feb 1991 82, Apr 79, Jun 72, Aug 71, Oct 64, Dec 51, Feb 1992 41, Jun 37, Oct 34. A 41-point fall in 20 months once the rally source (the war) resolved and the economy dominated.
- Katrina window, Bush 43 monthly means 2005: Jan 52, Mar 50, May 48, Jul 47, Aug 44, Sep 44, Oct 41, Nov 38, Dec 42. Inference: Katrina is a step in a 14-point grind, not a cliff. The slow part (Iraq, economy) carried most of the year.

**Midterm link, Fact (Gallup page, table re-added).** Nine midterms with presidential approval above 50 percent: total seat change minus 126 (about minus 14 each). Nine below 50: minus 329 (about minus 37 each). Gallup reports a correlation of .66 between approval and seat loss and an all-midterm average loss of 25 seats since 1946. Examples: 1998 Clinton 66 percent, plus 5; 2010 Obama 45 percent, minus 63; 1946 Truman 33 percent, minus 55; 1978 Carter 49 percent, minus 11 (an outlier).

### 2.2 Economy to approval, Fact (computed), with limits

Monthly Gallup approval, 450 months where UMCSENT, UNRATE and a year-over-year CPI existed, Truman to Bush 43.

- Pooled OLS: constant 13.1, UMCSENT +0.451 per index point, UNRATE +0.349 per point, CPI year-over-year minus 0.272 per point, R-squared 0.225, residual standard deviation 11.0 points.
- With President fixed effects (within-President): UMCSENT +0.554, UNRATE +0.011, CPI +0.281, R-squared within 0.212.

Reading it. Sentiment carries the signal: about half a point of approval per point of the sentiment index, within a President. Unemployment's pooled coefficient has the wrong sign for a causal story and goes to about zero once Presidents are held fixed; the within CPI sign is also wrong. Inference: these are collinear, era-confounded series and I would not use the unemployment and inflation coefficients. This matches the opened survey: about half of studies find a significant unemployment or inflation effect, results depend on the sample period, and long-run effects are robust but short sub-periods are not.
Contrast with the repo's own approval design (`docs/audits/2026-10-12-approval-model/DESIGN.md`, observed): it records that the economy pricing fails Biden 2021 to 2022 (RMSE 8.6) and Bush 41 1991 to 1992 (RMSE 14.0). My regression is consistent with that: a sentiment-like perception variable, not a raw rate, should price the economy.
Recent levels, Fact from FRED files: UMCSENT 51.7 (Aug 2026), file minimum 44.8 (May 2026); UNRATE 4.2 (Sep 2026).

---

## 3. Presidential performance axes

For each: definition and units; how measured; range and speed; drivers; downstream effects; representation and cadence; calibration series.

### 3.1 Job approval

**Definition.** Percent approving "the way [name] is handling his job as President" (wording read on the American Presidency Project page, adapted from Gallup).
**Measured.** Gallup multi-day polls for Truman to Bush 43, daily tracking for Obama and Trump 2017 to 2018, periodic multi-day polls 2019 to 2025 (as stated on the Gallup interactive page). Aggregators combine many polls (not opened this session).
**Range and speed.** 22 to 90 across the Gallup record (Truman 22, Bush 43 90). Section 2.1 gives speeds. Partisan composition matters: Pew shows trust and satisfaction track which party holds the White House (section 4.1). The repo's DESIGN.md fits five partisan blocs to 17 Gallup party readings (RMSE 2.5 pooled) and a rally table to six episodes, so the bloc model is already evidence-backed.
**Drivers.** Economy (perception), war and security events (rally then decay), scandal, party identification, honeymoon, prices. Wars and unresolved costs push down (Mueller regularities as summarized by the Gronke and Newman review, **Reported**).
**Downstream.** Midterm seat loss (.66 correlation, 37 vs 14 seats); removal pressure; congressional willingness at the margin (Canes-Wrone and de Marchi: House more likely to side with a popular President, but only on salient, complex bills, 208 House votes 1989 to 2000, **Reported**); candidate coattails.
**Representation.** Perception stock, derived from the six judgments and the blocs. Keep weekly update. Add the measured persistence (weekly 0.983 toward the President-specific mean) as an acceptance test on `opinion.ts`, not a new parameter.
**Calibrate against.** Gallup term stats and the monthly series above; honeymoon decay table; rally paths for Bush 43 and Bush 41; midterm table.

### 3.2 Favorability and personal image

**Definition.** Share viewing the person favorably, distinct from job rating.
**Measured.** Gallup favorable ratings; Gallup page shows a headline that Obama is the most favorable and Biden the least favorable among living Presidents (headline only, no figures read).
**Speed.** Slower than job approval for incumbents; I have no measured series for it this session.
**Recommendation.** Derive: favorability = smoothed (about 12 month) blend of approval and the President's integrity and charisma attributes. Do not store separately. Needs a sourced series before any numbers ship (gap, section 9).

### 3.3 Issue and component approval (economy, foreign policy)

**Measured.** Gallup and Pew ask issue approval; I did not open a series.
**Representation.** Derive from the six judgments: economy approval from prosperity, foreign policy from security plus competence. No new state. The economy judgment should read a sentiment-like perception, per section 2.2.

### 3.4 Legislative success

**Definitions and measures.**
- CQ presidential support score: share of recorded votes where the member sided with the President's stated position. Voteview documents a comparable score, with the caveat that presidential positions are inferred, Senate positions only from 1955, and pre-1953 scores rest on few roll calls.
- Laws enacted: public laws per Congress, Fact (National Archives): 111th 383, 112th 283, 113th 296, 114th 329, 115th 442, 116th 344, 117th 362, 118th 274. The 119th had 72 in its first session (Jan 3, 2025 to Jan 3, 2026).
- Vetoes (Senate.gov, Fact): Biden 13 (0 overridden); Trump 2017 to 2021 10 (1); Obama 12 (1); Bush 43 12 (4); Clinton 37 (2); Bush 41 44 (1); Reagan 78 (9); Ford 66 (12); Trump 2025 to date 2 (0). Total includes pocket vetoes.
- **Reported:** CQ gave Obama 96.7 percent for 2009 (highest since 1953; LBJ 93 percent in 1965); CQ Roll Call reported Biden's support rate fell from 94.9 percent to 70.4 percent after Republicans took the House in 2023.
**Speed.** Step changes at elections (Biden 94.9 to 70.4 in one year, **Reported**) and slow within a Congress. Laws per Congress move a few tens year to year.
**Drivers.** Majority size and cohesion (the dominant factor in the literature I could find; party control is described as the most important factor, **Reported**), the window after inauguration, approval on salient bills (conditional), and perceived skill (Lockerbie and Borrelli, **Reported**).
**Downstream.** The agenda a President can enact; budget deals and shutdown risk; compliance with the promise ledger.
**Representation.** Stock of "legislative capital" is not needed. Use the existing vote model (`congress-votes.ts`, `legislation.ts`; contents not audited here): whip counts from caucus size and cohesion, then add a conditional approval bonus for salient and complex bills and a skill modifier. Outputs per Congress: laws enacted, vetoes, overrides. Update cadence per bill event.
**Calibrate.** Laws per Congress table above; veto counts; split-government vs unified-government years.
**Inference for the game.** Because 119th first-session count is 72 vs 117 in the 115th's first session, the game should not target a fixed number of laws per term; it should target the ratio between unified and divided conditions.

### 3.5 Executive action (orders, rules)

**Definition.** Executive orders signed; final rules published; significant rules.
**Fact (Federal Register API, publication-year counts).** EOs by President by year: Clinton 1994 54, 1995 42, 1996 50, 1997 38, 1998 38, 1999 35, 2000 39 (total of the series shown 310 for Clinton overall); Bush 43 2001 53, 2002 33, 2003 41, 2004 46, 2005 27, 2006 26, 2007 33, 2008 30; Obama 2009 39, 2010 43, 2011 34, 2012 39, 2013 24, 2014 34, 2015 29, 2016 44; Trump 2017 55, 2018 35, 2019 47, 2020 68, 2021 16 then 2025 225 and 2026 65 (through the API date); Biden 2021 77, 2022 29, 2023 24, 2024 18, 2025 14. Whole-career totals returned by the API: Clinton 310, Bush 43 294, Obama 294, Biden 162, Trump 511 (both terms to date).
Final rules per publication year: 2000 4,491; 2008 3,819; 2016 3,854; 2019 2,964; 2020 3,352; 2021 3,257; 2022 3,168; 2023 3,018; 2024 3,248; 2025 2,441. API `significant` filter counts: 2000 290; 2008 428; 2016 487; 2020 437; 2022 265; 2025 189. I did not verify the Federal Register's definition of the flag.
**Speed.** EOs move within a year by a factor of 2 to 4 (Trump 2020 68 vs 2021 16 is a partial-year artifact of transition; 2025 225 is the largest in this API window).
**Reading.** Counts measure activity. Durability is the real efficacy question: reversals by the next President, court losses, and Congressional Review Act use. I have no sourced durability series.
**Representation.** A flow with a reversibility attribute per action. The repo has `rulemaking.ts`, `order-review.ts` and `signing-window.ts` (not audited). Recommendation: keep the order as the player's act, record lifetime and litigation outcome, and expose the count only as a descriptive statistic.

### 3.6 Appointments, confirmations, vacancies

**Fact (Partnership for Public Service testimony, July 2024).** About 4,000 political appointments, over 1,300 requiring Senate confirmation; the Partnership tracks about 800 of them. Average days to confirm: 182 in Biden's first term to the testimony date vs 49 in Reagan's first term. In the Biden administration Cabinet secretaries took about 19 days, deputy secretaries about 59, assistant secretaries and directors about 200. Four Cabinet departments had 30 percent or more of positions vacant in March 2024. 83 Senate-confirmed positions were vacant at least once over the 14 years the Partnership examined; one Justice Department position was vacant 84 percent of the time 2009 to 2023.
**Effect on performance.** The Partnership summary says long vacancies produce lower evaluations of agency performance. **Reported** (search summary of Piper and Lewis, JPART 2023): about one standard deviation lower self-reported performance in agencies with long-term vacancies, from a 2020 survey of federal executives; a 2025 Journal of Politics follow-up finds a robust correlation.
**Fact (FJC file, computed).** Article III confirmations by term: Carter 263; Reagan 381; Bush 41 193; Clinton 378; Bush 43 325; Obama 326; Trump 2017 to 2020 234 (19, 67, 100, 48 by confirmation year) plus 56 in 2025 to 2026 so far; Biden 233 (40, 57, 69, 67). Median nomination to confirmation: Reagan 38 days; Bush 41 87; Clinton 99; Bush 43 121; Obama 164; Trump (all) 127.5; Biden 105.
**Speed.** Confirmation lag is the model: a median of months, with a long tail. Vacancies persist for years.
**Drivers.** Senate control and the majority's willingness, nominee vetting, the President's attention, and the recess and acting-official rules.
**Downstream.** Agency competence (the services and competence judgments), implementation lag for programs, the ability to defend policies in court and Congress.
**Representation.** Stock: positions filled, acting, vacant, per agency. Flow: nominations and confirmations with the empirical lag distribution (lognormal-like by era; median 38 to 164 days). Effect: agency "leadership" factor reduces program execution rate and raises failure variance, an inference calibrated to one standard deviation at long vacancy (**Reported**). The repo has `appointments.ts` and `cabinet-*` modules (not audited); this is an extension to them.
**Calibrate.** The medians and counts above. Do not use the Ballotpedia first-term nomination figures (Trump 153 nominated or 104 depending on edition, **Reported**): the two editions disagree.

### 3.7 Scandals and investigations

**Definition.** Credibility-damaging stories with an investigation arc.
**In repo.** `press-scandal.ts` and the approval DESIGN.md already fit Watergate (RMSE 4.3), Iran-Contra (2.7) and Lewinsky (5.5 points) against Gallup. I did not re-derive them. The C-SPAN advisers note that impeachment memory shifted ranks (Brinkley on Nixon and Clinton, in the press release).
**Gap.** I did not source counts of investigations, special counsels or impeachments this session.
**Recommendation.** Keep the existing stage machine. Link its output to the integrity judgment, to institutional trust (section 4.1), and to the checks latent (section 5.1).

### 3.8 Promises kept

**Fact (PolitiFact Obameter page).** 533 promises tracked: Kept 255, Compromise 146, Broken 125. Shares from my arithmetic: 47.8, 27.4, 23.4 percent. The three categories sum to 526; 7 are unaccounted for on the page, and the page displays 0 percent for every category, so shares are mine.
**Reading.** Roughly half kept or partly kept is a base rate for a real two-term President with mixed Congress control. It is a retrospective ledger, not a driver.
**Representation.** Derive from the game's own pledge records (`pledge-outcomes.ts` exists, not audited). Feed integrity (broken pledges) and the end-of-game score.

### 3.9 Crisis management

**Definition.** Handling of emergencies. C-SPAN scores it as one of ten leadership characteristics. The game already represents it as events with rally, disaster and war terms.
**Reading.** Rally effects are real but unstable: Gronke and Brehm (2002) argue that rallies should be treated as stable increases, not just spikes, and that volatility is understudied (**Reported**). My data (section 2.1) shows 9/11 decaying about 27 points in 14 months and the Gulf War lift gone by Dec 1991.
**Representation.** An event with a size, a shape and a decay (rally table in the DESIGN.md), conditioned on whether the cause resolves. Do not model a "crisis score" stock.

### 3.10 Historians' rankings (legacy)

**Fact (C-SPAN 2021).** 142 historians and professional observers rate 44 presidents 1 to 10 on ten characteristics with equal weight: Public Persuasion, Crisis Leadership, Economic Management, Moral Authority, International Relations, Administrative Skills, Relations with Congress, Vision/Setting an Agenda, Pursued Equal Justice for All, Performance Within the Context of the Times. No definitions are given to respondents; scores are averages. Trump entered at 41 (highest categories Public Persuasion 32, Economic Management 34; last, 44, on Moral Authority and Administrative Skills). Obama rose from 12 to 10; Bush 43 went 36 (2009), 33 (2017), 29 (2021); Clinton 21 (2000), 15 (2009, 2017), 19 (2021).
**Reading.** Movement after leaving office is slow and partly partisan; that is not in-term. It is the best template for an end-of-game score because its ten characteristics map to game systems.
**Representation.** Derived at game end (or on a retrospective screen): map each characteristic to an accumulated game quantity (for example Administrative Skills from workforce and vacancy history, Relations with Congress from the legislative record, Moral Authority from integrity and rule-of-law choices, Economic Management from the business-cycle outcome). Equal weights, as the survey does. Do not display during play.

---

## 4. Government efficacy axes

### 4.1 Trust in government

**Definition.** Percent trusting the federal government in Washington to do what is right "just about always" or "most of the time."
**Fact (Pew).** 17 percent in September 2025 (2 always, 15 most of the time), down from 22 in May 2024; peak 77 (NES, Oct 1964); first reading 73 (Dec 1958); lowest single poll 10 (CBS/NYT, Oct 2011); never above 30 since 2007. By party: Democrats 9, Republicans 26 (Sep 2025); Democrats 35, Republicans 11 (May 2024); Feb 2025 Democrats 15, Republicans 20. Post 9/11: 31 (CBS/NYT, Jan 2001) to 55 and 60 (Oct 2001).
**Speed.** Decades for the level; single events move it 20 to 30 points; party-in-power flips can swing a party's number by 20 to 25 points in months (Democrats 35 to 15 to 9; Republicans 11 to 20 to 26, 2024 to 2025).
**Drivers.** Which party holds the White House (dominant since the 1970s per Pew), national crises, perceived performance and integrity, polarization.
**Downstream.** Willingness to accept costly policy, compliance, and the share of the public that treats governmental acts as legitimate. Evidence in this session for hard downstream effects is thin; treat the downstream links as design choices, not findings.
**Representation.** A slow perception stock, two-bloc (own party, other party), driven by outcomes, integrity events, and the White House party. Update monthly. Calibrate to the Pew party series and the 2001 spike.
**Related Fact (Reported).** Gallup June 2025 confidence: presidency 30, Supreme Court 27, Congress 10 percent (topline search summary).

### 4.2 Worldwide Governance Indicators (the six)

**Fact (World Bank page).** Six dimensions: Voice and Accountability, Political Stability, Government Effectiveness, Regulatory Quality, Rule of Law, Control of Corruption. Over 200 economies, 35 cross-country sources, 2026 update covers 1996 to 2025. The estimate unit is a standard unit (the API labels it "approx. -2.5 to +2.5"); the page also offers a 0 to 100 scale. The page says scores are estimates, not definitive ratings, and can move with source data.
**Fact (computed, US):**

| Dimension | 1996 | 2000 | 2008 | 2016 | 2020 | 2024 | 2025 | Largest 1-year change | SD of 1-year changes |
|---|---|---|---|---|---|---|---|---|---|
| Voice and Accountability | 1.08 | 1.09 | 1.26 | 1.18 | 0.94 | 0.91 | 0.64 | minus 0.26 (2024 to 2025) | 0.067 |
| Political Stability | 0.97 | 1.03 | 0.62 | 0.34 | minus 0.13 | minus 0.11 | minus 0.30 | minus 0.32 (2015 to 2016) | 0.136 |
| Government Effectiveness | 1.78 | 1.91 | 1.52 | 1.55 | 1.34 | 1.30 | 1.19 | minus 0.32 (2002 to 2003) | 0.081 |
| Regulatory Quality | 1.45 | 1.84 | 1.50 | 1.38 | 1.26 | 1.33 | 1.01 | minus 0.32 (2024 to 2025) | 0.106 |
| Rule of Law | 1.51 | 1.64 | 1.57 | 1.40 | 1.03 | 1.00 | 0.79 | minus 0.21 (2024 to 2025) | 0.071 |
| Control of Corruption | 1.68 | 1.57 | 1.32 | 1.23 | 1.13 | 1.08 | 0.87 | minus 0.30 (2002 to 2003) | 0.105 |

Comparators (computed): largest one-year falls in Voice and Accountability: Hungary minus 0.17 (2017 to 2018), Turkey minus 0.21 (2015 to 2016), Venezuela minus 0.21 (2017 to 2018), Poland minus 0.17 (2005 to 2006); largest rise Poland plus 0.33 (2023 to 2024). Rule of Law: Turkey minus 0.24 (2013 to 2014), Poland minus 0.22 (2005 to 2006), plus 0.30 (2004 to 2005), Venezuela minus 0.20 (2014 to 2015).
**Reading.** A US one-year move of 0.2 to 0.3 on Voice, Regulatory Quality and Rule of Law in 2025 is the largest in its own series and comparable to the steepest national breaks anywhere. Inference: typical drift is under 0.1 a year; regime-scale shocks are 0.2 to 0.3 a year; the game needs both a slow drift and a break channel. The measurement itself has error (the page says estimates, not ratings), so the game should publish these with a visible band, not a point.
**Drivers and downstream.** The page I opened names the dimensions but does not define them, and I did not open the WGI methodology paper. Definitions and the evidence tying WGI to growth and investment are therefore not stated here (gap, section 9).
**Representation.** Per nation, the same six latent variables, in the same shape for all 196 (matches the "every nation is the same shape" rule). Publication cadence annual with a roughly nine-month lag (API `lastupdated` 2026-09-25 for data through 2025).
**Mapping to game quantities (Recommendation).**

| WGI | Game driver | Moves it |
|---|---|---|
| Voice and Accountability | press freedom, electoral competition, civil society space | elections, media acts, protest policing |
| Political Stability | violence, coup risk, unrest | security events, polarization stock |
| Government Effectiveness | career workforce, vacancies, service delivery | workforce capacity (4.5), appointments (3.6) |
| Regulatory Quality | rulemaking quality, burden, predictability | rulemaking pipeline, policy volatility |
| Rule of Law | court independence, enforcement, contract and property security | compliance with courts, prosecutions, pardons |
| Control of Corruption | scandal, prosecution, IG independence | scandal machine, investigations, firing of overseers |

### 4.3 V-Dem, Freedom House, WJP, Transparency International

**V-Dem.** Expert coded; the dataset page says 531 indicators in the main versions, 251 indices, and a Bayesian item response measurement model that outputs an interval scale; latest version 16 (March 2026). **Fact (press release, 17 Mar 2026):** US Liberal Democracy Index fell 24 percent within one year, world rank 20 to 51 of 179, with the liberal components (checks and balances, civil service politicization, judiciary) falling most. Election indicators were not updated for the US in 2025 because they are assessed only in election years. Nearly a quarter of countries are autocratizing; 18 democratizing; rule of law deteriorating in 22 countries. The US LDI level on a 0 to 1 scale was not published on the pages I opened.
**Freedom House (Freedom in the World 2026).** **Fact:** US 81 of 100, down 3, the sharpest fall among 88 Free countries (Bulgaria also minus 3, Italy minus 2); lowest since 0 to 100 scores began in 2002; 12 points lost over two decades under both parties; 54 countries declined and 35 improved. The 2025 edition page showed US 84 (PR 34/40, CL 50/60) with a Country Facts line reading 81, which is an inconsistency on that page.
**WJP Rule of Law Index 2025.** **Fact (press release):** US rank 27 of 143, overall score down 2.8 percent, regionally 20 of 31. Factor global ranks: Constraints on Government Powers 36, Absence of Corruption 24, Open Government 20, Fundamental Rights 42, Order and Security 35, Regulatory Enforcement 27, Civil Justice 37, Criminal Justice 37. 68 percent of countries declined in 2025 vs 57 percent the prior year. The overall score (reported by secondary sources as 0.68) is not in the release.
**Transparency International CPI.** **Fact:** 0 to 100, 180 countries and territories scored in 2024, global average 43. **Reported:** US 64 in 2025 (record low), 65 in 2024; down 12 points over a decade.
**Reading.** Indices differ in method but agree in direction. Their disagreement is itself information: V-Dem's 24 percent drop versus Freedom House's 3 points shows different sensitivity to executive-power indicators; one fact-check source states that Freedom House and International IDEA did not downgrade overall status (**Reported**), and Cato argues V-Dem undervalues federalism and judicial resilience (**Reported**).
**Representation.** Derived report cards, not state. Compute from the constitutional-health latent (5.1), the corruption and press stocks, and election record; add a deliberate method difference for each rating body (one sensitive to executive concentration, one to civil liberties, one to corruption perception, one to enforcement). Release once a year in the fictional voice of each body. Never reveal the latent.

### 4.4 Election integrity

**Fact (Reported).** The Electoral Integrity Project's Perceptions of Electoral Integrity data release PEI-11.0 uses expert surveys (5,605 experts, 10 percent response rate in 2024); indicator count and method changed in 2023 from 49 (then 47) indicators to 62 indicators with four concept indices. I did not obtain the US 2024 score.
**Reading.** Observed only in election years (V-Dem's election indicators behave the same way, per the press release).
**Recommendation.** Skip as a meter. Represent election integrity as a property of each election event, drawn from the constitutional-health latent and the election-administration actions the President takes. Report it in election-year report cards only.

### 4.5 State capacity and the federal workforce

**Fact (FRED CES9091000001, thousands, federal government employment including postal service):** 2,768 (Jan 2000); 2,738 (Jan 2008); 2,815 (Dec 2016); 2,855 (Jan 2020); 2,884 (Jan 2021); 3,009 (Dec 2024); 3,010 (Jan 2025); 2,914 (Sep 2025); 2,685 (Jan 2026); 2,682 (Sep 2026). From Jan 2025 to Sep 2026 the series fell 328 thousand, 10.9 percent (my arithmetic), in about 20 months. The series peak since 1990 in the file is May 1990 at 3,435 and the largest 12-month fall since 1960, 545 thousand in 2010 to 2011, is a decennial census-staffing artifact. Inference: apart from census cycles, a 10 percent contraction in under two years is unusual in this series; I did not check it against OPM data.
**Reading.** Capacity is a stock that falls much faster than it can be rebuilt. Hiring requires recruiting, clearance and training, and leaders (3.6). I have no sourced rebuild rate; this is a gap.
**Federal survey data.** OPM's Federal Employee Viewpoint Survey and Partnership "Best Places to Work" would give morale series; not opened.
**Drivers.** Budget and appropriation fights, shutdowns, reorganizations, hiring freezes, attrition, morale, vacancies.
**Downstream.** Service delivery, program execution speed and failure rate, disaster response, Government Effectiveness, the services judgment. GAO's high-risk list is the closest authoritative indicator of the consequence.
**Representation.** Per-agency capacity stock with asymmetric rates: fast fall (months), slow rise (years), plus a leadership multiplier from vacancies. Update monthly. Feeds program execution probability and delay, the services judgment (through delivered services, not budget), and Government Effectiveness.
**Calibrate.** The employment series above, the Partnership confirmation lags, and the Piper and Lewis effect size (**Reported**). Fit the rebuild rate to a sourced series before shipping (gap).

### 4.6 Agency performance and the GAO high-risk list

**Fact (GAO).** The list began in 1990; 38 areas as of February 2025, one new that year (Improving the Delivery of Federal Disaster Assistance). Five criteria for removal: Leadership Commitment, Capacity, Action Plan, Monitoring, Demonstrated Progress. GAO rates each area met, partially met, or not met per criterion. GAO reports nearly $759 billion in financial benefits, about $40 billion per year, and about $84 billion from ten areas since the previous update. The list is updated at the start of each Congress.
**Reading.** The criteria are an implementable program-health rubric that already fits the game: a leadership flag, a capacity stock, a plan, monitoring, and progress. The count changes every two years, at most a handful of areas.
**Representation.** Derived list: each long-running program has the five criteria computed from game state; an area enters if it fails enough of them for long enough, and leaves when all are met. Publish every two years. PART-style program scoring: skip (I did not open a source on it).

### 4.7 Institutional checks (courts, Congress oversight)

**Evidence in hand.** Free-standing quantities: WJP Constraints on Government Powers (global rank 36 of 143); V-Dem's finding that checks and balances and judicial intimidation drove the US decline; Freedom House cites gridlock and executive assertion. Judicial pace: section 3.6.
**Representation.** See 5.1. This is the central latent of the constitutional-health layer, and the one where the President is both a subject and an actor.

---

## 5. Latent constitutional-health model (Recommendation)

### 5.1 One slow latent, three readouts

**Recommendation.** One latent per nation called here `checks` (strength of effective constraints on the executive: courts comply, legislature oversees, press and civil society operate, officials are sanctioned). The US starts from authored values calibrated to the WGI levels above. It feeds:

- Rule of Law and Voice (WGI readouts), plus V-Dem, WJP, Freedom House report cards.
- Integrity judgment (via sanctioned misconduct and visible corruption).
- Removal pressure capacity: whether Congress and courts can act on a President.
- Foreign standing and risk premiums, as a lagged term.

**Dynamics (Recommendation, inference from the WGI data).** A drift term of roughly 0.05 to 0.1 units per year for normal governments; a break channel for deliberate executive acts (defying a court order, mass firing of overseers, prosecuting opponents), each with a signed size of 0.1 to 0.3 per major act cluster in the first year, with a persistence of years. Recovery is slower than damage. Calibrate to the comparator breaks (Poland 2005 to 2006 minus 0.22 then plus 0.30 in 2004 to 2005 for Rule of Law; Turkey minus 0.24; Hungary minus 0.16 for Rule of Law) and the US 2025 step.
**Conditional.** Breaks are blunted when courts and Congress are independent and the opposing party controls a chamber; they are amplified by a unified majority. This is a modifier on the effect size, not a different system.
**Cadence.** Event-driven writes, monthly decay, annual publication.
**Why not skip.** The 2025 changes recorded by four independent rating bodies are the largest single feature in the current record of the office; a game that models only approval would have no way to express them.

### 5.2 Risk: this layer can make the game didactic

The NORTH_STAR says the game is not pedagogical. Recommendation: no meter, no tutorial about democracy. The player sees consequences through events (court rulings, press, resignations, markets), the annual report cards, and the removal machinery.

---

## 6. What to model, derive, or skip for one or two terms

| Axis | Treatment | Why | Update clock |
|---|---|---|---|
| Job approval | Model (exists) | Headline; fast; well-measured | Weekly |
| Favorability | Derive | No sourced series | Weekly readout |
| Issue approval | Derive | Same judgments | Weekly readout |
| Legislative support | Model through vote model | Majority size dominates | Per bill |
| Laws, vetoes | Derive counts | Outputs not drivers | Per act |
| Executive orders and rules | Model as acts with reversibility; count is descriptive | Counts are activity | Per act |
| Appointments and vacancies | Model stocks and lags | Strongest sourced link to agency performance | Weekly step, monthly effect |
| Judicial appointments | Model as seats and lags | Durable, lagged payoff beyond a term | Per nomination |
| Scandal | Model (exists) | Fitted | Weekly |
| Crisis | Event model | Shape and decay measured | Per event |
| Promises | Derive ledger | Retrospective | Per pledge |
| Historian score | Derive at game end | Retrospective | Once |
| Trust in government | Model, slow, two blocs | Drives legitimacy | Monthly |
| Workforce capacity | Model per agency | Asymmetric fast fall slow rise | Monthly |
| Constitutional-health latent | Model, hidden | Large current evidence | Event plus monthly |
| WGI six, nation level | Derive for all nations | Same shape for 196 | Annual |
| FH, V-Dem, WJP, CPI | Derive report cards | Different sensitivities | Annual |
| GAO-style list | Derive | Five-criterion rubric | Biennial |
| Election integrity | Skip as meter; election-year property | Only measured in election years | Per election |
| PART-style scoring | Skip | No source opened | none |

---

## 7. Time compression

The game keeps a weekly tick (DECISIONS §2) and a term of 208 weeks. Nothing needs to be compressed in rates: use calendar-true rates and let attention-based pacing skip quiet weeks. The compression that matters is a smaller set of decisions per term, so each decision carries more consequence than any single real-world act, and effects must be assigned a clock.

| Class | Meaning | Examples | Parameter from evidence |
|---|---|---|---|
| Immediate | Lands in the same week | Rally onset (9/11: +19.7 in one month), scandal break, executive order signed, a veto | One-month approval jumps up to 14 to 20 points |
| Lagged | A fixed delay then a step | Confirmation (median 38 to 164 days), rule finalization, bill passage, program rollout after appointment | FJC medians; Partnership lags |
| Distributed | Spread over many weeks | Rally decay (about 27 points in 14 months for Bush 43), honeymoon decay (about 12 points over 3 years), workforce rebuild, trust recovery | Weekly 0.983 persistence, 9.3 month half-life |
| Conditional | Occurs only if a state holds | Approval helps on salient complex bills; breaks blunted by independent courts; midterm loss by approval band | Gallup 37 vs 14; Canes-Wrone and de Marchi (**Reported**) |
| Trait-modulated | Scaled by a President attribute | See below | See below |

**Trait modulation (Recommendation, with evidence strength).** Traits should scale rates and variance, not set levels, because only about 30 percent of approval variance is between presidents (computed) and the literature I found ties traits mostly to historian ratings, not approval.

| Trait | Modulates | Evidence in hand |
|---|---|---|
| Experience | Confirmation lag and bill-passage friction in year 1; error rate of acts | Weak. None opened. Treat as a small modifier to year-1 friction |
| Charisma | Rally size and honeymoon half-life; some legislative effect | **Reported** only: Simonton interview, charisma associated with more legislation but not better problem solving; extraversion and openness correlate with historian-rated greatness in Rubenzer et al. (retrospective, about 41 to 43 presidents) |
| Integrity | Scandal arrival rate and scandal damage; trust recovery | Mechanism already in repo; no new source |
| Competence | Program execution rate, error tails, crisis outcome quality | **Reported**: competence and achievement striving correlate with historian greatness; perceived skill relates to congressional success (Lockerbie and Borrelli, 1989) |

**Bounds.** Keep each trait effect to a modest fraction of the variance the context terms explain: for example, charisma scales rally size by no more than plus or minus 20 percent; competence scales execution probability by no more than plus or minus 15 percent. These bounds are design choices, not findings.

---

## 8. Calibration plan (tests that should pass before a number ships)

1. **Approval persistence.** Simulated monthly AR(1) near 0.93 and monthly change SD near 4 points, 90th percentile 6.5, against section 2.1.
2. **Honeymoon.** Mean approval path 66, 64, 56, 54 at months 0 to 3, 9 to 12, 21 to 24, 33 to 36 across seeds, with wide dispersion including flat (Eisenhower) and collapse (Carter) paths.
3. **Rally.** 9/11-type event gives +15 to +20 in a month and decays 25 to 30 points over 14 months when the cause stays unresolved (Bush 43); Gulf War-type lift fully gone within 10 to 12 months after resolution (Bush 41).
4. **Economy.** A sentiment-driven economy term must reproduce Bush 41 1991 to 1992 and Biden 2021 to 2022 (the repo's own failing cases) before the slice closes.
5. **Midterm.** Seat loss mean near 37 below 50 percent approval and near 14 above, correlation near .66 against Gallup's table.
6. **Appointments.** Median confirmation 100 to 165 days, vacancy tail beyond a year for sub-cabinet posts, 30 percent vacancy in some departments after year 3 under divided Senate.
7. **Workforce.** A 10 percent contraction in 20 months must be possible; recovery to the prior level should take multiples of that.
8. **Checks latent.** Annual SD of change near 0.07 to 0.14 in quiet years; rare 0.2 to 0.3 breaks; breaks rarer with divided government.
9. **Trust.** Party-in-power flip moves each party's trust by 15 to 25 points within a year (Pew 2024 to 2025 data); overall level between 10 and 30 in the polarized regime.
10. **Laws per Congress.** Unified vs divided ratio close to the observed range 274 to 442 per Congress (National Archives), not a fixed target.

Run these as targeted checks at the stable integration checkpoint, per the repo's validation cadence.

---

## 9. Not done, not verified, and risks

**Not sourced this session (no number given).** Favorability series; issue approval series; investigation, special-counsel and impeachment counts; PolitiFact Trump-O-Meter; executive-order durability; Congressional Review Act use; CQ scores by President (only reported fragments); OPM FedScope and FEVS; a sourced workforce rebuild rate; WGI methodology definitions and the US LDI level; the WJP overall US score; election integrity US score; coverage of Taiwan, Kosovo and Palestine in the WGI and other indices; the Gallup series after Jan 2009.
**Reported but unopened (do not treat as established).** CQ support figures; Canes-Wrone and de Marchi details; Rubenzer et al. correlations; Piper and Lewis effect size; Gallup confidence in institutions; Gallup Economic Confidence Index range and extremes (plus 56 in Jan 2000, minus 72 in Oct 2008); TI US 2025 score and rank; Ballotpedia judicial nomination counts.
**Data caveats.** Gallup early-term series is sparse (polls every few weeks), so the monthly AR(1) is a lower bound on true persistence for early presidents and the first-difference tails are inflated by sparse sampling. Federal Register counts are by publication year. The Federal Register `significant` flag was not defined from a source. The FJC file includes 2025 to 2026 confirmations through its download date. FRED federal employment includes the Postal Service.
**Largest failure mode of this proposal.** Over-fitting a game to 2025 as the new normal. The breaks in the WGI series are real, but one President's year is a single observation of the break channel. The break parameters in 5.1 should be treated as scenario inputs the player can meet in either direction, not a forecast.
**Alternative considered and rejected for the core.** A single "efficacy" composite. It repeats the deleted `mandate` composite problem (the opinion.ts header explains why a mixed score misleads). Verdict: accepted with controls (derived readouts only, no composite), needs validation for the economy pricing, the workforce rebuild rate, and all trait bounds.

**Doc-sync note.** Adding nation-level governance fields or a `checks` latent touches the world schema and the authored-field consumer registry (`packages/world/src/dataset/stat-consumers.ts`), which requires entries in `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change. The existing engine files named here (`rulemaking.ts`, `order-review.ts`, `signing-window.ts`, `appointments.ts`, `congress-votes.ts`, `legislation.ts`, `pledge-outcomes.ts`, `press-scandal.ts`, `shutdown.ts`) were seen in the directory listing only; their contents were not audited.
