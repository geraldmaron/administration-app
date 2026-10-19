// Deals shipped scenarios on several seeds through the committed dist/ and
// prints where each lands: the resolved place, the state, and whether two
// members of the same arc land in the same state. Read-only; no build.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const content = await import(pathToFileURL(join(root, "packages/content/dist/index.js")).href);
const { sealedCampaign } = await import(pathToFileURL(join(root, "packages/content/dist/preview-board.js")).href);
const world = await import(pathToFileURL(join(root, "packages/world/dist/index.js")).href);
const dir = join(root, "content/corpus/shards");
const defs = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => content.ScenarioDef.parse(JSON.parse(l))));
const byId = new Map(defs.map((d) => [d.id, d]));
const seeds = ["probe-a", "probe-b", "probe-c", "probe-d", "probe-e", "probe-f"];
const campaigns = seeds.map((s) => sealedCampaign(s));
const home = campaigns[0].founding.nation;

const place = (c, d) => {
  const l = content.resolveLocus(c, d, home);
  return l ? `${l.placeName}${l.state ? ` [${l.state}]` : ""}` : "(none)";
};

const sample = (process.argv[2] ?? "the-yard-that-builds-the-boats,the-rearmament-line-draws-on-the-clinics-again,the-clinics-that-never-got-the-difference-back,the-crossing-at-the-gate,the-held-line,the-border-empties,the-town-on-the-wrong-side-of-the-seal").split(",");
for (const id of sample) {
  const d = byId.get(id);
  if (!d) { console.log(`missing ${id}`); continue; }
  console.log(`\n${id}  (site=${d.locus.site}, ground=${d.locus.ground}, city=${d.locus.city ?? "-"}, state=${d.locus.state ?? "-"}, bind=${d.locus.bind ?? "-"})`);
  campaigns.forEach((c, i) => console.log(`  ${seeds[i]}: ${place(c, d)}`));
}

// Arc persistence: for every family whose members stand on home ground, does
// the close land in the opener's state on the same seed?
console.log("\nArc place persistence (same seed, opener vs later member, home ground):");
const fams = new Map();
for (const d of defs) if (d.family) fams.set(d.family.id, [...(fams.get(d.family.id) ?? []), d]);
let pairs = 0, same = 0;
for (const [fid, members] of fams) {
  const opener = members.find((m) => m.family.role === "opener");
  if (!opener || opener.locus.ground !== "home") continue;
  for (const later of members.filter((m) => m !== opener && m.locus.ground === "home")) {
    for (const c of campaigns) {
      const a = content.resolveLocus(c, opener, home), b = content.resolveLocus(c, later, home);
      pairs += 1;
      if ((a?.state ?? a?.placeName) === (b?.state ?? b?.placeName)) same += 1;
    }
    console.log(`  ${fid}: ${opener.id} -> ${later.id}: ` + campaigns.map((c) => `${place(c, opener)} -> ${place(c, later)}`).join(" | "));
  }
}
console.log(`  same place on ${same} of ${pairs} seed-pairs`);

// Spread: across all unplaced, non-capital home scenarios on one seed, which states do they land in?
const unplaced = defs.filter((d) => d.locus.ground === "home" && d.locus.site !== "capital" && !d.locus.city && !d.locus.state && d.locus.bind !== "condition");
const spread = {};
for (const d of unplaced) { const s = content.resolveLocus(campaigns[0], d, home)?.state ?? "none"; spread[s] = (spread[s] ?? 0) + 1; }
console.log(`\nUnplaced non-capital home scenarios: ${unplaced.length}; states they land in on ${seeds[0]}:`, JSON.stringify(spread));

// Sector fit: for unplaced economy scenarios, show the landed state's economy axes.
console.log("\nUnplaced economy/disaster scenarios, landed state and its top economy axis (seed probe-a):");
for (const d of unplaced.filter((d) => ["economy", "disaster", "unrest"].includes(d.class))) {
  const l = content.resolveLocus(campaigns[0], d, home);
  const st = l?.state ? world.worldDataset.states.find((s) => s.id === l.state) : undefined;
  const top = st ? Object.entries(st.character.economy).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(",") : "-";
  console.log(`  ${d.class}\t${d.id}\t${l?.placeName}\t${top}\t"${d.subject}"`);
}
