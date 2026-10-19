#!/usr/bin/env node
/**
 * The renderer boundary (DECISIONS §8.1, §8.2). The simulation and the
 * presentation logic never import a renderer, so the same game runs under
 * the universal Expo player on iOS, Android and the web, and under the
 * Electron host that loads the web export:
 *
 *   engine, world, content, contracts, player-core, design
 *     no React, React DOM, React Native, Expo, Tamagui, Electron, Steamworks
 *   packages/ui (the Tamagui design system)
 *     no router (screens own navigation), no Expo module except fonts,
 *     haptics, blur, gradients and images, no Electron or Steamworks, and
 *     no engine or player-core: it draws view models it is handed
 *   apps/player (the universal player)
 *     no Electron, Steamworks or the legacy DOM design system
 *   apps/web and packages/ui-web (the legacy DOM player, until cut-over)
 *     no React Native, Expo, Electron or Steamworks
 *
 * `node scripts/verify-renderer-boundary.mjs <root>` checks another tree; the
 * proof twin uses that to show the gate can fail.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));

function rg(pattern, dir) {
  const full = path.join(root, dir);
  if (!existsSync(full)) return "";
  try {
    return execFileSync("rg", ["-n", "-P", "--glob", "*.{ts,tsx,js,mjs,cjs}", "--glob", "!**/dist/**", "--glob", "!**/node_modules/**", pattern, full], { encoding: "utf8" });
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause && cause.status === 1) return "";
    throw cause;
  }
}

/** An import or require of any module whose specifier matches `names`. */
const importOf = (names) => String.raw`(from\s+|import\s+|require\()['"](${names})(/[^'"]*)?['"]`;

const RENDERERS = String.raw`react|react-dom|react-native|react-native-web|react-native-svg|expo|expo-[a-z-]+|@expo/[a-z-]+|tamagui|@tamagui/[a-z-]+|electron|steamworks\.js`;
const RULES = [
  { dirs: ["packages/engine", "packages/world", "packages/content", "packages/contracts", "packages/player-core", "packages/design"], pattern: importOf(RENDERERS), why: "must stay renderer-free" },
  { dirs: ["packages/ui"], pattern: importOf(String.raw`expo-router|expo|expo-(?!font|haptics|blur|linear-gradient|image)[a-z-]+|electron|steamworks\.js|@admin/engine|@admin/player-core|@admin/ui-web|react-dom`), why: "is the design system: no router, no host, no simulation" },
  { dirs: ["apps/player"], pattern: importOf(String.raw`electron|steamworks\.js|@admin/ui-web|react-dom`), why: "is the universal player: hosts stay behind their bridges" },
  { dirs: ["apps/web", "packages/ui-web"], pattern: importOf(String.raw`react-native|react-native-web|expo|expo-[a-z-]+|electron|steamworks\.js|tamagui|@tamagui/[a-z-]+`), why: "is the legacy DOM player" },
];

let failed = false;
for (const rule of RULES) {
  for (const dir of rule.dirs) {
    const hits = rg(rule.pattern, dir);
    if (hits) {
      failed = true;
      console.error(`verify-renderer-boundary: ${dir} ${rule.why}.\n${hits}`);
    }
  }
}
if (failed) process.exit(1);
console.log("verify-renderer-boundary: simulation and presentation logic are renderer-free; the design system and the players import only what their layer allows.");
