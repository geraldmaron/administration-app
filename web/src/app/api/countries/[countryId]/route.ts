import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  const { countryId } = await params;

  try {
    const snap = await db.collection('countries').doc(countryId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const name: string = data.name ?? snap.id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    return NextResponse.json({
      country: {
        id: snap.id,
        name,
        region: data.region ?? '',
        facts: data.facts ?? null,
        amounts: data.amounts ?? null,
        tokens: data.tokens ?? {},
      },
    });
  } catch (err) {
    console.error(`GET /api/countries/${countryId} error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { countryId } = await params;

  try {
    const body = await request.json();
    const { tokens } = body;

    if (tokens === null || tokens === undefined || typeof tokens !== 'object' || Array.isArray(tokens)) {
      return NextResponse.json({ error: 'tokens must be an object' }, { status: 400 });
    }

    const entries = Object.entries(tokens as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (value !== null && typeof value !== 'string') {
        return NextResponse.json(
          { error: `Invalid value for token "${key}": expected string or null` },
          { status: 400 }
        );
      }
    }

    const normalized: Record<string, string | null> = {};
    for (const [key, value] of entries) {
      normalized[key] = value === '' ? null : (value as string | null);
    }

    const docRef = db.collection('countries').doc(countryId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    await docRef.update({ tokens: normalized });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`PATCH /api/countries/${countryId} error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
