import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getCached, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cached = getCached<{ countries: { id: string; name: string; region: string }[] }>('countries');
  if (cached) return NextResponse.json(cached);

  try {
    const snap = await db.collection('countries').orderBy('name', 'asc').get();
    const countries = snap.docs.map((d) => {
      const data = d.data();
      const name: string = data.name ?? d.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        id: d.id,
        name,
        region: data.region ?? '',
      };
    });
    const result = { countries };
    setCache('countries', result, 30_000);
    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/countries error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
