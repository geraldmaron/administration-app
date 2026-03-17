# Game Logic: The Administration

> Canonical reference for all game mechanics, systems, and data structures.
> Source of truth: iOS Swift codebase (`Scoring.swift`, `GameStore.swift`, `Models.swift`, `ScenarioNavigator.swift`, `CrisisEngine.swift`) and Firebase Functions (`scenario-engine.ts`, `audit-rules.ts`).

---

## Table of Contents

1. Game Overview
2. Metric System
3. Effect Pipeline
4. Turn Processing Pipeline
5. Approval Calculation
6. Secondary Impact Propagation
7. Hidden Metrics & Feedback
8. Crisis System
9. Scenario System
10. Scenario Selection Pipeline
11. Cabinet System
12. Country System
13. Token & Template System
14. Military System
15. Legislature System
16. Diplomatic System
17. Fiscal & Policy Systems
18. Trust Your Gut
19. Dick Mode
20. Game Setup Flow
21. Game State Schema
22. End-Game & Scoring
23. Generation Pipeline
24. Audit System
25. Firebase Data Architecture

---

---

## 1. Game Overview

**The Administration** is a strategic governance simulation for iOS. Players assume the role of a nation's head of government for 30–120 turns, making scenario-based policy decisions that ripple through 27 interdependent metrics.

### Core Loop

Read Scenario → Choose from 3 Options → Effects Applied → Turn Advances → Next Scenario

### Game Length

`maxTurns = calculateMaxTurns()` applies ±10% variance around the base value.

| Mode | Base Turns | Approx Range |
|------|-----------|--------------|
| short | 30 | 27–33 |
| medium | 60 | 54–66 |
| long | 120 | 108–132 |

### Game Phases

`updateGamePhase()` runs after every decision. `progress = state.turn / state.maxTurns`.

| Phase | Condition | Scenario Phase Tags |
|-------|-----------|---------------------|
| `.early` | `progress < 0.25` | `"early"`, `"root"` |
| `.mid` | `0.25 ≤ progress < 0.60` | `"mid"` |
| `.late` | `0.60 ≤ progress < 0.90` | `"late"` |
| `.endgame` | `progress ≥ 0.90` | `"endgame"`, `"final"` |

### Ending Conditions

- **Natural end**: `state.turn >= state.maxTurns`
- **Collapse**: `approvalVal < 15 || collapsedCount >= 3`
  - `coreMetrics = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order"]`
  - `collapsedCount` = number of those metrics below 20.0
- Both routes trigger `EndGameReviewView`.

---

## 2. Metric System

### 2.1 Core Metrics (18) — range 0–100, baseline ~62, higher is better

| ID | Display Name |
|----|-------------|
| `metric_economy` | Economy |
| `metric_public_order` | Public Order |
| `metric_health` | Healthcare |
| `metric_education` | Education |
| `metric_infrastructure` | Infrastructure |
| `metric_environment` | Environment |
| `metric_foreign_relations` | Foreign Relations |
| `metric_military` | Military |
| `metric_liberty` | Liberty |
| `metric_equality` | Equality |
| `metric_employment` | Employment |
| `metric_innovation` | Innovation |
| `metric_trade` | Trade |
| `metric_energy` | Energy |
| `metric_housing` | Housing |
| `metric_democracy` | Democracy |
| `metric_sovereignty` | Sovereignty |
| `metric_immigration` | Immigration |

### 2.2 Inverse Metrics — lower is better

| ID | Baseline |
|----|---------|
| `metric_corruption` | 25 ± 8 (min 20) — set in `finalizeSetup()` |
| `metric_inflation` | ~30 |
| `metric_pollution` | varies |
| `metric_inequality` | varies |
| `metric_crime` | ~40 |

`isInverseMetric()` in `Scoring.swift` matches: `["metric_corruption", "metric_inflation", "metric_pollution", "metric_inequality", "metric_crime"]`.

### 2.3 Derived Metric — approval

| ID | Calculation |
|----|------------|
| `metric_approval` | `calculateApproval()` — see §5. Recalculated each turn unless a direct approval effect exists. |

### 2.4 Fiscal Metric

| ID | Range | Notes |
|----|-------|-------|
| `metric_budget` | −100 to +100 | Not included in approval calculation average |

### 2.5 Hidden Metrics (3) — revealed at threshold

| ID | Reveal Threshold | Accumulation |
|----|-----------------|-------------|
| `metric_unrest` | ≥ 70 | +2/turn if employment < 40; +1/turn if inflation > 70 |
| `metric_economic_bubble` | ≥ 80 | Set via effects |
| `metric_foreign_influence` | ≥ 75 | Set via effects |

### 2.6 Metric Value Representation

All metrics stored as `Double` (0.0–100.0). `clampMetricInt()` rounds to `Int` and clamps `[0, 100]` for display. `metric_budget` stored separately from the 0–100 range.

---

## 3. Effect Pipeline (`applyDecision`)

`ScoringEngine.applyDecision(state:option:)` runs when the player selects an option.

### Branch A — Structured Effects (`option.effects` non-empty)

For each effect in `option.effects`:
1. **Normalize**: `normalizeEffectValue(effect)` — clamps magnitude to sane range.
2. **Probability check**: `Double.random(in: 0...1) < effect.probability` (default 1.0 if nil). If false, skip.
3. **Delay check**: if `effect.delay > 0`, schedule for a future turn (not active yet).
4. **Jitter**: `applyJitter(value, isProcessing: false)` applied at creation time.
5. **Create `ActiveEffect`**: `remainingDuration = effect.duration` (default 1).
6. Add to `state.activeEffects`.

### Branch B — Effects Map (`option.effectsMap`)

Used in legacy/AI-generated scenarios:
1. For each entry: normalize → create a 1-turn `ActiveEffect`.
2. After all entries: call `deriveSecondaryImpacts(effectsMap:state:)` → append secondary effects (also 1-turn).

### Branch C — Branch Readiness (`targetBranchId` / `targetBranchType`)

- `targetBranchId`: `delta = max(-50, min(50, Int(value.rounded())))`. Clamped `[0, 100]`.
- `targetBranchType`: `delta = Int((value * 10).rounded())`. Clamped `[0, 100]`.

### Relationship Impacts

Merges `option.relationshipImpact` + `option.relationshipEffects`, clamps each value `[-100, 100]`, updates `state.countries[].relationship`.

### Population Impacts

1. `clampHumanImpact()` applied.
2. Casualties → `state.countryPopulationState.cumulativeCasualties += casualties`.
3. `casualtyPenalty = -20.0 - (casualtyRate * 200.0)`.
4. `displacementPenalty = -5.0 - (displacementRate * 50.0)`.
5. Ally relationship propagation: `alliedRelationDelta = totalRelationshipDelta * 0.4`.
6. Adds `metric_public_order` and `metric_approval` effects from combined penalties.

### Economic Impacts

`option.economicImpact` → `gdpDelta` → `metric_economy`, `tradeDelta` → `metric_trade`, `energyDelta` → `metric_energy`.

### Consequences

Records pending consequence: `triggerTurn = state.turn + (option.consequenceDelay ?? 2)`, `probability = 0.7`.

### Post-Decision

Calls `advanceTurn(state:)` at the end.

---

## 4. Turn Processing Pipeline (`advanceTurn`)

`ScoringEngine.advanceTurn(state:)` — runs once per player decision.

### Step 1 — Increment Turn

```
newState.turn += 1
```

### Step 2 — Metric Offset Decay

Baseline offsets applied during setup decay toward zero:
```
normalizationWindow = max(5, maxTurns * 0.25)
decay = offset / normalizationWindow
```
Only runs during the first 25% of the game.

### Step 3 — Active Effects Loop

For each `ActiveEffect` in `state.activeEffects`:
1. **Delay check**: skip if `effect.startTurn > state.turn`.
2. **Variance**:
   - `variance = (Double.random(in: 0...1) * 0.32) + 0.84`  → range `[0.84, 1.16]`
   - `microVariance = (Double.random(in: 0...1) * 0.12) - 0.06` → range `[-0.06, +0.06]`
3. **Base value**: `effectValue = effect.value * variance + microVariance`
4. **Cabinet boost**: applied for 4 role/metric pairs (see §11).
5. **Final jitter**: `applyJitter(effectValue, isProcessing: true)`.
6. Accumulate into `metricDeltas[metricId]`.
7. Decrement `remainingDuration`; remove if reaches 0.

### Step 4 — Strategic Plan Drift (pre-loop, age < 10 turns)

If a strategic plan is active AND age < 10 turns:
```
driftVelocity = (target - current) / 50.0
driftDelta = velocity * (1 + Double.random(-0.075, +0.075))
```
Applied only if `abs(driftVelocity) > 0.1`.

### Step 5 — Per-Metric Application Loop

Skips `metric_approval` (handled in §5) and locked metrics (`state.lockedMetricIds`).

For each metric delta:
1. **Strategic plan drift (age ≥ 10 turns)**:
   ```
   delta += (target - current) * 0.05
   ```
2. **Player management mitigation** (only when delta < 0):
   ```
   mitigation = (state.management - 30.0) / 300.0
   mitigationFactor = (1 - max(0, mitigation)) + jitter[-0.02, +0.02]
   delta *= mitigationFactor
   ```
3. **Max change cap**:
   ```
   effectiveMaxChange = 4.5
     + jitter[-0.09, +0.09]
     + variance[-0.2, +0.2]
   ```
4. Clamp delta to `[-effectiveMaxChange, +effectiveMaxChange]`.
5. Apply delta; clamp result to `[0.0, 100.0]`.

### Step 6 — Approval Update

- If a direct `metric_approval` effect existed this turn → apply it directly.
- Otherwise → call `calculateApproval(state:)` (see §5).

### Step 7 — Hidden Metric Accumulation

```swift
if employment < 40 { unrest = min(100, unrest + 2) }
if inflation > 70  { unrest = min(100, unrest + 1) }
if corruption > 60 { liberty -= 1 }
```

### Step 8 — Bootstrap maxTurns

If `state.maxTurns == 0`, sets it via `calculateMaxTurns()`.

---

## 5. Approval Calculation (`calculateApproval`)

Called when no direct `metric_approval` effect was applied this turn.

```
avg = mean(all metrics EXCEPT metric_approval AND metric_corruption)

avg += (compassion - 50) * 0.15 + random[-0.03, +0.03]
avg += (integrity  - 50) * 0.10 + random[-0.02, +0.02]

if corruption > 40:
    avg -= (corruption - 40) * 0.5 + random[-0.025, +0.025]

metric_approval = clampMetricInt(avg)   // rounded Int, clamped [0, 100]
```

`compassion` and `integrity` are player character stats (set during game setup).

---

## 6. Secondary Impact Propagation (`deriveSecondaryImpacts`)

**Only called when using `effectsMap` branch (Branch B).** Not called for structured `effects`.

Each rule fires when the primary metric change magnitude exceeds ~2.0 (threshold varies slightly with jitter ≈ 0.27–0.35):

| Trigger | Secondary Effects |
|---------|-----------------|
| `military` change > 2 | `economy -= abs(mil) * 0.25±jitter` ; `foreign_relations -= abs(mil) * 0.30±jitter` |
| `foreign_relations` change > 2 (negative) | `economy += rel * 0.20±jitter` ; `approval += rel * 0.12±jitter` |
| `foreign_relations` change > 2 (positive) | `economy += rel * 0.15±jitter` ; `approval += rel * 0.08±jitter` |
| `economy` change > 2 | `approval += econ * 0.15±jitter` ; `public_order += econ * (0.08 positive / 0.12 negative)` |
| `public_order` change > 2 | `approval += control * (0.12 positive / 0.20 negative)` |
| `health` change > 2 | `approval += health * 0.10±jitter` ; if negative: `economy += health * 0.15±jitter` |

All secondary effects are 1-turn `ActiveEffect`s appended to the pipeline.

---

## 7. Hidden Metrics & Feedback

The three hidden metrics accumulate via inline statements in `advanceTurn` (Step 7 above). **No other feedback loops execute in the iOS engine.**

| Condition | Effect |
|-----------|--------|
| `employment < 40` | `unrest += 2` (capped at 100) |
| `inflation > 70` | `unrest += 1` (capped at 100) |
| `corruption > 60` | `liberty -= 1` |

Hidden metrics are revealed to the player when their threshold is crossed (via `CrisisEngine`).

---

## 8. Crisis System (`CrisisEngine.swift`)

`CrisisEngine.evaluateCrises(state:)` is called in `GameStore.makeDecision()` after `ScoringEngine.applyDecision()`.

### Thresholds & Triggers

| Crisis ID | Condition | Severity |
|-----------|-----------|---------|
| `crisis_civil_unrest` | `unrest >= 70` | `.high` (`.critical` if `unrest >= 90`) |
| `crisis_market_crash` | `economic_bubble >= 80` | `.high` (`.critical` if `bubble >= 95`) |
| `crisis_sovereignty` | `foreign_influence >= 75` | `.high` |
| `crisis_approval_collapse` | `approval < 20` | `.critical` |

Deduplication: before appending, existing crises with the same ID prefix are removed.

### Resolution Conditions

| Crisis ID | Resolves When |
|-----------|--------------|
| `crisis_civil_unrest` | `unrest < 50` |
| `crisis_market_crash` | `economic_bubble < 40` |
| `crisis_sovereignty` | `foreign_influence < 40` |
| `crisis_approval_collapse` | `approval >= 30` |

---

## 9. Scenario System

### 9.1 Scenario Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Unique identifier |
| `title` | String | Token-resolved display title |
| `description` | String | Token-resolved body text |
| `options` | [Option] | Exactly 3 |
| `phase` | String | `"early"`, `"mid"`, `"late"`, `"endgame"`, `"root"`, `"final"` |
| `conditions` | [Condition] | Metric/flag gates for eligibility |
| `cooldown` | Int? | Min turns between reuses |
| `oncePerGame` | Bool? | If true, never replays |
| `weight` | Double? | Selection weight (default 1.0) |
| `category` | String | Bundle ID (e.g., `"economy"`) |
| `severity` | String | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `chainId` | String? | Consequence chain membership |
| `chainsTo` | [String]? | IDs of follow-up scenarios |
| `tags` | [String] | Geopolitical/thematic tags |
| `legislatureRequirement` | LegislatureReq? | Min legislature approval to appear |
| `metadata` | Metadata | Bundle, severity, applicableCountries, isNeighborEvent, etc. |

### 9.2 Option Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Unique |
| `text` | String | Display text |
| `effects` | [Effect] | Structured metric effects |
| `effectsMap` | [String: Double]? | Legacy map format |
| `advisorFeedback` | [AdvisorFeedback] | Per-cabinet-role stances |
| `outcomeHeadline` | String | News-style result headline |
| `outcomeSummary` | String | 1–2 sentence outcome |
| `outcomeContext` | String? | Extended consequence context |
| `relationshipImpact` | [String: Double]? | Country-level diplomatic deltas |
| `relationshipEffects` | [RelationshipEffect]? | Structured diplomatic effects |
| `populationImpact` | PopulationImpact? | Casualties, displacement |
| `economicImpact` | EconomicImpact? | GDP, trade, energy deltas |
| `humanCost` | HumanCost? | Narrative human toll |
| `consequenceScenarioIds` | [String]? | Triggered follow-up scenario IDs |
| `consequenceDelay` | Int? | Turns until consequence triggers (default 2) |
| `severity` | String? | Option-level severity |
| `isAuthoritarian` | Bool? | Marks for Dick Mode pool |

### 9.3 Effect Fields

| Field | Type | Notes |
|-------|------|-------|
| `targetMetricId` | String | Canonical metric ID |
| `value` | Double | Delta magnitude (+ or −) |
| `duration` | Int | Turns the effect lasts (default 1) |
| `probability` | Double | Chance to fire (0.0–1.0, default 1.0) |
| `delay` | Int? | Turns before effect starts |
| `condition` | EffectCondition? | Gate on metric state |
| `scaling` | EffectScaling? | Scale value by a metric |

---

## 10. Scenario Selection Pipeline (`generateNextScenario`)

Runs in `GameStore.generateNextScenario()` after each decision.

### Tier 1 — Pending Consequence (60% chance)

`ScoringEngine.findApplicableConsequence(state:)`:
- Checks `state.pendingConsequences` for entries where `triggerTurn == state.turn`.
- Each has `probability = 0.7`; fires with `Double.random(in: 0...1) < 0.6`.

### Tier 2 — Neighbor Event

If `Double.random(in: 0...1) < gameplay.neighborEventChance`:
- Filter `metadata.isNeighborEvent == true`.
- `pickNeighborScenario()`: weighted by `max(abs(strength), 30.0)`.

### Tier 3 — General Pool

Full filter sequence applied to all loaded scenarios:
1. `options.count >= 3`
2. Dick Mode gate: scenarios tagged `dick` or `dic` excluded unless `dickMode.active`
3. Cooldown check against `state.playedScenarioIds`
4. `oncePerGame` check
5. Metric condition gates
6. `metadata.applicableCountries` match
7. Legislature gate: `legislature.approvalOfPlayer >= scenario.legislatureRequirement.minApproval`
8. After filtering:
   - If Dick Mode active: `Double.random < 0.7` AND scandalous pool non-empty → use scandalous pool only
   - Remove recently seen (last 20 played scenario IDs)
   - Remove too-similar: Jaccard similarity > 0.7 on description words OR title similarity > 0.6

**`weightedPick()`**:
```
baseScore = scoreScenario(scenario, state)
tagPenalty = recentTagQueue hit ? 0.4 : 1.0
bundleBoost = (lastAction.category == scenario.category) ? 2.0 : 1.0
finalWeight = baseScore * tagPenalty * bundleBoost
```

**`scoreScenario()`**:
1. Legislature gate: `approvalOfPlayer < req.minApproval → return 0`
2. `base = scenario.weight ?? 1.0` (if ≤ 0, use 1.0)
3. Government category gate: required → must match; excluded → `return 0`
4. Geopolitical tags: no overlap → 0; `boost = 1.0 + min(matchCount * 0.75, 3.0)`
5. Excluded geopolitical tags: any match → 0
6. Bundle multiplier: `max(0.1, min(rawMult, 3.0))`
7. Regional boost: `max(0.1, min(rawBoost, 3.0))`

### Tier 4 — AI Scenario Queue

`state.aiScenarioQueue.readyChains.first` (pre-generated AI queue).

### Tier 5 — AI Service

`aiService.generateScenario(context:)` — real-time generation via Moonshot API.

### Tier 6 — Hard Fallback

`createFallbackScenario()` — id `"scenario_fallback_{timestamp}"`.

### Token Resolution

`TemplateEngine.shared.resolveScenario(scenario:state:)` applied to the selected scenario before returning.

---

## 11. Cabinet System

### 11.1 Roles (13)

`role_executive`, `role_diplomacy`, `role_defense`, `role_economy`, `role_justice`, `role_health`, `role_commerce`, `role_labor`, `role_interior`, `role_energy`, `role_environment`, `role_transport`, `role_education`

### 11.2 Cabinet Boost on Active Effects

Cabinet members modify active effect magnitudes **during `advanceTurn` Step 3** for 4 specific role/metric pairs only:

| Role | Metric | Boost Formula |
|------|--------|--------------|
| `role_economy` | `metric_economy` | `(skill/100 - 0.5) / 2.5 ± 0.0035` |
| `role_defense` | `metric_military` | `(skill/100 - 0.5) / 2.0 ± 0.004` |
| `role_diplomacy` | `metric_foreign_relations` | `(skill/100 - 0.5) / 2.0 ± 0.004` |
| `role_executive` | any metric | `(skill/100 - 0.5) / 2.5 ± 0.0035` |

Application:
```swift
if effectValue > 0 { effectValue *= (1 + boost) }
if effectValue < 0 { effectValue *= (1 - boost) }
```

At `skill = 50`: boost = 0 (neutral). At `skill = 100`: boost ≈ +0.20 (economy/executive) or +0.25 (defense/diplomacy).

### 11.3 Quick Start Cabinet

4 members auto-created: `role_executive`, `role_diplomacy`, `role_defense`, `role_economy`.

### 11.4 Trust Your Gut Capacity

`trustYourGutCapacity = 3 + (filledCabinetSlots / 4)` → range 3–6 uses.

---

## 12. Country System

### 12.1 Overview

50 playable countries across 10 regions. Countries stored in `world_state/countries/{countryId}`.

### 12.2 Country IDs (50)

`usa, canada, mexico, uk, france, germany, italy, spain, netherlands, belgium, sweden, norway, switzerland, poland, russia, ukraine, saudi_arabia, iran, israel, turkey, egypt, uae, qatar, iraq, nigeria, south_africa, ethiopia, morocco, algeria, india, pakistan, bangladesh, china, japan, south_korea, north_korea, indonesia, vietnam, thailand, philippines, malaysia, singapore, brazil, argentina, colombia, chile, peru, venezuela, australia`

### 12.3 Government Categories

`liberal_democracy`, `illiberal_democracy`, `hybrid_regime`, `authoritarian`, `totalitarian`, `theocracy`, `constitutional_monarchy`, `absolute_monarchy`

### 12.4 Starting Metrics

`gameplayProfile.startingMetrics` used when available (preferred over generated baseline). If absent, `finalizeSetup()` generates baselines (see §20).

### 12.5 Sub-Locales

Each country has 6–8 sub-locales stored at `countries/{countryId}/locales/{localeId}`. Used for regional event flavor.

---

## 13. Token & Template System

### 13.1 Token Resolution

`TemplateEngine.shared.resolveScenario(scenario:state:)` replaces `{token}` placeholders at runtime. Never hardcode country-specific names in scenario text.

### 13.2 Structural Tokens (per country)

**Executive**: `{leader_title}`, `{vice_leader}`

**Legislative**: `{legislature}`, `{upper_house}`, `{lower_house}`, `{ruling_party}`

**Judicial**: `{judicial_role}`, `{chief_justice_role}`, `{prosecutor_role}`

**Cabinet Roles (13)**: `{finance_role}`, `{defense_role}`, `{foreign_affairs_role}`, `{justice_role}`, `{health_role}`, `{interior_role}`, `{commerce_role}`, `{labor_role}`, `{energy_role}`, `{environment_role}`, `{transport_role}`, `{education_role}`, `{executive_role}`

**Intelligence**: `{intelligence_agency}`, `{domestic_intelligence}`, `{security_council}`

**Military**: `{military_general}`, `{military_branch}`, `{special_forces}`, `{naval_commander}`, `{air_commander}`

**Economic**: `{central_bank}`, `{currency}`, `{stock_exchange}`, `{sovereign_fund}`, `{state_enterprise}`, `{commodity_name}`

**Relationship Entities**: `{the_player_country}`, `{the_adversary}`, `{the_ally}`, `{the_trade_partner}` — the `{the_*}` forms are used in subject/object position.

### 13.3 Scaled Monetary Tokens

`{graft_amount}`, `{infrastructure_cost}`, `{aid_amount}`, `{trade_value}`, `{military_budget_amount}`, `{disaster_cost}`, `{sanctions_amount}`

Values scaled to country GDP context.

### 13.4 Optional Tokens

May resolve to nil/empty: `{sovereign_fund}`, `{marine_branch}`, `{space_branch}`, `{paramilitary_branch}`

---

## 14. Military System

### 14.1 `MilitaryBranchData`

| Field | Type | Notes |
|-------|------|-------|
| `canonicalType` | String | See below |
| `localName` | String | Country-specific name |
| `tokenKey` | String | Token used in scenarios |
| `readiness` | Double (0–100) | Current operational readiness |
| `size` | Int | Thousands of personnel |
| `equipmentLevel` | Double (0–100) | Equipment modernity |
| `foundedYear` | Int? | |

### 14.2 Canonical Branch Types

`ground_forces`, `maritime`, `air`, `marines`, `special_operations`, `cyber`, `space`, `strategic_nuclear`, `coast_guard`, `reserve`, `paramilitary`, `intelligence_military`

### 14.3 `CountryMilitaryState`

```
branches: [MilitaryBranchData]
nuclearProfile: NuclearProfile?
cyberProfile: CyberProfile
overallReadiness: Double
activeConflicts: [ActiveConflict]
lastUpdatedTurn: Int
```

---

## 15. Legislature System

### 15.1 `LegislatureState`

```
composition: [PartyGroup]     // seat share percentages
approvalOfPlayer: Double      // legislature's approval of the player (0–100)
lastElectionTurn: Int
nextElectionTurn: Int
gridlockLevel: Double         // 0–100
notableMembers: [LegislatureMember]
```

### 15.2 Election Trigger

```swift
if state.turn >= legislature.nextElectionTurn {
    conductLegislatureElection()
}
```

### 15.3 Election Mechanics

```
swing = (approval - 50) * 0.003
rulingCoalitionShare ± swing         (clamped 0.30–0.70)
oppositionShare ± (swing * 0.6)      (clamped 0.15–0.60)
shares normalized to sum 1.0
nextElectionTurn = turn + max(5, maxTurns * 0.5)
```

### 15.4 Quick-Start Default Legislature

When no country data is available:

| Field | Value |
|-------|-------|
| Seat shares | 52% / 42% / 6% |
| Player approval per group | 60 / 35 / 50 |
| Overall approval | 55 |
| Gridlock level | 30 |
| Next election | `max(5, maxTurns / 4)` |

### 15.5 Country-Based Legislature

`nextElectionTurn = max(5, maxTurns * baseFraction)`

`baseFraction` = `termLengthFraction` from lower house or single chamber definition.

---

## 16. Diplomatic System

### 16.1 Relationship Scale

Per-country relationships stored in `state.countries[]`. Scale: −100 (hostile) to +100 (allied).

### 16.2 `DiplomaticStats`

```
relationship: Double        // −100 to +100
alignment: Double           // ideological alignment
tradeAgreements: Int
tradeRelationships: [TradeRelationship]
```

### 16.3 Alliance Propagation

When a relationship delta occurs: `allyPenalty = totalRelationshipDelta * 0.4` applied to countries in `alliances.military` array.

---

## 17. Fiscal & Policy Systems

### 17.1 Economic State (`CountryEconomicState`)

```
gdpIndex: Double            // starts 100.0
gdpGrowthRate: Double       // % per turn
inflationRate: Double
tradeBalance: Double
unemploymentRate: Double
fiscalReserves: Double
baseGdpBillions: Double
```

Per turn: `gdpIndex = max(10, gdpIndex * (1 + gdpGrowthRate / 100))`

### 17.2 Population State (`CountryPopulationState`)

```
populationMillions: Double
growthRatePerTurn: Double   // default 0.0002
displacedMillions: Double
cumulativeCasualties: Int
emigrationRate: Double      // default 0.0
medianAge: Double           // default 35.0
```

Per turn: `populationMillions = max(0.001, populationMillions * (1 + growthRatePerTurn))`

### 17.3 Fiscal Settings

`FiscalSettings.defaults` applied on game start.

---

## 18. Trust Your Gut

Allows players to enter free-text instructions instead of selecting a pre-written option.

### Capacity

`trustYourGutCapacity = 3 + (filledCabinetSlots / 4)` → range 3–6 uses.

### Atrocity Detection

Keyword scan before routing to AI. Detected phrases:
`"wipe out"`, `"kill them all"`, `"kill everyone"`, `"exterminate"`, `"ethnic cleansing"`, `"genocide"`, `"carpet bomb"`, `"glass them"`, `"nuke"`, `"nuclear strike"`, `"first strike"`, `"total war"`, `"level the city"`, `"indiscriminate bombing"`, `"bomb" + ("civilians" | "civilian population" | "population centers" | "entire country" | "entire nation")`

Atrocity response (no capacity check):
```
metric_approval -= 15
metric_foreign_relations -= 20
metric_public_order -= 10
```
Adds news item, increments atrocity counter.

### Normal Use

1. Check `trustYourGutUsed < trustYourGutCapacity`.
2. Apply small cost: `{metric_approval: -3, metric_foreign_relations: -2, metric_economy: -1}`.
3. Route text to AI Service for scenario/option generation.
4. Increment `trustYourGutUsed`.

---

## 19. Dick Mode

An optional authoritarian/scandal gameplay modifier. Unlocks scenarios tagged `dick` or `dic`.

### Config (`DickModeConfig`)

```
enabled: Bool
active: Bool
authoritarianBias: Double   // 0.7
moralPenaltyMultiplier: Double  // 0.5
```

### Activation

`setDickMode(true)` in `GameStore`:
- Sets `dickMode.enabled = true`, `dickMode.active = true`.
- **Also sets `state.godMode = true`** (no separate gate needed).

### Selection Gate

```swift
godMode == true && dickMode?.enabled == true && dickMode?.active == true
```

### Effect on Pool

```swift
if Double.random(in: 0...1) < authoritarianBias (0.7) && !scandalousPool.isEmpty {
    // Use scandalous pool exclusively
} else {
    // Use normal pool
}
```

---

## 20. Game Setup Flow

### 4-Step Setup

`CountrySelection → PlayerIdentity → GameLength → CabinetFormation → finalizeSetup()`

### `finalizeSetup()` Metric Baselines

- **Corruption**: `25 ± 8` (min 20)
- **All other metrics**: `62 ± 8` (min 58)
- Country `gameplayProfile.startingMetrics` used if available; falls back to baselines above.

### Quick Start

`GameStore.quickStart()`:
1. Random country (or preselected).
2. Random player name.
3. 4 cabinet members created: executive, diplomacy, defense, economy.
4. Uses country `startingMetrics` if available, else `50.12 ± 8` baseline.
5. Calls `finalizeSetup()`.

### Turn Initialization

`state.turn = 1` on setup. `maxTurns` set via `calculateMaxTurns()`.

---

## 21. Game State Schema (`GameState`)

Key fields (non-exhaustive):

```
id: String
countryId: String
playerName: String
turn: Int
maxTurns: Int
gameLength: GameLength          // .short / .medium / .long
status: GameStatus              // .active / .ended / .collapsed
startDate: Date
currentDate: Date
startedAt: Date
lastPlayedAt: Date

metrics: [String: Double]       // all metric values
metricHistory: [String: [Double]]
metricOffsets: [String: Double] // baseline offsets (decay over turns 1–25%)
lockedMetricIds: [String]

activeEffects: [ActiveEffect]
pendingConsequences: [PendingConsequence]

cabinet: [CabinetMember]
countries: [CountryRelationship]
legislature: LegislatureState
countryMilitaryState: CountryMilitaryState
countryMilitaryProfile: CountryMilitaryProfile
countryEconomicState: CountryEconomicState
countryPopulationState: CountryPopulationState
countryTraits: [CountryTrait]

currentScenario: Scenario?
playedScenarioIds: [String]
scenarioHistory: [PlayedScenario]
aiScenarioQueue: AIScenarioQueue

flags: [String: Bool]
achievements: [Achievement]
milestones: [Milestone]
resources: [String: Double]

godMode: Bool
dickMode: DickModeConfig?
infinitePulseEnabled: Bool
activeLocale: String?
playerMood: PlayerMood?
playerActionLastUsedTurn: [String: Int]

trustYourGutUsed: Int
personnelSpent: Int
totalBudget: Double
policyBudget: Double

compassion: Double
integrity: Double
management: Double
```

---

## 22. End-Game & Scoring

`ScoringEngine.generateEndGameReview(state:)` computes the final review.

### avgChange Calculation

```
avgChange = mean of (endValue - historyFirst) for all metrics except metric_approval
```

### Grade Thresholds

Length adjustments: `long: +3/+1.5`, `short: -3/-1.0` to approval/avgChange thresholds.

| Grade | Condition |
|-------|-----------|
| **COLLAPSE** | `approval < 30` (overrides all below) |
| **A** | `approval >= 75` AND `avgChange >= 5` |
| **B** | `approval >= 65` AND `avgChange >= 2` |
| **C** | `approval >= 50` AND `avgChange >= -2` |
| **D** | `approval >= 40` AND `avgChange >= -5` |
| **F** | `approval < 40` AND `avgChange < -5` |

---

## 23. Generation Pipeline

### Models

| Role | Model | Temperature |
|------|-------|-------------|
| Architect | `kimi-k2.5` (Moonshot) | 0.7 |
| Drafter | `kimi-k2.5` (Moonshot) | 0.4 |
| Embeddings | `text-embedding-3-small` (OpenAI) | — |

### Pipeline Stages

1. **Concept Seeding** (Architect): Generate narrative concepts for the requested bundle.
2. **Blueprint Planning**: Expand concept into structural skeleton.
3. **Act Drafting** (Drafter): Produce full scenario JSON — title, description, 3 options, effects, advisor feedback, outcomes.
4. **Audit & Repair**: Score against audit rules → LLM repair if below threshold (up to `max_llm_repair_attempts = 2`, if `llm_repair_enabled = true`).
5. **Storage**: Write passing scenarios to Firestore `scenarios/` collection.

### Generation Config (`world_state/generation_config`)

```
concept_concurrency: 10
max_llm_repair_attempts: 2
llm_repair_enabled: true
audit_pass_threshold: <from Firestore>   // config-driven, not hardcoded
max_bundle_concurrency: 5
max_pending_jobs: 10
max_scenarios_per_job: 50
dedup_similarity_threshold: 0.85
content_quality_gate_enabled: true
narrative_review_enabled: true
```

### Deduplication

Cosine similarity on `text-embedding-3-small` vectors. Threshold: 0.85. Scenarios above threshold discarded.

### Execution Modes

| Mode | Entry Point |
|------|-------------|
| Background job | `onScenarioJobCreated` Cloud Function |
| Manual callable | `generateScenarios` HTTP callable |
| CLI | `functions/src/tools/generate-bundle.ts` |
| Daily news batch | `news-to-scenarios.ts` |

---

## 24. Audit System

`scoreScenario(issues)` in `audit-rules.ts`:

```
score = 100
score -= (errorCount × 12) + (warningCount × 4)
return max(0, score)
```

Pass threshold: read from `world_state/generation_config.audit_pass_threshold`.

### Issue Severity

| Severity | Point Deduction |
|----------|----------------|
| Error | −12 |
| Warning | −4 |

### Rule Categories

**Errors (block scenario)**: missing required fields, invalid metric IDs, NaN/out-of-range effect values, wrong option count, missing outcomes, invalid token usage.

**Warnings (reduce score)**: extreme effect magnitudes, hardcoded currency/country names instead of tokens, similar outcomes across options, missing advisor feedback, weak narrative.

### Auto-Fix Passes

- **Deterministic fixes**: clamp values, fix duration, fill missing defaults.
- **AI-assisted fixes**: `llm_repair_enabled = true` → re-prompt Drafter to generate missing text fields (up to 2 attempts).

### Notable Rule: Third-Person Framing

Scenarios must use second-person government voice:
- `"the government"` → `"your government"`
- `"the administration"` → appropriate pronoun
- `"the president"` → `"you"` or `{leader_title}`

---

## 25. Firebase Data Architecture

### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `world_state/` | Global config documents |
| `world_state/countries/{countryId}` | Country definitions, tokens, gameplay profiles |
| `world_state/generation_config` | Generation settings including `audit_pass_threshold` |
| `world_state/scenario_manifest` | Bundle version tracking for iOS |
| `scenarios/` | All generated scenarios (flat, ~20k docs at scale) |
| `generation_jobs/` | Background job queue |
| `prompt_templates/` | Active prompt versions (Firestore-first, local fallback) |
| `training_scenarios/` | Curated example/test scenarios |

### Firebase Storage

| Path | Content |
|------|---------|
| `scenario-bundles/{bundleId}.json` | Exported bundle JSON for iOS download |

### Composite Indexes

| Collection | Fields |
|------------|--------|
| `scenarios` | `metadata.bundle`, `metadata.severity`, `is_active` |
| `generation_tracking` | `bundle`, `timestamp` |
| `prompt_templates` | `name`, `active`, `updatedAt` |

### Bundle IDs (14)

Canonical IDs stored in `scenario.category` (no `bundle_` prefix):

`economy`, `politics`, `military`, `tech`, `environment`, `social`, `health`, `diplomacy`, `justice`, `corruption`, `culture`, `infrastructure`, `resources`, `dick_mode`

Source of truth: `functions/src/data/schemas/bundleIds.ts`.

### iOS Caching Strategy

1. In-memory: `ScenarioNavigator.shared.scenarios` (session lifetime)
2. Bundle JSON: downloaded from Storage, held in memory
3. Countries: fetched at startup via `FirebaseDataService.shared.getCountries()`
4. Game state: persisted via `UserDefaults` by save slot

### Active Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `generate-scenarios.ts` | Queue generation job; watch progress |
| `audit-existing-scenarios.ts` | Audit all scenarios in Firestore against audit rules |
| `sync-prompts-to-firestore.ts` | Push local prompt markdown files to `prompt_templates/` |
| `check-generation-job.ts` | Poll status of a specific job |
| `seed-golden-examples.ts` | Write curated example scenarios as training references |
| `periodic-quality-review.ts` | Sample and score recent scenarios |
| `pre-flight.ts` | Admin SDK connectivity and config check |
| `_check-state.ts` | Inspect current Firestore state |
| `audit-geopolitical-tags.ts` | Validate geopolitical tag consistency across countries |
