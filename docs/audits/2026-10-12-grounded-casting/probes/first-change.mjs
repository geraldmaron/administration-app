// Measures the smaller first change against whatever dist/ sits under ROOT
// (default: this checkout). Same seeds and pair rules as seed-placement.mjs and
// flag-callbacks.mjs, but each follow-up is resolved on a board where the
// earlier scene was actually answered through the committed memory path, so a
// build that keeps the earlier scene's place shows it and one that does not
// shows the old draw. Read-only; no build.
//
//   node docs/audits/2026-10-12-grounded-casting/probes/first-change.mjs
//   ROOT=/path/to/other/checkout node .../first-change.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.env.ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const load = (path) => import(pathToFileURL(join(root, path)).href);
const content = await load("packages/content/dist/index.js");
const engine = await load("packages/engine/dist/index.js");
const world = await load("packages/world/dist/index.js");
const { sealedCampaign } = await load("packages/content/dist/preview-board.js");
const dir = join(root, "content/corpus/shards");
const defs = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => content.ScenarioDef.parse(JSON.parse(l))));
const byId = new Map(defs.map((d) => [d.id, d]));
const seeds = ["probe-a", "probe-b", "probe-c", "probe-d", "probe-e", "probe-f"];
const camps = seeds.map((s) => sealedCampaign(s));
const home = camps[0].founding.nation;
const keeps = typeof content.storyPlace === "function";
const where = (l) => l?.state ?? l?.placeName ?? "-";

// The earlier scene answered: the place it would leave on the board, applied
// through the engine's own writer. A build without the mechanism leaves none.
function afterAnswer(c, earlier) {
  if (!keeps) return c;
  const place = content.storyPlace(content.resolveLocus(c, earlier, home), home);
  const flags = earlier.replies.flatMap((r) => r.sets ?? []);
  const effects = [
    ...(earlier.family?.role === "opener" ? [{ kind: "scenarioFamily", open: { family: earlier.family.id, counterpart: home, scenario: earlier.id, turn: c.turn, ...(place ? { place } : {}) } }] : []),
    ...(flags.length > 0 ? [{ kind: "scenarioFamily", callback: { flags, ...(place ? { place } : {}) } }] : []),
  ];
  return effects.reduce((board, effect) => engine.applyScenarioFamily(board, effect), c);
}

function pairStats(pairs) {
  let all = 0, same = 0, fair = 0, fairSame = 0;
  for (const [a, b] of pairs) for (const c of camps) {
    const first = where(content.resolveLocus(c, a, home));
    const next = where(content.resolveLocus(afterAnswer(c, a), b, home));
    all += 1; if (first === next) same += 1;
    if (a.locus.site !== "capital" && b.locus.site !== "capital") { fair += 1; if (first === next) fairSame += 1; }
  }
  return { all, same, fair, fairSame };
}

const fams = new Map();
for (const d of defs) if (d.family) fams.set(d.family.id, [...(fams.get(d.family.id) ?? []), d]);
const arcPairs = [];
for (const members of fams.values()) {
  const opener = members.find((m) => m.family.role === "opener");
  if (!opener || opener.locus.ground !== "home") continue;
  for (const later of members) if (later !== opener && later.locus.ground === "home") arcPairs.push([opener, later]);
}
const setters = new Map();
for (const d of defs) for (const r of d.replies) for (const f of r.sets ?? []) setters.set(f, [...(setters.get(f) ?? []), d]);
const flagPairs = [];
const seen = new Set();
for (const d of defs) for (const g of d.conditions.filter((c) => c.kind === "flag" && c.is && setters.has(c.flag))) {
  for (const s of setters.get(g.flag)) {
    const key = `${s.id}>${d.id}`;
    if (s.id === d.id || seen.has(key) || s.locus.ground !== "home" || d.locus.ground !== "home") continue;
    seen.add(key); flagPairs.push([s, d]);
  }
}

const unplaced = defs.filter((d) => d.locus.ground === "home" && d.locus.site !== "capital" && !d.locus.city && !d.locus.state && d.locus.bind !== "condition");
const strait = new Set(world.chokepoints.map((cp) => cp.name));
const canal = defs.filter((d) => d.locus.ground === "home" && camps.some((c) => strait.has(content.resolveLocus(c, d, home)?.placeName)));
const fit = typeof content.stateFit === "function" ? unplaced.filter((d) => { const f = content.stateFit(d); return f.axes.length > 0 || f.hazard || f.acute.length > 0; }) : [];

// Within one campaign: the most-drawn state among the unplaced, against its population share.
const landed = unplaced.map((d) => content.resolveLocus(camps[0], d, home)?.state).filter(Boolean);
const counts = {};
for (const s of landed) counts[s] = (counts[s] ?? 0) + 1;
const [topState, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
const usPop = world.worldStates.filter((s) => s.id !== "DC").reduce((n, s) => n + s.population, 0);

// Abroad: for every foreign nation and the three area sites, a dataset city, the capital, or an area.
const foreign = Object.values(camps[0].nations).map((n) => n.base).filter((n) => n.id !== home);
const abroad = { city: 0, capital: 0, area: 0 };
for (const n of foreign) for (const site of ["coast", "interior", "city"]) {
  const l = content.resolveLocus(camps[0], { ...unplaced[0], id: `abroad-${n.id}-${site}`, locus: { site, ground: "counterpart", descriptor: "the harbor wall where the trawlers tie up" } }, n.id);
  if (l.placeName === n.identity.capital || (l.lat === n.geo.lat && l.lon === n.geo.lon)) abroad.capital += 1;
  else if (world.worldCities.some((c) => c.nation === n.id && c.lat === l.lat && c.lon === l.lon)) abroad.city += 1;
  else abroad.area += 1;
}

const sample = (id) => seeds.map((s, i) => content.resolveLocus(camps[i], byId.get(id), home)?.placeName).join(" | ");
const arc = pairStats(arcPairs), flag = pairStats(flagPairs);
console.log(JSON.stringify({
  root, keepsPlaces: keeps,
  unplacedHomeNonCapital: unplaced.length,
  unplacedWithDeclaredFit: fit.length,
  unplacedPopulationOnly: unplaced.length - fit.length,
  arcSeedPairsSamePlace: `${arc.same} of ${arc.all}`,
  arcFairSeedPairsSamePlace: `${arc.fairSame} of ${arc.fair}`,
  flagPairs: flagPairs.length,
  flagSeedPairsSamePlace: `${flag.same} of ${flag.all}`,
  flagFairSeedPairsSamePlace: `${flag.fairSame} of ${flag.fair}`,
  homeScenariosOnAStrait: canal.map((d) => d.id),
  withinCampaignTopState: `${topState} ${topCount} of ${landed.length} (${((topCount / landed.length) * 100).toFixed(1)}%; population share ${((world.stateById.get(topState).population / usPop) * 100).toFixed(1)}%)`,
  abroadAreaSites: abroad,
}, null, 2));
for (const id of ["the-yard-that-builds-the-boats", "the-frost-that-took-the-belt", "the-fuel-price-spike", "the-reef-line-at-low-tide", "the-case-that-came-back-negative-twice"]) {
  console.log(`${id}: ${sample(id)}`);
}
