# Scenario Generation Specification

Status: approved generation design and migration contract as of 2026-03-17.

This document defines how new scenarios should be requested, drafted, audited, accepted, and saved under the scope-tiered content model.

## Core Decision

OpenAI remains the canonical production generation path.

LM Studio is the required local generation path for the full pipeline. Local CLI and emulator runs should use LM Studio across architect, blueprint, drafter, repair, quality review, narrative review, and embedding or dedup phases.

## Engineering Verdict

The current Firebase generation model should be extended, not replaced.

Keep:

1. `scenarios`
2. `generation_jobs`
3. `prompt_templates`
4. `training_scenarios`
5. `scenario_embeddings`

Required upgrades:

1. scope-aware fields on job documents and scenario documents
2. scope-aware inventory queries and indexes
3. scope-aware golden-example selection
4. explicit local dedup behavior for LM Studio runs

## Model Policy

| Phase | Production Default | Local Default | Notes |
|-------|--------------------|---------------|-------|
| Architect concepts | OpenAI | LM Studio | Concept quality must still pass downstream gates |
| Blueprint planning | OpenAI | LM Studio | Only used for premium multi-act paths |
| Drafter | OpenAI | LM Studio | Draft quality still passes full audit and acceptance |
| Repair | OpenAI | LM Studio | Local repair stays on the same provider family as the draft path |
| Content quality review | OpenAI | LM Studio | Same rubric, local provider |
| Narrative review | OpenAI | LM Studio | Same rubric, local provider |
| Embeddings / semantic dedup | OpenAI | LM Studio | Requires a local embedding-capable model or equivalent local dedup path |

Rules:

1. Deployed Cloud Functions must reject LM Studio models.
2. Emulator and CLI flows should use LM Studio for all local phases.
3. Local runs must fail fast if a required LM Studio phase is unavailable; they should not silently route to OpenAI.
4. Saved scenarios should pass the same audit, repair, and acceptance policy regardless of where the initial draft was produced.

### Local Model Configuration Rule

For local execution, `modelConfig` should explicitly set every supported phase to an `lmstudio:*` model family.

Example:

```json
{
  "modelConfig": {
    "architectModel": "lmstudio:architect",
    "drafterModel": "lmstudio:drafter",
    "repairModel": "lmstudio:repair",
    "contentQualityModel": "lmstudio:quality",
    "narrativeReviewModel": "lmstudio:narrative",
    "embeddingModel": "lmstudio:embedding"
  }
}
```

If LM Studio does not expose a usable embedding model, local runs should use a documented local-only dedup fallback rather than OpenAI.

## Job Input Contract

All generation should move toward explicit deficit-driven jobs.

### Canonical Job Shape

```json
{
  "bundle": "diplomacy",
  "count": 24,
  "mode": "manual",
  "scopeTier": "cluster",
  "scopeKey": "cluster:small_island_tourism_state",
  "clusterId": "small_island_tourism_state",
  "region": "caribbean",
  "applicable_countries": [],
  "sourceKind": "evergreen",
  "distributionConfig": {
    "mode": "auto"
  },
  "modelConfig": {
    "architectModel": "gpt-4o-mini",
    "drafterModel": "gpt-4o-mini"
  }
}
```

### Field Rules

| Field | Rule |
|-------|------|
| `scopeTier` | Required for all new jobs |
| `scopeKey` | Required for all new jobs |
| `clusterId` | Required when `scopeTier=cluster` |
| `region` | Required for regional jobs, optional for cluster jobs |
| `applicable_countries` | Allowed only for exclusive jobs and narrow news jobs |
| `sourceKind` | Required; drives acceptance and quota reporting |

Current live gap:

`GenerationJobData` does not yet fully carry these fields in shared code, so this contract is the implementation target rather than the current guaranteed runtime shape.

## Deficit-Driven Planning

Do not generate by bundle total alone.

Generate by inventory deficit across these dimensions:

1. Bundle.
2. Scope tier.
3. Region or cluster.
4. Severity.
5. Difficulty.

### Example Deficit Records

```text
economy x cluster x small_island_tourism_state x medium severity x difficulty 3
diplomacy x regional x caribbean x high severity x difficulty 4
infrastructure x universal x universal x medium severity x difficulty 2
```

## Prompt Modes

Generation prompts should branch by scope tier.

### Universal Prompt Mode

Optimize for transferability.

Rules:

1. Avoid unique constitutional assumptions.
2. Favor general institutional tokens.
3. Require clear mechanism and stakeholder specificity.
4. Strongest anti-boilerplate checks.

### Regional Prompt Mode

Optimize for geographic and bloc realism.

Rules:

1. Inject region note.
2. Encourage border, corridor, weather, trade route, and bloc dynamics.
3. Require a region-relevant causal chain.

### Cluster Prompt Mode

Optimize for shared-structure realism.

Rules:

1. Inject cluster brief describing the shared political, economic, and geographic reality.
2. Require the scenario to make sense across multiple countries in that cluster.
3. Permit stronger institutional specificity than universal prompts.
4. Reject disguised single-country assumptions.

### Exclusive Prompt Mode

Optimize for controlled uniqueness.

Rules:

1. Require `exclusivityReason` in the prompt.
2. Require narrow `applicable_countries`.
3. Reject output if the same idea could have been written at cluster scope.
4. Use sparingly.

## Pipeline Stages

### Stage 0. Inventory Planning

1. Query active scenario inventory.
2. Identify deficits by bundle x scope tier x target slice.
3. Issue jobs for deficits only.

### Stage 1. Concept Seeding

1. Produce concepts with severity, difficulty, primary metrics, actor pattern, option shape, and loop eligibility.
2. Scope tier must shape the concept prompt.
3. Concepts should declare intended `scopeKey`.

### Stage 2. Blueprint Planning

1. Only for premium or multi-act scenarios.
2. Universal and lower-complexity scenarios may use direct draft path.

### Stage 3. Drafting

1. Draft complete scenario JSON.
2. Attach target metadata before audit.
3. Normalize token aliases and invented ministry names.

### Stage 4. Audit and Repair

Run deterministic checks first, then LLM repair only for fixable issues.

### Stage 5. Scope Integrity Review

New audit family:

| Scope Tier | Required Check |
|------------|----------------|
| Universal | No country-unique institutional assumptions |
| Regional | Real regional causal relevance exists |
| Cluster | Cluster audience is coherent and multi-country |
| Exclusive | Valid `exclusivityReason` and narrow justified scope |

### Stage 6. Semantic Dedup

Dedup should be scope-aware.

Rules:

1. Universal compares against universal, regional, and adjacent cluster content.
2. Regional compares against regional and universal content in the same bundle.
3. Cluster compares against the same cluster, same bundle, plus broad-scope neighbors.
4. Exclusive compares against same country, same cluster family, and broad-scope analogs.

### Stage 7. Acceptance Policy

Scenario is accepted only if:

1. Audit score meets threshold.
2. Scope integrity passes.
3. Semantic dedup passes.
4. Content quality gate passes when enabled.
5. Narrative review passes when enabled.
6. Metadata is complete and internally consistent.

### Stage 8. Save and Export

On save, persist:

1. Full scenario document.
2. Scope metadata.
3. Acceptance metadata.
4. Prompt/model version metadata.
5. Dedup provenance if useful for diagnostics.

## Current Live Gaps

These are the concrete mismatches between the approved design and current code:

1. `ScenarioMetadata` does not yet include all required scope fields.
2. `GenerationJobData` is still primarily bundle-oriented.
3. `training_scenarios` retrieval is bundle plus score driven rather than scope-diversity driven.
4. `scenario_embeddings` dedup is OpenAI-based and bundle-scoped today.
5. Local LM Studio generation currently has an explicit semantic-dedup gap unless a local embedding path or fallback is implemented.

## Audit Policy by Scope Tier

| Policy | Universal | Regional | Cluster | Exclusive |
|--------|-----------|----------|---------|-----------|
| Token enforcement | Strict | Strict | Strict | Strict |
| Hardcoded name ban | Strict | Strict | Strict | Strict |
| Anti-boilerplate | Very strict | Strict | Strict | Strict |
| Scope integrity | Required | Required | Required | Required |
| Semantic dedup threshold | Highest | High | Medium | Medium |

## Acceptance Metadata

Every saved scenario should include a durable acceptance record.

```json
{
  "acceptanceMetadata": {
    "policyVersion": "v_next",
    "acceptedAt": "2026-03-17T00:00:00.000Z",
    "scopeTier": "cluster",
    "scopeKey": "cluster:small_island_tourism_state",
    "sourceKind": "evergreen",
    "modelFamily": "openai"
  }
}
```

## Operational Quotas

Recommended controls:

1. Per-bundle scope floor.
2. Per-cluster inventory ceiling to avoid overproduction.
3. Per-country exclusive ceiling.
4. Per-run cost ceiling.
5. Per-day news-generated scenario ceiling.

## Recommended Ceilings

| Slice | Ceiling |
|-------|---------|
| Exclusive scenarios per country per bundle | 12 active |
| News scenarios per bundle | 50 active |
| Same cluster in one generation run | 30 scenarios |
| Same exact `scopeKey` in one batch | 20 scenarios |

## Migration Order

1. Add `scopeTier`, `scopeKey`, `clusterId`, `exclusivityReason`, `sourceKind`, and `region_tags` to shared types and save paths.
2. Add generation-job support for scope-targeted requests.
3. Add indexes for scope-aware inventory and exemplar retrieval.
4. Backfill existing scenarios heuristically and publish an inventory report.
5. Expand golden-example seeding and retrieval to preserve scope diversity.
6. Split prompt overlays by scope tier.
7. Add scope-integrity audit rules.
8. Move generators to deficit-driven planning.
9. Resolve local LM Studio dedup behavior explicitly.
10. Tune runtime selection only after library backfill exists.

## Non-Goals

1. No removal of the token system.
2. No per-country scenario collection split.
3. No production dependence on LM Studio.
4. No uncontrolled growth of exclusive content.