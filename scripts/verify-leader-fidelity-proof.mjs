#!/usr/bin/env node
// verify-leader-fidelity.mjs passing on a clean tree proves only that it ran.
// This runs it against planted breaks and fails unless the gate catches each
// one, by the finding it names rather than by exiting non-zero for some other
// reason:
//
// - a sources page naming a person the engine actually generates, which is
//   the case the gate exists for: a real officeholder sharing a generated
//   name. The name is read from the engine at proof time, so no name is
//   written here;
// - an officeholder no source cites, on a roster, sharing a name the engine
//   generates: the sources are not the only list, and a gate that read only
//   them would pass a senator's name;
// - a current head of a government whose family name the engine hands out to
//   that government's ministers;
// - a roster the committed hashes do not cover;
// - a blocklist gone stale: the sources cite a page the committed hashes do
//   not cover;
// - a table row that changed without re-vendoring;
// - a table incumbent the generator draws against its own row;
// - a nation drawn from a tradition its people do not carry.
//
// Each plant is a copy of the leader-table folder or a roster file in a
// scratch directory, so a crashed run never leaves a planted row behind in the
// real record.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TABLE = path.join(ROOT, "packages/world/sources/leader-table");
const GATE = path.join(ROOT, "scripts/verify-leader-fidelity.mjs");

const world = await import(path.join(ROOT, "packages/world/dist/index.js"));
const engine = await import(path.join(ROOT, "packages/engine/dist/index.js"));

function firstSeedPool() {
  const streams = engine.createRngStreams(engine.makeCampaignSeed("leader-fidelity-names-0"));
  return engine.generateWorldPool(world.worldDataset.nations, world.personPoolSpecs, streams, world.worldDataset.charters);
}

/** A two-word name the gate's first name seed deals to someone of this nationality (or any foreign one). */
function generatedPerson(nationality) {
  const person = firstSeedPool().find(
    (entry) => (nationality ? entry.nationality === nationality : entry.nationality !== "USA") && /^[A-Za-z]+ [A-Za-z]+$/.test(entry.name),
  );
  if (!person) throw new Error(`proof could not find a two-word generated name to plant for ${nationality ?? "a foreign national"}`);
  return person;
}

/** A name the gate's first name seed deals to a foreign national, as a page title. */
function generatedTitle() {
  return generatedPerson().name.replace(" ", "_");
}

/** A plaintext roster of one planted entry, written to a scratch file. */
function plantRoster(entries) {
  const dir = mkdtempSync(path.join(tmpdir(), "leader-fidelity-roster-"));
  const file = path.join(dir, "roster.json");
  writeFileSync(file, JSON.stringify(entries));
  return { dir, file };
}

function withRoster(entries) {
  const { dir, file } = plantRoster(entries);
  try {
    return gateFindings({ LEADER_FIDELITY_ROSTER: file });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function stage(edit) {
  const dir = mkdtempSync(path.join(tmpdir(), "leader-fidelity-proof-"));
  cpSync(TABLE, dir, { recursive: true });
  edit(dir);
  return dir;
}

/** The gate's findings when run against a staged table, or undefined when it passed. */
function gateFindings(env) {
  try {
    execFileSync(process.execPath, [GATE], { stdio: "pipe", env: { ...process.env, LEADER_FIDELITY_SEEDS: "1", ...env } });
    return undefined;
  } catch (error) {
    return String(error.stderr ?? "");
  }
}

const appendSource = (dir, title) =>
  writeFileSync(path.join(dir, "sources.md"), `${readFileSync(path.join(dir, "sources.md"), "utf8")}\n| PLANT-1 | https://en.wikipedia.org/wiki/${title} | proof | planted |\n`);

const cases = [
  {
    name: "an officeholder no source cites, on the roster, who shares a name the engine generates",
    expect: "real name:",
    detail: "on the roster",
    run: () => withRoster([{ source: "congress", place: "USA", name: generatedPerson().name, record: { first: generatedPerson().name.split(" ")[0], last: generatedPerson().name.split(" ")[1] } }]),
  },
  {
    name: "a roster the committed hashes do not cover",
    expect: "stale roster:",
    run: () => withRoster([{ source: "cia", place: "Nowhere", name: "Qarvel ZINTRUP" }]),
  },
  {
    name: "a sitting head whose rare family name the engine hands his own government's ministers",
    expect: "leader surname:",
    run: () => {
      const person = generatedPerson("POL");
      return withRoster([{ source: "heads", place: "POL", recent: true, name: `Zdzisław ${person.name.split(" ")[1]}` }]);
    },
  },
  {
    name: "a nation drawn from a tradition its people do not carry (Ukraine recorded as Russian)",
    expect: "mixed name:",
    run: () => {
      const dir = stage((d) => {
        const file = path.join(d, "name-traditions.tsv");
        const lines = readFileSync(file, "utf8").split("\n");
        const edited = lines.map((line) => (line.startsWith("UKR\t") ? line.replace("\tukrainian\t", "\trussian\t") : line));
        if (edited.join("\n") === lines.join("\n")) throw new Error("proof could not plant the Ukrainian row");
        writeFileSync(file, edited.join("\n"));
      });
      try {
        return gateFindings({ LEADER_FIDELITY_TABLE: dir });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "a cited officeholder who shares a name the engine generates",
    expect: "real name:",
    run: () => {
      const dir = stage((d) => appendSource(d, generatedTitle()));
      try {
        return gateFindings({ LEADER_FIDELITY_SOURCES: path.join(dir, "sources.md") });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "a source page the committed blocklist does not cover",
    expect: "stale blocklist:",
    run: () => {
      const dir = stage((d) => appendSource(d, "Qarvel_Zintrup_Oskadine"));
      try {
        return gateFindings({ LEADER_FIDELITY_TABLE: dir });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "a table row that changed without re-vendoring (Germany's leader recorded as a woman)",
    expect: "stale table: DEU",
    run: () => {
      const dir = stage((d) => {
        const file = path.join(d, "nation-leaders.tsv");
        const lines = readFileSync(file, "utf8").split("\n");
        const edited = lines.map((line) => (line.startsWith("DEU\t") ? line.replace("\tM\t70-79\t", "\tF\t70-79\t") : line));
        if (edited.join("\n") === lines.join("\n")) throw new Error("proof could not plant the German row");
        writeFileSync(file, edited.join("\n"));
      });
      try {
        return gateFindings({ LEADER_FIDELITY_TABLE: dir });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "a table incumbent the generator draws against its row (Germany's leader recorded as a woman)",
    expect: "sex: leader-fidelity-1 DEU incumbent is M, the table F",
    run: () => {
      const dir = stage((d) => {
        const file = path.join(d, "nation-leaders.tsv");
        const lines = readFileSync(file, "utf8").split("\n");
        const edited = lines.map((line) => (line.startsWith("DEU\t") ? line.replace("\tM\t70-79\t", "\tF\t70-79\t") : line));
        if (edited.join("\n") === lines.join("\n")) throw new Error("proof could not plant the German row");
        writeFileSync(file, edited.join("\n"));
      });
      try {
        return gateFindings({ LEADER_FIDELITY_TABLE: dir });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  },
];

let failures = 0;
for (const testCase of cases) {
  const findings = testCase.run();
  const caught = findings !== undefined && findings.includes(testCase.expect) && (!testCase.detail || findings.includes(testCase.detail));
  console.log(`${caught ? "caught" : "MISSED"}: ${testCase.name}`);
  if (!caught) {
    failures += 1;
    if (findings) console.error(findings.slice(0, 2000));
  }
}
if (failures > 0) {
  console.error(`verify-leader-fidelity-proof: the gate missed ${failures} planted break(s)`);
  process.exit(1);
}
console.log(`verify-leader-fidelity-proof: all ${cases.length} planted breaks caught`);
