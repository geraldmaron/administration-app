import { configDefaults, defineConfig } from "vitest/config";

// The store and save suites found real campaigns and run whole weeks of the
// engine per test. Alone they take one to two seconds; under the workspace's
// parallel run they share the machine with every other package and cross the
// default 5s limit without anything being wrong. The limit is a time budget
// for that load, not an assertion.
//
// `src/__probes__` holds realism probes whose assertions state the real-world
// expectation, so one for a break still open fails by design; they run on
// demand through `pnpm run test:probes` (vitest.probes.config.ts).
export default defineConfig({
  test: {
    testTimeout: 20_000,
    exclude: [...configDefaults.exclude, "src/__probes__/**"],
  },
});
