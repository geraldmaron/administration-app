/**
 * Prompt Templates — Firebase-first versioning system.
 *
 * Prompt content lives in the `prompt_templates` Firestore collection.
 * When a template is unavailable (missing or Firestore error), the system
 * falls back to local .prompt.md files in functions/src/prompts/.
 * This ensures generation can proceed even during cold-start or seed-script outages.
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { BundleScenario } from './audit-rules';
import { buildTokenWhitelistPromptSection } from './token-registry';
import type { CompiledTokenRegistry } from '../shared/token-registry-contract';
import { buildBannedPhrasePromptGuidance } from './audit-rules';
import { ALL_BUNDLE_IDS, type BundleId } from '../data/schemas/bundleIds';
import { ALL_METRIC_IDS } from '../data/schemas/metricIds';
import type { ScenarioScopeTier } from '../types';

const BUNDLE_PRIMARY_METRICS: Record<string, string[]> = {
  economy:     ['metric_economy', 'metric_trade', 'metric_budget', 'metric_inflation', 'metric_employment', 'metric_innovation'],
  military:    ['metric_military', 'metric_sovereignty', 'metric_foreign_relations', 'metric_public_order', 'metric_budget'],
  politics:    ['metric_democracy', 'metric_approval', 'metric_liberty', 'metric_public_order', 'metric_equality'],
  diplomacy:   ['metric_foreign_relations', 'metric_trade', 'metric_sovereignty', 'metric_foreign_influence'],
  health:      ['metric_health', 'metric_budget', 'metric_approval', 'metric_equality', 'metric_infrastructure'],
  environment: ['metric_environment', 'metric_energy', 'metric_economy', 'metric_infrastructure', 'metric_innovation'],
  justice:     ['metric_liberty', 'metric_public_order', 'metric_crime', 'metric_democracy', 'metric_corruption'],
  social:      ['metric_equality', 'metric_education', 'metric_housing', 'metric_approval', 'metric_immigration'],
  corruption:  ['metric_corruption', 'metric_bureaucracy', 'metric_budget', 'metric_approval', 'metric_public_order'],
};

export function buildMetricHintsForSkeleton(bundle: string): string {
  const primary = BUNDLE_PRIMARY_METRICS[bundle.toLowerCase()];
  const allList = ALL_METRIC_IDS.join(', ');
  if (!primary) {
    return `METRICS: Write option text that maps to specific metrics. All valid: ${allList}`;
  }
  return `METRICS THIS SCENARIO SHOULD AFFECT:
Primary (${bundle}): ${primary.join(', ')}
All valid: ${allList}
Write option text with concrete mechanisms that map to specific metrics — not vague outcomes.`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  active: boolean;
  sections: {
    role?: string;
    context?: string;
    constraints: string;
    examples?: string;
    outputFormat: string;
    reflection?: string;
  };
  metadata: {
    createdBy: string;
    successRate?: number;
    avgAuditScore?: number;
    totalAttempts?: number;
  };
}

export interface PromptVersion {
  architect: string;
  drafter: string;
  reflection: string;
}

export interface BundlePromptOverlay {
  architect: string;
  drafter: string;
}

export interface ScopePromptOverlay {
  architect: string;
  drafter: string;
}

export interface BuildDrafterPromptOptions {
  lowLatencyMode?: boolean;
  omitExamples?: boolean;
  omitReflection?: boolean;
}

interface DrafterPromptSection {
  title?: string;
  body: string;
}

const RELATIONSHIP_TOKEN_POLICY_SECTION = `
## Relationship actor policy (hard requirement)
- Relationship actors MUST be written as natural language in prose: "your border rival", "the allied government", "your adversary", "your trade partner".
- Never use relationship placeholder tokens in prose ({the_ally}, {ally}, {the_adversary}, {adversary}, {the_border_rival}, {border_rival}, etc.).
- Keep role/institution tokens for domestic institutions ({leader_title}, {the_legislature}, {finance_role}, {the_central_bank}, etc.).
- If a relationship is structurally required, encode it in metadata.requires and relationshipEffects/relationship_conditions, not in prose token placeholders.
`.trim();

const BUNDLE_PROMPT_OVERLAYS: Record<BundleId, BundlePromptOverlay> = {
  economy: {
    architect: 'Center the blueprint on fiscal tradeoffs, inflation pressure, jobs, market confidence, and knock-on budget consequences. Include sovereign debt stress, IMF conditionality negotiations, debt restructuring, and structural adjustment tradeoffs as valid arc types — especially scenarios where austerity measures trigger social unrest or where defaulting on obligations forces hard political choices.',
    drafter: 'Favor concrete economic levers such as taxes, subsidies, debt issuance, price controls, labor support, trade exposure, and central-bank tension. Also include sovereign default risk, IMF loan conditions, debt restructuring negotiations, and the tradeoffs of structural adjustment programs. Make option tradeoffs legible for budget, employment, inflation, and approval. When an option raises or lowers taxes, changes spending allocations, or shifts trade policy, include policyImplications targeting the relevant fiscal/policy settings (e.g. fiscal.taxIncome, fiscal.spendingSocial, policy.tradeOpenness).',
  },
  politics: {
    architect: 'Frame the arc around legitimacy, coalition pressure, scandals, constitutional stress, electoral fallout, and elite factional conflict. Include disinformation campaigns, foreign election interference, and state-sponsored media manipulation as valid arc types — situations where the information environment itself becomes a governance threat requiring a policy response.',
    drafter: 'Favor political maneuvering, legitimacy management, party discipline, institutional brinkmanship, and public narrative control. Also include disinformation crises, foreign interference in electoral processes, and state media capture. Options should create visible tradeoffs between stability, democracy, liberty, and approval.',
  },
  military: {
    architect: 'Frame the conflict around escalation risk, deterrence credibility, readiness, civilian costs, alliance signaling, and strategic uncertainty.',
    drafter: 'Favor mobilization, procurement, border security, intelligence, force posture, veterans, and wartime tradeoffs. Keep consequences grounded in military readiness, public order, budget, foreign relations, and approval. When an option increases or decreases military spending or shifts defense posture, include policyImplications targeting fiscal.spendingMilitary and/or policy.defenseSpending.',
  },
  tech: {
    architect: 'Center the arc on cyber risk, AI governance, digital dependence, innovation upside, privacy costs, and infrastructure fragility. Include AI-generated propaganda, deepfakes used in political manipulation, platform-enabled information operations, and state actor interference via digital means as valid arc types.',
    drafter: 'Favor cybersecurity, platform regulation, AI deployment, digital sovereignty, surveillance, semiconductor dependence, and broadband or grid resilience. Also include AI-generated disinformation, deepfake crises, state-sponsored information operations, and platform manipulation by foreign actors. Make the tradeoffs explicit between innovation, liberty, security, and employment.',
  },
  environment: {
    architect: 'Frame the arc around climate shocks, adaptation costs, environmental regulation, resource stress, infrastructure resilience, and public backlash.',
    drafter: 'Favor natural disasters, pollution, emissions controls, land use, resilience spending, relocation, and ecological restoration. Options should force tradeoffs between environment, economy, health, infrastructure, and social stability. When an option tightens or relaxes environmental regulation, include policyImplications targeting policy.environmentalPolicy and/or policy.environmentalProtection.',
  },
  social: {
    architect: 'Center the arc on inequality, education strain, labor unrest, demographic pressure, service delivery, and social cohesion. Include refugee and migration crises as valid arc types: mass displacement events, asylum seeker integration strain, internal displacement from conflict or climate, and the political pressure of hosting large refugee populations.',
    drafter: 'Favor strikes, welfare reforms, education access, housing stress, migration integration, and inequality-driven backlash. Also include mass displacement crises, asylum seeker processing backlogs, refugee camp conditions, host community tension, and internal displacement from conflict or disaster. Make the consequences visible across equality, employment, housing, liberty, and approval. When an option changes social spending, healthcare access, education funding, or immigration policy, include policyImplications targeting the relevant settings (e.g. fiscal.spendingSocial, policy.healthcareAccess, policy.educationFunding, policy.immigration).',
  },
  health: {
    architect: 'Frame the arc around public-health capacity, outbreak control, medical scarcity, trust in institutions, and unequal access to care.',
    drafter: 'Favor outbreaks, hospital overload, medicine shortages, vaccine politics, mental health strain, and emergency public-health measures. Keep tradeoffs clear between health, liberty, budget, public order, and approval.',
  },
  diplomacy: {
    architect: 'Center the blueprint on alliances, sanctions, trade leverage, crisis signaling, regional credibility, and diplomatic blowback. Include cross-border refugee flows and migration diplomacy as valid arc types: burden-sharing negotiations with neighbors, bilateral agreements over displaced populations, and situations where refugee flows become a coercive diplomatic instrument. UNIVERSAL SCOPE EXCEPTION: when scopeTier is universal, foreign-counterpart interactions are forbidden — center instead on the domestic political economy of foreign policy: trade pact ratification fights in the legislature, sanctions coalition politics within cabinet, foreign aid appropriation battles, treaty withdrawal crises, and asylum system design debates. The scenario must be entirely domestic even though the subject matter is foreign policy.',
    drafter: 'Favor sanctions, summit diplomacy, hostage crises, treaty leverage, recognition disputes, tariffs, aid, and alliance bargaining. Also include refugee burden-sharing negotiations, migration diplomacy with origin and transit countries, and scenarios where a neighbor uses refugee flows as political leverage. Make every option expose tradeoffs in foreign relations, trade, sovereignty, military posture, and approval. UNIVERSAL SCOPE: if the scenario is universal, use only domestic political actors — legislature ratifying or blocking a treaty, cabinet factions splitting over a sanctions vote, a foreign aid budget debate. Do not introduce foreign counterparts or relationship tokens.',
  },
  justice: {
    architect: 'Frame the arc around judicial legitimacy, policing strain, civil liberties, sentencing choices, and the state’s response to disorder.',
    drafter: 'Favor court reform, prosecutorial discretion, prison policy, crime waves, emergency powers, and judicial independence. Make the tradeoffs visible between public order, liberty, equality, democracy, and corruption.',
  },
  corruption: {
    architect: 'Center the arc on graft networks, procurement abuse, elite impunity, anti-corruption drives, and the political cost of enforcement.',
    drafter: 'Favor bribery scandals, procurement fraud, shell companies, whistleblowers, watchdog bodies, and integrity crackdowns. Make the tradeoffs explicit between corruption, bureaucracy, economy, democracy, and approval.',
  },
  culture: {
    architect: 'Frame the arc around identity conflict, media narratives, censorship pressure, education symbolism, and social polarization. Include religious and sectarian conflict as valid arc types: faith-based governance tensions, sectarian violence between communities, religious law versus secular state disputes, and the political pressure of managing competing religious authorities.',
    drafter: 'Favor cultural heritage disputes, broadcasting rules, censorship fights, language policy, artistic backlash, and symbolic national controversies. Also include religious/sectarian conflict, faith-based governance tensions, disputes over religious law in secular states, and sectarian violence requiring a government response. Keep the tradeoffs clear between liberty, equality, public order, and approval.',
  },
  infrastructure: {
    architect: 'Center the arc on service reliability, maintenance backlogs, disaster resilience, logistics bottlenecks, and capital-investment tradeoffs.',
    drafter: 'Favor transit breakdowns, grid failures, water systems, ports, rail, telecoms, and public works. Make option tradeoffs explicit for infrastructure, economy, housing, environment, and budget.',
  },
  resources: {
    architect: 'Frame the arc around extraction, scarcity, energy security, water stress, export leverage, and local backlash from resource decisions.',
    drafter: 'Favor mining, drilling, water allocation, food or fuel scarcity, export controls, and commodity dependence. Make the tradeoffs legible across energy, trade, environment, sovereignty, and public order.',
  },
  dick_mode: {
    architect: 'Frame the arc around coercion, repression, fear-based control, moral compromise, and strategic cruelty while keeping the scenario politically grounded.',
    drafter: 'Favor authoritarian, censorial, and morally dark options, but keep them plausible state actions rather than cartoon villainy. Make the costs explicit in liberty, equality, democracy, foreign relations, unrest, and approval.',
  },
};

const SCOPE_PROMPT_OVERLAYS: Record<ScenarioScopeTier, ScopePromptOverlay> = {
  universal: {
    architect: 'Optimize for transferability. Avoid country-unique constitutional assumptions and prefer mechanisms that can plausibly occur across many states. CRITICAL: use only domestic, legislature, cabinet, or judiciary for actorPattern — never ally, adversary, border_rival, or mixed. Universal scenarios must be entirely domestic: internal governance crises, institutional disputes, economic policy dilemmas, domestic security decisions, public health emergencies, civil unrest. Do not generate concepts that involve foreign countries, neighboring states, rival nations, or bilateral disputes. If a concept cannot exist without a foreign counterpart, it is not universal. Do not set metadata.requires — universal scenarios have no structural geopolitical preconditions.',
    drafter: 'Write broadly reusable governance dilemmas grounded in domestic institutions. Reject disguised single-country assumptions, hardcoded constitutional structures, and narrow historical framing. Use only domestic political actors: cabinet roles ({finance_role}, {defense_role}, etc.), {legislature}, {governing_party}, {judiciary_body}. Do not write about foreign relationship actors (adversaries, allies, rivals, trade partners) — not even as natural language ("your adversary", "a neighboring rival"). Omit metadata.requires and relationshipEffects entirely.',
  },
  regional: {
    architect: 'Optimize for regional realism. Use geography, regional alliances, migration routes, weather systems, and cross-border knock-on effects that make causal sense within the target region. Prefer plain-language news wording over think-tank jargon.',
    drafter: 'Inject region-relevant causal chains and pressure sources without hardcoding country names. Favor regional trade, border, climate, and alliance dynamics that still transfer within the same region.',
  },
  cluster: {
    architect: 'Optimize for shared-structure realism. The concept should fit multiple countries in the same cluster and be stronger than a universal prompt without becoming country-exclusive.',
    drafter: 'Use the cluster brief to produce scenarios that feel institutionally specific yet still portable across the cluster. Reject single-country assumptions unless they are justified by the cluster itself.',
  },
  exclusive: {
    architect: 'Optimize for controlled uniqueness. The concept must justify why it cannot be generalized beyond the narrow target set. Because this scenario targets a specific country, you may use that country\'s real institution names (e.g. "Bundestag", "Académie française") rather than generic tokens — but institutional role tokens ({finance_role}, {leader_title}, etc.) are still preferred for roles that vary by person. Set metadata.requires to declare any geopolitical preconditions. If the scenario involves a foreign relationship actor, write them as natural language and add relationshipEffects on options that would affect that relationship.',
    drafter: 'This scenario runs for a specific country only — you may reference that country\'s real institution names where they add specificity. Use institutional role tokens ({leader_title}, {finance_role}, etc.) for personnel roles. Write foreign relationship actors as natural language ("your border rival", "the allied government"). Set metadata.requires for any geopolitical preconditions and add relationshipEffects on options whose outcomes would realistically change a relationship score. Reject the scenario if the same idea could be expressed at cluster scope.',
  },
};

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

let firestoreInstance: FirebaseFirestore.Firestore | null = null;

function getFirestore(): FirebaseFirestore.Firestore {
  if (!firestoreInstance) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance!;
}

// ---------------------------------------------------------------------------
// Active prompt resolution
// ---------------------------------------------------------------------------

const _templateCache = new Map<string, { data: PromptTemplate; fetchedAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Local file fallback
// ---------------------------------------------------------------------------

const LOCAL_PROMPT_MAP: Record<string, string> = {
  drafter_details: 'drafter.prompt.md',
  architect_drafter: 'architect.prompt.md',
  reflection: 'reflection.prompt.md',
};

function getLocalFallbackPrompt(templateName: string): string | null {
  const fileName = LOCAL_PROMPT_MAP[templateName];
  if (!fileName) return null;
  // __dirname = functions/src/lib in compiled output; prompts/ is a sibling directory
  const filePath = path.join(__dirname, '..', 'prompts', fileName);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    console.warn(`[PromptTemplates] Could not read local fallback at ${filePath}:`, err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function getPromptTemplate(name: string): Promise<PromptTemplate | null> {
  const now = Date.now();
  const cached = _templateCache.get(name);
  if (cached && (now - cached.fetchedAt) < TEMPLATE_CACHE_TTL_MS) {
    return cached.data;
  }
  try {
    const db = getFirestore();
    const snapshot = await db.collection('prompt_templates')
      .where('name', '==', name)
      .where('active', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as PromptTemplate;
    _templateCache.set(name, { data, fetchedAt: now });
    return data;
  } catch (error) {
    console.error('Failed to fetch prompt template:', error);
    return null;
  }
}

export async function getCurrentPromptVersions(): Promise<PromptVersion> {
  const architectTemplate = await getPromptTemplate('architect_drafter');
  const drafterTemplate = await getPromptTemplate('drafter_details');
  const reflectionTemplate = await getPromptTemplate('reflection');

  return {
    architect: architectTemplate?.version ?? 'unknown',
    drafter: drafterTemplate?.version ?? 'unknown',
    reflection: reflectionTemplate?.version ?? 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Required prompt loaders (throw on missing active template)
// ---------------------------------------------------------------------------

/**
 * Load the active drafter prompt base from Firestore, with local file fallback.
 */
export async function getDrafterPromptBase(registry?: CompiledTokenRegistry): Promise<string> {
  const tokenSection = buildTokenWhitelistPromptSection(registry);
  const bannedPhraseGuidance = buildBannedPhrasePromptGuidance();
  const applyReplacements = (text: string) =>
    [
      text.replace('{{TOKEN_SYSTEM}}', tokenSection).replace('{{BANNED_PHRASE_GUIDANCE}}', bannedPhraseGuidance),
      RELATIONSHIP_TOKEN_POLICY_SECTION,
    ].join('\n\n');
  const template = await getPromptTemplate('drafter_details');
  if (template) return applyReplacements(template.sections.constraints);
  const local = getLocalFallbackPrompt('drafter_details');
  if (local) {
    console.warn('[PromptTemplates] Using local fallback for drafter_details — seed or activate a Firestore template for production.');
    return applyReplacements(local);
  }
  throw new Error(
    '[PromptTemplates] No active "drafter_details" prompt template found in Firestore and no local fallback available. ' +
    'Run the seed script or activate a Firestore template for production.'
  );
}

export function getCompactDrafterPromptBase(): string {
  return `## Role
You are The Drafter for The Administration.

Write valid JSON only.

## Voice
- description, options[].text, advisorFeedback[].feedback: second person.
- outcomeHeadline, outcomeSummary, outcomeContext: third-person news style.
- Never use "you" or "your" in outcome fields.

## Hard Rules
- Use only approved {token} placeholders already provided in the surrounding prompt/context.
- Never invent tokens.
- Never output the literal substring "the {".
- Never use relationship tokens in prose ({the_ally}, {ally}, {the_adversary}, {adversary}, {the_border_rival}, etc.). Use natural language relationship actors instead.
- Never use hardcoded country names, capitals, party names, or institution names.
- If scopeTier is universal, keep the scenario entirely domestic. Do not use relationship tokens like {the_trade_partner}, {the_ally}, or {the_adversary}. Use legislature, cabinet, courts, markets, prices, employers, unions, or regulators instead.
- Title: 4-8 words, concrete headline style, no tokens.
- Title must contain a verb and named institutional actor. Forbidden endings: Crisis, Debate, Decision, Dilemma, Challenge, Conflict, Response, Options.
- Description: 2-3 sentences, 60-140 words.
- Count words before returning. If description is under 60 words, expand it with trigger, actors, and concrete stakes.
- Exactly 3 options.
- Each option text: 2-3 sentences, 50-80 words.
- Count words before returning. If any option text is under 50 words, expand it with mechanism, trade-off, and affected constituency.
- Each option label: max 3 words, plain text, no tokens.
- Each option: exactly 3 effects preferred, never more than 4.
- If concept context provides optionDomains, each option MUST include at least one effect targeting its assigned primary metric and each option must keep at least one unique effect metric not shared by all options.
- **INVERSE METRICS — SIGN RULE (VIOLATION = REJECTED)**:
  corruption, inflation, crime, bureaucracy are INVERSE metrics (lower = better for player).
  ALL effect values on inverse metrics MUST be NEGATIVE.
  To worsen corruption (raise it): value = -1.5 (negative). To reduce corruption (lower it): DO NOT target it; target a positive metric instead.
  Example: { "targetMetricId": "metric_corruption", "value": -1.8 } ← CORRECT (corruption gets worse)
  WRONG: { "targetMetricId": "metric_corruption", "value": 1.8 } ← REJECTED (positive on inverse)
- outcomeHeadline: 3-15 words.
- outcomeSummary: 2-3 sentences, at least 250 characters.
- outcomeContext: 4-6 sentences, 70-100 words, at least 400 characters.
- Outcome fields must stay grounded in the listed effects. Do not invent GDP percentages, exchange-rate moves, layoffs, shortages, approval crashes, or foreign retaliation unless those consequences are reflected in effects.
- Every option must include advisorFeedback for all 13 canonical roles.
- Use active voice and plain language.

## Canonical advisor roles
role_executive, role_diplomacy, role_defense, role_economy, role_justice, role_health, role_commerce, role_labor, role_interior, role_energy, role_environment, role_transport, role_education

## Output contract
Return only the requested scenario JSON object matching the schema. No prose outside JSON.`;
}

function buildLowLatencyDrafterSection(): DrafterPromptSection {
  return {
    title: 'LOW-LATENCY MODE',
    body: 'Return the smallest valid JSON that still satisfies every schema and audit requirement. Do not add extra explanation or decorative prose beyond what the fields require.',
  };
}

function buildFewShotExamplesSection(fewShotExamples: BundleScenario[]): DrafterPromptSection {
  const examplesBody = fewShotExamples
    .map((example, idx) => `## Example ${idx + 1}: ${example.title}\n\
\
\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\n`)
    .join('\n');

  return {
    title: 'PERFECT EXAMPLES',
    body: `Study these examples of PERFECT scenarios that meet all requirements:\n\n${examplesBody}\nYour output must match this quality level and structure.`,
  };
}

function buildReflectionSection(reflectionPrompt: string): DrafterPromptSection {
  return {
    body: reflectionPrompt,
  };
}

function assemblePromptSections(sections: readonly DrafterPromptSection[]): string {
  return sections
    .map((section) => section.title ? `# ${section.title}\n${section.body}` : section.body)
    .join('\n\n');
}

/**
 * Ollama sub-phase prompt: Skeleton (Phase A)
 * Focused prompt for generating title, description, and 3 option texts only.
 * Designed to stay under 3000 input tokens for local models.
 */
export function getOllamaSkeletonPrompt(params: {
  concept: string;
  bundle: string;
  scopeTier: string;
  scopeNote: string;
  countryNote: string;
  countryContextBlock: string;
  bundleGuidance: string;
  scopeGuidance: string;
  tokenContext: string;
}): string {
  const isUniversal = params.scopeTier === 'universal';
  return `You are The Drafter for The Administration — a political simulation game.
Generate a governance scenario as JSON.

CONCEPT: "${params.concept}"
BUNDLE: ${params.bundle}
${params.scopeNote}
${params.countryNote}

${params.tokenContext}

VOICE RULES:
- description and option text: use "you" / "your" (second person, addressing the player leader).
- NEVER use "the government", "the administration", or third-person framing ("the president decided") — say "you" or "your cabinet".
- When using an introductory framing clause, use the leader token: ✅ "As {leader_title} of {the_player_country}, you face..." ❌ "As you of {the_player_country}..."
- BANNED phrases in option text: "aims to", "but risks", "but may", "could lead to", "at the cost of", "balances X with Y", "prioritizes X over Y", "risks provoking", "threatens to"

TOKEN RULES:
- Use {token} placeholders for institutions, roles, parties, and currencies (e.g., {finance_role}, {legislature}, {central_bank}).
- Use {the_player_country} as the subject/object; use {player_country}'s for possessives.
- Use {regional_bloc} for regional bodies (EU, ASEAN, African Union, etc.).
- NEVER hardcode country names, capitals, party names, or institution names.
- For foreign actors, use plain language: "your border rival", "the allied nation", "a neighboring adversary" — never invent relationship tokens.
- Use only the exact token spellings shown in the Token System above. Do NOT synthesize a {the_*} article-form token unless that exact token appears there.
${isUniversal ? '- UNIVERSAL SCOPE: keep entirely domestic. No foreign nation actors.' : ''}

STRUCTURE:
- title: 4-8 words, headline style, contains a past-tense or present-tense verb and an institutional actor. No tokens in title.
  TITLE RULES — titles MUST read like a news headline:
  ✅ "Parliament Blocks Emergency Bill", "Generals Threaten Mass Resignation", "Central Bank Freezes Currency Reserves"
  ❌ NEVER start with: "Navigate", "Navigating", "Resolve", "Manage", "Managing", "Balance", "Balancing", "Handle", "Handling", "Decide on", "Address"
  ❌ NEVER end with: "Crisis", "Challenge", "Conflict", "Dilemma", "Debate", "Decision", "Response", "Dispute", "Standoff", "Transition"
- description: 2-3 sentences, 60-140 words. Include the trigger event, key actors, and concrete stakes.
- Exactly 3 options, each with:
  - id: "opt_a", "opt_b", "opt_c"
  - text: 2-3 sentences, 50-80 words. Describe the action, mechanism, and trade-off.
  - label: 1-3 words, plain text, no tokens.

QUALITY RULES:
- Description: exactly 2-3 sentences. Each sentence under 30 words. Total 60-140 words.
- Option text: exactly 2-3 sentences. Each sentence under 30 words. Total 50-100 words. Describe the concrete action and mechanism — do not telegraph the outcome.
- NEVER hardcode institution names (Supreme Court, National Guard, Central Bank, Department of X, Congress, Senate). Use {token} placeholders.
- NEVER hardcode country names, currency names, or compass directions (northern, eastern).
- Every {token} must exist in the TOKEN SYSTEM above. Do NOT invent tokens.

${buildMetricHintsForSkeleton(params.bundle)}

${params.bundleGuidance}
${params.scopeGuidance}

Return ONLY the JSON object matching the schema. No prose outside JSON.`;
}

/**
 * Ollama sub-phase prompt: Effects & Outcomes (Phase B)
 * Focused prompt for generating effects, outcomes, and classifications.
 * Receives the skeleton from Phase A as context.
 */
export function getOllamaEffectsPrompt(params: {
  skeleton: { title: string; description: string; options: Array<{ id: string; text: string; label: string }> };
  bundle: string;
  validMetricIds: string[];
  inverseMetrics: string[];
  scopeTier: string;
  optionDomains?: Array<{ label: string; primaryMetric: string }>;
}): string {
  const optionsSummary = params.skeleton.options
    .map(o => `- ${o.id} (${o.label}): ${o.text}`)
    .join('\n');
  const metricList = params.validMetricIds.join(', ');
  const inverseList = params.inverseMetrics.join(', ');
  const optionDomainRules = Array.isArray(params.optionDomains) && params.optionDomains.length === 3
    ? `\nOPTION DOMAIN REQUIREMENTS:\n${params.optionDomains.map((domain, index) => `- Option ${index + 1} (${domain.label}): MUST include at least one effect with targetMetricId=${domain.primaryMetric}`).join('\n')}`
    : '';

  return `Generate effects, outcomes, and classifications for each option in this scenario.

SCENARIO: "${params.skeleton.title}"
${params.skeleton.description}

OPTIONS:
${optionsSummary}

BUNDLE: ${params.bundle}
${optionDomainRules}

For EACH of the 3 options, generate:

EFFECTS (2-4 per option):
- targetMetricId: MUST be one of: ${metricList}
- value: number between -4.0 and +4.0 (magnitude of impact)
- type: "delta"
- duration: 1-20 (turns the effect lasts)
- probability: 1.0
- At least 1 effect MUST target a metric in the ${params.bundle} domain.
- Each option MUST affect at least one metric the other two options do not target. Do not give all three options the same metric set.
- INVERSE METRICS (${inverseList}): ALL values MUST be NEGATIVE. Positive values = instant rejection.

OUTCOMES — third-person news report style:
- NEVER use "you" or "your". Use {leader_title} or {the_player_country} instead.
- Use {token} placeholders for institutions, roles, and actors (e.g., {finance_role}, {legislature}, {central_bank}). NEVER hardcode institution names (Supreme Court, National Guard, Central Bank, Department of X).
- Use only the exact token spellings shown in the Token System above. Do NOT invent {the_*} variants for roles unless they are explicitly listed there.
- NEVER hardcode country names, capital cities, party names, or currency names.
- Keep every sentence under 30 words. Use active voice.
- outcomeHeadline: 3-15 words, newspaper headline
- outcomeSummary: 2-3 sentences, at least 250 characters, journalistic lede covering what happened and immediate consequence
- outcomeContext: 4-6 sentences, 70-100 words, at least 400 characters. Describe institutional reactions, second-order consequences, and political fallout. Each outcome must be unique to its option — not generic.
- BANNED phrases in outcomes: "stakeholders", "mixed reactions", "cautious optimism", "continue to assess", "cascading effects", "institutional stability", "broader implications", "evolving situation", "second-order effects", "implementation teams"

CLASSIFICATION:
- is_authoritarian: boolean (true if this option curtails rights, concentrates power, or bypasses institutions)
- moral_weight: -1.0 to 1.0
- classification.riskLevel: safe | moderate | risky | dangerous
- classification.ideology: left | center | right
- classification.approach: diplomatic | economic | military | humanitarian | administrative

Return JSON with { options: [{ id, effects, outcomeHeadline, outcomeSummary, outcomeContext, is_authoritarian, moral_weight, classification }] }`;
}

/**
 * Load the active reflection prompt from Firestore, with local file fallback.
 */
export async function getReflectionPrompt(): Promise<string> {
  const template = await getPromptTemplate('reflection');
  if (template) return template.sections.constraints;
  const local = getLocalFallbackPrompt('reflection');
  if (local) {
    console.warn('[PromptTemplates] Using local fallback for reflection — seed or activate a Firestore template for production.');
    return local;
  }
  throw new Error(
    '[PromptTemplates] No active "reflection" prompt template found in Firestore and no local fallback available. ' +
    'Run the seed script or activate a Firestore template for production.'
  );
}

/**
 * Load the active architect prompt from Firestore, with local file fallback.
 */
export async function getArchitectPromptBase(): Promise<string> {
  const template = await getPromptTemplate('architect_drafter');
  if (template) return template.sections.constraints;
  const local = getLocalFallbackPrompt('architect_drafter');
  if (local) {
    console.warn('[PromptTemplates] Using local fallback for architect_drafter — seed or activate a Firestore template for production.');
    return local;
  }
  throw new Error(
    '[PromptTemplates] No active "architect_drafter" prompt template found in Firestore and no local fallback available. ' +
    'Run the seed script or activate a Firestore template for production.'
  );
}

export function getBundlePromptOverlay(bundle: BundleId): BundlePromptOverlay {
  return BUNDLE_PROMPT_OVERLAYS[bundle];
}

export function getScopePromptOverlay(scopeTier: ScenarioScopeTier): ScopePromptOverlay {
  return SCOPE_PROMPT_OVERLAYS[scopeTier];
}

export function getBundlesWithPromptOverlays(): readonly BundleId[] {
  return ALL_BUNDLE_IDS.filter((bundleId) => Boolean(BUNDLE_PROMPT_OVERLAYS[bundleId]));
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the final drafter prompt with optional few-shot examples and reflection.
 */
export function buildDrafterPrompt(
  basePrompt: string,
  fewShotExamples?: BundleScenario[],
  reflectionPrompt?: string,
  options?: BuildDrafterPromptOptions
): string {
  const sections: DrafterPromptSection[] = [{ body: basePrompt }];

  const isLowLatency = Boolean(options?.lowLatencyMode);

  if (isLowLatency) {
    sections.push(buildLowLatencyDrafterSection());
  }

  if (!(options?.omitExamples || isLowLatency) && fewShotExamples && fewShotExamples.length > 0) {
    sections.push(buildFewShotExamplesSection(fewShotExamples));
  }

  if (!(options?.omitReflection || isLowLatency) && reflectionPrompt) {
    sections.push(buildReflectionSection(reflectionPrompt));
  }

  return assemblePromptSections(sections);
}

export function buildArchitectPrompt(
  basePrompt: string,
  options?: { lowLatencyMode?: boolean }
): string {
  if (!options?.lowLatencyMode) {
    return basePrompt;
  }

  return `# LOW-LATENCY MODE
You are The Architect for The Administration.

Return valid JSON only.

Rules:
- Write plain-language, human-readable governance dilemmas.
- Use approved tokens only for countries, leaders, institutions, alliances, and money.
- Never use literal country names, capitals, party names, or real alliance names.
- Keep each concept realistic, politically grounded, and appropriate for the requested bundle and scope.
- Make the dilemma clear, with real tradeoffs and no obvious best answer.
- Use only canonical metric IDs in primaryMetrics and secondaryMetrics.
- Keep each concept concise: 2 short sentences are enough.
- Prefer domestic actors unless scope clearly justifies foreign actors.
- Do not add explanation outside the requested JSON shape.`;
}
