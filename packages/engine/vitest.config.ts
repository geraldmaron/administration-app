import { configDefaults, defineConfig } from "vitest/config";

// The three `*balance*.test.ts` files are not unit tests, they are a Monte Carlo
// harness: each memoizes one `runBalanceHarness()` over 4-12 seeds and every
// assertion in the file reads that cached report. Together they were 22 of the
// 46 minutes CI spent on `pnpm run test` — more than the other eight workspace
// packages combined — because a full campaign is simulated per seed.
//
// They stay a gate, and the assertions in them are unchanged. They are split out
// so the per-push path does not pay for a simulation on a branch that never
// touched the simulation. `pnpm run test:balance` runs them; CI runs that on
// main and staging, which is where a branch lands before it can reach a release.
//
// Note these files are also immune to `testTimeout`: `runBalanceHarness` is
// synchronous, and vitest cannot interrupt a synchronous test. A hung harness
// is caught by the job's own `timeout-minutes`, not by vitest.
// `scripts/measure-performance.test.ts` lives outside every workspace package,
// so `pnpm -r run test` never reached it: a planted failure there passed CI
// silently. It has no simulation cost (it tests a pure string formatter), so
// it rides along here rather than gaining its own package and test script.
// `scripts/report-metric-registry.test.ts` rides along for the same reason: it
// reads the built world and engine registries, which this package depends on.
export default defineConfig({
  test: {
    include: [...configDefaults.include, "../../scripts/measure-performance.test.ts", "../../scripts/report-metric-registry.test.ts"],
    exclude: [...configDefaults.exclude, "**/*balance*.test.ts"],
  },
});
