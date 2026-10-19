import { defineConfig } from "vitest/config";

// The store and save suites found real campaigns and run whole weeks of the
// engine per test. Alone they take one to two seconds; under the workspace's
// parallel run they share the machine with every other package and cross the
// default 5s limit without anything being wrong. The limit is a time budget
// for that load, not an assertion.
export default defineConfig({
  test: {
    testTimeout: 20_000,
  },
});
