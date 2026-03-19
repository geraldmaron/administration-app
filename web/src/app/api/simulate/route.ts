import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types (mirrors iOS/functions models for server-side filtering)
// ---------------------------------------------------------------------------

interface CountryRelationship {
  countryId: string;
  type: string;
  strength: number;
  sharedBorder: boolean;
}

interface GeopoliticalProfile {
  neighbors: CountryRelationship[];
  allies: CountryRelationship[];
  adversaries: CountryRelationship[];
  tags: string[];
  governmentCategory: string;
  regimeStability: number;
}

interface CountryDoc {
  id: string;
  name: string;
  region: string;
  tokens?: Record<string, string>;
  geopoliticalProfile?: GeopoliticalProfile;
  gameplayProfile?: {
    startingMetrics?: Record<string, number>;
    neighborEventChance?: number;
  };
}

interface ScenarioCondition {
  metricId: string;
  min?: number;
  max?: number;
}

interface ScenarioDoc {
  id: string;
  title: string;
  description: string;
  options: { id: string; text: string; label?: string; effects: unknown[]; outcomeHeadline?: string; advisorFeedback?: unknown[] }[];
  conditions?: ScenarioCondition[];
  metadata?: {
    applicable_countries?: string[] | string;
    requiredGeopoliticalTags?: string[];
    excludedGeopoliticalTags?: string[];
    requiredGovernmentCategories?: string[];
    excludedGovernmentCategories?: string[];
    bundle?: string;
    severity?: string;
    difficulty?: number;
    tags?: string[];
  };
  dynamic_profile?: { actorPattern?: string };
}

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------

function buildTokenContext(country: CountryDoc): Record<string, string> {
  const ctx: Record<string, string> = { ...(country.tokens ?? {}) };
  const geo = country.geopoliticalProfile;

  // Ensure player_country tokens are set
  if (!ctx['player_country']) ctx['player_country'] = country.name;
  if (!ctx['the_player_country']) ctx['the_player_country'] = country.name;

  if (geo) {
    // Adversary
    const topAdversary = [...(geo.adversaries ?? [])].sort((a, b) => b.strength - a.strength)[0];
    if (topAdversary) {
      ctx['adversary'] = topAdversary.countryId;
      ctx['the_adversary'] = topAdversary.countryId;
    }

    // Ally
    const topAlly = [...(geo.allies ?? [])].sort((a, b) => b.strength - a.strength)[0];
    if (topAlly) {
      ctx['ally'] = topAlly.countryId;
      ctx['the_ally'] = topAlly.countryId;
    }

    // Neighbor
    const topNeighbor = (geo.neighbors ?? [])[0];
    if (topNeighbor) {
      ctx['neighbor'] = topNeighbor.countryId;
      ctx['the_neighbor'] = topNeighbor.countryId;
    }

    // Border rival — neighbor typed 'rival'
    const borderRival = (geo.neighbors ?? []).find((n) => n.type === 'rival');
    if (borderRival) {
      ctx['border_rival'] = borderRival.countryId;
      ctx['the_border_rival'] = borderRival.countryId;
    }

    // Rival — adversary or neighbor typed 'rival'
    const rival =
      (geo.adversaries ?? []).find((a) => a.type === 'rival') ??
      (geo.neighbors ?? []).find((n) => n.type === 'rival');
    if (rival) {
      ctx['rival'] = rival.countryId;
      ctx['the_rival'] = rival.countryId;
    }
  }

  return ctx;
}

function resolveTokens(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{the_([a-zA-Z_]+)\}|\{([a-zA-Z_]+)\}/g, (match, theKey, bareKey) => {
    const key = theKey ? `the_${theKey}` : bareKey;
    return ctx[key] ?? ctx[theKey ?? bareKey] ?? match;
  });
}

function resolveScenario(scenario: ScenarioDoc, ctx: Record<string, string>): ScenarioDoc {
  return {
    ...scenario,
    title: resolveTokens(scenario.title, ctx),
    description: resolveTokens(scenario.description, ctx),
    options: scenario.options.map((opt) => ({
      ...opt,
      text: resolveTokens(opt.text, ctx),
      outcomeHeadline: opt.outcomeHeadline ? resolveTokens(opt.outcomeHeadline, ctx) : opt.outcomeHeadline,
    })),
  };
}

// ---------------------------------------------------------------------------
// Eligibility filtering
// ---------------------------------------------------------------------------

const REQUIRED_TOKENS = ['the_border_rival', 'border_rival'];

function checkTokenResolvable(scenario: ScenarioDoc, ctx: Record<string, string>): boolean {
  // Check if any required-only tokens are used but can't be resolved
  for (const token of REQUIRED_TOKENS) {
    const pattern = new RegExp(`\\{${token}\\}|\\{the_${token.replace('the_', '')}\\}`);
    if (pattern.test(scenario.title + scenario.description + JSON.stringify(scenario.options))) {
      if (!ctx[token]) return false;
    }
  }
  return true;
}

interface FilterResult {
  eligible: (ScenarioDoc & { _resolved?: ScenarioDoc })[];
  filtered: { scenario: Pick<ScenarioDoc, 'id' | 'title' | 'metadata'>; reason: string }[];
}

function filterScenarios(
  scenarios: ScenarioDoc[],
  country: CountryDoc,
  metrics: Record<string, number>,
  ctx: Record<string, string>
): FilterResult {
  const eligible: ScenarioDoc[] = [];
  const filtered: FilterResult['filtered'] = [];
  const geo = country.geopoliticalProfile;

  for (const scenario of scenarios) {
    // Must have at least 3 options
    if (!scenario.options || scenario.options.length < 3) {
      filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: 'Fewer than 3 options' });
      continue;
    }

    // Metric conditions
    if (scenario.conditions?.length) {
      let blocked = false;
      for (const cond of scenario.conditions) {
        const val = metrics[cond.metricId] ?? 50;
        if (cond.min != null && val < cond.min) {
          filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `${cond.metricId} = ${val} < min ${cond.min}` });
          blocked = true;
          break;
        }
        if (cond.max != null && val > cond.max) {
          filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `${cond.metricId} = ${val} > max ${cond.max}` });
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
    }

    // Applicable countries filter
    const ac = scenario.metadata?.applicable_countries;
    if (ac && (Array.isArray(ac) ? ac.length > 0 : ac)) {
      const acList = Array.isArray(ac) ? ac : [ac];
      if (!acList.some((c) => c.toLowerCase() === country.id.toLowerCase())) {
        filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `Not in applicable_countries (${acList.join(', ')})` });
        continue;
      }
    }

    // Required geopolitical tags
    if (scenario.metadata?.requiredGeopoliticalTags?.length) {
      const countryTags = new Set(geo?.tags ?? []);
      const missing = scenario.metadata.requiredGeopoliticalTags.filter((t) => !countryTags.has(t));
      if (missing.length > 0) {
        filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `Missing required tags: ${missing.join(', ')}` });
        continue;
      }
    }

    // Excluded geopolitical tags
    if (scenario.metadata?.excludedGeopoliticalTags?.length) {
      const countryTags = new Set(geo?.tags ?? []);
      const matched = scenario.metadata.excludedGeopoliticalTags.filter((t) => countryTags.has(t));
      if (matched.length > 0) {
        filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `Has excluded tags: ${matched.join(', ')}` });
        continue;
      }
    }

    // Required government categories
    if (scenario.metadata?.requiredGovernmentCategories?.length) {
      const govCat = geo?.governmentCategory ?? '';
      if (!scenario.metadata.requiredGovernmentCategories.includes(govCat)) {
        filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `Government category "${govCat}" not in required: ${scenario.metadata.requiredGovernmentCategories.join(', ')}` });
        continue;
      }
    }

    // Excluded government categories
    if (scenario.metadata?.excludedGovernmentCategories?.length) {
      const govCat = geo?.governmentCategory ?? '';
      if (scenario.metadata.excludedGovernmentCategories.includes(govCat)) {
        filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: `Government category "${govCat}" is excluded` });
        continue;
      }
    }

    // Border-rival actor pattern gate
    if (scenario.dynamic_profile?.actorPattern === 'border_rival') {
      const hasBorderAdversary = (geo?.neighbors ?? []).some(
        (n) => n.sharedBorder && ['rival', 'adversary', 'conflict'].includes(n.type)
      );
      if (!hasBorderAdversary) {
        filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: 'border_rival scenario but country has no land-adjacent adversarial neighbor' });
        continue;
      }
    }

    // Token resolution check
    if (!checkTokenResolvable(scenario, ctx)) {
      filtered.push({ scenario: { id: scenario.id, title: scenario.title, metadata: scenario.metadata }, reason: 'Uses tokens that cannot be resolved for this country (e.g. {the_border_rival})' });
      continue;
    }

    eligible.push(scenario);
  }

  return { eligible, filtered };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const countryId = searchParams.get('countryId');
  const showFiltered = searchParams.get('showFiltered') === 'true';

  if (!countryId) {
    return NextResponse.json({ error: 'countryId is required' }, { status: 400 });
  }

  // Load country and all scenarios in parallel
  const [countrySnap, scenariosSnap] = await Promise.all([
    db.collection('countries').doc(countryId).get(),
    db.collection('scenarios').where('is_active', '==', true).get(),
  ]);

  if (!countrySnap.exists) {
    return NextResponse.json({ error: `Country "${countryId}" not found` }, { status: 404 });
  }

  const country = { id: countrySnap.id, ...countrySnap.data() } as CountryDoc;
  const startingMetrics = country.gameplayProfile?.startingMetrics ?? {};

  // Metric overrides from query string (e.g. ?metric_economy=70)
  const metrics: Record<string, number> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('metric_')) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) metrics[key] = parsed;
    }
  }
  // Fill in any starting metrics not overridden
  for (const [k, v] of Object.entries(startingMetrics)) {
    if (!(k in metrics)) metrics[k] = v as number;
  }

  const scenarios = scenariosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ScenarioDoc));
  const ctx = buildTokenContext(country);
  const { eligible, filtered } = filterScenarios(scenarios, country, metrics, ctx);

  const resolvedEligible = eligible.map((s) => resolveScenario(s, ctx));

  return NextResponse.json({
    country: { id: country.id, name: country.name, region: country.region, governmentCategory: country.geopoliticalProfile?.governmentCategory, tags: country.geopoliticalProfile?.tags ?? [] },
    metrics,
    totalScenarios: scenarios.length,
    eligibleCount: eligible.length,
    filteredCount: filtered.length,
    eligible: resolvedEligible,
    ...(showFiltered ? { filtered } : {}),
  });
}
