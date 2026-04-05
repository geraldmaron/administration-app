import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

import { deriveCountryAmountValues, deriveCountryTokenPatch, type RawCountryRecord } from '../lib/country-token-derivation';

const isDryRun = process.argv.includes('--mode=dry-run');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'the-administration-3a072';
  const saKeyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '../../../../serviceAccountKey.json');

  const appOptions: admin.AppOptions = { projectId };

  if (fs.existsSync(saKeyPath)) {
    const sa = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
    appOptions.credential = admin.credential.cert(sa);
  }

  admin.initializeApp(appOptions);
}

const db = admin.firestore();

async function run(): Promise<void> {
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  const snapshot = await db.collection('countries').get();
  console.log(`Countries to update: ${snapshot.size}`);

  for (const doc of snapshot.docs) {
    const country = doc.data() as RawCountryRecord;
    if (!country.facts) {
      console.warn(`Skipping countries/${doc.id}: missing canonical facts`);
      continue;
    }
    const existingTokens = country.tokens ?? {};
    const patch = deriveCountryTokenPatch(country);
    const amounts = deriveCountryAmountValues(country);
    const nextTokens: Record<string, string | null> = {
      ...Object.fromEntries(
        Object.entries(existingTokens).map(([key, value]) => [key, value ?? null]),
      ),
      ...patch,
    };

    if (isDryRun) {
      console.log(`[DRY RUN] ${doc.id} ${country.name ?? ''}`.trim());
      console.log(
        JSON.stringify(
          {
            amounts,
            population_scale: nextTokens.population_scale,
            gdp_description: nextTokens.gdp_description,
            economic_scale: nextTokens.economic_scale,
            fiscal_condition: nextTokens.fiscal_condition,
            geography_type: nextTokens.geography_type,
            climate_risk: nextTokens.climate_risk,
            commodity_name: nextTokens.commodity_name,
            state_media: nextTokens.state_media,
            state_enterprise: nextTokens.state_enterprise,
            sovereign_fund: nextTokens.sovereign_fund,
            opposition_leader: nextTokens.opposition_leader,
          },
          null,
          2,
        ),
      );
      continue;
    }

    await doc.ref.update({ tokens: nextTokens, amounts });
    console.log(`Updated: countries/${doc.id}`);
  }

  console.log('Done.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
