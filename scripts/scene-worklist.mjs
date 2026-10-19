#!/usr/bin/env node
// What scene stills the shipped scenarios actually ask for, and the job file
// that buys the missing ones.
//
// The facet space is 18 classes x 6 sites x 4 registers = 432 photographs, and
// generating all of it would buy mostly combinations no scenario produces. A
// war at a chokepoint is real content; a triumph at a chokepoint is not, and
// paying for it buys an image nobody is ever shown.
//
// So demand is measured off the corpus the game ships. Every item here is a
// still some real scenario will resolve to.
//
// Usage: node scripts/scene-worklist.mjs <jobId> [--out FILE] [--report]

import { mkdir, writeFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const jobId = args[0] && !args[0].startsWith("--") ? args[0] : undefined;
if (!jobId && !reportOnly) {
  console.error("usage: node scripts/scene-worklist.mjs <jobId> [--out FILE] [--report]");
  process.exit(1);
}
const outAt = args.indexOf("--out");
const outPath =
  outAt === -1 ? path.join(root, "content", "jobs", `${jobId}.json`) : args[outAt + 1];

const { CORE_SCENARIOS, sceneFacets, sceneKey, sceneInstruction } = await import(
  path.join(root, "packages/content/dist/index.js")
);

const scenesDir = path.join(root, "assets/player/scenes");
const have = new Set(
  existsSync(scenesDir)
    ? readdirSync(scenesDir)
        .filter((f) => f.endsWith(".webp"))
        .map((f) => f.replace(/\.webp$/, "").replace(/^scene_/, ""))
    : [],
);

// One entry per distinct facet tuple, carrying how many scenarios want it.
// The count is what decides whether a thin combination is worth buying at all.
const wanted = new Map();
for (const def of CORE_SCENARIOS) {
  const facets = sceneFacets(def);
  const key = sceneKey(facets);
  const entry = wanted.get(key);
  if (entry) entry.scenarios.push(def.id);
  else wanted.set(key, { facets, scenarios: [def.id] });
}

const fileFor = (key) => `scene_${key.replace(/-/g, "_")}.webp`;
const missing = [...wanted.entries()].filter(([key]) => !have.has(fileFor(key).replace(/^scene_|\.webp$/g, "")));

console.log(`Scene coverage — ${CORE_SCENARIOS.length} shipped scenario(s)`);
console.log(`  distinct facet tuples asked for: ${wanted.size}`);
console.log(`  already on disk:                 ${wanted.size - missing.length}`);
console.log(`  to generate:                     ${missing.length}`);
for (const [key, entry] of wanted) {
  const mark = have.has(fileFor(key).replace(/^scene_|\.webp$/g, "")) ? "have" : "MISS";
  console.log(`    ${mark}  ${key.padEnd(34)} ${entry.scenarios.join(", ")}`);
}

if (reportOnly) process.exit(0);

const items = missing.map(([key, entry]) => ({
  id: fileFor(key).replace(/\.webp$/, ""),
  payload: { prompt: sceneInstruction(entry.facets), sceneKey: key, demand: entry.scenarios.length },
}));

const job = { id: jobId, kind: "scene-batch", driver: "image", items };
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(job, null, 2), "utf8");
console.log(`\n${items.length} item(s) written to ${outPath}`);
