#!/usr/bin/env node
// Proves verify-unused-primitives.mjs rejects a part nobody draws, refuses to
// count the development-only showcase as a place a player can stand, and
// refuses to report green on a run that swept nothing.
//
// The phone-era proof deleted a render site from a real source file and put it
// back afterwards, which a crash between the two would have left deleted in a
// tree other sessions share. Every fixture here is a miniature design system
// and app written inside the checkout and removed in a finally block.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.unused-primitives-proof-${process.pid}`);

function run(target) {
  const argv = ["scripts/verify-unused-primitives.mjs", ...(target ? [target] : [])];
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

const SYSTEM = {
  "ui-web/index.ts": 'export { Button } from "./Button.js";\nexport { Seam, FADE_STOPS } from "./Seam.js";\nexport * from "./Card";\n',
  "ui-web/Button.tsx": "export function Button(props) {\n  return <button {...props} />;\n}\n",
  "ui-web/Seam.tsx": "export const FADE_STOPS = [0, 1];\nexport function Seam() {\n  return <div />;\n}\n",
  "ui-web/Card.tsx": "export function Card({ children }) {\n  return <section><Seam />{children}</section>;\n}\n",
  "baseline.json": JSON.stringify({ entries: {} }),
};
const PAGE_DRAWS_ALL = "export function Page() {\n  return <Card><Button onClick={go} /></Card>;\n}\n";

const problems = [];
function expect(label, files, wantPass, pattern) {
  writeTree(fixtureDir, { ...SYSTEM, ...files });
  const { passed, output } = run(fixtureDir);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("every part drawn, one of them only inside another drawn part", { "web/routes/page.tsx": PAGE_DRAWS_ALL }, true, /3 exported part\(s\); 3 drawn/);
  expect(
    "a part nobody draws",
    { "web/routes/page.tsx": "export function Page() {\n  return <Button onClick={go} />;\n}\n" },
    false,
    /NEW {2}Card \(ui-web\/Card\.tsx\)/,
  );
  expect(
    "a part drawn only on a development-only route",
    {
      "web/routes/page.tsx": "export function Page() {\n  return <Card />;\n}\n",
      "web/routes/showcase.tsx":
        'export const Route = createFileRoute("/showcase")({\n  component: import.meta.env.DEV ? Showcase : NotFoundPage,\n});\nfunction Showcase() {\n  return <Button />;\n}\n',
    },
    false,
    /NEW {2}Button/,
  );
  expect(
    "a part drawn only inside a part nobody draws",
    { "web/routes/page.tsx": "export function Page() {\n  return <Button />;\n}\n" },
    false,
    /NEW {2}Seam/,
  );
  expect(
    "an undrawn part the baseline forgives",
    { "web/routes/page.tsx": "export function Page() {\n  return <Button />;\n}\n", "baseline.json": JSON.stringify({ entries: { Card: 1, Seam: 1 } }) },
    true,
    /2 forgiven and shrinking \(Card, Seam\)/,
  );
  expect(
    "a baseline still forgiving a part that is now drawn",
    { "web/routes/page.tsx": PAGE_DRAWS_ALL, "baseline.json": JSON.stringify({ entries: { Card: 1 } }) },
    false,
    /STALE {2}Card/,
  );
  expect("a barrel with no components in it", { "ui-web/index.ts": 'export { FADE_STOPS } from "./Seam.js";\n' }, false, /exports no components/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-unused-primitives-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
