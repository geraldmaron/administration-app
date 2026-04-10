import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import type { ScenarioSummary } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

function coerceTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof (value as any).toDate === 'function') return (value as any).toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

function toSummary(id: string, data: FirebaseFirestore.DocumentData): ScenarioSummary {
  const auditScore = data.metadata?.auditMetadata?.score ?? null;
  const createdAt = coerceTimestamp(data.created_at);
  const updatedAt = coerceTimestamp(data.updated_at) ?? null;
  const tags: string[] = data.metadata?.tags ?? [];
  const applicableCountries = data.metadata?.applicable_countries;
  const region = Array.isArray(applicableCountries)
    ? null
    : typeof applicableCountries === 'string'
    ? applicableCountries
    : null;
  const countryCount = Array.isArray(applicableCountries) ? applicableCountries.length : applicableCountries ? 1 : null;

  return {
    id,
    title: data.title ?? '',
    bundle: data.metadata?.bundle ?? null,
    severity: data.metadata?.severity ?? null,
    isActive: data.is_active ?? false,
    createdAt,
    updatedAt,
    auditScore: typeof auditScore === 'number' ? auditScore : null,
    region,
    tags,
    difficulty: data.metadata?.difficulty ?? null,
    source: data.metadata?.source ?? null,
    sourceKind: data.metadata?.sourceKind ?? null,
    scopeTier: data.metadata?.scopeTier ?? null,
    scopeKey: data.metadata?.scopeKey ?? null,
    countryCount,
    conditionCount: Array.isArray(data.conditions) ? data.conditions.length : 0,
    tagCount: tags.length,
    tagResolutionStatus: data.metadata?.tagResolution?.status ?? null,
    gaiaReviewedAt: coerceTimestamp(data.gaiaReviewedAt) ?? null,
    gaiaRunId: data.gaiaRunId ?? null,
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
      let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('scenarios');

      if (bundleFilter) {
        query = query.where('metadata.bundle', '==', bundleFilter);
      }

      query = query.orderBy('created_at', 'desc').limit(pageSize + 1);

      if (startAfter) {
        const cursorDoc = await db.collection('scenarios').doc(startAfter).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snap = await query.get();
      const docs = snap.docs.slice(0, pageSize);
      scenarios = docs.map((d) => toSummary(d.id, d.data()));
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
    const body = await request.json() as { ids?: unknown; deleteAll?: unknown };

    if (body.deleteAll === true) {
      let totalDeleted = 0;
      while (true) {
        const snap = await db.collection('scenarios').limit(400).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snap.docs.length;
      }
      return NextResponse.json({ deleted: totalDeleted });
    }

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

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json() as { ids?: unknown; is_active?: unknown };
    const ids = body.ids;
    const isActive = body.is_active;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Cannot update more than 100 scenarios at once' }, { status: 400 });
    }

    const batch = db.batch();
    (ids as string[]).forEach((id) => {
      batch.update(db.collection('scenarios').doc(id), {
        is_active: isActive,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return NextResponse.json({ updated: ids.length, is_active: isActive });
  } catch (err) {
    console.error('PATCH /api/scenarios error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
