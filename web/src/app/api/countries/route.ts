import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snap = await db.collection('countries').orderBy('name', 'asc').get();
    const countries = snap.docs.map((d) => {
      const data = d.data();
      const name: string =
        data.name ??
        data.tokens?.name_formal ??
        data.tokens?.the_player_country ??
        d.id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        id: d.id,
        name,
        region: data.region ?? '',
      };
    });
    return NextResponse.json({ countries });
  } catch (err) {
    console.error('GET /api/countries error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
