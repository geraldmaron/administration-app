/*
 * One-off diagnostic: scan all scenarios for bare tokens at sentence-start
 * positions that should use {the_*} form.
 * Usage: npx tsx scripts/check-sentence-start-tokens.ts
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
}

const db = admin.firestore();

const BARE_TOKENS = [
  'player_country', 'adversary', 'ally', 'nation', 'neighbor', 'border_rival',
  'regional_rival', 'rival', 'partner', 'trade_partner', 'neutral',
  'finance_role', 'defense_role', 'interior_role', 'foreign_affairs_role',
  'justice_role', 'health_role', 'education_role', 'commerce_role',
  'labor_role', 'energy_role', 'environment_role', 'transport_role', 'agriculture_role',
  'legislature', 'central_bank', 'military_branch', 'intelligence_agency',
  'domestic_intelligence', 'security_council', 'police_force',
];

async function main() {
  const snap = await db.collection('scenarios').get();
  let total = 0;
  const byToken: Record<string, number> = {};
  const byScenario: Record<string, string[]> = {};

  for (const doc of snap.docs) {
    const d = doc.data() as any;
    const fields: Array<{ label: string; text: string }> = [
      { label: 'title', text: d.title },
      { label: 'description', text: d.description },
      ...((d.options || []) as any[]).flatMap((o: any) => [
        { label: `${o.id}.text`, text: o.text },
        { label: `${o.id}.headline`, text: o.outcomeHeadline },
        { label: `${o.id}.summary`, text: o.outcomeSummary },
        { label: `${o.id}.context`, text: o.outcomeContext },
        ...((o.advisorFeedback || []) as any[]).map((f: any) => ({
          label: `${o.id}.advisor.${f.roleId}`, text: f.feedback,
        })),
      ]),
    ].filter(f => f.text);

    for (const { label, text } of fields) {
      for (const t of BARE_TOKENS) {
        const re = new RegExp(`(^|[.!?]\\s+)\\{${t}\\}`, 'g');
        const matches = text.match(re);
        if (matches?.length) {
          total += matches.length;
          byToken[t] = (byToken[t] || 0) + matches.length;
          byScenario[doc.id] = byScenario[doc.id] || [];
          byScenario[doc.id].push(`${label}: "${text.slice(0, 100)}"`);
        }
      }
    }
  }

  console.log('SUMMARY', JSON.stringify({
    totalOccurrences: total,
    affectedScenarios: Object.keys(byScenario).length,
    byToken,
  }, null, 2));

  if (total > 0) {
    console.log('\nSAMPLES');
    for (const [id, samples] of Object.entries(byScenario).slice(0, 20)) {
      console.log(`  ${id}:`);
      for (const s of samples.slice(0, 3)) console.log(`    ${s}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
