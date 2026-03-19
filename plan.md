# Plan: The Administration

Status: engineering execution plan as of 2026-03-17.

This plan replaces the corrupted prior file and focuses on the next implementation sequence for the scenario architecture, Firebase schema evolution, and runtime alignment work.

## Current State

The base platform is already live and usable.

Completed baseline:

1. Country catalog, token system, geopolitical metadata, parties, legislature data, and military data exist.
2. Scenario generation runs through Functions and CLI.
3. Scenario selection already supports country, legislature, government, geopolitical, and neighbor-event filtering.
4. Prompt templates are Firestore-first with local fallback.
5. Golden examples exist in `training_scenarios`.

Confirmed architectural gap:

The codebase is still bundle-centric in storage, generation jobs, dedup, and exemplar selection, while the approved content architecture now requires scope-tier, cluster, and source-aware planning.

## Primary Goal

Move from bundle-only content operations to `bundle x scopeTier x scopeKey` operations without replacing the existing Firebase model.

## Non-Goals

1. No per-country scenario collections.
2. No removal of tokenization.
3. No new bundle explosion.
4. No production dependence on LM Studio.
5. No broad rewrite of the iOS runtime before schema and inventory support exist.

## Execution Order

## Phase 1. Canonical Schema Upgrade

Objective: make the TypeScript contracts and Firestore documents capable of representing the approved architecture.

Deliverables:

1. Extend `ScenarioMetadata` with:
   - `scopeTier`
   - `scopeKey`
   - `clusterId`
   - `exclusivityReason`
   - `sourceKind`
   - `region_tags`
2. Extend `GenerationJobData` with scope-targeting fields so jobs can request deficits intentionally rather than only by bundle.
3. Define canonical string unions for scope tiers, source kinds, and exclusivity reasons in shared types.
4. Update any save-path validation to reject incomplete acceptance metadata for new-scope scenarios.

Files expected:

1. `functions/src/types.ts`
2. `functions/src/background-jobs.ts`
3. `functions/src/storage.ts`
4. `functions/src/scenario-engine.ts`

Acceptance criteria:

1. `npx tsc --noEmit` passes for Functions.
2. Existing scenario saves still work.
3. New scenario saves can persist full scope metadata.

## Phase 2. Firestore Query and Index Upgrade

Objective: make inventory planning and retrieval efficient for the new metadata model.

Deliverables:

1. Add indexes for active scenario inventory queries by:
   - `metadata.bundle + metadata.scopeTier + is_active`
   - `metadata.bundle + metadata.scopeKey + is_active`
   - `metadata.bundle + metadata.clusterId + is_active`
   - `metadata.bundle + metadata.sourceKind + is_active`
   - `metadata.bundle + metadata.region_tags + is_active`
2. Add `training_scenarios` indexes for bundle plus scope metadata plus audit score.
3. Confirm vector index strategy for `scenario_embeddings` under scope-aware dedup.
4. Correct rules drift where needed, especially prompt-template collection naming.

Files expected:

1. `firestore.indexes.json`
2. `firestore.rules`

Acceptance criteria:

1. New inventory queries are representable without table-scan style logic.
2. Rules are consistent with the live prompt collection names.

## Phase 3. Inventory Backfill and Migration

Objective: classify the existing scenario library into the new architecture without regenerating everything.

Deliverables:

1. Build a backfill script to infer `scopeTier`, `scopeKey`, `sourceKind`, and where possible `clusterId`.
2. Default migration behavior:
   - broad evergreen content -> `universal`
   - region-driven content -> `regional`
   - country-locked content -> `exclusive`
   - unresolved middle cases -> manual review queue or provisional cluster assignment
3. Record backfill provenance in acceptance or migration metadata.
4. Produce inventory report by `bundle x scopeTier x scopeKey` after backfill.

Files expected:

1. new or existing migration script under `scripts/`
2. `functions/src/storage.ts` if migration metadata is persisted there

Acceptance criteria:

1. Existing active scenarios can be counted by scope tier.
2. The report exposes obvious bundle or scope deficits.

## Phase 4. Golden Example and Prompt Upgrade

Objective: make training references and prompt overlays support scope-aware generation.

Deliverables:

1. Expand `training_scenarios` selection and seeding to preserve:
   - `scopeTier`
   - `scopeKey`
   - `clusterId`
   - `sourceKind`
   - severity and difficulty coverage
2. Keep `prompt_templates` as the base system.
3. Add scope-tier overlays rather than creating separate prompt systems.
4. Preserve bundle overlays, but layer scope overlays on top.

Files expected:

1. `scripts/seed-golden-examples.ts`
2. `functions/src/scenario-engine.ts`
3. `functions/src/lib/prompt-templates.ts`

Acceptance criteria:

1. Few-shot selection is no longer bundle-only.
2. Prompt assembly is deterministic and scope-aware.

## Phase 5. Dedup and Generation Alignment

Objective: make generation and dedup consistent with the documented local and production model policy.

Deliverables:

1. Update generation planning to operate on deficits, not raw bundle counts.
2. Make semantic dedup scope-aware.
3. Resolve the current local mismatch where LM Studio local generation skips embedding-based dedup.
4. Choose and implement one explicit local path:
   - LM Studio embedding model, or
   - documented local-only fallback dedup strategy
5. Keep deployed Cloud Functions on production-safe providers only.

Files expected:

1. `functions/src/lib/semantic-dedup.ts`
2. `functions/src/scenario-engine.ts`
3. `functions/src/background-jobs.ts`
4. CLI tooling under `functions/src/tools/`

Acceptance criteria:

1. Production dedup remains authoritative.
2. Local runs have an explicit and non-silent dedup behavior.
3. Scope-aware generation requests can be executed end to end.

## Phase 6. Runtime Selection Upgrade

Objective: let the game runtime use the new metadata to improve realism and variety.

Deliverables:

1. Add `scopeNeed` balancing to the selector.
2. Track recent scope history alongside recent tags and played IDs.
3. Log selector decisions with scope metadata and weighting contributions.
4. Preserve current hard gates and consequence or neighbor precedence.

Files expected:

1. `ios/TheAdministration/Services/ScenarioNavigator.swift`
2. `ios/TheAdministration/ViewModels/GameStore.swift`

Acceptance criteria:

1. Selection behavior remains deterministic enough to tune.
2. End-to-end runs show the intended early or mid or late scope mix.

## Phase 7. Validation and Quality Gates

Objective: make the migration measurable and safe.

Deliverables:

1. Add tests for new shared metadata contracts.
2. Add script-level validation for backfill and inventory reporting.
3. Add smoke coverage for generation jobs with scope metadata.
4. Add a validation report for bundles with missing scope coverage.

Suggested checks:

1. `npx tsc --noEmit`
2. targeted Jest coverage for Functions
3. dry-run backfill report
4. dry-run golden-example seeding report

## Recommended Immediate Sequence

Execute in this order:

1. Phase 1 schema upgrade.
2. Phase 2 indexes and rules cleanup.
3. Phase 3 backfill report.
4. Phase 4 exemplar and prompt upgrade.
5. Phase 5 dedup alignment.
6. Phase 6 runtime selector upgrade.
7. Phase 7 validation hardening.

## Risks To Manage

1. Backfill heuristics may overuse `universal` unless cluster mapping is explicit.
2. Local LM Studio policy is currently stricter than the live dedup implementation.
3. Query/index growth can become noisy if scope fields are added inconsistently.
4. Exclusive content can sprawl if cluster definitions are too weak.

## Done Definition

This work is complete when all of the following are true:

1. Scenario docs, job docs, and training docs all carry canonical scope metadata.
2. Firestore indexes support scope-aware inventory and retrieval.
3. Existing scenarios are backfilled enough to report real deficits.
4. Prompting and few-shot selection are scope-aware.
5. Dedup behavior is explicit for both production and local runs.
6. The iOS selector uses scope metadata to shape run-level variety.
