// Read-only: count NPC blockades over a term and the import ratchet they leave.
const root = "";
const E = (p) => import(`${root}packages/engine/dist/${p}.js`);
const { playCampaign, foundedForBalance } = await E("balance-harness");
const [seed = "coercion-0", weeks = "208"] = process.argv.slice(2);
const { campaign: c0 } = foundedForBalance(seed);
const imports0 = Object.fromEntries(Object.entries(c0.nations).map(([id, n]) => [id, n.stats.trade.imports]));
let last;
playCampaign(seed, "passive", Number(weeks), "democrat", undefined, { observeWeek(s) { last = s; } });
const events = [];
for (const [key, rel] of Object.entries(last.relationships ?? {})) for (const h of rel.history ?? []) if (["blockade","strike","invasion"].includes(h.kind) || /^failed-/.test(h.kind) && false) events.push(`${h.turn}:${rel.from ?? key}->${rel.to ?? ""}:${h.kind}`);
const byKind = {}; for (const e of events) { const k = e.split(":").pop(); byKind[k] = (byKind[k] ?? 0) + 1; }
console.log("turn", last.turn, "force events by kind", JSON.stringify(byKind));
console.log("blockades", events.filter(e=>e.endsWith("blockade")).slice(0,40).join(" "));
const cut = Object.entries(last.nations).map(([id, n]) => [id, n.stats.trade.imports / imports0[id]]).filter(([, r]) => r < 0.999).sort((a, b) => a[1] - b[1]);
console.log("nations with imports below founding", cut.length, cut.slice(0, 15).map(([id, r]) => `${id}:${r.toFixed(3)}`).join(" "));
const conf = Object.values(last.conflicts ?? {}).map(k => `${k.aggressor}-${k.defender}:${k.status}`); console.log("conflicts", conf.length, conf.slice(0,20).join(" "));
