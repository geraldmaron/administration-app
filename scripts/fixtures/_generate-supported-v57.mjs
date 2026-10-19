// Copy this file to the root of a git archive of d1b2f3a82, then run it there.
// Every @admin import must resolve inside that archive; never run it in the
// current checkout, whose engine writes a newer schema.
import fs from 'node:fs';
import { foundedForBalance, candidateTargetsForBalance } from './packages/engine/dist/balance-harness.js';
import { apply } from './packages/engine/dist/effects.js';
import { imposeTariff, liftMeasure, selectLiveMeasures, tradeEdge } from './packages/engine/dist/trade.js';
import { TRADE_SECTORS } from './packages/engine/dist/trade-sectors.js';
import { taskCollection } from './packages/engine/dist/intelligence.js';
import { raiseForFamily } from './packages/engine/dist/case-families.js';
import { dispositionCase } from './packages/engine/dist/case-dispositions.js';
import { campaignTurnPhases } from './packages/engine/dist/turn-phases.js';
import { advanceTurn } from './packages/engine/dist/turn-loop.js';
import { createSave, loadSave } from './packages/engine/dist/save.js';

const { campaign: founded, charter } = foundedForBalance('supported-save-v57-preservation');
let campaign = founded;
const tasked = taskCollection(campaign, {
  element: 'IC-CIA', discipline: 'humint', targetKind: 'foreign-nation',
  target: 'CHN', question: 'What is the government preparing to do next?',
});
if (!tasked.ok) throw new Error(`tasking: ${tasked.reason}`);
campaign = apply(campaign, tasked.packet);
let tariff;
for (const target of candidateTargetsForBalance(campaign)) {
  for (const sector of TRADE_SECTORS) {
    if (sector.instrument !== 'tariff' || !tradeEdge(campaign, target, sector.id)) continue;
    const result = imposeTariff(campaign, target, sector.id, 0.35);
    if (result.ok) { tariff = result; break; }
  }
  if (tariff) break;
}
if (!tariff) throw new Error('no usable tariff');
campaign = apply(campaign, tariff.packet);
const measure = selectLiveMeasures(campaign).find((item) => item.origin === 'us');
if (!measure) throw new Error('tariff measure not stored');
const lifted = liftMeasure(campaign, measure.id);
if (!lifted.ok) throw new Error(`lift: ${lifted.reason}`);
campaign = apply(campaign, lifted.packet);
const raised = raiseForFamily({kind: 'foreign-request', id: 'fixture-foreign-request', title: 'A counterpart requests talks', subject: {kind: 'nation', id: 'CHN'}, dueAt: campaign.calendar});
campaign = apply(campaign, {source: 'conversation', actor: 'world', turn: campaign.turn,
  narration: {summary: 'A counterpart requests talks.'},
  effects: [{kind: 'case', actor: 'world', raise: raised}]});
const disposed = dispositionCase(campaign, raised.id, {kind: 'decline'});
if (!disposed.ok) throw new Error(`case: ${disposed.reason}`);
campaign = apply(campaign, disposed.packet);
const phases = campaignTurnPhases(charter);
for (let index = 0; index < 6; index++) campaign = advanceTurn(campaign, phases);
const save = createSave(campaign);
if (save.schemaVersion !== 57) throw new Error(`wrong schema ${save.schemaVersion}`);
const restored = loadSave(JSON.parse(JSON.stringify(save)));
if (restored.ledger.length !== campaign.ledger.length) throw new Error('historical reload lost ledger');
const output = new URL('./save.json', import.meta.url);
fs.writeFileSync(output, `${JSON.stringify(save)}\n`);
console.log(JSON.stringify({schemaVersion: save.schemaVersion, turn: campaign.turn,
  bytes: fs.statSync(output).size,
  people: Object.keys(campaign.people).length, institutions: Object.keys(campaign.institutions).length,
  relationships: Object.keys(campaign.relationships).length,
  taskings: Object.keys(campaign.security.intelligence.taskings).length,
  products: Object.keys(campaign.security.intelligence.products).length,
  cases: Object.keys(campaign.cases ?? {}).length,
  commitments: Object.keys(campaign.commitments).length,
  ledger: campaign.ledger.length,
  causes: campaign.ledger.filter((item) => (item.causal?.causeIds?.length ?? 0) > 0).length}));
