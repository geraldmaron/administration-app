# Architecture — The Administration

End-to-end architecture of the political simulation game. This document is the principal-architect reference. It describes *how the system is built*, not *how to play it* (see `ABOUT_THE_GAME.md`) and not *the data schema* (see `SCHEMA.md`).

---

## 1. System Overview

The Administration is a multi-platform political simulation with four components:

| Component | Stack | Responsibility |
|---|---|---|
| **iOS client** | Swift + SwiftUI | Game runtime. Presents scenarios, captures decisions, mutates local game state, renders outcomes. |
| **Web admin** | TypeScript + Next.js 14 (App Router) | Authoring & ops surface. Generate scenarios, audit, repair, edit, view GAIA runs, manage countries, configure the backend. |
| **Firebase backend** | TypeScript Cloud Functions + Firestore + Cloud Storage | Scenario generation pipeline, GAIA self-improvement loop, country & token registry authority, job queue, scheduled world simulation. |
| **Scripts / tools** | TypeScript (`tsx`) | One-shot seeding, migrations, data nukes, archetype computation. |

The authoritative source of truth is **code in `functions/src/`**. Firestore is a derived mirror for the token registry, and a persistent store for generated artifacts (scenarios, embeddings, jobs, countries).

---

## 2. Scenario Lifecycle (canonical flow)

```
 ┌──────────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐   ┌────────┐   ┌────────┐
 │ Blitz / news │──▶│ Architect│──▶│ Drafter │──▶│ Audit  │──▶│ Repair │──▶│ Embed  │──▶ save
 │   trigger    │   │  (LLM)   │   │  (LLM)  │   │ (rules)│   │ (LLM)  │   │ dedup  │
 └──────────────┘   └──────────┘   └─────────┘   └────────┘   └────────┘   └────────┘
                                                       ▲             │
                                                       └─deterministicFix (code, no LLM)
```

| Stage | File | What happens |
|---|---|---|
| Trigger | `functions/src/lib/blitz-planner.ts`, `web/src/app/api/blitz/route.ts` | A job is created in `generation_jobs` with bundle, count, country scope, priority. |
| Claim | `functions/src/background-jobs.ts` | Scheduled function claims `pending` jobs, transitions to `running`, enforces a heartbeat so zombie runs can be recovered by `recoverZombieJobs` every 5 min (health at `world_state/zombie_sweeper_health`). |
| Architect | `functions/src/scenario-engine.ts` | LLM call produces an N-act blueprint. Standard path uses a synthetic 1-act blueprint. |
| Drafter | `functions/src/scenario-engine.ts` + `functions/src/lib/prompt-templates.ts` | LLM expands each act into a full `Scenario` with title, description, 3 options, effects, advisor feedback. Prompts inject the target country’s **facts and archetypes** so realism is baked in at draft time. |
| deterministicFix | `functions/src/lib/audit-rules.ts` | Pre-audit, no-LLM normalization: canonicalize roleIds, retokenize deprecated tokens, populate `applicability.requires` and `applicability.archetypes` from text scan + country lookup. Also runs linguistic determiner and double-article fixes via `functions/src/shared/linguistic-validator.ts`. |
| Audit | `functions/src/shared/scenario-audit.ts` | Rule engine validates tokens, voice, field lengths, effect counts, structural coherence (`{token}` ⇔ `applicability.requires`), applicability validity, and linguistic quality (determiner errors, double articles, sentence structure). Emits blocking errors and warnings with a 0–100 score. |
| Repair | `functions/src/scenario-engine.ts` (`applyRepairPatch`) | For issues the rule engine can't fix, a narrow LLM repair is invoked with explicit action instructions. Re-audits after each attempt, capped by `max_llm_repair_attempts`. |
| Embed | `functions/src/scenario-engine.ts` | `text-embedding-3-small` embedding; semantic dedup against `scenario_embeddings` with `SEMANTIC_SIMILARITY_THRESHOLD` (default 0.85). |
| Save | `functions/src/scenario-engine.ts` → `scenarios/{id}` | Scenario is persisted with `applicability`, metadata, acceptance provenance, and embedding sidecar in `scenario_embeddings/{id}`. |

All scenarios in `scenarios` MUST conform to the unified applicability contract (see §4 and `SCHEMA.md`). There is no legacy shape. Existing scenarios have been nuked.

---

## 3. GAIA — Self-Improvement Loop

`functions/src/gaia.ts`

GAIA is a scheduled (weekly, Monday 03:00 UTC) and on-demand reviewer. On each run it:

1. Samples existing scenarios and generates fresh ones against the same bundle.
2. Runs the full audit + deterministic fix on each, recording issue classes and scores.
3. Evaluates narrative quality via an LLM evaluator (`evaluateNarrativeQuality`).
4. Aggregates findings by stage (architect / drafter / repair) and produces recommendations.
5. Persists the run to `gaia_runs/{runId}` with per-scenario evidence and recommendations.
6. Optionally patches drafter / architect prompt addenda (prompt auto-patch loop) so future generations improve without human intervention.

Triggers:
- `gaiaScheduled` — weekly cron via `onSchedule`.
- `gaiaOnEnqueue` — Firestore trigger on `gaia_queue/{docId}` created by the web `/api/gaia` endpoint.

GAIA **does not** mutate scenario bodies. It edits prompts and recommends promoted exemplars.

---

## 4. Data Model — Unified Applicability

The scenario schema uses a single applicability block. See `SCHEMA.md` for the full type definition and field-by-field reference.

```ts
Scenario {
  id, title, description, options[], metadata, …
  applicability: {
    archetypes?: CountryArchetype[]       // first-class country shape (e.g. petro_exporter, island)
    requires:    { [flag]: true|false }   // structural facts (has_legislature, has_opposition_party, …)
    metricGates: MetricGate[]             // min/max on a country metric
    relationshipGates?: RelationshipGate[]// diplomacy / neighbor state
    applicableCountryIds?: string[]       // explicit allow-list when archetypes aren’t enough
  }
}
```

**Authority rules:**
- `applicability.requires` is the **only** structural gate. There is no `metadata.requires`, no top-level `Scenario.conditions`, no top-level `relationship_conditions`.
- `applicability.archetypes` is matched against `countries/{id}.archetypes`.
- `applicability.metricGates` replaces the old `Scenario.conditions` metric bounds.
- `deterministicFix` is the sole writer that derives `applicability.requires` / `archetypes` from text + country data before the audit runs.
- Audit blocks any scenario whose text mentions a token gated by a requires flag that isn’t declared in `applicability.requires`.

Country archetypes are computed once by `scripts/seed-country-archetypes.ts` from the country’s facts (GDP composition, geography, regime type, population tier) and stored on `countries/{id}.archetypes`. The enum lives in `functions/src/data/schemas/country-archetypes.ts`.

---

## 5. Token System (3 Layers)

The token system remains three-layered (see `SCHEMA.md` for the authoritative reference):

```
LAYER 1 (code, canonical)        LAYER 2 (Firestore mirror)        LAYER 3 (runtime derived)
functions/src/lib/token-registry — world_state/token_registry ──── countries/{id}.tokens
                                                                   countries/{id}/parties/{id}
```

Layer 1 is authoritative. Layer 2 is a read-only mirror written by `seed-token-registry.ts`. Layer 3 is computed from country facts + parties subcollection by `populate-country-tokens.ts` and refreshed by `gaia.ts` after each world simulation tick.

Article-form tokens (`the_*`) have been removed. `the_player_country` is invalid and blocked by the audit — use `{player_country}` and write "the {player_country}" naturally.

**Country determiner registry** (`functions/src/lib/country-determiner.ts`): authoritative set of country names that require "the" in English prose (e.g. "the Netherlands", "the United States"). Used by the linguistic validator and repair pipeline to detect and fix missing articles in generated text.

---

## 6. Country Token Refresh (GAIA tick + player actions)

`countries/{id}.tokens` used to be written once at seed time and then drift as party / institution state changed. Under the new model:

- `functions/src/gaia.ts` refreshes `countries/{id}.tokens` at the end of each tick via `derivePlayerPartyTokens()` + country fact re-computation.
- `functions/src/background-jobs.ts` exposes a `refreshCountryTokens` path that iOS can trigger when a player action changes a token-relevant fact (e.g., new opposition party elected).
- iOS `TemplateEngine` always reads the freshest `countries/{id}.tokens` on scenario render, with `scenario.tokenMap` overlaying it and computed values (`player_country`, leader name) injected last.

---

## 7. iOS Client

`ios/TheAdministration/`

### Bundle Sync

`Services/ScenarioBundleManager.swift` downloads versioned JSON chunk files from Firebase Storage.

- On each launch it fetches `world_state/scenario_manifest` (1 Firestore read).
- Chunks are re-downloaded only when the locally cached chunk version is stale.
- **Scenario-level delta (future):** the manifest now includes `scenarioHashes` (`Record<scenarioId, SHA-256>`). When this field is present, the client can diff local vs. remote hashes and mark only the containing chunks as stale, enabling per-scenario precision. The full algorithm is documented at the top of `functions/src/bundle-exporter.ts`. `ScenarioBundleManager.swift` does not yet implement the per-scenario diff path — the existing chunk-version mechanism remains operative.

### Fetch

`Services/FirebaseDataService.swift` loads scenarios filtered by the player country’s `applicability`:

1. `applicability.applicableCountryIds` must contain the player country, OR
2. `applicability.archetypes` must intersect the player country’s archetypes.

Filtering happens at the query layer where possible and in memory for set intersections.

### Selection

`ScenarioNavigator.swift` owns eligibility logic. Every pool (general, neighbor, crisis, premium) runs through a single `matchesCountry` filter that enforces:

- `applicability.applicableCountryIds`
- `applicability.archetypes`
- `applicability.requires` vs `country.flags`
- `applicability.relationshipGates` vs `country.geopoliticalProfile`

`matchesCondition` evaluates `applicability.metricGates` against the live `GameState`. There is no longer a code path that bypasses applicability (the old general pool did — it has been removed).

### Render

`Services/TemplateEngine.swift` resolves `{token}` references in priority order:

1. `scenario.tokenMap` (per-scenario overrides)
2. `country.tokens` (fresh from Firestore)
3. Computed (`player_country`, leader_name, etc.)
4. `gameState` derived (legislature composition, diplomacy relationships, party tokens)
5. Fallback → empty string for optional branches, flagged warning otherwise

### Mutation

`GameStore.swift` applies option effects via `ScoringEngine.applyDecision()`, evaluates crises, advances the turn, and — new under this rework — writes relevant country-token-affecting mutations back via `Persistence.swift` so the next refresh picks up the new state.

Local (device) state:
- `GameState` (metrics, cabinet, diplomacy, policy, active effects, turn counter)
- `playedScenarioIds`, cooldown queue, current scenario cache

Remote state:
- `scenarios/*`, `countries/*`, `app_config`, optional cloud save of game state.

---

## 8. Web Admin

`web/src/app/`

| Route | Purpose |
|---|---|
| `/generate` | Kick off scenario generation (blitz, news, manual). |
| `/scenarios` | Browse/search. Filters include archetypes + country allow-list + bundle. |
| `/scenarios/[id]` | Detail + edit. Editor surfaces the full `applicability` block (archetypes, metric gates, relationship gates, requires, country allow-list). |
| `/scenarios/repair` | Bulk repair of below-threshold scenarios. |
| `/jobs`, `/jobs/[id]` | Generation job queue + progress. |
| `/gaia` | Enqueue GAIA runs, inspect recommendations. |
| `/geopolitics` | Country relationships + archetype review. |
| `/token-registry` | Inspect the compiled token registry (read-only from Firestore mirror). |
| `/settings` | Model config, thresholds, feature flags. |
| `/simulate` | Apply option effects server-side for preview. |

All scenario write paths (`/api/scenarios/*`, `/api/blitz`) validate the new `applicability` shape and reject legacy fields.

---

## 9. Firestore Collections

| Collection | Purpose | Writer | Readers |
|---|---|---|---|
| `scenarios/{id}` | Canonical scenario definitions | generation pipeline, web admin | iOS, web, GAIA |
| `scenario_embeddings/{id}` | Embedding sidecar for dedup | generation pipeline | generation pipeline |
| `generation_jobs/{id}` | Job queue + progress | web admin, blitz trigger | cloud functions |
| `generation_metrics/*` | Per-run telemetry | cloud functions | web admin |
| `gaia_runs/{runId}` | GAIA run output + recommendations | `gaia.ts` | web admin |
| `gaia_queue/{docId}` | Manual GAIA enqueue | web `/api/gaia` | `gaia.ts` (consumed) |
| `countries/{id}` | Country facts, tokens, archetypes, geopolitical profile | seed scripts, `gaia.ts` | iOS, web, generation |
| `countries/{id}/parties/{partyId}` | Party subcollection (main opposition, ruling, etc.) | seed scripts | `gaia.ts`, iOS |
| `world_state/token_registry` | Read-only mirror of code token registry | `seed-token-registry.ts` | web admin |
| `world_state/zombie_sweeper_health` | Sweeper heartbeat | `recoverZombieJobs` | ops |
| `app_config` | Global feature flags, model selection, thresholds | web admin | all |
| `concept_seeds/*` | Cached architect outputs | generation pipeline, GAIA | generation pipeline |
| `news_articles/*` | Ingested real-world news | news import pipeline | generation pipeline |
| `world_events/{id}` | Inter-country actions generated by `worldSimulationTick` every 6h | `background-jobs.ts` | iOS (news feed) |
| `country_world_state/{countryId}` | Per-country metric snapshot + evolving relationships; updated each world tick | `background-jobs.ts` | iOS (diplomatic views) |

---

## 10. Generation Job Queue & Zombie Recovery

Jobs live in `generation_jobs` and transition `pending → claimed → running → completed|failed`. Each running job writes a heartbeat. `recoverZombieJobs` (every 5 min) reclaims jobs that have not heart-beaten for more than the stale threshold, recycles them to `pending`, and writes a health document at `world_state/zombie_sweeper_health` so ops can tell at a glance whether the sweeper is functioning.

See `background-jobs.ts` for the full state machine.

---

## 11. Deployment & Environments

- **Cloud Functions**: `cd functions && npm run deploy`. Environment config in `.env` (OpenAI key, Ollama base URL, thresholds).
- **Web**: `cd web && pnpm build && pnpm deploy` (Vercel / Firebase Hosting).
- **iOS**: `xcodebuild` via the `TheAdministration` Xcode project.
- **Scripts**: `cd scripts && pnpm -s tsx <script>.ts` — always dry-run first where a `--force` flag exists.

---

## 12. Ops Runbook — quick references

| Problem | Where to look |
|---|---|
| Zombie job stuck `running` | `world_state/zombie_sweeper_health` — if `lastRunCompleted` is stale, check Cloud Scheduler for `recoverZombieJobs` |
| Scenario audit blocking for missing `has_opposition_party` | `deterministicFix` in `audit-rules.ts` — should auto-set; if not, the requires registry is missing the token |
| iOS showing scenarios that reference institutions the country lacks | `ScenarioNavigator.matchesCountry` — verify `applicability.requires` is being enforced on **every** pool |
| Country tokens stale after gaia tick | `gaia.ts` — verify the `countries/{id}.tokens` write-back path is running |
| Token rejected as `invalid-token` | Check `TOKEN_ALIAS_MAP` in `token-registry.ts`; remember `the_player_country` and `the_*` article tokens are intentionally removed |

---

## 13. Doc Sync Contract

When you change the scenario schema, token system, audit rules, generation pipeline, GAIA, or country archetypes, you **MUST** update this file and `SCHEMA.md` in the same change. `CLAUDE.md` enforces this as a blocking review finding. Doc drift is the single biggest source of the problems this rework was built to eliminate.
