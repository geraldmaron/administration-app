"use strict";
/**
 * Prompt Templates — Firebase-first versioning system.
 *
 * Prompt content lives in the `prompt_templates` Firestore collection.
 * When a template is unavailable (missing or Firestore error), the system
 * falls back to local .prompt.md files in functions/src/prompts/.
 * This ensures generation can proceed even during cold-start or seed-script outages.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPromptTemplate = getPromptTemplate;
exports.getPromptTemplateByVersion = getPromptTemplateByVersion;
exports.savePromptTemplate = savePromptTemplate;
exports.listPromptVersions = listPromptVersions;
exports.activatePromptVersion = activatePromptVersion;
exports.getCurrentPromptVersions = getCurrentPromptVersions;
exports.getDrafterPromptBase = getDrafterPromptBase;
exports.getReflectionPrompt = getReflectionPrompt;
exports.getArchitectPromptBase = getArchitectPromptBase;
exports.buildDrafterPrompt = buildDrafterPrompt;
const firestore_1 = require("firebase-admin/firestore");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------
let firestoreInstance = null;
function getFirestore() {
    if (!firestoreInstance) {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        firestoreInstance = admin.firestore();
    }
    return firestoreInstance;
}
// ---------------------------------------------------------------------------
// TTL cache — prevents redundant Firestore reads during parallel batch generation
// ---------------------------------------------------------------------------
const _templateCache = new Map();
const TEMPLATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
// ---------------------------------------------------------------------------
// Local file fallback
// ---------------------------------------------------------------------------
const LOCAL_PROMPT_MAP = {
    drafter_details: 'drafter.prompt.md',
    architect_drafter: 'architect.prompt.md',
    reflection: 'reflection.prompt.md',
};
function getLocalFallbackPrompt(templateName) {
    const fileName = LOCAL_PROMPT_MAP[templateName];
    if (!fileName)
        return null;
    // __dirname = functions/src/lib in compiled output; prompts/ is a sibling directory
    const filePath = path.join(__dirname, '..', 'prompts', fileName);
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    }
    catch (err) {
        console.warn(`[PromptTemplates] Could not read local fallback at ${filePath}:`, err);
    }
    return null;
}
// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function getPromptTemplate(name) {
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
        if (snapshot.empty)
            return null;
        const data = snapshot.docs[0].data();
        _templateCache.set(name, { data, fetchedAt: now });
        return data;
    }
    catch (error) {
        console.error('Failed to fetch prompt template:', error);
        return null;
    }
}
async function getPromptTemplateByVersion(name, version) {
    try {
        const db = getFirestore();
        const doc = await db.collection('prompt_templates').doc(`${name}_${version}`).get();
        if (!doc.exists)
            return null;
        return doc.data();
    }
    catch (error) {
        console.error('Failed to fetch prompt template by version:', error);
        return null;
    }
}
async function savePromptTemplate(template) {
    try {
        const db = getFirestore();
        await db.collection('prompt_templates').doc(`${template.name}_${template.version}`).set(Object.assign(Object.assign({}, template), { updatedAt: firestore_1.Timestamp.now() }));
    }
    catch (error) {
        console.error('Failed to save prompt template:', error);
        throw error;
    }
}
async function listPromptVersions(name) {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('prompt_templates')
            .where('name', '==', name)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error('Failed to list prompt versions:', error);
        return [];
    }
}
async function activatePromptVersion(name, version) {
    try {
        const db = getFirestore();
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(db.collection('prompt_templates').where('name', '==', name));
            snapshot.docs.forEach(doc => transaction.update(doc.ref, { active: false }));
            const targetDoc = db.collection('prompt_templates').doc(`${name}_${version}`);
            transaction.update(targetDoc, { active: true, updatedAt: firestore_1.Timestamp.now() });
        });
    }
    catch (error) {
        console.error('Failed to activate prompt version:', error);
        throw error;
    }
}
async function getCurrentPromptVersions() {
    var _a, _b, _c;
    const architectTemplate = await getPromptTemplate('architect_drafter');
    const drafterTemplate = await getPromptTemplate('drafter_details');
    const reflectionTemplate = await getPromptTemplate('reflection');
    return {
        architect: (_a = architectTemplate === null || architectTemplate === void 0 ? void 0 : architectTemplate.version) !== null && _a !== void 0 ? _a : 'unknown',
        drafter: (_b = drafterTemplate === null || drafterTemplate === void 0 ? void 0 : drafterTemplate.version) !== null && _b !== void 0 ? _b : 'unknown',
        reflection: (_c = reflectionTemplate === null || reflectionTemplate === void 0 ? void 0 : reflectionTemplate.version) !== null && _c !== void 0 ? _c : 'unknown',
    };
}
// ---------------------------------------------------------------------------
// Required prompt loaders (throw on missing active template)
// ---------------------------------------------------------------------------
/**
 * Load the active drafter prompt base from Firestore, with local file fallback.
 */
async function getDrafterPromptBase() {
    const template = await getPromptTemplate('drafter_details');
    if (template)
        return template.sections.constraints;
    const local = getLocalFallbackPrompt('drafter_details');
    if (local) {
        console.warn('[PromptTemplates] Using local fallback for drafter_details — seed or activate a Firestore template for production.');
        return local;
    }
    throw new Error('[PromptTemplates] No active "drafter_details" prompt template found in Firestore and no local fallback available. ' +
        'Run the seed script or activate a version via activatePromptVersion().');
}
/**
 * Load the active reflection prompt from Firestore, with local file fallback.
 */
async function getReflectionPrompt() {
    const template = await getPromptTemplate('reflection');
    if (template)
        return template.sections.constraints;
    const local = getLocalFallbackPrompt('reflection');
    if (local) {
        console.warn('[PromptTemplates] Using local fallback for reflection — seed or activate a Firestore template for production.');
        return local;
    }
    throw new Error('[PromptTemplates] No active "reflection" prompt template found in Firestore and no local fallback available. ' +
        'Run the seed script or activate a version via activatePromptVersion().');
}
/**
 * Load the active architect prompt from Firestore, with local file fallback.
 */
async function getArchitectPromptBase() {
    const template = await getPromptTemplate('architect_drafter');
    if (template)
        return template.sections.constraints;
    const local = getLocalFallbackPrompt('architect_drafter');
    if (local) {
        console.warn('[PromptTemplates] Using local fallback for architect_drafter — seed or activate a Firestore template for production.');
        return local;
    }
    throw new Error('[PromptTemplates] No active "architect_drafter" prompt template found in Firestore and no local fallback available. ' +
        'Run the seed script or activate a version via activatePromptVersion().');
}
// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------
/**
 * Assemble the final drafter prompt with optional few-shot examples and reflection.
 */
function buildDrafterPrompt(basePrompt, fewShotExamples, reflectionPrompt) {
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
//# sourceMappingURL=prompt-templates.js.map