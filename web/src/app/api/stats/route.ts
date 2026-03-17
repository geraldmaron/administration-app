import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
import { ALL_BUNDLES } from '@/lib/constants';

export async function GET() {
  try {
    const [activeTotalSnap, inactiveTotalSnap, ...bundleSnaps] = await Promise.all([
      db.collection('scenarios').where('is_active', '==', true).count().get(),
      db.collection('scenarios').where('is_active', '==', false).count().get(),
      ...ALL_BUNDLES.map((b) =>
        Promise.all([
          db.collection('scenarios').where('metadata.bundle', '==', b.id).count().get(),
          db.collection('scenarios')
            .where('metadata.bundle', '==', b.id)
            .where('is_active', '==', true)
            .count()
            .get(),
        ])
      ),
    ]);

    const bundles = ALL_BUNDLES.map((b, i) => ({
      id: b.id,
      label: b.label,
      total: bundleSnaps[i][0].data().count,
      active: bundleSnaps[i][1].data().count,
    }));

    return NextResponse.json({
      bundles,
      totalActive: activeTotalSnap.data().count,
      totalInactive: inactiveTotalSnap.data().count,
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
