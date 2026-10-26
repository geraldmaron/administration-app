import { defineConfig } from "vitest/config";

// The realism probes in src/__probes__, run on demand and never by `pnpm run
// test`: an assertion there states the real-world expectation, so a probe for a
// break that is still open fails by design. Read
// docs/audits/2026-10-24-world-dynamics/PROGRAM.md for what each one measures.
export default defineConfig({
  test: {
    include: ["src/__probes__/**/*.probe.test.ts"],
    // Whole campaigns run synchronously inside one test; vitest cannot interrupt
    // those, so the limit only bounds the async scaffolding around them.
    testTimeout: 1_800_000,
    hookTimeout: 900_000,
  },
});
