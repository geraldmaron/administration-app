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
import type { CompiledTokenRegistry } from '../shared/token-registry-contract';


export const LOGIC_PARAMETERS = {
  effectRanges: {
    minor: { min: 0.3, max: 1.8 },
    moderate: { min: 1.5, max: 4.5 },
    major: { min: 3.5, max: 7.0 }
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
export function getLogicParametersPrompt(severity: 'low' | 'medium' | 'high' | 'extreme' | 'critical' = 'medium', registry?: CompiledTokenRegistry): string {
  const cats: Readonly<Record<string, readonly string[]>> = registry
    ? registry.tokensByCategory
    : (TOKEN_CATEGORIES as Readonly<Record<string, readonly string[]>>);
  const concepts: ReadonlyArray<{ concept: string; token: string }> = registry
    ? registry.conceptToTokenMap
    : _CONCEPT_TO_TOKEN_MAP;

  let magnitudeGuidance: string;
  switch (severity) {
    case 'low':
      magnitudeGuidance = `minor effects (values between ${LOGIC_PARAMETERS.effectRanges.minor.min} and ${LOGIC_PARAMETERS.effectRanges.minor.max})`;
      break;
    case 'medium':
      magnitudeGuidance = `moderate effects (values between ${LOGIC_PARAMETERS.effectRanges.moderate.min} and ${LOGIC_PARAMETERS.effectRanges.moderate.max})`;
      break;
    case 'high':
      magnitudeGuidance = `major effects (values between ${LOGIC_PARAMETERS.effectRanges.moderate.max} and ${LOGIC_PARAMETERS.effectRanges.major.min + 2.5})`;
      break;
    case 'extreme':
      magnitudeGuidance = `major effects (values between ${LOGIC_PARAMETERS.effectRanges.major.min} and ${LOGIC_PARAMETERS.effectRanges.major.max})`;
      break;
    case 'critical':
      magnitudeGuidance = `major effects at the high end (values between ${LOGIC_PARAMETERS.effectRanges.major.min + 1.5} and ${LOGIC_PARAMETERS.effectRanges.major.max})`;
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
   - Executive: {${Array.from(cats['executive'] ?? TOKEN_CATEGORIES.executive).join('}, {')}}
   - Legislative: {${Array.from(cats['legislative'] ?? TOKEN_CATEGORIES.legislative).join('}, {')}}
   - Judicial: {${Array.from(cats['judicial'] ?? TOKEN_CATEGORIES.judicial).join('}, {')}}
   - Ministers: {${Array.from(cats['ministers'] ?? TOKEN_CATEGORIES.ministers).join('}, {')}}
   - Security: {${Array.from(cats['security'] ?? TOKEN_CATEGORIES.security).join('}, {')}}
   - Military: {${Array.from(cats['military'] ?? TOKEN_CATEGORIES.military).join('}, {')}}
   - Economic: {${Array.from(cats['economic'] ?? TOKEN_CATEGORIES.economic).join('}, {')}}
   - Local: {${Array.from(cats['local'] ?? TOKEN_CATEGORIES.local).join('}, {')}}
   - Media: {${Array.from(cats['media'] ?? TOKEN_CATEGORIES.media).join('}, {')}}
   - Country reference — {player_country} for the player's country, {regional_bloc} for regional bodies:
     ✅ "the {player_country} faces..." / "your {player_country}'s economy collapsed"
     ✅ "{regional_bloc} imposed new trade rules" (for EU, ASEAN, African Union, etc.)
     ❌ NEVER hardcode foreign country names — use natural language: "your border rival", "the allied nation", "a neighboring adversary"
   - Write "the {finance_role}" or "your {defense_role}" naturally — NO {the_*} prefix tokens
   - Example: "your {player_country} faces pressure from the {legislature} over {central_bank} policy"

   **CONCEPT → TOKEN** (never hardcode — always use the right token for the concept):
${concepts.map(({ concept, token }) => `   - ${concept} → ${token}`).join('\n')}

   **INTERNATIONAL FINANCIAL BODIES — no token exists, write as plain language:**
   - IMF / International Monetary Fund → "the IMF"
   - World Bank / development bank → "the World Bank"
   - International creditors / lenders / bondholders → "international creditors", "foreign bondholders"
   - Bond markets / sovereign debt markets → "bond markets", "sovereign debt markets"
   - Credit rating agencies / rating agencies → "a credit rating agency"
   - International monitors / oversight bodies → "an international monitor", "the oversight committee"
   NEVER create {international_lender}, {international_investor}, {imf}, {world_bank}, {bond_market}, or similar invented tokens for these concepts.

3. **Effect Values**: ${magnitudeGuidance}
   - Minor: ${LOGIC_PARAMETERS.effectRanges.minor.min}–${LOGIC_PARAMETERS.effectRanges.minor.max} (e.g. 0.4, 0.9, 1.5)
   - Moderate: ${LOGIC_PARAMETERS.effectRanges.moderate.min}–${LOGIC_PARAMETERS.effectRanges.moderate.max} (e.g. 2.1, 3.2, 4.0)
   - Major: ${LOGIC_PARAMETERS.effectRanges.major.min}–${LOGIC_PARAMETERS.effectRanges.major.max} (e.g. 4.2, 5.5, 6.8)
   Use specific decimal values. Whole numbers like 1, 2, or 3 are invalid output.

4. **Effect Probability**: MUST be ${LOGIC_PARAMETERS.probability.required} (deterministic)

5. **Effect Duration**: Between ${LOGIC_PARAMETERS.duration.min} and ${LOGIC_PARAMETERS.duration.typical.max} turns (typical: ${LOGIC_PARAMETERS.duration.typical.min}-${LOGIC_PARAMETERS.duration.typical.max})

6. **Effect Delay**: Between ${LOGIC_PARAMETERS.delay.min} and ${LOGIC_PARAMETERS.delay.typical.max} turns (typical: immediate to ${LOGIC_PARAMETERS.delay.typical.max})

7. **Metric Ranges**:
   - Core metrics (higher is better): 0-100, baseline 50, critical below 20
   - Inverse metrics (lower is better): 0-100, critical above 80
   - Budget: -100 to 100, baseline 0
   - Approval: 0-100, catastrophic below 15

7a. **GAME STATE BASELINE** (CRITICAL for writing realistic conditions):
    Metrics at the START of a new game (turn 1). Use these as your reference when deciding
    whether a condition is realistic to apply to an early-game scenario:
    - Core metrics (economy, health, public_order, military, education, etc.): **50–55**
    - Inverse metrics (corruption, inflation, crime, bureaucracy): **25–30** (low = good)
    - Hidden metrics (unrest, economic_bubble, foreign_influence): **12–18** (low = good)
    - metric_approval: **50**
    - metric_budget: **50**

    WHAT THIS MEANS FOR CONDITIONS:
    - A condition of \`metric_economy max 38\` is NEVER met at game start (economy = 53).
      Only add it when the scenario truly requires an economic crisis to make narrative sense.
    - A condition of \`metric_approval max 30\` is NEVER met at game start (approval = 50).
      Only add it for scenarios that require near-collapse of public trust.
    - A condition of \`metric_corruption min 55\` is NEVER met at game start (corruption = 28).
      Only add it for scenarios where systemic corruption is already entrenched.
    - Scenarios about routine governance (transport costs, broadcaster disputes, regulatory
      reviews, budget tradeoffs) should have NO conditions — they occur in any game state.

    GAME PHASE CONDITION GUIDELINES:
    - **Early game (turns 1–10)**: Loose or NO conditions. Core ≥ 42, inverse ≤ 50.
    - **Mid game (turns 10–25)**: Moderate conditions. Core ≥ 32, inverse ≤ 60, approval ≤ 42.
    - **Late game (turn 25+)**: Crisis conditions valid. Core ≥ 22, inverse ≤ 75, approval ≤ 30.

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

14. **Scenario Conditions** (when to add \`conditions\` to gate eligibility):
    Add \`conditions\` when the scenario only makes sense if the player is in a specific metric state.
    Omit \`conditions\` for general governance challenges that can occur at any metric level.

    Canonical thresholds — use these exact values when a state is required:
    | Metric state                           | metricId                 | operator | value | Reachable at game start? |
    |----------------------------------------|--------------------------|----------|-------|--------------------------|
    | Economic slowdown / mild recession     | metric_economy           | max      | 55    | YES — use for early game |
    | Economic crisis / deep recession       | metric_economy           | max      | 42    | No — mid/late game only  |
    | High unemployment                      | metric_employment        | max      | 45    | No — mid game            |
    | Inflation rising / cost-of-living surge| metric_inflation         | min      | 40    | No — inflation starts ~28|
    | Inflation crisis                       | metric_inflation         | min      | 58    | No — late game           |
    | Budget pressure                        | metric_budget            | max      | 40    | No — budget starts ~50   |
    | Public tension / protests possible     | metric_public_order      | max      | 50    | YES — loose early gate   |
    | Public disorder                        | metric_public_order      | max      | 45    | No — mid game            |
    | Crime elevated                         | metric_crime             | min      | 45    | No — crime starts ~28    |
    | Crime wave                             | metric_crime             | min      | 55    | No — mid/late game       |
    | Corruption elevated                    | metric_corruption        | min      | 45    | No — corruption starts ~28|
    | Corruption crisis / scandal            | metric_corruption        | min      | 55    | No — mid/late game       |
    | Military underfunded                   | metric_military          | max      | 48    | No — military starts ~53 |
    | Diplomatic tension                     | metric_foreign_relations | max      | 48    | No — starts ~53          |
    | Diplomatic crisis                      | metric_foreign_relations | max      | 35    | No — late game           |
    | Approval slipping                      | metric_approval          | max      | 45    | YES — loose early gate   |
    | Approval collapse                      | metric_approval          | max      | 30    | No — mid/late game only  |
    | Authoritarian drift / low liberty      | metric_liberty           | max      | 40    | No                       |
    | Environmental stress                   | metric_environment       | max      | 40    | No                       |

    Examples:
    - Broadcaster dispute (no crisis needed) → \`[]\` (omit conditions entirely)
    - Transport cost surge (no crisis needed) → \`[]\`
    - Budget debate scenario → \`[{ "metricId": "metric_budget", "max": 40 }]\`
    - Crime wave policing scenario → \`[{ "metricId": "metric_crime", "min": 55 }]\`
    - Corruption probe (entrenched corruption) → \`[{ "metricId": "metric_corruption", "min": 45 }]\`
    - Post-riot emergency powers → \`[{ "metricId": "metric_public_order", "max": 45 }, { "metricId": "metric_approval", "max": 45 }]\`

15. **Descriptive and Monetary Token Semantics** (CRITICAL — prevents unrealistic monetary references):
    CONTEXT tokens (describe the country at a qualitative level, never use as line-item amounts):
    - {gdp_description} → Resolves to the ENTIRE national GDP (e.g., "a 25 trillion dollars economy").
      NEVER use as a stolen, siphoned, lost, or misappropriated amount. It is the TOTAL economic output.
    - {economic_scale} → Qualitative descriptor ("the world's largest economy", "small island economy").
    - {population_scale} → "a nation of over 330 million" etc.
    - {fiscal_condition} → Fiscal health descriptor ("strong fiscal reserves", "manageable debt levels", "persistent deficits").

    GEOGRAPHY tokens (spatial/terrain descriptors):
    - {geography_type}, {climate_risk} → Geographic/environmental descriptors.

    MILITARY tokens (military standing descriptor):
    - {military_capability} → Military standing descriptor ("world-class military superpower", "limited defense capacity").

    LEGISLATIVE tokens (political opposition):
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

16. **Option Distinctiveness** (CRITICAL):
    The three options MUST represent genuinely different policy directions. Each option must have at least one effect targeting a **different primary metric domain** from the other two.
    - A quality failure: all three options modify only metric_economy, metric_approval, and metric_public_order.
    - A passing set: Option A targets metric_economy; Option B targets metric_military; Option C targets metric_foreign_relations.
    Useful test: if you swapped the labels and option texts, would a player notice a meaningful difference in consequences? If not, redesign the options.
    Archetypes that work:
    - Option A: economic intervention; Option B: security/order response; Option C: diplomatic/institutional path
    - Option A: short-term relief; Option B: structural reform; Option C: deliberate inaction/delay
    - Option A: favors one constituency at another's expense; Option B: compromise; Option C: coercive/confrontational

17. **Relationship Effects** (for foreign-actor scenarios):
    When the scenario involves a foreign actor (ally, adversary, border rival, trade partner), at least one option MUST include \`relationshipEffects\`.
    Format: \`{ "relationshipId": "ally"|"adversary"|"border_rival"|"trade_partner", "delta": <number>, "probability": <number> }\`
    - delta: −15 to +15. Negative delta worsens the relationship; positive improves it.
    - probability: 0.7–1.0. Use 1.0 for certain diplomatic consequences.
    - Aggressive options → negative delta for allies, positive for adversaries (relationship worsens).
    - Conciliatory options → positive delta for allies, negative for adversaries (relationship improves).
    - At least one option in a foreign-actor scenario should have a relationship delta ≥ |5|.
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
