import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import type { ScenarioSummary } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

function toSummary(id: string, data: FirebaseFirestore.DocumentData): ScenarioSummary {
  const auditScore = data.metadata?.auditMetadata?.score ?? null;
  const createdAt = data.created_at?.toDate?.()?.toISOString() ?? new Date(0).toISOString();
  const tags: string[] = data.metadata?.tags ?? [];
  const applicableCountries = data.metadata?.applicable_countries;
  const region = Array.isArray(applicableCountries)
    ? null
    : typeof applicableCountries === 'string'
    ? applicableCountries
    : null;

  return {
    id,
    title: data.title ?? '',
    bundle: data.metadata?.bundle ?? null,
    severity: data.metadata?.severity ?? null,
    isActive: data.is_active ?? false,
    createdAt,
    auditScore: typeof auditScore === 'number' ? auditScore : null,
    region,
    tags,
    difficulty: data.metadata?.difficulty ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bundle = searchParams.get('bundle');
    const active = searchParams.get('active') ?? 'all';
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '25', 10), 100);
    const startAfter = searchParams.get('startAfter');

    const bundleFilter = bundle && bundle !== 'all' ? bundle : null;

    let scenarios: ScenarioSummary[] = [];

    if (active === 'all') {
      let trueQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('scenarios');
      let falseQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('scenarios');

      if (bundleFilter) {
        trueQuery = trueQuery.where('metadata.bundle', '==', bundleFilter);
        falseQuery = falseQuery.where('metadata.bundle', '==', bundleFilter);
      }

      trueQuery = trueQuery.where('is_active', '==', true).orderBy('created_at', 'desc').limit(pageSize);
      falseQuery = falseQuery.where('is_active', '==', false).orderBy('created_at', 'desc').limit(pageSize);

      if (startAfter) {
        const cursorDoc = await db.collection('scenarios').doc(startAfter).get();
        if (cursorDoc.exists) {
          trueQuery = trueQuery.startAfter(cursorDoc);
          falseQuery = falseQuery.startAfter(cursorDoc);
        }
      }

      const [trueSnap, falseSnap] = await Promise.all([trueQuery.get(), falseQuery.get()]);

      const combined = [
        ...trueSnap.docs.map((d) => ({ doc: d, data: d.data() })),
        ...falseSnap.docs.map((d) => ({ doc: d, data: d.data() })),
      ].sort((a, b) => {
        const at = a.data.created_at?.toMillis?.() ?? 0;
        const bt = b.data.created_at?.toMillis?.() ?? 0;
        return bt - at;
      });

      scenarios = combined.slice(0, pageSize).map(({ doc, data }) => toSummary(doc.id, data));
    } else {
      const isActive = active === 'true';
      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('scenarios');
      if (bundleFilter) {
        query = query.where('metadata.bundle', '==', bundleFilter);
      }
      query = query
        .where('is_active', '==', isActive)
        .orderBy('created_at', 'desc')
        .limit(pageSize + 1);

      if (startAfter) {
        const cursorDoc = await db.collection('scenarios').doc(startAfter).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snap = await query.get();
      const docs = snap.docs.slice(0, pageSize);
      scenarios = docs.map((d) => toSummary(d.id, d.data()));
    }

    let countQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('scenarios');
    if (bundleFilter) {
      countQuery = countQuery.where('metadata.bundle', '==', bundleFilter);
    }
    const countSnap = await countQuery.count().get();

    const total = countSnap.data().count;
    const hasMore = scenarios.length === pageSize;
    const nextCursor = hasMore ? scenarios[scenarios.length - 1]?.id ?? null : null;

    return NextResponse.json({ scenarios, total, hasMore, nextCursor });
  } catch (err) {
    console.error('GET /api/scenarios error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { ids?: unknown };
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'Cannot delete more than 100 scenarios at once' }, { status: 400 });
    }

    const batch = db.batch();
    (ids as string[]).forEach((id) => batch.delete(db.collection('scenarios').doc(id)));
    await batch.commit();

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    console.error('DELETE /api/scenarios error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
