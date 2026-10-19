# Validation scheduling diagnosis — draft, settled-load controls pending

Date: 2026-10-15. This is a bounded diagnosis of the two failures in `/private/tmp/admin-shadcn-stable-tests.log`. The graph failure did not reproduce in the scoped unchanged run. The Studio failure has not yet been rerun with settled load. Concurrent validation is a supported hypothesis, not a proven explanation of either original duration. No graph implementation, test assertion, timeout, snapshot, or validator was changed in this investigation.

## Recorded failures and reproduction

Reproduction

- Command: `pnpm run test`, whose recorded expansion was `pnpm -r --no-bail run test`.
- Environment: primary checkout; recursive package tests overlapped. The coordinator also reported concurrent balance work. A later metadata check returned 18 available/logical CPUs; that does not measure CPU availability during either failure.
- Data: the existing full workspace suites, including the pinned founded-cast graph and the real temporary-file Studio session-repair fixture.
- Frequency: intermittent or environment-sensitive remains a hypothesis. One full failed run was inspected; one unchanged scoped graph rerun passed. The original failure has not been reproduced on demand.
- Observed: graph assertion `expected 5058.854749999999 to be less than 3000` at `packages/engine/src/person-network-graph.test.ts:187`; Studio `Test timed out in 90000ms` for `recovers a real session reader that the mounted-only runner rejects`.
- Expected: the measured graph build stays below the unchanged 3,000ms budget; the Studio test completes inside its unchanged 90,000ms deadlock timeout with its functional assertions satisfied.

The complete log reports engine 351 passing files/one failed file, 4,611 passing tests/one failure, and 733.57s package duration. The Studio file reports 99,140ms for the failing case; neighboring reader/defect cases took 77,684ms, 54,658ms, 46,789ms, 66,791ms and 62,881ms. Studio finished with 25 passing files/one failed file and 359 passing tests/one failure. The recursive summary is two failed packages and ten passing packages, exit 1. Those failures are retained; an affected scoped pass is not a full-suite pass.

## Local and CI scheduling differ

At the failing run, the root command did not bound workspace concurrency. The log shows engine starting alongside UI-web/API and Studio starting alongside player-core. Each package invokes Vitest, so package concurrency can combine with each Vitest process's own file-worker pool. Engine and Studio configs do not specify a worker cap. No effective worker count or memory-pressure trace was captured during the failures.

The existing `.github/workflows/rebuild-ci.yml` already serializes packages with `--workspace-concurrency=1` in three cost tiers. Its scheduling comment records an earlier session-driver failure under parallel packages. `.github/workflows/balance-harness.yml` runs balance as a separate job. `CLAUDE.md` lists build, types, lint, test, proof gates and balance as successive commands.

The coordinator has now changed the primary root test script to:

```bash
pnpm -r --workspace-concurrency=1 --no-bail run test
```

This preserves every package and the report-all `--no-bail` behavior. It does not cap Vitest's internal workers or prevent a separately launched balance job. The new script has not yet established a passing settled-load full run in this record.

## Unchanged graph observations

Check: unchanged scoped graph suite
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/engine exec vitest run src/person-network-graph.test.ts --maxWorkers=1 --minWorkers=1 --reporter=verbose`
Result: pass
Observed: four tests passed in 11.00s in the persistent institutions worktree. The budget test's complete callback took 1,880ms, including founding; this is not a measurement of the inner build alone. The other three graph-pin callbacks took 2,255ms, 2,150ms and 2,071ms. Log: `/private/tmp/shadcn-person-graph-isolated.log`.

The graph implementation, rule file and test had identical SHA-256 hashes in primary and isolated worktrees at inspection:

| Source | SHA-256 |
|---|---|
| `packages/engine/src/person-network.ts` | `162913b7b7f06c0082936bd35c4a2d98c36d989642909b933cea6e47bc3fde08` |
| `packages/engine/src/person-network-rules.ts` | `f4734fe320386a7015667fe213e00fb35048ea35897e1dbe9e286b4bbc25a1ca` |
| `packages/engine/src/person-network-graph.test.ts` | `ec9b6fff4ff485b05c0847a30f71089e62e3e2d73416a11ed3d4153af394ceba` |

All three original exact cast/edge/digest assertions passed. A separate direct built-engine diagnostic reconstructed the same `disposition-sweep-2026-09-04` founded cast using the test's choices, then called `buildPersonNetwork(cast, seed)` three times. It measured only that function with `performance.now()` and recorded `process.cpuUsage()` around each call:

| Run | Build wall time | Process CPU delta | Preserved result |
|---|---:|---:|---|
| 1 | 1,395.22ms | 2,274.53ms | 8,054 people; 22,221 edges |
| 2 | 1,323.34ms | 1,596.96ms | 8,054 people; 22,221 edges |
| 3 | 1,470.99ms | 1,832.84ms | 8,054 people; 22,221 edges |

Each direct run produced the pinned SHA-256 `b71b7851d0a2612ff38f2d9f2a7de67951290312a3dcfd47f3e02fa8c63c15a6`. Process CPU includes runtime/GC activity and is not a contention measurement. The host was not proven quiescent; “scoped” means one test file/one test worker, not an otherwise idle machine. These observations do not identify an avoidable algorithm regression or prove the cause of the 5,058.85ms run.

## Studio source reasoning, not a profile

The inspected first failing fixture contains two items, a setter and reader. The sequence makes nine full `validateScenarioDocument` calls on the expected functional path:

1. Old mounted-only run: setter driver validation and enforced gate (two); reader driver validation rejects the missing flag (one), so `gateResult` returns its failed result without another audit.
2. Sibling corpus construction: each of two parseable, valid sibling candidates passes its full eligibility gate (two).
3. Recheck: both successful items pass driver validation and the enforced gate (four).

`validateScenarioDocument` unconditionally evaluates `auditScenarios` and `auditReachability`. Default `auditReachability` invokes `previewBoards`, which freshly seals ten canonical campaigns and an optional partner campaign each call; that function has no memoization. Supplementary board families may add work when conditions require them. Thus repeated real-board construction is a concrete cost candidate. No profiler or settled timing has attributed the timeout to this work; the nine-call count is source reasoning, not a measured call trace.

No independent semantic/hang defect was found in this bounded read. `repairSessionCorpus` either returns when the survivor count is unchanged, or strictly reduces its finite candidate set, or exits at zero. `runJob` walks a finite two-item list. The fixture uses a unique temporary directory and awaits cleanup. Driver validation and the independent enforcement gate are intentional safeguards; removing, mocking, or bypassing them would alter the tested contract and is not proposed.

## Hypotheses and uncertainty

Hypothesis: unchanged graph construction deterministically exceeds 3,000ms on the pinned cast.
Refuted by: the unchanged budget assertion passing, with the exact graph pins intact.
Test: the scoped four-test suite passed; separate direct builds took 1,323.34–1,470.99ms with the same pinned result.
Verdict: refuted as a deterministic claim; this does not exclude environment-dependent graph cost.

Hypothesis: overlapping heavy validation amplifies wall time enough to produce the graph budget failure and Studio timeout.
Refuted by: either failure persisting under a controlled settled-load schedule, or a trace identifying an unrelated defect that explains it.
Test: observed package overlap, coordinator-reported balance overlap, neighboring slow Studio cases, existing CI scheduling rationale, and successful unchanged scoped graph observation. No controlled load/no-load comparison has been run.
Verdict: supported circumstantially, precise cause inconclusive; Studio settled rerun and scheduling-control verification remain pending.

Hypothesis: the Studio candidate-elimination loop can run indefinitely on the two-item fixture.
Refuted by: its finite, strictly decreasing-or-returning control flow.
Test: read `repairSessionCorpus` and its caller/test paths; no runtime instrumentation added.
Verdict: refuted by source control flow for this fixture; this is not a measured explanation of its 90-second timeout.

Cause

- Statement: no final root cause established; concurrent package/worker pools and separate heavy jobs are the supported scheduling hypothesis.
- Evidence: the full log, local/CI scheduling difference, unchanged graph pass and preserved output, and Studio's repeated real-gate work.
- Accounts for: resource-sensitive elapsed time and why an unchanged scoped graph can pass; this remains a mechanism consistent with the evidence.
- Unexplained: exact load, effective worker counts, memory pressure, and time allocation during the original failures; Studio behavior under settled load; whether package serialization alone controls the graph budget inside a default Vitest pool.
- Confidence: medium in the scheduling hypothesis, low in any precise timing attribution. Controlled settled reruns and profiling would raise confidence.

## Required controls and challenge

Recommendation: use the coordinator's serialized root command and run only one heavy validation family at a time. Let active balance work finish before another workspace, Studio, graph, proof/fixture-generation or browser verification workload starts. Retain the original failed log and record the settled run separately.

After load settles, the affected unchanged checks are:

```bash
pnpm --filter @admin/engine exec vitest run src/person-network-graph.test.ts --maxWorkers=1 --minWorkers=1 --reporter=verbose
pnpm --filter @admin/studio-cli exec vitest run src/jobs/repair-session-context.test.ts --maxWorkers=1 --minWorkers=1 --reporter=verbose
```

Those are affected checks, not replacements for `pnpm run test`. Final aggregate acceptance still requires the current-source full gate under the chosen schedule. Do not raise either budget/timeout. If a settled run still fails, stop treating concurrency as the explanation and collect targeted CPU/allocation/I/O evidence before changing code.

Strongest failure: serial packages still permit each package's internal Vitest pool, and independent commands remain possible; the graph budget could still fail. Serial execution can also lengthen wall time enough that developers skip the gate. Controls: preserve all packages/assertions, keep a single heavy-run schedule, and measure the settled result rather than assuming success.

Best alternative: additionally limit Vitest to one worker for every package, using existing flags. All inspected package test scripts use Vitest, and the scoped flags are observed working. That supplies a stronger scheduling bound but can increase full-suite duration; it has not been adopted or measured here. A speculative graph optimization or weaker Studio gate is not warranted by current evidence.

Verdict: **needs validation**. The scheduling change is a reasonable preventive control; neither original failure is certified fixed yet.

Diagnosis record

- Reproduced: not done: the original failures were inspected in the retained full log, but neither was reproduced on demand; unchanged scoped graph passed and Studio settled rerun is pending.
- Whole error read: answered: Recorded failures (“expected 5058.854749999999 to be less than 3000”; “Test timed out in 90000ms”).
- What changed: answered: Local and CI scheduling (“root command did not bound workspace concurrency”; primary now adds only `--workspace-concurrency=1`); graph source/rules/test hashes match.
- Hypotheses tested: answered: Hypotheses and uncertainty (“refuted as a deterministic claim”; “supported circumstantially”), two hypotheses refuted within their stated scope.
- Symptom explained: unexplained: precise original resource/timing attribution and settled Studio behavior; see Cause (“no final root cause established”).
- Measurement ruled out: not done: original elapsed-time failures are real assertions, but no historical resource/instrumentation trace establishes their source; callback duration and inner-build duration are distinguished above.
- Fix proven both ways: not done: serialized full rerun and controlled reverse-load reproduction are pending; no timing assertions were weakened.
- Hole closed: not done: primary scheduling control is added, but its settled-load outcome and aggregate acceptance remain unproven.
- Confidence: medium in scheduling sensitivity, low in precise attribution; settled reruns and a targeted profile would raise it.

## Bounded local worker control

The coordinator also bounded the local recursive test command to the existing
`--maxWorkers=2 --minWorkers=1` flags. Every inspected package uses Vitest; the
installed pnpm help confirms arguments after the script name are forwarded.
This preserves every package, case, assertion and timeout. It reuses the same
worker bound as the previously completed core rerun instead of allowing each
package to create a host-sized pool. Strongest cost: lower concurrency may
lengthen the aggregate. Best alternative: package serialization alone, leaving
internal resource contention uncontrolled. Accepted with controls: record the
actual current-source aggregate command/result; do not infer a pass or a
speedup from choosing a worker count. That aggregate remains pending.


Stable handoff disposition: the bounded current-source `pnpm run test` run was
interrupted by the coordinator during the owner-requested wrap-up. It is not a
passing aggregate or proof that scheduling fixes the original failures. The
original balance workers were resumed at2026-10-15 23:52:32UTC and then stopped;
no suspended test job remains. Preserve original failure logs and unchanged
limits for a future coordinated final-source run.
