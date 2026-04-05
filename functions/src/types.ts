import type { MetricId } from './data/schemas/metricIds';
import type { BundleId } from './data/schemas/bundleIds';
import type { RegionId } from './data/schemas/regions';
import type { GeopoliticalTag } from './data/schemas/geopoliticalTags';
import type { CanonicalBranchType } from './data/schemas/canonicalBranchTypes';
import type { CapabilityId } from './data/schemas/capabilityIds';
import type { CountryTrait, PersonTrait } from './data/schemas/traitTypes';
import type { LegislatureProfile, LegislatureState, PersonGender } from './data/schemas/legislatureTypes';

export type ScenarioScopeTier = 'universal' | 'regional' | 'cluster' | 'exclusive';

export type ScenarioSourceKind = 'evergreen' | 'news' | 'neighbor' | 'consequence';

export type ScenarioExclusivityReason =
    | 'constitution'
    | 'historical'
    | 'bilateral_dispute'
    | 'unique_institution'
    | 'unique_military_doctrine';

export interface CountryCatalogSourceMetadataSnapshot {
    kind: 'firestore';
    path: 'countries';
}

export interface ScenarioAcceptanceMetadata {
    policyVersion: string;
    acceptedAt: string;
    scopeTier: ScenarioScopeTier;
    scopeKey: string;
    sourceKind: ScenarioSourceKind;
    modelFamily: string;
    countrySource: CountryCatalogSourceMetadataSnapshot;
}

export type GovernmentCategory =
    | 'liberal_democracy'
    | 'illiberal_democracy'
    | 'hybrid_regime'
    | 'authoritarian'
    | 'totalitarian'
    | 'theocracy'
    | 'constitutional_monarchy'
    | 'absolute_monarchy';

export interface CountryRelationship {
    countryId: string;
    type: 'formal_ally' | 'strategic_partner' | 'neutral' | 'rival' | 'adversary' | 'conflict';
    strength: number; // -100 to 100
    treaty?: string;
    sharedBorder: boolean;
}

export interface GeopoliticalProfile {
    neighbors: CountryRelationship[];
    allies: CountryRelationship[];
    adversaries: CountryRelationship[];
    tags: GeopoliticalTag[];
    governmentCategory: GovernmentCategory;
    regimeStability: number; // 0–100
}

export interface CountryGameplayProfile {
    startingMetrics: Partial<Record<MetricId, number>>;
    metricEquilibria: Partial<Record<MetricId, number>>;
    bundleWeightOverrides: Partial<Record<BundleId, number>>;
    priorityTags: string[];
    suppressedTags: string[];
    neighborEventChance: number;
}

export interface ScenarioMetadata {
    bundle?: BundleId | string;
    severity?: 'low' | 'medium' | 'high' | 'critical' | string;
    urgency?: 'low' | 'medium' | 'high' | 'immediate' | string;
    difficulty?: 1 | 2 | 3 | 4 | 5;
    tags?: string[];
    actorPattern?: 'domestic' | 'ally' | 'adversary' | 'border_rival' | 'legislature' | 'cabinet' | 'judiciary' | 'mixed';
    theme?: string;
    scopeTier?: ScenarioScopeTier;
    scopeKey?: string;
    clusterId?: string;
    exclusivityReason?: ScenarioExclusivityReason;
    sourceKind?: ScenarioSourceKind;
    region_tags?: RegionId[] | string[];
    applicable_countries?: string[] | string;
    source_news?: {
        headline: string;
        url: string;
        date: string;
    };
    auditMetadata?: {
        lastAudited: string;
        score: number;
        issues: string[];
        autoFixed?: boolean;
    };
    generationProvenance?: {
        jobId: string;
        executionTarget: string;
        modelUsed: string;
        generatedAt: string;
    };
    acceptanceMetadata?: ScenarioAcceptanceMetadata;
    // Geopolitical realism extensions
    requiredGeopoliticalTags?: GeopoliticalTag[];
    excludedGeopoliticalTags?: GeopoliticalTag[];
    requiredGovernmentCategories?: GovernmentCategory[];
    excludedGovernmentCategories?: GovernmentCategory[];
    regionalBoost?: Partial<Record<RegionId, number>>;
    isNeighborEvent?: boolean;
    involvedCountries?: string[];
    // Explicit structural preconditions (preferred over implicit token-graph analysis)
    requires?: ScenarioRequirements;
    tagResolution?: TagResolutionMetadata;
}

export type TagResolutionMethod = 'deterministic' | 'llm' | 'manual';
export type TagResolutionStatus = 'unresolved' | 'resolved' | 'manual';

export interface TagResolutionMetadata {
    status: TagResolutionStatus;
    method?: TagResolutionMethod;
    resolverVersion?: number;
    resolvedAt?: string;
    resolvedTags?: string[];
    confidence?: number;
}

export interface ScenarioCondition {
    metricId: string;
    min?: number;
    max?: number;
}

// Role identifiers used for relationship targeting (eligibility, effects, conditions)
export type RelationshipRoleId =
    | 'border_rival'
    | 'adversary'
    | 'ally'
    | 'trade_partner'
    | 'partner'
    | 'rival'
    | 'regional_rival'
    | 'neutral'
    | 'neighbor'
    | 'nation';

// Applied after an option is chosen — mutates the resolved relationship's strength
export interface RelationshipEffect {
    relationshipId: RelationshipRoleId;
    delta: number;        // applied to relationship.strength; clamped to [-100, 100]
    probability?: number; // default 1.0
}

// Explicit structural preconditions a country must satisfy for a scenario to be eligible
export interface ScenarioRequirements {
    land_border_adversary?: boolean;
    formal_ally?: boolean;
    adversary?: boolean;
    trade_partner?: boolean;
    nuclear_state?: boolean;
    island_nation?: boolean;
    landlocked?: boolean;
    coastal?: boolean;
    min_power_tier?: 'superpower' | 'great_power' | 'regional_power' | 'middle_power' | 'small_state';
    // Military capability gates
    cyber_capable?: boolean;       // military.cyber.offensive > 50
    power_projection?: boolean;    // military.doctrine === 'power_projection'
    large_military?: boolean;      // aggregate branch size above threshold
    // Regime and stability gates
    authoritarian_regime?: boolean; // geopolitical.governmentCategory in ['authoritarian','totalitarian','absolute_monarchy']
    democratic_regime?: boolean;    // geopolitical.governmentCategory in ['liberal_democracy','constitutional_monarchy']
    fragile_state?: boolean;        // geopolitical.regimeStability < 35
}

export interface Scenario {
    id: string;
    title: string;
    description: string;
    options: Option[];
    phase?: 'root' | 'mid' | 'final';
    actIndex?: number;
    metadata?: ScenarioMetadata;
    conditions?: ScenarioCondition[];
    legislature_requirement?: {
        min_approval: number;
        chamber?: 'upper' | 'lower' | 'both';
    };
}

export interface AdvisorFeedback {
    roleId: string;
    stance: 'support' | 'oppose' | 'neutral' | 'concerned';
    feedback: string;
    statThreshold?: {
        stat: string;
        minValue: number;
    };
}

export interface OptionEffect {
    targetMetricId: string;
    value: number;
    duration: number;
    probability: number;
    type?: 'delta' | 'absolute';
    scope?: 'domestic' | 'foreign' | 'regional' | 'global';
    target_country_id?: string;
    target_branch_type?: CanonicalBranchType;
    population_impact?: {
        casualties_thousands: number;
        displaced_thousands: number;
        civilian_ratio: number; // 0-1
    };
    environmental_impact?: {
        radiation: boolean;
        contamination_duration: number;
        affected_metrics: MetricId[];
    };
}

export type SettingTarget =
    | 'fiscal.taxIncome'
    | 'fiscal.taxCorporate'
    | 'fiscal.spendingMilitary'
    | 'fiscal.spendingInfrastructure'
    | 'fiscal.spendingSocial'
    | 'policy.economicStance'
    | 'policy.socialSpending'
    | 'policy.defenseSpending'
    | 'policy.environmentalPolicy'
    | 'policy.tradeOpenness'
    | 'policy.immigration'
    | 'policy.environmentalProtection'
    | 'policy.healthcareAccess'
    | 'policy.educationFunding'
    | 'policy.socialWelfare';

export const VALID_SETTING_TARGETS: readonly SettingTarget[] = [
    'fiscal.taxIncome', 'fiscal.taxCorporate',
    'fiscal.spendingMilitary', 'fiscal.spendingInfrastructure', 'fiscal.spendingSocial',
    'policy.economicStance', 'policy.socialSpending', 'policy.defenseSpending',
    'policy.environmentalPolicy', 'policy.tradeOpenness', 'policy.immigration',
    'policy.environmentalProtection', 'policy.healthcareAccess',
    'policy.educationFunding', 'policy.socialWelfare',
] as const;

export interface PolicyImplication {
    target: SettingTarget;
    delta: number;
}

export interface Option {
    id: string;
    text: string;
    label?: string;
    effects: OptionEffect[];
    policyImplications?: PolicyImplication[];
    relationshipEffects?: RelationshipEffect[];
    advisorFeedback?: AdvisorFeedback[];
    outcomeHeadline?: string;
    outcomeSummary?: string;
    outcomeContext?: string;
}

export interface NewsItem {
    title: string;
    link: string;
    snippet?: string;
    source: string;
    pubDate: string;
}

// ── Military Model ──────────────────────────────────────────────────────────

export interface MilitaryBranch {
    canonical_type: CanonicalBranchType;
    local_name: string;           // "British Army", "People's Liberation Army", etc.
    token_key: string;            // which token this branch maps to: "ground_forces_branch", "maritime_branch", etc.
    readiness: number;            // 0–100
    size: number;                 // personnel in thousands
    equipment_level: number;      // 0–100
    founded_year?: number;
}

export interface MilitaryCapabilityEntry {
    id: CapabilityId;
    operational: boolean;
    count?: number;
    quality: number; // 0-100
}

export interface BranchStats {
    readiness: number; // 0-100
    size: 'token' | 'small' | 'medium' | 'large' | 'massive';
    equipment: 'obsolete' | 'cold_war' | 'modern' | 'advanced' | 'cutting_edge';
    budget_share: number; // 0-1
    capabilities: MilitaryCapabilityEntry[];
}

export interface NuclearProfile {
    warhead_count: number;
    delivery_systems: ('icbm' | 'slbm' | 'air_launched')[];
    triad: boolean;
    doctrine: 'no_first_use' | 'ambiguous' | 'launch_on_warning';
    tactical_weapons: boolean;
}

export interface CyberProfile {
    offensive: number; // 0-100
    defensive: number; // 0-100
    apt_capability: boolean;
    infrastructure_targeting: boolean;
}

export interface MilitaryProfile {
    doctrine: 'defensive' | 'deterrent' | 'power_projection' | 'guerrilla' | 'hybrid';
    overall_readiness: number; // 0-100, aggregate used as metric_military baseline
    nuclear: NuclearProfile | null;
    cyber: CyberProfile;
    branches: MilitaryBranch[];
}

// ── Population & Economy Live State ─────────────────────────────────────────

export interface PopulationStats {
    total_millions: number;
    demographics: {
        median_age: number;
        urban_pct: number;
        youth_pct: number;
        working_age_pct: number;
    };
}

export interface EconomyProfile {
    gdp_billions: number;
    gdp_per_capita: number;
    system: 'market' | 'mixed' | 'state-directed' | 'command';
    primary_export: string;
    primary_import: string;
    trade_dependencies: string[];
}

export interface CountryFactsDemographics {
    population_total: number;
    source_year: number;
}

export interface CountryFactsEconomy {
    gdp_nominal_usd: number;
    source_year: number;
    currency_name?: string;
    currency_code?: string;
    central_bank?: string;
    primary_export?: string;
    primary_import?: string;
    major_industry?: string;
}

export interface CountryFactsExecutive {
    leader_title?: string;
    head_of_state_title?: string;
    vice_leader_title?: string;
}

export interface CountryFactsLegislature {
    legislature?: string;
    lower_house?: string | null;
    upper_house?: string | null;
}

export interface CountryFactsOfficeTitles {
    executive_role?: string | null;
    finance_role?: string | null;
    defense_role?: string | null;
    foreign_affairs_role?: string | null;
    justice_role?: string | null;
    health_role?: string | null;
    education_role?: string | null;
    commerce_role?: string | null;
    labor_role?: string | null;
    energy_role?: string | null;
    environment_role?: string | null;
    transport_role?: string | null;
    interior_role?: string | null;
    agriculture_role?: string | null;
    legislature_speaker?: string | null;
    upper_house_leader?: string | null;
    judiciary_role?: string | null;
    chief_justice_role?: string | null;
    prosecutor_role?: string | null;
    military_chief_title?: string | null;
    capital_mayor_title?: string | null;
    provincial_leader_title?: string | null;
    regional_governor_title?: string | null;
    press_secretary_title?: string | null;
}

export interface CountryFactsGeography {
    capital_city?: string;
}

export interface CountryFacts {
    schema_version: 2;
    baseline_id: string;
    demographics: CountryFactsDemographics;
    economy: CountryFactsEconomy;
    institutions?: {
        executive?: CountryFactsExecutive;
        legislature?: CountryFactsLegislature;
        office_titles?: CountryFactsOfficeTitles;
    };
    geography?: CountryFactsGeography;
}

export interface CountryAmountValues {
    graft_amount: number | null;
    infrastructure_cost: number | null;
    aid_amount: number | null;
    trade_value: number | null;
    military_budget_amount: number | null;
    disaster_cost: number | null;
    sanctions_amount: number | null;
    currency_code: 'USD';
}

// ── Country (new top-level collection document) ───────────────────────────────

export interface CountryDocument {
    id: string;
    name: string;
    code: string; // 2-letter ISO
    region: RegionId;
    facts: CountryFacts;
    amounts?: CountryAmountValues;
    population?: PopulationStats;
    economy?: EconomyProfile;
    military: MilitaryProfile;
    geopolitical: GeopoliticalProfile;
    legislature: LegislatureProfile;
    legislature_initial_state: LegislatureState;
    tokens: Record<string, string | null>; // all ~80 tokens; optional = null
    gameplay: {
        starting_metrics: Partial<Record<MetricId, number>>;
        metric_equilibria: Partial<Record<MetricId, number>>;
        bundle_weight_overrides: Partial<Record<BundleId, number>>;
        priority_tags: string[];
        suppressed_tags: string[];
        neighbor_event_chance: number;
        term_turn_fraction: number; // default 1.0
        difficulty: 'low' | 'medium' | 'high' | 'expert';
        blitz_priority?: 'high' | 'medium' | 'low';
        // Scoring modifiers: how reactive each metric is for this country (0–2 multiplier, default 1.0)
        metric_sensitivities?: Partial<Record<MetricId, number>>;
        // Likelihood of crisis types specific to this country (0–1 probability weight)
        crisis_probabilities?: Partial<Record<string, number>>;
    };
    traits: CountryTrait[];
    description: string;
    cabinet_pool?: PersonProfile[]; // country-specific candidates
}

// ── Person / Cabinet ─────────────────────────────────────────────────────────

export type PersonGenderType = PersonGender;

export interface PersonStats {
    diplomacy: number; // 1-10
    economics: number; // 1-10
    military: number; // 1-10
    management: number; // 1-10
    compassion: number; // 1-10
    integrity: number; // 1-10
    charisma: number; // 1-10
    ideology: number; // 1-10 (1=progressive/dove, 10=conservative/hawk)
    corruption_risk: number; // 1-10
    crisis_rating: number; // 1-10
}

export interface PersonProfile {
    id: string;
    name: string;
    gender: PersonGender;
    age: number;
    region: string;
    country_id?: string;
    party?: string;
    background: string;
    education: string;
    institution?: string;
    years_experience: number;
    stats: PersonStats;
    traits: PersonTrait[];
    role_affinity: string[]; // role IDs this person is best suited for
    cost?: number;
}

// ── Political Parties ─────────────────────────────────────────────────────────

export interface PoliticalParty {
    id: string;                 // e.g. "usa_democratic", "uk_labour"
    countryId: string;          // parent country canonical ID
    name: string;               // e.g. "Democratic Party"
    shortName?: string;         // e.g. "Democrats"
    ideology: number;           // 1–10 (1=far left, 5=centre, 10=far right)
    foundingYear?: number;
    isRuling: boolean;
    isCoalitionMember: boolean; // true if in ruling coalition but not lead party
    currentLeader?: string;     // name of current party leader
    color?: string;             // hex color e.g. "#0047AB"
    keyPolicies: string[];      // 2–4 brief policy descriptors
    description: string;        // 1–2 sentence party background
    // Gameplay scoring data
    metricBiases?: Partial<Record<MetricId, number>>;  // -1 to +1: how strongly this party's base cares about each metric
    popularBase?: string[];                             // demographic groups: ["urban", "youth", "labor", "rural", "business", etc.]
    coalitionWillingness?: number;                      // 0–1: likelihood to cooperate with player; 1=fully supportive, 0=total opposition
}

// ── Universities ──────────────────────────────────────────────────────────────

export type UniversitySpecialization =
  | 'economics' | 'law' | 'medicine' | 'engineering' | 'military'
  | 'science' | 'humanities' | 'business' | 'public_policy'
  | 'international_relations' | 'agriculture' | 'technology';

export interface University {
    id: string;                  // e.g. "usa_harvard", "uk_oxford"
    name: string;                // display name
    countryId?: string;          // null for international/regional institutions
    region: string;              // see regions.ts
    prestige: number;            // 1–10 (10 = world-renowned)
    foundingYear?: number;
    specializations: UniversitySpecialization[];
    isNotable: boolean;          // top-30 global ranking equivalent
}

// ── Re-exports ────────────────────────────────────────────────────────────────

export type { CountryTrait, PersonTrait } from './data/schemas/traitTypes';
export type { LegislatureProfile, LegislatureState, LegislativeBloc, LegislativeMember, PersonGender } from './data/schemas/legislatureTypes';
export type { CapabilityId } from './data/schemas/capabilityIds';
export type { CanonicalBranchType } from './data/schemas/canonicalBranchTypes';
export type { SubLocale, SubLocaleType } from './data/schemas/subLocaleTypes';
export type { ProminentLegislativeRole } from './data/schemas/legislatureTypes';
