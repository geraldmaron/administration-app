#!/usr/bin/env node
// Everything the map can pin has a place, and one resolver says where.
//
// Conditions, grievance marks, pending claims, declared emergencies and located orders all
// resolve through player-core's `placeOf`: the named city, else the state's
// largest city or its capitol, else the nation. This gate holds two things.
//
// 1. Coverage, read from the engine's own types. Every record the Campaign
//    keeps that names a place (a field typed StateId, CityId or EmergencyScope)
//    and every record a state keeps in a list is either a kind `placeOf`
//    answers for or is declared here as not a pin, with the reason. A new
//    place-bearing record fails until somebody decides which it is.
// 2. Resolution, over every value the engine can produce: each condition kind
//    at nation scope, in every state and in every dataset city; an emergency
//    for the nation and for every state; a mark, claim and state order in every
//    state; and a foreign order in every nation. Construction orders lack a
//    place-bearing subject and must remain unplaced.
//    Each must come back with a finite point, a city-named item must land on
//    that city, and a state-named item must land on a city in that state, or
//    on its capitol where the dataset has no city there (counted and
//    reported, never at the national capital).
//
//   node scripts/verify-incident-places.mjs
//   node scripts/verify-incident-places.mjs --resolver=<module> --engine-src=<dir>   the proof's fixtures
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const RESOLVER = path.resolve(arg("resolver") ?? path.join(root, "packages/player-core/dist/geo/place-of.js"));
const ENGINE_SRC = path.resolve(arg("engine-src") ?? path.join(root, "packages/engine/src"));
const failures = [];

/** Engine record type -> the `placeOf` kind that pins it. */
const PINNED_BY = { NationCondition: "condition", DeclaredEmergency: "emergency", ExecutiveOrderRecord: "order", GrievanceMark: "mark", PendingClaim: "claim" };

/** Place-bearing records the map does not pin, and why. */
const NOT_PINNED = {
  PersonRuntime: "a person's governor overlay names the state they govern; people are drawn on their office, not as incidents",
  MilitaryConstructionProject: "an appropriation source with an optional host state, not a geolocated work site or emergency incident; the order document identifies its source and commitments, without inventing a project point",
  ScenarioPlace: "where a story's earlier scene happened, kept on a family run and per authored flag so the next scene resolves there; each scene is already pinned through its decision's locus and its Record entry's stamped locales, so this pointer is not an incident of its own",
};

for (const file of [RESOLVER, path.join(root, "packages/engine/dist/index.js"), path.join(root, "packages/world/dist/index.js")]) {
  if (!existsSync(file)) {
    console.error(`verify-incident-places: FAIL — ${path.relative(root, file)} is missing. Build the workspace first.`);
    process.exit(1);
  }
}
const resolver = await import(pathToFileURL(RESOLVER).href);
const engine = await import(pathToFileURL(path.join(root, "packages/engine/dist/index.js")).href);
const world = await import(pathToFileURL(path.join(root, "packages/world/dist/index.js")).href);

// --- 1. Coverage from the engine's types -----------------------------------

function engineSources() {
  if (!existsSync(ENGINE_SRC)) return [];
  return readdirSync(ENGINE_SRC)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(path.join(ENGINE_SRC, name), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, ""));
}

/** The body of `export type <name> = { ... }`, brace-matched. */
function typeBody(sources, name) {
  for (const source of sources) {
    const start = source.search(new RegExp(`export type ${name}\\s*=\\s*\\{`));
    if (start < 0) continue;
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}" && --depth === 0) return source.slice(open, i + 1);
    }
  }
  return undefined;
}

/** Types a body holds in a keyed record or a list. */
function heldTypes(body) {
  const held = new Set();
  for (const [, type] of body.matchAll(/Readonly<Record<\w+,\s*(\w+)>>/g)) held.add(type);
  for (const [, type] of body.matchAll(/readonly\s+(\w+)\[\]/g)) held.add(type);
  return held;
}

const namesPlace = (body) => /:\s*(StateId|CityId|EmergencyScope)\b/.test(body);

const sources = engineSources();
const campaignBody = typeBody(sources, "Campaign");
const stateBody = typeBody(sources, "StateRuntime");
if (!campaignBody || !stateBody) failures.push(`could not find the engine's Campaign and StateRuntime types under ${path.relative(root, ENGINE_SRC)}.`);
const pinnable = new Set();
for (const type of campaignBody ? heldTypes(campaignBody) : []) {
  const body = typeBody(sources, type);
  if (body && namesPlace(body)) pinnable.add(type);
}
for (const type of stateBody ? heldTypes(stateBody) : []) if (typeBody(sources, type)) pinnable.add(type);

const kinds = new Set(resolver.PINNABLE_KINDS ?? []);
for (const type of [...pinnable].sort()) {
  if (type in NOT_PINNED) continue;
  const kind = PINNED_BY[type];
  if (!kind) failures.push(`engine record ${type} names a place but nothing pins it: add it to placeOf, or to NOT_PINNED here with the reason.`);
  else if (!kinds.has(kind)) failures.push(`engine record ${type} is pinned as "${kind}", and placeOf's PINNABLE_KINDS does not include it.`);
}
for (const [type, kind] of Object.entries(PINNED_BY)) {
  if (!pinnable.has(type)) failures.push(`${type} (pinned as "${kind}") is no longer a place-bearing record on the Campaign; update PINNED_BY.`);
}

// --- 2. Resolution over every value the engine can produce -----------------

const home = "USA";
const usCities = world.worldCities.filter((city) => city.nation === home && city.state);
const statesWithCity = new Set(usCities.map((city) => city.state));
const placeless = new Set();
let resolved = 0;

function check(label, item, expect) {
  let place;
  try {
    place = resolver.placeOf(item);
  } catch (error) {
    failures.push(`${label}: placeOf threw (${error instanceof Error ? error.message : String(error)}).`);
    return;
  }
  resolved += 1;
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    failures.push(`${label}: no place.`);
    return;
  }
  if (expect.city && place.city !== expect.city) failures.push(`${label}: named ${expect.city} and landed on ${place.city ?? place.level}.`);
  if (expect.nation && place.nation !== expect.nation) failures.push(`${label}: named ${expect.nation} and landed in ${place.nation}.`);
  if (expect.state) {
    if (!statesWithCity.has(expect.state)) {
      placeless.add(expect.state);
      const capitol = world.stateCapitol(expect.state);
      const onCapitol = capitol && place.level === "state" && place.state === expect.state && place.lat === capitol.lat && place.lon === capitol.lon;
      if (!onCapitol) failures.push(`${label}: ${expect.state} has no dataset city, so it pins at its capitol; it landed at ${place.name} (level ${place.level}).`);
    } else if (place.state !== expect.state || !usCities.some((city) => city.id === place.city && city.state === expect.state)) {
      failures.push(`${label}: named ${expect.state} and landed outside it (${place.name}).`);
    }
  }
}

const condition = (kind, extra) => ({
  id: `condition:${kind}:${home}:1`,
  nation: home,
  kind,
  scope: "nation",
  severity: 0.5,
  startedTurn: 1,
  status: "active",
  beats: [],
  ...extra,
});
for (const kind of engine.CONDITION_KINDS) {
  check(`condition ${kind} at nation scope`, { kind: "condition", record: condition(kind, {}) }, {});
  for (const state of world.STATE_IDS) check(`condition ${kind} in ${state}`, { kind: "condition", record: condition(kind, { scope: "region", state }) }, { state });
  for (const city of usCities) {
    check(`condition ${kind} in ${city.id}`, { kind: "condition", record: condition(kind, { scope: "city", state: city.state, city: city.id }) }, { city: city.id });
  }
}
const emergency = (scope) => ({ id: "emergency:test", scope, cause: engine.CONDITION_KINDS[0], declaredTurn: 1, renewedTurn: 1, reason: "test" });
check("emergency for the nation", { kind: "emergency", nation: home, record: emergency({ kind: "nation" }) }, {});
for (const state of world.STATE_IDS) {
  check(`emergency in ${state}`, { kind: "emergency", nation: home, record: emergency({ kind: "state", state }) }, { state });
  const mark = { turn: 1, signature: "test", weight: 0.5, valence: -1, decayRate: 0.05, reason: "test" };
  check(`mark in ${state}`, { kind: "mark", nation: home, state, record: mark }, { state });
  const claim = { signature: "test", openedTurn: 1, expiresTurn: 5, weight: 0.5, reason: "test" };
  check(`claim in ${state}`, { kind: "claim", nation: home, state, record: claim }, { state });
  check(`order in ${state}`, { kind: "order", nation: home, record: { id: `order:${state}`, order: "order-relief-program", turn: 1, contested: false, challengeChance: 0, subject: { kind: "state", state, cause: "wildfire" } } }, { state });
}
for (const nation of world.worldNations) {
  check(`foreign order in ${nation.id}`, { kind: "order", nation: home, record: { id: `order:${nation.id}`, order: "order-border-controls", turn: 1, contested: false, challengeChance: 0, subject: { kind: "foreign", nation: nation.id, declarationId: "test" } } }, { nation: nation.id });
}
const construction = resolver.placeOf({ kind: "order", nation: home, record: { id: "order:construction", order: "order-emergency-construction", turn: 1, contested: false, challengeChance: 0, subject: { kind: "construction", sourceId: "test", declarationId: "test", amount: 1 } } });
if (construction !== undefined) failures.push(`construction order has no subject place, but landed at ${construction.name}.`);

if (failures.length > 0) {
  console.error(`verify-incident-places: FAIL — ${failures.length} problem(s):\n`);
  for (const failure of failures.slice(0, 40)) console.error(`  ${failure}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
const gap = [...placeless].sort();
console.log(
  `verify-incident-places: OK — ${pinnable.size} place-bearing engine record(s) classified; ${resolved} items across ` +
    `${kinds.size} kinds all placed.${gap.length ? ` ${gap.join(", ")} have no dataset city, so their items pin at the state capitol.` : ""}`,
);
