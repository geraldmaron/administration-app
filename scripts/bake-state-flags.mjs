#!/usr/bin/env node
// Bakes the vendored US state flag SVGs (scripts/vendor/state-flags/) into a
// generated TS module of StateId -> a small base64 PNG data URI, rendered at
// runtime with a plain <img>.
//
// Unlike the national flags (flag-icons: a few KB of clean geometric paths
// each), several state flags are Wikipedia vector *tracings* of a painted
// seal — Pennsylvania's alone is 775KB of path data reproducing brushstroke
// detail no one will ever see at icon size. Shipping that as SVG source would
// put ~8MB of path data in the JS bundle for art displayed at 18-96pt.
// Rasterizing once at bake time, at a fixed size big enough for the largest
// on-screen use (StateFlag's "hero"), fixes that: every entry becomes a few
// KB of PNG instead of tracing every seal's brushstroke as vector paths.
//
// Needs the system `rsvg-convert` (from librsvg — `brew install librsvg` on
// macOS). No network; scripts/vendor/state-flags/ already has the source.
//
// Run: node scripts/bake-state-flags.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const vendorDir = path.join(root, "scripts/vendor/state-flags");
const outFile = path.join(
  root,
  "packages/ui-web/src/assets/flags/state-flag-pngs.generated.ts",
);

// 3:2, matching StateFlag's own frame (height * 1.5 = width). Rendered at 3x
// the "hero" size (56pt) so it stays crisp on a retina display at every
// smaller size the component actually uses.
const OUT_HEIGHT = 56 * 3;
const OUT_WIDTH = OUT_HEIGHT * 1.5;

function main() {
  const scratch = mkdtempSync(path.join(tmpdir(), "state-flag-bake-"));
  try {
    const files = readdirSync(vendorDir).filter((f) => f.endsWith(".svg")).sort();
    const entries = files.map((file) => {
      const stateId = path.basename(file, ".svg");
      const pngPath = path.join(scratch, `${stateId}.png`);
      execFileSync("rsvg-convert", [
        "-w", String(OUT_WIDTH),
        "-h", String(OUT_HEIGHT),
        "-o", pngPath,
        path.join(vendorDir, file),
      ]);
      const b64 = readFileSync(pngPath).toString("base64");
      return `  ${stateId}: "data:image/png;base64,${b64}",`;
    });

    const banner =
      "// GENERATED FILE — do not hand-edit.\n" +
      "// Source: scripts/vendor/state-flags/ (see SOURCE.md there for provenance).\n" +
      "// Regenerate with: node scripts/vendor-state-flags.mjs && node scripts/bake-state-flags.mjs\n\n";

    const body =
      `export const STATE_FLAG_PNGS: Readonly<Record<string, string>> = {\n${entries.join("\n")}\n};\n`;

    writeFileSync(outFile, banner + body);
    console.log(`Baked ${files.length} state flags (${OUT_WIDTH}x${OUT_HEIGHT} PNG) into ${path.relative(root, outFile)}.`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main();
