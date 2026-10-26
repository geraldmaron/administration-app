# Lane: litigation (Wave 2)

BL-123 (extended with law L1 to L4, X1, C7/C8, C34 and events BR-12) and the legal-exposure half of BL-190. Branch `lane/wd-litigation`, based on `3c2ecd43d`.

## Outcome

One exposure and proceeding mechanism, with each step separate: exposure, filing, standing and parties, interim relief, merits, appeal and remedy.

| Item | Status |
|---|---|
| L1, filing apart from merits | Done. The probe assertion passes. |
| L2, named state plaintiffs from injury and attorney-general authority | Done. The probe passes. |
| L3, expedited interim relief apart from merits and appeals, with sourced bands | Done. Both probe assertions pass (interim, cert band). |
| L4 and BR-12, per-act exposure and an aggregate background docket | Done. The rewritten probe assertion passes. |
| X1, cost follows the act and the remedy | Done. |
| C7/C8, legal grounds kept separate | Done. |
| C34, misconduct enters the same stream | Partly done. A public finding becomes a referral with a dated charging decision. A charge has no downstream consequence yet. |
| T2, tariffs in litigation | **Blocked.** BL-190 records an open owner ruling. Nothing was wired. See "T2 and BL-190" below. |

## What changed

All engine changes are in `packages/engine/src`.

1. **Filing is its own question** (`legal-exposure.ts`, `order-exposure.ts`, `orders.ts`).
   - `projectOrder` now returns `challengeChance` as the chance a suit is filed. It also returns `filing` (who would sue) and `meritsChance` (the strike-down odds on this week's ground and precedent).
   - The filing model treats the strongest state plaintiff and each private class (advocacy, regulated parties, individuals, Congress) as independent chances to file. Each chance is scaled by the act's loudness: salience, plus up to 0.2 from the administration's record of losses in court.
   - Overreach and the statutory ground are not inputs to filing.
   - The minister's sway and the Attorney General's objection factor still apply. A disloyal minister is a source for plaintiffs, and an objection on file is their first exhibit.
   - `order-exposure.ts` is the per-order litigation table: salience, plaintiff classes, a fictional lead plaintiff, the state standing basis, which states the order lands on, the constitutional share and the distinct grounds pleaded. Its values are design judgments for an ordering target, and the file says so.
2. **Plaintiffs** (`state-suits.ts`, `legal-exposure.ts`).
   - A state sues through its attorney general. Selection method: 43 states and DC elect the AG; AK, HI, NH, NJ and WY appoint by governor; Maine's legislature elects; Tennessee's supreme court appoints. Source: Wikipedia, "State attorney general", citing NAAG, opened 2026-10-25. This is a secondary source.
   - A governor's appointee follows the governor. Every other AG follows the state's own lean, as an expected probability, so the projection stays seed-independent. An opposition governor no longer supplies AG authority.
   - Standing weight: proprietary injury 1; residents 0.45, the attenuation in *United States v. Texas* (2023); none 0. Injury is read off the order's reach: foreign-born share, an economy axis, federal dependence, or the subject's host state.
   - A filed ordinary challenge now opens with a `CourtMatter` of the new kind `order-challenge`. It carries up to four named states ("State of X, by its Attorney General"), the lead private plaintiff and the United States. It also keeps the originating act's citation and limit, the distinct grounds, and relief scoped per *Trump v. CASA*.
   - Specialized matters keep their own briefs. `judicial-review.ts` treats `order-challenge` as unspecialized everywhere it branched on a matter being present.
3. **Clocks** (`court-procedure.ts`, `judicial-review.ts`, `orders.ts`).
   - `COURT_TIMING_DAYS` holds four bands, each with its source:

     | Step | Band | Source |
     |---|---|---|
     | Interim relief | 2 to 21 days from filing | FRCP 65(b)(2) and 65(a) |
     | Lower merits | 60 to 270 days from filing | FCMS civil median 6.9 months, 12 months to 2026-06-30 |
     | Circuit merits | 90 to 365 days from panel assignment | FCMS appellate median 10.1 months, 5.8 to 15.9 by circuit |
     | Cert disposition | 28 to 240 days after the circuit judgment | Sup. Ct. R. 13.1, 13.5, 15.3 and 15.5 |

   - No official median for the cert step was found. The 90-day petition deadline is not used as a minimum wait.
   - `courtWeeks` draws once per proceeding and step on the keyed stream `court-timing`. `courtStep` takes an optional dated wait.
   - An ordinary challenge is filed at signing. The threshold acts in the week before the interim ruling, and `review.dueTurn` is the interim-ruling week.
   - Specialized matters (energy leasing, entry suspension, emergency construction) keep their existing clocks.
4. **Grounds** (`strike-odds.ts`). `groundedReach` splits overreach into a statutory share, which an authorizing act discounts, and a constitutional share, which it does not. An authorized order keeps its constitutional exposure. There is no generic "major questions" term.
   - In *Learning Resources*, the major-questions part drew only three justices: Roberts, Gorsuch and Barrett.
5. **Record.** `accumulatedOverreach` now counts only orders a court struck down. It no longer counts every suit. Being sued is not being refused.
6. **Remedy cost** (`judicial-review.ts`). `strikeDownCost(order, undoesLanded)` scales the old constant by `(0.5 + salience)`, and halves it when the remedy cancels a rule that never took effect.
   - The filing cost (`CONTEST_COST`) drops from stability -0.05 / standing -0.06 to -0.02 / -0.03. A suit is news, not yet a refusal.
7. **Background docket** (`background-docket.ts`, called from `judicialReviewPhase`).
   - Each October term has an aggregate count of filings, argued cases and signed opinions. It is jittered ±10% around the 2024 Term (3,856 filings, 73 argued, 56 signed opinions; Chief Justice's 2025 Year-End Report).
   - Each of six modeled doctrines has a 0.18 chance a term of a consequential ruling. That chance is a design judgment, about one such ruling a term.
   - A selected ruling is decided by every seated justice and recorded once, in the late-June week, as a `CourtCase` with the new subject kind `background-docket`, plus a feed line.
   - `doctrineShift` moves later merits on that doctrine by ±0.06, capped at ±0.15. It reaches the lower, circuit and Supreme Court merits and the projection.
   - The docket never becomes playable cases.
8. **One origin per dispute** (`selectLegalExposures` in `legal-exposure.ts`). There is one exposure per signed order. Each one lists every record that represents the dispute: the proceeding, the case, and committee inquiries keyed `|order:<record>`. Misconduct exposures come from public, received oversight findings with a cause. Such a finding is "referred" until a dated charging decision, 13 to 52 weeks later, with `CHARGE_CHANCE = 0.3` (design). A scandal is never an indictment by itself.

New files:
- `order-exposure.ts`
- `legal-exposure.ts`
- `background-docket.ts`
- `legal-exposure.test.ts`
- `background-docket.test.ts`
- `court-procedure.test.ts`

## Shared-contract edits

One edit, additive: `packages/engine/src/state-judiciary.ts`.
- `CourtSubject` gains `{ kind: "background-docket"; termYear; doctrine }`.
- `CourtMatter.kind` gains `"order-challenge"`.

No save schema validates these unions, so `save.ts` is unchanged.

## Probe edits

`packages/engine/src/__probes__/law.probe.test.ts`, the litigation section only:
- Three `it.todo`s became assertions: L1, L3 cert and L4.
- The existing L2 and L3 assertions are untouched.
- T2 stays `it.todo`.
- No assertion was weakened.

## Probes, before and after

Before is `3c2ecd43d`; after is this branch.

| Probe | Before | After |
|---|---|---|
| L1 | todo. Report: one number 0.085 to 0.594; border controls 0.17. | **pass.** Filing above merits: border controls 0.587 vs 0.31; entry suspension 0.916 vs 0.47. Regulatory review is filed less often. Raising overreach to 0.9 leaves filing unchanged and raises merits. |
| L2 | **fail.** The opened proceeding names no party. | **pass.** The border-controls proceeding names state plaintiffs. |
| L3 | **fail.** Interim at week 6 (threshold 0, interim 6, lower merits 7, final 13). | **pass.** Threshold week 0, interim week 2; lower merits then waits its band. |
| L3 cert | todo | **pass.** 14 weeks from circuit judgment to cert decision, inside the 4 to 35 week band. |
| L4 | todo. Report: 197 weeks, 0 orders signed, 3 disputes, all exogenous. | **pass.** Two seeds by 104 weeks, an available order signed every 3 weeks. 68 orders, 68 exposures, no representation under two origins. 26 filed vs 21.98 expected (within 3σ+1). 6 docket terms, 3 consequential rulings. |
| T2 | todo. 0 proceedings in 330 days. | todo, blocked on BL-190. |

## Tests run

- **Engine targeted:** 16 court and order files before (197 passed) and after. After, including the updated tests: orders 64, judicial-review 14, specialized-court-matters 5, court-breadth 4, state-suits 9, all green.
- **New engine tests:** legal-exposure 6, background-docket 5, court-procedure 5, all green.
- **Wider engine consumers:** 20 files, 389 passed (press, oversight, counsel-record, docket, save, turn-phases, pledges, fiscal-authority and others).
- **Player-core** with `@admin/engine` aliased to source: judiciary, policy, desk, calendar, place-of and arming, 37 files, 314 passed.
- **Player-core** with its ordinary config, which resolves the engine through the committed `dist/`: 18 desk tests fail. These failures do not involve this change, because `dist/` is unchanged here. They point at stale `dist/` from earlier lanes. The integrator's clean build settles it.
- `node scripts/verify-file-size.mjs` passes. `orders.ts` is 795 lines.
- `npx tsc --noEmit -p packages/engine` is clean.
- `npx tsc --noEmit -p packages/player-core` fails on exports added by earlier lanes and missing from the stale engine `dist/`: `authorityDeadline`, `emergencyAuthorityClock`, `withoutNoticed`, `Campaign.noticed`. None of them comes from this lane.
- **Whole law probe file:** 13 passed, 5 failed, 1 todo (before: 8 passed, 7 failed, 4 todo). The five failures are R1 to R4 and C1, which belong to other lanes and are unchanged. T1 and E1 still pass.

## Tests changed, and why

| Test | Change | Why |
|---|---|---|
| `orders.test.ts` "lowers the challenge odds on the page too" | Now asserts lower merits and equal filing | A statute changes who wins, not who sues. |
| `orders.test.ts` "counts only the orders that were actually contested" | Now counts only struck-down orders | Being sued is not being refused. |
| `orders.test.ts` `contestedOrders` helper | Records now carry a struck-down review | The record test means what its name says. |
| `orders.test.ts` `contestedRoll` | Now a forced draw | Those tests are about what follows a suit; defense production's filing odds fell below the old seeded roll. |
| `orders.test.ts` `courtToFinal` | Now jumps to each stage's dated turn | It encoded one stage per turn. |
| `judicial-review.test.ts` `step` | Same jump | Same reason. |
| `specialized-court-matters.test.ts` `resolved` and `review` | Same jump | Same reason. |

## Save migration

No stored shape changed. Old proceedings keep their stored `nextTurn`, and from their next step they take the new waits. A legacy pending order record with no proceeding opens one exactly as before. Old `review.dueTurn` values are kept.

## T2 and BL-190

BL-190 says "owner decisions first, then engine if (b)" and "Blocked by: the owner's rulings". The legal-exposure ruling (a: citation only, b: a sourced trade-proceeding subject) is not recorded, so nothing was wired for tariffs. What this lane did that the ruling does not touch:
- The common exposure mechanism.
- Venue as a field of the filing odds.
- The verification below.

Verified from primary documents opened 2026-10-25:
- **CIT, *V.O.S. Selections*, Slip Op. 25-66 (2025-05-28):** summary judgment for the plaintiffs.
- **Federal Circuit en banc, No. 25-1812 (2025-08-29):** affirmed on the merits. It vacated the CIT's universal injunction and remanded the remedy in light of *Trump v. CASA*.
- **Supreme Court, *Learning Resources, Inc. v. Trump*, Nos. 24-1287 and 25-250 (2026-02-20), 6-3:** "Held: IEEPA does not authorize the President to impose tariffs." The case falls within the CIT's exclusive jurisdiction under 28 U.S.C. §1581(i). D.D.C. lacked jurisdiction, so 24-1287 was vacated with instructions to dismiss and 25-250 was affirmed. The Court did not decide refunds.
- **Executive Order 14389 (2026-02-20, 91 FR 9437)** ended collection of the IEEPA duties.
- **Proclamation 11012 (2026-02-20, 91 FR 9339)** imposed a 10% Section 122 surcharge for 150 days from 2026-02-24.
- **CIT, *Oregon v. United States* / *Burlap and Barrel*, Slip Op. 26-47 (2026-05-07), 2-1:** held the Section 122 proclamation ultra vires. Relief went to Washington and two importers. Every other state was dismissed for lack of standing.
- **CIT, *Freestyle World*, Slip Op. 26-123 (2026-10-08):**
  - It records reliquidation orders, including finally liquidated entries for plaintiffs.
  - A government appeal of that part is pending at the Federal Circuit (No. 26-1895).
  - About $126 billion was refunded by 2026-10-02 through CBP's CAPE system.
  - The opinion certifies a Rule 23(b)(2) importer class.
- **Statutes:** 28 U.S.C. §2643 (money judgments and other relief) and §1295(a)(5) (appeals to the Federal Circuit).

Not verified:
- The Federal Circuit's administrative stay of the Section 122 ruling (secondary sources only).
- Slip Op. 26-53, the Section 122 remedy order (its PDF had no extractable text).
- Whether Congress extended Section 122 past 2026-07-24.
- Any new Section 232, 301 or 338 actions.
- The D.C. Circuit's remand order (seen only as cited in 26-123).

If the owner rules (b), the wiring is:
1. A `tariff` origin in `LegalExposureOrigin`, read off `trade.measures`.
2. Filing odds from importer injury (`regulated`) and state proprietary injury only. 26-47 shows how rarely states have standing here.
3. Venue "the Court of International Trade", with appeals to the Federal Circuit.
4. A `CourtSubject` `trade-measure`.
5. A remedy that ends prospective collection, plus refunds limited to plaintiffs and certified class members. A loss does not mean universal refunds.
6. The authority's merits from statute: IEEPA forbidden after *Learning Resources*; Section 122 per 26-47 while the appeal runs.

## Doc amendments for the integrator

**docs/DECISIONS.md §13.12.** Replace the Where and Status lines with:

> **Where:** `packages/engine/src/background-docket.ts` (aggregate term, six modeled doctrines, consequential rulings recorded as `CourtCase` with subject `background-docket`; precedent shifts later merits through `doctrineShift`), per-act exposure in `legal-exposure.ts`. Doctrine voting on named questions with a philosophy distinct from ideology is still not built; justices vote by ideology distance from the doctrine's executive-power position.
> **Status (2026-10-25):** aggregate docket and per-act exposure for executive orders built (world dynamics Wave 2); tariffs wait on BL-190's ruling; emergencies, removals, directives and force at home still answer only through the orders that carry them.

**docs/SCHEMA.md, judiciary section.**

> `CourtSubject` adds `background-docket { termYear, doctrine }`: one consequential ruling from the aggregate docket, never a presidential case. `CourtMatter.kind` adds `order-challenge`: an ordinary order challenge whose parties are drawn from the act's injury and attorney-general authority; no specialized record rule applies to it.

**docs/ARCHITECTURE.md, courts.**

> Legal exposure runs through one stream (`legal-exposure.ts`). Filing reads salience, injury, plaintiffs and venue (`order-exposure.ts`, `state-suits.ts`); merits read the grounded reach (statutory share discounted by an authorizing act, constitutional share not), the bench and precedent (`strike-odds.ts`, `background-docket.ts`). Stage waits are drawn once per proceeding inside sourced bands (`court-procedure.ts` `COURT_TIMING_DAYS`). A strike-down's cost follows the act's salience and whether the remedy undoes something in effect. `selectLegalExposures` links every representation of a dispute (proceeding, case, committee inquiry) to one origin; public misconduct findings enter as referrals with a dated charging decision.

**docs/BACKLOG.md, BL-123.** Record L1, L2, L3 (interim and cert), L4/BR-12, X1 and C7/C8 as implemented on `lane/wd-litigation`, with the probe numbers above. Move C34 to "referral and charging decision implemented; a charge's consequence (a criminal proceeding, the person's office) remains". Keep remaining: emergencies, removals, directives and force at home as exposure origins of their own; doctrine voting distinct from ideology.

**docs/BACKLOG.md, BL-190.** Add: "Legal exposure: primary-source status of the IEEPA and Section 122 litigation recorded in `lanes/litigation.md` (2026-10-25); the engine wiring for (b) is specified there and waits on the ruling."

## Risks and left undone

- **Balance not run.** Filing is now more common for loud orders and the filing cost is smaller, so the per-order expected cost moved. The removal and press readers of `contested` (`press.ts`, `legislative-acts.ts:393`, `committee-inquiry.ts`) will fire more often. They are worth a look in the integration balance run.
- **Stale sentence in a file outside this lane.** `projection.ts:182` still says "A challenged order stays in force until the bench rules, 6 weeks on". `JUDICIAL_REVIEW_TURNS` now only feeds `docket.ts` and rulemaking pace.
- **Longer proceedings.** Merits and appeals now take months, so a term carries more open proceedings at once. The Courts screen and the summons (`review.dueTurn` is now the interim-ruling week) were checked only through player-core unit tests, not in the browser.
- **The threshold step is early.** It is decided the week before the interim ruling, so a dismissal for lack of standing can come within three weeks of filing. A motion to dismiss usually takes longer.
- **Background rulings have no case-file screen.** They show in justice vote records and the feed only.
- **Ran a typecheck early.** `npx tsc --noEmit -p packages/engine` was run during construction as well as at the end; every `tsconfig.tsbuildinfo` it wrote was deleted.

## Wave 2R repair (2026-10-25, on `d32595f27`)

This repairs the review finding that subject-specific injury never reached the filing draw.

### What changed

1. **The subject now reaches the filing odds.**
   - `projectOrder(campaign, charter, order, subject?)` passes the subject to `filingOdds`.
   - `signOrder` projects with the subject it was given, so the chance it rolls against is the subject-aware chance it projected.
2. **Federal sites resolve to a state.** `subjectState` in `legal-exposure.ts` maps a `federal-site` subject to the state its sourced `FEDERAL_SITES` row records. Force protection's `subject-state` injury channel is no longer always zero.
3. **Three regressions** in `legal-exposure.test.ts`:
   - The Pentagon resolves to `{ VA: 1 }`, and there is no injury without a subject.
   - An opposing Virginia attorney general raises the filing chance only when the subject is known, and the projection agrees.
   - The signed record's `challengeChance` equals the subject-aware projection.

### Companion edit needed outside this lane

`packages/player-core/src/policy/order-desk.ts:127` still calls `projectOrder(campaign, charter, order)`. Until it passes the desk's `subject`, the desk shows the subject-free chance for emergency construction, force protection and relief, while the signature rolls the subject-aware one.

The exact change:

```ts
const projection = projectOrder(campaign, charter, order, subject);
```

The parameter is optional, so player-core still typechecks without it.

### Checks run

| Check | Result |
|---|---|
| Engine suites: legal-exposure, orders, judicial-review, executive-authority, specialized-court-matters, court-breadth, projection, order-families, order-authority-subjects, cabinet-agenda-acts, background-docket, state-suits | 12 files, 167 passed |
| Probe L1 | Pass, unchanged |
| Probe L2 | Pass |
| Probe L4 | Pass: 68 orders, 24 filed against 24.70 expected (was 24.6), 6 docket terms, 3 rulings |
| `npx tsc --noEmit -p packages/engine` | Clean; the `tsconfig.tsbuildinfo` it wrote was deleted |

### BL-306 not taken

BL-306 is not small. Its acceptance needs:
- a removal court subject;
- District of Columbia venue on the common clocks;
- merits reading *Slaughter* and the bench;
- a reinstatement or stated remedy;
- the officers board showing the exposure, which is player-core.

That is a new proceeding family in `judicial-review.ts`, plus an additive `CourtSubject` and a player-core screen. It stays with its recorded Wave 3 owner.

## Wave 3: BL-306, a contested commission removal reaches a court (on `d2d7649f7`)

### What changed

Removal suits run through the same proceeding mechanism as order challenges: `CourtProceeding`, `courtStep`, `courtWeeks`, `appealGrantChance` and `scheduleSupremeArgument`. The new file `packages/engine/src/removal-court.ts` holds this family's stage rules and is called from `judicialReviewPhase`.

1. **Filing.** `legal-exposure.ts` now exports `removalSuit`, which draws once, on the existing `removal-suit` stream, when the removed member decides and whether they sue.
   - When a member sues, the decision week opens exactly one proceeding, `removal:<institution>:<person>:<turn>`.
   - Subject: `commission-removal`. Matter kind: `commission-removal`.
   - Caption: "<member> v. President of the United States". Venue: the District of Columbia district forum, through `districtForumFor`.
   - The question cites *Trump v. Slaughter*.
   - The exposure now lists the proceeding and the case among its representations, and reads "decided" once ruled.
2. **Clocks.**
   - The threshold acts at filing.
   - Interim reinstatement comes at filing + `courtWeeks(interim)`. It is denied, because after *Slaughter* the member is unlikely to win and interim relief needs a likely win.
   - District merits come at filing + `courtWeeks(lowerMerits)`, and the D.C. Circuit at `courtWeeks(circuitMerits)` after the district judgment.
   - The cert decision comes at `courtWeeks(certDisposition)` after the circuit judgment, using `appealGrantChance("silent", …)`. A grant schedules argument on the October term calendar.
3. **Merits.**
   - The district court and the D.C. Circuit are bound by *Slaughter*'s reasoning, so both use `REMOVAL_REINSTATEMENT_CHANCE` (0.2, the owner-accepted pricing in the administration's favor).
   - At the Supreme Court each seated justice votes. Each justice's chance is 0.2 × their own propensity divided by the bench mean, read against a unitary-executive lean through `narrowingPropensity` (now exported from `background-docket.ts`). So the bench as a whole sits near 0.2, spread by each justice's position.
   - An equal division leaves the circuit judgment in force.
   - The Fed and the NLRB have no `removalContested`, so they never open a case.
4. **Remedy** (`removalRemedy`). A district reinstatement order stays pending appeal; only a final judgment applies a remedy.
   - **Reinstatement.** When the member wins, is alive, holds no other role and nobody has been confirmed to the seat: the seat is returned (an acting officer steps aside), and the person gets the office's role back.
     - Source: *Slaughter*'s dissent, n.13, citing *Vitarelli v. Seaton* injunctions requiring reinstatement.
   - **Back pay only.** Otherwise the court declares the removal unlawful and awards back pay only.
     - Source: back pay is the remedy *Myers* and *Humphrey's Executor* sued for, as the *Slaughter* majority recounts.
   - The *Slaughter* majority did not reach the remedy question; it reversed on the merits. The text was opened 2026-10-25 at https://www.supremecourt.gov/opinions/25pdf/609us2r62_g314.pdf.
   - Back pay is stated in the opinion and the board, not charged to the treasury: no salary figure exists in the data.
   - A member's win costs standing -0.02 (a design value below an order struck down) and writes a feed line.
5. **Officers board** (player-core `oversight/appointments-pipeline.ts`).
   - `RemovableOfficer.contested` carries `CONTESTED_REMOVAL_WORDS`: the probable suit (85%) and the unlikely reinstatement (20%, after *Slaughter*).
   - `removalSuits(campaign)` gives one row per contested removal, with status deciding, declined, in court (at which stage), reinstated, back pay or removal stands, plus the case id.

### Files

| File | Change |
|---|---|
| `packages/engine/src/removal-court.ts` | new |
| `packages/engine/src/removal-court.test.ts` | new, 8 tests |
| `packages/engine/src/legal-exposure.ts` | `removalSuit`, `removalProceedingId`, `selectRemovalExposures`; the exposure links its proceeding and case |
| `packages/engine/src/judicial-review.ts` | calls `removalMatterEffects` |
| `packages/engine/src/background-docket.ts` | exports `narrowingPropensity` |
| `packages/player-core/src/oversight/appointments-pipeline.ts` | officers board view model |
| `packages/player-core/src/oversight/oversight-board.test.ts` | 2 new tests |

Shared-contract edits, both additive:
- `packages/engine/src/state-judiciary.ts`: the `CourtSubject` `commission-removal` member and `CourtMatter.kind` `"commission-removal"`.
- `packages/engine/src/index.ts`: one export line for `REMOVAL_REINSTATEMENT_CHANCE`, `REMOVAL_SUIT_CHANCE`, `selectRemovalExposures` and `LegalExposure`.

### Proof

The engine regressions are in `removal-court.test.ts`:

| Test | What it shows |
|---|---|
| One case | One proceeding opens in D.C. on the decision week, and never a second. |
| No case | No case opens before the decision, when the member declines, or for the FTC (at will). |
| Clocks | Interim and lower merits fall on the `courtWeeks` turns; merits are at least 9 weeks after filing. |
| One case at the end | 30 seeds each end in exactly one case, and reinstatement is under half. |
| Remedy: reinstatement | A vacant seat is returned to its member. |
| Remedy: back pay | A filled seat gives back pay only. |
| Remedy applied | A final win reinstates the member; a final loss leaves the seat empty. |
| The bench | Supreme Court votes average near 0.2 and vary by justice. |

`legal-exposure.test.ts` still passes, including the removal exposure tests.

### Tests run

| Suites | Result |
|---|---|
| Engine: removal-court, legal-exposure, judicial-review, career-incumbents, background-docket, court-breadth, court-procedure, orders, specialized-court-matters, statutory-matters, save, turn-phases, oversight, institutions | 14 files, 253 passed |
| Player-core with the engine aliased to source: oversight, judiciary, appointments, desk | 31 files, 223 passed |
| Probes R1 and L3 | Pass |
| `npx tsc --noEmit -p packages/engine` | Clean |
| `npx tsc --noEmit -p packages/player-core` | Fails only on symbols the committed engine `dist/` predates: the new exports and `projectOrder`'s subject argument. Those clear on the integrator's build. |
| `node scripts/verify-file-size.mjs` | OK |

Both `tsconfig.tsbuildinfo` files written were deleted.

### Save migration

None. Old contested removals open their proceeding on the first week at or after the drawn decision week. A removal older than that week files on load's next turn, with the filing turn as the turn it opened.

### Companion edits needed outside this lane's grant

1. **The Courts docket shows the wrong label for a removal case.** `packages/player-core/src/judiciary/courts.ts:349-354` falls through to "Accessible voting equipment under HAVA". Add one branch to that ternary chain:

   ```ts
   : proceeding.subject.kind === "commission-removal" ? "A removed commissioner's suit to be reinstated, after Trump v. Slaughter"
   ```

2. **`case-file.ts` has no removal branch.** `packages/player-core/src/judiciary/case-file.ts` needs a branch like its fair-housing one, so the case page renders the matter.
3. **The app does not show the new board data.** `apps/player/src/oversight/Officers.tsx` should show `officer.contested` under the rule line and list `removalSuits(campaign)`. Its `RULE_WORDS` still tells a contested seat "only for a reason the law allows", which is no longer true for those seats.

### Risks

- Back pay has no money attached.
- No named D.C. Circuit panel is drawn for removal appeals: the circuit decides at the *Slaughter*-bound chance.
- Interim reinstatement is always denied while the priced chance sits below even.
- If the owner later raises `REMOVAL_REINSTATEMENT_CHANCE` above 0.5, interim relief should become a draw.

### Doc amendments for the integrator

- **docs/SCHEMA.md, judiciary.** "`CourtSubject` adds `commission-removal { institution, person, removalTurn }`: a member removed from a commission seat whose protection the Court's reasoning reaches sues to be reinstated. `CourtMatter.kind` adds `commission-removal`."
- **docs/ARCHITECTURE.md, courts.** "A contested commission removal is an exposure origin whose filed suit runs as a court proceeding (`removal-court.ts`) on the shared clocks, D.C. venue, *Slaughter*-bound merits below and a vote of the seated justices above; a win reinstates the member where the seat can be returned and otherwise awards back pay."
- **docs/BACKLOG.md, BL-306.** Close with this commit for the engine and the player-core view model. Open a follow-up for the three companion surface edits above: the Courts label, the case file, and `Officers.tsx`.

## Wave 3 surface edits (grant extended, on `7e636d644`)

The three companion edits listed above are now made in this lane.

1. **Courts docket label.** `packages/player-core/src/judiciary/courts.ts`: a `commission-removal` proceeding now gets the label "A removed commissioner's suit to get the seat back, after Trump v. Slaughter". It no longer falls through to the voting-equipment label.
2. **Case file.** `packages/player-core/src/judiciary/case-file.ts` has a removal branch shaped like fair-housing's. It shows the summary from the matter's injury, the timeline and the votes, and says what holds:
   - while the case is pending, the removal stands;
   - a judgment for the member reinstates them with back pay, or gives back pay alone if the seat could not be returned;
   - a judgment for the President leaves the removal standing.
3. **Officers screen.** `apps/player/src/oversight/Officers.tsx`:
   - A contested seat now shows `officer.contested` in place of the stale "only for a reason the law allows" rule text. `CONTESTED_REMOVAL_WORDS` in `appointments-pipeline.ts` now reads: "You can remove them, with or without a reason. The law still protects this seat, so they will probably sue to get it back (about 85%). After Trump v. Slaughter, a court is unlikely to put them back (about 20%)."
   - A contested seat's comparison offers "Remove, no reason" beside the statutory causes, and its review line adds the probable suit.
   - The new "Removed officials who can sue" list renders `removalSuits(campaign)`. Each row carries a status tag and the reading, and a filed suit opens its case page through `RowLink` and `place.case`.

### Tests

New in `packages/player-core/src/judiciary/courts.test.ts`:
- The docket names a pending removal suit, and its case file reads it.
- The case file states each judgment: reinstatement with back pay, back pay alone, and the removal standing.

The existing officers-board tests in `oversight-board.test.ts` still pass with the reworded risk text.

### Checks run

| Command | Result |
|---|---|
| `pnpm --filter @admin/engine run build` | Built |
| `pnpm --filter @admin/player-core run build` | Built |
| `pnpm --filter @admin/player run typecheck` | Clean |
| `npx vitest run src/judiciary src/oversight` (player-core, against the built engine) | 6 files, 56 passed |

The rebuilt `dist/` output was discarded: `git checkout` on tracked files and `git clean` on untracked files in both `dist` directories. Both `tsconfig.tsbuildinfo` files were deleted. No `dist/` change is committed.

### Not done

The Officers screen was **not** checked in a browser. Layout at 390×844 and 1440×900 is unverified.
