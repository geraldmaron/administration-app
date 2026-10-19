#!/usr/bin/env node
// Writes one importable save per fixture module, built from the current dist.
//
// The browser suite needs campaigns that are further along than a fresh oath,
// and clicking Continue twelve times in a browser costs minutes per test and
// makes every spec depend on the Continue flow working. A fixture is instead
// sealed and advanced here, in Node, against the same compiled packages the
// web build bundles, then imported the way a player imports an exported save
// (`loadSave(JSON.parse(text))`). A fixture is never checked in: a save
// written by last month's engine proves nothing about this month's.
//
// Every `scripts/fixtures/*.mjs` whose name does not start with `_` is a
// fixture. It exports `name` (lowercase, digits and hyphens: it becomes a file
// name) and `build()`, which returns a Campaign. Files starting with `_` are
// helpers the fixtures share.
//
//   node scripts/make-fixture-saves.mjs                  every fixture
//   node scripts/make-fixture-saves.mjs --only week-12   a comma-separated subset
//   node scripts/make-fixture-saves.mjs --out <dir>      somewhere other than apps/web/tests/.fixtures
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSave, loadSave } from "../packages/engine/dist/save.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_MODULES = join(ROOT, "scripts", "fixtures");
const NAME = /^[a-z0-9][a-z0-9-]*$/;

import "./register-player-core.mjs";

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
  return value;
}

function fixtureFiles() {
  return readdirSync(FIXTURE_MODULES)
    .filter((file) => file.endsWith(".mjs") && !file.startsWith("_"))
    .sort();
}

async function loadFixture(file) {
  const mod = await import(pathToFileURL(join(FIXTURE_MODULES, file)).href);
  if (typeof mod.name !== "string" || !NAME.test(mod.name)) {
    throw new Error(`exports name ${JSON.stringify(mod.name)}; it must match ${NAME}`);
  }
  if (typeof mod.build !== "function") throw new Error("exports no build() function");
  return { name: mod.name, build: mod.build };
}

// Written to a temporary name and renamed into place, so a second run sharing
// this tree never reads a half-written save.
function writeAtomically(path, text) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, path);
}

function serialize(fixture) {
  const campaign = fixture.build();
  if (typeof campaign !== "object" || campaign === null) throw new Error("build() returned no campaign");
  const text = JSON.stringify(createSave(campaign));
  // The file is only worth writing if the app will open it: this is the same
  // call the vault's import makes, so a save it would refuse fails here, with
  // the fixture's name on it, instead of as a timeout in a browser.
  const reopened = loadSave(JSON.parse(text));
  return { text, turn: reopened.turn, calendar: reopened.calendar };
}

function removeStale(outDir, kept) {
  for (const file of readdirSync(outDir)) {
    if (file.endsWith(".json") && !kept.has(basename(file, ".json"))) rmSync(join(outDir, file));
  }
}

async function main() {
  const outDir = resolve(argValue("--out") ?? join(ROOT, "apps", "web", "tests", ".fixtures"));
  const only = argValue("--only")?.split(",").map((name) => name.trim()).filter(Boolean);
  mkdirSync(outDir, { recursive: true });

  const failures = [];
  const fixtures = [];
  for (const file of fixtureFiles()) {
    try {
      fixtures.push({ file, ...(await loadFixture(file)) });
    } catch (error) {
      failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const seen = new Map();
  for (const fixture of fixtures) {
    if (seen.has(fixture.name)) failures.push(`${fixture.file}: name "${fixture.name}" is already taken by ${seen.get(fixture.name)}`);
    seen.set(fixture.name, fixture.file);
  }
  const unknown = (only ?? []).filter((name) => !seen.has(name));
  if (unknown.length > 0) failures.push(`--only names fixtures that do not exist: ${unknown.join(", ")}`);

  const selected = fixtures.filter((fixture) => !only || only.includes(fixture.name));
  for (const fixture of failures.length > 0 ? [] : selected) {
    const started = process.hrtime.bigint();
    try {
      const { text, turn, calendar } = serialize(fixture);
      writeAtomically(join(outDir, `${fixture.name}.json`), text);
      const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
      const date = `${calendar.year}-${String(calendar.month).padStart(2, "0")}-${String(calendar.day).padStart(2, "0")}`;
      console.log(`fixture ${fixture.name}: turn ${turn}, ${date}, ${(text.length / 1_048_576).toFixed(1)} MB, ${Math.round(ms)} ms`);
    } catch (error) {
      failures.push(`${fixture.file}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`make-fixture-saves: ${failure}`);
    process.exit(1);
  }
  if (!only) removeStale(outDir, new Set(fixtures.map((fixture) => fixture.name)));
  console.log(`make-fixture-saves: ${selected.length} fixture(s) in ${outDir}`);
}

await main();
