import { defineConfig } from "vitest/config";

// The other half of vitest.config.ts: the balance harness on its own. Read that
// file's comment for why the split exists.
export default defineConfig({
  test: {
    include: ["src/**/*balance*.test.ts"],
    // Generous rather than tuned. The harness is synchronous, so this cannot
    // interrupt a run in progress; it only bounds the async scaffolding around it.
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
});
