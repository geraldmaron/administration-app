# Law, courts, Congress and the limits of presidential power

Audited 2026-10-24. Probes: `packages/engine/src/__probes__/law.probe.test.ts` (15 tests: 3 sanity checks that pass, 12 breaks that fail as written). Run: `cd packages/engine && npx vitest run src/__probes__/law.probe.test.ts` (about 2 minutes; the term-volume probe is most of it).

## Verdict

The procedural machinery that exists is good: the War Powers clocks, the veto and impeachment arithmetic, and a district, circuit and Supreme Court path with a recusal-aware bench and an October-term calendar. The breaks are in what feeds it and in rules that went stale. Five findings matter most:

1. **Legal events barely exist.** A 197-week proxy term produced 3 court proceedings, 3 cases and 3 committee matters (9 in all). Courts hear only the 12 catalogued executive orders plus a few narrow matters, and an order is sued only if a coin flip lands (17% for border controls). Tariffs, force, emergencies, removals and directives can never be sued.
2. **Court speed is off.** A challenged order reaches its first interim ruling in week 7 and a final Supreme Court denial in week 13. A cert denial comes one week after the circuit judgment.
3. **Removal law is pre-*Slaughter*.** SEC and FTC heads are still "for cause", and the game refuses to let the President direct them.
4. **Section 122 can be re-imposed the day after its 150 days lapse**, which the game's own copy says only Congress can do.
5. **The Emergency Powers Limitation Act promises a 90-day sunset the engine never applies.**

## Sources opened this session

| Claim | Source (opened 2026-10-24) |
|---|---|
| *Learning Resources v. Trump*, 2026-02-20, 6-3: IEEPA authorizes no tariffs; CIT has exclusive jurisdiction; about $175B collected, remedies unaddressed; Section 122 proclamation followed (10%, then 15%) | https://www.jonesday.com/en/insights/2026/02/united-states-supreme-court-invalidates-ieepa-tariffs |
| *Trump v. Slaughter*, 2026-06-29, 6-3: FTC for-cause removal protection unconstitutional, *Humphrey's Executor* overruled; Fed not decided; *Trump v. Cook* same day denied the stay | https://www.venable.com/insights/publications/2026/06/supreme-court-overrules-humphreys-executor |
| Impoundment Control Act: 45 calendar days of continuous session on rescission proposals; deferral rules (2 U.S.C. 683-684) | https://www.govinfo.gov/link/uscode/2/683 (PDF text extracted locally) |
| National Emergencies Act: termination by joint resolution, six-month review, one-year continuation (50 U.S.C. 1622) | https://www.govinfo.gov/link/uscode/50/1622 (PDF text extracted locally) |

Search results only (page not opened): a second *Slaughter* summary set; uscourts.gov Table B-4 appeal durations (search returned only old, hard-to-read figures; not relied on).

Standard rules cited from memory and **unverified this session**: War Powers Resolution 50 U.S.C. 1543-1544 (the engine's constants match my recollection); Art. I, section 7 override at two thirds; Art. I, section 3 conviction at two thirds; Sup. Ct. R. 13 (90 days to petition for cert); Fed. R. Civ. P. 65(b) (TRO lasts at most 14 days); 19 U.S.C. 2132 (150 days unless Congress extends); 5 U.S.C. 403(b) as amended 2022; 28 C.F.R. 600.7. The "hundreds of suits per term" figure is **unverified**; I did not open a litigation tracker. The 2025 authority review (`docs/audits/2026-10-16-presidential-authority/`) already records several of these as backlog (BL-221 to BL-228).

## Controls table

Status: held / partial / lacks / contradicted. File:line is the evidence read.

| # | Control | Real rule or benchmark | Engine | Evidence |
|---|---|---|---|---|
| C1 | War Powers 48-hour report | 50 U.S.C. 1543 | held | `war-powers-report.ts:77` `REPORT_WINDOW_DAYS=2`; probe sanity test passes |
| C2 | WPR 60 days plus 30 certified | 50 U.S.C. 1544(b) | held | `war-powers-report.ts:79-80`; clock starts at report or due day (`:153`); cleared by AUMF (`:132`); sustained-force cost compounds (`:121`) |
| C3 | Veto override two thirds | Art. I s.7 | held | `congress.ts:65` `supermajorityOf`; `legislation.ts:216-244`; probe sanity: 67 and 290 |
| C4 | Impeachment: House majority, Senate two thirds | Art. I s.2-3 | held | `removal-votes.ts:134-161`; charter-gated |
| C5 | Filibuster 60, nomination cloture simple majority, reconciliation | Senate rules, Budget Act | partial | `congress.ts:69` three-fifths helper; `reconciliation.ts:14-19` five acts only. No Byrd rule (no content test, no sunset, no 3-per-year limit beyond one per subject per year) |
| C6 | Pocket veto | Art. I s.7; *Pocket Veto Case* | lacks | `signing-window.ts:14-16` says Congress never adjourns |
| C7 | Youngstown tiers | *Youngstown* (1952) | partial | `strike-odds.ts:140` forbidden goes to the ceiling (0.9); authorized cuts overreach by 45% (`:36`), so an authorized order still faces 15-39% odds. Silent is a flat function of a hand-set overreach number |
| C8 | Major questions, *Loper Bright* | *West Virginia v. EPA*, *Loper Bright* (2024) | lacks | No term. Strike odds read only `overreach x institutionalCheck x groundFactor` (`strike-odds.ts:143-145`). Economic significance does not move them |
| C9 | IEEPA tariffs barred | *Learning Resources* (2026-02-20) | held | `tariff-statutes.ts:7-12`; five statutes with findings, caps, clocks |
| C10 | Section 122: 150 days, 15% cap | 19 U.S.C. 2132 | contradicted | Cap held (`tariff-statutes.ts:68`); lapse held (`trade-effects.ts:159`); **re-imposition allowed day 160** (probe T1) |
| C11 | Tariffs are litigable | *Learning Resources* was such a suit | lacks | `tariff-orders.ts` has no review field; `courtProceeding` is written only from `orders.ts`, `statutory-matters.ts` and four narrow court modules. Probe T2 |
| C12 | Standing, venue, injunction, appeal | Art. III; Rule 65; 28 U.S.C. 1291 | partial | `judicial-review.ts:160-420` threshold, interim, merits, circuit panel, cert, argument. Timings wrong (L3). Party-specific relief after *CASA* is modeled (`state-judiciary` relief fields) |
| C13 | Court timeline | TRO within days; cert petition 90 days; merits in October term | partial | `court-calendar.ts:6-14` October term held. Interim week 7, final week 13 |
| C14 | Suit volume | Hundreds per term (unverified) | lacks | 9 legal events in 197 weeks (probe L4) |
| C15 | State AG coalitions | Standard plaintiffs on immigration, funding | lacks | `state-suits.ts:1-3` "writes nothing"; generic opened proceeding names no plaintiff (probe L2) |
| C16 | Challenge likelihood | High-salience orders sued nearly always | contradicted | `orders.ts:477-500` `challengeChance` 0.085-0.59 (probe L1: 0.17 border) |
| C17 | National Emergencies Act: annual continuation | 50 U.S.C. 1622(d) | held | `emergency.ts:23-90` 52-week lapse unless continued, 13-week notice window |
| C18 | NEA: Congress ends an emergency by joint resolution; six-month reviews | 50 U.S.C. 1622(a)-(b) | lacks | No legislative act terminates an emergency |
| C19 | Emergency Powers Limitation Act sunset | The act's own summary | contradicted | `legislative-acts.ts:335-352` summary promises 90 days; `constrains` carries only `blocksOrders`; `emergency.ts` never reads the statute book (probe E1) |
| C20 | Declared emergency needs a live cause | NEA | held | `emergency.ts:150` |
| C21 | Impoundment Control Act: rescission, 45-day hold, deferrals; GAO | 2 U.S.C. 683-684 | lacks | No rescission, deferral or impoundment object (probe C1) |
| C22 | Antideficiency Act / shutdown | 31 U.S.C. 1341 | held | `shutdown.ts`, `funding.ts` |
| C23 | Debt limit, X-date, extraordinary measures | Treasury practice | held | `debt-limit.ts:62-90`, sourced to Treasury 2026-09-22 |
| C24 | Appropriations riders, power of the purse | Art. I s.9 | partial | Only the fixed catalog of acts can be passed; no free-form rider |
| C25 | Independent-agency removal | *Slaughter* (2026-06-29) | contradicted | `institution-catalog.ts:161` `for-cause`, comment at `:149` "what independence *is*" (probes R1, R2) |
| C26 | Fed governors for cause with process | 12 U.S.C. 242; *Cook* (2026-06-29) | partial | Chair unreachable, governors unreachable via `removeOfficer` (reads `offices[0]`, `career-incumbents.ts:277`); documented in 2025 review R8 |
| C27 | Directive to DOJ is a norm, not a statute | 28 U.S.C. 509 vests functions in the AG; contacts policy | contradicted | `directives.ts:209-217` (probe R3) |
| C28 | IRS audit directive barred | 26 U.S.C. 7217 | held | `directives.ts:218-225`; probe sanity passes |
| C29 | IG removal: 30 days plus case-specific rationale | 5 U.S.C. 403(b) as amended 2022 | partial | 30 days held (`oversight.ts:177`); any non-empty reason accepted (`inspectors-general.ts:279`; probe R4) |
| C30 | Special counsel: AG may countermand or remove for cause, with notice to Congress | 28 C.F.R. 600.7 | partial | `special-counsel.ts:21-28` "nobody supervises it"; AG dismissal is priced (`:211`) but no AG verb on the counsel. Code-read only |
| C31 | Vacancies Act actings | 5 U.S.C. 3345-3349d | contradicted | `appointments.ts:304-328` accepts any national, pending nominee may act. Code-read (2025 review R3); not probed |
| C32 | Insurrection Act, Posse Comitatus, 10 U.S.C. 12406 | Statutes; *Trump v. Illinois* (2025) | lacks | Only `locale-acts.ts` mentions it; BL-224 open. Not probed |
| C33 | Clemency, executive privilege, signing statements | Art. II | lacks | BL-227, BL-228 open. Not probed |
| C34 | Indictments, discovery, official misconduct as NPC events | DOJ practice | lacks | No indictment object for domestic officials (`grep` finds regime and world-effects only) |
| C35 | Strike-down consequences scale with the order | *Learning Resources*: refunds, price reversal | partial | `judicial-review.ts` (`STRUCK_DOWN_COST`, near the top) one flat `STRUCK_DOWN_COST` (standing -0.04, stability -0.03) for every order. Code-read only |

## Breaks

Severity is for world realism. "Reproduced" means the probe failed as written, with the observed number.

| ID | Sev | Break | Reproduced | Observed |
|---|---|---|---|---|
| L4 | Critical | No legal event stream | Yes | 197-week "reckless" proxy term: 0 orders signed, 3 proceedings, 3 cases, 3 committee matters; need at least 25 |
| T2 | High | Tariffs cannot be sued | Yes | 330 days under a 15% Section 122 tariff: 0 proceedings, 0 cases |
| L1 | High | Challenge odds for high-salience orders far too low | Yes | Border controls 0.170; entry suspension 0.442; emergency construction 0.594 |
| L3 | High | Court timing compressed | Yes | Filed week 0; interim ruling week 7 (limit 3); circuit judgment week 12; final cert denial week 13 (one week later, limit 4) |
| R1 | High | Commissions still for-cause | Yes | SEC and FTC chair `removal` = `for-cause` |
| R2 | High | Cannot direct a commission's enforcement | Yes | `directiveRefusal(SEC, "enforcement-posture")` returns a memo claiming removal only for cause |
| T1 | High | Section 122 re-imposable at once | Yes | Day 160: 0 live s122 measures, fresh 15% tariff accepted |
| E1 | High | Enacted 90-day sunset ignored | Yes | With the act in the statute book, emergency still active at 18 weeks (126 days) |
| C1 | High | No Impoundment Control Act | Yes | No order or act mentions rescission, impoundment or deferral of budget authority |
| R3 | Medium | DOJ directive auto-refused as if statute | Yes | `directiveRefusal(DOJ, "investigation")` cites 28 U.S.C. 509 and "does not open, close or direct a case" |
| R4 | Medium | IG removal accepts boilerplate | Yes | "changing priorities" accepted, `ok: true` |
| L2 | Medium | No state plaintiffs | Yes | Opposition governors exist at founding; opened proceeding for border controls has no matter and no named parties |
| X1 | Medium | Strike-down cost is flat | No (code-read) | One constant for all 12 orders |
| X2 | Medium | Special counsel unsupervised, no AG verb | No (code-read) | `special-counsel.ts:21-28` |
| X3 | Medium | Vacancies Act over-permissive | No (code-read) | `appointments.ts:304-328` |
| X4 | Low | No NEA joint-resolution termination, no pocket veto, no Byrd rule | No (code-read) | Absent from the acts catalog and `signing-window.ts` |

### Fixes

Model guidance follows the repo's tiering: opus for engine and integration-critical work, sonnet for scoped changes, codex for self-contained well-specified work, writers-room for content.

| ID | Fix | Model | Size |
|---|---|---|---|
| L4, L2, T2 | One litigation stream: every presidential act that carries a legal exposure (tariff, emergency declaration, removal, directive, force order, sanction) rolls a suit against a per-act, per-statute probability. Name plaintiff classes (state coalition, industry, NGO) from governors' party, affected cohort and sector. Generic `CourtProceeding` already supports a `matter`. Feed the CIT for tariffs | opus | L |
| L4 (volume) | Background docket of agency and non-presidential suits at a rate calibrated to a sourced tracker. Verify the benchmark first | opus design, sonnet build | M |
| L1 | Replace the single `overreach` scalar with per-order salience and a sourced base suit rate; keep the statute discount | sonnet | S |
| L3 | Retime: TRO within one week, preliminary injunction within four, circuit stay application within two, cert 90-day petition window, so the earliest cert denial is about 8 weeks after the circuit judgment. Keep the October-term merits calendar | sonnet | M |
| R1, R2, R3 | Flip commission chairs to at-will, keep Fed and adjudicatory bodies protected, route DOJ directives through the AG's willingness (comply, slow-walk, resign) with grand-jury, career-resignation and vindictive-prosecution exposure. Already BL-225 | opus (touches directives, cabinet, oversight) | L |
| R4 | Require a case-specific rationale (a named finding); generic text is refused or filed as unlawful with suit exposure | sonnet | S |
| T1 | Refuse a Section 122 tariff within the sunset window of a prior one on the same partner unless an enacted act extends it | codex | S |
| E1 | Make `underDeclaredEmergency` and `hasLapsed` read the enacted limitation act; add a Congress-termination act (NEA 1622) with veto exposure | sonnet | M |
| C1 | Rescission and deferral object with 45-day hold, impoundment exposure to GAO and the courts, funds release by default at day 45. Already BL-227 | opus | L |
| X1 | Scale strike-down cost by the order's economic reach and add its market and foreign consequences (refund liability for tariffs) | sonnet | M |
| Suit and scandal content | Authored plaintiff voices, rulings and press for the new stream | writers-room | M |

## What I did not check

- Real figures for lawsuits per term, TRO and appeal durations, and cert practice: I could not open a litigation tracker or a clean uscourts.gov table. Thresholds in L1, L3 and L4 are conservative floors, not measured benchmarks.
- Second *Slaughter* and *Cook* details (vote lines beyond the two pages opened), and every WPR, veto, impeachment and Rule 65 citation, are from memory or the 2025 review.
- Behavior probes for the Vacancies Act, Fed governor removal, special-counsel countermand, pocket veto, Byrd rule, Insurrection Act, clemency and executive privilege (code-read or backlog-only).
- Whether the court bench's ideological split matches the real Court (the dataset is fictional by design).
- Subpoena, contempt and committee-inquiry behavior (`oversight.ts`, `committee-inquiry.ts`): read only for structure.
- A planned defiance of a final court order: the engine has only "accept lower judgment" as a default; I did not test for a defiance path.
- Only one seed (`law-probe-1` to `-3`) and one proxy; the term-volume figure is one run, not a distribution.
