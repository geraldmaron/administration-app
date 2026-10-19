#!/usr/bin/env node
// Proves verify-flag-markers.mjs fails the ways it is supposed to, rather than
// passing because today's tree happens to be clean.
//
//   1. a new durable flag set with no marker
//   2. a flag the check cannot name at all — a bare local, unrecorded
//   2b. the same site, stamped honestly, which must pass
//   3. a MARKER_DEBT entry whose site no longer needs forgiving
//   4. a MARKER_DEBT entry naming a file that does not exist
//   5. a run whose scan found no flag-setting site at all
//
// (2) and (5) are the two ways this class of gate goes quiet: a check that
// forgives what it cannot read, and a check that reports a clean tree because
// it stopped finding anything.
//
// Every case runs against a fixture directory with the debt list neutralized,
// so the proof answers for the gate and not for whatever the working tree owes
// today. A proof that went red because a sibling file had a real violation
// would be reporting the tree's state as the gate's.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-flag-markers.mjs");
const fixtureDir = path.join(root, "packages/engine/src/__flag_marker_fixture_tmp__");
const scanRoot = path.relative(root, fixtureDir);

const original = readFileSync(gate, "utf8");
const debtless = original.replace(/const MARKER_DEBT = \{[\s\S]*?\n\};/, "const MARKER_DEBT = {};");
if (debtless === original) {
  console.error("FAIL: the proof could not find MARKER_DEBT to neutralize — the gate's shape changed.");
  process.exit(1);
}

function rejects(target = scanRoot) {
  try {
    execFileSync("node", ["scripts/verify-flag-markers.mjs", target], { cwd: root, stdio: "pipe" });
    return false;
  } catch (err) {
    if (err.status && err.status !== 0) return true;
    throw err;
  }
}

const failures = [];

function withFixture(body, run) {
  mkdirSync(fixtureDir, { recursive: true });
  try {
    writeFileSync(path.join(fixtureDir, "fixture.ts"), body);
    run();
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

writeFileSync(gate, debtless);
try {
  // 1. A durable flag, freshly written, with no marker beside it.
  withFixture(
    `export function treatySignedFlag(id: string): string { return \`treaty-signed:\${id}\`; }
export function signed(id: string) {
  return [{ kind: "flag", set: [treatySignedFlag(id)] }];
}
`,
    () => {
      if (!rejects()) failures.push("did not reject a new durable flag set without a turn marker");
    },
  );

  // 2. The same site with the flag built into a local the check cannot name. A
  // gate that only read builders would pass this and forgive the whole class.
  withFixture(
    `export function opaque(id: string) {
  const built = [\`something-happened:\${id}\`];
  return [{ kind: "flag", set: built }];
}
`,
    () => {
      if (!rejects()) failures.push("did not reject a flag whose name it could not read");
    },
  );

  // 2b. The honest version of the same site passes, so (2) is failing for the
  // missing marker and not for using a local at all.
  withFixture(
    `import { markedFlags } from "../marked-flags.js";
export function honest(id: string, turn: number) {
  const built = [\`something-happened:\${id}\`];
  return [{ kind: "flag", set: markedFlags(built, turn) }];
}
`,
    () => {
      if (rejects()) failures.push("rejected a local-built flag that does go through markedFlags");
    },
  );
} finally {
  writeFileSync(gate, original);
}

// 3. A debt entry for a site that is already correct. Debt that cannot be paid
// off is a permanent exemption wearing a deadline's clothes.
try {
  writeFileSync(
    gate,
    debtless.replace(
      "const MARKER_DEBT = {};",
      'const MARKER_DEBT = { "packages/engine/src/orders.ts": { deedFlag: "already stamped through markedFlags" } };',
    ),
  );
  withFixture(
    `import { markedFlags } from "../marked-flags.js";
export function honest(id: string, turn: number) {
  return [{ kind: "flag", set: markedFlags([\`something-happened:\${id}\`], turn) }];
}
`,
    () => {
      if (!rejects()) failures.push("did not reject a MARKER_DEBT entry whose site no longer sets an unmarked flag");
    },
  );
} finally {
  writeFileSync(gate, original);
}

// 4. A debt entry naming a file that is not there.
try {
  writeFileSync(
    gate,
    debtless.replace(
      "const MARKER_DEBT = {};",
      'const MARKER_DEBT = { "packages/engine/src/__never_existed_tmp__.ts": { someFlag: "gone" } };',
    ),
  );
  withFixture(
    `import { markedFlags } from "../marked-flags.js";
export function honest(id: string, turn: number) {
  return [{ kind: "flag", set: markedFlags([\`something-happened:\${id}\`], turn) }];
}
`,
    () => {
      if (!rejects()) failures.push("did not reject a MARKER_DEBT entry naming a file that does not exist");
    },
  );
} finally {
  writeFileSync(gate, original);
}

// 5. A corpus with nothing in it. A check that measured nothing must fail
// rather than report the tree clean.
const emptyDir = path.join(root, "scripts/__flag_marker_empty_tmp__");
writeFileSync(gate, debtless);
try {
  mkdirSync(emptyDir, { recursive: true });
  if (!rejects(path.relative(root, emptyDir))) {
    failures.push("did not refuse a scan that found no flag-setting site at all");
  }
} finally {
  writeFileSync(gate, original);
  if (existsSync(emptyDir)) rmSync(emptyDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`FAIL: verify-flag-markers.mjs missed ${failures.length} deliberate fixture(s):`);
  for (const f of failures) console.error(`  - it ${f}.`);
  process.exitCode = 1;
} else {
  console.log("OK: verify-flag-markers.mjs rejected the unmarked flag, the unreadable flag, both stale debt entries, and the empty corpus.");
}
