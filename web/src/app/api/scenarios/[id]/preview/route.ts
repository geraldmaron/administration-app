import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';
import {
  type CountryDoc,
  normalizeCountryDoc,
  type SimScenarioDoc,
  buildSimulationTokenContext,
  resolveSimulationScenario,
} from '@/lib/simulate';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const countryId = searchParams.get('countryId');

  if (!countryId) {
    return NextResponse.json({ error: 'countryId is required' }, { status: 400 });
  }

  try {
    const [scenarioSnap, countrySnap, countriesSnap] = await Promise.all([
      db.collection('scenarios').doc(params.id).get(),
      db.collection('countries').doc(countryId).get(),
      db.collection('countries').get(),
    ]);

    if (!scenarioSnap.exists) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    if (!countrySnap.exists) {
      return NextResponse.json({ error: `Country "${countryId}" not found` }, { status: 404 });
    }

    const scenario = { id: scenarioSnap.id, ...scenarioSnap.data() } as SimScenarioDoc;
    const country = normalizeCountryDoc({ id: countrySnap.id, ...countrySnap.data() } as CountryDoc);
    const countriesById = Object.fromEntries(
      countriesSnap.docs.map((doc) => [doc.id, normalizeCountryDoc({ id: doc.id, ...doc.data() } as CountryDoc)])
    );

    const startingMetrics = country.gameplayProfile?.startingMetrics ?? {};
    const metrics: Record<string, number> = {};
    for (const [k, v] of Object.entries(startingMetrics)) {
      metrics[k] = v as number;
    }

    const context = buildSimulationTokenContext(country, countriesById);
    const resolved = resolveSimulationScenario(scenario, country, metrics, context);

    return NextResponse.json({
      country: {
        id: country.id,
        name: country.name,
        region: country.region,
      },
      resolved,
      context,
    });
  } catch (err) {
    console.error('GET /api/scenarios/[id]/preview error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
