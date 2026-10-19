import { defineConfig } from "vitest/config";

// Nested worktrees must resolve component and renderer hooks in one Vite graph.
export default defineConfig({
  resolve: { dedupe: ["react", "react-dom"] },
  test: { server: { deps: { inline: true } } },
});
