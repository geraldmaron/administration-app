#!/usr/bin/env node
// verify-person-consequence-alignment.mjs passing on a clean tree proves only
// that it ran. This runs it against deliberately broken copies of the two files
// and fails unless the gate catches each break — including the case where the
// gate can no longer see one of the two sides, which must fail rather than
// quietly compare nothing.
//
// The fixtures are written to a scratch directory and the gate is pointed at it
// through a copy of the repo layout, so a crashed run can never leave a drifted
// constant behind in the real tree.
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const COPY_REL = "packages/player-core/src/dossier/attribute-consequence.ts";
const CABINET_REL = "packages/engine/src/cabinet.ts";
const PORTFOLIOS_REL = "packages/engine/src/opening-portfolios.ts";
const PERSON_SCHEMA_REL = "packages/world/src/schemas/person.ts";
const FOREIGN_LEADER_REL = "packages/engine/src/foreign-leader.ts";
const GATE_REL = "scripts/verify-person-consequence-alignment.mjs";

/** Lay out the files the gate reads inside a throwaway root. */
function stage() {
  const dir = mkdtempSync(path.join(tmpdir(), "person-consequence-proof-"));
  for (const rel of [COPY_REL, CABINET_REL, PORTFOLIOS_REL, PERSON_SCHEMA_REL, FOREIGN_LEADER_REL, GATE_REL]) {
    mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    copyFileSync(path.join(root, rel), path.join(dir, rel));
  }
  return dir;
}

function edit(dir, rel, from, to) {
  const file = path.join(dir, rel);
  const before = readFileSync(file, "utf8");
  if (!before.includes(from)) {
    throw new Error(`proof fixture could not apply its edit to ${rel}: ${from} not present`);
  }
  writeFileSync(file, before.replace(from, to));
}

/** Run the staged gate. Returns true when it FAILED, which is what a fixture wants. */
function gateRejects(dir) {
  try {
    execFileSync(process.execPath, [path.join(dir, GATE_REL)], { stdio: "pipe" });
    return false;
  } catch {
    return true;
  }
}

const cases = [
  {
    name: "a retuned engine challenge floor the copy still prints as 65%",
    apply: (dir) => edit(dir, CABINET_REL, "const CHALLENGE_AMBITION_FLOOR = 0.65;", "const CHALLENGE_AMBITION_FLOOR = 0.7;"),
  },
  {
    name: "a charismatic discount that moved in the engine only",
    apply: (dir) => edit(dir, CABINET_REL, "const CHARISMATIC_AMBITION_DISCOUNT = 0.1;", "const CHARISMATIC_AMBITION_DISCOUNT = 0.15;"),
  },
  {
    name: "an integrity restraint the dossier overstates",
    apply: (dir) => edit(dir, COPY_REL, "const INTEGRITY_RESTRAINT = 0.6;", "const INTEGRITY_RESTRAINT = 0.9;"),
  },
  {
    name: "a renamed engine constant the gate can no longer see (must fail, not skip)",
    apply: (dir) => edit(dir, CABINET_REL, "const CHALLENGE_AMBITION_FLOOR =", "const CHALLENGE_AMBITION_BAR ="),
  },
  {
    name: "a President's integrity line that says nothing reads it while the oath weighs it",
    apply: (dir) =>
      edit(dir, COPY_REL, "text: `This counts only once, when you take office. It moves your starting stability", "text: `This trait counts for nothing. It moves your starting stability"),
  },
  {
    name: "a leader integrity weight retuned in the engine only",
    apply: (dir) =>
      edit(dir, PORTFOLIOS_REL, 'attribute: "integrity",\n    weight: 0.06,', 'attribute: "integrity",\n    weight: 0.09,'),
  },
  {
    name: "a new reading the engine weighs at the oath that the dossier never restates",
    apply: (dir) =>
      edit(dir, PORTFOLIOS_REL, 'attribute: "charisma",\n    weight: 0.12,', 'attribute: "competence",\n    weight: 0.12,'),
  },
  {
    // The standing-scope bug, replayed: a Hill sentence naming the cabinet sweep it
    // does not run for.
    name: "a Hill sentence naming the cabinet sweep",
    apply: (dir) =>
      edit(
        dir,
        COPY_REL,
        "Together with their ${partner}, this decides how strongly they side with you.",
        "Together with their ${partner}, this decides how strongly they side with you, along with the cabinet sweep.",
      ),
  },
  {
    // A trait the dataset adds with nothing behind it.
    name: "a trait the schema allows with no TRAIT_EFFECT entry",
    apply: (dir) => edit(dir, COPY_REL, "  pragmatic: ", "  xpragmatic: "),
  },
  {
    name: "a trait TRAIT_EFFECT still names that the schema no longer allows (must fail, not skip)",
    apply: (dir) => edit(dir, PERSON_SCHEMA_REL, '  "pragmatic",\n', ""),
  },
  {
    name: "a foreign leader's ambition swing retuned in the engine only",
    apply: (dir) => edit(dir, FOREIGN_LEADER_REL, "export const LEADER_AMBITION_SWING = 0.04;", "export const LEADER_AMBITION_SWING = 0.05;"),
  },
  {
    name: "a foreign leader's offset bound the dossier overstates",
    apply: (dir) => edit(dir, COPY_REL, "const FOREIGN_LEADER_OFFSET_BOUND = 0.1;", "const FOREIGN_LEADER_OFFSET_BOUND = 0.2;"),
  },
  {
    name: "a foreign leader's ambition line that says nothing reads it while the lean does",
    apply: (dir) =>
      edit(
        dir,
        COPY_REL,
        '"foreign-leader": foreignLeaderLean("how much risk their government will take", FOREIGN_LEADER_AMBITION_SWING),',
        '"foreign-leader": FOREIGN_LEADER_TEMPERAMENT,',
      ),
  },
  {
    name: "an engine lean that reads competence where the dossier says integrity",
    apply: (dir) => edit(dir, FOREIGN_LEADER_REL, "centered(input.integrity) * LEADER_INTEGRITY_SWING", "centered(input.competence) * LEADER_INTEGRITY_SWING"),
  },
  {
    name: "a foreign leader's competence line that claims the lean reads it",
    apply: (dir) =>
      edit(dir, COPY_REL, '"foreign-leader": FOREIGN_LEADER_TEMPERAMENT,', '"foreign-leader": foreignLeaderLean("how able their government is", FOREIGN_LEADER_LOYALTY_SWING),'),
  },
  {
    name: "a renamed engine swing the gate can no longer see (must fail, not skip)",
    apply: (dir) => edit(dir, FOREIGN_LEADER_REL, "export const LEADER_LOYALTY_SWING =", "export const LEADER_LOYALTY_PULL ="),
  },
];

const failures = [];

// The clean staging must PASS, or every rejection below proves nothing about
// the fixture and only that the gate fails on everything.
{
  const dir = stage();
  if (gateRejects(dir)) {
    failures.push("the gate rejects an UNMODIFIED tree — it is failing for some reason other than the fixtures");
  }
  rmSync(dir, { recursive: true, force: true });
}

for (const testCase of cases) {
  const dir = stage();
  try {
    testCase.apply(dir);
    if (!gateRejects(dir)) {
      failures.push(`the gate PASSED on a tree it should reject: ${testCase.name}`);
    }
  } catch (error) {
    failures.push(`fixture "${testCase.name}" could not be built: ${error.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failures.length) {
  console.error(`verify-person-consequence-alignment-proof: ${failures.length} failure(s):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nThe alignment gate is not catching drift it is supposed to catch. Fix " +
      "scripts/verify-person-consequence-alignment.mjs — do not weaken this proof.",
  );
  process.exit(1);
}

console.log(
  `verify-person-consequence-alignment-proof: the gate passes a clean tree and rejects all ${cases.length} drift fixtures`,
);
