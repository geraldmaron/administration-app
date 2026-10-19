#!/usr/bin/env node
// Proves verify-biography-immutability.mjs actually rejects the files it claims
// to. A gate that has only ever been run against a composer that passes it is a
// gate nobody has tested, and this one guards a defect that shipped: two
// overrulings rewrote the sentence a Secretary's file opened on, and a season
// of them replaced an event in his past.
//
// The gate's input is a sweep of composed files, not a directory, so a fixture
// cannot be a tree the gate is pointed at. It is pointed at a sweep instead:
// BIOGRAPHY_IMMUTABILITY_FIXTURE_PATH names a JSON file of `{ observations }`,
// and the gate runs its rules over that instead of founding a cast. Each
// fixture below starts from one small sweep that satisfies every rule and
// breaks exactly one thing, so the verdict is about that break and nothing
// else. One fixture must PASS — the untouched baseline, which proves the gate
// does not over-fire — and the empty sweep must be refused by the vacuity guard
// rather than sailing through green.
//
// The temp file is removed in a finally block, and the last thing this script
// does is run the gate on the real founded cast and exit with its answer.
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixturePath = path.join(tmpdir(), `biography-immutability-proof-${process.pid}.json`);

const LOYALTIES = [0, 0.25, 0.5, 0.75, 1];

/** The four quadrants the standing line actually moves through, in present tense. */
const STANDING_BY_LOYALTY = {
  0: "Serves without enthusiasm and without any particular plan, which makes them steady and makes them slow.",
  0.25: "Serves without enthusiasm and without any particular plan, which makes them steady and makes them slow.",
  0.5: "Is the safest pair of hands in the building and has no interest whatsoever in being anything else.",
  0.75: "Is the safest pair of hands in the building and has no interest whatsoever in being anything else.",
  1: "Is the safest pair of hands in the building and has no interest whatsoever in being anything else.",
};

function file(person, loyalty, overrides = {}) {
  return {
    person,
    loyalty,
    sections: {
      Origins: "Grew up in a district that the last three governments each promised to reindustrialize, and did not.",
      "The road here": "Came up through the department they now run, one grade at a time.",
      "On the record":
        "Refused to sign off a contract that a previous government very much wanted signed, and spent two years in a lesser post for it.",
      Temperament: "Cautious by instinct, and slower to commit than the room usually wants.",
      "Where they stand": STANDING_BY_LOYALTY[loyalty],
      ...overrides,
    },
  };
}

/** Three people, each swept across the loyalty a campaign can reach. */
function baseline() {
  const observations = [];
  for (const person of ["PER-treasury", "PER-defense", "PER-labor"]) {
    for (const loyalty of LOYALTIES) observations.push(file(person, loyalty));
  }
  return { observations };
}

function broken(mutate) {
  const sweep = baseline();
  return { observations: sweep.observations.map(mutate) };
}

let failed = false;

function prove(label, sweep, expectPass, expectPattern) {
  writeFileSync(fixturePath, JSON.stringify(sweep, null, 2));
  let passed = false;
  let output = "";
  try {
    output = execFileSync("node", ["scripts/verify-biography-immutability.mjs"], {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, BIOGRAPHY_IMMUTABILITY_FIXTURE_PATH: fixturePath },
    }).toString();
    passed = true;
  } catch (err) {
    output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  if (passed !== expectPass) {
    console.error(`FAIL: ${label} — expected the gate to ${expectPass ? "pass" : "fail"}, it did not.\n${output}`);
    failed = true;
    return;
  }
  if (!expectPattern.test(output)) {
    console.error(`FAIL: ${label} — the gate's verdict did not mention what it should.\n${output}`);
    failed = true;
    return;
  }
  console.log(`  ok: ${label}`);
}

console.log("Proving the biography immutability gate rejects what it says it rejects:\n");

try {
  prove("a file whose past holds and whose standing moves", baseline(), true, /every past-tense section identical/);

  // The measured defect: twenty-six points of loyalty replaced the event a
  // Secretary was remembered for, dated to before the administration existed.
  prove(
    "a defining episode the present re-picks",
    broken((entry) =>
      entry.loyalty <= 0.25
        ? {
            ...entry,
            sections: {
              ...entry.sections,
              "On the record":
                "Briefed against a principal to three separate journalists in the same week, using three separate framings, none of them false.",
            },
          }
        : entry,
    ),
    false,
    /On the record is rewritten by loyalty alone/,
  );

  prove(
    "origins that change with a loyalty number",
    broken((entry) =>
      entry.loyalty >= 0.75
        ? { ...entry, sections: { ...entry.sections, Origins: "Comes from a merchant family three generations in the same trade." } }
        : entry,
    ),
    false,
    /Origins is rewritten by loyalty alone/,
  );

  prove(
    "a temperament that drifts",
    broken((entry) =>
      entry.loyalty === 1
        ? { ...entry, sections: { ...entry.sections, Temperament: "Restless, and impatient with a room that will not decide." } }
        : entry,
    ),
    false,
    /Temperament is rewritten by loyalty alone/,
  );

  // The over-correction: freezing the whole file would delete the only place a
  // player can watch an appointment sour.
  prove(
    "a file frozen so hard the standing line cannot move either",
    broken((entry) => ({ ...entry, sections: { ...entry.sections, "Where they stand": STANDING_BY_LOYALTY[1] } })),
    false,
    /the section loyalty exists to move has been frozen/,
  );

  // The lede is taken from the standing section, so a career claim there is the
  // same defect wearing a present-tense heading.
  prove(
    "a standing line that claims a career",
    broken((entry) =>
      entry.loyalty <= 0.25
        ? {
            ...entry,
            sections: {
              ...entry.sections,
              "Where they stand":
                "Neither backs the leader's big plays nor undercuts them, and has made a long, uneventful career out of that exact silence.",
            },
          }
        : entry,
    ),
    false,
    /claims a career/,
  );

  prove("a sweep with nothing in it", { observations: [] }, false, /no person was composed/);

  prove(
    "a run that composed one reading and called it a sweep",
    { observations: [file("PER-treasury", 0.5)] },
    false,
    /nothing was swept/,
  );
} finally {
  rmSync(fixturePath, { force: true });
}

if (failed) process.exit(1);

console.log("\nProof complete. Running the gate on the real founded cast:\n");
let realOutput = "";
let realPassed = false;
try {
  realOutput = execFileSync("node", ["scripts/verify-biography-immutability.mjs"], { cwd: root, stdio: "pipe" }).toString();
  realPassed = true;
} catch (err) {
  realOutput = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}
process.stdout.write(realOutput);
if (!realPassed) {
  console.error("\nThe gate's mechanism is proven above; this last failure is the composer, not the gate.");
}
process.exit(realPassed ? 0 : 1);
