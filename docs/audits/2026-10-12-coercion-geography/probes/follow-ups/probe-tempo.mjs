// Read-only: other governments' coercion over a passive term, before and after
// the follow-ups, on the seeds SMALLER-CHANGE.md measured (coercion-0 upward).
//
// usage (from the repository root, one process for both engines):
//   node_modules/.bin/vite-node -c <config aliasing @admin/world to packages/world/src/index.ts> \
//     docs/audits/2026-10-12-coercion-geography/probes/follow-ups/probe-tempo.mjs <beforeDist> <afterSrc> [weeks=208] [seeds=12]
// <beforeDist> is an engine dist directory (imports end in .js); <afterSrc> is
// packages/engine/src (imports end in .ts). Prints one JSON line per seed and
// engine, then a summary per engine.
import path from "node:path";
import { pathToFileURL } from "node:url";

const [beforeArg, afterArg, weeksArg = "208", seedsArg = "12"] = process.argv.slice(2);
const weeks = Number(weeksArg);
const seeds = Array.from({ length: Number(seedsArg) }, (_, i) => `coercion-${i}`);
const FORCE_KINDS = new Set(["blockade", "strike", "invasion"]);
const r = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

async function engine(dir) {
  const ext = dir.endsWith(`${path.sep}src`) || dir.endsWith("/src") ? "ts" : "js";
  const load = (name) => import(pathToFileURL(path.join(path.resolve(dir), `${name}.${ext}`)).href);
  const harness = await load("balance-harness");
  const commodities = await load("commodities");
  const registry = await load("commodity-registry");
  return { playCampaign: harness.playCampaign, selectCommodities: commodities.selectCommodities, CRUDE_ANCHOR: commodities.CRUDE_ANCHOR, COMMODITY_DEFS: registry.COMMODITY_DEFS };
}

function straitsOf(E) {
  const straits = new Map();
  for (const def of Object.values(E.COMMODITY_DEFS)) for (const route of def.routes) straits.set(route.chokepoint, new Set([...(straits.get(route.chokepoint) ?? []), ...route.littoral]));
  return straits;
}

const partyTo = (war, nation) => war.aggressor === nation || war.defender === nation || war.joined.aggressor.includes(nation) || war.joined.defender.includes(nation);

function run(E, seed) {
  const straits = straitsOf(E);
  const brent = [];
  let last;
  let contested = new Set();
  const closures = [];
  E.playCampaign(seed, "passive", weeks, "democrat", undefined, {
    observeWeek(state) {
      last = state;
      const crude = E.selectCommodities(state).find((reading) => reading.id === "crude");
      brent.push(crude.index * E.CRUDE_ANCHOR.usd);
      const active = Object.values(state.conflicts).filter((war) => war.status === "active");
      const now = new Set([...straits.entries()].filter(([, shore]) => active.some((war) => [...shore].some((nation) => partyTo(war, nation)))).map(([id]) => id));
      for (const id of now) if (!contested.has(id)) closures.push(`${id}@${state.turn}`);
      contested = now;
    },
  });
  const acts = [];
  for (const edge of Object.values(last.relationships)) for (const event of edge.history ?? []) if (FORCE_KINDS.has(event.kind) && edge.from !== "USA") acts.push(`${edge.from}>${edge.to}:${event.kind}`);
  const pairs = {};
  for (const act of acts) {
    const pair = act.split(":")[0];
    pairs[pair] = (pairs[pair] ?? 0) + 1;
  }
  const wars = Object.values(last.conflicts).filter((war) => !war.inherited);
  const mid = (band) => (band ? (band.low + band.high) / 2 : 0);
  const warRows = Object.values(last.conflicts).map((war) => {
    const fought = Math.max(1, (war.endedTurn ?? last.turn) - Math.max(war.startedTurn, 0));
    const killed = mid(war.casualties?.aggressor?.killed) + mid(war.casualties?.defender?.killed);
    return `${war.aggressor}-${war.defender}:${war.status}:${fought}w:${Math.round(killed / fought)}/w:civ${Math.round(war.civilianDeaths ?? 0)}`;
  });
  return {
    seed,
    npcActsOfForce: acts.length,
    byKind: ["blockade", "strike", "invasion"].map((kind) => acts.filter((act) => act.endsWith(`:${kind}`)).length).join("/"),
    busiestPairs: Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pair, n]) => `${pair}:${n}`).join(" ") || "-",
    warsOpened: wars.length,
    straitClosures: closures.length,
    closures: closures.join(" ") || "-",
    brentMean: r(brent.reduce((sum, value) => sum + value, 0) / brent.length),
    brentMax: r(Math.max(...brent)),
    weeksBrentOver90: brent.filter((value) => value > 90).length,
    approvalAtEnd: r(last.player.metrics.approval, 4),
    tempoLedger: (last.npcTempo ?? []).length,
    wars: warRows.join(" ") || "-",
  };
}

const summary = {};
for (const [label, dir] of [["before", beforeArg], ["after", afterArg]]) {
  const E = await engine(dir);
  const rows = seeds.map((seed) => run(E, seed));
  for (const row of rows) console.log(JSON.stringify({ engine: label, ...row }));
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  summary[label] = {
    npcActsOfForce: sum("npcActsOfForce"),
    warsOpened: sum("warsOpened"),
    straitClosures: sum("straitClosures"),
    maxClosuresInATerm: Math.max(...rows.map((row) => row.straitClosures)),
    weeksBrentOver90: sum("weeksBrentOver90"),
    brentMean: r(sum("brentMean") / rows.length),
    approvalAtEndMean: r(sum("approvalAtEnd") / rows.length, 4),
  };
}
console.log(JSON.stringify({ weeks, seeds: seeds.length, summary }));
