import * as path from 'path';
import * as fs from 'fs';
import {
  TOKEN_CATEGORIES,
  TOKEN_ALIAS_MAP,
  CONCEPT_TO_TOKEN_MAP,
  ALL_TOKENS,
  ARTICLE_FORM_TOKEN_NAMES,
} from '../lib/token-registry';
import {
  TokenRegistryDocument,
  TokenDefinition,
  TokenAliasDefinition,
  ConceptMappingDefinition,
  TokenCategory,
  compileTokenRegistry,
} from '../shared/token-registry-contract';

// ── Env + Firebase bootstrap (follows local-gen-server.ts pattern) ────────

function loadEnvFromFile(): void {
  const envPaths = ['.env.cli', '.env.local', '.env'].map(
    (f) => path.join(__dirname, '..', '..', f),
  );
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

loadEnvFromFile();

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'serviceAccountKey.json');

async function initializeFirebase(): Promise<typeof import('firebase-admin')> {
  const admin = await import('firebase-admin');
  if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'the-administration-3a072',
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ projectId: 'the-administration-3a072' });
    } else {
      console.error('[seed] No Firebase credentials found.');
      console.error('  Provide serviceAccountKey.json at project root, or set GOOGLE_APPLICATION_CREDENTIALS.');
      process.exit(1);
    }
  }
  return admin;
}

// ── Data categories (article_forms excluded — derived from articleForm flag) ──

const CATEGORY_KEYS: readonly TokenCategory[] = [
  'executive', 'legislative', 'judicial', 'ministers', 'security',
  'military', 'economic', 'local', 'media',
  'relationships', 'geography', 'amounts', 'context',
];

// ── Build the TokenRegistryDocument from hardcoded data ───────────────────

function buildRegistryDocument(): TokenRegistryDocument {
  const articleFormBaseNames = new Set(
    TOKEN_CATEGORIES.article_forms
      .filter((t) => t.startsWith('the_'))
      .map((t) => t.slice(4)),
  );

  const DYNAMIC_TOKENS = new Set([
    'governing_party', 'governing_party_leader', 'governing_party_ideology',
    'governing_party_short', 'coalition_party',
    'opposition_party', 'opposition_party_leader', 'opposition_leader',
  ]);

  const tokensByName: Record<string, TokenDefinition> = {};
  const seen = new Set<string>();

  for (const category of CATEGORY_KEYS) {
    const tokens = TOKEN_CATEGORIES[category] as readonly string[];
    for (const name of tokens) {
      if (seen.has(name)) continue;
      seen.add(name);
      tokensByName[name] = {
        name,
        category,
        enabled: true,
        ...(DYNAMIC_TOKENS.has(name) ? { dynamic: true } : {}),
        ...(articleFormBaseNames.has(name) ? { articleForm: { enabled: true } } : {}),
      };
    }
  }

  const aliasesByName: Record<string, TokenAliasDefinition> = {};
  for (const [alias, targetToken] of Object.entries(TOKEN_ALIAS_MAP)) {
    aliasesByName[alias] = {
      alias,
      targetToken,
      source: 'migration',
    };
  }

  const conceptsById: Record<string, ConceptMappingDefinition> = {};
  for (let i = 0; i < CONCEPT_TO_TOKEN_MAP.length; i++) {
    const entry = CONCEPT_TO_TOKEN_MAP[i];
    const tokenMatch = entry.token.match(/^\{([a-z_]+)\}/);
    if (!tokenMatch) {
      console.warn(`[seed] Skipping concept entry with unparseable token: "${entry.token}"`);
      continue;
    }
    const tokenName = tokenMatch[1];
    const id = entry.concept
      .split(' / ')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    conceptsById[id] = {
      id,
      concept: entry.concept,
      tokenName,
      order: i,
      enabled: true,
    };
  }

  return {
    schemaVersion: 1,
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'seed-migration',
    tokensByName,
    aliasesByName,
    conceptsById,
  };
}

// ── Verification: compile and compare against hardcoded data ──────────────

function verifyDocument(doc: TokenRegistryDocument): { ok: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];
  const compiled = compileTokenRegistry(doc);

  const aliasBaseNames = new Set(Object.keys(TOKEN_ALIAS_MAP));

  const hardcodedTokenSet = new Set(ALL_TOKENS);
  const compiledTokenSet = new Set(compiled.allTokens);

  for (const t of hardcodedTokenSet) {
    if (!compiledTokenSet.has(t)) {
      const baseName = t.startsWith('the_') ? t.slice(4) : t;
      if (aliasBaseNames.has(baseName) && !doc.tokensByName[baseName]) {
        warnings.push(`Expected migration change — "${t}" is now handled via alias normalization (${baseName} → ${TOKEN_ALIAS_MAP[baseName]})`);
      } else {
        issues.push(`Missing from compiled: ${t}`);
      }
    }
  }
  for (const t of compiledTokenSet) {
    if (!hardcodedTokenSet.has(t)) {
      issues.push(`Extra in compiled: ${t}`);
    }
  }

  for (const baseName of ARTICLE_FORM_TOKEN_NAMES) {
    if (!compiled.articleFormTokenNames.has(baseName)) {
      if (aliasBaseNames.has(baseName)) {
        warnings.push(`Expected migration change — article form base "${baseName}" is an alias (→ ${TOKEN_ALIAS_MAP[baseName]}), not a standalone token`);
      } else {
        issues.push(`Missing article form base: ${baseName}`);
      }
    }
  }
  for (const baseName of compiled.articleFormTokenNames) {
    if (!ARTICLE_FORM_TOKEN_NAMES.has(baseName)) {
      issues.push(`Extra article form base: ${baseName}`);
    }
  }

  for (const [alias, target] of Object.entries(TOKEN_ALIAS_MAP)) {
    if (compiled.aliasMap[alias] !== target) {
      issues.push(`Alias mismatch: ${alias} → expected ${target}, got ${compiled.aliasMap[alias] ?? '(missing)'}`);
    }
  }

  if (compiled.conceptToTokenMap.length !== CONCEPT_TO_TOKEN_MAP.length) {
    issues.push(`Concept count mismatch: hardcoded=${CONCEPT_TO_TOKEN_MAP.length}, compiled=${compiled.conceptToTokenMap.length}`);
  }

  return { ok: issues.length === 0, issues, warnings };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  console.log('[seed] Building TokenRegistryDocument from hardcoded data...');
  const doc = buildRegistryDocument();

  const tokenCount = Object.keys(doc.tokensByName).length;
  const aliasCount = Object.keys(doc.aliasesByName).length;
  const conceptCount = Object.keys(doc.conceptsById).length;
  const articleFormCount = Object.values(doc.tokensByName).filter(t => t.articleForm?.enabled).length;

  console.log(`[seed] Document built:`);
  console.log(`  Tokens:        ${tokenCount}`);
  console.log(`  Article forms: ${articleFormCount} (derived from token flags)`);
  console.log(`  Aliases:       ${aliasCount}`);
  console.log(`  Concepts:      ${conceptCount}`);
  console.log(`  Version:       ${doc.version}`);

  console.log('\n[seed] Verifying round-trip compilation...');
  const { ok, issues, warnings } = verifyDocument(doc);
  if (warnings.length > 0) {
    console.log('[seed] Migration notes (expected differences from hardcoded data):');
    for (const w of warnings) {
      console.log(`  ℹ ${w}`);
    }
  }
  if (!ok) {
    console.error('[seed] Verification FAILED:');
    for (const issue of issues) {
      console.error(`  ✗ ${issue}`);
    }
    if (!force) {
      console.error('[seed] Aborting. Use --force to write despite verification failures.');
      process.exit(1);
    }
    console.warn('[seed] --force specified, continuing despite failures.');
  } else {
    console.log('[seed] Verification passed — compiled output matches hardcoded data (with expected migration changes).');
  }

  if (dryRun) {
    console.log('\n[seed] --dry-run specified. Document NOT written to Firestore.');
    console.log('[seed] Document preview (first 3 tokens):');
    const preview = Object.entries(doc.tokensByName).slice(0, 3);
    for (const [name, def] of preview) {
      console.log(`  ${name}: ${JSON.stringify(def)}`);
    }
    return;
  }

  console.log('\n[seed] Writing to Firestore: world_state/token_registry ...');
  const admin = await initializeFirebase();
  const db = admin.firestore();

  const docRef = db.collection('world_state').doc('token_registry');
  const existing = await docRef.get();
  if (existing.exists && !force) {
    console.error('[seed] Document already exists. Use --force to overwrite.');
    process.exit(1);
  }

  await docRef.set(doc);
  console.log('[seed] Document written successfully.');

  console.log('[seed] Reading back for final verification...');
  const readBack = await docRef.get();
  const readDoc = readBack.data() as TokenRegistryDocument;
  const compiled = compileTokenRegistry(readDoc);
  console.log(`[seed] Read-back compiled: ${compiled.allTokens.length} tokens, ${Object.keys(compiled.aliasMap).length} aliases, ${compiled.conceptToTokenMap.length} concepts`);
  console.log('[seed] Seed migration complete.');
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
