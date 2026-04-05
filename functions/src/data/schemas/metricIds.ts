export const METRIC_IDS = {
    APPROVAL: 'metric_approval',

    ECONOMY: 'metric_economy',
    PUBLIC_ORDER: 'metric_public_order',
    HEALTH: 'metric_health',
    EDUCATION: 'metric_education',
    INFRASTRUCTURE: 'metric_infrastructure',
    ENVIRONMENT: 'metric_environment',
    FOREIGN_RELATIONS: 'metric_foreign_relations',
    MILITARY: 'metric_military',
    LIBERTY: 'metric_liberty',
    EQUALITY: 'metric_equality',
    EMPLOYMENT: 'metric_employment',
    INNOVATION: 'metric_innovation',
    TRADE: 'metric_trade',
    ENERGY: 'metric_energy',
    HOUSING: 'metric_housing',
    DEMOCRACY: 'metric_democracy',
    SOVEREIGNTY: 'metric_sovereignty',
    IMMIGRATION: 'metric_immigration',

    CORRUPTION: 'metric_corruption',
    INFLATION: 'metric_inflation',
    CRIME: 'metric_crime',
    BUREAUCRACY: 'metric_bureaucracy',

    BUDGET: 'metric_budget',

    UNREST: 'metric_unrest',
    ECONOMIC_BUBBLE: 'metric_economic_bubble',
    FOREIGN_INFLUENCE: 'metric_foreign_influence',
} as const;

export type MetricId = (typeof METRIC_IDS)[keyof typeof METRIC_IDS];

export const ALL_METRIC_IDS: readonly MetricId[] = Object.values(METRIC_IDS);

export const CORE_METRIC_IDS: readonly MetricId[] = [
    METRIC_IDS.ECONOMY,
    METRIC_IDS.PUBLIC_ORDER,
    METRIC_IDS.HEALTH,
    METRIC_IDS.EDUCATION,
    METRIC_IDS.INFRASTRUCTURE,
    METRIC_IDS.ENVIRONMENT,
    METRIC_IDS.FOREIGN_RELATIONS,
    METRIC_IDS.MILITARY,
    METRIC_IDS.LIBERTY,
    METRIC_IDS.EQUALITY,
    METRIC_IDS.EMPLOYMENT,
    METRIC_IDS.INNOVATION,
    METRIC_IDS.TRADE,
    METRIC_IDS.ENERGY,
    METRIC_IDS.HOUSING,
    METRIC_IDS.DEMOCRACY,
    METRIC_IDS.SOVEREIGNTY,
    METRIC_IDS.IMMIGRATION,
];

export const INVERSE_METRIC_IDS: readonly MetricId[] = [
    METRIC_IDS.CORRUPTION,
    METRIC_IDS.INFLATION,
    METRIC_IDS.CRIME,
    METRIC_IDS.BUREAUCRACY,
];

export const HIDDEN_METRIC_IDS: readonly MetricId[] = [
    METRIC_IDS.UNREST,
    METRIC_IDS.ECONOMIC_BUBBLE,
    METRIC_IDS.FOREIGN_INFLUENCE,
];

export const FISCAL_METRIC_IDS: readonly MetricId[] = [METRIC_IDS.BUDGET];

export function isValidMetricId(id: string): id is MetricId {
    return Object.values(METRIC_IDS).includes(id as MetricId);
}

export function isCoreMetric(id: string): boolean {
    return CORE_METRIC_IDS.includes(id as MetricId);
}

export function isInverseMetric(id: string): boolean {
    return INVERSE_METRIC_IDS.includes(id as MetricId);
}

export function isHiddenMetric(id: string): boolean {
    return HIDDEN_METRIC_IDS.includes(id as MetricId);
}

export function normalizeMetricId(metricName: string): MetricId {
    if (metricName.startsWith('metric_')) {
        if (isValidMetricId(metricName)) {
            return metricName;
        }
    }

    const aliasMap: Record<string, MetricId> = {
        approval: METRIC_IDS.APPROVAL,
        public_approval: METRIC_IDS.APPROVAL,
        metric_public_approval: METRIC_IDS.APPROVAL,
        relations: METRIC_IDS.FOREIGN_RELATIONS,
        foreign_relations: METRIC_IDS.FOREIGN_RELATIONS,
        control: METRIC_IDS.PUBLIC_ORDER,
        public_order: METRIC_IDS.PUBLIC_ORDER,
        order: METRIC_IDS.PUBLIC_ORDER,
        economy: METRIC_IDS.ECONOMY,
        military: METRIC_IDS.MILITARY,
        health: METRIC_IDS.HEALTH,
        environment: METRIC_IDS.ENVIRONMENT,
        innovation: METRIC_IDS.INNOVATION,
        equality: METRIC_IDS.EQUALITY,
        liberty: METRIC_IDS.LIBERTY,
        infrastructure: METRIC_IDS.INFRASTRUCTURE,
        employment: METRIC_IDS.EMPLOYMENT,
        education: METRIC_IDS.EDUCATION,
        bureaucracy: METRIC_IDS.BUREAUCRACY,
        trade: METRIC_IDS.TRADE,
        inflation: METRIC_IDS.INFLATION,
        corruption: METRIC_IDS.CORRUPTION,
        energy: METRIC_IDS.ENERGY,
        housing: METRIC_IDS.HOUSING,
        crime: METRIC_IDS.CRIME,
        democracy: METRIC_IDS.DEMOCRACY,
        sovereignty: METRIC_IDS.SOVEREIGNTY,
        immigration: METRIC_IDS.IMMIGRATION,
        budget: METRIC_IDS.BUDGET,
        unrest: METRIC_IDS.UNREST,
        economic_bubble: METRIC_IDS.ECONOMIC_BUBBLE,
        foreign_influence: METRIC_IDS.FOREIGN_INFLUENCE,
        // Legacy metric aliases for Firebase migration compatibility
        metric_anti_corruption: METRIC_IDS.CORRUPTION, // Inverse mapping
        anti_corruption: METRIC_IDS.CORRUPTION, // Inverse mapping
        metric_civil_liberties: METRIC_IDS.LIBERTY,
        civil_liberties: METRIC_IDS.LIBERTY,
        metric_diplomacy: METRIC_IDS.FOREIGN_RELATIONS,
        diplomacy: METRIC_IDS.FOREIGN_RELATIONS,
        metric_environment_stability: METRIC_IDS.ENVIRONMENT,
        environment_stability: METRIC_IDS.ENVIRONMENT,
        metric_equity: METRIC_IDS.EQUALITY,
        equity: METRIC_IDS.EQUALITY,
        metric_freedom: METRIC_IDS.LIBERTY,
        freedom: METRIC_IDS.LIBERTY,
        metric_inequality: METRIC_IDS.EQUALITY, // Inverse mapping
        inequality: METRIC_IDS.EQUALITY, // Inverse mapping
        metric_politics: METRIC_IDS.DEMOCRACY,
        politics: METRIC_IDS.DEMOCRACY,
        metric_safety: METRIC_IDS.PUBLIC_ORDER,
        safety: METRIC_IDS.PUBLIC_ORDER,
        metric_science: METRIC_IDS.INNOVATION,
        science: METRIC_IDS.INNOVATION,
        metric_security: METRIC_IDS.MILITARY,
        security: METRIC_IDS.MILITARY,
        metric_social_cohesion: METRIC_IDS.PUBLIC_ORDER,
        social_cohesion: METRIC_IDS.PUBLIC_ORDER,
        metric_tech: METRIC_IDS.INNOVATION,
        tech: METRIC_IDS.INNOVATION,
        metric_tourism: METRIC_IDS.ECONOMY,
        tourism: METRIC_IDS.ECONOMY,
        metric_unemployment: METRIC_IDS.EMPLOYMENT, // Inverse mapping
        unemployment: METRIC_IDS.EMPLOYMENT, // Inverse mapping
        metric_water: METRIC_IDS.INFRASTRUCTURE,
        water: METRIC_IDS.INFRASTRUCTURE,
        // Bundle-name-derived aliases (LLMs often invent these from bundle names)
        metric_justice: METRIC_IDS.PUBLIC_ORDER,
        justice: METRIC_IDS.PUBLIC_ORDER,
        metric_culture: METRIC_IDS.EDUCATION,
        culture: METRIC_IDS.EDUCATION,
        metric_resources: METRIC_IDS.ENERGY,
        resources: METRIC_IDS.ENERGY,
        metric_social: METRIC_IDS.EQUALITY,
        social: METRIC_IDS.EQUALITY,
        metric_governance: METRIC_IDS.DEMOCRACY,
        governance: METRIC_IDS.DEMOCRACY,
        metric_defense: METRIC_IDS.MILITARY,
        defense: METRIC_IDS.MILITARY,
        metric_commerce: METRIC_IDS.TRADE,
        commerce: METRIC_IDS.TRADE,
        // Common LLM economic hallucinations
        metric_interest_rates: METRIC_IDS.ECONOMY,
        interest_rates: METRIC_IDS.ECONOMY,
        metric_gdp: METRIC_IDS.ECONOMY,
        gdp: METRIC_IDS.ECONOMY,
        metric_monetary_policy: METRIC_IDS.ECONOMY,
        monetary_policy: METRIC_IDS.ECONOMY,
        metric_financial_stability: METRIC_IDS.ECONOMY,
        financial_stability: METRIC_IDS.ECONOMY,
        metric_economic_growth: METRIC_IDS.ECONOMY,
        economic_growth: METRIC_IDS.ECONOMY,
        metric_debt: METRIC_IDS.BUDGET,
        debt: METRIC_IDS.BUDGET,
        metric_fiscal: METRIC_IDS.BUDGET,
        fiscal: METRIC_IDS.BUDGET,
        metric_taxation: METRIC_IDS.BUDGET,
        taxation: METRIC_IDS.BUDGET,
        metric_government_spending: METRIC_IDS.BUDGET,
        government_spending: METRIC_IDS.BUDGET,
        metric_wages: METRIC_IDS.EMPLOYMENT,
        wages: METRIC_IDS.EMPLOYMENT,
        metric_labor: METRIC_IDS.EMPLOYMENT,
        labor: METRIC_IDS.EMPLOYMENT,
        metric_jobs: METRIC_IDS.EMPLOYMENT,
        jobs: METRIC_IDS.EMPLOYMENT,
        metric_supply_chain: METRIC_IDS.TRADE,
        supply_chain: METRIC_IDS.TRADE,
        metric_exports: METRIC_IDS.TRADE,
        exports: METRIC_IDS.TRADE,
        metric_imports: METRIC_IDS.TRADE,
        imports: METRIC_IDS.TRADE,
        metric_poverty: METRIC_IDS.EQUALITY,
        poverty: METRIC_IDS.EQUALITY,
        metric_welfare: METRIC_IDS.EQUALITY,
        welfare: METRIC_IDS.EQUALITY,
        metric_public_health: METRIC_IDS.HEALTH,
        public_health: METRIC_IDS.HEALTH,
        metric_healthcare: METRIC_IDS.HEALTH,
        healthcare: METRIC_IDS.HEALTH,
        metric_foreign_policy: METRIC_IDS.FOREIGN_RELATIONS,
        foreign_policy: METRIC_IDS.FOREIGN_RELATIONS,
        metric_diplomacy_relations: METRIC_IDS.FOREIGN_RELATIONS,
        metric_national_security: METRIC_IDS.MILITARY,
        national_security: METRIC_IDS.MILITARY,
        metric_armed_forces: METRIC_IDS.MILITARY,
        armed_forces: METRIC_IDS.MILITARY,
        metric_civil_rights: METRIC_IDS.LIBERTY,
        civil_rights: METRIC_IDS.LIBERTY,
        metric_human_rights: METRIC_IDS.LIBERTY,
        human_rights: METRIC_IDS.LIBERTY,
        metric_renewable_energy: METRIC_IDS.ENERGY,
        renewable_energy: METRIC_IDS.ENERGY,
        metric_power: METRIC_IDS.ENERGY,
        power: METRIC_IDS.ENERGY,
        metric_pollution: METRIC_IDS.ENVIRONMENT,
        pollution: METRIC_IDS.ENVIRONMENT,
        metric_climate: METRIC_IDS.ENVIRONMENT,
        climate: METRIC_IDS.ENVIRONMENT,
        metric_public_safety: METRIC_IDS.PUBLIC_ORDER,
        public_safety: METRIC_IDS.PUBLIC_ORDER,
        metric_law_enforcement: METRIC_IDS.PUBLIC_ORDER,
        law_enforcement: METRIC_IDS.PUBLIC_ORDER,
        metric_housing_market: METRIC_IDS.HOUSING,
        housing_market: METRIC_IDS.HOUSING,
        metric_research: METRIC_IDS.INNOVATION,
        research: METRIC_IDS.INNOVATION,
        metric_technology: METRIC_IDS.INNOVATION,
        technology: METRIC_IDS.INNOVATION,
        metric_borders: METRIC_IDS.IMMIGRATION,
        borders: METRIC_IDS.IMMIGRATION,
        metric_migration: METRIC_IDS.IMMIGRATION,
        migration: METRIC_IDS.IMMIGRATION,
        metric_national_debt: METRIC_IDS.BUDGET,
        national_debt: METRIC_IDS.BUDGET,
        metric_unrest: METRIC_IDS.UNREST,
        metric_social_unrest: METRIC_IDS.UNREST,
        social_unrest: METRIC_IDS.UNREST,
    };

    const normalized = metricName.toLowerCase().trim();
    return aliasMap[normalized] || METRIC_IDS.APPROVAL;
}

export function tryNormalizeMetricId(metricName: string): MetricId | undefined {
    if (isValidMetricId(metricName)) return metricName;
    const result = normalizeMetricId(metricName);
    if (result === METRIC_IDS.APPROVAL && metricName.toLowerCase().trim() !== 'approval' && metricName.toLowerCase().trim() !== 'metric_approval' && metricName.toLowerCase().trim() !== 'public_approval') {
        return undefined;
    }
    return result;
}

/**
 * Check if a metric name maps to a target metric with an inverse relationship.
 * Used to determine if effect values should be inverted.
 */
export function isInverseMapping(sourceMetricName: string, targetMetricId: MetricId): boolean {
    const normalized = sourceMetricName.toLowerCase().trim();
    const inverseMappings: Record<string, MetricId> = {
        metric_anti_corruption: METRIC_IDS.CORRUPTION,
        anti_corruption: METRIC_IDS.CORRUPTION,
        metric_inequality: METRIC_IDS.EQUALITY,
        inequality: METRIC_IDS.EQUALITY,
        metric_unemployment: METRIC_IDS.EMPLOYMENT,
        unemployment: METRIC_IDS.EMPLOYMENT,
    };

    return inverseMappings[normalized] === targetMetricId;
}

export function getMetricCategory(
    id: MetricId
):
    | 'governance'
    | 'economic'
    | 'social'
    | 'security'
    | 'infrastructure'
    | 'environmental'
    | 'foreign'
    | 'fiscal'
    | 'hidden' {
    const categoryMap: Record<
        MetricId,
        | 'governance'
        | 'economic'
        | 'social'
        | 'security'
        | 'infrastructure'
        | 'environmental'
        | 'foreign'
        | 'fiscal'
        | 'hidden'
    > = {
        [METRIC_IDS.APPROVAL]: 'governance',
        [METRIC_IDS.PUBLIC_ORDER]: 'governance',
        [METRIC_IDS.CORRUPTION]: 'governance',
        [METRIC_IDS.BUREAUCRACY]: 'governance',
        [METRIC_IDS.DEMOCRACY]: 'governance',
        [METRIC_IDS.ECONOMY]: 'economic',
        [METRIC_IDS.EMPLOYMENT]: 'economic',
        [METRIC_IDS.INNOVATION]: 'economic',
        [METRIC_IDS.TRADE]: 'economic',
        [METRIC_IDS.INFLATION]: 'economic',
        [METRIC_IDS.HEALTH]: 'social',
        [METRIC_IDS.EDUCATION]: 'social',
        [METRIC_IDS.EQUALITY]: 'social',
        [METRIC_IDS.HOUSING]: 'social',
        [METRIC_IDS.CRIME]: 'social',
        [METRIC_IDS.IMMIGRATION]: 'social',
        [METRIC_IDS.MILITARY]: 'security',
        [METRIC_IDS.LIBERTY]: 'security',
        [METRIC_IDS.SOVEREIGNTY]: 'security',
        [METRIC_IDS.INFRASTRUCTURE]: 'infrastructure',
        [METRIC_IDS.ENERGY]: 'infrastructure',
        [METRIC_IDS.ENVIRONMENT]: 'environmental',
        [METRIC_IDS.FOREIGN_RELATIONS]: 'foreign',
        [METRIC_IDS.BUDGET]: 'fiscal',
        [METRIC_IDS.UNREST]: 'hidden',
        [METRIC_IDS.ECONOMIC_BUBBLE]: 'hidden',
        [METRIC_IDS.FOREIGN_INFLUENCE]: 'hidden',
    };
    return categoryMap[id] || 'governance';
}
