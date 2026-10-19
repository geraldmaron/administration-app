// Read-only: approval movement by road, player decisions per week, and the removal decisionHistory term.
const root = "";
const { playCampaign } = await import(`${root}packages/engine/dist/balance-harness.js`);
const { selectPressureComposition } = await import(`${root}packages/engine/dist/removal.js`);
const [seed, profile, party, weeks] = process.argv.slice(2);
let last, hist = [], charterRef;
const out = playCampaign(seed, profile, Number(weeks), party, undefined, { observeWeek(s) { last = s; } });
const byTurn = new Map();
for (const e of last.ledger) { if (e.actor !== "player") continue; byTurn.set(e.turn, (byTurn.get(e.turn) ?? 0) + 1); }
const counts = [...byTurn.values()];
const neg = last.ledger.filter((e) => (e.cost?.approval ?? 0) < 0);
const negDrift = neg.filter((e) => e.description === "The country revises its reading of the administration.");
console.log(JSON.stringify({ seed, profile, ending: out.ending, approvalMovement: out.approvalMovement,
  playerEntriesPerActiveWeek: counts.length ? (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2) : 0, weeksWithPlayerEntries: counts.length,
  negativeApprovalEntries: neg.length, ofWhichWeeklyRevision: negDrift.length,
  sumNegativeWeeklyRevision: negDrift.reduce((a, e) => a + e.cost.approval, 0).toFixed(3),
  sumPositiveWeeklyRevision: last.ledger.filter((e) => (e.cost?.approval ?? 0) > 0 && e.description === "The country revises its reading of the administration.").reduce((a, e) => a + e.cost.approval, 0).toFixed(3),
}, null, 1));
