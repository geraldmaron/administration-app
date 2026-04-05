import type { TokenRejectionDocument } from '../shared/token-registry-contract';

export interface RejectedTokenEntry {
  tokenName: string;
  scenarioId: string;
  bundle: string;
  field: string;
  context: string;
}

export class TokenRejectionBuffer {
  private entries: RejectedTokenEntry[] = [];

  record(entry: RejectedTokenEntry): void {
    this.entries.push(entry);
  }

  get size(): number {
    return this.entries.length;
  }

  async flush(): Promise<void> {
    if (this.entries.length === 0) return;

    const byToken = new Map<string, RejectedTokenEntry[]>();
    for (const entry of this.entries) {
      const existing = byToken.get(entry.tokenName) ?? [];
      existing.push(entry);
      byToken.set(entry.tokenName, existing);
    }

    const admin = require('firebase-admin');
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    const now = new Date().toISOString();
    const tokenNames = [...byToken.keys()];
    const BATCH_SIZE = 250;

    for (let i = 0; i < tokenNames.length; i += BATCH_SIZE) {
      const chunk = tokenNames.slice(i, i + BATCH_SIZE);
      const docRefs = chunk.map((tokenName) => db.collection('token_rejections').doc(tokenName));
      const existingDocs = await db.getAll(...docRefs);
      const existingSet = new Set(existingDocs.filter((doc: any) => doc.exists).map((doc: any) => doc.id));

      const batch = db.batch();
      for (const tokenName of chunk) {
        const entries = byToken.get(tokenName);
        if (!entries || entries.length === 0) continue;

        const latestEntry = entries[entries.length - 1];
        const docRef = db.collection('token_rejections').doc(tokenName);

        if (existingSet.has(tokenName)) {
          batch.update(docRef, {
            count: FieldValue.increment(entries.length),
            lastSeenAt: now,
            sampleScenarioId: latestEntry.scenarioId,
            sampleBundle: latestEntry.bundle,
            sampleField: latestEntry.field,
            sampleContext: latestEntry.context.slice(0, 500),
          });
        } else {
          const doc: TokenRejectionDocument = {
            tokenName,
            count: entries.length,
            firstSeenAt: now,
            lastSeenAt: now,
            sampleScenarioId: latestEntry.scenarioId,
            sampleBundle: latestEntry.bundle,
            sampleField: latestEntry.field,
            sampleContext: latestEntry.context.slice(0, 500),
            status: 'unresolved',
          };
          batch.set(docRef, doc);
        }
      }

      await batch.commit();
    }

    console.log(`[TokenRejectionTracker] Flushed ${this.entries.length} rejections for ${byToken.size} unique tokens`);
    this.entries = [];
  }
}
