# Scenario Selection Specification

Status: approved selection design and implementation path as of 2026-03-17.

This document defines the target algorithm for scenario selection in the turn loop. It builds on the current iOS selector and formalizes how scope tiers, country fit, and variety should interact.

## Current Implementation Baseline

The current selector already does useful work and should be evolved rather than replaced.

Already live:

1. hard country gates
2. legislature gates
3. government-category gates
4. geopolitical-tag gates
5. regional boosts
6. cooldown and recency behavior
7. consequence and neighbor-event overlays

Not yet live as first-class runtime inputs:

1. `scopeTier`
2. `scopeKey`
3. recent scope-mix tracking
4. selector observability by scope weighting

This means the weighting model below is an additive runtime upgrade, not a rewrite.

## Selection Priorities

Scenario selection should optimize for four outcomes at the same time:

1. Eligibility correctness.
2. Country-specific realism.
3. Variety over time.
4. Predictable content mix across a full run.

## Selection Lanes

Selection happens in priority order:

1. Consequence lane.
2. Neighbor-event lane.
3. General library lane.
4. AI queue lane.
5. Real-time AI fallback lane.

Only the general library lane participates in the full weighted scope-mix system.

## Hard Eligibility Gates

These gates are binary. A scenario that fails any gate has weight `0`.

1. `options.count >= 3`.
2. Dick Mode gate.
3. Cooldown gate.
4. `oncePerGame` gate.
5. Metric condition gate.
6. Legislature gate.
7. `applicable_countries` gate.
8. Required government category gate.
9. Excluded government category gate.
10. Required geopolitical tag gate.
11. Excluded geopolitical tag gate.

## Data Prerequisites

Selection should not start enforcing scope-mix quotas until the library has been backfilled with scope metadata.

Minimum prerequisites:

1. new scenarios save `scopeTier` and `scopeKey`
2. enough existing scenarios are backfilled to avoid artificial shortages
3. runtime history stores recent scope tiers
4. selector logging records scope decisions for tuning

## Target Scope Mix By Phase

The selector should not present the same scope mix throughout a run.

| Phase | Universal | Regional | Cluster | Exclusive |
|-------|-----------|----------|---------|-----------|
| Early | 50% | 20% | 20% | 10% |
| Mid | 35% | 25% | 30% | 10% |
| Late | 25% | 25% | 35% | 15% |
| Endgame | 20% | 20% | 40% | 20% |

Rationale:

1. Early game needs transferability and onboarding clarity.
2. Mid game should increase regional and cluster identity.
3. Late game should feel more country-shaped and institution-specific.
4. Endgame can surface more exclusive and consequence-heavy content.

## Weighting Model

For every eligible general-pool scenario, compute:

```text
finalWeight =
  baseWeight
  * bundleFit
  * geopoliticalFit
  * regionalFit
  * scopeNeed
  * novelty
  * tagDiversity
  * chainContext
```

### Terms

#### `baseWeight`

```text
baseWeight = max(1.0, scenario.weight)
```

#### `bundleFit`

Derived from country gameplay profile bundle overrides.

```text
bundleFit = clamp(country.bundleWeightOverrides[bundle], 0.1, 3.0)
```

Default is `1.0`.

#### `geopoliticalFit`

1. If required geopolitical tags do not overlap the country, reject.
2. If excluded geopolitical tags overlap the country, reject.
3. Otherwise:

```text
geopoliticalFit = 1.0 + min(requiredOverlapCount * 0.5, 2.0)
```

If no required tags exist, use `1.0`.

#### `regionalFit`

```text
regionalFit = clamp(metadata.regionalBoost[country.region], 0.1, 3.0)
```

Default is `1.0`.

#### `scopeNeed`

This is the mechanism that enforces run-level variety.

1. Look at the last 12 selected scenarios in the run.
2. Calculate recent scope mix.
3. Compare to the target mix for the current phase.

```text
scopeNeed = clamp(1.0 + ((targetShare - recentShare) * 2.0), 0.65, 1.5)
```

Interpretation:

1. Underrepresented scope tiers get a bonus.
2. Overrepresented scope tiers get a penalty.
3. The clamp prevents the selector from becoming unstable.

#### `novelty`

Based on recency and similarity.

```text
novelty = recencyPenalty * similarityPenalty
```

Suggested values:

| Condition | Multiplier |
|-----------|------------|
| Seen in last 5 turns | `0.15` |
| Seen in last 6-12 turns | `0.45` |
| Same `scopeKey` in last 4 turns | `0.70` |
| High text similarity to current scenario | `0.35` |
| None of the above | `1.0` |

#### `tagDiversity`

Discourage repeated thematic texture.

```text
tagDiversity = 0.75 if scenario shares 2+ high-salience tags with recent queue else 1.0
```

#### `chainContext`

Slightly prefer follow-on consequences, pending arcs, or state-relevant continuity without overwhelming variety.

```text
chainContext = 1.20 if scenario closes or continues an active arc else 1.0
```

## Recommended Pool Strategy

Use one weighted pool. Do not split the general lane into four separate random draws.

Reason:

1. The hard gates already narrow the pool.
2. A single weighted pool avoids dead buckets.
3. Scope diversity can be enforced through `scopeNeed` without introducing brittle control flow.

## Consequence Lane

Consequences should remain a pre-general-lane overlay.

Rules:

1. Pending consequence beats general pool.
2. Consequence scenarios still honor hard country and legislature gates.
3. Consequence scenarios do not consume scope diversity penalties.

## Neighbor-Event Lane

Neighbor events remain a separate overlay because they are stateful and relationship-driven.

Recommended weighting:

```text
neighborWeight = max(abs(relationship.strength), 30)
```

Enhancements:

1. Prefer scenarios whose `requiredGeopoliticalTags` fit the player's border reality.
2. Prefer unresolved rivalries over neutral relationships.

## Fallback Rules

If the eligible general pool becomes too small:

1. Relax recency penalties before relaxing eligibility gates.
2. Relax tag diversity before relaxing scope mix.
3. Never relax hard country, government, or geopolitical exclusions.
4. Only use real-time AI fallback when no acceptable authored/generated scenario remains.

## Observability

Every selected scenario should log:

1. Scenario ID.
2. Scope tier.
3. Scope key.
4. Final weight.
5. Top 3 contributing multipliers.
6. Which gate removed the largest number of candidates.

This makes tuning possible without guessing.

## Tunables Summary

| Setting | Initial Value |
|---------|---------------|
| Recent mix window | 12 turns |
| Recent hard recency window | 5 turns |
| Scope need clamp | `0.65 - 1.5` |
| Similarity penalty floor | `0.35` |
| Chain context bonus | `1.20` |
| Tag overlap penalty | `0.75` |

## Implementation Notes

1. The current iOS selector already supports most hard gates and the base geopolitical scoring model.
2. The first implementation step is adding `scopeTier` and `scopeKey` to candidate scoring inputs.
3. The second step is storing recent scope history in the same way recent tags are tracked now.
4. The third step is adding selector logs for final weight and top contributing multipliers.
5. This design is additive. It does not require moving selection server-side.