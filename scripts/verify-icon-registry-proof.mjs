#!/usr/bin/env node
// Proves verify-icon-registry.mjs rejects a glyph nobody binds and a binding to
// a glyph the set does not draw, accepts every binder shape the app actually
// uses, and refuses a set it could not read.
//
// Every fixture is a miniature icon set and app written inside the checkout
// and removed in a finally block; the real tree is judged last.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.icon-registry-proof-${process.pid}`);

function run(target) {
  const argv = ["scripts/verify-icon-registry.mjs", ...(target ? [target] : [])];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe" }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

const iconSet = (...names) => `export const ICONS = {\n${names.map((n) => `  ${n}: { paths: [] },`).join("\n")}\n} as const satisfies Record<string, unknown>;\n`;
// One binder of each shape the app uses: a literal prop, a ternary, an object
// field, a chooser's return, and a map row in a file that deals in icons.
const BINDERS = {
  "web/routes/page.tsx": 'export function Page({ open }) {\n  return <><Icon name="desk" /><Icon name={open ? "open" : "locked"} /></>;\n}\n',
  "web/record/glyph.ts": 'export function glyphFor(entry) {\n  if (entry.signed) return "sign";\n  return "archive";\n}\n',
  "web/shell/Sidebar.tsx": 'const ITEM_GLYPHS = {\n  desk: "desk",\n  world: "world",\n};\nexport const icon = ITEM_GLYPHS;\n',
  "player-core/desk/attention.ts": 'export const row = { icon: "press", title: "The papers" };\n',
};
const SET = iconSet("desk", "open", "locked", "sign", "archive", "world", "press");
const CLEAN = { "ui-web/assets/icons/icon-data.ts": SET, ...BINDERS, "baseline.json": JSON.stringify({ entries: {} }) };

const problems = [];
function expect(label, files, wantPass, pattern) {
  writeTree(fixtureDir, { ...CLEAN, ...files });
  const { passed, output } = run(fixtureDir);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("every glyph bound, through every binder shape", {}, true, /7 glyph\(s\) in the set, 7 bound/);
  expect("a glyph added to the set and bound nowhere", { "ui-web/assets/icons/icon-data.ts": iconSet("desk", "open", "locked", "sign", "archive", "world", "press", "veto") }, false, /NEW {2}veto/);
  expect(
    "a glyph bound only on a development-only route",
    {
      "ui-web/assets/icons/icon-data.ts": iconSet("desk", "open", "locked", "sign", "archive", "world", "press", "veto"),
      "web/routes/showcase.tsx": 'export const Route = createFileRoute("/showcase")({\n  component: import.meta.env.DEV ? Page : NotFoundPage,\n});\nfunction Page() {\n  return <Icon name="veto" />;\n}\n',
    },
    false,
    /NEW {2}veto/,
  );
  expect(
    "a binding to a glyph the set does not draw",
    { "player-core/shell/rooms.ts": 'export const room = { icon: "treasury", title: "Budget" };\n' },
    false,
    /NEW {2}unknown:player-core\/shell\/rooms\.ts {2}:1 "treasury"/,
  );
  expect(
    "an unbound glyph and an unknown binding, both forgiven",
    {
      "ui-web/assets/icons/icon-data.ts": iconSet("desk", "open", "locked", "sign", "archive", "world", "press", "veto"),
      "player-core/shell/rooms.ts": 'export const room = { icon: "treasury" };\n',
      "baseline.json": JSON.stringify({ entries: { veto: 1, "unknown:player-core/shell/rooms.ts": 1 } }),
    },
    true,
    /1 unbound glyph\(s\) and 1 file\(s\) binding unknown/,
  );
  expect("a baseline forgiving a glyph that is now bound", { "baseline.json": JSON.stringify({ entries: { desk: 1 } }) }, false, /STALE {2}desk/);
  expect("an icon set the gate cannot read", { "ui-web/assets/icons/icon-data.ts": "export const NOTHING = {};\n" }, false, /read no glyph names/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-icon-registry-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
