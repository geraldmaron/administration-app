/**
 * Computes and writes CountryArchetype[] and RequiresFlag flags to every countries/{id} document.
 *
 * Usage:
 *   cd /path/to/admin-app
 *   npx tsx scripts/seed-country-archetypes.ts [--dry-run]
 *
 * By default this is a dry run. Pass --force to write to Firestore.
 *
 * Writes two fields per country:
 *   - archetypes: CountryArchetype[]  — OR-matched structural classifications
 *   - flags: Partial<Record<RequiresFlag, true>>  — AND-matched scenario gates
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { computeCountryArchetypes, computeCountryRequiresFlags, type CountryArchetype } from '../functions/src/data/schemas/country-archetypes';

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount as admin.ServiceAccount) });
}

const db = admin.firestore();
const isDryRun = !process.argv.includes('--force');

async function run(): Promise<void> {
    if (isDryRun) {
        console.log('[seed-country-archetypes] DRY RUN — pass --force to write to Firestore');
    }

    const snap = await db.collection('countries').get();
    if (snap.empty) {
        console.error('[seed-country-archetypes] No countries found in Firestore. Aborting.');
        process.exit(1);
    }

    const batch = db.batch();
    let count = 0;

    for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>;

        // Skip documents that lack the minimum fields needed for derivation
        if (!data.facts || !data.geopolitical || !data.military) {
            console.warn(`[seed-country-archetypes] Skipping ${doc.id} — missing facts/geopolitical/military`);
            continue;
        }

        const countryArg = data as Parameters<typeof computeCountryArchetypes>[0];
        const archetypes: CountryArchetype[] = computeCountryArchetypes(countryArg);
        const geo = data.geopolitical as Record<string, unknown> | undefined;
        const flags = computeCountryRequiresFlags(archetypes, {
            geopolitical: {
                tags: (geo?.tags ?? []) as string[],
                allies: (geo?.allies ?? []) as Array<{ type: string; sharedBorder?: boolean }>,
                adversaries: (geo?.adversaries ?? []) as Array<{ type: string; sharedBorder?: boolean }>,
                neighbors: (geo?.neighbors ?? []) as Array<{ type: string; sharedBorder?: boolean }>,
            },
        });

        const flagKeys = Object.keys(flags);
        console.log(`  ${doc.id}: archetypes=[${archetypes.join(', ')}] flags=[${flagKeys.join(', ')}]`);

        if (!isDryRun) {
            batch.update(doc.ref, { archetypes, flags });
            count++;

            // Firestore batch limit is 500 writes
            if (count % 400 === 0) {
                await batch.commit();
                console.log(`[seed-country-archetypes] Committed ${count} writes`);
            }
        }
    }

    if (!isDryRun && count > 0) {
        await batch.commit();
        console.log(`[seed-country-archetypes] Done. Wrote archetypes + flags to ${count} countries.`);
    } else if (isDryRun) {
        console.log(`[seed-country-archetypes] Dry run complete — ${snap.docs.length} countries scanned, 0 written.`);
    }
}

run().catch((err) => {
    console.error('[seed-country-archetypes] Fatal:', err);
    process.exit(1);
});
