// Flag-gated callbacks: a scenario gated on a flag another scenario's reply sets
// is a follow-up in fiction even when it is not in a family. For each such
// pair on home ground, does the follow-up land in the setter's place on the
// same seed? Read-only through committed dist/.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const content = await import(pathToFileURL(join(root, "packages/content/dist/index.js")).href);
const { sealedCampaign } = await import(pathToFileURL(join(root, "packages/content/dist/preview-board.js")).href);
const dir = join(root, "content/corpus/shards");
const defs = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => content.ScenarioDef.parse(JSON.parse(l))));
const setters = new Map();
for (const d of defs) for (const r of d.replies) for (const f of r.sets ?? []) setters.set(f, [...(setters.get(f) ?? []), d]);
const seeds = ["probe-a", "probe-b", "probe-c", "probe-d"];
const camps = seeds.map((s) => sealedCampaign(s));
const home = camps[0].founding.nation;
const where = (c, d) => { const l = content.resolveLocus(c, d, home); return l?.state ?? l?.placeName ?? "-"; };
let pairs = 0, homePairs = 0, samePlace = 0, seedPairs = 0, familyMembers = 0, placedPairs = 0, placedSame = 0;
const rows = [];
for (const d of defs) {
  const gates = d.conditions.filter((c) => c.kind === "flag" && c.is && setters.has(c.flag));
  for (const g of gates) for (const s of setters.get(g.flag)) {
    if (s.id === d.id) continue;
    pairs += 1;
    if (d.family && s.family && d.family.id === s.family.id) familyMembers += 1;
    if (s.locus.ground !== "home" || d.locus.ground !== "home") continue;
    homePairs += 1;
    const placed = camps.map((c) => [where(c, s), where(c, d)]);
    placed.forEach(([a, b]) => { seedPairs += 1; if (a === b) samePlace += 1; });
    if (s.locus.site !== "capital" || d.locus.site !== "capital") placed.forEach(([a, b]) => { placedPairs += 1; if (a === b) placedSame += 1; });
    rows.push(`${s.id} --[${g.flag}]--> ${d.id}: ${placed.map(([a, b]) => `${a}->${b}`).join(" ")}`);
  }
}
console.log(`flag callbacks (setter -> reader pairs): ${pairs}; inside one family: ${familyMembers}; both on home ground: ${homePairs}`);
console.log(`home-ground pairs landing in the same place on the same seed: ${samePlace} of ${seedPairs} seed-pairs`);
console.log(`excluding pairs where both sit at the capital: same place on ${placedSame} of ${placedPairs} seed-pairs`);
for (const r of rows) console.log("  " + r);
