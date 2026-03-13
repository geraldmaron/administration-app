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
// TTL cache — prevents redundant Firestore reads during parallel batch generation
// ---------------------------------------------------------------------------

const _templateCache = new Map<string, { data: PromptTemplate; fetchedAt: number }>();
const TEMPLATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
  const template = await getPromptTemplate('drafter_details');
  if (template) return template.sections.constraints;
  const local = getLocalFallbackPrompt('drafter_details');
  if (local) {
    console.warn('[PromptTemplates] Using local fallback for drafter_details — seed or activate a Firestore template for production.');
    return local;
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

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the final drafter prompt with optional few-shot examples and reflection.
 */
export function buildDrafterPrompt(
  basePrompt: string,
  fewShotExamples?: BundleScenario[],
  reflectionPrompt?: string
): string {
  let prompt = basePrompt;

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
