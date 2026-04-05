import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { TokenRejectionDocument } from '@shared/token-registry-contract';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status');
    const sortParam = request.nextUrl.searchParams.get('sort');
    const sortField = sortParam === 'lastSeenAt' ? 'lastSeenAt' : 'count';

    const limitParam = request.nextUrl.searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 100;
    const limitNum = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100;

    const snap = status
      ? await db
          .collection('token_rejections')
          .where('status', '==', status)
          .orderBy(sortField, 'desc')
          .limit(limitNum)
          .get()
      : await db.collection('token_rejections').orderBy(sortField, 'desc').limit(limitNum).get();

    const rejections = snap.docs.map(doc => doc.data() as TokenRejectionDocument);
    return NextResponse.json({ rejections, total: rejections.length });
  } catch (err) {
    console.error('GET /api/token-registry/rejections error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
