import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
import { ALL_BUNDLES } from '@/lib/constants';

export async function GET() {
  try {
    const bundleSnaps = await Promise.all(
      ALL_BUNDLES.map((b) =>
        Promise.all([
          db.collection('scenarios').where('metadata.bundle', '==', b.id).count().get(),
          db.collection('scenarios')
            .where('metadata.bundle', '==', b.id)
            .where('is_active', '==', true)
            .count()
            .get(),
        ])
      ),
    );

    let totalActive = 0;
    let totalInactive = 0;

    const bundles = ALL_BUNDLES.map((b, i) => {
      const total = bundleSnaps[i][0].data().count;
      const active = bundleSnaps[i][1].data().count;
      totalActive += active;
      totalInactive += total - active;
      return { id: b.id, label: b.label, total, active };
    });

    return NextResponse.json({ bundles, totalActive, totalInactive });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
