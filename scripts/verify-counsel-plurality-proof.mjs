#!/usr/bin/env node
// Proves verify-counsel-plurality.mjs actually rejects the cabinets it claims
// to. A gate that has only ever been run against a scoring model that passes it
// is a gate nobody has tested, and this one guards a defect that shipped: a
// cabinet that had never once objected to a firm answer, and thirteen of
// sixteen chairs that could not object to anything.
//
// The gate's input is a census of scored opinions, not a directory, so a fixture
// cannot be a tree the gate is pointed at. It is pointed at a census instead:
// COUNSEL_PLURALITY_FIXTURE_PATH names a JSON file of `{ seats, views }`, and
// the gate runs its rules over that instead of founding campaigns. Each fixture
// below starts from one small census that satisfies every rule and breaks
// exactly one thing, so the verdict is about that break and nothing else. Two
// fixtures must PASS: the untouched baseline, which proves the gate does not
// over-fire, and — no, one must pass and the empty census must be refused by
// the vacuity guard rather than sailing through green.
//
// The temp file is removed in a finally block, and the last thing this script
// does is run the gate on the real founded cabinets and exit with its answer.
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixturePath = path.join(tmpdir(), `counsel-plurality-proof-${process.pid}.json`);

const REGISTERS = ["conciliatory", "evasive", "principled", "firm", "coercive"];

/** Ten seats, the shape of a real cabinet's non-lead chairs. */
const SEATS = [
  "role-foreign-minister",
  "role-treasury-minister",
  "role-defense-minister",
  "role-attorney-general",
  "role-interior-minister",
  "role-homeland-secretary",
  "role-health-secretary",
  "role-labor-secretary",
  "role-energy-secretary",
  "role-agriculture-secretary",
];

const view = (tone, role, stance, stake, reason) => ({ tone, role, stance, stake, reason });

/**
 * A cabinet that argues.
 *
 * Every register draws an objection from somebody, every seat can reach one,
 * all three stakes are carried, and the objections come from the department as
 * well as from the person.
 */
function baseline() {
  const views = [];
  for (const tone of REGISTERS) {
    SEATS.forEach((role, index) => {
      const stake = index === 0 ? "owns" : index < 3 ? "standing" : "outside";
      views.push(view(tone, role, "against", stake, index % 2 === 0 ? "crowded-out" : "instinct-against"));
      views.push(view(tone, role, "for", stake, index % 2 === 0 ? "department-stake" : "instinct-for"));
      views.push(view(tone, role, "wary", stake, "thin-odds"));
    });
  }
  return { seats: SEATS, views, replies: REGISTERS.length * SEATS.length, campaigns: 3 };
}

/** Everything in the census except the opinions matching a predicate. */
function without(predicate) {
  const census = baseline();
  return { ...census, views: census.views.filter((entry) => !predicate(entry)) };
}

/** The same census with every matching opinion rewritten. */
function rewritten(predicate, patch) {
  const census = baseline();
  return { ...census, views: census.views.map((entry) => (predicate(entry) ? { ...entry, ...patch } : entry)) };
}

let failed = false;

function prove(label, census, expectPass, expectPattern) {
  writeFileSync(fixturePath, JSON.stringify(census, null, 2));
  let passed = false;
  let output = "";
  try {
    output = execFileSync("node", ["scripts/verify-counsel-plurality.mjs"], {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, COUNSEL_PLURALITY_FIXTURE_PATH: fixturePath },
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

console.log("Proving the counsel plurality gate rejects what it says it rejects:\n");

try {
  prove("a cabinet that argues on every register", baseline(), true, /every register draws opposition/);

  // The finding this gate exists for: `firm` is the most common register in the
  // corpus and the cabinet had never objected to one.
  prove(
    "a register nobody ever objects to",
    rewritten((entry) => entry.tone === "firm" && entry.stance === "against", { stance: "wary" }),
    false,
    /not one of them is against/,
  );

  prove(
    "a register that was never scored at all",
    without((entry) => entry.tone === "coercive"),
    false,
    /no reply written in the coercive register was scored at all/,
  );

  // Thirteen of sixteen chairs could not oppose anything. Muting seven of ten
  // here leaves three, under the half floor.
  prove(
    "a cabinet where most chairs cannot object to anything",
    rewritten(
      (entry) => entry.stance === "against" && SEATS.indexOf(entry.role) >= 3,
      { stance: "wary" },
    ),
    false,
    /seated chair\(s\) can reach against/,
  );

  // A model that reads only who a person is cannot tell a department that owns
  // the course from one being charged for it.
  prove(
    "an opinion model blind to which department the decision belongs to",
    rewritten(() => true, { stake: "outside" }),
    false,
    /the model is not reading which department the decision belongs to/,
  );

  prove(
    "a cabinet whose every stance comes from temperament or odds",
    rewritten((entry) => entry.reason === "crowded-out" || entry.reason === "department-stake", {
      reason: "instinct-against",
    }),
    false,
    /every stance came from temperament or odds/,
  );

  prove(
    "a run that scored no opinion at all",
    { seats: SEATS, views: [], replies: 0, campaigns: 0 },
    false,
    /no opinion was scored/,
  );

  prove(
    "a run that founded a campaign but found no seated chair",
    { ...baseline(), seats: [] },
    false,
    /no seated chair was found in any cabinet/,
  );
} finally {
  rmSync(fixturePath, { force: true });
}

if (failed) process.exit(1);

console.log("\nProof complete. Running the gate on the real founded cabinets:\n");
let realOutput = "";
let realPassed = false;
try {
  realOutput = execFileSync("node", ["scripts/verify-counsel-plurality.mjs"], { cwd: root, stdio: "pipe" }).toString();
  realPassed = true;
} catch (err) {
  realOutput = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}
process.stdout.write(realOutput);
if (!realPassed) {
  console.error("\nThe gate's mechanism is proven above; this last failure is the scoring model, not the gate.");
}
process.exit(realPassed ? 0 : 1);
