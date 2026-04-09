/**
 * Token Registry Contract — Shared types for the Firestore-backed token registry.
 *
 * Imported by both Cloud Functions and the web admin app via @shared/.
 * Pure TypeScript — no Firebase or runtime dependencies.
 */

// ── Token Categories ──────────────────────────────────────────────────────

export type TokenCategory =
  | 'executive'
  | 'legislative'
  | 'political'
  | 'judicial'
  | 'ministers'
  | 'security'
  | 'military'
  | 'economic'
  | 'local'
  | 'media'
  | 'relationships'
  | 'geography'
  | 'amounts'
  | 'context';

// ── Firestore Document: world_state/token_registry ────────────────────────

export interface TokenDefinition {
  name: string;
  category: TokenCategory;
  description?: string;
  enabled: boolean;
  dynamic?: boolean;
  articleForm?: {
    enabled: boolean;
    sentenceStartSafe?: boolean;
  };
}

export type TokenAliasSource = 'migration' | 'manual' | 'rejection';

export interface TokenAliasDefinition {
  alias: string;
  targetToken: string;
  source: TokenAliasSource;
  note?: string;
}

export interface ConceptMappingDefinition {
  id: string;
  concept: string;
  tokenName: string;
  order: number;
  enabled: boolean;
}

export interface TokenRegistryDocument {
  schemaVersion: 1;
  version: number;
  updatedAt: string;
  updatedBy?: string;
  tokensByName: Record<string, TokenDefinition>;
  aliasesByName: Record<string, TokenAliasDefinition>;
  conceptsById: Record<string, ConceptMappingDefinition>;
}

// ── Compiled Registry (runtime shape, derived from Firestore doc) ─────────

export interface CompiledTokenRegistry {
  version: number;
  tokensByCategory: Record<TokenCategory | 'article_forms', readonly string[]>;
  allTokens: readonly string[];
  articleFormTokenNames: ReadonlySet<string>;
  sentenceStartArticleFormTokenNames: ReadonlySet<string>;
  aliasMap: Readonly<Record<string, string>>;
  conceptToTokenMap: ReadonlyArray<{ concept: string; token: string }>;
}

export function isTokenSentenceStartArticleSafe(tokenName: string, category: TokenCategory): boolean {
  switch (category) {
    case 'executive':
    case 'judicial':
    case 'ministers':
    case 'security':
    case 'military':
    case 'economic':
      return true;
    case 'relationships':
      return tokenName === 'player_country';
    case 'legislative':
    case 'political':
    case 'local':
    case 'media':
    case 'geography':
    case 'amounts':
    case 'context':
    default:
      return false;
  }
}

// ── Firestore Collection: token_rejections/{tokenName} ────────────────────

export type RejectionStatus = 'unresolved' | 'aliased' | 'added' | 'dismissed';

export interface TokenRejectionResolution {
  targetToken?: string;
  note?: string;
  resolvedAt: string;
  resolvedBy?: string;
}

export interface TokenRejectionDocument {
  tokenName: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  sampleScenarioId?: string;
  sampleBundle?: string;
  sampleField?: string;
  sampleContext?: string;
  status: RejectionStatus;
  resolution?: TokenRejectionResolution;
}

// ── Admin API Request/Response Types ──────────────────────────────────────

export type TokenRegistryOperation =
  | { op: 'upsertToken'; token: TokenDefinition }
  | { op: 'deleteToken'; tokenName: string }
  | { op: 'upsertAlias'; alias: TokenAliasDefinition }
  | { op: 'deleteAlias'; aliasName: string }
  | { op: 'upsertConcept'; concept: ConceptMappingDefinition }
  | { op: 'deleteConcept'; conceptId: string };

export interface PatchTokenRegistryRequest {
  expectedVersion?: number;
  operations: TokenRegistryOperation[];
}

export interface TokenRegistrySummary {
  version: number;
  tokenCount: number;
  aliasCount: number;
  conceptCount: number;
  derivedArticleFormCount: number;
  updatedAt: string;
  updatedBy?: string;
}

export type ResolveRejectedTokenAction =
  | { action: 'alias'; targetToken: string; note?: string }
  | { action: 'addToken'; token: TokenDefinition; note?: string }
  | { action: 'dismiss'; note?: string };

// ── Compiler Helper (pure, usable by both Functions and admin) ────────────

export function compileTokenRegistry(doc: TokenRegistryDocument): CompiledTokenRegistry {
  const tokensByCategory: Record<string, string[]> = {};
  const allTokens: string[] = [];
  const articleFormBaseNames: string[] = [];
  const sentenceStartArticleFormBaseNames: string[] = [];
  const articleFormTokens: string[] = [];

  for (const category of Object.keys(doc.tokensByName).reduce((cats, name) => {
    const cat = doc.tokensByName[name].category;
    if (!cats.includes(cat)) cats.push(cat);
    return cats;
  }, [] as TokenCategory[])) {
    tokensByCategory[category] = [];
  }

  for (const [name, def] of Object.entries(doc.tokensByName)) {
    if (!def.enabled) continue;
    const cat = def.category;
    if (!tokensByCategory[cat]) tokensByCategory[cat] = [];
    tokensByCategory[cat].push(name);
    allTokens.push(name);

    if (def.articleForm?.enabled) {
      const articleName = `the_${name}`;
      articleFormTokens.push(articleName);
      articleFormBaseNames.push(name);
      if ((def.articleForm.sentenceStartSafe ?? isTokenSentenceStartArticleSafe(name, cat)) === true) {
        sentenceStartArticleFormBaseNames.push(name);
      }
    }
  }

  tokensByCategory['article_forms'] = articleFormTokens;
  allTokens.push(...articleFormTokens);

  const aliasMap: Record<string, string> = {};
  for (const [aliasName, aliasDef] of Object.entries(doc.aliasesByName)) {
    aliasMap[aliasName] = aliasDef.targetToken;
  }

  const conceptToTokenMap = Object.values(doc.conceptsById)
    .filter(c => c.enabled)
    .sort((a, b) => a.order - b.order)
    .map(c => ({ concept: c.concept, token: `{${c.tokenName}}` }));

  return {
    version: doc.version,
    tokensByCategory: tokensByCategory as Record<TokenCategory | 'article_forms', readonly string[]>,
    allTokens,
    articleFormTokenNames: new Set(articleFormBaseNames),
    sentenceStartArticleFormTokenNames: new Set(sentenceStartArticleFormBaseNames),
    aliasMap,
    conceptToTokenMap,
  };
}
