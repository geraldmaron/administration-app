# Phase C brief: executive delivery and consequential secretaries

From the owner's 2026-10-11 execution brief, section 5, restated so it survives compaction. Read `PROGRAM.md` in this folder first; it has the measured baseline and the finding dispositions. Source lines cited there were read on 2026-10-11; re-grep before trusting one.

## Outcome

The executive overview answers: which responsibilities are being delivered, which are failing, why, who owns the work, and what the President can do. One aggregate capacity number is at most a defined secondary summary.

Keep five concepts apart: resources (money, workforce, facilities), execution capacity (valid work processable under constraints), output (completed claims, inspections, agreements, disbursements), service quality (delay, error and rework, coverage, integrity) and outcome (the consequential change sought). More spending is not more delivery; clearing a backlog by denying every case is not success.

## Findings to trace first (record a disposition for each in `PHASE-C-TRACE.md`)

- `packages/engine/src/institutions.ts`: `selectExecutorsFor` sorts by `implementationQuality` and `selectDeliveryCapacity` weights the best executor 0.7 and the rest 0.3, so the healthiest agency leads whatever its legal ownership. `department-ownership.ts` already maps U.S. responsibility. Reconcile them so task ownership is not replaced by whichever agency is healthiest. A required dependency (a legal approval) blocks or delays its stage; a high score elsewhere cannot average it away.
- `institutionTick` uses generic arrivals (6 x staffScale) and clearance (8.5 x staffScale x quality). Decide which shared service models are needed (queue/case processing, project delivery, negotiation/stages, readiness/maintenance) and where a generic queue is wrong.
- Secretaries: policy and department-ownership paths already consume the responsible secretary; institution-level competence deliberately excludes cabinet heads. Produce a person-attribute-to-consumer map before adding any attribute. Apply each leadership effect once.
- Cover every implemented cabinet portfolio (State, Treasury, Defense, Justice, Interior, Agriculture, Commerce, Labor, HHS, HUD, Transportation, Energy, Education, VA, Homeland Security: verify against the actual institution catalog). Each needs an explicit mechanism, a supported delegated or supervised work path, a visible reading and a perturbation test. Boundaries: State cannot force another government's consent; Treasury does not set the policy rate or appropriate funds; Justice is not rewarded for raw prosecution volume; Defense is constrained by civilian authorization, access and logistics; courts and independent agencies are not subordinates.

## Contracts proposed (adapt to the codebase; keep the distinctions)

`ServiceDefinition`, `ServiceRuntime` (store source quantities, derive totals), `ProgramExecution` (typed dependency edges: prerequisite, serial approval, parallel support, substitutable), `PortfolioGoal` (a lowered target must not rewrite past performance), `DepartmentContribution` (prefer deriving from recorded mechanisms over a new permanent score). Backlog reconciles: prior plus arrivals and rework, minus valid completions and withdrawals, each case once, with age buckets.

## Rules that bind this work

- A new field needs a producer, a mechanical consumer (or necessary authoritative record), a player-facing explanation and a test. A registry entry alone is not a consumer. No unused types.
- Save compatibility: new state is optional, absent on older saves, never backfilled with invented history. Read `packages/engine/src/save.ts` before editing state.
- Doc sync (blocking): `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change as any engine state or contract change; `docs/CONTENT_DOCTRINE.md` if scoring constants change.
- Keep the repo conventions in `CLAUDE.md`: no `any`, why-comments only, functions under 50 lines, files under 800, American English and US units, no doc or backlog ids in code comments.
- Never `git add -A`, never `git stash`. Commit with `git -c commit.gpgsign=false commit -o -- <paths>` and no attribution trailer.

## Acceptance (brief section 13.1)

GOV-01 low-capacity legally responsible lead cannot be bypassed by sorting a healthier unrelated agency first; a required dependency blocks or delays the stage. GOV-02 two differently qualified secretaries produce a measurable, explainable difference in the mechanisms their portfolio owns, and unrelated portfolios get no universal bonus. GOV-03 vacancy, acting, confirmation, replacement and resignation leave institutional history and resources intact. GOV-04 arrivals, valid completions, rework, withdrawals and aged backlog reconcile; higher throughput bought with more denial or error cannot hide worse service. GOV-05 department and component rollups do not double-count; ratios are not averaged without valid weights. GOV-06 lowering a target leaves an audit trail and does not rewrite past performance. INT-02 removing a purported consumer fails a test.

## Slice order

C1: the trace document and GOV-01. C2: shared service primitives plus the four representative portfolios (State, Treasury, Defense, and VA or Homeland Security) end to end: engine, selector, a screen reading, tests. C3: the remaining portfolios on the shared models. C4: delegation (Phase F) is separate; do not start it. Stop after each slice and report.
