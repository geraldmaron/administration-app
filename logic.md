# Game Logic: The Administration

> Canonical reference for all game mechanics, systems, and data structures.
> Updated: 2026-03-05 | Schema Version: 5.1

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Metric System](#2-metric-system)
3. [Metric Behavior & Dynamics](#3-metric-behavior--dynamics)
4. [Country Tokens & Template System](#4-country-tokens--template-system)
5. [Scenario System](#5-scenario-system)
6. [Effect Pipeline](#6-effect-pipeline)
7. [Pressure System](#7-pressure-system)
8. [Turn Processing Pipeline](#8-turn-processing-pipeline)
9. [Interaction Network](#9-interaction-network)
10. [Equilibrium & Mean Reversion](#10-equilibrium--mean-reversion)
11. [Feedback Loops](#11-feedback-loops)
12. [Hidden Variables](#12-hidden-variables)
13. [Outcome Variance](#13-outcome-variance)
14. [Cabinet System](#14-cabinet-system)
15. [Diplomatic System](#15-diplomatic-system)
16. [Fiscal System](#16-fiscal-system)
17. [Policy Settings](#17-policy-settings)
18. [Crisis System](#18-crisis-system)
19. [Retaliation Engine](#19-retaliation-engine)
20. [Candidate Generation](#20-candidate-generation)
21. [Data Architecture](#21-data-architecture)
22. [State Management](#22-state-management)
23. [Special Modes](#23-special-modes)

---

## 1. Game Overview

**The Administration** is a strategic governance simulation where the player assumes the role of a nation's head of government. Each playthrough consists of a series of turns where the player faces policy decisions that ripple through an interconnected system of 27 metrics.

### Core Loop

```
Read Scenario → Choose Option → Accept Consequences → Manage Cascades → Advance Turn
```

### Game Length

| Mode   | Target | Min | Max | Description          |
|--------|--------|-----|-----|----------------------|
| Short  | 30     | 24  | 36  | ~6-9 months          |
| Medium | 60     | 48  | 72  | ~1.5-2 years         |
| Long   | 120    | 96  | 144 | ~3-4 years (full term) |

All modes allow ±20% variance from the target.

### Dynamic Ending

- **Early Ending**: If performance score > 0.85 and approval > 70 after 80% of turns
- **Late Extension**: Up to +20% turns if performance < 0.35 and approval < 35
- **Catastrophic Ending**: Approval < 15, or 3+ metrics in critical zones (< 20 core / > 80 inverse)

### Victory Conditions

Success is measured by a weighted final score:
- Approval weight: 0.4
- Metric improvement: 0.3
- Stability: 0.2
- Crisis handling: 0.1

---

## 2. Metric System

### 2.1 Core Metrics (18)

Range 0-100. Baseline 50. Higher is better.

| ID | Name | Short | Category | Volatility | Inertia | Critical Low | Icon |
|----|------|-------|----------|-----------|---------|-------------|------|
| `metric_economy` | Economy | Economy | economic | 0.5 | 0.6 | 20 | trending-up |
| `metric_public_order` | Public Order | Order | governance | 0.7 | 0.4 | 20 | shield |
| `metric_health` | Health | Health | social | 0.4 | 0.7 | 20 | heart |
| `metric_education` | Education | Education | social | 0.2 | 0.9 | 20 | book |
| `metric_infrastructure` | Infrastructure | Infra | infrastructure | 0.2 | 0.85 | 20 | building |
| `metric_environment` | Environment | Environ | environmental | 0.3 | 0.8 | 15 | leaf |
| `metric_foreign_relations` | Foreign Relations | Foreign | foreign | 0.5 | 0.5 | 15 | globe |
| `metric_military` | Military | Military | security | 0.3 | 0.7 | 15 | shield-alert |
| `metric_liberty` | Liberty | Liberty | security | 0.4 | 0.6 | 15 | scale |
| `metric_equality` | Equality | Equality | social | 0.3 | 0.8 | 15 | users |
| `metric_employment` | Employment | Jobs | economic | 0.5 | 0.5 | 20 | briefcase |
| `metric_innovation` | Innovation | Innovation | economic | 0.3 | 0.7 | 15 | lightbulb |
| `metric_trade` | Trade | Trade | economic | 0.5 | 0.5 | 15 | ship |
| `metric_energy` | Energy | Energy | infrastructure | 0.4 | 0.7 | 15 | zap |
| `metric_housing` | Housing | Housing | social | 0.3 | 0.8 | 15 | home |
| `metric_democracy` | Democracy | Democracy | governance | 0.3 | 0.8 | 15 | vote |
| `metric_sovereignty` | Sovereignty | Sovereignty | security | 0.4 | 0.7 | 20 | flag |
| `metric_immigration` | Immigration | Immigr | social | 0.5 | 0.5 | 15 | plane |

### 2.2 Inverse Metrics (4)

Range 0-100. Lower is better. Have `criticalHigh` instead of `criticalLow`.

| ID | Name | Short | Category | Baseline | Critical High | Volatility | Inertia |
|----|------|-------|----------|----------|--------------|-----------|---------|
| `metric_corruption` | Corruption | Corrupt | governance | 30 | 80 | 0.4 | 0.7 |
| `metric_inflation` | Inflation | Inflation | economic | 30 | 80 | 0.6 | 0.4 |
| `metric_crime` | Crime | Crime | social | 40 | 80 | 0.5 | 0.5 |
| `metric_bureaucracy` | Bureaucracy | Bureauc | governance | 45 | 85 | 0.2 | 0.9 |

### 2.3 Derived Metric (1)

| ID | Name | Type | Description |
|----|------|------|-------------|
| `metric_approval` | Public Approval | derived | Weighted sum of component metrics + recency + momentum |

**Approval Derivation Formula:**

| Component | Weight | Transform |
|-----------|--------|-----------|
| metric_economy | +0.20 | linear |
| metric_employment | +0.15 | linear |
| metric_public_order | +0.12 | exponential (exp=1.5) |
| metric_health | +0.10 | threshold (at 40, penalty=2.0) |
| metric_inflation | -0.10 | linear |
| metric_corruption | -0.08 | linear |
| metric_liberty | +0.08 | linear |
| metric_housing | +0.07 | linear |
| metric_crime | -0.05 | linear |
| metric_environment | +0.05 | linear |

Plus: `recencyBias = 0.15`, `momentumFactor = 0.10`

### 2.4 Fiscal Metric (1)

| ID | Name | Range | Baseline |
|----|------|-------|----------|
| `metric_budget` | Budget | -100 to +100 | 0 |

### 2.5 Hidden Metrics (3)

Not visible to the player. Revealed at threshold via advisor hints.

| ID | Name | Baseline | Trigger | Trigger Scenario | Reveal Hint |
|----|------|----------|---------|-----------------|-------------|
| `metric_unrest` | Social Unrest | 20 | 75 | sc_mass_protests | "Growing social tensions" at 60 |
| `metric_economic_bubble` | Economic Bubble | 10 | 80 | sc_market_crash | "Overheated markets" at 50 |
| `metric_foreign_influence` | Foreign Influence | 15 | 70 | sc_espionage_discovered | "Intelligence concerns" at 50 |

### 2.6 Metric Categories

| Category | Metrics |
|----------|---------|
| governance | approval, public_order, corruption, bureaucracy, democracy |
| economic | economy, employment, innovation, trade, inflation |
| social | health, education, equality, housing, crime, immigration |
| security | military, liberty, sovereignty |
| infrastructure | infrastructure, energy |
| environmental | environment |
| foreign | foreign_relations |
| fiscal | budget |
| hidden | unrest, economic_bubble, foreign_influence |

### 2.7 Metric ID Aliases

Legacy and alternate metric IDs are normalized at runtime. Key mappings:

| Alias | Canonical ID | Notes |
|-------|-------------|-------|
| `metric_public_approval` | `metric_approval` | Legacy |
| `metric_anti_corruption` | `metric_corruption` | **Inverse mapping** (value negated) |
| `metric_inequality` | `metric_equality` | **Inverse mapping** |
| `metric_unemployment` | `metric_employment` | **Inverse mapping** |
| `metric_civil_liberties` | `metric_liberty` | |
| `metric_diplomacy` | `metric_foreign_relations` | |
| `metric_safety` | `metric_public_order` | |
| `metric_science` / `metric_tech` | `metric_innovation` | |
| `metric_social_cohesion` | `metric_public_order` | |
| `metric_tourism` | `metric_economy` | |
| `metric_water` | `metric_infrastructure` | |

---

## 3. Metric Behavior & Dynamics

### 3.1 Metric Correlations

Each metric defines lagged correlations with other metrics. These are processed every turn.

| Source | Target | Strength | Lag | Bidirectional |
|--------|--------|----------|-----|---------------|
| economy | employment | 0.7 | 1 | yes |
| economy | trade | 0.5 | 0 | yes |
| economy | innovation | 0.4 | 2 | no |
| economy | inflation | -0.3 | 1 | no |
| public_order | crime | -0.8 | 0 | yes |
| public_order | liberty | -0.3 | 0 | no |
| health | economy | 0.3 | 2 | no |
| health | employment | 0.2 | 1 | no |
| education | innovation | 0.7 | 3 | no |
| education | economy | 0.4 | 4 | no |
| education | crime | -0.3 | 3 | no |
| infrastructure | economy | 0.5 | 2 | no |
| infrastructure | employment | 0.3 | 1 | no |
| infrastructure | trade | 0.4 | 1 | no |
| environment | health | 0.4 | 2 | no |
| environment | economy | -0.2 | 0 | no |
| foreign_relations | trade | 0.6 | 1 | yes |
| foreign_relations | sovereignty | -0.2 | 0 | no |
| military | economy | -0.25 | 0 | no |
| military | foreign_relations | -0.3 | 0 | no |
| military | sovereignty | 0.4 | 0 | no |
| liberty | democracy | 0.8 | 0 | yes |
| liberty | innovation | 0.4 | 2 | no |
| liberty | public_order | -0.3 | 0 | no |
| equality | crime | -0.4 | 2 | no |
| equality | public_order | 0.3 | 1 | no |
| employment | economy | 0.7 | 0 | yes |
| employment | crime | -0.5 | 2 | no |
| innovation | economy | 0.5 | 2 | no |
| innovation | education | 0.6 | 0 | yes |
| innovation | liberty | 0.3 | 0 | yes |
| trade | economy | 0.5 | 0 | yes |
| trade | foreign_relations | 0.6 | 0 | yes |
| energy | economy | 0.4 | 0 | no |
| energy | environment | -0.3 | 0 | no |
| energy | sovereignty | 0.3 | 0 | no |
| housing | economy | 0.3 | 0 | yes |
| housing | public_order | 0.2 | 1 | no |
| democracy | liberty | 0.8 | 0 | yes |
| democracy | corruption | -0.5 | 1 | no |
| democracy | foreign_relations | 0.3 | 0 | no |
| corruption | economy | -0.4 | 1 | no |
| corruption | democracy | -0.5 | 0 | yes |
| corruption | bureaucracy | 0.5 | 0 | yes |
| inflation | economy | -0.5 | 0 | yes |
| inflation | housing | -0.3 | 0 | no |
| crime | public_order | -0.8 | 0 | yes |
| crime | employment | -0.4 | 1 | yes |
| crime | equality | -0.3 | 1 | yes |
| bureaucracy | economy | -0.3 | 0 | no |
| bureaucracy | corruption | 0.5 | 0 | yes |
| bureaucracy | innovation | -0.3 | 1 | no |

### 3.2 Metric Swing Ranges

Effect values are normalized into calibrated swing ranges per metric:

| Bucket | Raw Magnitude | Default Range |
|--------|--------------|---------------|
| minor | ≤ 1.1 | 0.3 – 1.1 |
| moderate | 1.2 – 2.6 | 1.2 – 2.6 |
| major | > 2.6 | 2.7 – 4.2 |

Per-metric overrides (selected examples):

| Metric | Minor | Moderate | Major |
|--------|-------|----------|-------|
| approval | 0.4-1.1 | 1.2-2.4 | 2.5-4.0 |
| economy | 0.3-1.0 | 1.1-2.3 | 2.4-3.8 |
| foreign_relations | 0.4-1.4 | 1.5-2.8 | 2.9-4.4 |
| inflation | 0.2-0.8 | 0.9-1.8 | 1.9-3.0 |
| bureaucracy | 0.2-0.8 | 0.9-1.9 | 2.0-3.1 |

### 3.3 Effect Curves

Non-linear curves modify effect magnitude based on current metric state:

| Metric | Curve | Parameters |
|--------|-------|------------|
| military | diminishing | Start: 80, Rate: 0.5 |
| economy | diminishing | Start: 85, Rate: 0.4 |
| public_order | threshold | Value: 25, Multiplier: 2.0x |
| approval | sigmoid | Value: 50, Multiplier: 1.2x |

---

## 4. Country Tokens, Profiles & Cabinet Role System

### 4.1 Canonical Cabinet Roles

The game uses 13 category-based cabinet roles, consistent across all 50 countries. Each role has a canonical ID, category, and country-specific title.

| Canonical ID | Category | Title (USA) | Title (UK) | Title (China) | Title (Germany) |
|--------------|----------|-------------|------------|---------------|-----------------|
| `role_executive` | Executive | Chief of Staff | Cabinet Secretary | General Secretary | Chief of Staff |
| `role_diplomacy` | Diplomacy | Secretary of State | Foreign Secretary | State Councillor for Foreign Affairs | Federal Minister for Foreign Affairs |
| `role_defense` | Defense | Secretary of Defense | Defence Secretary | Minister of National Defense | Federal Minister of Defence |
| `role_economy` | Economy | Secretary of the Treasury | Chancellor of the Exchequer | Minister of Finance | Federal Minister of Finance |
| `role_justice` | Justice | Attorney General | Attorney General | Minister of Justice | Federal Minister of Justice |
| `role_health` | Health | Secretary of Health | Health Secretary | Minister of Health | Federal Minister of Health |
| `role_commerce` | Commerce | Secretary of Commerce | Business Secretary | Minister of Commerce | Federal Minister for Economic Affairs |
| `role_labor` | Labor | Secretary of Labor | Work and Pensions Secretary | Minister of Human Resources | Federal Minister of Labour |
| `role_interior` | Interior | Secretary of Homeland Security | Home Secretary | Minister of Public Security | Federal Minister of the Interior |
| `role_energy` | Energy | Secretary of Energy | Energy Secretary | Director of Energy | Federal Minister for Energy |
| `role_environment` | Environment | EPA Administrator | Environment Secretary | Minister of Ecology | Federal Minister for Environment |
| `role_transport` | Transport | Secretary of Transportation | Transport Secretary | Minister of Transport | Federal Minister of Transport |
| `role_education` | Education | Secretary of Education | Education Secretary | Minister of Education | Federal Minister of Education |

**Category-Based Scoring**: The scoring system maps categories to metrics and candidate stats:

```typescript
CATEGORY_SCORING = {
  Executive: [{ metricId: 'metric_approval', statKey: 'management' }],
  Diplomacy: [{ metricId: 'metric_foreign_relations', statKey: 'diplomacy' }],
  Defense: [{ metricId: 'metric_military', statKey: 'military' }],
  Economy: [{ metricId: 'metric_economy', statKey: 'economics' }],
  Justice: [{ metricId: 'metric_public_order', statKey: 'integrity' }],
  Health: [{ metricId: 'metric_health', statKey: 'management' }],
  // ... all 13 categories
}

METRIC_TO_CATEGORY = {
  metric_economy: 'Economy',
  metric_military: 'Defense',
  metric_foreign_relations: 'Diplomacy',
  // ... reverse lookup for all metrics
}
```

### 4.2 Geopolitical Profile & Gameplay Profile

Each playable country defines a **geopolitical profile** and a **gameplay profile** that together control starting conditions and scenario targeting.

```typescript
type GovernmentCategory =
  | 'liberal_democracy'
  | 'illiberal_democracy'
  | 'hybrid_regime'
  | 'authoritarian'
  | 'totalitarian'
  | 'theocracy'
  | 'constitutional_monarchy'
  | 'absolute_monarchy';

interface CountryRelationship {
  countryId: string;
  type: 'formal_ally' | 'strategic_partner' | 'neutral' | 'rival' | 'adversary' | 'conflict';
  strength: number;     // -100 to 100
  treaty?: string;      // e.g. "NATO Article 5", "AUKUS"
  sharedBorder: boolean;
}

interface GeopoliticalProfile {
  neighbors: CountryRelationship[];
  allies: CountryRelationship[];
  adversaries: CountryRelationship[];
  tags: GeopoliticalTag[];
  governmentCategory: GovernmentCategory;
  regimeStability: number; // 0–100
}

interface CountryGameplayProfile {
  startingMetrics: Partial<Record<MetricId, number>>;       // replaces flat 50s
  metricEquilibria: Partial<Record<MetricId, number>>;      // mean reversion targets
  bundleWeightOverrides: Partial<Record<BundleId, number>>; // 0.0–3.0 multiplier
  priorityTags: string[];    // scenario tags to boost
  suppressedTags: string[];  // scenario tags to suppress
  neighborEventChance: number; // per-turn probability of neighbor-triggered event
}
```

These are stored under each `world_state/countries/{id}` document:

```text
world_state/countries/{id}:
  geopoliticalProfile: GeopoliticalProfile
  gameplayProfile: CountryGameplayProfile
  // existing fields unchanged
```

#### 4.2.1 Geopolitical Tags

Geopolitical tags (`GeopoliticalTag`) come from `functions/src/data/schemas/geopoliticalTags.ts` and describe coarse but important attributes:

- **Power tier**: `superpower`, `great_power`, `regional_power`, `middle_power`, `small_state`
- **Capability**: `nuclear_state`, `cyber_power`, `naval_power`, `space_capable`, `major_arms_exporter`
- **Economic**: `g7`, `g20`, `brics`, `opec`, `opec_plus`, `developed_economy`, `emerging_market`, `oil_exporter`, `gas_exporter`, `financial_center`, `manufacturing_hub`
- **Alliance/Bloc**: `nato`, `eu`, `eu_candidate`, `asean`, `african_union`, `cis`, `sco`, `quad`, `aukus`, `five_eyes`, `csto`
- **Geography**: `island_nation`, `landlocked`, `coastal`, `arctic_state`, `archipelago`
- **Status**: `sanctioned`, `conflict_zone`, `post_conflict`, `failed_state_risk`, `religious_state`, `secular_state`

These tags are used by:

- Scenario generation prompts to ground scenarios in realistic capabilities and alliances
- Scenario eligibility (see Section 5.1 metadata extensions)
- The NeighborEventEngine (see Section 5.6) to pick appropriate archetype events

### 4.3 Token Fields

Every country defines 29 token fields used for scenario text templating. Minister tokens (e.g., `{finance_minister}`, `{defense_minister}`) resolve from cabinet role titles at runtime, not from stored token fields.

| Token Key | Description | Example (USA) | Example (UK) | Example (China) | Example (Germany) |
|-----------|-------------|---------------|--------------|-----------------|-------------------|
| **Executive Branch (2)** |
| `leader_title` | Head of government title | President | Prime Minister | General Secretary | Chancellor |
| `vice_leader` | Vice leader title | Vice President | Deputy Prime Minister | Premier | Vice-Chancellor |
| **Legislative Branch (3)** |
| `legislature` | Main legislative body | Congress | Parliament | National People's Congress | Bundestag |
| `upper_house` | Upper legislative chamber | Senate | House of Lords | Standing Committee | Bundesrat |
| `lower_house` | Lower legislative chamber | House of Representatives | House of Commons | National People's Congress | Bundestag |
| **Judicial Branch (3)** |
| `judicial_role` | Highest court | Supreme Court | Supreme Court | Supreme People's Court | Federal Constitutional Court |
| `chief_justice_role` | Chief justice title | Chief Justice | Lord Chief Justice | Chief Justice | President of Federal Constitutional Court |
| `prosecutor_role` | Chief prosecutor/AG | Attorney General | Attorney General | Procurator-General | Federal Prosecutor General |
| **Intelligence & Security (3)** |
| `intelligence_agency` | Foreign intelligence | CIA | MI6 | Ministry of State Security | BND |
| `domestic_intelligence` | Domestic security | FBI | MI5 | Ministry of Public Security | Federal Office for Protection of Constitution |
| `security_council` | National security body | National Security Council | National Security Council | Central National Security Commission | Federal Security Council |
| **Military (5)** |
| `military_general` | Senior military officer | Chairman of the Joint Chiefs | Chief of the Defence Staff | Chairman of Central Military Commission | Inspector General of Armed Forces |
| `military_branch` | Armed forces name | Armed Forces | Armed Forces | People's Liberation Army | Bundeswehr |
| `special_forces` | Elite military unit | Special Operations Command | SAS | Special Operations Forces | KSK |
| `naval_commander` | Navy chief | Chief of Naval Operations | First Sea Lord | Commander of Navy | Inspector of Navy |
| `air_commander` | Air force chief | Chief of Staff of the Air Force | Chief of the Air Staff | Commander of Air Force | Inspector of Air Force |
| **Economic Institutions (6)** |
| `central_bank` | Central banking institution | Federal Reserve | Bank of England | People's Bank of China | Bundesbank |
| `currency` | National currency | dollar | pound | yuan | euro |
| `stock_exchange` | Primary stock exchange | New York Stock Exchange | London Stock Exchange | Shanghai Stock Exchange | Frankfurt Stock Exchange |
| `sovereign_fund` | Sovereign wealth fund | [none] | [none] | China Investment Corporation | [none] |
| `state_enterprise` | Major state-owned company | [varies] | [varies] | Sinopec | Deutsche Bahn |
| `commodity_name` | Key export commodity | technology | financial services | manufacturing | automobiles |
| **Local Government (3)** |
| `capital_mayor` | Capital city leader | Mayor of Washington D.C. | Mayor of London | Mayor of Beijing | Governing Mayor of Berlin |
| `regional_governor` | Regional executive | Governor | First Minister | Provincial Governor | Minister-President |
| `provincial_leader` | Province/state leader | Governor | First Minister | Provincial Governor | Minister-President |
| **Civil Service (2)** |
| `cabinet_secretary` | Chief administrative officer | White House Chief of Staff | Cabinet Secretary | Secretary-General | Chief of Staff to Chancellor |
| `senior_official` | High-ranking civil servant | Senior Advisor | Permanent Secretary | Vice Minister | State Secretary |
| **Media & Communications (2)** |
| `state_media` | State/public broadcaster | [none] | BBC | Xinhua | ARD |
| `press_secretary` | Official spokesperson | White House Press Secretary | Downing Street Press Secretary | Foreign Ministry Spokesperson | Government Spokesperson |

**Cabinet Role Token Resolution**: Role tokens like `{finance_role}`, `{defense_role}`, `{foreign_affairs_role}`, etc., are dynamically resolved from cabinet role titles by category at runtime:

```typescript
// Runtime resolution
const cabinetRoles = playerCountry?.cabinet?.roles || [];
const getRoleTitle = (category: string, fallback: string) =>
  cabinetRoles.find(r => r.category === category)?.title || fallback;

// Examples:
// USA: {finance_role} → "Secretary of the Treasury"
// UK: {finance_role} → "Chancellor of the Exchequer"
// China: {finance_role} → "Minister of Finance"
// Germany: {finance_role} → "Federal Minister of Finance"
```

All 13 role tokens resolve this way (canonical names match `TEMPLATE_TOKENS.ministers` in `logic-parameters.ts`):
- `{finance_role}` (Economy category)
- `{defense_role}` (Defense category)
- `{foreign_affairs_role}` (Diplomacy category)
- `{justice_role}` (Justice category)
- `{health_role}` (Health category)
- `{commerce_role}` (Commerce category)
- `{labor_role}` (Labor category)
- `{interior_role}` (Interior category)
- `{energy_role}` (Energy category)
- `{environment_role}` (Environment category)
- `{transport_role}` (Transport category)
- `{education_role}` (Education category)
- `{judicial_role}` (Judicial category)

**Government-Type-Aware Tokens**:

- `{ruling_party}` is resolved at runtime based on both country tokens and `governmentType`:
  - Parliamentary / Mixed systems: resolves to the governing party or coalition.
  - Presidential systems: resolves to terms like \"your administration\" rather than a generic \"ruling party\" when no explicit party token is set.
  - Authoritarian / Communist systems: resolves to the named ruling party where available.
  - Monarchies: resolves to royal-court style phrasing when no parties exist.
- `{upper_house}` / `{lower_house}` fall back to neutral labels (\"upper house\", \"lower house\") when no country-specific chamber names are defined, so US-centric names do not leak into other systems.

### 4.2 Playable Countries (50)

| ID | Name | Region | Government | Term (yrs) |
|----|------|--------|-----------|------------|
| usa | United States | North America | Presidential | 4 |
| china | China | East Asia | Mixed | 5 |
| russia | Russia | Eurasia | Mixed | 6 |
| uk | United Kingdom | Europe | Parliamentary | 5 |
| germany | Germany | Europe | Mixed | 4 |
| france | France | Europe | Mixed | 5 |
| japan | Japan | East Asia | Mixed | 4 |
| india | India | South Asia | Mixed | 5 |
| brazil | Brazil | South America | Mixed | 4 |
| south_korea | South Korea | East Asia | Mixed | 5 |
| canada | Canada | North America | Mixed | 4 |
| australia | Australia | Oceania | Mixed | 4 |
| italy | Italy | Europe | Mixed | 4 |
| spain | Spain | Europe | Mixed | 4 |
| mexico | Mexico | North America | Mixed | 6 |
| indonesia | Indonesia | Southeast Asia | Mixed | 4 |
| turkey | Turkey | Eurasia | Mixed | 4 |
| saudi_arabia | Saudi Arabia | Middle East | Mixed | 4 |
| south_africa | South Africa | Africa | Mixed | 4 |
| nigeria | Nigeria | Africa | Mixed | 4 |
| egypt | Egypt | Africa | Mixed | 4 |
| argentina | Argentina | South America | Mixed | 4 |
| thailand | Thailand | Southeast Asia | Mixed | 4 |
| vietnam | Vietnam | Southeast Asia | Mixed | 4 |
| poland | Poland | Europe | Mixed | 4 |
| netherlands | Netherlands | Europe | Mixed | 4 |
| sweden | Sweden | Europe | Mixed | 4 |
| switzerland | Switzerland | Europe | Mixed | 4 |
| iran | Iran | Middle East | Mixed | 4 |
| pakistan | Pakistan | South Asia | Mixed | 4 |
| singapore | Singapore | Southeast Asia | Mixed | 4 |
| philippines | Philippines | Southeast Asia | Mixed | 4 |
| malaysia | Malaysia | Southeast Asia | Mixed | 4 |
| bangladesh | Bangladesh | South Asia | Mixed | 4 |
| colombia | Colombia | South America | Mixed | 4 |
| chile | Chile | South America | Mixed | 4 |
| peru | Peru | South America | Mixed | 4 |
| israel | Israel | Middle East | Mixed | 4 |
| uae | United Arab Emirates | Middle East | Mixed | 4 |
| qatar | Qatar | Middle East | Mixed | 4 |
| ukraine | Ukraine | Europe | Mixed | 4 |
| north_korea | North Korea | East Asia | Mixed | 4 |
| norway | Norway | Europe | Mixed | 4 |
| greece | Greece | Europe | Mixed | 4 |
| ethiopia | Ethiopia | Africa | Mixed | 4 |
| morocco | Morocco | Africa | Mixed | 4 |
| algeria | Algeria | Africa | Mixed | 4 |
| venezuela | Venezuela | South America | Mixed | 4 |
| iraq | Iraq | Middle East | Mixed | 4 |
| belgium | Belgium | Europe | Mixed | 4 |

### 4.3 Country Data Model

Each country includes:
- **attributes**: population, gdp
- **diplomacy**: relationship (-100 to 100), alignment, allies[], rivals[], historicalPartners[]
- **alliances**: economic[], military[], trade[] (each with name and role)
- **economy**: primary_export, primary_import, trade_dependencies[], system
- **military**: strength (0-100), posture, nuclearCapabilities, navyPower, cyberCapability
- **cabinet.roles[]**: id, title, category, description, priority (13 canonical roles per country with country-specific titles)
- **tokens**: All 29 token fields (see section 4.2)
- **flagUrl**, **termLengthYears**, **maxTerms**, **governmentType**

### 4.4 Template Resolution

Scenario descriptions use `{token}` placeholders resolved at runtime:

```
"The {leader_title} faces pressure from {legislature} over {central_bank} policy..."
→ "The President faces pressure from Congress over Federal Reserve policy..."
```

Templates reside in `templates/core_templates` and `templates/retaliation_templates` in Firebase.

---

## 5. Scenario System

### 5.1 Scenario Structure

```typescript
{
  id: string,
  title: string,
  description: string,              // Supports {token} placeholders
  options: Option[],                 // 3+ options per scenario
  metadata: {
    severity: 'low' | 'medium' | 'high' | 'extreme' | 'critical',
    urgency: 'low' | 'medium' | 'high' | 'immediate',
    difficulty: 1 | 2 | 3 | 4 | 5,  // Difficulty rating (see 5.9)
    tags: string[],                  // e.g. ["supply_chain", "inflation"]
    applicable_countries: string[] | 'all',
    auditMetadata?: {                // Optional quality tracking
      lastAudited: string,           // ISO timestamp
      score: number,                 // 0-100 quality score
      issues: string[],              // Rule violations and warnings
      autoFixed?: boolean            // Whether auto-fixes were applied
    }
  },
  weight: number,                    // Selection probability weight
  tier: 'standard' | 'critical' | 'high',
  chainsTo: string[],                // Follow-up scenario IDs
  oncePerGame: boolean,
  cooldown: number,                  // Turns before eligible again
  phase: 'root' | 'mid' | 'final',
  conditions: ScenarioCondition[]    // Metric thresholds required
}
```

### 5.2 Option Structure

```typescript
{
  id: string,
  text: string,
  label: string,
  effects: Effect[],                          // Metric impacts
  relationshipImpact: Record<string, number>, // Country relationship deltas
  populationImpact: PopulationImpact[],       // Casualties/displacement
  economicImpact: EconomicImpact[],           // GDP/trade/energy damage
  consequences: Consequence[],                 // Follow-up scenarios
  outcomeHeadline: string,
  outcomeSummary: string,
  advisorFeedback: string,
  is_authoritarian: boolean,
  moral_weight: number
}
```

### 5.3 Effect Structure

```typescript
{
  targetMetricId: string,
  value: number,       // Magnitude (normalized into swing range)
  duration: number,    // Turns active (overridden by pressure system: 7-20)
  probability: number, // 0-1 trigger chance
  delay: number,       // Turns before activation
  condition: EffectCondition,
  scaling: EffectScaling
}
```

### 5.4 Scenario Bundles (14)

| Bundle | Category | Description |
|--------|----------|-------------|
| bundle_economy | economy | Supply chains, debt, inflation, fiscal crises |
| bundle_politics | politics | Elections, scandals, constitutional crises |
| bundle_military | military | Wars, nuclear threats, coups, peacekeeping |
| bundle_tech | tech | AI, cybersecurity, space, digital infrastructure |
| bundle_environment | environment | Climate, pollution, natural disasters |
| bundle_social | social | Inequality, education, healthcare, strikes |
| bundle_health | health | Pandemics, epidemics, healthcare collapse |
| bundle_diplomacy | diplomacy | Trade wars, sanctions, alliances, hostages |
| bundle_justice | justice | Crime waves, corruption, judicial independence |
| bundle_corruption | corruption | Government corruption, bribery, fraud |
| bundle_culture | culture | Cultural conflicts, media, censorship |
| bundle_infrastructure | infrastructure | Transportation, utilities, comms |
| bundle_resources | resources | Energy crises, water scarcity, mining |
| bundle_dick_mode | dick_mode | Authoritarian and morally dark options |

### 5.5 Concept-Driven Generation

Scenario bundles can be generated from **concept registries** stored under `web/scripts/generation_configs/*_concepts.json`.
Each concept defines a narrative seed plus **availability conditions** that control when the resulting scenarios are eligible.

**Concept Shape (simplified):**

```typescript
{
  id: string,
  concept: string,
  acts: string[],
  thematic_alignment?: string[],
  stakes?: string,
  variations?: number,
  availability?: {
    conditions?: ScenarioCondition[], // NEW: preferred field
    rationale?: string
  },
  // Legacy aliases (still accepted during transition)
  conditions?: ScenarioCondition[],
  logic_constraints?: {
    primary_metric: string,
    secondary_metrics: string[],
    severity_range: string[],
    conditions?: ScenarioCondition[]
  }
}
```

**Key Behavior:**
- `availability.conditions` are copied into each generated scenario’s `conditions` field.
- Conditions are min/max thresholds against metric values (0-100).
- If the player exceeds a condition’s `max` (e.g., high economy), those scenarios are **ineligible** and will not be selected.
- This creates **context-aware scenario availability** (e.g., high economy suppresses “austerity crisis” content).

### 5.6 Scenario Resolution (2-Tier)

The ScenarioNavigator engine prioritizes scenarios in the following order:

1. **Tier 1: AI-Generated Scenarios** (prefix: `gen_`)
   - From AI scenario queue (Trust Your Gut system)
   - Generated via `/api/ai/generate-scenario` endpoint
   - Uses Moonshot API (temperature 0.7) with local model fallback
   - Highest priority - always served first when available
   - Includes command-based generation via `generateScenarioChainFromCommand()`
   
2. **Tier 2: Cloud Bundles** (Firebase library collection)
   - Fetched from Firebase `library/bundle_*` documents
   - Categories: economy, politics, military, tech, environment, social, health, diplomacy, justice, corruption, culture, infrastructure, resources, dick_mode
   - Consequence scenarios from previous choices (via outcomeConsequences system)
   - Global events from Firebase `world_state/events`
   - Weighted selection based on scenario.weight property
   - Deduplication via recentScenarioQueue (last 20), recentTagQueue (last 8), and cooldowns

### 5.7 Deduplication

- `recentScenarioQueue`: Last 20 played scenario IDs
- `recentTagQueue`: Last 8 tag categories
- `oncePerGamePlayed`: Set of one-time scenario IDs
- `scenarioCooldowns`: Map of scenario ID → turn delay

### 5.8 Quality Assurance (Audit System)

Scenarios are audited via deterministic rule engine (`audit-scenarios.ts`):

**Scoring System:**
- Base score: 100 points
- Error penalty: -12 points per error
- Warning penalty: -4 points per warning
- Pass threshold: 70 points

**Audit Rules:**

| Rule | Type | Description |
|------|------|-------------|
| missing-id | error | Scenario lacks id field |
| missing-title | error | Title is empty or missing |
| missing-desc | error | Description is empty or missing |
| option-count | error | Must have exactly 3 options |
| no-effects | error | Option has no effects array |
| invalid-metric-id | error | Effect references non-existent metric |
| non-finite-value | error | Effect value is NaN or Infinity |
| invalid-duration | error | Duration < 1 |
| missing-headline | error | Option missing outcomeHeadline |
| missing-summary | error | Option missing outcomeSummary |
| missing-context | error | Option missing outcomeContext |
| duplicate-effects | error | Two options have identical effect sets |
| extreme-value | warn | Effect exceeds swing cap for metric |
| non-deterministic | warn | Effect probability ≠ 1 |
| no-domain-metric | warn | No effect touches bundle's domain metrics |
| inverse-positive | warn | Positive value on inverse metric (worsens condition) |
| similar-outcomes | warn | Options have >75% Jaccard similarity |
| invalid-difficulty | warn | Difficulty missing or outside 1-5 range |
| hard-coded-currency | warn | Text appears to contain hard-coded currency values (e.g. `$100`, `EUR`) instead of tokens/relative language |
| gdp-as-amount | warn | `{gdp_description}` is used as a literal stolen/siphoned amount instead of an overall economic descriptor |
| ruling-party-applicability | warn | `{ruling_party}` is used for countries whose government type may not have a formal “ruling party” concept (e.g. some presidential systems, monarchies) |

**Auto-Fix Capabilities:**
- Deterministic: Set probability to 1, cap extreme values, fix duration < 1, clamp difficulty to 1-5
- AI-assisted: Generate missing outcome text, correct invalid metric IDs

**Audit Metadata Storage:**
```typescript
metadata.auditMetadata = {
  lastAudited: '2026-02-11T00:00:00Z',
  score: 88,
  issues: ['[warn] extreme-value: ...', '[warn] no-domain-metric: ...'],
  autoFixed: false
}
```

**Cache Strategy:**
- SHA-256 hash of scenario content
- Skip re-audit if hash matches and score exists
- Cache invalidated on scenario modification

### 5.9 Procedural Generation Pipeline (Architect / Drafter)

Scenarios are generated via a 2-role pipeline using Moonshot AI's Kimi 2.5 model running as Firebase Cloud Functions.

**Models:**
| Role | Model | Temperature | Purpose |
|------|-------|-------------|----------|
| Architect | `kimi-k2.5` | 0.7 | Concept seeding, narrative blueprints, high-level planning |
| Drafter | `kimi-k2.5` | 0.4 | Detailed act expansion, option writing, effect calibration |

**Cost Efficiency:**
- Input: $0.10 per million tokens (vs $0.30-$1.25 for Gemini)
- Output: $0.60 per million tokens (vs $2.50-$10.00 for Gemini)
- **Overall savings: ~85% compared to Gemini 2.5 Pro/Flash**

**Pipeline Stages:**

1. **Concept Seeding (Architect)**
   - Input: Bundle ID, loop count, country context, game logic parameters
   - Output: Array of concepts — each with `concept`, `theme`, `severity`, `difficulty` (1-5)
   - The Architect generates narrative seeds grounded in the bundle's domain metrics

2. **Blueprint Planning (Architect)**
   - Input: Selected concept + game rules
   - Output: Multi-act blueprint with act titles, escalation arc, key metrics
   - Ensures narrative coherence across the full loop

3. **Iterative Act Drafting (Drafter)**
   - Input: Blueprint + act index + previous act context
   - Output: Complete scenario act with title, description, 3 options, effects, metadata
   - Each option includes: effects, advisor feedback, outcome headline/summary, news items
   - Acts chain via `chainsTo` references; phase progression: `root` → `mid` → `final`

4. **Audit & Repair**
   - Every generated act passes through the audit system (see 5.8)
   - Deterministic auto-fixes applied first (cap values, fix probabilities, clamp difficulty)
   - Heuristic fixes for missing text (outcome headlines, summaries)
   - Acts scoring below 70 are regenerated (up to 2 retries per act)

5. **Storage**
   - Validated scenarios saved to Firestore `library/bundle_{id}/scenarios` subcollection
   - Similarity check prevents near-duplicate scenarios (cosine similarity on title+description)
   - Metadata enriched with `bundle`, `source: 'vertex-ai'`, `difficulty`, audit results

**Execution Modes:**
- **Background Jobs**: Firestore trigger on `generation_jobs` collection — async, supports concurrency limits
- **Manual Callable**: `generateScenariosManual` onCall function — direct invocation
- **CLI**: `scripts/generate-scenarios.ts` — queues jobs, supports `--watch`, `--status`, `--cancel`

**Concurrency & Limits:**
- `MAX_BUNDLE_CONCURRENCY`: up to 5 bundles processed in parallel per job (adaptive backoff reduces this on rate-limit pressure)
- `MAX_PENDING_JOBS`: 10 jobs in queue
- `MAX_SCENARIOS_PER_JOB`: 50 scenarios per job request
- Function timeout: 540s, memory: 1 GiB

### 5.10 Daily News-to-Scenarios Pipeline

Implemented in `web/functions/src/news-to-scenarios.ts`. Runs once per day via Firebase Scheduler.

**Flow:**
1. Fetch headlines from 6 RSS feeds (BBC World, Al Jazeera, NPR World, Deutsche Welle, Reuters World, FT World)
2. Filter out headlines already processed in the last 48 hours
3. LLM classification: relevance score (0–10), bundle mapping, geographic scope (`global` | `regional` | `country`), applicable country codes
4. Discard headlines below relevance score 7
5. Deduplicate against existing news-sourced scenarios (title text + semantic similarity)
6. Generate scenarios via `generateScenarios()` (same pipeline as Section 5.9) — max 6 per run
7. Save to Firestore; write ingestion log to `news_ingestion_logs` collection

**Limits:**
- `MAX_SCENARIOS_PER_RUN`: 6 (cost guard)
- `MIN_RELEVANCE_SCORE`: 7
- `PROCESSED_LOOKBACK_HOURS`: 48

### 5.11 Difficulty Rating

Each scenario carries a difficulty rating (1-5) assigned during concept seeding:

| Rating | Label | Description |
|--------|-------|-------------|
| 1 | Routine | Standard policy decision, low stakes, clear best option |
| 2 | Moderate | Meaningful trade-offs, some metrics at risk |
| 3 | Significant | Genuine dilemma, no clearly safe option |
| 4 | High-Stakes | Crisis-level, multiple metrics threatened, lasting consequences |
| 5 | Existential | Catastrophic potential, survival-level stakes |

**Behavior:**
- Stored in `metadata.difficulty` on every scenario
- Validated by audit rules: must be integer 1-5, clamped if out of range
- Reserved for future use: difficulty-based scenario selection, adaptive challenge curves
- Default fallback: 3 (if LLM omits the field)

---

## 6. Effect Pipeline

When a player chooses an option, effects are processed through this pipeline:

### Step 1: Normalize

- Metric ID aliases resolved (e.g. `metric_anti_corruption` → `metric_corruption`)
- Inverse mappings detected and values negated

### Step 2: Effect Modifiers

Applied via `applyEffectModifiers()`:

1. **Condition Check**: Metric thresholds, cabinet stats, turn ranges
2. **Scaling**: Linear/logarithmic/threshold based on other metric values
3. **Cabinet Multiplier**: Role-specific, 0.85x-1.15x based on candidate stats
4. **Effect Curve**: Diminishing returns, threshold amplification

### Step 3: Swing Normalization

Raw LLM value determines the bucket (≤1.1 → minor, ≤2.6 → moderate, >2.6 → major), then a random decimal is sampled from the per-metric range for that bucket.

### Step 3b: Game-Length Scaling

The normalized value is multiplied by a game-length factor before pressure creation:

| Game Length | Target Turns | Multiplier |
|-------------|-------------|------------|
| short | 30 | ×1.2 |
| medium | 60 | ×1.0 |
| long | 120 | ×0.85 |

Short games amplify per-turn impact since there are fewer turns for pressure to compound; long games reduce it for the same reason.

### Step 4: Jitter

```
baseJitter = random(-0.17, +0.17)
varianceMultiplier = random(0.88, 1.12)  // or 0.86-1.14 during processing
microVariance = random(-0.055, +0.055)
newValue = value × varianceMultiplier + baseJitter + microVariance

// Anti-round-number jitter
if (value ≈ integer): += random(-0.115, +0.115)
if (value ≈ multiple of 5): += random(-0.21, +0.21)
```

### Step 5: Convert to Pressure

Effects wrapped in pressure objects with randomized duration (7-20 turns).

### Step 6: Secondary Impacts

Derived via the interaction network (see Section 9).

### Step 7: Network Propagation

Two layers of cascading effects through metric edges with attenuation.

---

## 7. Pressure System

All effects are converted to pressure objects that decay over time.

### Pressure Object

```typescript
{
  targetMetricId: string,
  value: number,              // Current magnitude
  duration: number,           // Original duration
  remainingDuration: number,  // Turns left
  probability: number,        // Trigger chance
  delay: number               // Turns before activation
}
```

### Duration

```
randomDuration = floor(random() × 14) + 7  // 7-20 turns
finalDuration = max(requestedDuration, randomDuration)
```

### Per-Turn Decay

```
decayRate = 1 / max(duration, 1)
nonlinearDecay = 1 - exp(-decayRate × (1 + |pressure| × 0.12))
value = value × (1 - nonlinearDecay)
```

Pressure expires when `remainingDuration ≤ 0` or `|value| < 0.05`.

### Constants

```
PRESSURE_DRIFT_RATE       = 0.12
PRESSURE_MIN_DECAY_TURNS  = 7
PRESSURE_MAX_DECAY_TURNS  = 20
PRESSURE_SYNERGY_MULTIPLIER = 1.4
PRESSURE_MOMENTUM_MAX     = 1.25
PRESSURE_SATURATION_MAX   = 0.8
SYSTEM_STRESS_MAX         = 1.0
MAX_METRIC_CHANGE_BASE    = 4.5
INITIAL_METRIC_VALUE      = 50.0
```

---

## 8. Turn Processing Pipeline

Each turn (`advanceTurn`) processes these systems in order:

### 8.1 Starting Offset Normalization
Country-specific metric offsets decay over 25% of game length.

### 8.2 Passive Cabinet Impacts

Each cabinet member probabilistically affects their domain metrics every turn:

**Impact Calculation:**
- **Success probability** = `statValue / 100`
- **Success impact** = `+pow((stat - 50) / 50, 1.1) × 0.25`
- **Failure impact** = `-pow((50 - stat) / 50, 1.1) × 0.25`
- **Cabinet size scaling**: `7 / max(7, cabinetSize)` to normalize larger cabinets
- **Degree alignment bonus**: `×1.08` if education matches domain stat
- **Jittered variance**: Applied to prevent predictability

**Role → Metric Mapping:**

| Role | Metric | Stat |
|------|--------|------|
| vice_president | approval, public_order | management, integrity |
| secretary_of_state | foreign_relations | diplomacy |
| secretary_of_treasury | economy | economics |
| secretary_of_defense | military | military |
| secretary_of_homeland_security | public_order | management |
| attorney_general | public_order | integrity |
| secretary_of_commerce | economy | economics |
| secretary_of_labor | economy, equality | economics, compassion |
| secretary_of_health | health | compassion |
| secretary_of_education | equality | compassion |
| secretary_of_energy | economy, environment | economics, management |
| secretary_of_interior | environment | compassion |

**Example:** A Secretary of Treasury with 70 economics skill has a 70% chance each turn to provide a small positive boost to the economy metric. On failure, they may cause a small negative impact. The magnitude scales with how far their skill deviates from 50.

### 8.3 Feedback Loops
Reinforcing and balancing loops activated by metric thresholds (see Section 11).

### 8.4 Hidden Variable Accumulation
Unrest, bubble, and foreign influence accrue based on conditions (see Section 12).

### 8.5 Metric Correlations
Lagged correlations between metrics processed from history (see Section 3.1).

### 8.6 Metric Decay
Infrastructure and environment naturally drift toward equilibrium.

### 8.7 Event Queue
Delayed consequences and scheduled effects fire when their delay expires.

### 8.8 Crisis Processing
New crises checked and active crises apply per-turn effects.

### 8.9 Active Effect Processing

Each active effect is processed with a multiplier stack:

| Multiplier | Condition | Value |
|-----------|-----------|-------|
| Base variance | Always | 0.84-1.16 + micro ±0.06 |
| Context | metric < 30 & negative | 1.3x |
| Context | metric < 40 & negative | 1.15x |
| Context | metric > 75 & negative | 0.9x |
| Momentum | worsening trend + negative pressure | 1.25x |
| Momentum | improving trend + positive pressure | 1.08x |
| Synergy | 3+ core metrics failing | 1.25x |
| Synergy | economy+order or economy+approval failing | 1.15x |
| Saturation | 7+ negative active effects | 0.8x |
| Saturation | 4+ negative active effects | 0.9x |
| Dynamic sensitivity | Low value + negative | up to +70% fragility |
| Dynamic sensitivity | System stress | up to +45% |
| Heavy tail | 12-20% chance | Pareto(2.6, 1) up to 3.6x |
| Saturation drag | Distance from center > 35 | up to -35% |

### 8.10 Lagged Echo Effects
For impacts ≥ 1.2 magnitude:
- Echo intensity: 20-75% of original (stress-scaled)
- Delay: 2-5 turns
- Duration: 60% of original
- Probability: 90%

### 8.11 Low-Approval Penalties
| Approval | Order Pressure | Approval Pressure | Duration |
|----------|---------------|-------------------|----------|
| < 40 | -2.2 | -1.4 | 8 turns |
| < 30 | -3.4 | -2.2 | 10 turns |

### 8.12 Fiscal Processing
Tax and spending deviations from baseline (see Section 16).

### 8.13 Policy Processing
Immigration, trade, environment, healthcare, education, welfare (see Section 17).

### 8.14 Mean Reversion
All metrics drift toward contextual equilibrium (see Section 10).

### 8.15 Approval Derivation
Weighted formula calculated from component metrics.

### 8.16 News & Briefing
Background news generated, executive briefing assembled with cabinet contributions.

---

## 9. Interaction Network

Hard-coded weighted edges defining how metric changes propagate:

| Source | → Target (weight) |
|--------|-------------------|
| economy | employment(0.35), approval(0.25), order(0.2), trade(0.2), inflation(-0.25) |
| inflation | approval(-0.28), economy(-0.24), order(-0.2) |
| public_order | approval(0.3), economy(0.18), crime(-0.25) |
| health | approval(0.2), economy(0.15), order(0.12) |
| foreign_relations | trade(0.3), approval(0.18), military(-0.2) |
| military | economy(-0.25), foreign_relations(-0.3), order(0.18) |
| environment | health(0.25), economy(-0.12) |
| equality | order(0.2), approval(0.15) |
| trade | economy(0.25), foreign_relations(0.2) |
| energy | economy(0.2), environment(-0.22) |
| corruption | approval(-0.28), order(-0.18) |

### Propagation

Two layers:
- **Layer 1**: 55-80% strength (scaled by system stress: `0.55 + stress × 0.25`)
- **Layer 2**: 25-40% strength (`0.25 + stress × 0.15`)

Each edge applies:
```
nonlinear = 0.25 + tanh(magnitude / 3) × 0.55
sensitivity = getDynamicSensitivity(target, targetValue, delta, stress)
impact = sign × magnitude × nonlinear × attenuation × sensitivity
```

Impacts below 0.05 are discarded.

**Implementation Note**: The interaction network applies in two places:
1. During effect processing (`deriveSecondaryImpacts` function)
2. During turn advancement (`propagateNetworkEffects` function)

Both use the same edge weights but different attenuation factors based on system stress.

---

## 10. Equilibrium & Mean Reversion

### 10.1 Contextual Equilibrium

Each metric's equilibrium is computed from neighboring metric values:

| Metric | Equilibrium Formula | Range |
|--------|-------------------|-------|
| economy | `45 + trade×0.18 + energy×0.12 - inflation×0.2` | 30-75 |
| public_order | `40 + approval×0.2 + equality×0.15 - corruption×0.25` | 25-70 |
| health | `45 + economy×0.15 + env_boost - corruption×0.12` | 30-80 |
| foreign_relations | `40 + trade×0.25 - military×0.15` | 25-75 |
| environment | `45 + energy×0.12 - economy×0.1` | 25-75 |
| equality | `42 + health×0.15 - corruption×0.15` | 25-75 |
| employment | `40 + economy×0.25 - inflation×0.12` | 30-80 |
| innovation | `40 + economy×0.18 + education_boost` | 25-80 |
| trade | `38 + foreign_relations×0.3` | 25-80 |
| Inverse metrics | `35` | — |
| All others | `50` | — |

Where `env_boost = (environment - 50) × 0.1` and `education_boost = (education - 50) × 0.2`.

### 10.2 Mean Reversion Formula

```
distance = equilibrium - currentValue
basePull = 0.04 + systemStress × 0.05
pullStrength = basePull × (1 - volatility)
nonlinearPull = tanh(distance / 12) × 2.2
reversionDelta = nonlinearPull × pullStrength
```

Approval is excluded from mean reversion (it is purely derived).

---

## 11. Feedback Loops

Configured in `game_config.json`. Activate when trigger metric crosses threshold.

| ID | Type | Trigger | Effects | Decay |
|----|------|---------|---------|-------|
| corruption_spiral | reinforcing | corruption > 60 | economy -0.5/turn, approval -0.3, democracy -0.2 | 10% |
| prosperity_dividend | reinforcing | economy > 70 | innovation +0.3, education +0.2 | 5% |
| liberty_pressure_valve | balancing | liberty < 30 | public_order -0.4, unrest +1.5 | 8% |
| approval_crisis | reinforcing | approval < 30 | public_order -0.6, economy -0.4 | 10% |
| crime_spiral | reinforcing | crime > 65 | economy -0.4, housing -0.3 | 10% |
| bubble_growth | reinforcing | economy > 75 | economic_bubble +2.0 | 2% |

Loops deactivate when the trigger condition is no longer met.

---

## 12. Hidden Variables

### Accumulators

| Variable | Condition | Delta/Turn |
|----------|-----------|-----------|
| unrest | liberty < 35 | +1.5 |
| unrest | equality < 30 | +1.2 |
| unrest | employment < 40 | +1.0 |
| unrest | approval < 35 | +0.8 |
| economic_bubble | economy > 75 for 3 turns | +2.5 |
| economic_bubble | inflation < 20 | +1.0 |
| foreign_influence | sovereignty < 50 | +1.5 |
| foreign_influence | foreign_relations < 30 (adversary) | +2.0 |

### Decay Rates

| Variable | Decay/Turn |
|----------|-----------|
| unrest | 5% |
| economic_bubble | 2% |
| foreign_influence | 3% |

When a hidden variable crosses its trigger threshold, the corresponding scenario is queued and the variable resets to baseline.

---

## 13. Outcome Variance

Configured in `game_config.json → outcome_variance`:

### Base Configuration

```json
{
  "baseVariance": 0.17,
  "modifiers": [
    { "condition": "bureaucracy_high", "varianceMultiplier": 1.5 },
    { "condition": "corruption_high", "varianceMultiplier": 1.3 },
    { "condition": "cabinet_competent", "varianceMultiplier": 0.7 },
    { "condition": "crisis_active", "varianceMultiplier": 1.4 }
  ],
  "criticalOutcomes": [
    { "probability": 0.05, "type": "critical_success", "effectMultiplier": 1.75 },
    { "probability": 0.05, "type": "critical_failure", "effectMultiplier": -1.5 }
  ]
}
```

### Variance Sources in Scoring

| Source | Mechanism |
|--------|-----------|
| Effect jitter | ±17% base + micro ±5.5% + anti-round + anti-five |
| Pressure duration | Random 7-20 turns |
| Heavy tail | 12-20% chance of Pareto extreme (up to 3.6x) |
| Context multipliers | 0.85x - 1.3x based on metric state |
| Momentum | 1.0x - 1.25x based on trend |
| Synergy | 1.0x - 1.25x based on multi-metric failure |
| System stress | Amplifies negative sensitivity up to +45% |
| Volatility | Computed from recent history, dampens mean reversion |
| Cabinet probabilistic | Success/failure roll per stat level per turn |
| Consequence probability | Default 70%, modified by option definition |
| Lagged echo | 90% probability, 2-5 turn delay |

### Country Gameplay Modifiers

Per-country sensitivity overrides and unique mechanics:

**USA:**
- Military sensitivity: 0.8x, Economy: 1.0x, Liberty: 1.2x
- Congressional Gridlock: 20% chance of 0.7x policy effectiveness

**China:**
- Liberty sensitivity: 0.5x, Economy: 1.2x, Public Order: 1.3x
- State Control: Reduced liberty volatility, enhanced economic control

---

## 14. Cabinet System

### 14.1 Cabinet Roles

Defined per-country. Standard US cabinet (14 roles):

| Role ID | Title | Category | Order |
|---------|-------|----------|-------|
| role_vice_president | Vice President | Executive | 0 |
| role_secretary_of_state | Secretary of State | Diplomacy | 1 |
| role_secretary_of_defense | Secretary of Defense | Defense | 2 |
| role_secretary_of_treasury | Secretary of the Treasury | Economy | 3 |
| role_attorney_general | Attorney General | Justice | 4 |
| role_secretary_of_commerce | Secretary of Commerce | Economy | 5 |
| role_secretary_of_labor | Secretary of Labor | Economy | 6 |
| role_secretary_of_hhs | Secretary of HHS | Health | 7 |
| role_secretary_of_transportation | Secretary of Transportation | Infrastructure | 8 |
| role_secretary_of_energy | Secretary of Energy | Economy | 9 |
| role_secretary_of_education | Secretary of Education | Education | 10 |
| role_secretary_of_homeland_security | Secretary of Homeland Security | Security | 11 |
| role_secretary_of_interior | Secretary of the Interior | Environment | 12 |

### 14.2 Role → Metric Mapping (Passive Impacts)

| Role | Metric | Stat |
|------|--------|------|
| vice_president | approval, public_order | management, integrity |
| secretary_of_state | foreign_relations | diplomacy |
| secretary_of_treasury | economy | economics |
| secretary_of_defense | military | military |
| secretary_of_homeland_security | public_order | management |
| attorney_general | public_order | integrity |
| secretary_of_commerce | economy | economics |
| secretary_of_labor | economy, equality | economics, compassion |
| secretary_of_health | health | compassion |
| secretary_of_education | equality | compassion |
| secretary_of_energy | economy, environment | economics, management |
| secretary_of_interior | environment | compassion |

### 14.3 Cabinet Modifier Formula

```
multiplier = minMultiplier + ((stat - baseline) / scalingFactor) × (maxMultiplier - minMultiplier)
```

From `game_config.json`:

| Role | Stat | Baseline | Scaling | Min | Max |
|------|------|----------|---------|-----|-----|
| treasury | economics | 50 | 200 | 0.85 | 1.15 |
| defense | military | 50 | 200 | 0.85 | 1.15 |
| state | diplomacy | 50 | 200 | 0.85 | 1.15 |
| hhs | compassion | 50 | 200 | 0.85 | 1.15 |
| attorney_general | integrity | 50 | 200 | 0.85 | 1.15 |

### 14.4 Risk Factors

| Role | Incompetence Threshold | Scandal Prob/Turn | Blunder Multiplier |
|------|----------------------|------------------|--------------------|
| treasury | 35 | 2.0% | 1.5x |
| defense | 35 | 1.5% | 1.8x |
| state | 35 | 2.0% | 1.4x |
| hhs | 35 | 2.0% | 1.3x |
| attorney_general | 35 | 2.5% | 1.6x |

### 14.5 Candidate Stats

Each candidate has 6 stats (0-100):

| Stat | Description |
|------|-------------|
| integrity | Ethical conduct and institutional transparency |
| diplomacy | International negotiation and alliance building |
| economics | Fiscal policy and macroeconomic management |
| military | Strategic defense and national security |
| management | Administrative efficiency and organizational leadership |
| compassion | Social welfare and humanitarian concern |

### 14.6 Advisor Feedback System

Cabinet advisors provide feedback on scenario options based on their role's priorities and the option's metric effects. Feedback is generated rule-based during scenario creation.

#### Feedback Structure

Each option includes `advisorFeedback` array with feedback from all 13 cabinet roles:

```typescript
advisorFeedback: [
  {
    roleId: "role_secretary_of_state",
    stance: "support" | "oppose" | "neutral",
    feedback: "As Secretary of State, I strongly support this diplomatic initiative..."
  }
]
```

#### Stance Calculation

Stance is determined by analyzing option effects against role priorities:

1. **Support**: Option effects align with ≥70% of role's primary metrics
2. **Oppose**: Option effects harm ≥70% of role's primary metrics  
3. **Neutral**: Mixed or minimal impact on role's metrics

#### Role Priorities

| Role | Primary Metrics | Secondary Metrics |
|------|----------------|-------------------|
| vice_president | approval, public_order | - |
| secretary_of_state | foreign_relations | - |
| secretary_of_defense | military | public_order |
| secretary_of_treasury | economy | - |
| attorney_general | public_order | liberty |
| secretary_of_commerce | economy, trade | - |
| secretary_of_labor | employment, equality | economy |
| secretary_of_hhs | health | equality |
| secretary_of_education | education | equality |
| secretary_of_energy | energy | economy, environment |
| secretary_of_transportation | infrastructure | economy |
| secretary_of_homeland_security | public_order | military |
| secretary_of_interior | environment | - |

#### Feedback Templates

Feedback uses contextual templates based on stance and effect magnitude:

- **Support**: Emphasizes benefits to role's domain
- **Oppose**: Highlights risks and negative consequences  
- **Neutral**: Acknowledges trade-offs and balanced impacts

---

## 15. Diplomatic System

### 15.1 Relationship Scale

Range: -100 to +100

| Range | Alignment |
|-------|-----------|
| 75+ | Ally |
| 50-74 | Friendly |
| 25-49 | Neutral |
| 0-24 | Neutral |
| -25 to -1 | Competing |
| -50 to -26 | Adversarial |
| < -50 | Hostile |

### 15.2 Spillover Effects

- **Positive relationship change** → 25% propagation to target's allies
- **Negative relationship change** → 40% propagation to target's allies
- **Economic warfare penalties**: GDP damage = 2x, trade = 1.5x, energy = 1x

### 15.3 Population Impact

Casualties and displacement create:
- Diplomatic penalty: `-20 - (casualtyRate × 200)` for casualties
- Displacement penalty: `-5 - (displacementRate × 50)`
- Order pressure: `-(displacementImpact / population) × 50`
- Approval pressure: `-(casualties / population) × 65`

---

## 16. Fiscal System

Baseline values:
- Income Tax: 25%
- Corporate Tax: 15%
- Military Spending: 20%
- Infrastructure Spending: 20%
- Social Spending: 30%

### Per-Point Deviation Effects (per turn, with jitter)

| Setting | Metric | Effect/pt |
|---------|--------|-----------|
| Income Tax ↑ | approval | -0.048 |
| Income Tax ↑ | economy | -0.032 |
| Corporate Tax ↑ | economy | -0.05 |
| Military Spending ↑ | military | +0.072 |
| Military Spending ↑ | economy | -0.036 |
| Infrastructure ↑ | infrastructure | +0.07 |
| Infrastructure ↑ | economy | +0.04 |
| Social Spending ↑ | approval | +0.05 |
| Social Spending ↑ | health | +0.03 |
| Social Spending ↑ | equality | +0.02 |
| Social Spending ↑ | economy | -0.02 |

---

## 17. Policy Settings

All baseline 50. Deviations create per-turn effects (per point, with jitter):

| Policy | Metric | Effect/pt |
|--------|--------|-----------|
| Immigration ↑ | economy | +0.02 |
| Immigration ↑ | foreign_relations | +0.015 |
| Immigration ↑ | public_order | -0.01 |
| Trade Openness ↑ | economy | +0.03 |
| Trade Openness ↑ | foreign_relations | +0.024 |
| Environmental Protection ↑ | environment | +0.03 |
| Environmental Protection ↑ | economy | -0.015 |
| Healthcare Access ↑ | health | +0.02 |
| Healthcare Access ↑ | approval | +0.015 |
| Healthcare Access ↑ | economy | -0.01 |
| Education Funding ↑ | economy | +0.012 |
| Education Funding ↑ | equality | +0.016 |
| Education Funding ↑ | economy (cost) | -0.0064 |
| Social Welfare ↑ | approval | +0.015 |
| Social Welfare ↑ | equality | +0.025 |
| Social Welfare ↑ | economy | -0.012 |

---

## 18. Crisis System

Crises are activated when hidden variables reach trigger thresholds or via the event queue.

### Crisis Lifecycle
1. **Detection**: `checkForNewCrises()` evaluates trigger conditions
2. **Activation**: `activateCrisis()` creates active crisis with per-turn effects
3. **Processing**: `processActiveCrises()` applies effects each turn
4. **Resolution**: Crisis ends when conditions improve or scenario resolves it

Crises generate active effects that stack on the pressure system.

---

## 19. Retaliation Engine

Handles probabilistic retaliation from countries affected by player actions.

### Configuration (from Firebase `world_state/retaliation_config`)

- **Action types**: military_strike, special_ops, covert_ops, embargo
- **Base probabilities**: Per action type, modified by severity
- **Allied response**: Allies join retaliation under configurable conditions
- **Escalation**: Repeated actions increase response probability via multipliers
- **Severity impacts**: Effect magnitude varies by military action type

Falls back to hardcoded defaults if Firebase unavailable.

---

## 20. Candidate Generation

### 20.1 Data Sources (from Firebase `world_state/backstory_pool`)

- **Career paths**: 15+ paths (activist, business_tycoon, general, diplomat, etc.) with stat bonuses
- **Professional role variants**: Per-stat pools (military, diplomacy, economics, integrity, compassion, management)
- **Analysis templates**: Stat-conditional descriptive text
- **Stat commitment descriptions**: Per-stat governance focus text
- **Skills**: Specialized abilities with stat bonuses
- **Degree types**: Academic backgrounds with field specialties

### 20.2 Additional Data Sources

- **Traits** (`world_state/traits_pool`): 280+ traits with stat bonuses and icons
- **Universities** (`world_state/university_pool`): Region-grouped institutions with prestige scores
- **Names** (`world_state/names`): Region-specific first/last name pools (male/female/non-binary)
- **Parties** (`world_state/parties_pool`): Country-specific and generic political parties

### 20.3 Bio Generation

Candidates get procedurally generated bios using:
1. Honorific (distinguished, seasoned, prominent, respected, notable)
2. Education background (degree type + university + field)
3. Trait description
4. Skill expertise
5. Party affiliation and political tendency
6. Stat-based commitment focus

---

## 21. Data Architecture

### 21.1 Firebase Collections

| Collection | Document | Description |
|-----------|----------|-------------|
| `world_state` | `locales` | 50 playable nations and cabinet roles |
| `world_state` | `metrics` | 27 metric definitions |
| `world_state` | `game_config` | Balance config, feedback loops, curves, cabinet modifiers |
| `world_state` | `traits_pool` | 280+ candidate traits |
| `world_state` | `university_pool` | Universities by region |
| `world_state` | `backstory_pool` | Career paths, skills, degrees |
| `world_state` | `names` | Region-specific name pools |
| `world_state` | `parties_pool` | Political parties |
| `world_state` | `events` | Global events |
| `world_state` | `strengths_pool` | Leader/country strength narratives |
| `world_state` | `weaknesses_pool` | Leader/country weakness narratives |
| `world_state` | `strategic_insights_pool` | Opportunity/risk insights |
| `world_state` | `retaliation_config` | Retaliation engine parameters |
| `world_state` | `god_mode_config` | Debug commands |
| `world_state` | `education_pool` | Education backgrounds |
| `world_state` | `human_stats` | Stat definitions |
| `world_state` | `background_mappings` | Background mappings |
| `world_state` | `global` | Global settings |
| `library` | `bundle_*` | 14 scenario bundles (380+ scenarios) |
| `templates` | `core_templates` | Scenario text templates |
| `templates` | `retaliation_templates` | Retaliation response templates |

### 21.2 Caching Strategy

1. **Memory cache**: In-memory Map/object per service (session lifetime)
2. **localStorage**: Key-versioned storage (`scenario_bundles_v1`, etc.)
3. **Firebase Firestore**: Source of truth
4. **Fallback**: Empty arrays / hardcoded defaults

### 21.3 Seed Data

All Firebase data is seeded from `web/firebase_migration/`:
- `library/` → 14 scenario bundle JSON files
- `templates/` → Core and retaliation template files
- `world_state/` → All world state document JSON files

---

## 22. State Management

### 22.1 Zustand Store

Core state managed via `gameStore.ts`:

| State | Type | Description |
|-------|------|-------------|
| gameState | GameState | Master game state |
| currentScenario | Scenario | Active decision |
| godMode | boolean | Debug mode |
| dickMode | boolean | Authoritarian mode |
| aiScenarioQueue | AIScenarioQueue | Generated scenarios |
| turnHistory | GameState[] | Dev snapshots |
| scoreDisplayFormat | string | UI preference |

### 22.2 Persistence

- **Save/Load**: localStorage with multiple named save slots
- **Auto-save**: On turn advance
- **Turn history**: Snapshots for dev mode time travel

---

## 23. Special Modes

### 23.1 God Mode
Debug overlay enabling direct metric manipulation, turn skipping, scenario forcing, and metric locking.

### 23.2 Dick Mode
Authoritarian governance mode: unlocks `bundle_dick_mode` scenarios, modifies moral weight calculations, biases toward authoritarian options.

### 23.3 Trust Your Gut (AI Scenario Generation)

AI-powered scenario generation system that creates custom scenarios based on player commands.

**Architecture:**
- **API Endpoint**: `/api/ai/generate-scenario`
- **Primary Model**: Moonshot API (temperature 0.7)
- **Fallback**: Local model inference
- **Queue System**: `aiScenarioQueue` in gameStore maintains ready scenarios

**Generation Modes:**
1. **Command-Based Generation**: `generateScenarioChainFromCommand(context, playerCommand)`
   - Player provides natural language command (e.g., "impose sanctions on China")
   - AI generates contextual scenario with 3 options and realistic effects
   - Atrocity detection prevents rewards for mass violence commands

2. **Context-Based Generation**: `generateScenarioChain(context)`
   - AI generates scenarios based on current game state
   - Considers metrics, relationships, active crises, and historical decisions

**Political Capital Integration:**
- Scenarios generated from player commands check for atrocity keywords
- If mass violence detected, political capital rewards are withheld
- Detection phrases: "genocide", "ethnic cleansing", "carpet bomb", "nuke", etc.

**Queue Management:**
- AI generates scenarios in background during gameplay
- Ready chains stored in `aiScenarioQueue.readyChains`
- Scenarios consumed on-demand by ScenarioNavigator (Tier 1 priority)
- Auto-generates next scenario chain after consumption

### 23.4 Atrocity Detection
Hard-coded phrase detection prevents political capital rewards for mass violence commands:
- Kill phrases: genocide, ethnic cleansing, carpet bomb, nuke, etc.
- Mass target terms: civilians, population centers, entire country, etc.

---

## System Stress Formula

```
stressFactors = [
  (100 - economy) / 100,
  (100 - public_order) / 100,
  (100 - health) / 100,
  (100 - foreign_relations) / 100,
  (100 - approval) / 100,
  corruption / 100,
  inflation / 100,
  crime / 100
]
systemStress = clamp(average(stressFactors), 0, 1.0)
```

Used to amplify negative effects, increase network propagation strength, and scale mean reversion pull.

---

## Inertia Effects

Rapid metric changes (> 15 points) incur penalties:
- Approval delta: -2.0
- Effectiveness multiplier: 0.8x
- Bureaucracy delta: +3.0
