import type { MetricId } from './data/schemas/metricIds';
import type { BundleId } from './data/schemas/bundleIds';
import type { RegionId } from './data/schemas/regions';
import type { GeopoliticalTag } from './data/schemas/geopoliticalTags';

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
    applicable_countries?: string[] | string;
    source?: 'news' | 'manual';
    source_news?: {
        headline: string;
        url: string;
        date: string;
    };
    mode_availability?: string[];
    auditMetadata?: {
        lastAudited: string;
        score: number;
        issues: string[];
        autoFixed?: boolean;
    };
    // Geopolitical realism extensions
    requiredGeopoliticalTags?: GeopoliticalTag[];
    excludedGeopoliticalTags?: GeopoliticalTag[];
    requiredGovernmentCategories?: GovernmentCategory[];
    excludedGovernmentCategories?: GovernmentCategory[];
    regionalBoost?: Partial<Record<RegionId, number>>;
    isNeighborEvent?: boolean;
    involvedCountries?: string[];
}

export interface ScenarioCondition {
    metricId: string;
    min?: number;
    max?: number;
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
}

export interface Option {
    id: string;
    text: string;
    label?: string;
    effects: OptionEffect[];
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
