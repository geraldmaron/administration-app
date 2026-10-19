#!/usr/bin/env node
// Proves verify-scenario-dc-fallback.mjs counts a home scenario placed by a
// fallback, keeps a genuine Washington site out of the count, forgives only
// what its baseline names, and refuses a run that read nothing.
//
// Every fixture is a one-scenario corpus written inside the checkout and
// removed in a finally block; the scenario is a shipped pack scenario with its
// locus swapped, so it clears the same schema the real corpus does.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.scenario-dc-fallback-proof-${process.pid}`);
const content = await import(path.join(root, "packages/content/dist/index.js"));
const template = content.CORE_SCENARIOS?.[0];
if (!template) {
  console.error("verify-scenario-dc-fallback-proof: FAIL — the built content package has no pack scenario to stage fixtures from.");
  process.exit(1);
}

function run(target, locus) {
  const argv = ["scripts/verify-scenario-dc-fallback.mjs", ...(target ? [target] : []), ...(locus ? [`--locus=${locus}`] : [])];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe" }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const scenario = (id, locus) =>
  JSON.stringify({ ...template, id, locus: { ground: "home", descriptor: "the loading dock behind the county depot at shift change", ...locus } });

const problems = [];
function expect(label, { lines, baseline = {}, locus }, wantPass, pattern) {
  rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(path.join(fixtureDir, "scenarios.jsonl"), `${lines.join("\n")}\n`);
  writeFileSync(path.join(fixtureDir, "baseline.json"), JSON.stringify({ entries: baseline }));
  const locusFile = locus ? path.join(fixtureDir, "locus.mjs") : undefined;
  if (locusFile) writeFileSync(locusFile, locus);
  const { passed, output } = run(fixtureDir, locusFile);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("a capital site is Washington by declaration", { lines: [scenario("at-the-seat", { site: "capital" })] }, true, /1 genuinely in Washington; 0 in DC by fallback/);
  expect(
    "an authored state the dataset has no city in stands at its capitol",
    { lines: [scenario("in-montana", { site: "interior", state: "MT" })] },
    true,
    /0 in DC by fallback, 0 in a seeded state/,
  );
  // The real resolver no longer drops Montana at the capital, so a stand-in
  // that does shows the gate still catches the regression.
  expect(
    "a resolver that drops a city-less state back around the capital",
    {
      lines: [scenario("in-montana", { site: "interior", state: "MT" })],
      locus: [
        `import * as real from ${JSON.stringify(pathToFileURL(path.join(root, "packages/content/dist/index.js")).href)};`,
        "export const resolveLocus = (campaign, def, abroad) => {",
        "  const placed = real.resolveLocus(campaign, def, abroad);",
        "  const capital = campaign.nations[campaign.founding.nation].base.geo;",
        "  return { ...placed, lat: capital.lat + 0.4, lon: capital.lon - 0.6 };",
        "};",
      ].join("\n"),
    },
    false,
    /NEW {2}dc-by-fallback:in-montana/,
  );
  expect("a home site that names no state is seeded", { lines: [scenario("somewhere", { site: "city" })] }, false, /NEW {2}seeded-state:somewhere/);
  expect(
    "a seeded site the baseline forgives",
    { lines: [scenario("somewhere", { site: "city" })], baseline: { "seeded-state:somewhere": 1 } },
    true,
    /0 in DC by fallback, 1 in a seeded state/,
  );
  expect(
    "a baseline still forgiving a scenario that now authors its state",
    { lines: [scenario("somewhere", { site: "city", state: "OH" })], baseline: { "seeded-state:somewhere": 1 } },
    false,
    /STALE {2}seeded-state:somewhere/,
  );
  expect("a corpus with nothing in it", { lines: [] }, false, /read no scenarios/);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-scenario-dc-fallback-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
