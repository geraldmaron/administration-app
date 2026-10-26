# Authority clocks (BL-278) — work and verification record

## Wave 1R repair — 2026-10-25

Status: source repair implemented on `lane/wd-clocks`, starting at `c09676065` (verified descendant of `9b8ba9e59`). Targeted engine/player checks, T1/E1 and source TypeScript checks passed. The rendered player outcome is **not proven**; build and broader integration gates remain with the integrator. Local commit status is recorded below. The Wave 1 record farther down is historical and does not describe this repair's current HEAD or verification counts.

Outcome: the emergency board, calendar, renewal case and action previews show the authority's actual deadline, construction obeys that same authority, and narrowing a national declaration to any originally covered state cannot restart its episode.

### Diagnosis and decisions

Reproduction
- Commands: `cd packages/engine && npx vitest run src/emergency.test.ts -t 'every original predicate|recovers all covered'`; `cd packages/player-core && npx vitest run --config ../../.clocks-vitest.config.mts src/emergency/emergency-board.test.ts`.
- Environment: this worktree; installed dependencies; Vitest 2.1.9; player-core aliases the engine and content to source as its existing probe config does.
- Data: real founded campaigns, public `declareEmergency`, `endEmergency`, `renewEmergency`, `signBill`, `signOrder` and `apply` paths; a national declaration covering simultaneous Michigan and California floods; the enacted Emergency Powers Limitation Act.
- Frequency: deterministic, reproduced before production edits and again in reverse proof.
- Observed: board deadline `2030-01-19` instead of `2029-04-20`; an annual renewal case dated January 19 instead of January 20; the narrowed declaration creates two clocks instead of retaining one; the old-save re-declaration returns `true` instead of `false` at day 90.
- Expected: one effective deadline, one original episode across either covered state, no new authority at or after the ceiling.

Hypothesis: the shared clock works, but consumer-local renewal-turn arithmetic bypasses it, and episode matching only remembers the first predicate.
Refuted by: a consumer reading `authorityDeadline` and producing the wrong date, or a complete stored predicate set that still misses California.
Test: read each consumer, the shared selector, packet previews, construction issuance, and both clock creation/lookup paths; observed the stale calculations and first-sorted-predicate selection before editing. T1/E1 already passed on the starting branch, isolating this repair to omitted consumers and episode identity.
Verdict: supported. No competing hypothesis was needed; the direct reproduction distinguishes an authority-engine failure from consumer drift.

Cause
- Statement: Wave 1 added dated authority clocks without converting every deadline reader or retaining every condition covered by a declaration.
- Evidence: path history identifies `e5e4ae0fe` as the clock change; old consumer code still uses `renewedTurn + 52`, and `declareOnClock` stores only the first sorted predicate.
- Accounts for: the April/January discrepancy, annual one-day drift, wrong early-renewal preview, construction refusing valid later authority, and national-to-state reissue resetting the clock.
- Unexplained: none for the reported source-level defects.
- Confidence: high; restoring the old production readers makes the new regressions fail again.

Target: exact calendar boundaries and episode identity, zero tolerance. This is a game-contract consistency repair under DECISIONS §§1.9, 2.5 and 6.7; no new historical or statutory calibration is claimed.

Design challenge: the strongest failure is losing a covered predicate when one condition disappears, or treating a newly started flood as an old episode. Deriving all predicates forever from the current live board would avoid a saved field but loses evidence. **Accepted with controls:** one optional sorted, unique predicate set on the existing authority clock; retain the original opening date/clock ID; use the earliest overlapping episode; union predicates covered by a later accepted declaration; fall back to retained original declaration/condition records only for older saves. A genuinely later condition remains eligible. No second authority subsystem or dependency was introduced.

Reuse: searched the engine and player-core for `renewedTurn`, `EMERGENCY_RENEWAL_TURNS`, `hasLapsed`, `weeksToLapse`, `authorityDeadline` and clock readers; checked repo scripts, sibling file inventories and installed skills/tooling. Reused `authorityDeadline`, `emergencyAuthorityClock`, `selectDeclaredEmergencies`, `apply`, the existing calendar `dateKey`, and the player-core probe config's source aliases.

### Files changed

Production deadline consumers repaired:

- `packages/player-core/src/emergency/emergency-board.ts`: lapse date comes from `authorityDeadline`; notice timing uses the projected daily clock.
- `packages/player-core/src/emergency/emergency-choices.ts`: declaration and continuation previews apply the real packet, then read its effective authority deadline; ending/waiting text reads the same clock. Expired records no longer produce live-action choices. Congressional limits are named in the comparison.
- `packages/player-core/src/desk/family-emergency.ts`: renewal case due date and identity use the effective calendar deadline, including after early continuation.
- `packages/player-core/src/calendar/sources-security.ts`: declaration event dates read the shared deadline; only the current-authority selector supplies declarations. Congressional ceilings do not advertise presidential notice windows.
- `packages/engine/src/order-subjects.ts`: construction issuance selects current declarations instead of testing elapsed renewal turns.
- `packages/engine/src/military-construction.ts`: later contracts use that same current-authority selector; existing obligations remain payable after authority ends.

Episode repair:

- `packages/engine/src/emergency.ts`: preserve and match all covered predicates; recover older singular-clock and turn-only records from retained declarations; exclude later conditions from historical coverage.
- **Shared contract:** `packages/engine/src/state-emergency.ts`: additive optional `AuthorityClock.predicates?: readonly string[]`. This is the only shared-contract file edited in Wave 1R.

Tests:

- `packages/engine/src/emergency.test.ts`: both state subsets, before/at the ceiling, save/reload, singular-clock and turn-only compatibility, and a genuinely later condition.
- `packages/engine/src/military-construction.test.ts`: day 364/365, early continuation remaining valid past 52 weeks from notice, and no new commitments after the effective ceiling while prior commitments are paid.
- `packages/player-core/src/emergency/emergency-board.test.ts`: enacted deadline across board/calendar/action comparisons; annual/renewed due dates; expired-state exclusion.
- `packages/player-core/src/desk/family-cases.test.ts`: update the old turn-derived case-ID expectation to its actual calendar date.
- This notes file holds the documentation and verification record.

Additional regression edits appeared during this session. Their coverage was preserved and duplicate imports were consolidated; no independent review or delegation was launched.

Ordinary tests corrected: a new annual declaration lasts to its civil anniversary (365 days in this fixture), and its notice opens 90 days before that anniversary. The old tests assumed exactly 52 weeks and changed only `turn` while leaving the dated clock unchanged. Renewal-case IDs now carry their calendar deadline instead of a synthetic lapse turn. No law probe was changed or weakened.

### Save and case compatibility

`predicate` remains present for compatibility; `predicates` is additive and optional. New declarations persist all matching condition IDs, sorted and deduplicated. Reissue retains the clock, opening date, provenance and covered predicates. JSON save/reload preserves the set. Older singular clocks recover coverage from declarations linked to that clock and retained conditions that existed when declared; turn-only records derive their old annual deadline centrally. Missing historical condition records cannot be reconstructed, so no new historical facts are invented. Legacy records only carry turn-resolution onset dates, so finer within-week historical ordering remains unavailable.

No save-version bump, `save.ts` change, generated output or migration script is included. Renewal cases now use date-based IDs; the existing `seatFamilyCases` reconciliation closes obsolete source IDs and raises the current case. A loaded old renewal case may therefore be replaced and lose its old deferral/attention identity once; the underlying declaration and authority are unchanged. Integration should assess this one-time case-history effect.

### Exact documentation amendments for the integrator

**DECISIONS §1.9:** insert after the first paragraph, before **Why**:

> The daily step advances the calendar, then applies emergency authority expiry (`emergencyExpiryPhase`) before executive-order expiry. It next resolves due lobbying, press work, treaties, force authorizations and issued instruments, in that order. After due instruments, `tariffAuthorityPhase` reconciles Section 122 measures to their shared authority deadline before `expireTradeMeasures` expires those measures and reverses their remaining price effects. Impact events and elections due that day follow, then the scheduled office-day work or weekly tick. These two authority hooks run on every calendar day, including days between weekly phases: an expired emergency cannot authorize later work that day, and a legacy tariff with an overlong instrument deadline is corrected before the ordinary expiry reader sees it. Each hook reads earlier writes in this order; neither requires a phase to run twice within the step.

**DECISIONS §1.9 Where:** append `packages/engine/src/day-step.ts` to the existing `turn-loop.ts` / `turn-phases.ts` locations.

**SCHEMA, AuthorityClock:** append:

> `predicates?: readonly string[]` retains the sorted, unique predicates covered by an emergency episode. The singular `predicate` remains for compatibility. Readers recover omitted sets from retained declarations and conditions where possible; reissue unions covered predicates without moving the episode's opening date. The field is optional on older saves and unused by Section 122's singular national predicate.

**ARCHITECTURE, emergency authority/readings:** append:

> Emergency deadlines on the board, calendar, renewal cases and action comparisons are projections of `authorityDeadline`. Comparisons apply the prospective action packet before reading its deadline. Construction issuance and later contracting both select current declarations through `selectDeclaredEmergencies`. Episode matching checks every preserved predicate, so selecting any condition originally covered nationally cannot open a fresh clock. Renewal case identity follows the effective calendar deadline.

The two daily hooks were already present in the integrated Wave 1 source; `day-step.ts` is unchanged in this repair. Existing day-89/90 emergency and day-149/150 legacy tariff regression tests exercise them through `advanceOneDay`.

### Verification

Check: setup.
Command: `pnpm install --offline --frozen-lockfile`
Result: pass.
Observed: completed successfully; no lockfile change and no online fallback required.

Check: targeted engine modules and existing consumers.
Command: `cd packages/engine && npx vitest run src/emergency.test.ts src/military-construction.test.ts src/orders.test.ts src/legislative-acts.test.ts src/legislation.test.ts src/authority-boundaries.test.ts src/tariff-orders.test.ts src/save.test.ts`
Result: pass.
Observed: 223 tests passed across 8 files.

Check: focused player-core consumers.
Command: `cd packages/player-core && npx vitest run --config ../../.clocks-vitest.config.mts src/emergency/emergency-board.test.ts src/calendar/calendar.test.ts src/desk/family-cases.test.ts src/world/nation-overview.test.ts src/world/state-dossier.test.ts`
Result: pass.
Observed: 73 tests across 5 files. Temporary config extends the ordinary config with `resolve` from `packages/player-core/vitest.probes.config.ts`; no production config or generated files changed.

Check: requested law probes, baseline and repaired tree.
Command: `cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/law.probe.test.ts -t 'BREAK T1|BREAK E1'`
Result: pass before and after.
Observed: 2 passed, 17 skipped on each run. T1: zero live Section 122 measures at day 160 and reissue refused. E1: no emergency authority at day 126. These previously repaired probes stay green; the new consumer/episode regressions establish this wave's changes.

Check: TypeScript.
Commands: `npx tsc --noEmit -p packages/engine`; `npx tsc --noEmit -p .clocks-tsconfig.json`
Result: pass, each run once.
Observed: both exited 0 without diagnostics. The temporary player-core config extends its real tsconfig, includes all player-core source/tests, points `@admin/engine` and `@admin/content` at source, widens `rootDir` to the repo, and disables composite/incremental emission. This avoids typechecking against stale `dist` when the lane explicitly forbids a build. The engine's `tsconfig.tsbuildinfo` was removed; player-core's was absent. No workspace typecheck was run.

Check: reverse proof.
Commands under temporary restoration of the old six production readers:

- `cd packages/engine && npx vitest run src/emergency.test.ts src/military-construction.test.ts -t 'every original predicate|every predicate covered|recovers all.*predicate|construction reads'`
- `cd packages/player-core && npx vitest run --config ../../.clocks-vitest.config.mts src/emergency/emergency-board.test.ts -t 'one emergency authority|shows the enacted|gives renewal cases'`

Result: expected failures; all repaired source files restored byte-for-byte in `finally`.
Observed: engine 6 failed, 1 passed, 29 skipped; player-core 5 failed, 12 skipped. Restoring the old predicate lookup creates a second clock/permits expired reissue; restoring construction's turn test rejects live annual authority; restoring player readers returns the January dates and expired choices.

Check: post-restoration regressions.
Command: `cd packages/engine && npx vitest run src/emergency.test.ts src/military-construction.test.ts`; focused player-core command above.
Result: pass.
Observed: engine 36 tests across 2 files; player-core 73 across 5. No production edits followed the passing typechecks except temporary reverse-proof replacements restored exactly.

Check: broader door-link fixture suite.
Command: focused player-core command above with `src/shell/doors.test.ts` added.
Result: incomplete, stopped with exit 130.
Observed: the five focused suites finished green. Inspection then found that `doors.test.ts` generates a full fixture set including two presidential terms with a 40-minute setup budget; it was stopped to avoid broad campaign work in this lane. No door-link pass is claimed.

Check: diff hygiene.
Command: `git diff --check`
Result: pass.
Observed: no whitespace diagnostics. Full production and test diffs reviewed, including the additional regression coverage. No validator, probe, lockfile, canonical doc, other-lane module or generated `dist` change.

Outcome proof
- Surface: production engine actions/packets and the real player-core board/calendar/case/choice readers.
- Data: campaigns founded from the dataset; public declaration, enactment, continuation and order-signature calls; simultaneous Michigan/California conditions; saved/reloaded campaigns.
- Observed: April 20, 2029 throughout the limited declaration's readouts; January 20 anniversaries; narrowed reissue retains one clock and fails at day 90; construction survives the valid final annual day and cannot contract after authority ends.
- Verdict: proven at action/selector boundaries; **not proven on the rendered player UI**. No UI build or browser/native walk was performed.

Residual integration work: fresh build and canonical doc sync; full gates and balance only at the integration checkpoint. The universal and frozen legacy emergency screens still carry generic annual/presidential-continuation captions; their display wording was not part of these owned source files and needs reconciliation with the corrected congressional-limit comparisons. The separate `externalEmergencies` IEEPA register remains the distinct model described in the original Wave 1 scope note; this repair converts consumers of `Campaign.emergencies`, not that register. No new independent deadline calculation for declared emergencies remains outside the centralized legacy adapter.

### Reproducing the source checks without a build

The temporary verification files were removed after the checks. To reproduce them, create `.clocks-vitest.config.mts` in the worktree root:

```ts
import { mergeConfig } from "vitest/config";
import ordinary from "./packages/player-core/vitest.config.ts";
import probes from "./packages/player-core/vitest.probes.config.ts";
export default mergeConfig(ordinary, { resolve: probes.resolve });
```

For the player-core source typecheck, create `.clocks-tsconfig.json`:

```json
{
  "extends": "./packages/player-core/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": ".",
    "composite": false,
    "incremental": false,
    "paths": {
      "@admin/engine": ["packages/engine/src/index.ts"],
      "@admin/content": ["packages/content/src/index.ts"]
    }
  },
  "include": ["packages/player-core/src"]
}
```

Remove these temporary files and any package `tsconfig.tsbuildinfo` after verification; the integrator's fresh build restores the ordinary cross-package validation path.

### Local commit status

The explicit-path `git add` failed with exit 128 before staging:

```text
fatal: Unable to create '.git/worktrees/admin-app-wd-clocks/index.lock': Operation not permitted
```

Git metadata is outside the sandbox's writable roots. No commit was created; HEAD remains `c09676065` on `lane/wd-clocks`. The repaired source/tests and this record remain in the assigned worktree. The full working diff was reviewed; a staged-diff review and commit could not run because staging was denied. Nothing was pushed or deployed. Temporary configs, reverse-proof logs and build-info were cleaned up.

In a session permitted to write this worktree's Git metadata, run these exact commands from `.-wd-clocks`:

```bash
git add docs/audits/2026-10-24-world-dynamics/lanes/clocks.md packages/engine/src/emergency.ts packages/engine/src/emergency.test.ts packages/engine/src/state-emergency.ts packages/engine/src/order-subjects.ts packages/engine/src/military-construction.ts packages/engine/src/military-construction.test.ts packages/player-core/src/emergency/emergency-board.ts packages/player-core/src/emergency/emergency-choices.ts packages/player-core/src/emergency/emergency-board.test.ts packages/player-core/src/desk/family-emergency.ts packages/player-core/src/desk/family-cases.test.ts packages/player-core/src/calendar/sources-security.ts
git diff --cached
git -c commit.gpgsign=false commit -m "Unify emergency authority deadlines across consumers" -m "Read the effective authority deadline in board, calendar, renewal cases and action previews. Make construction issuance follow current authority and retain every predicate covered by an emergency episode so narrowing its scope cannot restart the clock. Record daily hook order and source verification."
```

Commit-and-PR closing status: single scoped repair, explicit paths reviewed, no secrets or generated outputs, correct lane branch, imperative message with no attribution trailer; local commit blocked by filesystem permissions. No PR or push attempted.

Verification record
- Project inspected: answered above, “Wave 1 added dated authority clocks without converting every deadline reader.”
- Reuse checked: answered above, “Reused `authorityDeadline`, `emergencyAuthorityClock`, `selectDeclaredEmergencies`, `apply`.”
- Validation path run: answered above, “223 tests passed across 8 files,” the focused 73-test player run, T1/E1 and both source typechecks.
- Outcome observed: action/selector boundary proven; rendered outcome not proven, as stated in Outcome proof.
- Surface inspected: not done; no running player surface built or opened. Generic renderer captions remain an integration follow-up.
- Diff reviewed: full source/test diff inspected; one optional shared field, no new dependency, no probe changes.
- Residual risk: older missing historical predicates, one-time renewal-case identity replacement, renderer captions, stale builds and broader integration validation, as listed above.
- Root-cause debugging: reproduced before edits, mechanism observed, reverse proof fails under restored old readers and passes after repair restoration.
- Commit-and-PR: explicit-path local commit only; working diff reviewed, no secrets or attribution trailers; staging blocked as recorded above. No PR or push.

---

## Historical Wave 1 record

Status: implemented and locally verified, uncommitted on `lane/wd-clocks` at `9b8ba9e59`. Git staging is blocked by filesystem permissions (Commit handoff below). Integration gates and player inspection remain open. Report completed 2026-10-25.

## Contract and diagnosis

Outcome: a President cannot reset a statutory deadline by reissuing a measure; enacted emergency limits and termination resolutions actually end the authority, while a genuinely new predicate permits a new episode.

Reproduction
- Command: `cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/law.probe.test.ts -t 'BREAK T1|BREAK E1'`
- Environment: this worktree, Node 22.23.1, Vitest 2.1.9; source engine imports.
- Data: the unchanged law probe's `law-probe-1` campaign; T1 uses the production day scheduler; E1 is a legacy turn-only fixture.
- Frequency: deterministic, one baseline run.
- Observed: T1: "re-imposed a fresh 15% Section 122 tariff on day 160: expected true to be false"; E1: "emergency still active at day 126 under the enacted act: expected true to be false". Two failures, seventeen tests skipped by the filter. T1's live-at-day-160 assertion was already zero.
- Expected: zero live Section 122 measures at day 160, reissue refused; no emergency authority at day 126 under the act.

Hypothesis: deadlines belong to individual instruments and the emergency check does not read enacted constraints.
Refuted by: a shared origin/deadline surviving reissue, or a statute constraint consulted during lapse.
Test: read `imposeTariff` (fresh calendar + 150 for every packet), `hasLapsed` (renewed turn + 52), and the act's `constrains` (only one blocked order); reproduced both failures without changing code.
Verdict: supported; no competing hypothesis survived these direct observations.

Cause
- Statement: the authority's identity and statutory ceiling are missing from the records consulted by issuance and lapse.
- Evidence: the three code paths above and both unchanged probes.
- Accounts for: ordinary tariff expiry works, reissue gets a new deadline; emergency law blocks construction but leaves the declaration running.
- Unexplained: none for T1/E1.
- Confidence: high for the implementation defect; the new-predicate abstraction is a design judgment.

History: these are original modeling gaps, not an established recent regression. Path history includes `0e140f27a` (tariff statute introduction).

## Primary text, opened 2026-10-24

- [19 U.S.C. 2132, GPO 2024 edition](https://www.govinfo.gov/content/pkg/USCODE-2024-title19/html/USCODE-2024-title19-chap12-subchapI-part2-sec2132.htm): (a) fundamental international payments predicates, maximum 15%, maximum 150 days unless extended by Act of Congress; (d) nondiscrimination and surplus-country exception; (e) broad product application; (g) modification/suspension/termination within the initial period or congressional extension.
- [50 U.S.C. 1622, GPO 2024 edition](https://www.govinfo.gov/content/pkg/USCODE-2024-title50/html/USCODE-2024-title50-chap34-subchapII-sec1622.htm): (a) termination by enacted joint resolution or presidential proclamation; (b)-(c) congressional review/procedure; (d) anniversary expiry unless continuation is published and transmitted within the preceding ninety days. The 1985 amendment replaces concurrent resolution with an enacted joint resolution.
- House preliminary-text endpoints returned HTTP 404. The GPO edition was available; post-2024 amendments and later judicial interpretations were not independently established. Neither opened statute supplies a complete rule for distinguishing a genuinely new payments episode. No judicial holding about serial Section 122 proclamations is claimed.

Calibration: exact day boundaries, zero tolerance. The 90-day limit is the fictional enacted act's contract, not a claim about current federal law. The engine lacks a full balance-of-payments account: national imports exceeding exports remains a labeled proxy. Recorded recovery followed by recurrence defines a new episode; partner/sector/proclamation changes do not. This is a design judgment, not a quotation of law.

Challenge: the strongest failure is resetting authority by renaming an instrument or changing targets. A permanent ban would remove legitimate later use; a country cooldown would be evadable. Accepted with controls: national episode identity, dated recovery evidence, shared enacted ceilings, repeat/reversal and save tests. Statutory product coverage, the substantial-deficit threshold, other Section 122 predicates, and NEA's detailed chamber scheduling remain outside this clock repair.

Reuse: searched the lane, engine records/effects, clock, trade findings, bill targeting and statute-book selectors, repo scripts, installed skills and sibling file inventories. Reuse calendar arithmetic, `apply`, the caused-record writer, trade expiry and legislation's existing presentment/veto/override. No reusable authority-episode clock exists in the inspected implementation; no dependency is added. Sibling working trees were not modified.

## Implementation and shared-contract edits

One optional `Campaign.authorityClocks` register holds authority, predicate identity, opening date, expiry, observed recovery, congressional extension and termination. Its `authorityClock` effect uses the existing caused-record writer and `apply`. `lawConstraints` merges enacted `authorityDays`; the common deadline reader takes the binding ceiling without moving the episode's opening date.

Section 122 issuance uses the national episode, including lifted measures. Its existing finding phase records recovery of the national imports/exports proxy. A deficit after that record can open a new episode. Existing daily trade expiry still performs the lift and price reversal; the daily hook first corrects overlong legacy reissues to their original episode's deadline. No partner cooldown and no permanent prohibition.

Emergency declarations name a condition/conflict predicate and keep their clock through early termination/reissue or changes of scope. New declarations expire on a civil anniversary, with a continuation notice only in the preceding ninety days; timely continuation advances the anniversary, not the notice date. The enacted limitation imposes ninety days from episode opening and cannot be reset by presidential renewal. Daily expiry writes the end record. Existing selector/readout helpers expose the effective ceiling and do not offer presidential renewal of a congressional limit.

Joint resolutions use `Bill.target`, fixed at introduction, with a new target hook beside the existing order hook. Passage, presentment, signature, default enactment, veto and two-thirds override remain in `legislation.ts`. Termination ends the named episode, including reissued declarations; it does not retarget a later unrelated emergency. Declaration IDs cannot overwrite an earlier same-week declaration. A renewal resolution, offered in the final thirty days of the modeled statutory limit, extends it ninety days only on enactment. This offering window is a game scheduling choice, not a NEA rule.

Shared/out-of-lane edits (all necessary integration hooks; no new subsystem or dependency):

- `state-campaign.ts`: optional authority-clock register.
- `state-emergency.ts`: shared clock shape and optional declaration clock ID.
- `record-effects.ts`, `effect-types.ts`, `effects.ts`: typed effect and existing causal record writer/dispatch.
- `day-step.ts`: daily emergency expiry and legacy tariff-deadline correction before existing expiry.
- `legislation.ts`: merged authority constraints, target pinning and enactment effects on all three enactment routes.
- `state-legislature.ts`: clarify that the existing bill target can name a declaration; no new field.
- `military-construction.ts`: pass the campaign to the emergency lapse check so raw declaration reads obey the statute book.

`save.ts`, `index.ts`, `resolution.ts`, all probes, all other lane files and generated `dist/` are unchanged.

## Save compatibility

No version bump in this lane. All new stored fields are optional; normal JSON save/load preserves clocks, predicate recovery and origins. A legacy declaration derives its existing 52-week renewal deadline and declared date from its turns, with the enacted ninety-day ceiling still binding. It adopts a dated clock on reissue, continuation or congressional action. A legacy Section 122 record supplies the earliest recorded measure date across all partners/sectors, including lifted records; absent evidence of recovery, no intervening episode is invented. The next daily step corrects any overlong live legacy measure before expiration. Untagged pre-v67 tariffs cannot be identified as Section 122 and are not relabeled. The integration owner should allocate the combined wave's save version if one is required.

## Exact documentation amendments for the integrator

Append to DECISIONS §6.7:

> Authority belongs to an episode, not to the latest instrument. A statutory clock retains its opening date through reissued measures and changes of country, sector or declaration scope; enacted limits bind issuance, renewal, authorization and lapse through that same clock. A genuinely new predicate can open another episode. For Section 122, the modeled national trade-deficit predicate must have a recorded recovery before recurrence can open another 150-day episode; this is a proxy for balance-of-payments distress, not a claim that a bilateral deficit establishes the statutory finding. A national emergency can be terminated by a joint resolution enacted through the ordinary signature, presentment-default or veto-override path. New declarations use civil anniversaries and a ninety-day continuation-notice window. The Emergency Powers Limitation Act caps an episode at ninety days unless Congress renews the named episode; presidential reissue cannot reset that cap.

Append to SCHEMA's Campaign/declared-emergency records:

> `Campaign.authorityClocks?` maps IDs to `AuthorityClock`: `{ id, authority: "s122" | "emergency", predicate, openedDate, expiresDate, recoveredDate?, terminatedDate?, authorizedThrough?, causedBy? }`. Dates are `GameDate`; the authority's cause is stamped through the existing caused-record effect writer. `DeclaredEmergency.authorityClockId?` links declarations to that episode. `Bill.target?` also pins the declaration named by emergency termination/renewal resolutions. These additive fields are absent on legacy saves, whose clocks are derived conservatively from retained records. `LawConstraint.authorityDays?` carries enacted duration ceilings by authority. `Effect` gains `authorityClock` with `set: AuthorityClock`.

Append to ARCHITECTURE's emergency/trade and legislation sections:

> The authority clock in `emergency.ts` reads the merged enacted ceilings from `lawConstraints`; the same effective deadline governs action checks, renewal and daily expiry. Section 122 issuance in `tariff-orders.ts` reuses one national payments episode and writes no new clock merely because its partner, sector or measure changes. Its finding phase records national-predicate recovery; a later deficit can open a new episode. The day scheduler corrects overlong legacy tariff deadlines before existing trade expiry. Emergency termination and renewal are catalog resolutions whose target is frozen at introduction; `enactmentEffects` applies them on signature, unsigned enactment and successful override. Failed or pending bills confer no authority and end none. A termination reaches all declarations of its named episode but cannot change an unrelated later episode.

Suggested BACKLOG BL-278 result text (append final verification counts from the record below):

> The authority episode survives reissue and target changes. Section 122 requires recorded national-predicate recovery before a new episode; enacted emergency ceilings bind the same dated authority clock; NEA termination and congressional renewal use the existing bill, veto and override path. Local implementation and proof: `docs/audits/2026-10-24-world-dynamics/lanes/clocks.md`. UI inspection, combined-wave balance and full gates remain integration work.

## Final design challenge (self-review)

VERDICT: Accepted with controls.

Steelman: the change keeps one dated authority episode while reusing the existing records, effect writer, daily scheduler and bill machinery. It closes the reset without making future lawful use impossible and makes the fictional enacted ceiling effective on the authority itself.

1. Strongest failure: a President ends a declaration while a termination bill is pending, then reissues it under another ID. Termination now follows its pinned declaration's episode, and a regression covers that sequence. A different later predicate remains untouched.
2. Best alternative: deriving the entire clock from retained measures would avoid shared state. It cannot retain observed recovery reliably or distinguish a later episode from a reissue; the optional caused-record register is justified. A partner cooldown and permanent ban both fail the stated contract.
3. Load-bearing claims: 150 days/15%, the NEA enacted-resolution requirement and ninety-day notice window were opened in the GPO primary texts above. The modeled ninety-day cap comes from the game's own act. The national trade proxy and recovery test are design judgments; no new judicial holding is claimed.
4. Assumption inversion: if a goods deficit is not a payments crisis, the eligibility rule is only a proxy. A complete payments account, the substantial-deficit finding, nondiscriminatory/product coverage and alternative statutory predicates need their own sourced specification. This lane does not claim to have resolved them.
5. Who pays: existing campaigns would bear any silent reset or retroactive invented recovery. Legacy dates therefore remain conservative, no recovery is invented, and overlong legacy measures are corrected before the next daily expiry. The integration owner bears shared-file reconciliation and the combined save-version/doc changes.
6. Hostile expert: NEA committee/conference deadlines and six-month congressional consideration are not modeled by ordinary bill scheduling. The separate targeted IEEPA register (`external-emergency.ts`/`Campaign.externalEmergencies`) is outside the assigned file set and is unchanged; these resolutions target the national declarations in `Campaign.emergencies`. Extending the same legislative target/clock to that register is an integration follow-up, not a claim made by this implementation.

Findings: no remaining fatal finding within the assigned clock paths; two serious scope controls: the payments proxy must stay labeled, and the result must not be presented as a complete model of NEA procedure or every separately modeled emergency authority. No independent reviewer was launched.

## Verification results

Setup: `pnpm install --offline --frozen-lockfile` failed because `@types/pngjs` was absent from the local store. The prescribed fallback, `pnpm install --frozen-lockfile`, completed successfully. No lockfile change. No corpus symlink was needed. The install-created cache was moved out of the worktree to temporary storage.

Check: baseline, reverse proof and final probe.
Command: `cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/law.probe.test.ts -t 'BREAK T1|BREAK E1'`
Result: two expected failures on the baseline, the same two failures with only the repaired guards temporarily disabled, then two passes on the restored final tree.
Observed: T1 has zero live measures at day 160 and refuses reimposition; E1 has no authority at day 126 under the enacted act. Seventeen unrelated tests were skipped by the filter. The fixes were restored in a `finally` block before final verification; no probe was modified.

Check: requested whole law-probe file.
Command: `cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/law.probe.test.ts`
Result: T1 and E1 pass; the whole file remains red on other lanes' open breaks.
Observed: 8 passed, 7 failed, 4 todo, 19 total. Failures: R1, R2, R3, R4, C1, L2, L3. The file includes its own report-only reckless proxy campaign; no standalone balance harness was run.

Check: final targeted ordinary tests.
Command: `cd packages/engine && npx vitest run src/tariff-orders.test.ts src/emergency.test.ts src/legislative-acts.test.ts src/legislation.test.ts src/legislative-agenda.test.ts src/trade.test.ts src/trade-volume.test.ts src/tariff-prices.test.ts src/authority-boundaries.test.ts src/executive-authority.test.ts src/guard-federalization.test.ts src/save.test.ts src/law-lifecycle.test.ts src/signing-window.test.ts src/bill-flight.test.ts src/bill-provisions.test.ts src/effects.test.ts src/causality.test.ts src/order-families.test.ts src/blocked-assets.test.ts`
Result: pass.
Observed: 329 passed across 20 files. Direct module counts: tariff-orders 15, emergency 29, legislative-acts 9, legislation 58.

Check: scheduler/fiscal compatibility, earlier targeted runs before the last legacy correction and target-identity refinements.
Commands: `cd packages/engine && npx vitest run src/tariff-orders.test.ts src/emergency.test.ts src/legislative-acts.test.ts src/legislation.test.ts src/legislative-agenda.test.ts src/trade.test.ts src/trade-volume.test.ts src/tariff-prices.test.ts src/authority-boundaries.test.ts src/executive-authority.test.ts src/fiscal-authority.test.ts src/guard-federalization.test.ts src/save.test.ts src/day-step.test.ts src/turn-phases.test.ts src/law-lifecycle.test.ts src/signing-window.test.ts src/bill-flight.test.ts src/bill-provisions.test.ts`; `cd packages/engine && npx vitest run src/legislative-acts.test.ts src/emergency.test.ts src/tariff-orders.test.ts src/effects.test.ts src/week-identity.test.ts src/causality.test.ts src/order-families.test.ts src/blocked-assets.test.ts`
Result: pass.
Observed: 283 passed across 18 matched files in the first command (there is no `day-step.test.ts`; actual daily-boundary coverage is in the module regressions). The second passed 134 across 8 files, including all 3 week-identity cases. Additional coverage not in the final 20-file command: fiscal-authority 23, turn-phases 14, week-identity 3. These are targeted tests, not the full suite or balance harness.

Check: engine TypeScript.
Command: `npx tsc --noEmit -p packages/engine`
Result: pass.
Observed: exit 0 with no diagnostics. Run once, as the lane rules permit; `packages/engine/tsconfig.tsbuildinfo` deleted afterward.

Ordinary-test amendments: the emergency lapse test now advances the calendar to the actual anniversary and refuses late continuation; the notice test advances to the true ninety-day window. Those tests encoded turn-only timing and revival of an already expired declaration. The existing Section 122 cap test now uses an eligible real-world campaign instead of returning early on an ineligible toy fixture; it always exercises the cap and expiry.

Outcome proof: public `imposeTariff`, `declareEmergency`, `renewEmergency`, `transmit`, `signBill` and `vetoBill` return/apply real packets; the unchanged T1 probe advances production office days. Regression checks observe day 89/90 and 149/150 boundaries, day-160 refusal, cross-country/sector reissue, lift/reimpose, later recovery/recurrence, named legislative targets, failed/successful overrides, default enactment, saved provenance and identical continuation after reload. Targeted fixture tests do not establish a historical incidence or balance distribution.

Not run: build, workspace typecheck, lint, full suite, verify scripts, standalone balance harness, or a running player UI, per lane scope. `dist/` intentionally remains for the integration build. The emergency selector's countdown/renewal helpers are tested, but the actual screen and calendar renderers are not visually proven. Matched campaigns across all parties and combined-wave replay remain the integration checkpoint.

Verification record
- Project inspected: answered above, "One optional `Campaign.authorityClocks` register"; shared edits listed individually.
- Reuse checked: answered under Contract and diagnosis, "Reuse calendar arithmetic, `apply`, the caused-record writer, trade expiry and legislation".
- Validation path run: answered above, "329 passed across 20 files", plus the exact probe and typecheck commands.
- Outcome observed: engine action/record boundary proven as above; actual player UI not proven within this lane's build restrictions.
- Surface inspected: not done; no running player UI was built or opened. Display integration remains for the integration owner.
- Diff reviewed: full source/test diff reviewed against the three requested behaviors, new-predicate control, persistence, provenance and scope.
- Residual risk: payments-proxy and NEA/IEEPA scope controls listed in Final design challenge; broader gates, visual inspection and combined campaigns remain for integration.
- Root-cause debugging: both unchanged probes reproduced, mechanisms observed before edits, both guards challenged in reverse and restored; no unexplained T1/E1 residual.
- Adversarial review: accepted with controls, all six challenges answered above; shared-context self-review, no independent agent.
- Commit-and-PR: explicit-path local commit requested; staged diff/branch/message checks precede it. No push or PR requested.

## Commit handoff

The explicit-path `git add` failed before staging:

```text
fatal: Unable to create '.git/worktrees/admin-app-wd-clocks/index.lock': Operation not permitted
```

The worktree's Git metadata is outside this session's writable roots. No commit was created, no branch was switched and nothing was pushed. The implementation remains in this worktree on `lane/wd-clocks`; HEAD remains `9b8ba9e59`. The full working diff was reviewed; a staged diff could not be read because staging was denied. No attribution trailer, secrets, corpus data or generated build outputs are included.

From this worktree, in a session allowed to write its Git metadata:

```bash
git add docs/audits/2026-10-24-world-dynamics/lanes/clocks.md packages/engine/src/emergency.ts packages/engine/src/emergency.test.ts packages/engine/src/tariff-orders.ts packages/engine/src/tariff-orders.test.ts packages/engine/src/tariff-statutes.ts packages/engine/src/legislative-acts.ts packages/engine/src/legislative-acts.test.ts packages/engine/src/legislation.ts packages/engine/src/day-step.ts packages/engine/src/effect-types.ts packages/engine/src/effects.ts packages/engine/src/record-effects.ts packages/engine/src/state-campaign.ts packages/engine/src/state-emergency.ts packages/engine/src/state-legislature.ts packages/engine/src/military-construction.ts
git diff --cached
git -c commit.gpgsign=false commit -m "Keep statutory authority clocks across reissued measures" -m "Track the payments or emergency episode independently of each instrument, apply enacted duration ceilings, and route emergency termination through the existing legislative veto and override path. Preserve conservative legacy deadlines and require recorded recovery before a new payments episode."
```

Commit-and-PR closing status: working diff reviewed, one authority-clock change, no secrets found, correct worktree branch, imperative message prepared, local commit explicitly authorized but blocked by filesystem permissions; no PR or push attempted.
