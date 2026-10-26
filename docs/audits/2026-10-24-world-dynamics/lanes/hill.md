# Hill lane, Wave 2

Implementation complete; integration verification partial, 2026-10-25. Assigned checkout: `admin-app-wd-clocks`; actual branch `lane/wd-clocks`, clean starting HEAD `3c2ecd43d9298916a139c66e26b76ef836bfa1a0`. The owner reassigned this checkout to the Hill lane; no branch switch or other checkout is needed. Lane rules and METHODOLOGY.md read before changes. Shared documentation, probes, contracts, and generated output belong to integration and were not edited here.

## Intended outcome and calibration contract

Outcome: A President can ask a connected Hill broker to reach more colleagues, each free to refuse; remembered personal injuries make private persuasion harder once; alternating routine calls and envoys cannot bank more trust than a treaty.

All three targets are design judgments at the game's weekly abstraction, not empirical coefficient estimates. Sources checked in this checkout: `person-network-influence.ts`, `member-outreach.ts`, `member-votes.ts`, `congress-members.ts`, `state-legislature.ts`, `ties.ts`, `state-ties.ts`, `lobbying.ts`, `lobbying-person.ts`, `engagement.ts`, `relationships.ts`, `relationship-graph.ts`, their tests and the network probe. Reuse search covered structural/caucus/delegation/leadership contacts, grievance decay, relationship anchors and engagement history in engine source. Existing `retained`, `grievanceHalfLifeDays`, `elapsedDays` and `relationshipAnchor` provide the needed common mechanisms; no dependency or parallel ledger is needed.

| Item | Observed path and cause | Target and regression |
|---|---|---|
| BL-283 | `issueMemberOutreach` → `resolveMemberOutreach` → `propagateIssue` sees only recorded contacts. At founding, probe 1a reports contacts 0, reach 8, downstream responses 0, one person pressured. The biography degree reading is unrelated. | Ordering only: connected source reaches more recipients with equal willingness, including founding leadership. Exact invariants: two hops, one visit per recipient, refusal stops that route, sorted traversal. |
| BL-120 | `projectLobbying` → `memberTerms` → `memberWillingness` → `successChance`; grudges are written but absent from terms. Probe 4b reports 0.607 with and without five 0.2 grudges. | Ordering: private chance falls, then recovers with elapsed time. Exact accounting: the disposition term contains one deduction; preview and resolution consume that same term. Public appeals remain a judgment by voters. |
| BL-230 | `engagementPacket` → shared projection warmth; every call/envoy adds its fixed trust increment, even above the standing relationship. Existing memory only decays the accumulated gain. | Ordering: late gains below early gains; routine trust surplus below mutual defense's +0.18. Shared remaining need across call/envoy and both directions; recovery opens room again. |

DECISIONS §§1.1–1.12, 2.3–2.5, 3.7 and 4.8 apply. No committee membership roster exists: `CommitteeSeat` stores chair, ranking and balance only.

## Decisions before implementation

1. Derive a functional graph from the seated members' party/chamber, state delegation and current leadership, merged with accepted issue contacts. Use strongest weight per directed pair, deterministic priority, bounded weighted reach, and the existing independent recipient decision. Keep `.06 / depth` pressure. Strongest failure: a caucus becomes automatic obedience or repeated paths amplify pressure. Controls: willingness, deduplication, two-hop limit, bounded effort, refusal, and issue-pressure expiry/cap. Alternative: expand the biography graph; rejected because it is a display abstraction without these institutional facts. Accepted with controls.
2. Read personal grudge ages using the existing shared exponential decay at the grievance midpoint, since a person has no vengefulness field. Deduct up to 0.2 from the existing private disposition term, once. Do not erase stored grievances or add a second penalty to `memberWillingness`. Alternative: a new stored grudge clock/trait; unnecessary for a turn-stamped record. Accepted with controls; magnitudes remain provisional.
3. Bound routine trust by remaining room above `relationshipAnchor`, including durable treaty shifts. Calls and envoys share a +0.06 surplus ceiling and approach it proportionally to remaining need; tension relief and reception remain unchanged. Strongest failure: a per-instrument quota can be reset by changing instruments or initiator. The common directed relationship reading prevents both. Alternative: a second engagement-credit ledger; rejected because the existing anchor provides remaining need and decay. Accepted with controls. Other favorable acts also consume this remaining room; routine contact can repair a deficit but cannot erase recorded grudges or treaties.

## Baseline reproduction

Command: `cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/network.probe.test.ts -t 'centrality|a member who resents'`.
Observed: 2 failed, 2 passed, 10 skipped, 1 todo. Founding brokerage and personal grudges fail as described above; isolated recorded-contact attenuation is `1:0.06:true 2:0.03:true`. B2's functional-connectivity probe is still a TODO owned by integration. It will receive equivalent ordinary regression coverage here, plus an exact amendment request.

Setup: `pnpm install --offline --frozen-lockfile` passed (`Done in 1s`).

## Implementation and measured outcomes

- Functional standing weights: same non-independent party and chamber 0.02; shared state 0.5; caucus leadership connection 0.75; recorded accepted issue contact 1. Strongest connection per directed pair wins. Descending weight then recipient ID orders traversal. A leader/issue advocate retains the eight-recipient budget; other sources add `floor(weighted connectivity / 2)` to the existing chair/member/former-contact base of 6/2/1, capped at eight. Dead recipients are absent. Independents are not invented into a common caucus. These are provisional design weights, not observed political coefficients.
- Probe 1a: recorded contacts remain **0**; downstream responses **0 → 8**; people pressured **1 → 9**. The production `advanceUntilAttention` day scheduler separately observed **direct 1 versus brokered 9**, with identical save/reload continuation.
- Functional connectivity regression under equal willingness: **sparse 2, connected 4** recipients, with no recorded contacts. Shuffling the seated roster gives identical responses. B2's biography report now reads degree 3/reach 5 and degree 6/reach 3; that illustrates why biography degree is not the functional metric.
- Probe 4b: five 0.2 personal grudges lower the call chance **0.607 → 0.408**. The small difference from a 0.200 deduction is age since turn 0 and the existing three-place rounding. A separate 0.5-weight current grudge lowers score and chance by **0.100 once**, then **0.050** after the shared 819-day midpoint half-life. Public appeals retain the constituency-only terms. The stored grievance and cause are unchanged.
- Routine contact, 208 weekly checkpoints through `engagementPacket`, `apply` and the production memory phase on a controlled pair: calls bank **0.04913843697572501**, calls plus envoys **0.052099633680356305**, below mutual defense's source-checked **0.18**. First gain is **0.020000000000000018**; last-four mean gains are **0.003620521008878136** and **0.002206675261183094**. Every post-contact surplus stays at or below **0.06**. These are isolated mechanism measurements, not matched whole-world campaigns. The brief's old ~0.28/~0.47 plateaus were not independently rerun as an engagement campaign here.
- Saturation tests also cover reversing the initiator, switching call/envoy, preserving visit benefits, keeping tension relief and grievances, directional asymmetry, treaty-aware anchors, decay reopening room, and save continuation.

Ordinary tests updated: the two recorded-link-only traversal tests now explicitly remove standing seats in their isolated fixtures, so they still prove two hops, attenuation, duplicate prevention and refusal without unrelated new routes. The former office-only reach test now expects connectivity to contribute and office loss to reduce (not erase) retained reach. No audit probe or golden fixture was changed.

## Checks

Commands below ran from the checkout root unless they begin `cd packages/engine`. Logs are diagnostic scratch files under `/private/tmp` and are not deliverables or replacement golden fixtures.

```text
Check:    Targeted affected engine behavior
Command:  cd packages/engine && npx vitest run src/person-network-influence.test.ts src/member-outreach-budget.test.ts src/lobbying.test.ts src/lobbying-person.test.ts src/lobbying-advocate.test.ts src/ties.test.ts src/engagement.test.ts src/congress-members.test.ts src/hill.test.ts src/treaty-counterpart.test.ts src/npc-agent.test.ts src/cabinet-agenda-acts.test.ts src/cabinet-initiative.test.ts
Result:   pass
Observed: 13 files, 185 tests passed; /private/tmp/hill-targeted-final.log.

Check:    Final engagement fixture after correcting its branded treaty ID
Command:  cd packages/engine && npx vitest run src/engagement.test.ts
Result:   pass
Observed: 23 tests passed; /private/tmp/hill-engagement-final.log.

Check:    Final network assertions, including direct versus brokered scheduler control
Command:  cd packages/engine && npx vitest run src/person-network-influence.test.ts
Result:   pass
Observed: 13 tests passed; sparse 2 / connected 4, direct 1 / brokered 9, save continuation identical; /private/tmp/hill-network-final.log.

Check:    Existing founding-brokerage and personal-grudge ordering probes
Command:  cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/network.probe.test.ts -t 'a brokered request|a member who resents'
Result:   pass
Observed: 2 passed, 13 skipped; /private/tmp/hill-proof-final.log. The skips are selection, not deleted assertions.

Check:    Broader centrality controls, including unchanged attenuation probe
Command:  cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/network.probe.test.ts -t 'centrality|a member who resents'
Result:   fail
Observed: 3 passed, 1 failed, 10 skipped, 1 todo. Probe 1d compares two depth-1 recipients (0.06 versus 0.06); /private/tmp/hill-probe-after.log. See repair below.

Check:    Engine TypeScript, the single run allowed by the lane rules
Command:  npx tsc --noEmit -p packages/engine
Result:   fail
Observed: One TS2322 in the new engagement test's treaty fixture: string was not branded TreatyId. Corrected to a typed TreatyRecord with TreatyRecord["treaty"] assertion, matching the existing relationships test pattern. No production diagnostic. Not rerun under the one-run limit; final compile is unverified. /private/tmp/hill-tsc.log. Deleted packages/engine/tsconfig.tsbuildinfo afterward with pathlib.unlink.

Check:    The full cheap-favor probe section, including the other lane's relief case
Command:  cd packages/engine && npx vitest run --config vitest.probes.config.ts src/__probes__/network.probe.test.ts -t 'no unbounded chaining'
Result:   fail
Observed: Personal-grudge case passed; relief case failed: 12 shipments, first landed gain 0.036828870940953495, late landed mean 0.041971163148991755, total approximately 0.412. /private/tmp/hill-chaining-final.log. This is BL-284 in instruments-economic.ts, outside this lane; it was not weakened or patched here. Routine engagement chaining passes its separate regression above.

Check:    Hill golden before and after, without fixture update
Command:  cd packages/engine && npx vitest run src/hill-ledger-golden.test.ts
Command:  cd packages/engine && npx vitest run src/hill-ledger-golden.test.ts --reporter=default --reporter=json --outputFile=/private/tmp/hill-golden-after.json
Result:   fail
Observed: Both runs: 1 arithmetic mismatch, 1 Node-22-only digest skip. Parsed the complete expected/received diffs from both logs and compared all four runs × 30 weeks: no new Hill arithmetic difference from this lane. Detailed older-fixture drift below. No update flag used.

Check:    Whitespace and patch integrity
Command:  git diff --check
Result:   pass
Observed: No output.

Check:    Importing the changed willingness/engagement entry points first
Command:  cd packages/engine && npx vitest run src/module-load-order.test.ts -t 'engagement|lobbying'
Result:   pass on final isolated rerun
Observed: 2 passed, 18 selected out on Node 25.9.0; 2 passed, 18 selected out on Node 22.23.1 with the root shell's npx launched in packages/engine. Logs: /private/tmp/hill-load-order-exact-current.log and /private/tmp/hill-load-order-node22.log. Earlier attempts timed out at the unchanged 5000ms limit; no timeout limit or source change was used to pass.

Check:    Workspace build, workspace typecheck/lint/tests, proof sweep, balance harness, native/browser UI
Command:  not run
Result:   not run
Observed: Outside the Wave 2 lane authorization; these remain integration work. No claim of UI or matched-campaign proof.
```

The initial ordinary run failed three old network expectations that assumed standing ties did not exist. The first new engagement-control run also assumed a full-strength visit from an empty Secretary's chair; the existing 0.85 craft multiplier explained its 0.0425 rather than 0.05 trust. That assertion now compares the unchanged visit projection before/after routine contact. Both are test-contract repairs, not production patches toward a green check.

Module-load diagnosis (root-cause-debugging skill): the first two selected-import runs timed out on both entries at 5000ms while other verification processes were active/recent. Hypothesis: the new shared-decay import introduced an entry-order failure. Refuting observation: both original and current source load under identical isolated conditions. Tested by temporarily restoring only the four owned production files from HEAD, running the same command, restoring the working changes in `finally`, and running again. The exact Node 25 comparison passed baseline in 2.729s and current in 2.786s; the current source also passed on the pinned Node 22 runtime in 3.699s. This refutes a deterministic entry-order failure in this change. The precise cause of the earlier timing failures remains unisolated; resource contention is a hypothesis, not a proven diagnosis. No production fix or test-timeout adjustment was made. All four working files were restored and compared with their pre-experiment backups.

## Required probe repair, for integration only

The untouched probe 1d currently assumes `accepted[1]` is farther away than `accepted[0]`. Source inspection and output show all eight recipients now have `depth: 1`. Equal hop distances must have equal `.06 / depth` pressure. Making the second response smaller merely to pass this assertion would violate the mechanism.

Exact amendment for `network.probe.test.ts` 1d: isolate its authored chain by giving `linked.congress` an empty `members` array, keep its leadership source, and assert the accepted responses include depth 1 and depth 2; compare their deltas by depth, not position. Keep an explicit third-hop target absent, and keep duplicate-path and refusal coverage. The ordinary `person-network-influence.test.ts` has the equivalent passing control.

Exact amendment for the functional-connectivity TODO (B2): reuse the ordinary regression's matched-willingness fixture: same 12 seated people and policy preferences, no recorded dialogue, same party/chamber; source alone in its state versus all seats sharing that state. Assert that the latter reaches more recipients, all decisions accept under those controlled preferences, and reversing roster order preserves the result. Do not assert biography degree or a minimum political coefficient. Observed ordering here is 4 > 2.

## Save compatibility and blast radius

No shared-contract file, save schema, effect shape, exported index, dataset or generated file changed. Existing `TieGrudge.turn` supplies age; structural connections are derived from live seated records. Old saves acquire the new willingness reading at their existing age, and legacy trust surpluses are left intact to decay through the existing memory phase. The change does not retroactively subtract a benefit or erase a treaty. Public behavior changes flow through existing outreach/lobbying/engagement paths and their unchanged effect writers. Downstream consumers include vote pressure, lobbying forecasts and NPC engagement effects. New functional tie weights are not persisted or confused with the dossier biography graph.

## Exact documentation amendments for the integrator

**DECISIONS §4.8, append:**

> Personal grievances retain their cause, original weight and creation turn. Private Hill willingness reads their remaining weight through the shared exponential decay at the midpoint grievance half-life; the disposition term charges this once. Routine calls and envoys share the remaining room up to 0.06 trust above each directed relationship's structural and durable anchor. The increment shrinks with remaining room; reception and tension relief retain their existing rules. These magnitudes are provisional design values. Hill brokerage combines seated caucus, state-delegation and leadership ties with recorded issue contacts, weights connectivity within a bounded effort, visits each recipient once over at most two hops, and leaves every recipient free to refuse.

**ARCHITECTURE, “Authority, outreach and localized harm”, replace the member-outreach paragraph:**

> Member outreach runs through the existing issued-act calendar and lobbying ledger. An eligible broker follows weighted standing caucus, state-delegation and leadership connections together with directed recorded cooperation on the requested issue. The strongest connection per recipient wins; weight then person ID determines traversal. Office and weighted connectivity bound an effort at eight downstream recipients. Traversal stops at two hops, visits a recipient once, attenuates accepted pressure by depth and stops a route on refusal. Every recipient applies independent policy and constituency preferences. No committee membership roster is inferred from chair/ranking/balance. Direct and brokered requests share the daily attention budget. The biography graph remains a separate, capped dossier reading.

**ARCHITECTURE, lobbying/engagement explanation, append:**

> Private lobbying deducts 0.2 times capped decayed personal grudge weight inside the disposition term; both preview and resolution consume that term once. Public appeals continue to read voters' standing at home. Calls and envoys approach a shared surplus of 0.06 above each directed `relationshipAnchor`, including durable treaty shifts. Existing favorable departures consume the same room; swapping kinds or initiator does not reset it. Other engagement kinds, willingness, cooldowns and tension relief retain their existing rules.

**SCHEMA, “The relationship ledger”, replace “a public appeal that misses writes one, and it is stored but not yet decayed” with:**

> a public appeal that misses writes one. Its stored cause, weight and turn remain intact; `personalGrudgeWeight` reads the remaining weight using elapsed turn-days and the shared exponential midpoint grievance half-life. Private lobbying charges it once inside disposition. No new stored field or save-version change is required.

Add `personalGrudgeWeight` to that paragraph's reader list. Beside the existing `IssuedMemberLobbyAct`/`issuePressure` description, add: “Standing issue connections are derived from current seated records, not stored as new contacts; only resolved outreach records actual cooperation.”

**BACKLOG status amendments:** BL-283 implemented in this lane, ordinary connectivity/attenuation and production scheduler proof passed; integrate the two probe-contract repairs before closing. BL-120's Wave 2 grudge reader implemented and ordering proof passed; leave broader I3/primary/appointment work open. BL-230's saturation remainder implemented with the shared 0.06 surplus ceiling; full campaign calibration and player presentation remain integration proof. Do not mark any of these as having a clean final engine compile until the corrected fixture is rechecked.

**CONTENT_DOCTRINE:** no authored scoring-constant table or content schema changed. If adding engagement guidance, use: “Routine calls and envoys maintain a relationship with diminishing trust returns; neither guarantees agreement nor substitutes for a treaty. Read the projected packet for the current benefit.”

## Golden comparison

**No additional Hill arithmetic movement from this lane** across all 120 captured weeks. This is an observed comparison, not an assumption that unchanged voting code means unchanged votes: the complete received values from the baseline and final failure logs were parsed and compared by run/week/field. Forecast margins and non-Hill state are not included in that digest-free comparison. The new grudge term changes the controlled call forecast, but did not change a recorded outcome in these four golden runs.

The assigned HEAD already differs from the older golden as follows; final results have exactly the same differences:

| Run | First changed turn by field | First chamber change, pinned → received |
|---|---|---|
| ledger-0, prudent Democrat | removal 2; chamber/figures/probes/room 11; votes 13 | House 0.609 → 0.606, Senate 0.603 → 0.600 |
| ledger-1, reckless Republican | removal 2; chamber/figures/room/votes 11; probes 16; lobbying/open promises 21; settled favors 25 | House 0.476 → 0.477, Senate 0.575 unchanged |
| ledger-2, passive Democrat | removal 2; chamber/figures/probes/room 31 | House 0.519 → 0.515, Senate 0.529 → 0.525 |
| ledger-3, prudent Republican | removal 2; chamber/figures/room 6; probes 7; votes 14 | House 0.605 → 0.602, Senate 0.625 → 0.621 |

At turn 2, pinned → baseline/final removal is respectively **0.2395635606 → 0.2399776722**, **0.3282595848 → 0.3288178494**, **0.2215847790 → 0.2219635564**, and **0.2351372072 → 0.2355419184**. The reckless run omits the pinned successful turn-20 Speaker trade from the turn-21 lobbying record; that omission is already present before this lane.

Logs: `/private/tmp/hill-golden-before.log`, `/private/tmp/hill-golden-after.log`; parsed diagnostic copies under `/private/tmp/hill-golden-before-actual.json` and `/private/tmp/hill-golden-after-actual.json` are comparison data only, never installed as a fixture. The test skips its whole-campaign digest check under the package shell's observed Node **25.9.0**; the repository pin is **22**. The root shell is Node **22.23.1**, so merely inspecting root `node --version` would incorrectly describe the package test runtime. No fixture was re-captured.

## Verification record

- Project inspected: answered: see “Intended outcome and calibration contract” ("Sources checked in this checkout").
- Reuse checked: answered: see that contract ("Existing `retained`, `grievanceHalfLifeDays`, `elapsedDays` and `relationshipAnchor`").
- Validation path run: answered: see “Checks” ("13 files, 185 tests passed"); final compile and the unchanged probe 1d remain explicitly unverified/failing.
- Outcome observed: answered at the engine boundary: see measured outcomes ("direct 1 versus brokered 9", "0.607 → 0.408", "0.052099633680356305"); whole-world campaign and rendered-player outcome not proven.
- Surface inspected: not done: no rendered player inspection in this lane; integration must verify the explanations on the actual player surface.
- Diff reviewed: answered: full production and test diffs read, including updated expectations; no generated, shared-contract or golden-fixture edits.
- Residual risk: provisional network weights and engagement ceiling need matched campaign calibration; probe owner must repair 1d and replace B2's TODO; integrator must rerun TypeScript after the fixture correction and perform the Node 22 digest check and player inspection.
- Root-cause debugging: selected import checks pass for baseline and current source on the same runtime; earlier timing failure's precise cause remains unisolated, with no code change made for it.

## Commit handoff

No commit was created. Explicit staging of the network source/test failed with exit 128:

```text
fatal: Unable to create '.git/worktrees/admin-app-wd-clocks/index.lock': Operation not permitted
```

No permission escalation or alternate index was attempted. All changes remain unstaged in the assigned checkout. After integration verification, the exact scoped commit commands are:

```sh
cd .-wd-clocks
git add packages/engine/src/person-network-influence.ts packages/engine/src/person-network-influence.test.ts
git -c commit.gpgsign=false commit -m 'Carry Hill brokerage over weighted standing ties' -m 'Combine seated caucus, state delegation and leadership connections with recorded issue contacts. Preserve independent willingness, bounded two-hop traversal and recipient deduplication; verify founding brokerage through the day scheduler and save continuation.'
git add packages/engine/src/ties.ts packages/engine/src/ties.test.ts packages/engine/src/lobbying.ts packages/engine/src/lobbying.test.ts
git -c commit.gpgsign=false commit -m 'Charge decayed personal grudges once in Hill willingness' -m 'Read dated personal injuries through the shared grievance decay and deduct them only inside private disposition. Preserve constituency-based public appeals and use the same terms in forecast and resolution.'
git add packages/engine/src/engagement.ts packages/engine/src/engagement.test.ts
git -c commit.gpgsign=false commit -m 'Saturate routine diplomatic trust above standing ties' -m 'Calls and envoys share remaining room above each treaty-aware relationship anchor. Switching instruments or initiators cannot reset the benefit; keep reception and tension relief while testing repeat contact, recovery and save continuation.'
git add docs/audits/2026-10-24-world-dynamics/lanes/hill.md
git -c commit.gpgsign=false commit -m 'Record Hill lane evidence and integration follow-ups'
```

Commit discipline: full unstaged diff reviewed, no secrets or unrelated edits, scope split into three behavior changes plus this evidence record, existing lane branch retained. Staged-diff review and commits are not done because staging is sandbox-blocked. No PR or push was requested or attempted.
