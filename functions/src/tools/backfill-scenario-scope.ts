import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { ScenarioExclusivityReason, ScenarioScopeTier, ScenarioSourceKind } from '../shared/generation-contract';

type Mode = 'dry-run' | 'apply';

interface RunOptions {
  mode: Mode;
  bundles?: string[];
  limit?: number;
}

interface ScenarioLike {
  id: string;
  metadata?: {
    bundle?: string;
    scopeTier?: ScenarioScopeTier;
    scopeKey?: string;
    clusterId?: string;
    exclusivityReason?: ScenarioExclusivityReason;
    applicable_countries?: string[] | string;
    region_tags?: string[];
    sourceKind?: ScenarioSourceKind;
  };
}

type ScenarioMetadata = NonNullable<ScenarioLike['metadata']>;

interface ScopeBackfillClassification {
  status: 'classified' | 'already-complete' | 'ambiguous' | 'invalid';
  scopeTier?: ScenarioScopeTier;
  scopeKey?: string;
  clusterId?: string;
  exclusivityReason?: ScenarioExclusivityReason;
  applicable_countries?: string[];
  region_tags?: string[];
  sourceKind?: ScenarioSourceKind;
  reasons: string[];
}

interface ScenarioBackfillRecord {
  id: string;
  bundle?: string;
  status: ScopeBackfillClassification['status'];
  reasons: string[];
  before: ScenarioLike['metadata'];
  after?: ScopeBackfillClassification;
}

interface BackfillSummary {
  mode: Mode;
  scanned: number;
  alreadyComplete: number;
  classified: number;
  ambiguous: number;
  invalid: number;
  applied: number;
  scenarios: ScenarioBackfillRecord[];
}

function parseArgs(): RunOptions {
  const argv = process.argv.slice(2);
  const getFlag = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const direct = argv.find((arg) => arg.startsWith(prefix));
    if (direct) return direct.slice(prefix.length);
    const idx = argv.indexOf(`--${name}`);
    if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
    return undefined;
  };

  const mode = (getFlag('mode') as Mode | undefined) ?? 'dry-run';
  const bundles = getFlag('bundles');
  const limit = Number.parseInt(getFlag('limit') ?? '', 10);

  return {
    mode,
    ...(bundles ? { bundles: bundles.split(',').map((value) => value.trim()).filter(Boolean) } : {}),
    ...(Number.isFinite(limit) && limit > 0 ? { limit } : {}),
  };
}

function toArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  return [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function classifyScenarioScope(scenario: ScenarioLike): ScopeBackfillClassification {
  const metadata = scenario.metadata ?? {};
  const regionTags = unique((metadata.region_tags ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
  const applicableCountries = unique(toArray(metadata.applicable_countries));
  const sourceKind = metadata.sourceKind ?? 'evergreen';
  const reasons: string[] = [];

  const hasCompleteScope = Boolean(metadata.scopeTier && metadata.scopeKey && metadata.sourceKind);
  const scopeTier = metadata.scopeTier;

  if (hasCompleteScope) {
    return {
      status: 'already-complete',
      scopeTier: metadata.scopeTier,
      scopeKey: metadata.scopeKey,
      clusterId: metadata.clusterId,
      exclusivityReason: metadata.exclusivityReason,
      applicable_countries: applicableCountries.length > 0 ? applicableCountries : undefined,
      region_tags: regionTags.length > 0 ? regionTags : undefined,
      sourceKind,
      reasons: ['scope metadata already complete'],
    };
  }

  if (metadata.clusterId) {
    reasons.push('clusterId present');
    return {
      status: 'classified',
      scopeTier: 'cluster',
      scopeKey: `cluster:${metadata.clusterId.trim().toLowerCase()}`,
      clusterId: metadata.clusterId.trim().toLowerCase(),
      applicable_countries: applicableCountries.length > 0 ? applicableCountries : undefined,
      region_tags: regionTags.length > 0 ? regionTags : undefined,
      sourceKind,
      reasons,
    };
  }

  if (metadata.exclusivityReason) {
    if (applicableCountries.length === 0) {
      return {
        status: 'invalid',
        reasons: ['exclusivityReason present without applicable_countries'],
      };
    }
    reasons.push('exclusivityReason present');
    return {
      status: 'classified',
      scopeTier: 'exclusive',
      scopeKey: applicableCountries.length === 1 ? `country:${applicableCountries[0]}` : `exclusive:${applicableCountries.join(',')}`,
      exclusivityReason: metadata.exclusivityReason,
      applicable_countries: applicableCountries,
      region_tags: regionTags.length > 0 ? regionTags : undefined,
      sourceKind,
      reasons,
    };
  }

  if (applicableCountries.length > 1) {
    return {
      status: 'ambiguous',
      reasons: ['multiple applicable_countries without exclusivityReason or clusterId'],
    };
  }

  if (applicableCountries.length === 1) {
    if (sourceKind === 'news') {
      reasons.push('single applicable country on news scenario');
      return {
        status: 'classified',
        scopeTier: 'exclusive',
        scopeKey: `country:${applicableCountries[0]}`,
        exclusivityReason: 'historical',
        applicable_countries: applicableCountries,
        region_tags: regionTags.length > 0 ? regionTags : undefined,
        sourceKind,
        reasons,
      };
    }

    return {
      status: 'ambiguous',
      reasons: ['single applicable country without exclusivityReason'],
    };
  }

  if (regionTags.length > 0) {
    reasons.push('region_tags present');
    return {
      status: 'classified',
      scopeTier: 'regional',
      scopeKey: `region:${regionTags[0]}`,
      region_tags: regionTags,
      sourceKind,
      reasons,
    };
  }

  if (scopeTier === 'universal' || !scopeTier) {
    reasons.push('no country/region/cluster restriction found');
    return {
      status: 'classified',
      scopeTier: 'universal',
      scopeKey: 'universal',
      sourceKind,
      reasons,
    };
  }

  return {
    status: 'invalid',
    reasons: ['unable to classify scenario scope'],
  };
}

function buildScopeBackfillUpdate(
  currentMetadata: ScenarioMetadata | undefined,
  classification: Pick<ScopeBackfillClassification, 'scopeTier' | 'scopeKey' | 'clusterId' | 'exclusivityReason' | 'applicable_countries' | 'region_tags' | 'sourceKind'> & { regions?: string[] },
): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};
  const assignIfChanged = (key: keyof ScenarioMetadata, value: unknown) => {
    const currentValue = currentMetadata?.[key];
    if (JSON.stringify(currentValue ?? null) !== JSON.stringify(value ?? null)) {
      updates[`metadata.${key}`] = value;
    }
  };

  assignIfChanged('scopeTier', classification.scopeTier);
  assignIfChanged('scopeKey', classification.scopeKey);
  assignIfChanged('sourceKind', classification.sourceKind);

  if (classification.clusterId !== undefined) assignIfChanged('clusterId', classification.clusterId);
  if (classification.exclusivityReason !== undefined) assignIfChanged('exclusivityReason', classification.exclusivityReason);
  if (classification.applicable_countries !== undefined) assignIfChanged('applicable_countries', classification.applicable_countries);
  if (classification.region_tags !== undefined) assignIfChanged('region_tags', classification.region_tags);
  if (classification.regions !== undefined && classification.regions.length > 0) {
    if (JSON.stringify((currentMetadata as { regions?: string[] } | undefined)?.regions ?? null) !== JSON.stringify(classification.regions ?? null)) {
      updates['metadata.regions'] = classification.regions;
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

function classifyScenarioScopeMetadata(metadata: ScenarioMetadata | undefined): {
  status: ScopeBackfillClassification['status'];
  scope?: Pick<ScopeBackfillClassification, 'scopeTier' | 'scopeKey' | 'clusterId' | 'exclusivityReason' | 'applicable_countries' | 'sourceKind'> & { regions?: string[] };
  reasons: string[];
} {
  const normalizedCountries = sortStrings(unique(toArray(metadata?.applicable_countries)));
  const normalizedRegions = unique((metadata?.region_tags ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));

  let classification = classifyScenarioScope({ id: 'scenario', metadata });

  if ((metadata?.sourceKind ?? 'evergreen') === 'news' && normalizedCountries.length > 0 && !metadata?.exclusivityReason && !metadata?.clusterId) {
    classification = {
      status: 'classified',
      scopeTier: 'universal',
      scopeKey: 'universal',
      applicable_countries: normalizedCountries,
      sourceKind: 'news',
      reasons: ['news scenario remains universal when exclusivity metadata is absent'],
    };
  } else if (classification.status === 'ambiguous' && normalizedCountries.length > 0 && !metadata?.exclusivityReason) {
    classification = {
      ...classification,
      reasons: ['applicable_countries present without exclusivityReason'],
    };
  }

  const scope = classification.status === 'classified' || classification.status === 'already-complete'
    ? {
        ...(classification.scopeTier ? { scopeTier: classification.scopeTier } : {}),
        ...(classification.scopeKey ? { scopeKey: classification.scopeKey } : {}),
        ...(classification.clusterId ? { clusterId: classification.clusterId } : {}),
        ...(classification.exclusivityReason ? { exclusivityReason: classification.exclusivityReason } : {}),
        ...(classification.applicable_countries ? { applicable_countries: classification.applicable_countries } : {}),
        ...(normalizedRegions.length > 0 ? { regions: normalizedRegions } : {}),
        ...(classification.sourceKind ? { sourceKind: classification.sourceKind } : {}),
      }
    : undefined;

  return {
    status: classification.status,
    ...(scope ? { scope } : {}),
    reasons: classification.reasons,
  };
}

function planScopeBackfillForScenario(id: string, metadata: ScenarioMetadata | undefined): {
  action: 'backfill' | 'noop' | 'ambiguous' | 'invalid';
  updates: Record<string, unknown> | null;
  classification: ScopeBackfillClassification;
} {
  const derived = classifyScenarioScopeMetadata(metadata);
  const classification = classifyScenarioScope({ id, metadata });
  if (derived.status !== 'classified') {
    return {
      action: derived.status === 'already-complete' ? 'noop' : derived.status,
      updates: null,
      classification,
    };
  }

  const regions = derived.scope?.regions;
  return {
    action: 'backfill',
    updates: (() => {
      const updates = buildScopeBackfillUpdate(metadata, {
      ...classification,
      ...(derived.scope?.scopeTier ? { scopeTier: derived.scope.scopeTier } : {}),
      ...(derived.scope?.scopeKey ? { scopeKey: derived.scope.scopeKey } : {}),
      ...(derived.scope?.sourceKind ? { sourceKind: derived.scope.sourceKind } : {}),
      ...(derived.scope?.applicable_countries ? { applicable_countries: derived.scope.applicable_countries } : {}),
      ...(regions ? { regions } : {}),
      }) ?? {};
      if (derived.scope?.sourceKind) {
        updates['metadata.sourceKind'] = derived.scope.sourceKind;
      }
      return updates;
    })(),
      classification,
  };
}

async function run(): Promise<void> {
  const options = parseArgs();

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = getFirestore();
  let query: FirebaseFirestore.Query = db.collection('scenarios').orderBy('created_at', 'desc');

  if (options.bundles?.length) {
    query = query.where('metadata.bundle', 'in', options.bundles.slice(0, 10));
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  const summary: BackfillSummary = {
    mode: options.mode,
    scanned: 0,
    alreadyComplete: 0,
    classified: 0,
    ambiguous: 0,
    invalid: 0,
    applied: 0,
    scenarios: [],
  };

  for (const doc of snapshot.docs) {
    const data = doc.data() as ScenarioLike;
    const scenario: ScenarioLike = { id: doc.id, metadata: data.metadata };
    const classification = classifyScenarioScope(scenario);
    summary.scanned += 1;

    if (classification.status === 'already-complete') summary.alreadyComplete += 1;
    if (classification.status === 'classified') summary.classified += 1;
    if (classification.status === 'ambiguous') summary.ambiguous += 1;
    if (classification.status === 'invalid') summary.invalid += 1;

    summary.scenarios.push({
      id: doc.id,
      bundle: data.metadata?.bundle,
      status: classification.status,
      reasons: classification.reasons,
      before: data.metadata,
      after: classification,
    });

    if (options.mode === 'apply' && classification.status === 'classified') {
      await doc.ref.set({
        metadata: {
          ...(data.metadata ?? {}),
          scopeTier: classification.scopeTier,
          scopeKey: classification.scopeKey,
          ...(classification.clusterId ? { clusterId: classification.clusterId } : {}),
          ...(classification.exclusivityReason ? { exclusivityReason: classification.exclusivityReason } : {}),
          ...(classification.applicable_countries ? { applicable_countries: classification.applicable_countries } : {}),
          ...(classification.region_tags ? { region_tags: classification.region_tags } : {}),
          sourceKind: classification.sourceKind,
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      summary.applied += 1;
    }
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  run().catch((error) => {
    console.error('[backfill-scenario-scope] FATAL:', error);
    process.exit(1);
  });
}

export { run };
export { classifyScenarioScope };
export { buildScopeBackfillUpdate, classifyScenarioScopeMetadata, planScopeBackfillForScenario };
export type { ScopeBackfillClassification, ScenarioLike };
