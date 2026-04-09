import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { GenerationRunSummary } from '@/lib/types';
import { rollupRunDocument, toJobSummary } from './_lib';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);
    const snap = await db.collection('generation_runs').orderBy('requestedAt', 'desc').limit(limit).get();
    const runs: GenerationRunSummary[] = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data() ?? {};
        const jobsSnap = await db.collection('generation_jobs').where('runId', '==', doc.id).get();
        const jobs = jobsSnap.docs.map((jobDoc) => toJobSummary(jobDoc.id, jobDoc.data()));
        return rollupRunDocument(doc.id, data, jobs);
      })
    );
    return NextResponse.json({ runs });
  } catch (err) {
    console.error('GET /api/runs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
