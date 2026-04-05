/*
 * Seed the Firestore token registry from hardcoded constants.
 * Usage: npx tsx scripts/seed-token-registry.ts [--dry-run] [--force]
 */

import admin from 'firebase-admin';

import {
  ARTICLE_FORM_TOKEN_NAMES,
  CONCEPT_TO_TOKEN_MAP,
  TOKEN_ALIAS_MAP,
  TOKEN_CATEGORIES,
} from '../functions/src/lib/token-registry';
import {
  ConceptMappingDefinition,
  TokenAliasDefinition,
  TokenCategory,
  TokenDefinition,
  TokenRegistryDocument,
} from '../functions/src/shared/token-registry-contract';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'the-administration-3a072',
  });
}

const db = admin.firestore();

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

function extractFirstTokenName(tokenValue: string): string {
  const match = tokenValue.match(/\{([^}]+)\}/);
  if (match?.[1]) {
    return match[1];
  }

  return tokenValue.replace(/[{}]/g, '').trim();
}

function buildTokenRegistryDocument(): TokenRegistryDocument {
  const tokensByName: Record<string, TokenDefinition> = {};
  for (const [categoryKey, tokenNames] of Object.entries(TOKEN_CATEGORIES)) {
    if (categoryKey === 'article_forms') {
      continue;
    }

    for (const tokenName of tokenNames) {
      tokensByName[tokenName] = {
        name: tokenName,
        category: categoryKey as TokenCategory,
        enabled: true,
        articleForm: { enabled: ARTICLE_FORM_TOKEN_NAMES.has(tokenName) },
      };
    }
  }

  const aliasesByName: Record<string, TokenAliasDefinition> = {};
  for (const [alias, target] of Object.entries(TOKEN_ALIAS_MAP)) {
    aliasesByName[alias] = {
      alias,
      targetToken: target,
      source: 'migration' as const,
    };
  }

  const conceptsById: Record<string, ConceptMappingDefinition> = {};
  CONCEPT_TO_TOKEN_MAP.forEach((entry, index) => {
    const id = `concept_${index}`;
    conceptsById[id] = {
      id,
      concept: entry.concept,
      tokenName: extractFirstTokenName(entry.token),
      order: index,
      enabled: true,
    };
  });

  return {
    schemaVersion: 1,
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'seed-script',
    tokensByName,
    aliasesByName,
    conceptsById,
  };
}

async function main(): Promise<void> {
  console.log('Starting token registry seed...');
  console.log(`Flags: dryRun=${isDryRun}, force=${isForce}`);

  const doc = buildTokenRegistryDocument();
  const tokenCount = Object.keys(doc.tokensByName).length;
  const aliasCount = Object.keys(doc.aliasesByName).length;
  const conceptCount = Object.keys(doc.conceptsById).length;
  const articleFormEnabledCount = Object.values(doc.tokensByName).filter((token) => token.articleForm?.enabled).length;

  console.log('Built token registry document.');
  console.log(
    `Summary: tokens=${tokenCount}, aliases=${aliasCount}, concepts=${conceptCount}, articleFormEnabled=${articleFormEnabledCount}`,
  );

  const docRef = db.collection('world_state').doc('token_registry');
  const existingSnap = await docRef.get();

  if (existingSnap.exists && !isForce) {
    console.log('Document world_state/token_registry already exists. Use --force to overwrite. Skipping write.');
    if (isDryRun) {
      console.log('Dry run document preview:');
      console.log(JSON.stringify(doc, null, 2));
    }
    return;
  }

  if (isDryRun) {
    console.log('Dry run enabled. Document preview:');
    console.log(JSON.stringify(doc, null, 2));
    console.log('Dry run complete. No write performed.');
    return;
  }

  await docRef.set(doc);
  console.log('Write complete: world_state/token_registry');
}

main().catch((error: unknown) => {
  console.error('seed-token-registry failed:', error);
  process.exit(1);
});
