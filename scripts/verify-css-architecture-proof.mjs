#!/usr/bin/env node
// Proves verify-css-architecture.mjs rejects each thing it exists to refuse
// (weight, a misplaced !important, an unlayered rule, an undeclared layer, a
// literal color outside the tokens, a room restyling a shared part's surface),
// accepts what the architecture allows, forgives only what its baseline
// names, and refuses a tree it cannot read.
//
// Every fixture is a miniature set of sheets written inside the checkout and
// removed in a finally block; the real tree is judged last.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.css-architecture-proof-${process.pid}`);

function run(target) {
  const argv = ["scripts/verify-css-architecture.mjs", ...(target ? [target] : [])];
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
    if (body === undefined) continue;
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

const CLEAN = {
  "layers.css": "@layer reset, tokens, components, rooms, states;\n",
  "sheets/tokens.css": "@layer tokens {\n:root { --ink: #102040; --glass: rgba(10, 20, 40, 0.6); }\n}\n",
  "sheets/panel.css":
    "/* The panel. */\n@layer components {\n.ui-panel { background: var(--glass); border-radius: 12px; color: var(--ink); }\n}\n" +
    "@layer states {\n@media (forced-colors: active) { .ui-panel { background: Canvas !important; } }\n}\n",
  "sheets/desk.css":
    "@layer rooms {\n.desk { display: grid; gap: 1rem; }\n.desk .ui-panel { grid-column: span 2; }\n" +
    ".desk__note { color: color-mix(in srgb, var(--ink) 60%, transparent); border: 1px solid currentColor; }\n}\n",
  "baseline.json": JSON.stringify({ entries: {} }),
};

const problems = [];
function expect(label, files, wantPass, pattern) {
  writeTree(fixtureDir, { ...CLEAN, ...files });
  const { passed, output } = run(fixtureDir);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

const room = (body) => ({ "sheets/desk.css": `@layer rooms {\n${body}\n}\n` });

try {
  expect("a tree that keeps the architecture", {}, true, /3 sheet\(s\), \d+ rule\(s\) in the order reset, tokens, components, rooms, states; 0 finding/);
  expect("a selector that buys weight with :root:root", room(":root:root body .desk { gap: 1rem; }"), false, /NEW {2}sheets\/desk\.css::weight/);
  expect("!important outside the states layer", room(".desk { gap: 1rem !important; }"), false, /NEW {2}sheets\/desk\.css::important/);
  expect("a rule in no layer", { "sheets/desk.css": ".desk { gap: 1rem; }\n" }, false, /NEW {2}sheets\/desk\.css::unlayered/);
  expect("a layer the order does not declare", { "sheets/desk.css": "@layer overrides {\n.desk { gap: 1rem; }\n}\n" }, false, /NEW {2}sheets\/desk\.css::layer/);
  expect("a rule left in rooms.legacy", { "sheets/desk.css": "@layer rooms {\n@layer legacy {\n.desk { gap: 1rem; }\n}\n}\n" }, false, /NEW {2}sheets\/desk\.css::legacy/);
  expect("a sublayer other than rooms.legacy", { "sheets/desk.css": "@layer rooms {\n@layer extra {\n.desk { gap: 1rem; }\n}\n}\n" }, false, /NEW {2}sheets\/desk\.css::layer/);
  expect("an entry that imports a component before the layer order", { "main.tsx": 'import { routeTree } from "./routeTree.gen";\nimport "@admin/design/layers.css";\n' }, false, /must import "@admin\/design\/layers\.css" first/);
  expect("an entry that imports the layer order first", { "main.tsx": '// why\nimport "@admin/design/layers.css";\nimport { routeTree } from "./routeTree.gen";\n' }, true, /0 finding/);
  expect("a hex color in a room", room(".desk { color: #ffcc00; }"), false, /NEW {2}sheets\/desk\.css::color/);
  expect("an rgba() color in a shared part", { "sheets/panel.css": "@layer components {\n.ui-panel { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); }\n}\n" }, false, /NEW {2}sheets\/panel\.css::color/);
  expect("a named color inside a mix", room(".desk { color: color-mix(in srgb, var(--ink) 70%, black); }"), false, /NEW {2}sheets\/desk\.css::color/);
  expect("a room restyling a shared part's surface", room(".desk .ui-panel { background: var(--ink); }"), false, /NEW {2}sheets\/desk\.css::surface/);
  expect("a room placing a shared part (layout only)", room(".desk .ui-panel { grid-column: 1 / -1; margin: 0; }"), true, /0 finding/);
  expect("a room styling its own child of a part", room(".desk .ui-panel .desk__note { background: var(--ink); }"), true, /0 finding/);
  expect(
    "findings the baseline forgives",
    { ...room(":root:root body .desk { color: #fff !important; }"), "baseline.json": JSON.stringify({ entries: { "sheets/desk.css::weight": 1, "sheets/desk.css::important": 1, "sheets/desk.css::color": 1 } }) },
    true,
    /3 finding\(s\) forgiven/,
  );
  expect(
    "a forgiven finding that was fixed (stale headroom)",
    { "baseline.json": JSON.stringify({ entries: { "sheets/desk.css::weight": 2 } }) },
    false,
    /STALE {2}sheets\/desk\.css::weight/,
  );
  expect("no layer order to hold", { "layers.css": "/* nothing declared */\n" }, false, /read no layer order/);
  expect("a sheet that does not parse", room(".desk { gap: 1rem; }\n}"), false, /does not parse/);

  const real = run();
  if (!real.passed) problems.push(`the real tree: the gate failed.\n${real.output}`);
  else console.log(`OK: the real tree — ${real.output.trim()}`);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-css-architecture-proof: FAIL\n\n${problems.join("\n\n")}`);
  process.exit(1);
}
console.log("verify-css-architecture-proof: OK — the gate refuses every break in the architecture and forgives only its baseline.");
