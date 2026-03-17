/**
 * Logic Parameters from logic.md
 *
 * These constraints MUST be provided to LLMs when generating scenarios
 * to ensure generated content respects the auditable game parameters.
 *
 * Metric definitions are imported from the canonical source in src/data/schemas/metricIds.ts
 * Bundle definitions are imported from the canonical source in src/data/schemas/bundleIds.ts
 */

import {
  METRIC_IDS,
  ALL_METRIC_IDS as ALL_METRIC_IDS_ARRAY,
  CORE_METRIC_IDS,
  INVERSE_METRIC_IDS,
  HIDDEN_METRIC_IDS,
  FISCAL_METRIC_IDS,
  isValidMetricId as isValidMetricSource,
  isInverseMetric as isInverseMetricSource,
  type MetricId,
} from '../data/schemas/metricIds';

export { METRIC_IDS, type MetricId } from '../data/schemas/metricIds';
export { BUNDLE_IDS, ALL_BUNDLE_IDS, isValidBundleId, type BundleId } from '../data/schemas/bundleIds';

/**
 * Valid Metric IDs grouped by category (derived from canonical source)
 */
export const VALID_METRICS = {
  core: CORE_METRIC_IDS.concat(METRIC_IDS.APPROVAL as MetricId) as readonly string[],
  inverse: INVERSE_METRIC_IDS as readonly string[],
  fiscal: FISCAL_METRIC_IDS as readonly string[],
  hidden: HIDDEN_METRIC_IDS as readonly string[],
} as const;

/**
 * All valid metric IDs as a flat set (derived from canonical source)
 */
export const ALL_METRIC_IDS = new Set(ALL_METRIC_IDS_ARRAY);

import { TOKEN_CATEGORIES, CONCEPT_TO_TOKEN_MAP as _CONCEPT_TO_TOKEN_MAP } from './token-registry';


export const LOGIC_PARAMETERS = {
  effectRanges: {
    minor: { min: 0.3, max: 1.1 },
    moderate: { min: 1.2, max: 2.6 },
    major: { min: 2.7, max: 4.2 }
  },
  duration: {
    min: 1,
    max: 20,
    typical: { min: 7, max: 20 },
  },
  probability: {
    required: 1,
  },
  delay: {
    min: 0,
    max: 10,
    typical: { min: 0, max: 4 },
  },
  scenarioMetadata: {
    optionCount: { required: 3 },
  },
  optionRequirements: {
    minEffects: 1,
    typicalEffects: { min: 2, max: 4 },
    requiredFields: [
      "id", "text", "label", "effects",
      "outcomeHeadline", "outcomeSummary", "outcomeContext"
    ]
  },
  consequenceDelays: {
    typical: { min: 2, max: 4 },
  },
} as const;

/**
 * Narrative concept → game metric alignment.
 * Every consequential outcome described in scenario text MUST be reflected by an effect on the correct metric.
 * Used in getLogicParametersPrompt() and available for audit/grounded-effects reuse.
 */
export const NARRATIVE_TO_METRIC_ALIGNMENT: ReadonlyArray<{ concepts: string; metricIds: string; note?: string }> = [
  { concepts: 'GDP, recession, growth, fiscal health, trade flows', metricIds: 'metric_economy' },
  { concepts: 'Unemployment, jobs, layoffs, hiring', metricIds: 'metric_employment' },
  { concepts: 'Inflation, prices, currency weakness', metricIds: 'metric_inflation', note: 'inverse: positive = worse' },
  { concepts: 'Budget, deficit, austerity, spending cuts', metricIds: 'metric_budget' },
  { concepts: 'Crime, law and order', metricIds: 'metric_crime (inverse), metric_public_order' },
  { concepts: 'Corruption, graft', metricIds: 'metric_corruption', note: 'inverse' },
  { concepts: 'Diplomacy, allies, treaties, international standing', metricIds: 'metric_foreign_relations' },
  { concepts: 'Military, defense, readiness', metricIds: 'metric_military' },
  { concepts: 'Civil liberties, free speech', metricIds: 'metric_liberty' },
  { concepts: 'Democracy, elections, rule of law', metricIds: 'metric_democracy' },
  { concepts: 'Sovereignty, foreign oversight, independence', metricIds: 'metric_sovereignty' },
  { concepts: 'Protests, unrest, stability', metricIds: 'metric_public_order, metric_unrest (hidden)' },
  { concepts: 'Approval, polling, public trust', metricIds: 'metric_approval' },
  { concepts: 'Health, healthcare, disease', metricIds: 'metric_health' },
  { concepts: 'Education, schools', metricIds: 'metric_education' },
  { concepts: 'Environment, climate, sustainability', metricIds: 'metric_environment' },
  { concepts: 'Energy, fuel, power', metricIds: 'metric_energy' },
  { concepts: 'Trade, exports, imports', metricIds: 'metric_trade' },
  { concepts: 'Infrastructure, roads, utilities', metricIds: 'metric_infrastructure' },
  { concepts: 'Housing, affordability', metricIds: 'metric_housing' },
  { concepts: 'Equality, inequality, fairness', metricIds: 'metric_equality' },
  { concepts: 'Immigration, integration', metricIds: 'metric_immigration' },
  { concepts: 'Innovation, R&D, technology', metricIds: 'metric_innovation' },
  { concepts: 'Bureaucracy, red tape, efficiency', metricIds: 'metric_bureaucracy', note: 'inverse' },
  { concepts: 'Foreign influence, interference', metricIds: 'metric_foreign_influence', note: 'hidden, inverse' },
  { concepts: 'Economic bubble, financial instability', metricIds: 'metric_economic_bubble', note: 'hidden, inverse' },
];

/**
 * Generate a prompt-ready string with logic parameters
 * to be injected into AI generation prompts
 */
export function getLogicParametersPrompt(severity: 'low' | 'medium' | 'high' | 'extreme' | 'critical' = 'medium'): string {
  // Determine appropriate effect magnitude
  let magnitudeGuidance: string;
  switch (severity) {
    case 'low':
      magnitudeGuidance = `minor effects (values between ${LOGIC_PARAMETERS.effectRanges.minor.min} and ${LOGIC_PARAMETERS.effectRanges.minor.max})`;
      break;
    case 'medium':
      magnitudeGuidance = `moderate effects (values between ${LOGIC_PARAMETERS.effectRanges.moderate.min} and ${LOGIC_PARAMETERS.effectRanges.moderate.max})`;
      break;
    case 'high':
    case 'extreme':
      magnitudeGuidance = `major effects (values between ${LOGIC_PARAMETERS.effectRanges.major.min} and ${LOGIC_PARAMETERS.effectRanges.major.max})`;
      break;
    case 'critical':
      magnitudeGuidance = `major effects at the high end (values between ${LOGIC_PARAMETERS.effectRanges.major.min + 1} and ${LOGIC_PARAMETERS.effectRanges.major.max})`;
      break;
  }

  return `
**GAME LOGIC CONSTRAINTS** (MUST FOLLOW):

1. **Valid Metrics**: ONLY use these metric IDs in effects:
   - Core (higher is better): ${VALID_METRICS.core.join(', ')}
   - Inverse (lower is better): ${VALID_METRICS.inverse.join(', ')}
   - Fiscal: ${VALID_METRICS.fiscal.join(', ')}
   - Hidden: ${VALID_METRICS.hidden.join(', ')}

2. **Template Tokens**: Use these placeholders in descriptions/outcomes:
   - Executive: {${TOKEN_CATEGORIES.executive.join('}, {')}}
   - Legislative: {${TOKEN_CATEGORIES.legislative.join('}, {')}}
   - Judicial: {${TOKEN_CATEGORIES.judicial.join('}, {')}}
   - Ministers: {${TOKEN_CATEGORIES.ministers.join('}, {')}}
   - Security: {${TOKEN_CATEGORIES.security.join('}, {')}}
   - Military: {${TOKEN_CATEGORIES.military.join('}, {')}}
   - Economic: {${TOKEN_CATEGORIES.economic.join('}, {')}}
   - Local: {${TOKEN_CATEGORIES.local.join('}, {')}}
   - Civil: {${TOKEN_CATEGORIES.civil.join('}, {')}}
   - Media: {${TOKEN_CATEGORIES.media.join('}, {')}}
   - Country/relationship — subject, object, or prepositional position → ALWAYS use the {the_*} article form (auto-adds "the" where required, e.g. "the United States" but not "Germany"):
     {${TOKEN_CATEGORIES.article_forms.filter(t => ['the_adversary','the_border_rival','the_regional_rival','the_ally','the_neutral','the_rival','the_partner','the_trade_partner','the_neighbor','the_player_country','the_nation','the_regional_bloc'].includes(t)).join('}, {')}}
   - Possessive constructions only → bare form immediately followed by 's is valid: {${TOKEN_CATEGORIES.relationships.join('}, {')}}
     ✅ "{player_country}'s economy collapsed" / "{adversary}'s claims were dismissed"
     ❌ "{player_country} faces..." → ✅ "{the_player_country} faces..."
   - Article forms ({the_*}) for roles and institutions — use when a role title is a sentence subject or follows a preposition:
     {${TOKEN_CATEGORIES.article_forms.join('}, {')}}
     e.g. "{the_legislature} passed a bill" / "sanctions imposed by {the_adversary}"
   - Example: "{the_player_country} faces pressure from {the_legislature} over {central_bank} policy"

   **CONCEPT → TOKEN** (never hardcode — always use the right token for the concept):
${_CONCEPT_TO_TOKEN_MAP.map(({ concept, token }) => `   - ${concept} → ${token}`).join('\n')}

3. **Effect Values**: ${magnitudeGuidance}
   - Minor: ${LOGIC_PARAMETERS.effectRanges.minor.min}–${LOGIC_PARAMETERS.effectRanges.minor.max} (e.g. 0.4, 0.6, 0.9)
   - Moderate: ${LOGIC_PARAMETERS.effectRanges.moderate.min}–${LOGIC_PARAMETERS.effectRanges.moderate.max} (e.g. 1.3, 1.8, 2.2)
   - Major: ${LOGIC_PARAMETERS.effectRanges.major.min}–${LOGIC_PARAMETERS.effectRanges.major.max} (e.g. 2.9, 3.4, 3.8)
   Use specific decimal values. Whole numbers like 1, 2, or 3 are invalid output.

4. **Effect Probability**: MUST be ${LOGIC_PARAMETERS.probability.required} (deterministic)

5. **Effect Duration**: Between ${LOGIC_PARAMETERS.duration.min} and ${LOGIC_PARAMETERS.duration.typical.max} turns (typical: ${LOGIC_PARAMETERS.duration.typical.min}-${LOGIC_PARAMETERS.duration.typical.max})

6. **Effect Delay**: Between ${LOGIC_PARAMETERS.delay.min} and ${LOGIC_PARAMETERS.delay.typical.max} turns (typical: immediate to ${LOGIC_PARAMETERS.delay.typical.max})

7. **Metric Ranges**:
   - Core metrics (higher is better): 0-100, baseline 50, critical below 20
   - Inverse metrics (lower is better): 0-100, critical above 80
   - Budget: -100 to 100, baseline 0
   - Approval: 0-100, catastrophic below 15

8. **Options per Scenario**: EXACTLY ${LOGIC_PARAMETERS.scenarioMetadata.optionCount.required} options required

9. **Effects per Option**: At least ${LOGIC_PARAMETERS.optionRequirements.minEffects}, typically ${LOGIC_PARAMETERS.optionRequirements.typicalEffects.min}-${LOGIC_PARAMETERS.optionRequirements.typicalEffects.max}

10. **Required Option Fields**: ${LOGIC_PARAMETERS.optionRequirements.requiredFields.join(', ')}

11. **Consequence Delays**: Follow-up scenarios trigger in ${LOGIC_PARAMETERS.consequenceDelays.typical.min}-${LOGIC_PARAMETERS.consequenceDelays.typical.max} turns

12. **Sign Convention** (CRITICAL):
    - Core metrics: POSITIVE values improve the metric (good outcomes)
    - Inverse metrics (${VALID_METRICS.inverse.join(', ')}): POSITIVE values WORSEN the metric (bad outcomes)
    - Use NEGATIVE values on inverse metrics to improve them
    - Example: 2.0 on metric_corruption means corruption INCREASES (bad)
    - Example: -2.0 on metric_corruption means corruption DECREASES (good)

13. **Narrative–Effect Alignment** (CRITICAL):
    Every consequential outcome you describe in the scenario (description, option text, outcomeSummary) MUST be reflected by at least one effect on the correct metric below. The game updates only these metrics; using the wrong ID or omitting an effect means the player's dashboard will not match the narrative.
    Narrative concept → use this metric ID:
${NARRATIVE_TO_METRIC_ALIGNMENT.map(({ concepts, metricIds, note }) => `    - ${concepts} → ${metricIds}${note ? ` (${note})` : ''}`).join('\n')}

14. **Relationship Token Semantics** (CRITICAL — prevents ally/adversary role confusion):
    HOSTILE tokens ({the_adversary}, {the_border_rival}, {the_regional_rival}, {the_rival}):
    - ONLY use when the foreign actor is threatening, attacking, sanctioning, conducting espionage,
      violating borders, escalating militarily, or acting in bad faith.
    - NEVER use with: aid offers, joint exercises, trade agreements, diplomatic cooperation,
      or any framing where the foreign actor is acting in good faith.
    COOPERATIVE tokens ({the_ally}, {the_partner}, {the_trade_partner}):
    - ONLY use when the foreign actor is supporting, coordinating, providing aid, or acting
      as a willing partner.
    - NEVER use with: sanctions, military threats, territorial claims, espionage, or hostile acts.
    NEUTRAL tokens ({the_neutral}, {the_neighbor}, {the_nation}, {the_player_country}):
    - Use for third-party observers, mediators, or uninvolved parties.
    Generating {the_ally} imposing sanctions or {the_adversary} offering unconditional cooperation
    is semantically invalid output and will be rejected.

15. **Context Token Semantics** (CRITICAL — prevents unrealistic monetary references):
    DESCRIPTIVE tokens (describe the country, never use as line-item amounts):
    - {gdp_description} → Resolves to the ENTIRE national GDP (e.g., "a 25 trillion dollars economy").
      NEVER use as a stolen, siphoned, lost, or misappropriated amount. It is the TOTAL economic output.
    - {economic_scale} → Qualitative descriptor ("the world's largest economy", "small island economy").
    - {population_scale} → "a nation of over 330 million" etc.
    - {geography_type}, {climate_risk} → Geographic/environmental descriptors.

    ADDITIONAL DESCRIPTORS (country context):
    - {military_capability} → Military standing descriptor ("world-class military superpower", "limited defense capacity").
    - {fiscal_condition} → Fiscal health descriptor ("strong fiscal reserves", "manageable debt levels", "persistent deficits").
    - {opposition_leader} → Name or title of the leading opposition figure.

    SCALED MONETARY tokens (auto-proportional to the player's GDP — USE THESE for specific amounts):
    - {graft_amount} → 0.5–3% of GDP. Use for corruption, embezzlement, fraud, misappropriation, graft.
    - {infrastructure_cost} → 1–5% of GDP. Use for construction, disaster damage, development projects.
    - {trade_value} → 5–15% of GDP. Use for trade deal values, trade disruption impacts.
    - {military_budget_amount} → 1.5–4% of GDP. Use for defense spending, military procurement.
    - {aid_amount} → 0.1–1% of GDP. Use for foreign aid packages, humanitarian assistance.
    - {disaster_cost} → 1–8% of GDP. Use for natural disaster recovery, emergency response costs.
    - {sanctions_amount} → 2–10% of GDP. Use for economic sanctions, trade embargo impacts.

    ✅ DO: "officials siphoned {graft_amount}" / "threatens {gdp_description}"
    ❌ NEVER: "siphoned {gdp_description}" / "stole a portion of {gdp_description}"
    ❌ NEVER: invent hard-coded dollar amounts like "$500 million" — always use scaled tokens.
`.trim();
}

/**
 * Validate a metric ID (delegates to canonical source)
 */
export function isValidMetric(metricId: string): boolean {
  return isValidMetricSource(metricId);
}

/**
 * Check if a metric is an inverse metric (delegates to canonical source)
 */
export function isInverseMetric(metricId: string): boolean {
  return isInverseMetricSource(metricId);
}

