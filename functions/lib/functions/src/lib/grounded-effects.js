"use strict";
/**
 * Grounded Effects Module
 *
 * Maps narrative descriptions (e.g., "2% GDP drop", "1000 casualties") to
 * calibrated metric effects. Ensures scenarios have realistic, proportional
 * impact on game state.
 *
 * The game uses 0-100 scale metrics, not real percentages. This module
 * translates real-world references into appropriate game values.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNarrativeReferences = extractNarrativeReferences;
exports.groundingIssueToAuditIssue = groundingIssueToAuditIssue;
exports.validateGroundedEffects = validateGroundedEffects;
exports.validatePolicyImplications = validatePolicyImplications;
exports.suggestEffectCorrections = suggestEffectCorrections;
exports.getEffectCalibrationPrompt = getEffectCalibrationPrompt;
exports.validateMonetaryRealism = validateMonetaryRealism;
/**
 * Mappings from real-world references to game effects
 * Based on logic.md effect magnitude ranges (minor: 0.3-1.1, moderate: 1.2-2.6, major: 2.7-4.2)
 */
const GROUNDED_MAPPINGS = {
    // Economic references
    gdp: {
        targetMetrics: ['metric_economy'],
        perUnitDelta: 0.8, // 1% GDP = 0.8 economy points
        maxReference: 10,
        unit: '%'
    },
    gdpGrowth: {
        targetMetrics: ['metric_economy', 'metric_employment'],
        perUnitDelta: 0.6,
        maxReference: 8,
        unit: '%'
    },
    taxRate: {
        targetMetrics: ['metric_economy', 'metric_budget'],
        perUnitDelta: 0.4, // Tax changes have inverse effect on economy
        maxReference: 15,
        unit: '%',
        isInverse: true // Higher tax = worse economy (but better budget)
    },
    budget: {
        targetMetrics: ['metric_budget'],
        perUnitDelta: 0.5,
        maxReference: 20,
        unit: '%'
    },
    deficit: {
        targetMetrics: ['metric_budget'],
        perUnitDelta: 0.6,
        maxReference: 15,
        unit: '%',
        isInverse: true
    },
    trade: {
        targetMetrics: ['metric_trade', 'metric_economy'],
        perUnitDelta: 0.5,
        maxReference: 20,
        unit: '%'
    },
    // Inflation (inverse metric: higher = worse)
    inflation: {
        targetMetrics: ['metric_inflation'],
        perUnitDelta: 1.0, // 1% inflation = 1.0 metric_inflation
        maxReference: 10,
        unit: '%'
    },
    // Employment references
    unemployment: {
        targetMetrics: ['metric_employment'],
        perUnitDelta: 1.2,
        maxReference: 15,
        unit: '%',
        isInverse: true // Higher unemployment = lower employment metric
    },
    jobs: {
        targetMetrics: ['metric_employment', 'metric_economy'],
        perUnitDelta: 0.00003, // Per job (e.g., 100,000 jobs = 3 points)
        maxReference: 500000,
        unit: ' jobs'
    },
    // Population/humanitarian
    casualties: {
        targetMetrics: ['metric_approval', 'metric_public_order'],
        perUnitDelta: 0.0025, // 1000 casualties = -2.5 approval
        maxReference: 100000,
        unit: ' people',
        isInverse: true
    },
    displaced: {
        targetMetrics: ['metric_approval', 'metric_housing'],
        perUnitDelta: 0.001, // 1000 displaced = -1.0 approval
        maxReference: 1000000,
        unit: ' people',
        isInverse: true
    },
    deaths: {
        targetMetrics: ['metric_health', 'metric_approval'],
        perUnitDelta: 0.005, // 1000 deaths = -5.0 health
        maxReference: 100000,
        unit: ' people',
        isInverse: true
    },
    // Approval/polling
    approval: {
        targetMetrics: ['metric_approval'],
        perUnitDelta: 0.5, // 1 polling point = 0.5 metric
        maxReference: 20,
        unit: '%'
    },
    polling: {
        targetMetrics: ['metric_approval'],
        perUnitDelta: 0.5,
        maxReference: 20,
        unit: '%'
    },
    // Energy
    energy: {
        targetMetrics: ['metric_energy'],
        perUnitDelta: 0.8,
        maxReference: 30,
        unit: '%'
    },
    oilPrice: {
        targetMetrics: ['metric_energy', 'metric_economy', 'metric_inflation'],
        perUnitDelta: 0.03, // $1 oil = 0.03 effect spread across metrics
        maxReference: 50,
        unit: '$'
    },
    // Infrastructure
    infrastructure: {
        targetMetrics: ['metric_infrastructure'],
        perUnitDelta: 0.7,
        maxReference: 15,
        unit: '%'
    },
    // Environment
    emissions: {
        targetMetrics: ['metric_environment'],
        perUnitDelta: 0.6,
        maxReference: 20,
        unit: '%',
        isInverse: true
    },
    // Military
    military: {
        targetMetrics: ['metric_military'],
        perUnitDelta: 0.8,
        maxReference: 20,
        unit: '%'
    },
    // Crime (inverse metric)
    crime: {
        targetMetrics: ['metric_crime'],
        perUnitDelta: 1.0,
        maxReference: 15,
        unit: '%'
    },
    // Corruption (inverse metric)
    corruption: {
        targetMetrics: ['metric_corruption'],
        perUnitDelta: 0.8,
        maxReference: 15,
        unit: '%'
    },
};
// Regex patterns to extract numeric references from text
const NARRATIVE_PATTERNS = [
    // Percentage patterns
    { pattern: /(\d+(?:\.\d+)?)\s*%?\s*(?:of\s+)?gdp/gi, mapping: 'gdp' },
    { pattern: /gdp\s*(?:growth|increase|decrease|drop|rise|fall)(?:\s+of)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'gdpGrowth' },
    { pattern: /(\d+(?:\.\d+)?)\s*%\s*(?:gdp\s+)?(?:growth|contraction)/gi, mapping: 'gdpGrowth' },
    { pattern: /tax(?:\s+rate)?(?:\s+(?:increase|decrease|hike|cut))?\s*(?:of|by)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'taxRate' },
    { pattern: /(\d+(?:\.\d+)?)\s*%\s*tax\s*(?:increase|decrease|hike|cut)/gi, mapping: 'taxRate' },
    { pattern: /inflation\s*(?:of|at|reaches?)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'inflation' },
    { pattern: /(\d+(?:\.\d+)?)\s*%\s*inflation/gi, mapping: 'inflation' },
    { pattern: /unemployment\s*(?:rate)?\s*(?:of|at|reaches?)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'unemployment' },
    { pattern: /(\d+(?:\.\d+)?)\s*%\s*unemployment/gi, mapping: 'unemployment' },
    { pattern: /budget\s*(?:deficit|surplus)?\s*(?:of|by)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'budget' },
    { pattern: /(\d+(?:\.\d+)?)\s*%\s*(?:budget\s+)?(?:deficit|surplus)/gi, mapping: 'deficit' },
    { pattern: /approval\s*(?:rating)?\s*(?:drops?|falls?|rises?|increases?)(?:\s+by)?\s*(\d+(?:\.\d+)?)\s*%?/gi, mapping: 'approval' },
    { pattern: /(\d+(?:\.\d+)?)\s*%?\s*(?:point|percentage)?\s*(?:drop|fall|rise|increase)\s+in\s+(?:the\s+)?polls?/gi, mapping: 'polling' },
    { pattern: /trade\s*(?:volume|balance)?\s*(?:drops?|falls?|rises?|increases?)(?:\s+by)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'trade' },
    { pattern: /energy\s*(?:prices?|costs?)?\s*(?:drops?|falls?|rises?|increases?)(?:\s+by)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'energy' },
    { pattern: /emissions?\s*(?:drops?|falls?|rises?|increases?|reduced?|cut)(?:\s+by)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'emissions' },
    { pattern: /crime\s*(?:rate)?\s*(?:drops?|falls?|rises?|increases?)(?:\s+by)?\s*(\d+(?:\.\d+)?)\s*%/gi, mapping: 'crime' },
    // Absolute number patterns
    { pattern: /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*(?:thousand|k)?\s*(?:casualties|killed|dead|deaths)/gi, mapping: 'casualties', multiplier: 1 },
    { pattern: /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*(?:thousand|k)?\s*(?:displaced|refugees|homeless)/gi, mapping: 'displaced', multiplier: 1 },
    { pattern: /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*(?:thousand|k|million|m)?\s*(?:jobs?\s+(?:created|lost|cut))/gi, mapping: 'jobs', multiplier: 1 },
];
// Helper to parse number with K/M/thousand/million modifiers
function parseNumber(str) {
    const cleaned = str.replace(/,/g, '');
    const num = parseFloat(cleaned);
    const lower = str.toLowerCase();
    if (lower.includes('million') || lower.includes('m'))
        return num * 1000000;
    if (lower.includes('thousand') || lower.includes('k'))
        return num * 1000;
    return num;
}
function extractNarrativeReferences(text) {
    const references = [];
    for (const { pattern, mapping, multiplier = 1 } of NARRATIVE_PATTERNS) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(text)) !== null) {
            const rawValue = match[1];
            if (!rawValue)
                continue;
            const value = parseNumber(rawValue) * multiplier;
            const config = GROUNDED_MAPPINGS[mapping];
            if (!config)
                continue;
            // Calculate expected effects
            const cappedValue = Math.min(value, config.maxReference);
            const baseDelta = cappedValue * config.perUnitDelta;
            // Determine sign based on context
            const lowerMatch = match[0].toLowerCase();
            const isNegative = /(?:drop|fall|decrease|cut|lost|deficit|reduced?|contraction|shrink|shrank|lower|less|fewer|plunge|crash)/.test(lowerMatch);
            const isPositive = /(?:rise|increase|growth|hike|created|surplus|expansion|expand|higher|more|gain|surge|boom)/.test(lowerMatch);
            let effectSign = isNegative ? -1 : (isPositive ? 1 : 1);
            if (config.isInverse) {
                effectSign = -effectSign;
            }
            const expectedEffects = config.targetMetrics.map(metricId => {
                let finalValue = baseDelta * effectSign;
                // Cap to reasonable game values
                finalValue = Math.max(-4.2, Math.min(4.2, finalValue));
                return {
                    metricId,
                    value: Number(finalValue.toFixed(2))
                };
            });
            references.push({
                mapping,
                value,
                originalText: match[0],
                expectedEffects
            });
        }
    }
    return references;
}
function groundingIssueToAuditIssue(issue, target) {
    const severity = issue.type === 'magnitude' ? 'warn' : 'error';
    const rule = issue.type === 'magnitude' ? 'grounded-effects-mismatch' : 'grounded-effects-critical';
    return {
        severity,
        rule,
        target,
        message: issue.message,
        autoFixable: false,
    };
}
function validateGroundedEffects(narrativeText, effects) {
    const issues = [];
    const references = extractNarrativeReferences(narrativeText);
    for (const ref of references) {
        for (const expected of ref.expectedEffects) {
            // Find matching effect
            const actual = effects.find(e => e.targetMetricId === expected.metricId);
            if (!actual) {
                // Effect entirely missing
                issues.push({
                    type: 'missing',
                    reference: ref,
                    message: `Narrative mentions "${ref.originalText}" but no effect on ${expected.metricId}`
                });
                continue;
            }
            // Check sign match
            if (Math.sign(actual.value) !== Math.sign(expected.value) && expected.value !== 0) {
                issues.push({
                    type: 'sign',
                    reference: ref,
                    actualEffect: actual,
                    message: `Sign mismatch for ${expected.metricId}: expected ${expected.value > 0 ? '+' : '-'}, got ${actual.value > 0 ? '+' : '-'}`
                });
                continue;
            }
            // Check magnitude (allow 50% tolerance)
            const expectedMag = Math.abs(expected.value);
            const actualMag = Math.abs(actual.value);
            const tolerance = 0.5;
            if (expectedMag > 0.5 && (actualMag < expectedMag * (1 - tolerance) || actualMag > expectedMag * (1 + tolerance))) {
                issues.push({
                    type: 'magnitude',
                    reference: ref,
                    actualEffect: actual,
                    message: `Magnitude mismatch for ${expected.metricId}: expected ~${expected.value.toFixed(1)}, got ${actual.value.toFixed(1)}`
                });
            }
        }
    }
    return issues;
}
const POLICY_NARRATIVE_SIGNALS = [
    { pattern: /\b(?:raise|increase|hike)\b.*\b(?:income\s+)?tax/i, expectedTarget: 'fiscal.taxIncome', expectedSign: 1 },
    { pattern: /\b(?:cut|lower|reduce)\b.*\b(?:income\s+)?tax/i, expectedTarget: 'fiscal.taxIncome', expectedSign: -1 },
    { pattern: /\b(?:raise|increase|hike)\b.*\bcorporate\s+tax/i, expectedTarget: 'fiscal.taxCorporate', expectedSign: 1 },
    { pattern: /\b(?:cut|lower|reduce)\b.*\bcorporate\s+tax/i, expectedTarget: 'fiscal.taxCorporate', expectedSign: -1 },
    { pattern: /\b(?:boost|increase|expand)\b.*\bmilitary\s+(?:spending|budget)/i, expectedTarget: 'fiscal.spendingMilitary', expectedSign: 1 },
    { pattern: /\b(?:cut|slash|reduce)\b.*\bmilitary\s+(?:spending|budget)/i, expectedTarget: 'fiscal.spendingMilitary', expectedSign: -1 },
    { pattern: /\b(?:boost|increase|expand)\b.*\binfrastructure\s+(?:spending|budget|investment)/i, expectedTarget: 'fiscal.spendingInfrastructure', expectedSign: 1 },
    { pattern: /\b(?:boost|increase|expand)\b.*\bsocial\s+(?:spending|programs|welfare)/i, expectedTarget: 'fiscal.spendingSocial', expectedSign: 1 },
    { pattern: /\b(?:cut|slash|reduce)\b.*\bsocial\s+(?:spending|programs|welfare)/i, expectedTarget: 'fiscal.spendingSocial', expectedSign: -1 },
    { pattern: /\b(?:tighten|strengthen|enforce)\b.*\benvironmental/i, expectedTarget: 'policy.environmentalPolicy', expectedSign: 1 },
    { pattern: /\b(?:relax|loosen|rollback|weaken)\b.*\benvironmental/i, expectedTarget: 'policy.environmentalPolicy', expectedSign: -1 },
    { pattern: /\bopen\s+(?:the\s+)?borders?\b/i, expectedTarget: 'policy.immigration', expectedSign: 1 },
    { pattern: /\b(?:restrict|close|tighten)\b.*\b(?:border|immigration)/i, expectedTarget: 'policy.immigration', expectedSign: -1 },
];
function validatePolicyImplications(narrativeText, implications) {
    const issues = [];
    if (!implications || implications.length === 0)
        return issues;
    for (const signal of POLICY_NARRATIVE_SIGNALS) {
        if (!signal.pattern.test(narrativeText))
            continue;
        const matching = implications.find(i => i.target === signal.expectedTarget);
        if (matching) {
            if (Math.sign(matching.delta) !== signal.expectedSign && matching.delta !== 0) {
                issues.push({
                    type: 'sign',
                    reference: { mapping: 'policy', value: 0, originalText: narrativeText.substring(0, 80), expectedEffects: [] },
                    message: `Policy implication sign mismatch for ${signal.expectedTarget}: narrative implies ${signal.expectedSign > 0 ? 'increase' : 'decrease'} but delta is ${matching.delta}`
                });
            }
        }
    }
    return issues;
}
/**
 * Suggest effect corrections based on narrative references
 */
function suggestEffectCorrections(narrativeText, currentEffects) {
    const references = extractNarrativeReferences(narrativeText);
    const corrected = [...currentEffects];
    const effectsByMetric = new Map(currentEffects.map(e => [e.targetMetricId, e]));
    for (const ref of references) {
        for (const expected of ref.expectedEffects) {
            const existing = effectsByMetric.get(expected.metricId);
            if (!existing) {
                // Only add missing effect if we haven't hit the hard cap of 4
                if (corrected.length >= 4)
                    continue;
                corrected.push({
                    targetMetricId: expected.metricId,
                    value: expected.value,
                    duration: 3,
                    probability: 1
                });
                effectsByMetric.set(expected.metricId, corrected[corrected.length - 1]);
            }
            else {
                // Adjust existing effect if sign is wrong
                if (Math.sign(existing.value) !== Math.sign(expected.value) && expected.value !== 0) {
                    existing.value = expected.value;
                }
            }
        }
    }
    return corrected;
}
/**
 * Generate effect calibration guidance for prompts
 */
function getEffectCalibrationPrompt() {
    return `## EFFECT CALIBRATION (Grounded Impacts)

When your outcome narrative mentions specific percentages or numbers, calibrate effects accordingly:

| Narrative Reference | Target Metric | Effect Value |
|---------------------|---------------|--------------|
| 1% GDP change | metric_economy | ±0.8 |
| 1% GDP growth | metric_economy, metric_employment | ±0.6 each |
| 1% tax rate change | metric_economy | ∓0.4, metric_budget ±0.3 |
| 1% inflation | metric_inflation | ±1.0 (INVERSE: positive = worse) |
| 1% unemployment | metric_employment | ∓1.2 |
| 1000 casualties | metric_approval | -2.5, metric_public_order | -1.5 |
| 10,000 jobs created | metric_employment | +0.3 |
| 5% approval drop | metric_approval | -2.5 |

### EXAMPLE:
If your outcomeSummary says "GDP drops 3% and inflation rises to 6%", effects should include:
- { "targetMetricId": "metric_economy", "value": -2.4 } (3 × 0.8)
- { "targetMetricId": "metric_inflation", "value": 6.0 } (6 × 1.0)

### DO NOT:
- Mention "GDP drops 5%" but have metric_economy: -1.0 (too weak)
- Mention "minor economic impact" but have metric_economy: -4.0 (too strong)
- Mention "inflation rises" but have metric_inflation: -2.0 (wrong sign)`;
}
// ---------------------------------------------------------------------------
// Monetary Realism Validation
// ---------------------------------------------------------------------------
/**
 * Patterns that extract absolute monetary amounts from scenario text.
 * Returns the amount normalized to millions.
 */
const MONETARY_AMOUNT_PATTERNS = [
    // "$X trillion" or "X trillion dollars/euros/etc"
    {
        pattern: /\$?\s*(\d+(?:\.\d+)?)\s*trillion/gi,
        parseAmount: (m) => parseFloat(m[1]) * 1000000, // trillions → millions
    },
    // "$X billion" or "X billion dollars/euros/etc"
    {
        pattern: /\$?\s*(\d+(?:\.\d+)?)\s*billion/gi,
        parseAmount: (m) => parseFloat(m[1]) * 1000, // billions → millions
    },
    // "$X million" or "X million dollars/euros/etc"
    {
        pattern: /\$?\s*(\d+(?:\.\d+)?)\s*million/gi,
        parseAmount: (m) => parseFloat(m[1]), // Already in millions
    },
];
/**
 * Theft/corruption verbs that indicate the amount is being stolen, siphoned, or lost.
 * Context around these verbs + large amounts = unrealistic scenario.
 */
const THEFT_CONTEXT_PATTERN = /siphon|steal|stole|stolen|embezzl|divert|skim|misappropriate|loot|plunder|funnel|launder|drain|hemorrhage|squander|defraud|pilfer/i;
/**
 * Validate that absolute monetary amounts in scenario text are realistic
 * relative to the applicable country's GDP. Runs on template text (pre-resolution).
 *
 * @param text Combined scenario text (description + option texts + outcomes)
 * @param gdpMillions GDP of the target country in millions
 * @returns Array of realism issues found
 */
function validateMonetaryRealism(text, gdpMillions) {
    if (!text || gdpMillions <= 0)
        return [];
    const issues = [];
    for (const { pattern, parseAmount } of MONETARY_AMOUNT_PATTERNS) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(text)) !== null) {
            const amountMillions = parseAmount(match);
            if (!Number.isFinite(amountMillions) || amountMillions <= 0)
                continue;
            const percentOfGdp = (amountMillions / gdpMillions) * 100;
            // Any single amount > 25% of GDP = unrealistic regardless of context
            if (percentOfGdp > 25) {
                issues.push({
                    type: 'unrealistic-amount',
                    amountMillions,
                    gdpMillions,
                    percentOfGdp,
                    originalText: match[0],
                    message: `Amount "${match[0]}" is ${percentOfGdp.toFixed(1)}% of GDP (${Math.round(gdpMillions).toLocaleString()}M) — exceeds 25% threshold`,
                });
            }
            // Amount > 5% of GDP in theft context = unrealistic corruption
            else if (percentOfGdp > 5) {
                // Check surrounding sentence for theft verbs
                const sentenceStart = Math.max(0, match.index - 200);
                const sentenceEnd = Math.min(text.length, match.index + match[0].length + 200);
                const surrounding = text.slice(sentenceStart, sentenceEnd);
                if (THEFT_CONTEXT_PATTERN.test(surrounding)) {
                    issues.push({
                        type: 'unrealistic-theft',
                        amountMillions,
                        gdpMillions,
                        percentOfGdp,
                        originalText: match[0],
                        message: `Amount "${match[0]}" used in theft/corruption context is ${percentOfGdp.toFixed(1)}% of GDP — exceeds 5% threshold for corruption scenarios`,
                    });
                }
            }
        }
    }
    return issues;
}
//# sourceMappingURL=grounded-effects.js.map