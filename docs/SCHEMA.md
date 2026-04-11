# Data Schema — The Administration

Authoritative reference for the scenario schema, token system, and country data model. Read this before adding, modifying, or migrating scenarios, tokens, roles, country archetypes, or applicability gates.

> For system architecture see `ARCHITECTURE.md`. For the player-facing premise see `ABOUT_THE_GAME.md`.

---

## 1. Scenario Schema

Every scenario in `scenarios/{id}` conforms to this shape. **There is no legacy shape.** The previous `metadata.requires`, top-level `Scenario.conditions`, and top-level `Scenario.relationship_conditions` fields have been removed and are rejected by the audit.

```ts
interface Scenario {
  id: string;
  title: string;              // ≤ 80 chars, headline-cased, no trailing punctuation
  description: string;        // 60–140 words, 2–3 sentences, journalistic tone
  options: ScenarioOption[];  // exactly 3
  metadata: ScenarioMetadata;
  applicability: ScenarioApplicability;
  tokenMap?: Record<string, string>;   // per-scenario token overrides
  createdAt: Timestamp;
  updatedAt: Timestamp;
  provenance: ScenarioProvenance;      // architect/drafter/repair history
}

interface ScenarioOption {
  id: string;                          // 'a' | 'b' | 'c'
  text: string;                        // ≤ 140 chars, imperative voice
  effects: ScenarioEffect[];           // 2–4 entries
  advisorFeedback: AdvisorFeedback[];  // 2–3 entries, each with canonical roleId
  outcomeHeadline: string;
  outcomeSummary: string;              // ~60–110 words, journalistic
  outcomeContext: string;              // short follow-up beat
}

interface ScenarioMetadata {
  bundle: BundleId;                    // e.g. 'economy','politics','military'
  severity: 'low' | 'medium' | 'high' | 'critical';
  difficulty: 1 | 2 | 3 | 4 | 5;
  scopeTier: 'global' | 'regional' | 'country' | 'archetype';
  scopeKey?: string;                   // region code or country id, depending on scopeTier
  region_tags?: string[];
  tags?: string[];
  source?: 'blitz' | 'news' | 'manual' | 'gaia';
  sourceKind?: string;
}

interface ScenarioApplicability {
  archetypes?: CountryArchetype[];               // OR-match against country.archetypes
  requires: Partial<Record<RequiresFlag, true>>; // structural facts (only `true` values carried)
  metricGates: MetricGate[];                     // replaces old Scenario.conditions
  relationshipGates?: RelationshipGate[];        // replaces old relationship_conditions
  applicableCountryIds?: string[];               // explicit allow-list
}

interface MetricGate {
  metric: MetricKey;                   // e.g. 'approval','economy','democracy','military_readiness'
  min?: number;                        // inclusive
  max?: number;                        // inclusive
}

interface RelationshipGate {
  kind: 'ally' | 'rival' | 'neighbor' | 'trade_partner' | 'occupied_by' | 'occupies';
  countryId?: string;                  // optional explicit partner
  state?: 'friendly' | 'hostile' | 'tense' | 'neutral';
}
```

### Authority rules

- `applicability.requires` is the **only** structural gate on tokens. Anything writing to `metadata.requires` or `Scenario.conditions` is a bug.
- `deterministicFix` (`functions/src/lib/audit-rules.ts`) is the **only** writer that derives `applicability.requires` and `applicability.archetypes` from text + country data. LLMs never set these directly.
- `auditScenario` (`functions/src/shared/scenario-audit.ts`) validates `applicability` and rejects scenarios that reference a gated token without the matching requires flag.
- Adding a new token, requires flag, archetype, or metric gate requires updating this document and `ARCHITECTURE.md` in the same change. See §9.

---

## 2. Country Archetypes

Countries are classified into one or more archetypes — first-class data that the generation pipeline and iOS selection pool both use to match scenarios to countries.

```ts
type CountryArchetype =
  | 'petro_exporter'
  | 'natural_resource_exporter'
  | 'manufacturing_economy'
  | 'service_economy'
  | 'island'
  | 'landlocked'
  | 'major_power'
  | 'regional_power'
  | 'small_state'
  | 'micro_state'
  | 'city_state'
  | 'federation'
  | 'unitary_state'
  | 'constitutional_monarchy'
  | 'absolute_monarchy'
  | 'parliamentary_republic'
  | 'presidential_republic'
  | 'one_party_state'
  | 'fragile_state'
  | 'developing_economy'
  | 'emerging_market'
  | 'developed_economy'
  | 'nuclear_power'
  | 'occupied_territory'
  | 'neutral_state';
```

Defined in `functions/src/data/schemas/country-archetypes.ts`. Computed from country facts by `scripts/seed-country-archetypes.ts` and stored on `countries/{id}.archetypes`.

**Matching rule:** `applicability.archetypes` is an OR-match. A scenario applies if **any** of its archetypes is present on the country. An empty or absent array means the archetype gate does not constrain the scenario.

### Adding a new archetype

1. Add the literal to the `CountryArchetype` union in `functions/src/data/schemas/country-archetypes.ts`.
2. Add the derivation rule to `computeCountryArchetypes()` in the same file.
3. Re-run `cd scripts && pnpm -s tsx seed-country-archetypes.ts --force` to repopulate all countries.
4. Update `docs/SCHEMA.md` (this file) and `docs/ARCHITECTURE.md` to document the new archetype.
5. If scenarios should be gated on it, add drafter prompt guidance in `functions/src/lib/prompt-templates.ts` so the LLM generates archetype-specific content.

---

## 3. Requires Flags

Requires flags are structural facts about a country that gate whether a scenario can apply. They are the only structural gate after this rework.

The complete flag-to-token mapping lives in `REQUIRES_FLAG_REGISTRY` in `functions/src/shared/scenario-audit.ts`. Canonical mappings:

| Token(s) | Required flag | Description |
|---|---|---|
| `{legislature}`, `{upper_house}`, `{lower_house}` | `has_legislature` | Country has a functioning legislature |
| `{opposition_party}`, `{opposition_party_leader}` | `has_opposition_party` | Country has a legal main opposition party |
| `{governing_party}`, `{governing_party_leader}`, `{coalition_party}` | `has_party_system` | Country has a multi-party or dominant-party system |
| `{central_bank}` | `has_central_bank` | Country has an independent central bank |
| `{stock_exchange}` | `has_stock_exchange` | Country has a domestic stock exchange |
| `{supreme_court}` | `has_supreme_court` | Country has a supreme court |
| `{constitution}` | `has_written_constitution` | Country has a codified constitution |
| `{monarch}`, `{royal_family}` | `has_monarch` | Country has a reigning monarch |

`TOKEN_REQUIRES_MAP` is derived automatically from `REQUIRES_FLAG_REGISTRY` — do not maintain it separately.

**Coherence rule (enforced by audit):** if scenario text contains `{opposition_party}` then `applicability.requires.has_opposition_party` MUST be `true`. `deterministicFix` auto-populates this; the audit only fails if the deterministic fix was unable to.

### Adding a new requires flag

1. Add an entry to `REQUIRES_FLAG_REGISTRY` in `functions/src/shared/scenario-audit.ts` with `tokens: [...]`, `flag: 'has_foo'`, and `condition: (country) => …` (a function that evaluates the flag against a country document).
2. Add the corresponding field to `countries/{id}.flags` via a seed/migration script.
3. Update this table.
4. `deterministicFix` will automatically pick up the new token→flag mapping and auto-populate `applicability.requires`.

---

## 4. The Token System (3 layers)

```
LAYER 1 — Code (canonical)
  functions/src/lib/token-registry.ts
  ├── TOKEN_CATEGORIES          all valid token names, grouped by category
  ├── ALL_TOKENS                flat union of every valid token string
  ├── TOKEN_ALIAS_MAP           informal/hallucinated names → canonical tokens
  ├── CANONICAL_ROLE_IDS        13 valid advisor roleId strings
  └── CONCEPT_TO_TOKEN_MAP      natural-language phrases → token names

  functions/src/shared/scenario-audit.ts
  ├── REQUIRES_FLAG_REGISTRY    requires flags with associated tokens + conditions
  └── TOKEN_REQUIRES_MAP        derived automatically from the registry

LAYER 2 — Firestore mirror (sync via seed-token-registry.ts)
  world_state/token_registry
  ├── tokensByName              one entry per token
  ├── aliasesByName             one entry per alias
  └── conceptsById              one entry per concept

LAYER 3 — Runtime country data
  countries/{id}.tokens               flat object, pre-resolved values
  countries/{id}/parties/{partyId}    party documents (isMainOpposition, isRuling)
```

Layer 1 is authoritative. Layer 2 is a read-only mirror consumed by the web admin UI. Layer 3 is derived from country facts + parties.

### Article forms are removed

All `the_*` article-form tokens (`the_player_country`, `the_leader_title`, etc.) have been **removed**. Write "the {player_country}", "the {leader_title}" naturally in prose. The audit rejects any remaining `the_*` usages with `invalid-token` (BLOCKING).

### Defining a new token

1. Add the name to the correct category in `TOKEN_CATEGORIES` in `functions/src/lib/token-registry.ts`.
2. If it needs a requires flag, add to `REQUIRES_FLAG_REGISTRY` (see §3).
3. If it has a country-specific value, add derivation logic to `deriveCountryTokenPatch()` in `country-token-derivation.ts` and re-run `populate-country-tokens.ts`.
4. Re-run `cd scripts && pnpm -s tsx seed-token-registry.ts --force` to sync Firestore.
5. Update this document if the token is user-facing or gated.

### Defining a new alias

1. Add to `TOKEN_ALIAS_MAP` in `token-registry.ts` (`'hallucinated_name': 'canonical_name'`).
2. Re-run `seed-token-registry.ts --force`.

### Country token refresh

`countries/{id}.tokens` is refreshed in two places:

- `functions/src/gaia.ts` rewrites the tokens block after each world-simulation tick, pulling fresh values from the parties subcollection and country facts.
- `functions/src/background-jobs.ts` exposes a `refreshCountryTokens` path that iOS can trigger when a player action changes a token-affecting fact (e.g., new opposition party elected).

Party tokens (`opposition_party`, `governing_party`, etc.) are derived from the parties subcollection and **overwrite** pre-seeded values at runtime. If the subcollection is empty the pre-seeded value is used as fallback.

---

## 5. Role System

### The 13 canonical advisor roleIds

Defined in `CANONICAL_ROLE_IDS` in `functions/src/lib/token-registry.ts`.

| roleId | Domain |
|---|---|
| `role_executive` | Chief political advisor — feasibility, coalition impact |
| `role_diplomacy` | Foreign affairs — international relations, treaties |
| `role_defense` | Defense — military readiness, national security |
| `role_economy` | Finance/treasury — fiscal impact, macroeconomics |
| `role_justice` | Legal — legal authority, constitutional constraints |
| `role_health` | Health — public health, healthcare access |
| `role_commerce` | Trade/commerce — business impact, markets |
| `role_labor` | Labor — workforce, employment, unions |
| `role_interior` | Internal affairs — domestic security, public order, civil services |
| `role_energy` | Energy — supply, grid stability, fuel policy |
| `role_environment` | Environment — pollution, conservation, climate |
| `role_transport` | Infrastructure — logistics, roads, ports, transit |
| `role_education` | Education — schools, universities, workforce readiness |

The JSON schema enum in `scenario-engine.ts` is derived from `CANONICAL_ROLE_IDS` at import time. Do not hand-maintain the enum.

### Hallucinated roleIds (normalized by deterministicFix)

| Hallucinated | Canonical |
|---|---|
| `role_bureaucracy`, `role_civil_service` | `role_interior` |
| `role_press`, `role_communications`, `role_media` | `role_executive` |
| `role_technology`, `role_innovation`, `role_digital` | `role_commerce` |
| `role_national_security` | `role_defense` |
| `role_intelligence` | `role_interior` |

Defined in `ROLE_ID_CANONICALIZATION` in `functions/src/lib/audit-rules.ts`.

### Adding a new role

1. Add the roleId string to `CANONICAL_ROLE_IDS` in `token-registry.ts`.
2. Add any hallucinated variants to `ROLE_ID_CANONICALIZATION` in `audit-rules.ts`.
3. Update this table.
4. The JSON schema enum updates automatically.

---

## 6. Metric Keys

`MetricKey` (used in `MetricGate.metric`) is the full set of gateable country metrics:

| Key | Range | Description |
|---|---|---|
| `approval` | 0–100 | Public approval rating |
| `economy` | 0–100 | Economic health composite |
| `democracy` | 0–100 | Democratic institution strength |
| `military_readiness` | 0–100 | Military readiness |
| `diplomatic_standing` | 0–100 | International standing |
| `treasury` | 0–100 | Fiscal headroom |
| `stability` | 0–100 | Internal stability |
| `legitimacy` | 0–100 | Regime legitimacy |
| `corruption` | 0–100 | Perceived corruption (higher = more corrupt) |

Full definitions live in `functions/src/types.ts`.

---

## 7. Firestore Collections

See `ARCHITECTURE.md` §9 for the full inventory. Key scenario-related collections:

- `scenarios/{id}` — scenario definitions, new schema only.
- `scenario_embeddings/{id}` — embedding sidecar for semantic dedup.
- `generation_jobs/{id}` — job queue.
- `countries/{id}` — country facts, `archetypes`, `flags`, `tokens`, `geopoliticalProfile`.
- `countries/{id}/parties/{partyId}` — party subcollection.
- `world_state/token_registry` — read-only mirror of Layer 1.
- `world_state/zombie_sweeper_health` — sweeper heartbeat.
- `world_state/scenario_manifest` — versioned bundle manifest with chunk metadata and per-scenario content hashes (see §7a).
- `world_events/{id}` — inter-country actions from `worldSimulationTick`; surfaced in iOS news feed.
- `country_world_state/{countryId}` — per-country dynamic metric state. Schema:

```ts
interface CountryWorldState {
  countryId: string;
  currentMetrics: Partial<Record<MetricId, number>>;  // evolves each tick via §7 drift rules
  relationships: CountryRelationship[];               // strength drifts from world events
  lastTickAt: string;                                 // ISO timestamp
  generation: number;                                 // increments each tick
  recentScenarioIds: string[];                        // cooldown tracking
}
```

---

## 7a. Bundle Manifest Schema

`world_state/scenario_manifest` — written by `functions/src/bundle-exporter.ts` on every export.

```ts
interface BundleManifest {
  manifestVersion: number;
  lastUpdated: Timestamp;
  bundles: Record<BundleId, BundleManifestEntry>;
}

interface BundleManifestEntry {
  version: number;             // bumps on every export of this bundle
  totalCount: number;
  chunkSize: number;           // 250
  chunks: Array<{
    idx: number;
    version: number;
    count: number;
    sizeBytes: number;
  }>;
  scenarioHashes: Record<string, string>; // scenarioId → SHA-256 of stable content fields
}
```

`scenarioHashes` covers stable narrative + structural fields only. Excluded: `createdAt`, `updatedAt`, `metadata.generationProvenance.generatedAt`, `metadata.auditMetadata.lastAudited`, `metadata.acceptanceMetadata.acceptedAt`.

iOS uses `scenarioHashes` to determine which chunks to re-download at scenario granularity. See `ScenarioBundleManager.swift` and the contract comment at the top of `bundle-exporter.ts` for the full delta algorithm.

Hash function: `computeScenarioContentHash()` in `functions/src/bundle-exporter.ts` — SHA-256 over canonical sorted JSON of stable fields.

---

## 8. Firestore Sync Commands

```bash
# Sync Layer 2 from Layer 1 (tokens, aliases, concepts)
cd scripts && pnpm -s tsx seed-token-registry.ts --force

# Compute and write archetypes on every country
cd scripts && pnpm -s tsx seed-country-archetypes.ts --force

# Recompute tokens on every country (party + fact derivation)
cd scripts && pnpm -s tsx populate-country-tokens.ts --force

# Nuke all scenarios + embeddings + jobs + storage (irreversible)
cd functions && pnpm -s tsx src/tools/nuke-scenarios.ts
```

---

## 9. Doc Sync Contract

When you change any of the following, you **MUST** update this file (`SCHEMA.md`) and `docs/ARCHITECTURE.md` in the same change:

- The `Scenario` shape or any nested type (`ScenarioApplicability`, `MetricGate`, `RelationshipGate`, `ScenarioOption`, etc.)
- `TOKEN_CATEGORIES`, `TOKEN_ALIAS_MAP`, `CONCEPT_TO_TOKEN_MAP`, `CANONICAL_ROLE_IDS`
- `REQUIRES_FLAG_REGISTRY`
- `ROLE_ID_CANONICALIZATION`
- `CountryArchetype` enum or its derivation rules
- `MetricKey`
- Any Firestore collection schema

Doc drift is treated as a **blocking review finding**. See `CLAUDE.md` for the enforcement rule.

---

## 10. Zombie Sweeper Health

The generation job zombie sweeper (`recoverZombieJobs`) runs every 5 minutes and writes a health heartbeat to `world_state/zombie_sweeper_health`:

```ts
{
  lastRunStarted: Timestamp,
  lastRunCompleted: Timestamp,
  status: 'ok' | 'running' | 'error',
  jobsRecovered: number,
  jobsFailed: number,
}
```

If this document is absent or `lastRunCompleted` is more than 10 minutes old, the sweeper is not functioning. Check Cloud Scheduler and Cloud Function logs for `recoverZombieJobs`.
