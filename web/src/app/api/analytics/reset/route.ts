import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function deleteCollection(name: string): Promise<number> {
  let deleted = 0;
  let snap = await db.collection(name).limit(400).get();
  while (!snap.empty) {
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < 400) break;
    snap = await db.collection(name).limit(400).get();
  }
  return deleted;
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') ?? 'all';

    let summaryDeleted = 0;
    let failureDeleted = 0;

    if (target === 'all' || target === 'summary') {
      summaryDeleted = await deleteCollection('performance_summary');
    }
    if (target === 'all' || target === 'failures') {
      failureDeleted = await deleteCollection('failure_analysis');
    }

    return NextResponse.json({ summaryDeleted, failureDeleted });
  } catch (err) {
    console.error('DELETE /api/analytics/reset error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
