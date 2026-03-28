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
import { ALL_BUNDLE_IDS, type BundleId } from '../data/schemas/bundleIds';
import type { ScenarioScopeTier } from '../types';

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

const BUNDLE_PROMPT_OVERLAYS: Record<BundleId, BundlePromptOverlay> = {
  economy: {
    architect: 'Center the blueprint on fiscal tradeoffs, inflation pressure, jobs, market confidence, and knock-on budget consequences.',
    drafter: 'Favor concrete economic levers such as taxes, subsidies, debt issuance, price controls, labor support, trade exposure, and central-bank tension. Make option tradeoffs legible for budget, employment, inflation, and approval. When an option raises or lowers taxes, changes spending allocations, or shifts trade policy, include policyImplications targeting the relevant fiscal/policy settings (e.g. fiscal.taxIncome, fiscal.spendingSocial, policy.tradeOpenness).',
  },
  politics: {
    architect: 'Frame the arc around legitimacy, coalition pressure, scandals, constitutional stress, electoral fallout, and elite factional conflict.',
    drafter: 'Favor political maneuvering, legitimacy management, party discipline, institutional brinkmanship, and public narrative control. Options should create visible tradeoffs between stability, democracy, liberty, and approval.',
  },
  military: {
    architect: 'Frame the conflict around escalation risk, deterrence credibility, readiness, civilian costs, alliance signaling, and strategic uncertainty.',
    drafter: 'Favor mobilization, procurement, border security, intelligence, force posture, veterans, and wartime tradeoffs. Keep consequences grounded in military readiness, public order, budget, foreign relations, and approval. When an option increases or decreases military spending or shifts defense posture, include policyImplications targeting fiscal.spendingMilitary and/or policy.defenseSpending.',
  },
  tech: {
    architect: 'Center the arc on cyber risk, AI governance, digital dependence, innovation upside, privacy costs, and infrastructure fragility.',
    drafter: 'Favor cybersecurity, platform regulation, AI deployment, digital sovereignty, surveillance, semiconductor dependence, and broadband or grid resilience. Make the tradeoffs explicit between innovation, liberty, security, and employment.',
  },
  environment: {
    architect: 'Frame the arc around climate shocks, adaptation costs, environmental regulation, resource stress, infrastructure resilience, and public backlash.',
    drafter: 'Favor natural disasters, pollution, emissions controls, land use, resilience spending, relocation, and ecological restoration. Options should force tradeoffs between environment, economy, health, infrastructure, and social stability. When an option tightens or relaxes environmental regulation, include policyImplications targeting policy.environmentalPolicy and/or policy.environmentalProtection.',
  },
  social: {
    architect: 'Center the arc on inequality, education strain, labor unrest, demographic pressure, service delivery, and social cohesion.',
    drafter: 'Favor strikes, welfare reforms, education access, housing stress, migration integration, and inequality-driven backlash. Make the consequences visible across equality, employment, housing, liberty, and approval. When an option changes social spending, healthcare access, education funding, or immigration policy, include policyImplications targeting the relevant settings (e.g. fiscal.spendingSocial, policy.healthcareAccess, policy.educationFunding, policy.immigration).',
  },
  health: {
    architect: 'Frame the arc around public-health capacity, outbreak control, medical scarcity, trust in institutions, and unequal access to care.',
    drafter: 'Favor outbreaks, hospital overload, medicine shortages, vaccine politics, mental health strain, and emergency public-health measures. Keep tradeoffs clear between health, liberty, budget, public order, and approval.',
  },
  diplomacy: {
    architect: 'Center the blueprint on alliances, sanctions, trade leverage, crisis signaling, regional credibility, and diplomatic blowback.',
    drafter: 'Favor sanctions, summit diplomacy, hostage crises, treaty leverage, recognition disputes, tariffs, aid, and alliance bargaining. Make every option expose tradeoffs in foreign relations, trade, sovereignty, military posture, and approval.',
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
    architect: 'Frame the arc around identity conflict, media narratives, censorship pressure, education symbolism, and social polarization.',
    drafter: 'Favor cultural heritage disputes, broadcasting rules, censorship fights, language policy, artistic backlash, and symbolic national controversies. Keep the tradeoffs clear between liberty, equality, public order, and approval.',
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
    architect: 'Optimize for transferability. Avoid country-unique constitutional assumptions, preserve tokenized institutions, and prefer mechanisms that can plausibly occur across many states. CRITICAL: use only domestic, legislature, cabinet, or judiciary for actorPattern — never ally, adversary, border_rival, or mixed. Relationship tokens ({the_ally}, {the_adversary}, {the_border_rival}, etc.) resolve against country-specific geopolitical profiles and are prohibited in universal scenarios. Do not generate concepts that involve foreign countries, neighboring states, rival nations, or bilateral disputes — not even as generic phrases like "a neighboring country". Universal scenarios must be entirely domestic: internal governance crises, institutional disputes, economic policy dilemmas, domestic security decisions, public health emergencies, civil unrest. If a concept cannot exist without a foreign counterpart, it is not universal.',
    drafter: 'Write broadly reusable governance dilemmas grounded in domestic institutions. Reject disguised single-country assumptions, hardcoded constitutional structures, and narrow historical framing. CRITICAL: do not use any relationship tokens ({the_ally}, {the_adversary}, {the_border_rival}, {the_neighbor}, {the_rival}, {the_trade_partner}, {the_regional_rival}, {the_partner}, {the_neutral}) — these tokens depend on country-specific geopolitical data and will fail for most countries. Use domestic political actors, cabinet roles, legislature, or judiciary instead.',
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
    architect: 'Optimize for controlled uniqueness. The concept must justify why it cannot be generalized beyond the narrow target set and must remain tokenized.',
    drafter: 'Use exclusivity sparingly. The scenario must honor the exclusivity reason, fit only the intended countries, and fail if the same idea could be expressed at cluster scope.',
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
const TEMPLATE_CACHE_TTL_MS = 0;

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

export async function getPromptTemplateByVersion(
  name: string,
  version: string
): Promise<PromptTemplate | null> {
  try {
    const db = getFirestore();
    const doc = await db.collection('prompt_templates').doc(`${name}_${version}`).get();
    if (!doc.exists) return null;
    return doc.data() as PromptTemplate;
  } catch (error) {
    console.error('Failed to fetch prompt template by version:', error);
    return null;
  }
}

export async function savePromptTemplate(template: PromptTemplate): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('prompt_templates').doc(`${template.name}_${template.version}`).set({
      ...template,
      updatedAt: Timestamp.now(),
    });
    _templateCache.delete(template.name);
  } catch (error) {
    console.error('Failed to save prompt template:', error);
    throw error;
  }
}

export async function listPromptVersions(name: string): Promise<PromptTemplate[]> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('prompt_templates')
      .where('name', '==', name)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as PromptTemplate);
  } catch (error) {
    console.error('Failed to list prompt versions:', error);
    return [];
  }
}

export async function activatePromptVersion(name: string, version: string): Promise<void> {
  try {
    const db = getFirestore();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(
        db.collection('prompt_templates').where('name', '==', name)
      );
      snapshot.docs.forEach(doc => transaction.update(doc.ref, { active: false }));
      const targetDoc = db.collection('prompt_templates').doc(`${name}_${version}`);
      transaction.update(targetDoc, { active: true, updatedAt: Timestamp.now() });
    });
    _templateCache.delete(name);
  } catch (error) {
    console.error('Failed to activate prompt version:', error);
    throw error;
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
export async function getDrafterPromptBase(): Promise<string> {
  const tokenSection = buildTokenWhitelistPromptSection();
  const template = await getPromptTemplate('drafter_details');
  if (template) return template.sections.constraints.replace('{{TOKEN_SYSTEM}}', tokenSection);
  const local = getLocalFallbackPrompt('drafter_details');
  if (local) {
    console.warn('[PromptTemplates] Using local fallback for drafter_details — seed or activate a Firestore template for production.');
    return local.replace('{{TOKEN_SYSTEM}}', tokenSection);
  }
  throw new Error(
    '[PromptTemplates] No active "drafter_details" prompt template found in Firestore and no local fallback available. ' +
    'Run the seed script or activate a version via activatePromptVersion().'
  );
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
    'Run the seed script or activate a version via activatePromptVersion().'
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
    'Run the seed script or activate a version via activatePromptVersion().'
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
  options?: { lowLatencyMode?: boolean }
): string {
  let prompt = basePrompt;

  if (options?.lowLatencyMode) {
    prompt += '\n\n# LOW-LATENCY MODE\nReturn the smallest valid JSON that still satisfies every schema and audit requirement. Do not add extra explanation or decorative prose beyond what the fields require.\n';
    return prompt;
  }

  if (fewShotExamples && fewShotExamples.length > 0) {
    prompt += '\n\n# PERFECT EXAMPLES\n\nStudy these examples of PERFECT scenarios that meet all requirements:\n\n';
    fewShotExamples.forEach((example, idx) => {
      prompt += `## Example ${idx + 1}: ${example.title}\n\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\n\n`;
    });
    prompt += 'Your output must match this quality level and structure.\n';
  }

  if (reflectionPrompt) {
    prompt += '\n\n' + reflectionPrompt;
  }

  return prompt;
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
