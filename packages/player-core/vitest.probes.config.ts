import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The realism probes in src/__probes__, run on demand and never by `pnpm run
// test`. They drive the campaign store and the content cast, which import
// `@admin/engine` and `@admin/content`; both are pointed at source here so a
// probe run measures this tree rather than whatever was last built into dist.
const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@admin/engine": source("../engine/src/index.ts"),
      "@admin/content": source("../content/src/index.ts"),
    },
  },
  test: {
    include: ["src/__probes__/**/*.probe.test.ts"],
    testTimeout: 2_400_000,
    hookTimeout: 900_000,
  },
});
