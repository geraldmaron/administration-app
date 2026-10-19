import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const GENERATOR = fileURLToPath(new URL("../../../scripts/make-fixture-saves.mjs", import.meta.url));

/**
 * Builds every fixture save from the dist this run is testing, before any spec
 * imports one. It runs in a child process because the generator installs a
 * module resolver that has no business inside the test runner.
 *
 * E2E_FIXTURES (comma-separated names) builds a subset, for a workstream whose
 * spec needs only its own fixture and would rather not wait for the rest.
 */
export default function globalSetup(): void {
  const only = process.env.E2E_FIXTURES?.trim();
  execFileSync(process.execPath, [GENERATOR, ...(only ? ["--only", only] : [])], { stdio: "inherit" });
}
