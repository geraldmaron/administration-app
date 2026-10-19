// The harness the player-source ratchet proofs share: write a fixture tree
// inside the checkout, run the gate on it, and hold the verdict to what the
// case expects; then run the gate on the real tree.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export function proveGate({ root, gate, cases }) {
  const dir = path.join(root, `.${path.basename(gate, ".mjs")}-proof-${process.pid}`);
  const run = (target) => {
    try {
      return { passed: true, output: execFileSync("node", [gate, ...(target ? [target] : [])], { cwd: root, stdio: "pipe" }).toString() };
    } catch (err) {
      return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
    }
  };
  const problems = [];
  try {
    for (const { label, files, pass, says } of cases) {
      rmSync(dir, { recursive: true, force: true });
      for (const [name, body] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
        writeFileSync(path.join(dir, name), body);
      }
      const { passed, output } = run(dir);
      if (passed !== pass) problems.push(`${label}: expected the gate to ${pass ? "pass" : "fail"}.\n${output}`);
      else if (!says.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
      else console.log(`OK: ${label}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (problems.length > 0) {
    console.error(`\n${path.basename(gate)} proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
    for (const problem of problems) console.error(`  - ${problem}\n`);
    process.exit(1);
  }
  console.log("\nProof complete. Running the gate on the real tree:\n");
  const real = run(undefined);
  process.stdout.write(real.output);
  process.exit(real.passed ? 0 : 1);
}
