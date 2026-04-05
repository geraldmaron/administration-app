import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import {
  auditScenario,
  scoreScenario,
  buildAuditConfig,
  type AuditConfig,
  type BundleScenario,
} from '@shared/scenario-audit';
import {
  compileTokenRegistry,
  type TokenRegistryDocument,
} from '@shared/token-registry-contract';

export const dynamic = 'force-dynamic';

let _cachedConfig: AuditConfig | null = null;
let _configLoadedAt = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000;

async function getAuditConfig(): Promise<AuditConfig> {
  if (_cachedConfig && Date.now() - _configLoadedAt < CONFIG_TTL_MS) {
    return _cachedConfig;
  }

  const [metricsSnap, contentRulesSnap, genConfigSnap, countriesSnap, tokenRegistrySnap] = await Promise.all([
    db.doc('world_state/metrics').get(),
    db.doc('world_state/content_rules').get(),
    db.doc('world_state/generation_config').get(),
    db.doc('world_state/countries').get(),
    db.doc('world_state/token_registry').get(),
  ]);

  const metricsData: any[] = metricsSnap.data()?.metrics ?? [];
  const contentRules = contentRulesSnap.data() ?? {};
  const genConfig = genConfigSnap.data() ?? {};
  const countriesDoc = countriesSnap.data() ?? {};

  const registryDoc = tokenRegistrySnap.data() as TokenRegistryDocument | undefined;
  const compiledRegistry = registryDoc ? compileTokenRegistry(registryDoc) : null;

  _cachedConfig = buildAuditConfig({
    metricsData: metricsData.map((m: any) => ({
      id: m.id,
      inverse: m.inverse,
      effectMagnitudeCap: m.effectMagnitudeCap,
      relatedRoles: m.relatedRoles,
    })),
    contentRules: {
      banned_abbreviations: contentRules.banned_abbreviations,
      banned_units: contentRules.banned_units,
      banned_directions: contentRules.banned_directions,
      banned_party_names: contentRules.banned_party_names,
    },
    genConfig: {
      effect_default_cap: genConfig.effect_default_cap,
      effect_duration: genConfig.effect_duration,
      category_domain_metrics: genConfig.category_domain_metrics,
      metric_mappings: genConfig.metric_mappings,
    },
    countriesDoc,
    canonicalRoleIds: [
      'role_executive', 'role_diplomacy', 'role_defense', 'role_economy',
      'role_justice', 'role_health', 'role_commerce', 'role_labor',
      'role_interior', 'role_energy', 'role_environment', 'role_transport',
      'role_education',
    ],
    allTokens: compiledRegistry
      ? [...compiledRegistry.allTokens]
      : [],
    articleFormTokenNames: compiledRegistry
      ? [...compiledRegistry.articleFormTokenNames]
      : [],
    validSettingTargets: [
      'fiscal.taxIncome', 'fiscal.taxCorporate',
      'fiscal.spendingMilitary', 'fiscal.spendingInfrastructure', 'fiscal.spendingSocial',
      'policy.economicStance', 'policy.socialSpending', 'policy.defenseSpending',
      'policy.environmentalPolicy', 'policy.tradeOpenness', 'policy.immigration',
      'policy.environmentalProtection', 'policy.healthcareAccess',
      'policy.educationFunding', 'policy.socialWelfare',
    ],
  });
  _configLoadedAt = Date.now();

  return _cachedConfig;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const docRef = db.collection('scenarios').doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const data = snap.data()!;
    const scenario: BundleScenario = {
      id: snap.id,
      title: data.title ?? '',
      description: data.description ?? '',
      options: data.options ?? [],
      metadata: data.metadata,
      conditions: data.conditions,
      relationship_conditions: data.relationship_conditions,
      token_map: data.token_map,
      phase: data.phase,
      actIndex: data.actIndex,
    };

    const config = await getAuditConfig();
    const bundle = scenario.metadata?.bundle ?? 'unknown';
    const issues = auditScenario(scenario, bundle, config);
    const score = scoreScenario(issues);
    const issueRules = issues.map(i => `${i.severity}:${i.rule}`);

    const auditMetadata = {
      lastAudited: new Date().toISOString(),
      score,
      issues: issueRules,
    };

    await docRef.update({
      'metadata.auditMetadata': auditMetadata,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      score,
      issues: issues.map(i => ({ severity: i.severity, rule: i.rule, message: i.message })),
      issueCount: issues.length,
    });
  } catch (err) {
    console.error(`POST /api/scenarios/${params.id}/audit error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
