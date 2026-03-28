import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import {
  type CountryDoc,
  normalizeCountryDoc,
  type SimScenarioDoc,
  simulateScenarioLibrary,
} from '@/lib/simulate';

export const dynamic = 'force-dynamic';

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
  const [countrySnap, scenariosSnap, countriesSnap] = await Promise.all([
    db.collection('countries').doc(countryId).get(),
    db.collection('scenarios').where('is_active', '==', true).get(),
    db.collection('countries').get(),
  ]);

  if (!countrySnap.exists) {
    return NextResponse.json({ error: `Country "${countryId}" not found` }, { status: 404 });
  }

  const country = normalizeCountryDoc({ id: countrySnap.id, ...countrySnap.data() } as CountryDoc);
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

  const scenarios = scenariosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SimScenarioDoc));
  const countriesById = Object.fromEntries(
    countriesSnap.docs.map((doc) => [doc.id, normalizeCountryDoc({ id: doc.id, ...doc.data() } as CountryDoc)])
  );
  const { eligible, filtered } = simulateScenarioLibrary(scenarios, country, countriesById, metrics);

  return NextResponse.json({
    country: { id: country.id, name: country.name, region: country.region, governmentCategory: country.geopoliticalProfile?.governmentCategory, tags: country.geopoliticalProfile?.tags ?? [] },
    metrics,
    totalScenarios: scenarios.length,
    eligibleCount: eligible.length,
    filteredCount: filtered.length,
    eligible,
    ...(showFiltered ? { filtered } : {}),
  });
}
