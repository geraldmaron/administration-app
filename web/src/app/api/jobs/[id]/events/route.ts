import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { JobEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

function toEvent(id: string, data: FirebaseFirestore.DocumentData): JobEvent {
  return {
    id,
    timestamp: data.timestamp?.toDate?.()?.toISOString(),
    level: data.level ?? 'info',
    code: data.code ?? 'event',
    message: data.message ?? '',
    bundle: data.bundle,
    phase: data.phase,
    scenarioId: data.scenarioId,
    data: data.data,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobRef = db.collection('generation_jobs').doc(params.id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;
    const levelFilter = searchParams.get('level');
    const bundleFilter = searchParams.get('bundle');
    const phaseFilter = searchParams.get('phase');

    const jobData = jobDoc.data()!;
    const totalCount = jobData.eventCount ?? 0;

    let query: FirebaseFirestore.Query = jobRef
      .collection('events')
      .orderBy('timestamp', 'asc');

    if (levelFilter) {
      query = query.where('level', '==', levelFilter);
    }
    if (bundleFilter) {
      query = query.where('bundle', '==', bundleFilter);
    }
    if (phaseFilter) {
      query = query.where('phase', '==', phaseFilter);
    }

    const snap = await query.limit(limit + offset).get();
    const allDocs = snap.docs.slice(offset);
    const events = allDocs.slice(0, limit).map((doc) => toEvent(doc.id, doc.data()));

    return NextResponse.json({
      events,
      total: totalCount,
      hasMore: allDocs.length > limit,
    });
  } catch (err) {
    console.error('GET /api/jobs/[id]/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
