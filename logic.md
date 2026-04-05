# Game Logic: The Administration

> Canonical rebuild spec for the intended game logic, scenario loop, and persistent simulation rules.
> Grounding references: iOS Swift runtime (`Scoring.swift`, `GameStore.swift`, `Models.swift`, `ScenarioNavigator.swift`, `TemplateEngine.swift`, `CrisisEngine.swift`) and Firebase Functions (`scenario-engine.ts`, `audit-rules.ts`, `logic-parameters.ts`, `types.ts`).

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
26. Realism Appendix

---

## 1. Game Overview

**The Administration** is a realistic political decision simulator. The player selects a predefined country, inherits that country's institutions and constraints, and governs through a turn-based sequence of scenarios whose premises, actors, and consequences must remain plausible for that country, its region, and its current game state.

This section is the canonical design contract for rebuilding the scenario loop from scratch. Detailed runtime mechanics later in this document should support this contract, not override it.

### 1.1 Core Game Concept

The player fantasy is not abstract city-building or pure narrative roleplay. The player is running a modern state under pressure:

1. They choose a real, predefined country with fixed institutional vocabulary, geopolitical relationships, geography, government structure, economic scale, and cabinet structure.
2. They manage an interconnected system of public metrics, hidden instability signals, fiscal tradeoffs, diplomatic relationships, and human consequences.
3. They face scenarios that are generated or selected to be realistic for the chosen country and the current state of the run.
4. They make a decision without seeing the exact metric deltas in advance.
5. They absorb the consequences as news coverage, approval movement, and persistent state changes that may create future crises or opportunities.

### 1.2 Simulation Principles

The scenario system must follow these rules at all times:

1. **Country realism first**: A scenario premise must fit the selected country's geography, government type, capabilities, institutional vocabulary, and geopolitical relationships.
2. **State realism first**: A scenario must fit the live run state. Strong economies should not repeatedly receive premises that assume economic collapse unless a new trigger justifies it. A stable legislature should not be treated as permanently gridlocked without supporting state.
3. **Region matters**: Some pressures are region-shaped rather than country-unique. Regional scenarios must reflect real bloc, climate, border, migration, energy, trade, or security pressures rather than decorative labeling.
4. **Tokens personalize prose, not logic**: Token substitution is required for names, institutions, and phrasing, but it does not make an implausible premise valid.
5. **Consequences persist**: If an option changes population, cabinet composition, diplomatic relationships, or economic conditions, the actual game state must change and remain changed.
6. **Approval is the central public-facing signal**: Other metrics feed into the simulation, but approval is the headline measure of whether the player's government is surviving politically.

### 1.3 Core Player Loop

The canonical player-visible loop is:

Read Scenario → Choose 1 of 3 Options → Lock Decision → Reveal News Outcome → Apply Persistent Consequences → Advance Turn → Select Next Eligible Scenario

The loop is intentionally decision-centric. The player is not micromanaging raw formulas every step; they are governing through politically legible events and then absorbing the resulting state changes.

### 1.4 Scenario Eligibility Contract

Before weighting, flavoring, or token resolution, a scenario is either eligible or ineligible. A valid rebuild must enforce these hard gates:

1. **Country gate**: If `metadata.applicableCountries` is present, the player country must match.
2. **Government-structure gate**: The scenario must be institutionally compatible with the country's government category and legislative structure.
3. **Geography gate**: Island, archipelago, coastal, landlocked, and frontier assumptions must match the country profile. A land-border invasion premise is invalid for a country with no relevant land-border context.
4. **Relationship gate**: Neighbor, ally, rival, border-rival, trade-partner, and bloc claims must be compatible with the country's actual geopolitical profile. If `relationship_conditions` are present, the runtime checks the live diplomatic score for the resolved counterpart country before the scenario is eligible.
5. **Metric-state gate**: The scenario premise must fit the current state. Severe economic panic, civil disorder, inflation spirals, legislative collapse, or military humiliation must be supported by current metrics or an active consequence chain.
6. **Phase gate**: Early, mid, late, and endgame content should appear only when the turn phase and narrative pacing support it.
7. **Cooldown and uniqueness gate**: Once-per-game, cooldown, and anti-repetition rules are mandatory.
8. **Consequence precedence**: Follow-up scenarios caused by earlier decisions should preempt generic content when their trigger conditions are met.

Selectors may score eligible scenarios differently. They may not rescue an ineligible scenario with weighting.

### 1.5 Decision And Reveal Contract

The player-facing presentation must work like this:

1. The player sees a scenario title and description written for their chosen country and current state.
2. The player sees exactly three options.
3. The player does **not** see exact metric deltas before choosing.
4. After choosing, the player sees a news-style result package:
    - a headline designed to read like a realistic political news alert
    - a paragraph summary explaining the immediate consequence in journalistic voice
    - optional extended context when the consequence is unusually important
5. After the narrative reveal, the player sees the gameplay reveal:
    - approval impact first
    - then every other materially affected metric
    - then any human, diplomatic, fiscal, population, military, or cabinet consequence that materially changes the run

This separation is deliberate. The player governs under uncertainty, then receives a political and mechanical readout after the choice is locked.

### 1.6 Persistent Outcome Contract

Scenario outcomes are not text-only. A valid rebuild must support persistent consequences in state:

1. **Metric changes**: Core, inverse, hidden, derived, and fiscal metrics move according to the selected option and subsequent propagation.
2. **Population changes**: Casualties, displacement, emigration, and growth changes alter the stored population state.
3. **Cabinet consequences**: If a cabinet member resigns, is fired, dies, is disgraced, or is removed by scandal, the actual occupant of that role leaves the cabinet and the slot must be refilled later.
4. **Diplomatic consequences**: Country relationship changes persist in the diplomatic state, not just in text.
5. **Economic consequences**: GDP, trade, inflation pressure, reserves, energy pressure, and budget effects feed into economic state.
6. **Consequence chains**: Some outcomes schedule follow-up scenarios or future-state triggers rather than paying out immediately.

### 1.7 Game Length And Phase Model

`maxTurns = calculateMaxTurns()` applies ±10% variance around the base value.

| Mode | Base Turns | Approx Range |
|------|-----------|--------------|
| short | 30 | 27–33 |
| medium | 60 | 54–66 |
| long | 120 | 108–132 |

`updateGamePhase()` runs after every decision. `progress = state.turn / state.maxTurns`.

| Phase | Condition | Scenario Phase Tags |
|-------|-----------|---------------------|
| `.early` | `progress < 0.25` | `"early"`, `"root"` |
| `.mid` | `0.25 ≤ progress < 0.60` | `"mid"` |
| `.late` | `0.60 ≤ progress < 0.90` | `"late"` |
| `.endgame` | `progress ≥ 0.90` | `"endgame"`, `"final"` |

### 1.8 Ending Conditions

- **Natural end**: `state.turn >= state.maxTurns`
- **Collapse**: `approvalVal < 15 || collapsedCount >= 3`
   - `coreMetrics = ["metric_approval", "metric_economy", "metric_foreign_relations", "metric_public_order"]`
   - `collapsedCount` = number of those metrics below 20.0
- Both routes trigger `EndGameReviewView`.

### 1.9 Canonical Spec Versus Current Runtime

This document is intentionally normative.

1. If the current runtime differs from a rule in Section 1, the rule in this document is the intended rebuild target unless a later section explicitly marks the rule as current-runtime-only.
2. Existing implementation details are included to ground the spec and reduce ambiguity, not to freeze accidental drift.
3. Future-state notes must be labeled so the document never presents a planned feature as already enforced.

---

## 2. Metric System

Metrics are the simulation state that scenario eligibility, outcome resolution, crisis escalation, and end-game scoring all read from. They are not independent bars. They describe overlapping aspects of national stability, legitimacy, and capacity.

### 2.1 Core Metrics (19) — range 0–100, baseline ~62 in `finalizeSetup()` / ~50 in `quickStart()`, higher is better

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
| `metric_budget` | Budget |

### 2.2 Inverse Metrics — lower raw value = better outcome

| ID | Display Name | Baseline |
|----|-------------|---------|
| `metric_corruption` | Corruption | 28 ± 5 (min 20) |
| `metric_inflation` | Inflation | 28 ± 5 (min 20) |
| `metric_crime` | Crime | 28 ± 5 (min 20) |
| `metric_bureaucracy` | Bureaucracy | 28 ± 5 (min 20) |
| `metric_unrest` | Unrest | 15 ± 3 |
| `metric_economic_bubble` | Economic Bubble | 15 ± 3 |
| `metric_foreign_influence` | Foreign Influence | 15 ± 3 |

`isInverseMetric()` in `Scoring.swift` matches this 7-item list. The last 3 (`unrest`, `economic_bubble`, `foreign_influence`) are also hidden metrics (§2.5). In `MetricCatalogue`, each inverse metric's `isInverse: true` flag enables correct grading orientation in `MetricFormatting`.

### 2.3 Derived Metric — approval

| ID | Calculation |
|----|------------|
| `metric_approval` | `calculateApproval()` — see §5. Recalculated each turn unless a direct approval effect exists. |

### 2.4 Fiscal Metric

`metric_budget` is a standard 0–100 metric (higher = healthier) initialized at 50 alongside all other metrics.

### 2.5 Hidden Metrics (3) — revealed at threshold

The three hidden inverse metrics accumulate organically via drift rules (§7) and are only shown once they breach their reveal threshold.

| ID | Reveal Threshold | Note |
|----|-----------------|------|
| `metric_unrest` | ≥ 70 | Grows from disorder, inflation, and equality drift |
| `metric_economic_bubble` | ≥ 80 | Grows from economic overheating and inflation |
| `metric_foreign_influence` | ≥ 75 | Grows from foreign policy drift and scenario effects |

### 2.6 Metric Value Representation

All metrics stored as `Double` (0.0–100.0). `clampMetricInt()` rounds to `Int` and clamps `[0, 100]` for display. `metric_budget` stored separately from the 0–100 range.

Canonical design note:

1. Approval is the public summary metric, but it should remain a derived consequence of broader state most of the time.
2. Hidden metrics exist to accumulate risk before it becomes player-visible crisis content.
3. Scenario eligibility should be able to read both visible and hidden metrics when determining plausibility.

---

## 3. Effect Pipeline (`applyDecision`)

`ScoringEngine.applyDecision(state:option:)` runs when the player selects an option.

Canonical design note:

1. Option selection is the bridge between narrative choice and persistent simulation.
2. Effects should support immediate, delayed, probabilistic, and persistent consequences.
3. Non-metric outcome fields such as population, diplomatic, economic, and cabinet consequences are first-class state mutations, not decorative attachments.

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

Approval is the central public-facing measure of political survival. It is recalculated every turn unless a direct `metric_approval` effect exists (scandal, military event, crisis shock). The formula is grounded in political science research: Hibbs "Bread and Peace" model, Fiorina retrospective voting, Mueller rally effects.

### Two-Tier Formula

**Tier 1 — Core Drivers** (weights sum to 1.0, form the baseline score):

| Metric | Weight | Rationale |
|--------|--------|-----------|
| `metric_economy` | 0.30 | Dominant predictor; reduced since employment now modelled separately |
| `metric_inflation` | 0.20 | Cost-of-living felt daily |
| `metric_employment` | 0.14 | Top-3 voter concern per Okun's misery index |
| `metric_health` | 0.14 | Consistently top-3 voter concern |
| `metric_public_order` | 0.12 | Visible disorder matters, below economic pain |
| `metric_crime` | 0.10 | Safety concern; overlaps with public order |

`metric_inflation` and `metric_crime` are inverse metrics — their effective value is `(100 - value)`.

**Tier 2 — Secondary Pressures** (deviation from 50, total capped at ±20):

| Metric | Factor | Rationale |
|--------|--------|-----------|
| `metric_unrest` | 0.12 | Inverse; very visible signal of government failure |
| `metric_foreign_relations` | 0.12 | Diplomatic failure signals incompetence |
| `metric_equality` | 0.09 | Wealth distribution concern post-2008 |
| `metric_housing` | 0.08 | Affordability is a core daily concern for most voters |
| `metric_liberty` | 0.07 | Polarized; net impact dampened |
| `metric_foreign_influence` | 0.06 | Inverse; growing election-interference salience |
| `metric_economic_bubble` | 0.06 | Inverse; systemic financial risk |
| `metric_environment` | 0.06 | Growing climate salience with younger voter cohorts |
| `metric_military` | 0.05 | Peacetime baseline signal |
| `metric_bureaucracy` | 0.04 | Inverse; chronic low-grade frustration |
| `metric_innovation` | 0.04 | Longest lag; voters feel R&D years later |
| `metric_infrastructure` | 0.04 | Visible quality-of-life signal (roads, transit, utilities) |

**Nonlinear Penalties (applied separately, not capped):**

- **Corruption** `> 40`: `(corruption - 40) * 0.45` per point above 40. Reflects catastrophic nonlinear collapses (Watergate, scandals).
- **Foreign Relations** `< 35`: `(35 - value) * 0.30` per point below 35. Diplomatic isolation adds extra drag beyond the secondary factor.

**Diplomatic Shock** (`hiddenMetrics["diplomaticShock"]`):
Hostile diplomatic and military actions accumulate a persistent approval penalty in `hiddenMetrics["diplomaticShock"]`. This value is added directly to the baseline (`max(-20, min(20, shock))`) so the political cost of attacking allies or provoking conflicts persists through future `calculateApproval()` calls. Decays 45% per turn.

**Player Traits:** Compassion and integrity stats apply small baseline offsets (±2–5 pts each).

**Political Saturation:** After all other contributions are summed, if `base > 80`, apply `base = 80 + (base - 80) * 0.55`. Asymptotically caps sustained approval around 88–90. Historical reference: Bush post-9/11 (90%) is the modern US peak. Without this, consistently positive metric states compound toward 100 in long games. Direct shock effects (wartime rally, etc.) can still push approval above 80 briefly since they bypass `calculateApproval()`. This step runs last, immediately before the final `clampMetricInt` call.

### Metric Effect Swing Ranges

Four tiers by raw effect magnitude, calibrated to historical per-turn (≈monthly) presidential approval data:

| Tier | Raw Magnitude | Approval Range | Reference Events |
|------|--------------|----------------|-----------------|
| minor | 0–2 | 0.5–1.5 pts | Minor speeches, routine decisions |
| moderate | 2–5 | 2.0–5.0 pts | Notable policies, minor scandals |
| major | 5–10 | 5.0–9.0 pts | Significant events, major policy failures |
| critical | 10+ | 8.0–16.0 pts | Crisis events, wartime rallies, impeachment |

Prior system capped approval at 4.0 points regardless of event magnitude — insufficient for realistic political shocks.

### Direct Approval Effects

When a scenario effect directly targets `metric_approval`, `calculateApproval()` is skipped and the raw delta is applied. This path is for: scandals, military defeats, terrorist attacks, wartime rallies, dramatic policy reversals. These should be the exception.

---

## 6. Secondary Impact Propagation (`deriveSecondaryImpacts`)

**Only called when using `effectsMap` branch (Branch B).** Not called for structured `effects`.

Each rule fires when the primary metric change magnitude exceeds ~2.0 (threshold varies slightly with jitter ≈ 0.27–0.35):

| Trigger | Secondary Effects |
|---------|-----------------|
| `military` change > 2 | `economy -= abs(mil) * 0.25±jitter` ; `foreign_relations -= abs(mil) * 0.30±jitter` |
| `foreign_relations` change > 2 (negative) | `economy += rel * 0.20±jitter` |
| `foreign_relations` change > 2 (positive) | `economy += rel * 0.15±jitter` |
| `economy` change > 2 | `public_order += econ * (0.08 positive / 0.12 negative)` |
| `health` change < -2 | `economy += health * 0.15±jitter` |

**Note:** Approval cascade rules (`foreign_relations → approval`, `economy → approval`, `public_order → approval`, `health → approval`) were removed. They were dead code — `calculateApproval()` runs after `advanceTurn` and completely recalculates approval from metrics, overwriting any approval cascades written to `metricDeltas`. Approval now flows entirely through `calculateApproval()` or direct scenario shocks.

All secondary effects are 1-turn `ActiveEffect`s appended to the pipeline.

Canonical design note:

1. Secondary propagation exists so the simulation behaves like a connected political system rather than a collection of isolated bars.
2. A rebuild may change the exact formulas, but cross-metric consequences should remain explicit and legible.
3. Generation-time effect validation should assume these follow-on relationships exist when assessing realism.

---

## 7. Organic Metric Drift & Continuous Linkage

`advanceTurn` applies cross-metric coupling rules after the active effects loop. These are small background pressures (typically 0.2–1.5 pts/turn) grounded in real macroeconomic and political relationships. All metric values are read before any drift is written to prevent cascading reads within a single turn. Scenarios and player decisions remain the dominant force — drift is the connective tissue.

### Coupling Rules

| Source Condition | Target Metric | Formula | Rationale |
|-----------------|---------------|---------|-----------|
| `public_order < 40` | `unrest += 1.5` | flat/turn | Disorder is the most direct unrest driver |
| `inflation > 70` | `unrest += 0.75` | flat/turn | Cost-of-living pressure fuels social anger |
| `economy < 35` | `unrest += 0.5` | flat/turn | Economic despair and unemployment |
| `housing < 40` | `unrest += (40 - val) * 0.015` | per turn | Housing crisis causes acute social tension (max ~0.6) |
| `equality < 40` | `unrest += (40 - val) * 0.010` | per turn | Inequality breeds resentment (max ~0.4) |
| None of the above | `unrest -= 0.75` | per turn | Natural social cooling when conditions stable |
| `corruption > 60` | `liberty -= 1.0` | flat/turn | Institutional capture erodes civil liberties |
| `liberty < 35` | `democracy -= (35 - val) * 0.015` | per turn | Democratic backsliding under authoritarian pressure |
| `democracy < 35` | `corruption += (35 - val) * 0.015` | per turn | Weak institutions enable rent-seeking (authoritarian loop) |
| `foreign_relations < 35` | `economy -= (35 - val) * 0.02` | per turn | Trade/investment loss from diplomatic isolation |
| `corruption > 55` | `economy -= (corruption - 55) * 0.025` | per turn | Rent-seeking and institutional inefficiency |
| `public_order < 35` | `economy -= (35 - val) * 0.02` | per turn | Disorder disrupts business activity |
| `inflation > 75` | `economy -= (inflation - 75) * 0.02` | per turn | Hyperinflation destroys economic activity |
| `innovation > 65` | `economy += (innovation - 65) * 0.003` | per turn | Long-lag R&D payoff; very slow |
| `economy > 65` | `inflation += (economy - 65) * 0.025` | per turn | Demand-pull inflationary pressure (raised from 0.007 to surface in medium games) |
| `economy < 35` | `inflation -= (35 - economy) * 0.008` | per turn | Demand collapse → deflation |
| `energy < 35` | `inflation += (35 - energy) * 0.015` | per turn | Energy supply shocks are a primary inflation driver |
| `economy > 70` | `economic_bubble += (economy - 70) * 0.04` | per turn | Rapid growth drives asset price inflation |
| `inflation > 55` | `economic_bubble += (inflation - 55) * 0.025` | per turn | Easy money / loose conditions fuel speculation |
| `economy < 55 && inflation < 55` | `economic_bubble -= 0.4` | flat/turn | Gradual deflation when neither driver is active |
| `unrest > 50` | `public_order -= (unrest - 50) * 0.025` | per turn | Active civil unrest destabilizes public order |
| `crime > 65` | `public_order -= (crime - 65) * 0.025` | per turn | High crime degrades day-to-day order |
| `economy < 45` | `housing -= (45 - economy) * 0.012` | per turn | Economic stress erodes housing affordability (seeds neglect cascade) |
| `equality < 45` | `crime += (45 - equality) * 0.015` | per turn | Structural inequality → property crime (threshold lowered from 35) |
| `housing < 40` | `crime += (40 - housing) * 0.012` | per turn | Homelessness and despair correlate with crime (threshold lowered from 30) |
| `housing < 40` | `equality -= (40 - housing) * 0.015` | per turn | Housing cost collapse widens wealth gap (threshold lowered from 30) |
| `corruption > 60` | `foreign_relations -= (corruption - 60) * 0.02` | per turn | Corrupt states face diplomatic isolation |
| `unrest > 65` | `foreign_relations -= (unrest - 65) * 0.02` | per turn | Instability signals weakness to foreign partners |
| `foreign_influence > 60` | `sovereignty -= (influence - 60) * 0.02` | per turn | External interference erodes sovereign capacity |
| `economy > 65` | `health += (economy - 65) * 0.005` | per turn | Wealth enables healthcare investment (slow lag) |
| `economy < 35` | `health -= (35 - economy) * 0.010` | per turn | Economic collapse starves healthcare funding |
| `economy > 60` | `employment += (economy - 60) * 0.012` | per turn | Growth creates jobs (Okun's law) |
| `economy < 40` | `employment -= (40 - economy) * 0.018` | per turn | Recession destroys employment faster than growth creates it |
| `innovation > 70` | `employment -= (innovation - 70) * 0.005` | per turn | Automation displacement in short run |
| `economy > 60` | `budget += (economy - 60) * 0.010` | per turn | Tax revenue grows with economic activity |
| `economy < 40` | `budget -= (40 - economy) * 0.015` | per turn | Revenue collapse in recession |
| `military > 70` | `budget -= (military - 70) * 0.008` | per turn | Defence overspend drains fiscal space |
| `foreign_relations < 35` | `trade -= (35 - foreign_relations) * 0.015` | per turn | Diplomatic isolation destroys trade partnerships |
| `foreign_relations > 65` | `trade += (foreign_relations - 65) * 0.008` | per turn | Strong relations open new markets |
| `economy < 35` | `trade -= (35 - economy) * 0.010` | per turn | Economic weakness reduces trade competitiveness |
| `budget < 40` | `infrastructure -= (40 - budget) * 0.010` | per turn | Fiscal stress leads to maintenance deferral |
| `economy < 35` | `infrastructure -= (35 - economy) * 0.008` | per turn | Depressed economy reduces infrastructure investment |
| `infrastructure < 35` | `infrastructure -= 0.3` | flat/turn | Neglected infrastructure enters accelerating decay cycle |
| `budget < 35` | `education -= (35 - budget) * 0.008` | per turn | Fiscal pressure cuts education spending |
| `economy > 65` | `education += (economy - 65) * 0.003` | per turn | Prosperous economies invest in education |
| `economy > 65` | `immigration += (economy - 65) * 0.006` | per turn | Strong economies attract skilled workers |
| `liberty > 65` | `immigration += (liberty - 65) * 0.004` | per turn | Open societies attract immigrants |
| `unrest > 55` | `immigration -= (unrest - 55) * 0.008` | per turn | Social tensions generate anti-immigration pressure |
| `economy > 70` | `environment -= (economy - 70) * 0.008` | per turn | Overheated economies degrade environment through industrial pressure |
| `energy < 40` | `environment -= (40 - energy) * 0.006` | per turn | Energy insecurity drives dirtier fuel combustion |
| `innovation > 70` | `environment += (innovation - 70) * 0.004` | per turn | Green tech gains from high-innovation economies |

> **Neglect cascade path**: Economic stress (economy < 45) → housing decline → equality erosion → crime rise → unrest growth → public order collapse → unrest crisis. The chain fires within ~25–35 turns when economy stays below 45, making it visible in medium games.

> **Economic bubble path**: Sustained overheating (economy > 70) + loose money (inflation > 55) → bubble accumulates at ~0.5–1.0/turn → market crash crisis at threshold 80. A boom economy that is never cooled will trigger a crisis in a long game (~80–100 turns from baseline).

> **Authoritarian loop**: Corruption > 60 → liberty decay → liberty < 35 → democracy backsliding → democracy < 35 → corruption growth. Compounds over time; hard to reverse once established.

### Diplomatic Shock Decay

`hiddenMetrics["diplomaticShock"]` decays 45% per turn (×0.55 multiplier). Cleared when `|shock| < 0.2`.

### Previous Hidden Accumulator — Removed

The prior system accumulated `hidden["unrest"]` when `metric_employment < 40`. `metric_employment` is inactive (always ~50), so the unrest crisis threshold was never reached organically. Replaced by the drift table above, which operates directly on the visible `metric_unrest` game metric.

Canonical design note:

1. All coupling rules operate as persistent background pressures; they compound meaningfully over many turns of sustained misgovernance but cannot overwhelm the system in a few turns.
2. The magnitudes reflect real-world lag times — economic effects on health, for example, are deliberately very slow.
3. `hiddenMetrics` is retained for `diplomaticShock` and any future hidden state.

---

## 8. Crisis System (`CrisisEngine.swift`)

`CrisisEngine.evaluateCrises(state:)` is called in `GameStore.makeDecision()` after `ScoringEngine.applyDecision()`.

### Thresholds & Triggers

All crisis checks now read from `state.metrics` (visible game metrics), not from `state.hiddenMetrics`. The prior system checked `hidden["unrest"]` etc., but those accumulators never reached their thresholds because the condition that drove them (`metric_employment < 40`) referenced an inactive metric that always defaulted to 50.

| Crisis ID | Condition | Source | Severity |
|-----------|-----------|--------|---------|
| `crisis_civil_unrest` | `metric_unrest >= 70` | `state.metrics` | `.high` (`.critical` if `>= 90`) |
| `crisis_market_crash` | `metric_economic_bubble >= 80` | `state.metrics` | `.high` (`.critical` if `>= 95`) |
| `crisis_sovereignty` | `metric_foreign_influence >= 75` | `state.metrics` | `.high` |
| `crisis_approval_collapse` | `metric_approval < 20` | `state.metrics` | `.critical` |

Deduplication: crisis ID includes `state.turn` so it is unique per turn. Existing prefixed crises are not removed before appending.

### Resolution Conditions

| Crisis ID | Resolves When |
|-----------|--------------|
| `crisis_civil_unrest` | `metric_unrest < 50` |
| `crisis_market_crash` | `metric_economic_bubble < 40` |
| `crisis_sovereignty` | `metric_foreign_influence < 40` |
| `crisis_approval_collapse` | `metric_approval >= 30` |

Canonical design note:

1. Crises are the point where accumulated visible deterioration becomes politically undeniable.
2. `metric_unrest` grows organically via drift rules (§7) when public order is low or inflation is high, so unrest crises can now be reached through sustained misgovernance.
3. Crisis resolution requires genuine state recovery, not cosmetic narrative closure.

---

## 9. Scenario System

The scenario schema exists to support the gameplay contract in Section 1. A scenario is not valid merely because it decodes. It must describe a plausible governing problem for the selected country, offer three distinct decisions, and support persistent outcomes that the runtime can enforce.

### 9.1 Scenario Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Unique identifier |
| `title` | String | Token-resolved display title |
| `description` | String | Token-resolved body text |
| `options` | [Option] | Exactly 3 |
| `phase` | String | `"early"`, `"mid"`, `"late"`, `"endgame"`, `"root"`, `"final"` |
| `conditions` | [ScenarioCondition] | Metric-state gates — `{ metricId, min?, max? }` on 0–100 scale |
| `relationship_conditions` | [RelationshipCondition]? | Diplomatic-score gates — `{ relationshipId, min?, max? }` on −100..100 scale |
| `cooldown` | Int? | Min turns between reuses |
| `oncePerGame` | Bool? | If true, never replays |
| `weight` | Double? | Selection weight (default 1.0) |
| `category` | String | Bundle ID (e.g., `"economy"`) |
| `severity` | String | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `chainId` | String? | Consequence chain membership |
| `chainsTo` | [String]? | IDs of follow-up scenarios |
| `token_map` | [String: String]? | Explicit token bindings for exclusive/news scenarios |
| `tags` | [String] | Geopolitical/thematic tags |
| `legislatureRequirement` | LegislatureReq? | Min legislature approval to appear |
| `metadata` | Metadata | Bundle, severity, applicableCountries, actorPattern, isNeighborEvent, etc. |

**`ScenarioCondition`**: `{ metricId: String, min: Double?, max: Double? }` — metric must be within `[min, max]` for the scenario to appear. Scale 0–100.

**`RelationshipCondition`**: `{ relationshipId: String, min: Double?, max: Double? }` — runtime resolves `relationshipId` to a concrete counterpart country via `TemplateEngine.resolveRelationshipToCountryId()`, then gates on the live diplomatic score for that country. Scale −100 (fully hostile) to +100 (fully allied).

Valid `relationshipId` values: `adversary`, `ally`, `trade_partner`, `partner`, `rival`, `border_rival`, `regional_rival`, `neutral`, `nation`.

Schema note:

1. `title` and `description` define the pre-choice framing shown to the player.
2. `options` must always contain three materially distinct decisions.
3. `metadata` must carry enough information for country, region, geography, and scope eligibility to be enforced before weighting.

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

Canonical gameplay note:

1. An option must remain partially opaque before choice. Exact metric deltas are hidden from the player.
2. An option's outcome package must be capable of expressing both narrative reporting and persistent simulation consequences.
3. Persistent outcomes can include cabinet, population, diplomatic, economic, and follow-up scenario consequences even when the storage shape reaches them through supporting fields rather than a single dedicated property.

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

### 9.4 Scope Tier Architecture (Approved — Pending Migration)

The scenario library remains tokenized, but scenario planning and inventory management are defined by four scope tiers:

| `metadata.scopeTier` | Purpose | Primary Selector Inputs |
|----------------------|---------|-------------------------|
| `universal` | Reusable evergreen scenarios for nearly any country | bundle, severity, tags, cooldown |
| `regional` | Region-shaped scenarios transferable across a theater | `region_tags`, `regionalBoost`, geopolitical tags |
| `cluster` | Shared-structure realism across similar countries | `clusterId`, government category, geopolitical tags, region |
| `exclusive` | Country-unique or tightly bounded content | `applicable_countries`, `exclusivityReason` |

**Required additive metadata for new scenarios**:

| Field | Meaning |
|-------|---------|
| `scopeTier` | `universal`, `regional`, `cluster`, or `exclusive` |
| `scopeKey` | Stable scope identifier such as `universal`, `region:caribbean`, `cluster:petrostate_authoritarian`, `country:jp` |
| `sourceKind` | `evergreen`, `news`, `neighbor`, or `consequence` |
| `clusterId` | Canonical cluster identifier for cluster scenarios |
| `exclusivityReason` | Required for exclusive scenarios |

`metadata.applicableCountries` remains the canonical hard country gate. It should be reserved primarily for `exclusive` scenarios and narrow news-driven scenarios.

Current implementation note:

1. The Firebase model is sufficient as a base and should not be replaced.
2. The live `ScenarioMetadata` interface does not yet formally include all of these fields.
3. The required migration set is `scopeTier`, `scopeKey`, `clusterId`, `exclusivityReason`, `sourceKind`, and `region_tags`.

### 9.5 Cluster Taxonomy (Approved — Pending Migration)

Cluster scenarios are the primary realism layer between universal and exclusive content. The initial canonical cluster set is:

1. `alliance_anchor_democracy`
2. `aging_industrial_democracy`
3. `fragile_multifaction_democracy`
4. `resource_nationalist_state`
5. `export_manufacturing_power`
6. `commodity_exporter_democracy`
7. `petrostate_authoritarian`
8. `food_import_dependent_state`
9. `migrant_destination_service_economy`
10. `small_island_tourism_state`
11. `climate_exposed_coastal_state`
12. `water_stressed_agro_state`
13. `landlocked_trade_corridor_state`
14. `frontier_security_state`
15. `sanctions_exposed_authoritarian`
16. `nuclear_deterrent_rivalry_state`
17. `post_conflict_reconstruction_state`

Rules:

1. A country may belong to multiple clusters.
2. A cluster must map to multiple countries.
3. If a cluster resolves to only one country, it should be merged or treated as `exclusive`.
4. Cluster scenarios remain fully tokenized.

---

## 10. Scenario Selection Pipeline (`generateNextScenario`)

Runs in `GameStore.generateNextScenario()` after each decision.

This section describes the runtime selection order. The important rule is that weighting only happens after hard eligibility gates pass. Country mismatch, geography mismatch, relationship mismatch, and state mismatch are invalidating conditions, not low weights.

### Tier 1 — Pending Consequence (60% chance)

`ScoringEngine.findApplicableConsequence(state:)`:
- Checks `state.pendingConsequences` for entries where `triggerTurn == state.turn`.
- Current runtime note: entries record `probability = 0.7`, while the selector description here reflects a `0.6` fire check.

Canonical rebuild rule:

1. Each pending consequence should carry a single explicit trigger probability.
2. The runtime should use that stored probability directly rather than maintaining a separate implicit threshold.
3. Consequence scenarios should outrank generic library content when they trigger.

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
5. Metric condition gates (`scenario.conditions`)
6. Relationship condition gates (`scenario.relationship_conditions`): for each condition, resolve `relationshipId` to a country via `TemplateEngine.resolveRelationshipToCountryId()`, then check the live diplomatic score from `state.countryRelationships` against `[min, max]`. If the country cannot be resolved, the scenario is ineligible.
7. `metadata.applicableCountries` match
8. Legislature gate: `legislature.approvalOfPlayer >= scenario.legislatureRequirement.minApproval`
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
8. **StateTrigger boosts**: for each `scenario.dynamicProfile.stateTriggers` entry where `condition` ("above"/"below"/"gte"/"lte") is met against `gameState.metrics[trigger.metricId]`, multiply `score *= clamp(trigger.weightBoost, 0.1, 5.0)`. This makes crisis-relevant scenarios more likely to surface when the game state warrants them.

### 10.1 Scope-Tier Weighting (Pending Implementation)

The current runtime selector is fully functional. This section describes the planned scope-tier balancing addition once the scope migration is complete.

**Selection lanes remain ordered**:

1. Pending consequence
2. Neighbor event
3. General pool
4. AI queue
5. Real-time AI fallback

**Target general-pool scope mix by phase**:

| Phase | Universal | Regional | Cluster | Exclusive |
|-------|-----------|----------|---------|-----------|
| Early | 50% | 20% | 20% | 10% |
| Mid | 35% | 25% | 30% | 10% |
| Late | 25% | 25% | 35% | 15% |
| Endgame | 20% | 20% | 40% | 20% |

**Target formula for eligible general-pool scenarios**:

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

Definitions:

1. `baseWeight = max(1.0, scenario.weight)`
2. `bundleFit = clamp(country.bundleWeightOverrides[bundle], 0.1, 3.0)`
3. `geopoliticalFit = 1.0 + min(requiredTagOverlap * 0.5, 2.0)` when required tags exist; otherwise `1.0`
4. `regionalFit = clamp(metadata.regionalBoost[country.region], 0.1, 3.0)` when present; otherwise `1.0`
5. `scopeNeed = clamp(1.0 + ((targetShare - recentShare) * 2.0), 0.65, 1.5)` over the last 12 selected scenarios
6. `novelty = recencyPenalty * similarityPenalty`
7. `tagDiversity = 0.75` when recent high-salience tag overlap is excessive; otherwise `1.0`
8. `chainContext = 1.20` when closing or continuing an active arc; otherwise `1.0`

Implementation prerequisites:

1. `scopeTier` and `scopeKey` must be present on saved scenarios.
2. The runtime must track recent scope history.
3. Scope mix should not be enforced aggressively until enough existing inventory is backfilled.

Hard country, government-category, geography, relationship, and geopolitical exclusions never relax.

### Tier 4 — AI Scenario Queue

`state.aiScenarioQueue.readyChains.first` (pre-generated AI queue).

### Tier 5 — AI Service

`aiService.generateScenario(context:)` — real-time generation via the configured model provider path. OpenAI is the canonical production default; local generation now uses the Ollama provider path.

### Tier 6 — Hard Fallback

`createFallbackScenario()` — id `"scenario_fallback_{timestamp}"`.

### Token Resolution

`TemplateEngine.shared.resolveScenario(scenario:state:)` applied to the selected scenario before returning.

---

## 11. Cabinet System

The cabinet is both a modifier layer and a persistent political asset. It is not just flavor text around options.

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

### 11.5 Persistent Cabinet Consequences

The rebuild spec requires scenario consequences to be able to change cabinet composition directly.

Rules:

1. If an outcome says the finance minister resigns, the actual occupant tied to the finance role must be removed from `state.cabinet`.
2. If an outcome disqualifies or disgraces a minister, that slot remains vacant until refilled or otherwise resolved.
3. Cabinet turnover can change future advisor feedback, cabinet boosts, and follow-up scenario eligibility.

---

## 12. Country System

### 12.1 Overview

50 playable countries across 10 regions. Countries stored in `world_state/countries/{countryId}`.

Each country is more than a skin. It defines the realism envelope for scenario generation and runtime selection through:

1. institutional tokens
2. government category
3. geopolitical relationships
4. geography and region
5. gameplay profile and starting metrics
6. economic and population context

### 12.2 Country IDs (50)

Stored as ISO 3166-1 alpha-2 codes in the `countries/` Firestore collection.

`us, cn, ru, gb, fr, de, jp, in, br, ca, au, kr, it, es, mx, id, tr, sa, ar, no, se, nl, ch, pl, ua, il, ir, eg, za, ng, pk, ve, th, vn, sg, my, ph, kp, cl, co, gr, bd, hu, pt, nz, ke, gh, jm, cu, qa`

Required inclusions: `jm` (Jamaica), `gh` (Ghana).

### 12.3 Government Categories

`liberal_democracy`, `illiberal_democracy`, `hybrid_regime`, `authoritarian`, `totalitarian`, `theocracy`, `constitutional_monarchy`, `absolute_monarchy`

### 12.4 Starting Metrics

All 28 metrics are initialized at game start. Firestore stores `gameplay.starting_metrics` and `gameplay.metric_equilibria` (snake_case). `finalizeSetup()` and `quickStart()` in `GameStore.swift` expand these into full `MetricValue` objects with history.

Baseline categories used during game initialization (when country data absent):
- **Standard metrics** (19 non-inverse): baseline ≈ 62 ± 8 in `finalizeSetup()`; ≈ 50 ± 8 in `quickStart()`
- **Inverse metrics** (corruption, inflation, crime, bureaucracy): baseline ≈ 25 ± 5 (min 20)
- **Hidden metrics** (unrest, economic_bubble, foreign_influence): baseline ≈ 15 ± 3

Country-specific `starting_metrics` in Firestore override these defaults. Values are calibrated per-country based on real-world conditions (see `update-country-starting-metrics.ts`). Key calibration examples:
- Nordic countries (no, se, ch, nl): economy 74–84, corruption 10–14, democracy 84–90
- Crisis economies (ve, ar, pk): economy 18–35, inflation 75–90, corruption 60–82
- Authoritarian states (kp, cu, ir): democracy 5–15, liberty 5–15, public_order elevated by enforcement

### 12.5 Sub-Locales

Each country has 6–8 sub-locales stored at `countries/{countryId}/locales/{localeId}`. Used for regional event flavor.

Canonical design note:

1. Countries should be capable of sharing universal scenarios without losing realism.
2. Countries should also reject scenarios whose premises break geography, adjacency, institutions, or region.
3. Country data should therefore be treated as both a narrative context source and a hard eligibility source.

---

## 13. Token & Template System

### 13.1 Purpose Of The Token System

The token system is the realism adapter that lets one scenario library serve many countries without hardcoding country-specific prose.

Its job is to localize:

1. institutional names
2. leadership titles
3. cabinet offices
4. legislative and judicial bodies
5. military and intelligence institutions
6. geopolitical actors and relationship language
7. GDP-scaled economic phrasing

Its job is **not** to excuse an invalid scenario premise. A border-war scenario remains invalid for the wrong country even if every institution name resolves cleanly.

### 13.2 Runtime Resolution

`TemplateEngine.shared.resolveScenario(scenario:state:)` replaces `{token}` placeholders at runtime. Generation and audit rules should assume tokenized content by default. Hardcoded country-specific names, institutions, or political actors are invalid unless a scenario is explicitly designed as narrow country content and still remains tokenized.

### 13.3 Structural Tokens (per country)

**Executive**: `{leader_title}`, `{vice_leader}`

**Legislative**: `{legislature}`, `{upper_house}`, `{lower_house}`, `{governing_party}`

**Judicial**: `{judicial_role}`, `{chief_justice_role}`, `{prosecutor_role}`

**Cabinet Roles (13)**: `{finance_role}`, `{defense_role}`, `{foreign_affairs_role}`, `{justice_role}`, `{health_role}`, `{interior_role}`, `{commerce_role}`, `{labor_role}`, `{energy_role}`, `{environment_role}`, `{transport_role}`, `{education_role}`, `{executive_role}`

**Intelligence**: `{intelligence_agency}`, `{domestic_intelligence}`, `{security_council}`

**Military**: `{armed_forces_name}`, `{military_chief_title}`, `{special_forces}`, `{ground_forces_branch}`, `{maritime_branch}`, `{air_branch}`, `{cyber_branch}`, `{intel_branch}`, `{strategic_nuclear_branch}`, `{paramilitary_branch}`, `{coalition_name}`

**Economic**: `{central_bank}`, `{currency}`, `{stock_exchange}`, `{sovereign_fund}`, `{state_enterprise}`, `{commodity_name}`

**Relationship Entities**: `{the_player_country}`, `{the_adversary}`, `{the_ally}`, `{the_trade_partner}` plus the wider actor family used by generation and audit. The `{the_*}` forms are used in subject/object position.

### 13.4 Context And Scale Tokens

The country context layer also supports scaled or contextual tokens such as:

`{graft_amount}`, `{infrastructure_cost}`, `{aid_amount}`, `{trade_value}`, `{military_budget_amount}`, `{disaster_cost}`, `{sanctions_amount}`

These values should be scaled to country GDP and narrative context. They exist to keep outcomes believable across very different economies.

Optional tokens may resolve to nil or empty values when the institution does not exist for a given country, including `{sovereign_fund}`, `{marine_branch}`, `{space_branch}`, and `{paramilitary_branch}`.

### 13.5 Realism Gates Around Tokens

The rebuild contract requires token-aware realism validation:

1. **Adjacency claims must be true**: If narrative text says a country shares a border, uses a neighboring actor, or describes a cross-border confrontation, the referenced relationship must actually support that claim.
2. **Geography claims must be true**: Island, archipelago, coastal, landlocked, arctic, and frontier assumptions must match the selected country.
3. **Government claims must be true**: The prose must fit the country's regime and institutional structure. Tokenized text should not describe parliamentary approval mechanics for a country where that premise is false unless the country profile supports it.
4. **Regional pressure must be causal**: `region_tags` and related overlays must represent actual region-shaped pressures rather than ornamental flavor.
5. **Scaled amounts must remain plausible**: GDP-scaled monetary tokens should be used in ways that make sense for the country's economic scale and the narrative event being described.

### 13.6 Token Policy Under Scope Tiers

Scope architecture does **not** replace tokenization.

Rules:

1. All stored scenarios remain tokenized, including `exclusive` scenarios.
2. `exclusive` means narrow eligibility, not hardcoded prose.
3. Country names, party names, minister names, titles, and institutions continue to resolve at runtime.
4. Scope tiers control scenario targeting and prompt overlays, not token resolution behavior.
5. A scenario may be highly country-specific in premise while still requiring tokenized output fields.

### 13.7 Relationship Token Resolution

Relationship tokens (`{adversary}`, `{ally}`, `{border_rival}`, etc.) resolve dynamically from the country's `GeopoliticalProfile` at runtime. `TemplateEngine.resolveRelationshipToCountryId(_:country:gameState:)` is the canonical single-source resolver — it returns the concrete `countryId` that a relationship role maps to, and is used for both:

1. **Text resolution**: filling `{adversary}` / `{the_adversary}` with the actual country name.
2. **Eligibility gating**: checking `relationship_conditions` in `GameStore.canSelectScenario()` before the scenario enters the weighted pool.

The resolver mirrors this precedence order per role:

| Role | Source |
|------|--------|
| `adversary` | Strongest-magnitude entry in `geo.adversaries` |
| `ally` | Strongest `type == "formal_ally"` in `geo.allies` |
| `trade_partner` / `partner` | Strongest `type == "strategic_partner"` in `geo.allies` |
| `rival` | Strongest-magnitude `type == "rival"` from adversaries, fallback to neighbors |
| `border_rival` | Strongest-magnitude `type == "rival"` from `geo.neighbors` |
| `regional_rival` | Strongest-magnitude `type == "rival"` from `geo.adversaries` |
| `neutral` | Strongest `type == "neutral"` from allies, fallback to neighbors |
| `nation` | First entry in `geo.neighbors` |

### 13.8 Multi-Act Chain Token Consistency

When a scenario belongs to a consequence chain (`chainId` is set), the same real-world country must fill each relationship role across all acts of the chain. Inconsistency breaks narrative coherence.

**Mechanism:**

1. When the first act of a chain is presented, `GameStore` calls `TemplateEngine.resolveChainTokenBindings(for:country:gameState:)` to record which `countryId` filled each role.
2. These bindings are stored in `GameState.chainTokenBindings: [String: [String: String]]` as `chainId → (role → countryId)`.
3. When `TemplateEngine.buildContext` runs for any act in the same chain, it pre-seeds all relationship token slots from the stored bindings before dynamic resolution, ensuring subsequent acts use the same countries.
4. Bindings are only written on the first encounter (when `chainTokenBindings[chainId]` does not yet exist), so they remain stable.

### 13.9 Current Implementation Notes

The current system already contains strong token infrastructure in runtime and backend validation, but a rebuild should tighten the realism layer around it:

1. The template engine can localize institutions and actors correctly.
2. Audit rules already reject many hardcoded or semantically invalid token patterns.
3. Additional geography and adjacency validation should remain explicit rather than being left to prompt quality alone.

---

## 14. Military System

Military state should only influence scenarios when the country profile and current state support it. A country can have military pressure without every run collapsing into war content.

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

Canonical design note:

1. Military state can justify readiness, deterrence, border, alliance, procurement, and conflict scenarios.
2. Military scenarios still remain subject to geography and relationship realism.
3. Naval and maritime premises require coastal or otherwise valid maritime context.

---

## 15. Legislature System

The legislature exists as both a stateful institution and a scenario gate. It should matter when a scenario premise depends on parliamentary passage, coalition stability, elections, or gridlock.

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

Canonical design note:

1. Legislature requirements on scenarios should only be used where the premise truly depends on legislative support.
2. Government-structure realism still applies. A legislature gate should not be used as a generic difficulty switch for countries where the premise is institutionally wrong.

---

## 16. Diplomatic System

Diplomatic state is part of the persistent simulation, not just scenario flavor. Relationship changes should affect future eligibility, neighbor events, alliances, and consequence chains.

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

### 16.4 Geopolitical Ripple (`applyGeopoliticalRipple`)

Called after every `executeDiplomaticAction` and `executeMilitaryAction`. Uses the target country's `geopoliticalProfile.allies` and `geopoliticalProfile.adversaries` to propagate the direct relationship delta to third parties.

**Approval Impact** (context-aware, applied immediately via `modifyMetricBy` AND persisted as `hiddenMetrics["diplomaticShock"]`):

| Context | Diplomatic Action | Military Action |
|---------|------------------|-----------------|
| Negative vs player ally | −5.0 pts | −10.0 pts |
| Negative vs adversary | +2.0 pts | +3.5 pts |
| Negative vs neutral | −2.0 pts | −4.0 pts |
| Positive any | +0.75–1.5 pts | — |

**Ripple Factors** (applied to bilateral relationships of target's allies/adversaries):

- Ally ripple: `directRelDelta * allyFactor * strengthFactor`; `allyFactor` = 0.25 (military) / 0.15 (diplomatic); only propagated when `|ripple| >= 1.0`
- Adversary ripple (negative actions only): `abs(directRelDelta) * advFactor * strengthFactor`; `advFactor` = 0.12 (military) / 0.08 (diplomatic); not surfaced in briefing

**Compound Action Multiplier**: `min(2.2, 1.0 + (actionCount - 1) * 0.35)` applied to the relationship delta for repeated actions in the same turn. Resets on `makeDecision`.

**Diplomatic Shock Persistence**: The approval delta from each action accumulates into `state.hiddenMetrics["diplomaticShock"]` (capped ±30). `calculateApproval()` adds this shock to the computed baseline, so repeated hostile actions cause persistent approval damage that decays 45% per turn rather than being wiped on the next scenario decision.

Canonical design note:

1. Diplomatic relationships should influence which actors can appear credibly in scenarios.
2. Diplomatic shocks should propagate into trade, approval, sovereignty, and security consequences.
3. A relationship token should never imply hostility, alliance, or adjacency that the underlying graph does not support.

---

## 17. Fiscal & Policy Systems

Fiscal and population state are persistent simulation layers that let scenarios create lasting pressure beyond one-turn metric changes.

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

Canonical design note:

1. Economic-impact fields should be able to justify later scenario eligibility, especially for recession, inflation, trade, energy, and austerity content.
2. Budget pressure should remain politically meaningful even when approval does not move immediately.

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

Canonical design note:

1. Population-impact fields on options are required to mutate this state when present.
2. Casualties and displacement should remain visible to downstream systems, not vanish after a one-turn approval hit.
3. Population state can justify future scenarios involving labor pressure, migration, unrest, reconstruction, or legitimacy shocks.

### 17.3 Fiscal Settings

`FiscalSettings.defaults` applied on game start.

---

## 18. Trust Your Gut

`Trust Your Gut` is a controlled exception path that lets the player improvise policy rather than choosing from the authored three-option set. It should remain scarce, risky, and bounded by the same consequence rules as authored content.

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

Canonical design note:

1. This mode should not bypass realism, safety, or consequence validation.
2. Free-text decisions should still resolve into the same persistent simulation layers as authored scenarios.
3. The cost of improvisation should remain visible so it does not trivialize authored decision tradeoffs.

---

## 19. Dick Mode

`Dick Mode` is an optional modifier that intentionally widens access to authoritarian, scandal-driven, or morally corrosive decision content. It changes pool access, not the underlying realism rules.

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

Canonical design note:

1. Even in this mode, country realism, geography realism, and consequence persistence still apply.
2. The mode should change what kinds of options are surfaced, not allow institutionally impossible content.

---

## 20. Game Setup Flow

Setup establishes the realism envelope for the run. It should not create a generic country shell and then rely on token substitution alone.

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

Canonical design note:

1. Setup must load or derive enough country context for scenario selection to enforce geography, institutions, region, and relationships from the first turn.
2. Starting metrics should reflect the selected country's gameplay profile rather than collapsing every run into the same opening state.

---

## 21. Game State Schema (`GameState`)

`GameState` is the persistence contract for the simulation. If a scenario consequence is meant to matter later, it should land in state here or in data directly referenced by it.

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

Canonical design note:

1. Cabinet, population, legislature, economy, diplomacy, and pending consequences are all part of the persistent scenario loop.
2. A rebuild should prefer storing durable consequence state explicitly rather than encoding it only in freeform narrative history.
3. Hidden metrics and consequence queues exist so the scenario loop can react to the past instead of presenting isolated one-off events.

---

## 22. End-Game & Scoring

End-game review should answer the political question of the run: did the player govern effectively enough to retain legitimacy and improve the country?

`ScoringEngine.generateEndGameReview(state:)` computes the final review.

### avgChange Calculation

```
avgChange = mean of (endValue - historyFirst) for all metrics except metric_approval
```

### Grade Thresholds

Length adjustments: `long: +3/+1.5`, `short: -3/-1.0` to approval/avgChange thresholds.

| Grade | Condition |
|-------|-----------|
| **COLLAPSE** | `approval < 30` (checked first; overrides all below) |
| **A** | `approval >= 75` AND `avgChange >= 5` |
| **B** | `approval >= 65` AND `avgChange >= 2` |
| **C** | `approval >= 50` AND `avgChange >= -2` |
| **D** | `approval >= 40` AND `avgChange >= -5` |
| **D** (trajectory rescue) | `approval >= 30` AND `avgChange >= 3` — leader in genuine turnaround |
| **F** | all remaining cases |

COLLAPSE is evaluated first so a `< 30` approval score can never accidentally land in D/F via else-if ordering.

Canonical design note:

1. End-game scoring should reward both political survival and substantive state improvement.
2. A high approval score built on collapsing state should not receive the best ending.
3. A technically improved country with catastrophic legitimacy failure should still be treated as failure or collapse.

---

## 23. Generation Pipeline

This section defines the canonical rebuild contract for creating scenario content that is valid for runtime selection. A generated scenario is only acceptable if it supports the gameplay and realism rules defined in Sections 1, 9, 10, and 13.

### 23.1 Purpose

The generation pipeline exists to produce scenarios that are:

1. politically legible to the player
2. realistic for the selected country and region
3. aligned with the current game state and scenario phase
4. mechanically valid for the effect pipeline
5. reusable through tokenization without flattening away real geopolitical differences

### 23.2 Models

| Role | Production Default | Local Default | Notes |
|------|--------------------|---------------|-------|
| Architect | `gpt-4o-mini` | `ollama:*` | Concept seeding |
| Drafter | `gpt-4o-mini` | `ollama:*` | Scenario drafting |
| Advisor | `gpt-4o-mini` | `ollama:*` | Advisor-feedback phase |
| Repair | `gpt-4o-mini` | `ollama:*` | Local repair stays on the local Ollama family |
| Content quality | `gpt-4o-mini` | `ollama:*` | Quality gate |
| Narrative review | `gpt-4o-mini` | `ollama:*` | Editorial gate |
| Embeddings | `text-embedding-3-small` | OpenAI-only in current live path | Ollama jobs currently skip embedding-based dedup |

Current implementation note:

1. The approved docs still reference LM Studio in some places, but the live local-provider contract in code is now `ollama:*`.
2. OpenAI remains the canonical production path for authoritative saved content.
3. Local/Ollama runs use the same phase structure, but some downstream validation behavior differs where OpenAI-only embeddings are still required.

### 23.3 Canonical Pipeline Stages

Live generation currently runs in this order:

1. **Concept seeding**: Produce scenario premises that already respect country realism, region realism, and state realism.
2. **Concept diversification**: Deduplicate and diversify concept seeds before expansion when the local path supports it.
3. **Loop-length planning**: Decide whether the concept should become a standalone scenario or a multi-act chain.
4. **Draft path selection**: Route the concept either through the standard direct-draft path or the longer structured path, depending on feature flags and generation mode.
5. **Act drafting**: Produce the full scenario JSON with title, description, 3 options, effects, advisor feedback, and outcome package.
6. **Deterministic normalization and audit**: Normalize tokens/text, apply deterministic fixes, infer missing structural metadata, and run schema/realism/token checks.
7. **Grounded-effects repair and validation**: Reconcile narrative consequence language with effect magnitudes and append any unresolved grounding issues to audit output.
8. **Targeted repair**: Apply deterministic, heuristic, and optional LLM/agentic repair to scenarios that remain below threshold but are still salvageable.
9. **Editorial quality gates**: Run content-quality and narrative-review scoring when enabled for the job path.
10. **Acceptance decision**: Accept only if audit, quality, and narrative gates all pass the current policy.
11. **Semantic dedup**: Compare accepted candidates against saved scenarios when embedding-backed dedup is available for the active model family.
12. **Storage and export availability**: Write passing scenarios and acceptance metadata to Firestore, then expose them to bundle/export tooling.

Current implementation note:

1. Inventory planning and deficit-driven generation remain the intended target state, but the live generation path is still primarily request-driven rather than fully deficit-planned.
2. Blueprint planning is no longer a guaranteed stage for every concept; the live system can bypass it through the standard direct-draft path.

### 23.4 Architect Concept Schema

The architect produces structured concepts that flow directly into the drafter. Key fields:

| Field | Purpose |
|-------|---------|
| `concept` | Premise description |
| `theme` | Political/economic theme |
| `severity` | `low`…`critical` |
| `difficulty` | 1–5 |
| `primaryMetrics` | Metrics most affected |
| `actorPattern` | Relationship role driving the scenario (`adversary`, `border_rival`, `ally`, etc.) |
| `optionShape` | General shape of the three options |
| `optionDomains` | Array of 3 `{ label, primaryMetric }` — each option MUST have a different primary metric to prevent overlap |
| `triggerConditions` | Optional `[{ metricId, min?, max? }]` — architect hint for metric-state prereqs |

`optionDomains` is injected into the drafter prompt as hard per-option metric constraints, preventing all three options from targeting the same metric domain. Each entry must use a different `primaryMetric`.

`triggerConditions` signals to the drafter which metric crisis threshold makes the scenario premise plausible. The drafter translates these into the output `conditions` array.

### 23.5 Canonical Scenario Requirements At Generation Time

Every generated scenario must already satisfy the following before storage:

1. It presents a plausible problem for at least one valid country context.
2. It can be made country-specific through tokens without losing realism.
3. Its three options represent distinct governing approaches rather than rephrasings of the same action. Each option's primary metric must differ from the others (`optionDomains` enforces this at the architect stage).
4. Its effects and narrative outcomes agree with each other.
5. Its premise can be screened by runtime eligibility rules without ambiguity.
6. Its consequence payload is capable of mutating persistent state where required.
7. Its language fits the field-level voice contract: second-person for decision framing, journalistic third-person for outcome reporting.
8. If the premise describes a metric crisis (recession, unrest, crime wave), the output `conditions` array must include the canonical metric gate.
9. If a named relational actor (adversary, rival, ally, trade partner) is central, the output `relationship_conditions` array must include the canonical diplomatic score gate.

**Canonical `conditions` mapping:**

| Premise | Condition |
|---------|-----------|
| Economic recession/collapse | `metric_economy` max 38 |
| Unemployment crisis | `metric_employment` max 42 |
| Inflation crisis | `metric_inflation` min 58 |
| Crime wave | `metric_crime` min 60 |
| Civil unrest / riots | `metric_public_order` max 40 |
| Corruption scandal | `metric_corruption` min 55 |
| Economic boom | `metric_economy` min 62 |

**Canonical `relationship_conditions` mapping:**

| Scenario type | Condition |
|---------------|-----------|
| Hostile attack / conflict | `adversary` max −25 |
| Border incursion / border_rival pressure | `border_rival` max −30 |
| Regional rivalry escalation | `regional_rival` max −20 |
| Trade partner deal / cooperation | `trade_partner` min 20 |
| Formal ally request / alliance test | `ally` min 30 |
| Rival provocation (sub-conflict) | `rival` max −15 |

### 23.6 Generation Job Contract (Scope Migration — Pending)

New jobs should carry explicit scope metadata:

```json
{
   "bundle": "diplomacy",
   "count": 24,
   "scopeTier": "cluster",
   "scopeKey": "cluster:small_island_tourism_state",
   "clusterId": "small_island_tourism_state",
   "region": "caribbean",
   "applicable_countries": [],
   "sourceKind": "evergreen"
}
```

Rules:

1. `scopeTier` and `scopeKey` are required for new generation jobs.
2. `clusterId` is required for cluster jobs.
3. `applicable_countries` should be used mainly for exclusive and narrow news jobs.
4. Generation planning should fill inventory deficits, not raw bundle counts.
5. Local `modelConfig` should keep all supported phases on `ollama:*` models and fail fast instead of silently routing local work to OpenAI.

### 23.7 Generation Config (`world_state/generation_config`)

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

### 23.8 Deduplication

Cosine similarity on `text-embedding-3-small` vectors remains the canonical production dedup mechanism.

Target behavior:

1. `universal` scenarios compare against universal, regional, and adjacent cluster content in the same bundle.
2. `regional` scenarios compare against regional and universal content in the same bundle.
3. `cluster` scenarios compare against same-cluster content and broader-scope analogs.
4. `exclusive` scenarios compare against same-country content and nearby broad-scope analogs.
5. Local generation should keep dedup local as well, using an Ollama-compatible embedding model or a documented local-only fallback.

Current implementation note:

1. OpenAI-backed embedding dedup is live.
2. Ollama jobs currently skip embedding-based semantic dedup rather than routing those calls back to OpenAI.
3. This means local generation is still weaker at portfolio-level duplicate prevention than the canonical target state.

### 23.9 Execution Modes

| Mode | Entry Point |
|------|-------------|
| Background job | `onScenarioJobCreated` Cloud Function |
| Manual callable | `generateScenarios` HTTP callable |
| CLI | `functions/src/tools/generate-bundle.ts` |
| Daily news batch | `news-to-scenarios.ts` |

### 23.10 Scope Prompt Modes (Partially Implemented)

Prompt overlays should branch by `scopeTier`:

1. `universal`: maximize transferability and anti-boilerplate rigor.
2. `regional`: inject regional pressures, border dynamics, blocs, and geography.
3. `cluster`: inject shared political-economic structure for the target cluster.
4. `exclusive`: require `exclusivityReason` and reject content that can be generalized.

Current implementation note:

1. Scope metadata is written into accepted scenarios during enrichment.
2. Scope-aware prompt overlays exist, but the wider scope-aware planning, retrieval, and runtime-selection model is still incomplete.

### 23.11 Current Implementation Notes

Current implementation gaps that should remain visible during the rebuild:

1. `GenerationJobData` is still primarily bundle-oriented.
2. `training_scenarios` retrieval is still bundle plus score driven.
3. `scenario_embeddings` dedup is currently OpenAI-based and not yet equivalent across local Ollama runs.
4. Scope-aware runtime selection is still not the authoritative live selector in the game runtime.
5. Rendered-output QA after token substitution is still weaker than pre-save audit of the tokenized source text.

---

## 24. Audit System

This section defines the canonical acceptance gate between generated content and the playable library. Audit is not cosmetic. If a scenario fails realism, token, or consequence coherence checks, it should not be saved.

### 24.1 Scoring Model

`scoreScenario(issues)` in `audit-rules.ts`:

```
score = 100
score -= (errorCount × 12) + (warningCount × 4)
return max(0, score)
```

Pass threshold: read from `world_state/generation_config.audit_pass_threshold`.

### 24.2 Issue Severity

| Severity | Point Deduction |
|----------|----------------|
| Error | −12 |
| Warning | −4 |

### 24.3 Canonical Rule Categories

**Errors (block scenario)**: missing required fields, invalid metric IDs, NaN/out-of-range effect values, wrong option count, missing outcomes, invalid token usage, invalid `conditions` metric IDs, invalid `relationship_conditions` role IDs or out-of-range score thresholds.

**Warnings (reduce score)**: extreme effect magnitudes, hardcoded currency/country names instead of tokens, similar outcomes across options, missing advisor feedback, weak narrative, passive voice overuse, option depth failures (see §24.9).

### 24.9 Depth Rules

These rules enforce option quality and narrative alignment. All are deterministic (no LLM calls).

| Rule | Severity | Deduction | Condition |
|------|----------|-----------|-----------|
| `option-metric-overlap` | warn | −4 | All 3 options affect exactly the same set of metric IDs |
| `severity-effect-mismatch` | warn | −4 | Severity is `critical` or `extreme` but no effect has `|value| ≥ 1.5` |
| `advisor-stance-uniformity` | warn | −4 | More than 8/13 advisors have identical stance across all 3 options |

### 24.10 Conditions and Relationship Condition Rules

| Rule | Severity | Condition |
|------|----------|-----------|
| `conditions-invalid-metric` | error | `conditions[]` references an unknown metricId |
| `conditions-unreachable-range` | warn | `conditions[]` has `min >= max` |
| `conditions-too-restrictive` | warn | `conditions[]` threshold is extreme (max < 15 or min > 85) |
| `relationship-condition-invalid-role` | error | `relationship_conditions[]` has unknown `relationshipId` |
| `relationship-condition-out-of-range` | error | `relationship_conditions[]` min/max outside −100..100 |
| `relationship-condition-unreachable-range` | warn | `relationship_conditions[]` has `min >= max` |
| `actor-pattern-no-relationship-condition` | warn | Scenario has a relational `actorPattern` but no `relationship_conditions` |

### 24.4 Realism Rules Required For Rebuild

The rebuild spec requires audit coverage for at least these realism families:

1. **Country realism**: no premise that contradicts the chosen country's institutions, government category, capabilities, or geopolitical profile.
2. **Geography realism**: no island, landlocked, border, maritime, or frontier contradiction.
3. **Relationship realism**: no ally, neighbor, rival, or border-rival claim that conflicts with the country relationship graph.
4. **Region realism**: no region-tagged content that lacks region-shaped causality.
5. **Metric-state realism**: no premise that assumes crisis conditions which the triggering state does not support.
6. **Consequence coherence**: no narrative outcome that materially disagrees with the effect payload or persistent-state mutation.
7. **Player-information contract**: no generated content that leaks hidden metric deltas into pre-choice prose.

### 24.5 Scope Integrity Rules (Pending Implementation)

An additional audit family should validate scenario scope:

| Scope Tier | Required Validation |
|------------|---------------------|
| `universal` | Reject country-unique institutional assumptions |
| `regional` | Reject decorative regional labeling without regional causality |
| `cluster` | Reject incoherent clusters or disguised one-country scenarios |
| `exclusive` | Require `exclusivityReason` and narrow justified country restriction |

### 24.6 Auto-Fix Passes

- **Deterministic fixes**: clamp values, fix duration, fill missing defaults.
- **Heuristic fixes**: targeted structural cleanup after deterministic normalization.
- **AI-assisted fixes**: `llm_repair_enabled = true` → targeted repair actions against specific failing fields.
- **Agentic repair**: optional multi-step repair path when `agentic_repair_enabled = true`.

Current implementation note:

1. The live repair path is no longer just “re-prompt the drafter.” It now includes deterministic fixes, heuristic fixes, grounded-effects correction, targeted LLM patching, and optional agentic repair.
2. Repair remains bounded by configured attempt limits and acceptance thresholds.

### 24.7 Notable Rule: Voice Separation

Scenario voice is split by field:

1. `description`, `options[].text`, and `advisorFeedback[].feedback` use second person.
2. `outcomeHeadline`, `outcomeSummary`, and `outcomeContext` use third-person journalistic voice.

Examples:

- `"the government"` → `"your government"`
- `"the administration"` → appropriate pronoun
- `"the president"` → `"you"` or `{leader_title}`

### 24.8 Current Implementation Notes

The current backend already enforces many structural and token rules, but the rebuild should treat the following as mandatory follow-through:

1. Audit must remain capable of rejecting a scenario even if the prose sounds good.
2. Scope validation must stay separate from pure schema validation.
3. Narrative review must not override mechanical correctness.
4. Repair loops must be bounded and must not silently mutate scenarios into a different premise than the original concept.

---

## 25. Firebase Data Architecture

Firebase is the persistence and distribution layer for the scenario system. It should store enough metadata to let the generator, auditor, and runtime all make the same realism and eligibility decisions.

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

Additional indexes required for the approved scope-tier architecture:

1. `scenarios`: `metadata.bundle`, `metadata.scopeTier`, `is_active`
2. `scenarios`: `metadata.bundle`, `metadata.scopeKey`, `is_active`
3. `scenarios`: `metadata.bundle`, `metadata.clusterId`, `is_active`
4. `scenarios`: `metadata.bundle`, `metadata.sourceKind`, `is_active`
5. `training_scenarios`: `bundle`, `scopeTier`, `isGolden`, `auditScore`

### Firebase Schema Verdict

The current Firebase architecture should be evolved rather than replaced.

Keep:

1. flat `scenarios`
2. `generation_jobs`
3. `prompt_templates`
4. `training_scenarios`
5. `scenario_embeddings`
6. canonical 14-bundle taxonomy

Expand:

1. scenario metadata for scope-tier architecture
2. generation jobs for scope-targeted planning
3. golden-example metadata and retrieval for scope diversity
4. dedup strategy so local Ollama flows have explicit behavior

Clean up:

1. prompt collection naming drift in rules versus code
2. legacy dual-source country catalog support once migration is complete

Canonical design note:

1. Storage architecture should preserve metadata needed for runtime eligibility, not strip it away during export.
2. Country catalog data should remain authoritative for geography, institutions, tags, and relationships.
3. Scenario storage should support rebuild-time realism enforcement and runtime-time eligibility using the same metadata vocabulary.

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
| `check-generation-job.ts` | Poll status of a specific job |
| `health-check.ts` | Diagnose stuck/zombie generation jobs |
| `report-scenario-deficits.ts` | Report scenario inventory gaps by bundle and scope |
| `periodic-quality-review.ts` | Sample and score recent scenarios |
| `pre-flight.ts` | Admin SDK connectivity and config check |

---

## 26. Realism Appendix

This appendix centralizes the realism rules that the generation loop, audit layer, and runtime selector must all share.

### 26.1 Country Realism

1. A scenario premise must fit the chosen country's government category, institutions, capabilities, economic scale, and geopolitical role.
2. Tokenized prose is not enough to make a country fit. The underlying premise must still be true.
3. Country-specific content should remain tokenized even when eligibility is narrow.

### 26.2 Geography Realism

1. Island and archipelago countries should not receive land-border or frontier-war premises unless a specific real-world exception is supported by country data.
2. Landlocked countries should not receive naval, offshore, or maritime-control premises unless the scenario is explicitly about an external deployment or allied operation that the country's profile supports.
3. Coastal and frontier states may receive maritime or border scenarios only when relationship data and current state support them.

### 26.3 Relationship Realism

1. Neighbor, border-rival, ally, rival, adversary, and trade-partner actors must match the stored relationship graph.
2. Border language requires adjacency support.
3. Alliance or bloc obligations should only appear when the country's profile actually supports those obligations.
4. Scenarios involving a named relational actor as the primary driver should carry `relationship_conditions` gating on the live diplomatic score for that actor, ensuring the scenario only appears when the relationship state supports the premise. The runtime enforces this via `TemplateEngine.resolveRelationshipToCountryId()` and `GameStore.canSelectScenario()`.

### 26.4 Region Realism

1. Regional scenarios must be driven by causal regional pressures such as migration corridors, energy dependence, climate exposure, bloc politics, sanctions, frontier instability, or trade patterns.
2. `region_tags` should never be decorative labels.
3. Region-shaped scenarios may still be filtered out for a country if geography, institutions, or current state make the specific premise implausible.

### 26.5 State Realism

1. Crisis premises should follow from the current state or an active consequence chain.
2. Strong-state runs should not receive repeated collapse premises without intervening deterioration.
3. Hidden metrics may justify scenarios before the player sees the full crisis explicitly.

### 26.6 Decision Realism

1. Each scenario must offer three meaningfully different governing responses.
2. Option text should not expose the exact metric math before choice.
3. Outcome text and gameplay consequences must agree with each other.

### 26.7 Persistent Consequence Realism

1. Population impacts must change population state.
2. Cabinet resignations or removals must change cabinet state.
3. Diplomatic outcomes must change diplomatic state.
4. Economic outcomes must change economic or fiscal state.
5. Follow-up political fallout may be delayed, but it must be representable as a queued consequence or future eligibility change.
