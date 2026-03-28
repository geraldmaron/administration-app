# Plan: N8N-First Scenario Loop Rebuild

Status: phases 1–3 complete as of 2026-03-28. e2e validation in progress.

## Target State

1. N8N owns orchestration and model-call sequencing.
2. Firebase Functions own deterministic domain services: validation, prompt assembly inputs, audit, repair, storage, export.
3. Web and CLI surfaces become thin submitters that emit one canonical job shape.
4. Saved scenarios align with runtime behavior in the iOS game: scope, eligibility, effects, outcomes, and metadata all survive end to end.

## Confirmed Reset Decisions

1. Existing local N8N relay workflow assets are removed.
2. Existing remote game-related N8N relay workflows are deleted.
3. The old `n8n_webhook_url` relay path is removed from admin settings and generation APIs.
4. The rebuild uses orchestration in N8N plus service-endpoint calls to Functions per bundle.

---

## Phase 1. Canonical Contract — DONE

**Deliverables shipped:**
- `shared/generation-contract.ts` — canonical scope types and normalizer
- `shared/generation-job.ts` — canonical job record shape
- `web/src/lib/generation-request.ts` — builds requests using shared contract
- `functions/src/lib/generation-scope.ts` — thin wrapper around shared normalizer

**Acceptance:**
- Manual, regional, exclusive, and news jobs normalize scope consistently via `normalizeGenerationScope`.
- No active submitter writes ad hoc `generation_jobs` payloads.

---

## Phase 2. Backend Boundary — DONE

**Deliverables shipped:**
- `functions/src/lib/generation-models.ts` — `GenerationModelConfig` imported from shared; Ollama helpers added (`isOllamaModel`, `isOllamaGeneration`, `getModelFamily`, `getRequestedOllamaModels`, `stripOllamaPrefix`); `resolvePhaseModel` inherits the first Ollama model for unspecified phases in Ollama runs.
- `functions/src/background-jobs.ts` — `modelConfig` now uses shared `GenerationModelConfig`; Firestore trigger skips jobs with `executionTarget === 'n8n'` to prevent double-execution.
- `functions/src/index.ts` — accepts `executionTarget` from request body; routes accordingly.

**Acceptance:**
- Provider and phase-model selection are not reimplemented in multiple places.
- The backend can be called by N8N without depending on admin-web-specific behavior.

---

## Phase 3. N8N As Primary Orchestrator — DONE

**Deliverables shipped:**
- `functions/src/generation-services.ts` — two new HTTP endpoints:
  - `processGenerationBundle` — per-bundle generation pipeline (architect → drafter → audit → persist); n8n calls this per bundle during fan-out.
  - `updateJobProgress` — heartbeat endpoint; n8n calls this to keep the job record current.
- `functions/src/index.ts` — exports both endpoints.
- Both endpoints deployed to `us-central1`.
- `scripts/n8n/scenario-generation-loop.json` — main orchestration workflow: fetch job → mark running → fan-out bundles → aggregate → finalize.
- `scripts/n8n/scenario-generation-intake.json` — intake workflow: create job with `executionTarget: 'n8n'` → trigger loop.
- `scripts/n8n/scenario-generation-status.json` — status polling workflow.

**Deployed Function URLs:**
- `submitGenerationJob`: `https://us-central1-the-administration-3a072.cloudfunctions.net/submitGenerationJob`
- `getGenerationJob`: `https://us-central1-the-administration-3a072.cloudfunctions.net/getGenerationJob`
- `processGenerationBundle`: `https://us-central1-the-administration-3a072.cloudfunctions.net/processGenerationBundle`
- `updateJobProgress`: `https://us-central1-the-administration-3a072.cloudfunctions.net/updateJobProgress`

**Required n8n environment variables (set in n8n instance):**
- `GENERATION_INTAKE_URL` = `https://us-central1-the-administration-3a072.cloudfunctions.net/submitGenerationJob`
- `GENERATION_STATUS_URL` = `https://us-central1-the-administration-3a072.cloudfunctions.net/getGenerationJob`
- `PROCESS_GENERATION_BUNDLE_URL` = `https://us-central1-the-administration-3a072.cloudfunctions.net/processGenerationBundle`
- `UPDATE_JOB_PROGRESS_URL` = `https://us-central1-the-administration-3a072.cloudfunctions.net/updateJobProgress`
- `SCENARIO_GENERATION_LOOP_URL` = `<loop webhook URL after import>`
- `GENERATION_INTAKE_SECRET` = same value as in `.env.local`

**Acceptance:**
- N8N can drive a complete generation run end-to-end.
- Jobs created through n8n intake have `executionTarget: 'n8n'`; Firestore trigger skips them.
- Each stage emits observable status back into the job record.

---

## Phase 4. Enforce Runtime Game Logic — DONE

**Objective:** ensure generated content matches real game behavior.

**Deliverables shipped:**
- `functions/src/scenario-engine.ts` — `conditions` added to `SCENARIO_DETAILS_SCHEMA` and `SCENARIO_CORE_SCHEMA` (structured-output no longer strips it); `triggerConditions` added to `CONCEPT_SCHEMA` and `GeneratedConcept` type; `conceptContextBlock` extended to forward architect trigger hints to drafter; METADATA REQUIREMENTS block updated with conditions guidance; architect prompt updated to instruct `triggerConditions` output.
- `functions/src/lib/audit-rules.ts` — three new depth rules: `option-metric-overlap` (warn −4), `severity-effect-mismatch` (warn −4), `advisor-stance-uniformity` (warn −4); conditions validation rules: `conditions-invalid-metric` (error), `conditions-unreachable-range` (warn), `conditions-too-restrictive` (warn); `getAuditRulesPrompt()` extended with conditions canonical mapping.
- `functions/src/prompts/reflection.prompt.md` — conditions checklist item added.

**Acceptance:**
1. Scenarios with economic/crime/unrest themes now generate `conditions` gates that the iOS runtime reads.
2. Shallow scenarios (overlapping options, mismatched severity, uniform advisors) are flagged at audit time.
3. Players with strong metrics are filtered out of crisis scenarios by `GameStore.canSelectScenario()` (no iOS change needed — already implemented).

---

## Phase 5. Verification — COMPLETE

**Build validation:** passing — `tsc` (64 jest tests), `next build`, `vitest` (9 tests) all green as of 2026-03-28.

**E2E validation checklist:**
- [x] n8n workflows imported and active
- [x] n8n credentials configured (`admin-secret` HTTP Header Auth)
- [x] Dry-run job submitted via n8n intake webhook
- [x] Job completes with `status: completed` in Firestore
- [x] `processGenerationBundle` called per bundle
- [x] Scenarios staged in `pending_scenarios` (dry-run)
- [x] `conditions` wired through schemas, architect hint, drafter prompt, and audit
- [x] Depth audit rules deployed and active

**Architecture note:** `scenario-loop-runner` is now a combined intake+loop workflow (no self-call). It creates the job, responds with `jobId`, then fans out bundles and finalizes — all in one n8n execution. `scenario-generation-loop` is kept as a standalone trigger-based alternative.

---

## Done Definition

This reset is complete when:

1. There is one canonical generation job contract. ✅
2. Old relay-era submission semantics are gone. ✅
3. N8N is the intended orchestration layer. ✅
4. Functions expose deterministic, game-logic-aligned services. ✅
5. Web and CLI submission surfaces are thin wrappers over the same contract. ✅
