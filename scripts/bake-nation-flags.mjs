#!/usr/bin/env node
// Bakes the vendored flag-icons SVGs (scripts/vendor/nation-flags/) into a
// generated TS module of alpha2 -> raw SVG markup, rendered at runtime as
// ordinary inline SVG. No network, no dependency on flag-icons at
// runtime — the vendor step already copied what's needed.
//
// Run: node scripts/bake-nation-flags.mjs

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const vendorDir = path.join(root, "scripts/vendor/nation-flags");
const outFile = path.join(
  root,
  "packages/ui-web/src/assets/flags/nation-flag-svgs.generated.ts",
);

function minify(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/\s+/g, " ")
    .replace(/> </g, "><")
    .trim();
}

function main() {
  const files = readdirSync(vendorDir).filter((f) => f.endsWith(".svg")).sort();
  const entries = files.map((file) => {
    const alpha2 = path.basename(file, ".svg");
    const svg = minify(readFileSync(path.join(vendorDir, file), "utf8"));
    return `  ${alpha2}: ${JSON.stringify(svg)},`;
  });

  const banner =
    "// GENERATED FILE — do not hand-edit.\n" +
    "// Source: scripts/vendor/nation-flags/ (flag-icons, MIT — see LICENSE there).\n" +
    "// Regenerate with: node scripts/vendor-nation-flags.mjs && node scripts/bake-nation-flags.mjs\n\n";

  const body =
    `export const NATION_FLAG_SVGS: Readonly<Record<string, string>> = {\n${entries.join("\n")}\n};\n`;

  writeFileSync(outFile, banner + body);
  console.log(`Baked ${files.length} nation flags into ${path.relative(root, outFile)}.`);
}

main();
