# Lane: people and succession (Wave 2)

BL-291 (BR-01). Branch `lane/wd-succession`, based on `3c2ecd43d`.

## What changed

1. **Officeholder mortality** (`officeholder-mortality.ts`, new). The 2024 CDC/NCHS period life table (NVSR vol. 75 no. 5, August 25, 2026, table 1, total population, ages 18 to 99) is the one table both hazards read. `lifeTableQx(age)` replaces the judges' private copy, which covered ages 45 to 95 only.
   - **Who is drawn:** every occupied modeled office, once per person: the 535 members of Congress (not a seat already vacant), the 50 seated governors, the cabinet except the President's own chair, and the seated head of government of every other nation (`occupiedOffices`). Nobody without an office is drawn.
   - **Who is not:** the President (no random player death; see the rule below), the Vice President (filling that office is the Twenty-fifth Amendment's section 2 nomination, not modeled), and judges, who keep their once-a-year draw in `judicial-vacancies.ts` with its own `.2/.25/.6` adjustments. A test proves no judge appears among the drawn.
   - **The rate:** `qx(age) × OFFICEHOLDER_MORTALITY_RATIO`, with the ratio 0.35, measured: 16 members of Congress died in office from January 2021 to October 2026 (2.75 a year), against 7.76 a year the table predicts for the ages of the 539 people now seated (current Wikipedia rosters with birth dates). The same ratio puts the cast's 195 foreign heads of government at about 1.2 deaths a year, under the 1.8 a year heads of state and of government together died in office of natural causes since 2000 (49 of 64 listed). No sex field exists on `Person`, so the total-population column is used, as the judges already did.
   - **The draw:** one keyed stream per person and calendar year, `("officeholder-mortality", person, year)`: one draw for whether, one for the day. The death fires in the week whose window holds that day, so deaths do not cluster in January. Whether the person still holds the office is asked that week, so leaving office first means not dying in it. Nothing is stored.
2. **Succession** (`succession.ts`, `officeSuccessionPhase`). One record per change, carried through the week so a second change reads the first.
   - **House:** the seat stays on the roster with `vacancy` and the late member's id, counted as no vote, so the roll call loses the member the day they die. A special election fills it 125 days later (the median of the 36 death-caused House specials since 2001; IQR 90 to 170), or at a federal general election that comes first and is at least 57 days out (the shortest observed gap). The seat's party holds: 13 of 106 House specials since 2001 changed party, and districts carry no lean to decide the rarer flip.
   - **Senate:** state law from NCSL, "Vacancies in the United States Senate", updated 2026-07-29 (`vacancy-law.ts`). Thirty-five states appoint until the next statewide general election (eleven of them with a same-party rule: AZ, CO, HI, KS, MD, MT, NV, NC, UT, WV, WY); fifteen hold an expedited special, four with no interim appointment (KY, ND, RI, WI) and Connecticut treated the same. Appointment comes 10 days after the death (median of seven appointments 2007 to 2023, range 2 to 30). The appointee takes the governor's party unless the law requires the vacating senator's, and holds the seat until the special election the law dates, where the state's lean decides outside a six-point contested band in which the holding party keeps it. A change of party moves the chamber count, the state's delegation and the roster together.
   - **Posts:** after any seat change the leadership and the panels are reseated by `seatLeadership` and `withCommittees`, the writers an election uses, so a late Speaker or chair is replaced from the chamber and a Senate that changes majority hands over its gavels.
   - **Governors:** the state's line of succession seats a successor of the governor's party for the rest of the term (`termEnds` kept). The narration names the officer: secretary of state in Oregon and Wyoming, the state senate's president in Maine, New Hampshire and West Virginia, its speaker in Tennessee, the lieutenant governor elsewhere (Arizona's first lieutenant governor is elected in 2026).
   - **Cabinet:** the chair empties and the department's deputy acts from the day of death through `deputyFor` and `actingEffects` (5 U.S.C. 3345(a)(1), with the 210-day clock from the vacancy). The President nominates through the existing pipeline (DECISIONS §4.12).
   - **Foreign leaders:** the death is written here and `foreign-politics.ts`'s existing `deathInOffice` seats the successor in the same week. A third of governments (69 of 194 in one founding) have no second person eligible for the chair, which left a dead leader in office for good, so `deathInOffice` now falls back to a stand-in: the governing party's strongest national in government, then any national in government, never a journalist or opposition leader.
3. **Two corrections found on the way.** `seatCongressMembers` reserved a seat for a dead leader or chair; it now reserves only the living. Judges under 45 and over 95 now read their own age's row instead of a clamped one.

### Files

- New: `packages/engine/src/officeholder-mortality.ts`, `officeholder-mortality.test.ts`, `vacancy-law.ts`.
- Owned: `succession.ts`, `succession.test.ts`, `congress-members.ts`, `congress-members.test.ts`, `foreign-politics.ts`, `foreign-politics.test.ts`, `judicial-vacancies.ts`.
- **Shared contract files edited:** `turn-phases.ts` (one import and one phase entry, `officeSuccessionPhase`, after `judicialVacancyPhase`, inside the day-5 group) and `turn-phases.test.ts` (the pinned order gains that id). No state type module, `save.ts`, `effects.ts`, `effect-types.ts`, `resolution.ts` or `index.ts` was edited. `CongressMember` lives in `congress-members.ts`, which this lane owns.

## Save migration

None needed. `CongressMember.vacancy?` and `CongressMember.electionDue?` are optional and JSON-safe; an old save has no vacancies. The phase writes them prospectively. A save-and-reload test keeps an open vacancy byte-equal.

## Proof

**Events probe, BR-01** (`events.probe.test.ts`, "lets someone other than a judge die in four years"; three idle 208-week runs on the production scheduler, `ev-1` to `ev-3`):

| | Before (`3c2ecd43d`) | After |
|---|---|---|
| People dead other than judges, per run | 0, 0, 0: **fail** | 16, 14, 19: **pass** |
| Judicial seats vacated per run (control) | 13, 15, 14 | 13, 15, 14 |

The judges' count is unchanged, which is the double-draw check on the production path: they are drawn only in `judicial-vacancies.ts`.

**Rate across seeds** (`officeholder-mortality.test.ts`): members of Congress the draws kill in one Congress, twelve seeds, nobody replaced, mean within 2.5 to 6.5 against the observed 3.6 a Congress (48 deaths, 2000 to October 2026) and 5.5 at the 2021 to 2026 rate; single Congresses ran from none (108th) to eight (110th). Expected value for the founded cast: about 2.1 a year (5.9 a year at the raw table, times 0.35).

**One idle run, `ev-1`, read off the ledger** (a temporary observer, deleted): nine House deaths, one Senate death, one governor, six foreign leaders in four years. Every House seat was filled by special election 109 to 138 days after the death (rule: 125, or the general election); the Hawaii Senate seat was filled by appointment the following week (a same-party state), and the appointee won the November 2032 special. One House seat emptied in the final week was still vacant at the end.

**Regression tests** (each in the module's own file):
- `succession.test.ts`: a House death leaves the seat vacant with the dated special, the late member's roll-call row is a no vote and a sweeping question loses exactly one yea; the special refills it with the same party and the count and composition return; the vacancy survives save and reload. Senate: governor's-party appointment where no party rule applies (the chamber count and the delegation move with it), same-party states keep the party, no-appointment states stay empty until the special, the appointee faces the voters on the date the law sets; per-state dates for Wisconsin, New York and California. A governor's successor keeps party and term; a Secretary's chair empties with an acting deputy; a foreign leader's death is read by the foreign week, which seats a successor.
- `officeholder-mortality.test.ts`: the table rows match the source; who is covered (535, 50, cabinet minus the President, every foreign chair); the President, the Vice President and every judge are never drawn; one keyed draw per person-year; each death falls in exactly one week.
- `congress-members.test.ts`: a change of party moves the chamber count and only then; candidates are living, unseated and ordered; a reseating fills a vacancy and keeps an appointee's election date.
- `foreign-politics.test.ts`: governments with no second candidate for the chair still get a successor in government.

**Tests updated because they encoded the old behavior:** `turn-phases.test.ts`, whose pinned phase order gains `officeSuccessionPhase`.

**Tests run** (targeted, per lane rules): the four owned files above plus `judicial-vacancies`, `turn-phases`, `turn-loop`, `appointments`, `committees`, `congress`, `congress-votes`, `elections`, `elections-calendar`, `foreign-leader`, `governors`, `hill`, `hill-tie`, `judiciary`, `war-outcomes-succession`, `advance`, `leader*`, `nomination*`, `press-foreign`, `save*` and `world-contract`. All pass except two that **fail identically at the base commit**: `congress-votes.test.ts` "names the acts with no domestic signature" (POL-4) and `hill-ledger-golden.test.ts`. `npx tsc --noEmit -p packages/engine` is clean; its `tsconfig.tsbuildinfo` was deleted. Not run, per lane rules: the build, workspace typecheck, lint, the full suite, the verify gates and the balance harness.

## Requests for other lanes

1. **Institutions lane (`cabinet.ts`, `appointments.ts`).** Add `"died"` to `CabinetDeparture` so a death can go through `vacates()`, the one path a chair leaves by, with its `cabinet-departure:died:<role>` flags. Until then `secretaryDied` composes the same three pieces `vacates` does (`{kind: "cabinet"}`, the person effect, `deputyFor` plus `actingEffects`) and writes no departure flag. Nothing else in `appointments.ts` is needed.
2. **Congress votes owner (`congress-votes.ts` and its callers of `majorityOf(seats)`).** The House and Senate decide by a majority of those voting, and the whole number of the House excludes vacancies. Here `required` is fixed at a majority of all seats, so an empty seat counts as a nay. Counting `required` against seated members would make a vacancy an abstention. Not changed here.
3. **Integration (probes).** `events.probe.test.ts` "lets someone other than a judge die in four years" asserts only a minimum of one. The rate this lane targets is in `officeholder-mortality.test.ts` ("kills a few members of Congress a Congress, inside the observed range, across twelve seeds"). The probe could add: Congress deaths per run, 4 to 16 across three four-year runs at 3.6 to 5.5 a Congress.
4. **Integration (golden).** `hill-ledger-golden.test.ts` moves, because members of Congress now die and are replaced during its campaigns. It needs a deliberate re-take at the integration checkpoint, with this cause added to its comment. It already fails at `3c2ecd43d` without this lane.

## Amendments for the integrator

**DECISIONS.md, new §4.13:**

> ### 4.13 Office-holders die at life-table rates; the President does not die at random
> A person in an occupied modeled office (a member of Congress, a governor, a cabinet officer, a foreign head of government) dies in office at the 2024 CDC/NCHS life-table rate for their age, scaled by the measured ratio for office-holders (0.35), drawn once per person and year on a keyed stream. Judges keep their own annual draw and are never drawn twice. Nobody without an office is drawn. Each office is then filled by its own lawful path: a House special election, a Senate appointment or special election under the state's law, the state's line of succession, an acting first assistant, or the foreign government's own succession. The President does not die at random, and neither does the Vice President.
> **Why:** No one but a judge ever died, so no seat ever emptied and no margin ever moved. A random death of the President would end a campaign the player did nothing to lose; adding one is a separate design change, and filling the vice presidency needs the Twenty-fifth Amendment's nomination path.
> **Where:** `packages/engine/src/officeholder-mortality.ts`, `succession.ts`, `vacancy-law.ts`, `foreign-politics.ts` (`deathInOffice`), `judicial-vacancies.ts`.

**SCHEMA.md, "Individual congressional seats and recorded votes", append:**

> `CongressMember.vacancy?` `{since, path: "appointment" | "special-election", fillsOn}` marks a seat its member left by dying. The roster keeps the late member's id, the seat's party and the chamber count unchanged until it is filled, and a roll call counts the seat as no vote. `CongressMember.electionDue?` is the day an appointed senator's seat goes to the voters. Both are optional; an old save reads none. A reseating at a new Congress fills a vacancy and keeps a retained appointee's `electionDue`.

**SCHEMA.md, "Judicial service and ordinary vacancies", append:** "The death hazard reads the shared life table in `officeholder-mortality.ts` with the judges' own adjustments."

**ARCHITECTURE.md, beside the `congress-members.ts` paragraph:**

> `officeSuccessionPhase` (`succession.ts`), after `judicialVacancyPhase`, draws deaths for every occupied modeled office from `officeholder-mortality.ts` and fills each office by its own path: `vacancy-law.ts` dates House specials and applies each state's Senate law, `withMember` keeps the roster, the chamber count and the delegation in step through a change of party, and `reseatPosts` reseats posts and panels with the election writers. Governors pass by the state's line of succession, Secretaries to an acting deputy, foreign leaders to `foreign-politics.ts`'s `deathInOffice`, which falls back to a stand-in in government where the cast drew no second candidate.

**PROGRAM.md:** BR-01's row can read "pass" once the integrator has re-run the probe on the merged tree.

## Left undone, with reasons

- **The Vice President** is not drawn (no §2 nomination path). **White House staff** (chief of staff, national security adviser, press secretary) and the **40 agency heads** are not drawn either; they have no succession path in this lane's files.
- **House specials never change party** (no district lean). **A governor's successor is always of the governor's party**, though 17 states elect the lieutenant governor separately and four seat a legislative leader.
- **Senate cutoffs stated against a state primary** are converted to days before November at that primary's usual month. Odd-year statewide elections (New Jersey, Virginia, Pennsylvania's municipal year) are not used as general elections.
- **No life table for other countries:** foreign leaders read the US table at the same ratio, checked against the world count rather than fitted to it. Violent deaths in office (15 of 64 since 2000) are not mortality; coups and the regime acts carry them.

## Wave 2R repair (on `d32595f27`)

Two defects from the Codex review, both fixed with regressions in `succession.test.ts` that fail on `d32595f27` and pass now.

**6. A defeated appointee kept a gavel or a leadership post.** `seatLeadership` (`hill.ts`) and `seatCommittees` (`committees.ts`) kept any living incumbent without asking whether they still held a seat. The new `holdsSeat(congress, person, chamber)` in `hill.ts` keeps a post holder only while they sit, unvacated, in the post's chamber; committee panels read it for the Senate. With no roster on file (an old save, or the founding before members exist) the post reads as held, as before. A departed holder's office role is then cleared by `withCongressMemberOffices`, which already strips congressional roles from anyone no longer seated. Regressions: an appointed committee chair and an appointed Senate leader each lose a special election; afterwards neither holds a post, both have no `currentRole`, and every chair and ranking member sits in the Senate.

**7. The office-day scheduler applied a death before its date.** The phase read the whole week to `weekCloseDate` but ran on office day five, so a death drawn for day six or seven was applied two days early. It now runs on the last office day, after `governancePhase` and before `foreignPoliticsPhase`, where the close is today under both layouts, so nothing is applied before its date. The keyed draws are unchanged. A day resolver in `day-step.ts` would date each death exactly, but `advanceTurn`, which the events probe drives, never steps the day resolvers, so BR-01 would read zero again. The cost is that a death drawn early in the week is applied at the week's close, up to six days late. Regressions: with Congress aged so a death falls on day six or seven, stepping `advanceOneDay` under `campaignTurnPhases(charter, true)` leaves the member alive on every day before the date and records the vacancy dated to it by the close. The office-day cut and the flat week give the same deaths and vacancies.

**Shared files:** `turn-phases.ts`, where the entry moved, and `turn-phases.test.ts`, whose pinned order moves with it; plus `hill.ts` and `committees.ts`, as authorized.

**Results.** The events probe still passes: 16, 14 and 19 deaths outside the bench, with judicial vacancies unchanged at 13, 15 and 14. These pass: `succession` (22 tests), `officeholder-mortality`, `congress-members`, `committees`, `hill`, `hill-tie`, `congress`, `congress-votes`, `elections`, `elections-calendar`, `governors`, `foreign-politics`, `judicial-vacancies`, `turn-phases`, `turn-loop`, `advance`, `harness-path-parity`, `week-identity`, `appointments` and `save`. The engine typecheck is clean, and its `tsbuildinfo` was deleted. **`hill-ledger-golden.test.ts` passes at `d32595f27` and fails with this repair**, because deaths now land at the week's close and unseated holders lose their posts. It needs a deliberate re-take at integration, with these two causes added to its comment.

## Wave 3 (BL-309, on `d2d7649f7`)

### (a) House specials can change party: done

- **Benchmark, recounted.** I re-opened the list I used before (Wikipedia, "List of special elections to the United States House of Representatives") and counted it row by row, comparing the vacating member's party with the winner's: **19 of 132** specials from 2001 to October 2026 changed party (0.144). The earlier "13 of 106" was a parser artifact: it dropped every row whose vacancy date it failed to read. The 19 are VA-4 2001, KY-6 and SD-AL 2004, IL-14, LA-6 and MS-1 2008, NY-23 2009, HI-1 and NY-29 2010, NY-26 and NY-9 2011, MI-11 2012, PA-18, PA-7 and PA-15 2018, CA-25 2020, TX-34 and AK-AL 2022, and NY-3 2024.
- **Lean source.** The dataset does carry district leans (`District.lean`), so state lean is not used as a stand-in. The odds read `seatLeans` in `house-seats.ts`, the same seat lean a general election reads: the authored district leans, shifted so each party's seats sit on its side. Those leans are a ranked spread, not a measured voting index (`packages/world/sources/district-holders/sources.md` says so). State lean is used only if a seat has no district, which never happens in the current data.
- **Model.** The holding party's margin is its edge in the seat's lean plus the national mood: approval minus 0.5, counted for the President's party and against the other. The flip chance is `1 / (1 + exp(margin / 0.15))`, with one keyed draw per vacancy (`"house-special"`, seat, date).
  - **Calibration:** across the House's 435 seats at even approval, the mean flip chance is 0.145, against 0.144 observed. The regression holds it within 0.108 to 0.18.
  - **Mood weight:** the strength of the mood term is a design reading, tested for direction only.
  - **Independents:** an independent-held seat never flips.
- **Consistency.** A flip moves the chamber count, the state's delegation (`house` count) and the roster together. The next January 3 reseating re-derives House seats by rank, as it already does, so the flipped seat's identity may move then. That is the existing seat abstraction (DECISIONS 5.3).

### (b) A governor's successor follows the state's rule: done

- **Source.** Wikipedia, "List of current United States lieutenant governors", Selection column, opened 2026-10-25. Seventeen states elect the lieutenant governor separately: AL, AR, CA, DE, GA, ID, LA, MS, MO, NV, NC, OK, RI, TX, VT, VA, WA. Twenty-six elect on a ticket with the governor, and Arizona joins them from its first, elected in 2026.
  - Tennessee and West Virginia make the state senate's leader lieutenant governor; Maine and New Hampshire pass the office to the senate president, and Oregon and Wyoming to the secretary of state ("Lieutenant governor (United States)").
  - I did not open a source saying that Oregon's and Wyoming's secretaries of state are elected statewide on their own.
  - The NLGA "Methods of Election" page did not render in the archive, so the Wikipedia column stands alone and is a secondary source.
- **Rule.**
  - **Ticket states:** the successor is of the governor's party.
  - **Every other state:** the successor won a separate statewide race or leads a chamber the state elects, so `specialElectionParty(state lean, governor's party)` decides. The state's lean wins outside a six-point band, and the governor's party holds inside it. A legislative leader's party is read from the state's lean, not from a modeled chamber majority.
  - **Narration:** says when the statehouse changes party.

### (c) The Vice President: not done, blocked on files outside this lane

A §2 vacancy (archives.gov text, opened: "the President shall nominate a Vice President who shall take office upon confirmation by a majority vote of both Houses of Congress") cannot go through the existing nomination path without changing files other lanes own. **The strongest failure mode:**
- The path needs an office on `INST-OVP`, which today has `offices: []`.
- Adding one makes the Office of the Vice President a career office, so `withCareerIncumbents` (`career-incumbents.ts`, which also runs on every save load) would seat a career bureaucrat as Vice President whenever the office is empty. That covers both a death and a founding with no running mate.

Doing it properly needs:
1. **`institution-catalog.ts`:** an `OFF-VP` office (PAS, Senate confirmation, no acting, term-protected, succession rank 1).
2. **`career-incumbents.ts`:** exclude `INST-OVP` from the career sweep and the political actings.
3. **`institutions.ts` / `OfficeDef`:** an additive `confirmedByBothHouses?: true`.
4. **`nomination-stages.ts`:** at the `vote` stage, require a House majority of the seated members as well as the Senate's when that flag is set.
5. **`institution-effects.ts#seatConfirmed`:** for `INST-OVP`, set `Campaign.vicePresident`, `currentRole: role-vice-president` and `congress.presidingOfficer` (`vicePresidentLiaison`).
6. **`appointment-eligibility.ts`:** the Twelfth Amendment's bar (no one constitutionally ineligible to be President), at least the age of 35.
7. **Player-core:** desk and organogram readers of the new office.

Once those land, this lane adds the Vice President to `occupiedOffices` and a death handler: vacate `INST-OVP`, clear `presidingOfficer`, and the Speaker becomes next in line, which `nextInLine` already does. **Until then the Vice President is not drawn, and the President never dies at random.**

### (d) White House staff and agency heads

- **Agency heads: done.** The 40 heads of bodies below the cabinet (`role-agency-head` leaders of offices the President appoints to) are now drawn.
  - **Vacancies Act offices (24):** the office empties and the agency's first assistant acts from the day of death through `actingEffects`.
  - **Boards (8):** they run on their quorum.
  - **Offices the law gives no acting:** they stay open until the President fills them.
- **White House staff: not drawn, by reason.** The chief of staff, national security adviser and press secretary are picked only at the founding (`founding-cast.ts`). `INST-NSC` has no office and the staff posts have no nomination or hire act in office, so a death would leave the post empty for the rest of the campaign.

### Files, proof and amendments

- **Files changed:** `vacancy-law.ts`, `succession.ts`, `officeholder-mortality.ts` and `congress-members.ts` (exports `caucusOf`), plus tests in `succession.test.ts` and `officeholder-mortality.test.ts`. No shared contract file and no file outside the lane.
- **Tests updated because they encoded the old behavior:**
  - The House special test asserted the party always holds; it now checks the count moves exactly when the party changes.
  - The governor test asserted the governor's party; it now expects the state rule's party.
  - The coverage count adds 40 agency heads.
- **New regressions:**
  - the flip calibration band;
  - ordering: close seat against safe seat, and a bad year for the President's party;
  - counts staying consistent through mass flips;
  - Vermont (separate) flips party against the grain, Ohio (ticket) holds, and Oregon passes to the secretary of state;
  - an agency death seats an acting under the Vacancies Act and none on a board;
  - staff are never drawn and all 40 heads are.
- **BR-01 probe:** 18, 14, 19 deaths outside the bench, up from 16, 14, 19 because agency heads are now drawn. Judicial vacancies are unchanged at 13, 15, 14. Pass.
- **Targeted tests:** 22 files, 390 tests, all pass.
- **Hill golden:** `hill-ledger-golden.test.ts` already fails at `d2d7649f7` and still fails. I did not re-take it.
- **Save migration:** none. No stored shape changed.
- **Amendment, DECISIONS 4.13:**
  - **Change** "Each office is then filled by its own lawful path: a House special election, ..." to read: "a House special election (which may change party, on the seat's lean and the national mood, calibrated to 19 of 132 specials since 2001), a Senate appointment or special election under the state's law, the state's line of succession (a successor elected on the governor's ticket keeps the governor's party; one elected separately, or a legislative leader, is of the party the state's lean gives), an acting first assistant for a cabinet or agency head where the law gives one".
  - **Add:** "White House staff are not drawn: no act in office hires a successor to a staff post. The Vice President is not drawn until the vice presidency has a nomination office confirmed by both houses."
- **Amendment, DECISIONS 5.3:** add "A House special election reads its seat's lean (`seatLeans`), as the general election already does."
