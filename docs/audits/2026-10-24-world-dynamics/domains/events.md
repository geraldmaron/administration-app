# Domain audit: event stream, legal matters, engagement and coverage

Date: 2026-10-24. Probe file: `packages/engine/src/__probes__/events.probe.test.ts` (34 tests; 26 failed and 8 passed on the full run, `--reporter=verbose`, 775 s). Failing means the realistic expectation was not met, so each failure is a reproduced break. A later partial rerun (6 tests, after tightening three regexes and the New York test) is noted where it changed a number.

## Bottom line

The engine holds the weather side of the home event stream well: significant acute conditions open at home about 4.7 times a year (design target 4 to 8), are placed in the right states, are seasonal, and trigger Stafford requests, claims and Desk matters. Everything else the owner named is thin or absent. Of the five hostile-reviewer areas:

1. **Breadth.** Cyberattack, terror or mass-casualty attack, labor strike, bank failure, mass shooting and hostage-taking have no world-event generator at home. Zero appeared in three idle four-year runs. They exist only as authored scenarios the director draws on class weights, with no base rate behind them. Hurricanes, heat deaths and event severity are far from the record.
2. **NPC-to-NPC domestic events.** Only cabinet leaks exist. No governor-versus-legislature, Fed, primary-challenge or congressional-investigation events were generated. No person except a judge can die, so no cabinet, Congress or foreign-leader mortality exists.
3. **Foreign body churn.** Withdrawals from BRICS, OPEC+, the GCC and the EU run 20 to 30 times the record.
4. **Engagement.** A player who defers everything is stopped about 9 times per 30 days, median 3 days apart. One recurring "removal" summons is 27% of all stops against a President who did nothing.
5. **Variety.** Seeds diverge well (Jaccard 0.17) and all 18 classes stage within two years, but a player who answers everything meets the same scenario twice 44 times in 135 answers.

## A. Research: controls and real-world benchmarks

Only URLs I opened are cited. "Unverified" means I have no opened primary source.

| ID | Control (what should govern the game) | Real-world rule or benchmark | Source status |
|---|---|---|---|
| C1 | A governor, not the President, starts a major-disaster declaration, on a finding that response is beyond state and local capability, with a state emergency plan executed and cost-share certified | 42 U.S.C. §5170: request "shall be made by the Governor"; finding of "beyond the capabilities of the State and the affected local governments"; the page sets no deadline (a 30-day rule lives in 44 CFR §206.36, not opened) | Opened: https://www.law.cornell.edu/uscode/text/42/5170 . The 30-day figure is unverified. |
| C2 | Declaration volume is on the order of 40 to 65 a year, and most are storms, floods, fire and hurricanes | CRS: 1953 to 2014 average 35.5 a year; 2000 to 2009 average 57.1; most recent ten fiscal years average 63 (CRS IF12834, Dec 2024) | Partly from search snippets; IF12834 opened but gave decade averages only: https://www.everycrsreport.com/files/2025-01-02_IF12834_8e92084caee09d739a9898808ab4d0cc794ff499.html . Share by incident type: not retrieved. |
| C3 | Heat is the deadliest weather hazard, but it is rarely a declared disaster | About 2,300 US death certificates mentioned excessive heat in summer 2023, most in 45 years of records, and the true toll is probably higher (AP analysis of CDC data) | Search result only, not opened (secondary). Treat as approximate. |
| C4 | Tornado deaths and counts concentrate in the Plains and Southeast, not the Northeast | Storm Prediction Center averages 2003 to 2022: Texas 124 tornadoes a year, Kansas 87 (via The Weather Channel) | Search result only. The state shares are unverified. |
| C5 | Hurricane landfalls are about one to two a year with Florida taking the largest share | NHC climatology page did not carry figures (they are in an NCEI poster image) | Unverified. The probe's bound of 1 per year is deliberately conservative. |
| C6 | Event severity is heavy-tailed | General property of disaster loss data. No figure opened. | Unverified. |
| C7 | Bank failures are rare and lumpy | FDIC: 4 (2020), 0 (2021), 0 (2022), 5 (2023), 2 to 4 (2024, sources conflict), 2 (2025); median 7 a year since 1933 | Opened https://www.calculatedriskblog.com/2025/01/two-bank-failures-in-2024.html (2023 and 2024 only); other years from search snippets. |
| C8 | Major labor stoppages (1,000+ workers) run in the tens per year | BLS: 31 began in 2024, 33 in 2023, 30 in 2025; 2006 to 2025 average 17.8 | Opened https://www.bls.gov/news.release/wkstp.htm (2025 and average); 2024 and 2023 from search. |
| C9 | Coups: a few attempts and about 1.65 successes a year | RAND Forecasting Initiative reading of Powell and Thyne, 1960 to 2023: 1.65 successful a year; five successful in 2021, most since 1999 (Axios) | Search results only. |
| C10 | International bodies rarely lose members | OPEC exits: Ecuador 1992 and 2020, Indonesia 2008 and 2016, Qatar 2019, Angola 2024, UAE announced 28 April 2026 | Opened https://www.newarab.com/news/which-other-countries-have-left-opec-uae-announces-exit . BRICS and GCC "no exits to date": unverified. |
| C11 | Supreme Court decides roughly 56 to 67 argued cases a term | OT2024: 56 signed opinions after argument (SCOTUSblog column), 58 in the Harvard Law Review table, 67 by Ballotpedia's count | Search results only; the stat pack URL returned 404. |
| C12 | Judges and members of Congress die in office at life-table rates | CDC life tables are already used by the engine for justices (`judicial-vacancies.ts:11`). Congress deaths: Wikipedia lists exist; no count retrieved. | Unverified for counts. |
| C13 | Cabinet and senior staff turnover is substantial each term | Tenpas (Brookings): A-team first-year turnover 34% (Trump 2017), 8% (Biden 2021), 9% (Obama); a WRAL piece cites 71% (Obama first term) and 63% (Bush) | Search results only; secondary and partly inconsistent. |
| C14 | Sovereign debt crises are a few per year | About 3 to 9 sovereign defaults a year in recent ratings records | Unverified. I did not open a rating-agency source. |
| C15 | A mass shooting (4+ shot) happens hundreds of times a year | Gun Violence Archive: 600+ a year 2020 to 2023; 414 in 2019; 2024 the lowest since 2019 | Search results only. |
| C16 | Inaction is an act; clocks are real; no silent skip | DECISIONS §3.4, §3.5 | Internal rule. |
| C17 | World stops on a reason in days, never a count; salience fires on change | DECISIONS §2.2, §5.16 | Internal rule. |

Not researched, for time: CIRCIA/IC3 cyber reporting, UCDP, GTD terror base rates, PHEIC frequency, FOMC and Fed removal law (the 2025 to 2026 court posture is recency-sensitive and unverified), governor veto-override statistics, congressional primary-challenge rates.

## B. Map: does the engine hold each control

Status: held / partial / missing / contradicted.

| ID | Control | Status | Evidence |
|---|---|---|---|
| C1 | Governor-initiated Stafford path | **Partial** | A request, a President-only declaration, and four prerequisites exist (`stafford.ts:9-38`, `obligations.ts:140`). All three of `responsePlan`, `resourcesCommitted` and `costShareAccepted` are hardcoded `true` and `beyondStateCapacity` is `severity >= 0.5`. A nation-scope acute condition files a request in all 51 states, including a heat wave (probe: 51). The file's own comments say heat is rarely declared. |
| C2 | Declaration/condition volume | **Held** | `HOME_DISASTER_ONSET_RATE = 0.06` (`condition-onset.ts:112`) gives 4.67 acute conditions a year (probe, 3 seeds). Place mass is mostly cities (`condition-onset.ts` SCOPE_CUTS). |
| C3 | Heat deadliest, rarely declared | **Contradicted** | `heat-wave` fatality rate `.00002` (`impact-catalog.ts:15`) gives 0.17 deaths a year at home against about 2,300. Tornado gives 68.6 a year, close to the long-run record (unverified). |
| C4 | Hazard geography | **Partial** | State gate is sourced (`state-hazards.ts`; hurricane excludes AR, KY, MO, OK, TN). Within the gate, placement is by population (`us-placement.ts:89,93`), so about 10% of city-scope tornadoes land in New York City (0.098 on the rerun; 0.117 for the state in the first run). Hazard frequency per state is not used. |
| C5 | Hurricane frequency | **Partial** | Seasonal weighting exists (`condition-seasons.ts`). Frequency is exposure times a small rate: 0.33 cyclones a year at home (0, 1 and 3 over four years in the three seeds). |
| C6 | Heavy-tailed severity | **Missing** | `severity = 0.3 + next() * 0.4` (`condition-onset.ts:662`). Over 4,000 draws: min 0.3001, max 0.69999. No Katrina-class tail, no trivial tail. |
| C7 | Bank failures | **Missing** | No generator at home. The corpus has an economy arc about a bank run, authored. Zero in three idle runs. |
| C8 | Labor strikes | **Missing** | Zero in three idle runs. `laborPressure` exists on sectors but no strike event reads it (not traced further). |
| C9 | Coups | **Partial** | A weekly hazard exists (`foreign-politics.ts:242`, comment claims "handful a year"). Measured: 0.083 a year (one "overthrown" headline in twelve world-years) against about 1.65 successful a year. |
| C10 | Stable memberships | **Contradicted** | `withdrawal()` (`world-events.ts:228`) runs each 13 weeks (`:166`) for any member with mean trust at or below `-0.05` (`:170`). Per four-year run: OPEC+ 14, BRICS 7, EU 6, GCC 4, AU 1 exits. Admissions are 2 (EU). Roster is monotonically eroding. |
| C11 | Court dockets | **Partial** | The Supreme Court calendar, votes, opinions, circuit and district panels and recusal exist (`court-calendar.ts`, `judicial-review.ts`, `court-votes.ts`). Cases arise only from the President's orders or specialized matters. `judiciary` holds 2 cases after four idle years. There is no independent docket of ~60 merits cases a term. |
| C12 | Mortality of officials | **Contradicted** | Only `judicial-vacancies.ts:75` ever writes `alive: false`. Dead people after four idle years: 0, 0, 0 of 8,067. `foreign-politics.ts:456 deathInOffice` can only fire if someone else sets `alive: false`, so it never fires. No President, VP, cabinet, member, governor or foreign leader dies. |
| C12b | Judicial vacancies | **Partial** | Life-table mortality is sourced (`judicial-vacancies.ts:11-35`), but 179 circuit and district seats produce 2 to 3 vacancy headlines in four years. Pace is low against a bench of that size (benchmark unverified; the probe floor of 10 in four years is a judgment). |
| C13 | Cabinet turnover | **Partial** | Passive president, 197 weeks: 6 resignations, 2 challenges, 9 leaks. Passes the probe's floor of 6. `cabinet.ts:33` still states "about three departures a term" for a 16-seat cabinet. Order of magnitude is acceptable, at the low end. |
| C14 | Sovereign crisis rate | **Contradicted (unverified benchmark)** | 20.8 fiscal-crisis spells a year worldwide; energy-shortage 20.4 a year. The condition may be softer than a default, but 3 to 7 per capital per decade is not credible for fiscal-crisis. |
| C15 | Mass shootings, terror, cyber, hostage at home | **Missing as events** | Zero feed items in three idle runs for each. They exist as authored scenario classes (terror 11, hostage 6, technology 11 of 330) the director draws; no engine record, base rate, or institutional response path sits behind them. The operator `cyber-crew` (`operators.ts:57`) never struck the US in these runs. |
| C16 | No silent skip, real clocks | **Held** | Cases and defaults (`case-defaults.ts`), deferral rules (`attention.ts:216`). Not re-probed. |
| C17 | Stop on a reason; fire on change | **Contradicted for removal and re-raises** | `removalDue` (`due-executive.ts:347`) returns a hard interruption whenever pressure sits within `RUNG_REACH = 0.08` (`:343`) of the next rung. It is a standing condition, not a change. 30 of 110 stops in year one. Deferred soft matters return after 14 days and hard after 7 (`attention.ts:216-219`) at up to 3 per stop (`:97`). |

Other facts mapped and found sound: scenario dedupe by subject, actor, locale and institution (`attention.ts` `collidesWith`); coup stops (`foreign-politics.ts:639`); guarded condition-lifetime hysteresis; sourced court-vacancy life tables.

## C. Breaks (reproduced)

Format: id, severity, expected, observed, mechanism, fix, who builds it. All numbers come from the probe runs (seeds `ev-1` to `ev-3`, 208 weeks idle; production store loop with desk and scenario sources for engagement).

### BR-01 No mortality for anyone but judges (critical)
- Expected: the President, Vice President, cabinet, members of Congress, governors and foreign leaders die in office at life-table rates. Congress alone loses a few members a year.
- Observed: 0 of 8,067 people dead after four idle years in each of three seeds.
- Mechanism: `judicial-vacancies.ts:75` is the only writer of `alive: false`. `foreign-politics.ts:456 deathInOffice` and `succession.ts nextInLine` have no producer. The "death" scenario class (11) has no engine event behind it.
- Fix: a weekly mortality phase using the same CDC table already in `judicial-vacancies.ts`, applied to every living office-holder, with succession already built (VP, Speaker, acting heads, special elections, vacancies in Congress). Needs a design decision on the President's own death (end-of-campaign vs succession epilogue).
- Model: **opus** (touches succession, Congress seating, appointments, saves, doc sync).

### BR-02 Whole classes of event have no generator (critical)
- Expected: cyberattack, terror or mass-casualty attack, mass shooting, labor strike, bank failure, hostage-taking each appear at home at a base rate, with an institutional response path.
- Observed: zero of each across three idle four-year runs (headline search, `United States` required).
- Mechanism: `ACUTE_CONDITIONS` has nine natural or health kinds (`condition-kinds.ts:15-29`); `STANDING_CONDITIONS` are macro. Incidents exist only for tornado and heat (`INCIDENT_KINDS`, `:99`). Cyber crews attack abroad. The corpus carries authored matters of these classes, drawn on class weights, with no world-state cause.
- Fix: add event families as `incident` records (the lifetime flag exists) with sourced weekly rates: bank failure (FDIC, median 7 a year, lumpy), major work stoppage (BLS 17.8 average, 30 recent), mass shooting (GVA 400 to 650), significant cyber incident (CISA/IC3 data to fetch), domestic terror (START/GTD to fetch), hostage/wrongful detention (SPEHA record to fetch). Each needs: trigger gates read from state (laborPressure, bank stress, counterIntel), response path, Desk matter, ripple.
- Model: **opus** for the family design and Condition integration; **codex** per family once the shape is set; **writers-room** for scenario readers.

### BR-03 No NPC-to-NPC domestic events (high)
- Expected: governors vs legislatures, Fed independence fights, primary challenges, congressional investigations and indictments appear without the player.
- Observed: governor-vs-legislature 0, Fed 0, primary 0, subpoena/investigation 0 (rerun with tightened patterns). Only cabinet leaks pass (5 hits, "traced as the source of a leak"). The first-run passes for governor and Fed were false positives from loose patterns ("every statehouse holds the party that held it").
- Mechanism: governors exist as standing and consent terms (`governors.ts`); Congress acts on bills (34 bills in four years, mostly continuing resolutions); no phase makes NPCs fight each other.
- Fix: a domestic-actor phase with willingness stamps (the same `weigh()` machinery foreign capitals use) for state-federal and branch conflict; wire primaries into the existing election calendar.
- Model: **opus** (new subsystem and doc-sync), **sonnet** for the feed articles.

### BR-04 Foreign body membership erodes (high)
- Expected: at most one or two exits per body in four years (OPEC+ three in eight years; BRICS none).
- Observed, max per body in a run: OPEC+ 14, BRICS 7, EU 6, GCC 4. Admissions: 2.
- Mechanism: `world-events.ts:166-170,228-251`. Every 13 weeks, any member whose mean trust to the others is at or below `-0.05` can leave. There is no cooldown per body, no cost, and no cause tied to a dispute. Trust across hundreds of members sits near zero so the gate is always open.
- Fix: per-body cooldown (about 2 years), require a sourced grievance (conflict with another member, quota dispute, sanctions), raise `LEAVER_TRUST`, make accession and withdrawal symmetric.
- Model: **sonnet** (scoped).

### BR-05 Engagement drowns a deferring player (high)
- Expected: a stop earned by change; stops per month in single digits for an active presidency, with fortnights of quiet possible (the pacing test in `attention-pacing.test.ts`).
- Observed (lazy player: defers every presented matter, then Continue, 365 days): 110 stops, 9.04 per 30 days, median 3 days between stops, longest 11. 55 of the 110 present a scenario. A player who answers everything for two years answered 135 scenarios, about 5.6 a month.
- Mechanism: re-presentation after deferral (`attention.ts:216-219`), plus BR-06. Hard returns after 7 days, soft after 14.
- Fix: stop on arrival and on deadline crossing only; a standing proximity is ambient. Collapse an unchanged deferred matter into the Desk list. Measure stops per month in the balance harness and gate it.
- Model: **opus** (loop contract, doc-sync surface `AttentionStop`).

### BR-06 Removal-case summons stops a President who has done nothing (high)
- Expected: pressure proximity is a standing reading and does not interrupt every week.
- Observed: 30 of 110 stops (27%) in year one are `summons:removal-beat`, hard, source "investigation".
- Mechanism: `due-executive.ts:343-357`: hard whenever pressure is within 0.08 of the next `BEAT_THRESHOLDS` rung, with no edge detection. DECISIONS §5.16 says salience fires on change.
- Fix: fire when a rung is crossed or newly approached (one-shot per rung); then ambient.
- Model: **sonnet**.

### BR-07 Scenario repeats (medium)
- Expected: a scenario does not return within 90 days; repeats of the same def are rare.
- Observed (answers-everything player, two years): 135 answered, 44 ids answered a second time (e.g. `the-border-road-contract` and `the-registrar-who-wont-sign` three times), 9 within 90 days. Variety across seeds is good (Jaccard 0.17, 41 vs 29 ids), and all 18 classes staged.
- Mechanism: `once: false` recurrence plus a corpus of 330 against 5.6 a month. Not traced further.
- Fix: raise the recurrence floor for non-`once` defs and grow the corpus (NEEDS.md targets 1,500+); writers' room. Dead-branch readers are in NEEDS.md.
- Model: **writers-room** (content), **sonnet** (floor).

### BR-08 Hazard calibration at home (high)
- Heat: 0.17 deaths a year against about 2,300 (secondary source). `impact-catalog.ts:15`. Fix: per-hazard fatality rates fitted to CDC WONDER and NWS data; keep heat undeclared. **sonnet** after data pull.
- Hurricanes: 0.33 a year (0, 1, 3 in three seeds). Real rate is higher (unverified; floor of 1 chosen). Probably exposure value for USA cyclone times 0.06 times seasonal weights. **sonnet** after checking `geo.disasterExposure.cyclone` for USA.
- Severity: uniform 0.3 to 0.7 with no tail (`condition-onset.ts:662`). Fix: heavy-tailed draw, capped. **opus** (feeds approval and budget calibrations).
- Placement: population weighting inside the hazard gate puts 9.8% of city-scope tornadoes in New York City. Fix: weight by hazard frequency per state, with city weight by area, not population. **sonnet**.
- Impact catalog is flagged provisional with `sourceRefs: []` (`impact-catalog.ts:5`). Contradicts DECISIONS §4.11. **sonnet** to fill from FEMA, NWS, CDC.

### BR-09 Stafford request filed for every acute condition in every state at nation scope (medium)
- Expected: only affected states file, and a heat wave files none.
- Observed: 51 requests for a nation-scope heat wave; all four request prerequisites hardcoded true.
- Mechanism: `obligations.ts:101-146`. `statesOwedBy` returns `STATE_IDS` for any nation-scope condition.
- Fix: restrict to the states the condition touches; make the beyond-capacity finding a function of severity and the state's own capacity; exclude kinds FEMA does not declare.
- Model: **sonnet**.

### BR-10 Disaster content has no reader for the commonest home hazards (medium)
- Expected: every acute kind that can open at home has authored scenarios gated on it.
- Observed: `cyclone`, `wildfire`, `tornado` have none (15 disaster scenarios gate on flood, drought, earthquake, winter-storm). Of 15 public-health scenarios, 8 (53%) need a pandemic, which opens at home well under once a decade. Those hazards still produce a Desk governor-request matter, so they are not silent.
- Fix: writers' room cells (NEEDS.md: disaster routine, public-health routine).
- Model: **writers-room**.

### BR-11 Fiscal crises and coups at wrong frequency (medium)
- Fiscal-crisis: 20.8 spells a year worldwide (benchmark unverified; ratings-agency default counts to confirm). Coup: 0.083 a year vs about 1.65 (RAND); the code comment claims a "handful a year".
- Mechanism: `STANDING_ONSET_RATE = 0.06` times pressure (`condition-onset.ts:370`); `COUP_REGIME_WEIGHT = 0.006` (`foreign-politics.ts:242`).
- Fix: measure, then retune against a sourced count. Balance run needed.
- Model: **sonnet**.

### BR-12 Independent legal docket absent (medium)
- Expected: the Supreme Court rules on about 56 to 67 cases a term whether or not the President acted; lower courts rule on state laws and challenges to Congress.
- Observed: after four idle years `judiciary.cases` has 2 entries (both specialized matters). Rulings feed on the President's orders.
- Fix: seed a docket of NPC litigation (states vs states, challenges to statutes, civil rights) whose rulings change the law the sim reads. Large; coordinate with the law/judiciary domain agent.
- Model: **opus** design, **codex** for the writers.

### Held (probes that passed)
- Acute conditions at home 4.67 a year.
- Cabinet turnover (passive): 8 breaks plus 9 leaks in 197 weeks.
- Scenario variety across seeds and class coverage over two years.
- Every 30-day window has a stop or ambient event (idle weeks change the world).
- Cabinet leaks appear unprompted.

### Not a break, reported
- Reckless president through the balance harness broke zero scandals in 104 weeks (probe floor of 1 a year failed). Passive broke 5 in 197. The reckless profile reaches for heavy instruments and never staffs; either scandal origins are not tied to those acts, or the profile does not trigger them. Floor is a judgment; treat it as "to investigate".

## D. Recommended order

1. **BR-05 and BR-06 together** (opus + sonnet): they are the player's first-hour feel and a single contract.
2. **BR-04** (sonnet): scoped, mechanical.
3. **BR-01** (opus): foundation for succession, deaths, special elections, scenario readers.
4. **BR-02, BR-03** (opus design, codex implementation): the largest content gap; build one family end to end first (bank failure or mass-casualty incident) and use it as the template.
5. **BR-08, BR-09, BR-11** (sonnet): calibration pass with sourced data pulled first.
6. **BR-07, BR-10** (writers-room): ride on NEEDS.md.

## E. Not checked

- Ripples between the event stream and relationships/commodities (Hormuz) — other domains and existing tests (`commodity-hormuz.test.ts`, `person-network-influence.test.ts`).
- Person-network influence (well-connected targets move more): not probed here.
- Hyperactive campaigns beyond one reckless and one passive seed; no multi-seed variance on scandals or cabinet breaks.
- The engagement runs imported `player-core` and `content` from source while those packages import `@admin/engine` from dist. I did not check whether dist matches source.
- The answering player picks the first reply every time and applies the reply packet, so flag-gated content (106 of 330 scenarios gate on flags) gets only the flags that first replies set. Dead-content counts from this are floors, not measurements; I report no dead-content number.
- Seeds ev-1 to ev-3 only for idle runs; ev-1 and ev-2 for lazy engagement; ev-1 for answering. Single-seed numbers (stops per month, repeats) have no variance estimate.
- Scenario craft, rule text realism, impact numbers for individual scenarios.
- Whether the scoring weights for legal outcomes (strike-odds, court votes) match real reversal and cert rates.
- Foreign domestic legal matters, hostage cases abroad, terror abroad.
- The Stafford 30-day request window (44 CFR 206.36) and cost-share (75% federal floor) were not verified from a primary source.
- Mass-shooting and bank-failure frequencies come from search snippets, not opened primary data.
