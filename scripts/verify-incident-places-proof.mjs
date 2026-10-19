#!/usr/bin/env node
// Proves verify-incident-places.mjs rejects a pinnable kind with no place, a
// kind the resolver stopped declaring, a state item pinned outside its state,
// and a new place-bearing engine record nobody classified.
//
// Each broken resolver is a small module that wraps the real one; each broken
// engine is a copy of the engine's sources with one record added. All of it is
// written inside the checkout and removed in a finally block.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.incident-places-proof-${process.pid}`);
const realResolver = pathToFileURL(path.join(root, "packages/player-core/dist/geo/place-of.js")).href;

function run(args) {
  try {
    return { passed: true, output: execFileSync("node", ["scripts/verify-incident-places.mjs", ...args], { cwd: root, stdio: "pipe" }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function resolverWith(name, body) {
  const file = path.join(fixtureDir, `${name}.mjs`);
  writeFileSync(file, `import * as real from ${JSON.stringify(realResolver)};\n${body}\n`);
  return `--resolver=${file}`;
}

const problems = [];
function expect(label, args, wantPass, pattern) {
  const { passed, output } = run(args);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
  expect(
    "an emergency with no place",
    [resolverWith("no-emergency", 'export const PINNABLE_KINDS = real.PINNABLE_KINDS;\nexport const placeOf = (item) => (item.kind === "emergency" ? undefined : real.placeOf(item));')],
    false,
    /emergency for the nation: no place/,
  );
  expect(
    "a resolver that stopped declaring claims",
    [resolverWith("no-claims", 'export const PINNABLE_KINDS = real.PINNABLE_KINDS.filter((kind) => kind !== "claim");\nexport const placeOf = real.placeOf;')],
    false,
    /PendingClaim is pinned as "claim", and placeOf's PINNABLE_KINDS does not include it/,
  );
  expect(
    "a state's mark pinned at the nation although the state has a city",
    [
      resolverWith(
        "mark-at-nation",
        'export const PINNABLE_KINDS = real.PINNABLE_KINDS;\nexport const placeOf = (item) => (item.kind === "mark" ? real.placeOf({ kind: "emergency", nation: item.nation, record: { scope: { kind: "nation" } } }) : real.placeOf(item));',
      ),
    ],
    false,
    /mark in OH: named OH and landed outside it/,
  );
  expect(
    "a state with no dataset city pinned at the national capital instead of its capitol",
    [
      resolverWith(
        "cityless-at-nation",
        'export const PINNABLE_KINDS = real.PINNABLE_KINDS;\nexport const placeOf = (item) => (item.kind === "claim" && item.state === "MT" ? real.placeOf({ kind: "emergency", nation: item.nation, record: { scope: { kind: "nation" } } }) : real.placeOf(item));',
      ),
    ],
    false,
    /claim in MT: MT has no dataset city, so it pins at its capitol/,
  );
  const engineCopy = path.join(fixtureDir, "engine-src");
  cpSync(path.join(root, "packages/engine/src"), engineCopy, { recursive: true });
  const campaignFile = path.join(engineCopy, "state-campaign.ts");
  const source = readFileSync(campaignFile, "utf8");
  writeFileSync(
    campaignFile,
    source.replace("export type Campaign = {", "export type Riot = { readonly id: string; readonly state: StateId };\n\nexport type Campaign = {\n  readonly riots: Readonly<Record<string, Riot>>;"),
  );
  expect("a new place-bearing record on the Campaign that nobody classified", [`--engine-src=${engineCopy}`], false, /engine record Riot names a place but nothing pins it/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-incident-places-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run([]);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
