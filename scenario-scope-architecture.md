# Scenario Scope Architecture

Status: approved architecture and schema verdict as of 2026-03-17.

This document defines how the scenario library should scale to 50 playable countries and 10,000+ scenarios without losing country-specific realism.

## Engineering Verdict

The existing Firebase model is sufficient as a base.

Keep:

1. The flat `scenarios` collection.
2. The existing bundle taxonomy.
3. `generation_jobs`, `prompt_templates`, `training_scenarios`, and `scenario_embeddings`.
4. Tokenization as the rendering layer.

Do not keep the current bundle-only operating model.

Required schema evolution:

1. Add scope-tier metadata to scenario documents and shared types.
2. Add scope-targeting fields to generation jobs.
3. Expand golden-example metadata beyond bundle plus score.
4. Add indexes for scope-aware inventory planning.
5. Make dedup aware of scope slices rather than bundle only.

## Core Decision

The project remains token-first.

Tokenization is the rendering layer, not the whole content strategy. The content strategy is a scope-tiered library built from four scenario tiers:

1. Universal
2. Regional
3. Cluster
4. Exclusive

All stored scenario text remains tokenized. Country names, ministries, parties, titles, and institutional labels continue to resolve at runtime through the existing token system.

## Goals

1. Preserve institutional realism per country.
2. Avoid building 50 separate content libraries.
3. Keep generation cost and QA cost bounded.
4. Improve perceived variety across repeated play.
5. Use explicit metadata to drive selection, quotas, and generation.

## Library Mix

Target steady-state inventory mix:

| Scope Tier | Target Share | Purpose |
|------------|--------------|---------|
| `universal` | 40% | Reusable evergreen governance scenarios |
| `regional` | 25% | Region-specific pressures and cross-border context |
| `cluster` | 25% | Shared-structure realism across similar countries |
| `exclusive` | 10% | Country-unique or tightly bounded constitutional/historical content |

If `exclusive` grows above 10-15%, maintenance cost and library imbalance increase sharply.

## Scope Tiers

### 1. Universal

Use for crises or policy dilemmas that can occur in nearly any state.

Examples:

1. Procurement scandal in a public ministry.
2. Port strike threatening supply chains.
3. Hospital staffing shortage.
4. Drought response and water rationing.
5. Currency instability and emergency subsidy debate.

Rules:

1. No `applicable_countries`.
2. No country-unique institutional assumptions.
3. Safe institutional tokens only.
4. Strictest dedup and blandness checks.

### 2. Regional

Use when the pressure is tied to geography, regional blocs, migration routes, weather systems, or neighboring conflict spillover.

Examples:

1. Caribbean hurricane logistics.
2. Sahel insurgent spillover.
3. Baltic energy security shock.
4. South China Sea shipping disruption.
5. Andean water rights conflict.

Rules:

1. Prefer `region_tags` and `regionalBoost`.
2. Avoid country lists unless the scenario is actually narrow.
3. Still tokenized and transferable within the region.

### 3. Cluster

Use for shared structural realities that are not universal and not country-unique.

This is the main realism tier.

Examples:

1. Tourism-dependent island state debt pressure.
2. Export manufacturing state facing semiconductor sanctions.
3. Resource-rich authoritarian petrostate subsidy unrest.
4. Democracy with coalition gridlock and fiscal reform pressure.

Rules:

1. Prefer `clusterId` plus eligibility metadata over `applicable_countries`.
2. Each cluster must map to multiple countries.
3. Cluster scenarios may be region-agnostic or region-biased.
4. Cluster scenarios are allowed deeper institutional framing than universal scenarios, but still remain tokenized.

### 4. Exclusive

Use only when the scenario cannot be truthfully generalized.

Examples:

1. Unique constitutional succession rules.
2. Country-specific bilateral sovereignty dispute.
3. Single-country historical doctrine or military chain-of-command issue.
4. Legislature design that is unique enough to break generalization.

Rules:

1. Must provide `applicable_countries`.
2. Must provide `exclusivityReason`.
3. Must fail generation review if it could be expressed as a cluster scenario.
4. Still uses tokens for institutions and names.

## Metadata Contract

These fields are additive. Existing selection logic can continue to use existing metadata while the new fields are phased in.

### Required Metadata Fields

```json
{
  "metadata": {
    "bundle": "economy",
    "severity": "medium",
    "scopeTier": "cluster",
    "scopeKey": "cluster:small_island_tourism_state",
    "sourceKind": "evergreen"
  }
}
```

### New Fields

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `scopeTier` | `universal` \| `regional` \| `cluster` \| `exclusive` | Yes | Primary scenario scope bucket |
| `scopeKey` | `string` | Yes | Stable identifier such as `universal`, `region:caribbean`, `cluster:petrostate_authoritarian`, `country:jp` |
| `clusterId` | `string` | Cluster only | Canonical cluster identifier |
| `exclusivityReason` | `constitution` \| `historical` \| `bilateral_dispute` \| `unique_institution` \| `unique_military_doctrine` | Exclusive only | Why this cannot be generalized |
| `sourceKind` | `evergreen` \| `news` \| `neighbor` \| `consequence` | Yes | Content lane used for acceptance and weighting |
| `region_tags` | `string[]` | Regional optional, cluster optional | Regions where the scenario is most relevant |

### Existing Fields That Remain Canonical

| Field | Role |
|-------|------|
| `applicable_countries` | Hard country restriction for exclusive and narrow country-scope content |
| `requiredGovernmentCategories` | Hard gate for government form |
| `excludedGovernmentCategories` | Hard exclusion gate |
| `requiredGeopoliticalTags` | Hard or soft gate for geopolitical reality |
| `excludedGeopoliticalTags` | Hard exclusion gate |
| `regionalBoost` | Scoring boost by region |
| `isNeighborEvent` | Overlay flag for neighbor-event lane |

## Live Schema Verdict

Current live support is partial.

Already supported in code and data model:

1. `bundle`
2. `applicable_countries`
3. government-category gates
4. geopolitical-tag gates
5. `regionalBoost`
6. `isNeighborEvent`
7. `involvedCountries`

Not yet canonical in shared code contracts:

1. `scopeTier`
2. `scopeKey`
3. `clusterId`
4. `exclusivityReason`
5. `sourceKind`
6. `region_tags`

Implication:

The architecture is approved, but current Firestore documents and TypeScript interfaces still need a formal migration before deficit-driven planning and scope-aware selection can be authoritative.

## Cluster Taxonomy

These are the initial canonical clusters. Keep the list intentionally small. The goal is a stable gameplay taxonomy, not a one-off label for every country.

### Governance and Institutional Clusters

| Cluster ID | Description | Typical Signals |
|------------|-------------|-----------------|
| `alliance_anchor_democracy` | Mature democracy with major alliance obligations | democratic government, strong alliances, high diplomacy pressure |
| `aging_industrial_democracy` | Advanced economy with aging population and welfare strain | high GDP, advanced infrastructure, aging demographics |
| `fragile_multifaction_democracy` | Democracy facing weak coalitions, party fragmentation, protest volatility | democratic or hybrid, high legislature friction, contested legitimacy |
| `resource_nationalist_state` | Government that uses control of strategic resources for domestic legitimacy | strong sovereignty emphasis, major export sector, state intervention |

### Economic Clusters

| Cluster ID | Description | Typical Signals |
|------------|-------------|-----------------|
| `export_manufacturing_power` | Export-heavy industrial or technology producer | large trade share, manufacturing dependence, sanctions/trade-war sensitivity |
| `commodity_exporter_democracy` | Democratic resource exporter vulnerable to price shocks | democratic government, commodity dependence, budget volatility |
| `petrostate_authoritarian` | Hydrocarbon-dependent authoritarian system | authoritarian government, energy export dependence, subsidy politics |
| `food_import_dependent_state` | Country exposed to food price and import-chain disruption | import dependence, inflation sensitivity, low domestic food resilience |
| `migrant_destination_service_economy` | High urban/service economy with migration and housing pressure | high urbanization, service-sector dominance, immigration sensitivity |

### Geography and Climate Clusters

| Cluster ID | Description | Typical Signals |
|------------|-------------|-----------------|
| `small_island_tourism_state` | Island economy with tourism, logistics, and disaster fragility | island geography, tourism dependence, storm exposure |
| `climate_exposed_coastal_state` | Coastal state threatened by flooding, storm surge, or sea-level pressure | coastal geography, climate risk, dense cities or ports |
| `water_stressed_agro_state` | State with water scarcity and agricultural fragility | drought risk, agriculture dependence, weak irrigation resilience |
| `landlocked_trade_corridor_state` | Landlocked country dependent on corridors, customs, and neighbors | landlocked geography, transit dependence, border friction |

### Security and Geopolitical Clusters

| Cluster ID | Description | Typical Signals |
|------------|-------------|-----------------|
| `frontier_security_state` | State under constant border, insurgency, or cross-border militia pressure | hostile neighbors, internal security pressure, military salience |
| `sanctions_exposed_authoritarian` | Isolated or partially isolated regime facing sanctions and smuggling dynamics | authoritarian government, adversarial foreign posture, sanctions exposure |
| `nuclear_deterrent_rivalry_state` | State whose security logic is shaped by nuclear deterrence or major-power brinkmanship | nuclear capability or direct rival exposure, military doctrine salience |
| `post_conflict_reconstruction_state` | State rebuilding institutions and infrastructure after major conflict | weak public order, reconstruction pressure, legitimacy recovery |

## Cluster Assignment Rules

1. A country may belong to multiple clusters.
2. A cluster scenario should normally target one primary cluster and optionally one secondary region.
3. Clusters should be assigned by derived country data, not manually embedded into scenario prose.
4. If a cluster only maps to one country after review, it should be demoted to `exclusive` or merged into a broader cluster.

## Content Design Rules By Scope Tier

| Rule | Universal | Regional | Cluster | Exclusive |
|------|-----------|----------|---------|-----------|
| Fully tokenized text | Yes | Yes | Yes | Yes |
| Country list allowed | No | Rare | Rare | Yes |
| Unique constitutional framing | No | No | Limited | Yes |
| Strong regional bloc framing | No | Yes | Optional | Optional |
| Strong institutional specificity | Low | Medium | High | Highest |
| Strict semantic dedup | Highest | High | Medium | Medium |

## Operational Rules

1. Generate deficits by `bundle x scopeTier x region-or-cluster`, not only by bundle.
2. Favor cluster generation over exclusive generation when realism can be preserved.
3. Keep universal content broad but not bland; it must still name mechanisms and stakeholders.
4. Treat exclusive content as premium inventory with higher review cost.

## Execution Priorities

1. Extend `ScenarioMetadata` and `GenerationJobData` first.
2. Backfill existing scenarios before changing selector quotas aggressively.
3. Expand `training_scenarios` metadata before relying on cluster-aware few-shot prompting.
4. Add indexes before large inventory planning queries are introduced.
5. Keep bundle-level reporting during migration, but make scope-tier reporting the new planning source of truth.

## Non-Goals

1. No separate scenario collection per country.
2. No direct prose hardcoding of country names in stored scenario documents.
3. No uncontrolled explosion of clusters.
4. No LM Studio-only production library path.