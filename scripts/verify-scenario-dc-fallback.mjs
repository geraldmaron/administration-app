#!/usr/bin/env node
// A scenario set at home is placed where it happens, not in Washington by default.
//
// `resolveLocus` gives every scenario a point on the map. On home ground it
// used to place every city, coast and interior site at a random offset of up
// to 1.6 degrees from the national capital, so a plant closure, a harbor
// strike and a farm-country drought all drew within a short drive of the White
// House, and an "interior" site could land in Virginia, Maryland or the
// Atlantic. US-area sites now resolve to a state picked from the campaign seed
// and the scenario id, at a real city of the right kind in it.
//
// Washington stays Washington where the scenario says so: a `capital` site is
// declared to be the seat of government itself (the White House, Congress, the
// courts, a department's headquarters), and so is an authored `state: "DC"` or
// a city in DC. Everything else that still lands in or around DC got there by
// falling back, and so did a seeded state where the story names or implies a
// real one. Both are counted per scenario and held as a ratchet
// (scripts/baselines/scenario-dc-fallback.json):
//
//   dc-by-fallback:<id>   on home ground, inside the capital's offset ring or in
//                         DC, without a site that is genuinely Washington
//   seeded-state:<id>     a US place picked by the seed because the scenario
//                         authors no city or state; the content backfill
//                         authors one where the story names or implies it
//
// The corpus read is the bake the player is dealt plus the TypeScript packs,
// so the count does not depend on whether this machine has the gitignored
// authoring corpus.
//
//   node scripts/verify-scenario-dc-fallback.mjs                     the gate
//   node scripts/verify-scenario-dc-fallback.mjs --update-baseline   shrink the baseline
//   node scripts/verify-scenario-dc-fallback.mjs <fixture-dir>       the proof's trees:
//        scenarios.jsonl, baseline.json
//   ... <fixture-dir> --locus=<module>                                 the proof's stand-in resolver,
//        a module exporting resolveLocus, so a regression the real one no longer makes can still be shown
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { holdRatchet } from "./baselines/ratchet.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const base = fixture ? path.resolve(fixture) : root;
const BAKE = path.join(root, "packages/player-core/src/content/bundled-corpus.generated.ts");
const BASELINE = fixture ? path.join(base, "baseline.json") : path.join(root, "scripts/baselines/scenario-dc-fallback.json");
const CONTENT = path.join(root, "packages/content/dist/index.js");

// The old offset ring reached 1.6 degrees; a hair over it catches every point
// the ring could draw and nothing a real city outside the DC metro sits on.
const DC_RING_DEG = 1.7;

if (!existsSync(CONTENT)) {
  console.error("verify-scenario-dc-fallback: FAIL — packages/content/dist is missing. Build the workspace first.");
  process.exit(1);
}
const content = await import(CONTENT);
const locusModule = process.argv.find((arg) => arg.startsWith("--locus="))?.slice("--locus=".length);
const { resolveLocus } = locusModule ? await import(pathToFileURL(path.resolve(locusModule)).href) : content;
const { worldCities } = await import(path.join(root, "packages/world/dist/index.js"));
const cityState = new Map(worldCities.map((city) => [city.id, city.state]));

function parseJsonl(body) {
  return body
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => content.ScenarioDef.parse(JSON.parse(line)));
}

function scenarios() {
  if (fixture) return parseJsonl(readFileSync(path.join(base, "scenarios.jsonl"), "utf8"));
  const baked = [];
  if (existsSync(BAKE)) {
    for (const match of readFileSync(BAKE, "utf8").matchAll(/^ {4}jsonl: (".*"),$/gm)) baked.push(...parseJsonl(JSON.parse(match[1])));
  }
  return [...baked, ...(content.CORE_SCENARIOS ?? []), ...(content.PILOT_SCENARIOS ?? [])];
}

/** The scenario says its place is Washington: the seat of government, or DC by name. */
function genuinelyWashington(locus) {
  if (locus.state === "DC") return true;
  if (locus.city && cityState.get(locus.city) === "DC") return true;
  return locus.site === "capital" && !locus.city && !locus.state;
}

/** A point standing on a real dataset city in the state it claims: Baltimore is Maryland, not a DC offset. */
function onCityInItsState(resolved) {
  return worldCities.some((city) => city.state === resolved.state && city.lat === resolved.lat && city.lon === resolved.lon);
}

function inWashington(resolved, capital) {
  if (resolved.state === "DC") return true;
  if (resolved.state && onCityInItsState(resolved)) return false;
  return Math.hypot(resolved.lat - capital.lat, resolved.lon - capital.lon) <= DC_RING_DEG;
}

const defs = scenarios();
if (defs.length === 0) {
  console.error("verify-scenario-dc-fallback: FAIL — read no scenarios at all; the corpus path is wrong.");
  process.exit(1);
}

const campaign = content.sealedCampaign("dc-fallback-gate");
const home = campaign.founding.nation;
const capital = campaign.nations[home].base.geo;
const abroad = Object.keys(campaign.nations).find((id) => id !== home);
const current = {};
let homeCount = 0;
let genuine = 0;
for (const def of defs) {
  if (def.locus.ground !== "home") continue;
  homeCount += 1;
  const resolved = resolveLocus(campaign, def, abroad);
  if (!resolved) {
    current[`unresolved:${def.id}`] = 1;
    continue;
  }
  if (genuinelyWashington(def.locus)) {
    genuine += 1;
    continue;
  }
  if (inWashington(resolved, capital)) current[`dc-by-fallback:${def.id}`] = 1;
  else if (!def.locus.city && !def.locus.state && !def.locus.bind && def.locus.site !== "chokepoint") current[`seeded-state:${def.id}`] = 1;
}

const tally = (prefix) => Object.keys(current).filter((key) => key.startsWith(prefix)).length;
const held = holdRatchet({
  label: "verify-scenario-dc-fallback",
  repoRoot: root,
  file: BASELINE,
  comment:
    "Home-ground scenarios placed by a fallback rather than by what they say: in or around DC without a Washington site, " +
    "or in a state picked by the seed. Written by `node scripts/verify-scenario-dc-fallback.mjs --update-baseline`; it may only shrink. " +
    "Author the state or city the story names or implies.",
  current,
  update: process.argv.includes("--update-baseline"),
});
const summary =
  `${defs.length} scenario(s), ${homeCount} on home ground, ${genuine} genuinely in Washington; ` +
  `${tally("dc-by-fallback:")} in DC by fallback, ${tally("seeded-state:")} in a seeded state` +
  `${tally("unresolved:") ? `, ${tally("unresolved:")} with no place at all` : ""}.`;
if (!held) {
  console.error(`\nverify-scenario-dc-fallback: FAIL — ${summary}`);
  process.exit(1);
}
console.log(`verify-scenario-dc-fallback: OK — ${summary}`);
