import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ALL_TOKENS, ARTICLE_FORM_TOKEN_NAMES } = require('../functions/lib/lib/logic-parameters.js');

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'the-administration-3a072' });
  } else {
    throw new Error('Missing serviceAccountKey.json in web/');
  }
}

const db = admin.firestore();

const ROLE_MAP: Record<string, string> = {
  role_military: 'role_defense',
  role_public_order: 'role_interior',
  role_foreign_relations: 'role_diplomacy',
  role_approval: 'role_executive',
  role_agriculture: 'role_environment',
};

// One-time alias migrations: invalid/deprecated token → canonical token.
// These exact aliases were previously silently resolved at runtime. After this
// migration runs, the runtime alias shims are removed and invalid tokens are hard errors.
const TOKEN_ALIAS_MAP: Record<string, string> = {
  border_ival: 'border_rival',
  the_border_ival: 'the_border_rival',
  regional_ivals: 'regional_rival',
  budget: 'fiscal_condition',
  budget_amount: 'graft_amount',
  nation_name: 'player_country',
  country_name: 'player_country',
  country: 'player_country',
  prime_minister: 'leader_title',
  president: 'leader_title',
  police_agency: 'police_force',
  the_police_agency: 'the_police_force',
};

const VALID_TOKENS = new Set<string>(Array.isArray(ALL_TOKENS) ? ALL_TOKENS : []);
const ARTICLE_FORM_SET: Set<string> = ARTICLE_FORM_TOKEN_NAMES instanceof Set
  ? (ARTICLE_FORM_TOKEN_NAMES as Set<string>)
  : new Set<string>(Array.isArray(ARTICLE_FORM_TOKEN_NAMES) ? ARTICLE_FORM_TOKEN_NAMES : []);

// Country relationship tokens that should always use their {the_*} form in narrative text.
// For non-article countries (Germany, France) {the_X} resolves identically to {X}.
// For article-requiring countries (US, UK, NL) {the_X} correctly prepends "the ".
const COUNTRY_TOKENS_TO_UPGRADE = new Set([
  'player_country', 'adversary', 'border_rival', 'regional_rival',
  'ally', 'trade_partner', 'neutral', 'rival', 'partner', 'neighbor',
  'nation', 'regional_bloc',
]);

function replaceTokensInText(input: string): string {
  let out = input;

  // 1. Apply one-time alias migrations (invalid/deprecated → canonical)
  out = out.replace(/\{([a-z_]+)\}/g, (match, token) => {
    const mapped = TOKEN_ALIAS_MAP[token];
    if (mapped && VALID_TOKENS.has(mapped)) return `{${mapped}}`;

    if (token.startsWith('the_') && !VALID_TOKENS.has(token)) {
      const base = token.slice(4);
      if (VALID_TOKENS.has(base)) return `{${base}}`;
    }

    return match;
  });

  // 2. Fix "the {token}" article-doubling → "{the_token}"
  out = out.replace(/\bthe\s+\{(?!the_)([a-z_]+)\}/gi, (full, token) => {
    const candidate = `the_${token}`;
    return VALID_TOKENS.has(candidate) ? `{${candidate}}` : `{${token}}`;
  });

  // 3. Upgrade all bare country relationship tokens to their {the_*} form universally.
  // This is correct in every narrative context: possessives, prepositions, subjects, objects.
  out = out.replace(/\{([a-z_]+)\}/g, (match, token) => {
    if (!COUNTRY_TOKENS_TO_UPGRADE.has(token)) return match;
    const theForm = `the_${token}`;
    return VALID_TOKENS.has(theForm) ? `{${theForm}}` : match;
  });

  // 4. Upgrade bare role/institutional tokens to {the_*} at sentence-start positions.
  out = out.replace(/(^|([.!?])\s+)\{([a-z_]+)\}/g, (match, prefix, punctChar, name) => {
    if (!ARTICLE_FORM_SET.has(name)) return match;
    const theForm = `the_${name}`;
    if (!VALID_TOKENS.has(theForm)) return match;
    const replacement = `{${theForm}}`;
    if (!prefix) return replacement;
    return `${punctChar} ${replacement}`;
  });

  return out;
}

function walkAndFix(value: any): any {
  if (typeof value === 'string') {
    return replaceTokensInText(value);
  }

  if (Array.isArray(value)) {
    return value.map((v) => walkAndFix(v));
  }

  if (value && typeof value === 'object') {
    const next: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'roleId' && typeof v === 'string' && ROLE_MAP[v]) {
        next[k] = ROLE_MAP[v];
      } else {
        next[k] = walkAndFix(v);
      }
    }
    return next;
  }

  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  const snap = await db.collection('scenarios').get();

  let changedDocs = 0;
  let roleFixes = 0;
  let aliasFixes = 0;
  let articleFixes = 0;
  let countryTokenUpgrades = 0;
  let sentenceStartFixes = 0;

  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const original = doc.data();
    const fixed = walkAndFix(original);

    const originalStr = JSON.stringify(original);
    const fixedStr = JSON.stringify(fixed);
    if (originalStr === fixedStr) {
      continue;
    }

    changedDocs += 1;

    for (const from of Object.keys(ROLE_MAP)) {
      const re = new RegExp(`"${from}"`, 'g');
      const matches = originalStr.match(re);
      if (matches?.length) roleFixes += matches.length;
    }

    for (const from of Object.keys(TOKEN_ALIAS_MAP)) {
      const re = new RegExp(`\\{${from}\\}`, 'g');
      const matches = originalStr.match(re);
      if (matches?.length) aliasFixes += matches.length;
    }

    const articleMatches = originalStr.match(/\bthe\s+\{(?!the_)[a-z_]+\}/g);
    if (articleMatches?.length) articleFixes += articleMatches.length;

    for (const name of COUNTRY_TOKENS_TO_UPGRADE) {
      const re = new RegExp(`\\{${name}\\}`, 'g');
      const matches = originalStr.match(re);
      if (matches?.length) countryTokenUpgrades += matches.length;
    }

    for (const name of ARTICLE_FORM_SET) {
      if (COUNTRY_TOKENS_TO_UPGRADE.has(name)) continue;
      const theForm = `the_${name}`;
      if (!VALID_TOKENS.has(theForm)) continue;
      const sentencePattern = new RegExp(`(^|[.!?]\\s+)\\{${name}\\}`, 'g');
      const sentenceMatches = originalStr.match(sentencePattern);
      if (sentenceMatches?.length) sentenceStartFixes += sentenceMatches.length;
    }

    if (apply) {
      batch.set(doc.ref, {
        ...fixed,
        metadata: {
          ...(fixed.metadata || {}),
          cleanupAt: new Date().toISOString(),
          cleanupSource: 'scripts/fix-existing-scenarios.ts',
        },
      }, { merge: false });
      batchCount += 1;

      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (apply && batchCount > 0) {
    await batch.commit();
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    totalScenarios: snap.size,
    changedDocs,
    roleFixes,
    aliasFixes,
    articleFixes,
    countryTokenUpgrades,
    sentenceStartFixes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
