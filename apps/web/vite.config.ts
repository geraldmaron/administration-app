import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const here = path.dirname(fileURLToPath(import.meta.url));

// The font packages ship @font-face sources for small scripts (Vietnamese,
// Cyrillic Extended) that Vite's default threshold inlines as `data:font/woff2` URIs. The page's
// CSP is `font-src 'self'`, so an inlined font never loads and names with
// diacritics fall back to a system face. Emitting every font file as a
// same-origin asset keeps it inside the CSP.
function assetsInlineLimit(filePath: string): boolean | undefined {
  return /\.woff2?$/i.test(filePath) ? false : undefined;
}

// The baked scenario corpus is most of the game's script by size and changes
// on its own schedule, so it is a chunk of its own: a corpus refresh does not
// invalidate the engine's cached chunks, and the engine's does not re-send
// the corpus. Every other split is the import graph's: routes, the stores and
// the map's campaign lenses are dynamic imports.
function manualChunks(id: string): string | undefined {
  return id.includes("bundled-corpus.generated") ? "corpus" : undefined;
}

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@admin/world/maps": path.resolve(here, "../../packages/world/src/maps/index.ts"),
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    // A launcher running several dev servers at once assigns each its own port through PORT.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  preview: {
    port: 4173,
  },
  appType: "spa",
  // Absolute base so nested deep links resolve `/assets` from the origin.
  // Electron's `administration://game/` scheme is standard, so `/assets`
  // still loads from the protocol root rather than `/person/assets`.
  base: "/",
  build: {
    sourcemap: true,
    target: "es2022",
    assetsInlineLimit,
    rollupOptions: { output: { manualChunks } },
  },
});
