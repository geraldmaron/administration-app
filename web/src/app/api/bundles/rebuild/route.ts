import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { BUNDLE_IDS } from '@/lib/constants';
import { exportScenarioBundle } from '@/lib/scenario-bundle-export';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('bundle');

    if (bundleId) {
      if (!(BUNDLE_IDS as readonly string[]).includes(bundleId)) {
        return NextResponse.json({ error: `Invalid bundle ID: ${bundleId}` }, { status: 400 });
      }
      const count = await exportScenarioBundle(bundleId);
      return NextResponse.json({ summary: { [bundleId]: count } });
    }

    const results = await Promise.allSettled(
      BUNDLE_IDS.map(async (id) => {
        const count = await exportScenarioBundle(id);
        return { id, count };
      })
    );

    const summary: Record<string, number> = {};
    const errors: string[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        summary[result.value.id] = result.value.count;
      } else {
        errors.push(String(result.reason));
      }
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    return NextResponse.json({ summary, total, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error('POST /api/bundles/rebuild error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
