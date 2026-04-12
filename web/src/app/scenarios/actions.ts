'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

export async function markConfirmedAction(
  ids: string[],
  confirmed: boolean,
): Promise<{ updated: number }> {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('ids must be a non-empty array');
  if (ids.length > 100) throw new Error('Cannot confirm more than 100 scenarios at once');

  let updated = 0;
  const now = new Date().toISOString();

  for (const id of ids) {
    const docRef = db.collection('scenarios').doc(id);
    await docRef.set(
      {
        metadata: {
          repairMetadata: confirmed
            ? { confirmedClean: true, confirmedAt: now }
            : { confirmedClean: FieldValue.delete(), confirmedAt: FieldValue.delete() },
        },
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    updated++;
  }

  return { updated };
}
