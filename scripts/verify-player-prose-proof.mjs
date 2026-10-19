#!/usr/bin/env node
// Proves verify-player-prose.mjs refuses the marks it names, reads only player
// text (never a comment, an import, a class name or a thrown error), honors its
// baseline, and refuses to report green on a run that read nothing.
//
// Every fixture is a miniature source tree written inside the checkout and
// removed in a finally block, so a crash cannot leave a planted line in a file
// another session is editing.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.player-prose-proof-${process.pid}`);

function run(target) {
  try {
    return { passed: true, output: execFileSync("node", ["scripts/verify-player-prose.mjs", target], { cwd: root, stdio: "pipe" }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(files) {
  rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(path.join(fixtureDir, "src"), { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(fixtureDir, name), body);
}

const CLEAN = 'export const caption = "Colored by how each government sees the United States.";\n';
const EMPTY_BASELINE = JSON.stringify({ entries: {} });

const problems = [];
function expect(label, files, wantPass, pattern) {
  writeTree({ "baseline.json": EMPTY_BASELINE, ...files });
  const { passed, output } = run(fixtureDir);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("clean copy passes", { "src/a.ts": CLEAN }, true, /1 player string\(s\) read; 0 finding/);
  expect("insider shorthand", { "src/a.ts": 'export const s = "The room will ask about the budget first.";\n' }, false, /NEW {2}src\/a\.ts :: refused-word/);
  expect("an em dash in a sentence", { "src/a.ts": 'export const s = "Fill the seat — two people are available";\n' }, false, /em-dash/);
  expect("a lone em dash as the empty-value mark", { "src/a.ts": 'export const s = { label: "No value", value: "—" };\n' }, true, /0 finding/);
  expect("a colon joining two clauses", { "src/a.tsx": "export const P = () => <p>Each answer is final: a story can be answered only once.</p>;\n" }, false, /colon-joins-clauses/);
  expect("a colon introducing a list", { "src/a.ts": 'export const s = "Three things move your approval: prices, jobs and safety.";\n' }, true, /0 finding/);
  expect("an ordinary verb that shares letters with a refused word", { "src/a.ts": 'export const s = "The Constitution lets the President nominate judges.";\n' }, true, /0 finding/);
  expect("a staged contrast", { "src/a.ts": 'export const s = "It is not a grade, it is a warning about pressure.";\n' }, false, /staged-contrast/);
  expect(
    "machinery is not text",
    {
      "src/a.tsx":
        '// The room delves into a crucial tapestry — quietly!\nimport x from "the room";\nexport const P = () => <div className="the room seamless">{x}</div>;\nexport function f(k: string) { if (k === "simply the room") throw new Error("the room is crucial — truly"); }\n' + CLEAN,
    },
    true,
    /1 player string\(s\) read; 0 finding/,
  );
  expect(
    "a forgiven finding passes",
    { "src/a.ts": 'export const s = "Backlog is owning the room";\n', "baseline.json": JSON.stringify({ entries: { "src/a.ts :: refused-word": 1 } }) },
    true,
    /1 finding/,
  );
  expect(
    "a fixed finding leaves the baseline stale",
    { "src/a.ts": 'export const s = "Backlog is high";\n', "baseline.json": JSON.stringify({ entries: { "src/a.ts :: refused-word": 1 } }) },
    false,
    /STALE/,
  );
  expect("a tree with no player text", { "src/a.ts": "export const n = 4;\n" }, false, /read no player text/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`verify-player-prose-proof: ${problems.length} problem(s):\n\n${problems.join("\n\n")}`);
  process.exit(1);
}
console.log("verify-player-prose-proof: the gate refuses each mark, reads only player text, and holds its baseline.");
