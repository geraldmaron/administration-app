#!/usr/bin/env node
// Every government on the roster is a whole country in every surface that
// draws one, and every shape on the map belongs to somebody.
//
// The roster grew from 61 to 196 and each country is read by a dozen tables
// that were written when there were 61: the map, the flags, the name banks,
// the portrait heritage, the party systems, the schools, the combatant
// commands. A country missing from any of them either throws in the middle of a
// founding or, worse, falls back to something that is not it (an Anglo name, a
// dark shape). This gate checks all of them at once, against the built packages
// and the web app's own flag table, so a country is added everywhere or the
// build says where it is not.
//
// Rules:
//   mark        a map shape, or a finite capital pin for a government too small
//               for the base map's shapes
//   flag        a code in apps/web's flag table and the vendored artwork for it
//   people      a name culture, a portrait heritage mix and schools to draw from
//   politics    a party system and a combatant command
//   shapes      every map shape is a roster government or a territory with a
//               named administrator on the roster (or null: disputed)
//   vacuity     a census of fewer than 150 governments is refused, so a broken
//               loader cannot pass by checking nothing
//
// WORLD_COVERAGE_FIXTURE_PATH names a JSON census to check instead of the
// built dataset; scripts/verify-world-coverage-proof.mjs uses it to prove each
// rule refuses what it claims to.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MIN_ROSTER = 150;

async function liveCensus() {
  const world = await import("../packages/world/dist/index.js");
  const maps = await import("../packages/world/dist/maps/index.js");
  const commands = await import("../packages/engine/dist/command-catalog.js");
  const flagTable = readFileSync(path.join(root, "packages/ui-web/src/assets/flags/nation-flag-codes.generated.ts"), "utf8");
  const flagCodes = Object.fromEntries([...flagTable.matchAll(/^\s+([A-Z]{3}): "([a-z]{2})",$/gm)].map((m) => [m[1], m[2]]));
  const resolves = (fn) => {
    try {
      const value = fn();
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    } catch {
      return false;
    }
  };
  const nations = world.worldDataset.nations.map((nation) => {
    const id = nation.id;
    const flag = flagCodes[id];
    return {
      id,
      shape: maps.COUNTRY_PATHS[id] !== undefined,
      pin: Number.isFinite(maps.projectToPlate(nation.geo.lon, nation.geo.lat).x),
      flag: flag ?? null,
      flagArtwork: flag ? existsSync(path.join(root, "scripts/vendor/nation-flags", `${flag}.svg`)) : false,
      nameCulture: resolves(() => world.nameCultureFor(id)),
      heritage: resolves(() => world.heritageMixFor(id)),
      schools: resolves(() => world.schoolsFor(id)),
      partySystem: Boolean(nation.partySystem),
      command: Boolean(commands.AOR_EXCEPTIONS[id] ?? commands.DEFAULT_AOR_BY_REGION[nation.geo.region]),
    };
  });
  return { nations, shapes: Object.keys(maps.COUNTRY_PATHS), territories: maps.TERRITORY_ADMINISTRATOR };
}

function check(census) {
  const failures = [];
  if (census.nations.length < MIN_ROSTER) failures.push(`vacuity: the census holds ${census.nations.length} governments, fewer than ${MIN_ROSTER}`);
  const roster = new Set(census.nations.map((n) => n.id));
  for (const n of census.nations) {
    if (!n.shape && !n.pin) failures.push(`mark: ${n.id} has neither a map shape nor a capital pin`);
    if (!n.flag) failures.push(`flag: ${n.id} has no code in the web app's flag table`);
    else if (!n.flagArtwork) failures.push(`flag: ${n.id}'s artwork ${n.flag}.svg is not vendored`);
    if (!n.nameCulture) failures.push(`people: ${n.id} resolves no name culture`);
    if (!n.heritage) failures.push(`people: ${n.id} resolves no portrait heritage mix`);
    if (!n.schools) failures.push(`people: ${n.id} has no schools to draw its officials from`);
    if (!n.partySystem) failures.push(`politics: ${n.id} has no party system`);
    if (!n.command) failures.push(`politics: ${n.id} resolves no combatant command`);
  }
  for (const shape of census.shapes) {
    if (roster.has(shape)) continue;
    if (!(shape in census.territories)) failures.push(`shapes: map shape ${shape} is neither a roster government nor a listed territory`);
    else if (census.territories[shape] !== null && !roster.has(census.territories[shape])) {
      failures.push(`shapes: territory ${shape} names administrator ${census.territories[shape]}, which is not on the roster`);
    }
  }
  return failures;
}

const fixture = process.env.WORLD_COVERAGE_FIXTURE_PATH;
const census = fixture ? JSON.parse(readFileSync(fixture, "utf8")) : await liveCensus();
const failures = check(census);
if (failures.length > 0) {
  console.error(`verify-world-coverage: ${failures.length} gap(s).\n\n  ${failures.slice(0, 40).join("\n  ")}`);
  process.exit(1);
}
const pins = census.nations.filter((n) => !n.shape).length;
console.log(`OK: ${census.nations.length} governments covered in every surface (${pins} drawn as capital pins); ${census.shapes.length} map shapes all accounted for.`);
