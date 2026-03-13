"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FISCAL_METRIC_IDS = exports.HIDDEN_METRIC_IDS = exports.INVERSE_METRIC_IDS = exports.CORE_METRIC_IDS = exports.ALL_METRIC_IDS = exports.METRIC_IDS = void 0;
exports.isValidMetricId = isValidMetricId;
exports.isCoreMetric = isCoreMetric;
exports.isInverseMetric = isInverseMetric;
exports.isHiddenMetric = isHiddenMetric;
exports.normalizeMetricId = normalizeMetricId;
exports.isInverseMapping = isInverseMapping;
exports.getMetricCategory = getMetricCategory;
exports.METRIC_IDS = {
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
};
exports.ALL_METRIC_IDS = Object.values(exports.METRIC_IDS);
exports.CORE_METRIC_IDS = [
    exports.METRIC_IDS.ECONOMY,
    exports.METRIC_IDS.PUBLIC_ORDER,
    exports.METRIC_IDS.HEALTH,
    exports.METRIC_IDS.EDUCATION,
    exports.METRIC_IDS.INFRASTRUCTURE,
    exports.METRIC_IDS.ENVIRONMENT,
    exports.METRIC_IDS.FOREIGN_RELATIONS,
    exports.METRIC_IDS.MILITARY,
    exports.METRIC_IDS.LIBERTY,
    exports.METRIC_IDS.EQUALITY,
    exports.METRIC_IDS.EMPLOYMENT,
    exports.METRIC_IDS.INNOVATION,
    exports.METRIC_IDS.TRADE,
    exports.METRIC_IDS.ENERGY,
    exports.METRIC_IDS.HOUSING,
    exports.METRIC_IDS.DEMOCRACY,
    exports.METRIC_IDS.SOVEREIGNTY,
    exports.METRIC_IDS.IMMIGRATION,
];
exports.INVERSE_METRIC_IDS = [
    exports.METRIC_IDS.CORRUPTION,
    exports.METRIC_IDS.INFLATION,
    exports.METRIC_IDS.CRIME,
    exports.METRIC_IDS.BUREAUCRACY,
];
exports.HIDDEN_METRIC_IDS = [
    exports.METRIC_IDS.UNREST,
    exports.METRIC_IDS.ECONOMIC_BUBBLE,
    exports.METRIC_IDS.FOREIGN_INFLUENCE,
];
exports.FISCAL_METRIC_IDS = [exports.METRIC_IDS.BUDGET];
function isValidMetricId(id) {
    return Object.values(exports.METRIC_IDS).includes(id);
}
function isCoreMetric(id) {
    return exports.CORE_METRIC_IDS.includes(id);
}
function isInverseMetric(id) {
    return exports.INVERSE_METRIC_IDS.includes(id);
}
function isHiddenMetric(id) {
    return exports.HIDDEN_METRIC_IDS.includes(id);
}
function normalizeMetricId(metricName) {
    if (metricName.startsWith('metric_')) {
        if (isValidMetricId(metricName)) {
            return metricName;
        }
    }
    const aliasMap = {
        approval: exports.METRIC_IDS.APPROVAL,
        public_approval: exports.METRIC_IDS.APPROVAL,
        metric_public_approval: exports.METRIC_IDS.APPROVAL,
        relations: exports.METRIC_IDS.FOREIGN_RELATIONS,
        foreign_relations: exports.METRIC_IDS.FOREIGN_RELATIONS,
        control: exports.METRIC_IDS.PUBLIC_ORDER,
        public_order: exports.METRIC_IDS.PUBLIC_ORDER,
        order: exports.METRIC_IDS.PUBLIC_ORDER,
        economy: exports.METRIC_IDS.ECONOMY,
        military: exports.METRIC_IDS.MILITARY,
        health: exports.METRIC_IDS.HEALTH,
        environment: exports.METRIC_IDS.ENVIRONMENT,
        innovation: exports.METRIC_IDS.INNOVATION,
        equality: exports.METRIC_IDS.EQUALITY,
        liberty: exports.METRIC_IDS.LIBERTY,
        infrastructure: exports.METRIC_IDS.INFRASTRUCTURE,
        employment: exports.METRIC_IDS.EMPLOYMENT,
        education: exports.METRIC_IDS.EDUCATION,
        bureaucracy: exports.METRIC_IDS.BUREAUCRACY,
        trade: exports.METRIC_IDS.TRADE,
        inflation: exports.METRIC_IDS.INFLATION,
        corruption: exports.METRIC_IDS.CORRUPTION,
        energy: exports.METRIC_IDS.ENERGY,
        housing: exports.METRIC_IDS.HOUSING,
        crime: exports.METRIC_IDS.CRIME,
        democracy: exports.METRIC_IDS.DEMOCRACY,
        sovereignty: exports.METRIC_IDS.SOVEREIGNTY,
        immigration: exports.METRIC_IDS.IMMIGRATION,
        budget: exports.METRIC_IDS.BUDGET,
        unrest: exports.METRIC_IDS.UNREST,
        economic_bubble: exports.METRIC_IDS.ECONOMIC_BUBBLE,
        foreign_influence: exports.METRIC_IDS.FOREIGN_INFLUENCE,
        // Legacy metric aliases for Firebase migration compatibility
        metric_anti_corruption: exports.METRIC_IDS.CORRUPTION, // Inverse mapping
        anti_corruption: exports.METRIC_IDS.CORRUPTION, // Inverse mapping
        metric_civil_liberties: exports.METRIC_IDS.LIBERTY,
        civil_liberties: exports.METRIC_IDS.LIBERTY,
        metric_diplomacy: exports.METRIC_IDS.FOREIGN_RELATIONS,
        diplomacy: exports.METRIC_IDS.FOREIGN_RELATIONS,
        metric_environment_stability: exports.METRIC_IDS.ENVIRONMENT,
        environment_stability: exports.METRIC_IDS.ENVIRONMENT,
        metric_equity: exports.METRIC_IDS.EQUALITY,
        equity: exports.METRIC_IDS.EQUALITY,
        metric_freedom: exports.METRIC_IDS.LIBERTY,
        freedom: exports.METRIC_IDS.LIBERTY,
        metric_inequality: exports.METRIC_IDS.EQUALITY, // Inverse mapping
        inequality: exports.METRIC_IDS.EQUALITY, // Inverse mapping
        metric_politics: exports.METRIC_IDS.DEMOCRACY,
        politics: exports.METRIC_IDS.DEMOCRACY,
        metric_safety: exports.METRIC_IDS.PUBLIC_ORDER,
        safety: exports.METRIC_IDS.PUBLIC_ORDER,
        metric_science: exports.METRIC_IDS.INNOVATION,
        science: exports.METRIC_IDS.INNOVATION,
        metric_security: exports.METRIC_IDS.MILITARY,
        security: exports.METRIC_IDS.MILITARY,
        metric_social_cohesion: exports.METRIC_IDS.PUBLIC_ORDER,
        social_cohesion: exports.METRIC_IDS.PUBLIC_ORDER,
        metric_tech: exports.METRIC_IDS.INNOVATION,
        tech: exports.METRIC_IDS.INNOVATION,
        metric_tourism: exports.METRIC_IDS.ECONOMY,
        tourism: exports.METRIC_IDS.ECONOMY,
        metric_unemployment: exports.METRIC_IDS.EMPLOYMENT, // Inverse mapping
        unemployment: exports.METRIC_IDS.EMPLOYMENT, // Inverse mapping
        metric_water: exports.METRIC_IDS.INFRASTRUCTURE,
        water: exports.METRIC_IDS.INFRASTRUCTURE,
    };
    const normalized = metricName.toLowerCase().trim();
    return aliasMap[normalized] || exports.METRIC_IDS.APPROVAL;
}
/**
 * Check if a metric name maps to a target metric with an inverse relationship.
 * Used to determine if effect values should be inverted.
 */
function isInverseMapping(sourceMetricName, targetMetricId) {
    const normalized = sourceMetricName.toLowerCase().trim();
    const inverseMappings = {
        metric_anti_corruption: exports.METRIC_IDS.CORRUPTION,
        anti_corruption: exports.METRIC_IDS.CORRUPTION,
        metric_inequality: exports.METRIC_IDS.EQUALITY,
        inequality: exports.METRIC_IDS.EQUALITY,
        metric_unemployment: exports.METRIC_IDS.EMPLOYMENT,
        unemployment: exports.METRIC_IDS.EMPLOYMENT,
    };
    return inverseMappings[normalized] === targetMetricId;
}
function getMetricCategory(id) {
    const categoryMap = {
        [exports.METRIC_IDS.APPROVAL]: 'governance',
        [exports.METRIC_IDS.PUBLIC_ORDER]: 'governance',
        [exports.METRIC_IDS.CORRUPTION]: 'governance',
        [exports.METRIC_IDS.BUREAUCRACY]: 'governance',
        [exports.METRIC_IDS.DEMOCRACY]: 'governance',
        [exports.METRIC_IDS.ECONOMY]: 'economic',
        [exports.METRIC_IDS.EMPLOYMENT]: 'economic',
        [exports.METRIC_IDS.INNOVATION]: 'economic',
        [exports.METRIC_IDS.TRADE]: 'economic',
        [exports.METRIC_IDS.INFLATION]: 'economic',
        [exports.METRIC_IDS.HEALTH]: 'social',
        [exports.METRIC_IDS.EDUCATION]: 'social',
        [exports.METRIC_IDS.EQUALITY]: 'social',
        [exports.METRIC_IDS.HOUSING]: 'social',
        [exports.METRIC_IDS.CRIME]: 'social',
        [exports.METRIC_IDS.IMMIGRATION]: 'social',
        [exports.METRIC_IDS.MILITARY]: 'security',
        [exports.METRIC_IDS.LIBERTY]: 'security',
        [exports.METRIC_IDS.SOVEREIGNTY]: 'security',
        [exports.METRIC_IDS.INFRASTRUCTURE]: 'infrastructure',
        [exports.METRIC_IDS.ENERGY]: 'infrastructure',
        [exports.METRIC_IDS.ENVIRONMENT]: 'environmental',
        [exports.METRIC_IDS.FOREIGN_RELATIONS]: 'foreign',
        [exports.METRIC_IDS.BUDGET]: 'fiscal',
        [exports.METRIC_IDS.UNREST]: 'hidden',
        [exports.METRIC_IDS.ECONOMIC_BUBBLE]: 'hidden',
        [exports.METRIC_IDS.FOREIGN_INFLUENCE]: 'hidden',
    };
    return categoryMap[id] || 'governance';
}
//# sourceMappingURL=metricIds.js.map