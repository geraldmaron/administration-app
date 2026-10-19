#!/usr/bin/env node
/**
 * Proves verify-renderer-boundary can fail: plants one forbidden import in
 * each guarded layer of a scratch tree, requires the gate to reject every
 * one, then requires it to pass the real tree.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const gate = path.join(here, "verify-renderer-boundary.mjs");

const PLANTS = [
  ["packages/player-core/src/leak.ts", 'import { View } from "react-native";\n'],
  ["packages/engine/src/leak.ts", 'import { createTamagui } from "@tamagui/core";\n'],
  ["packages/design/src/leak.ts", 'import React from "react";\n'],
  ["packages/ui/src/leak.tsx", 'import { Link } from "expo-router";\n'],
  ["packages/ui/src/leak2.tsx", 'import { advanceUntilAttention } from "@admin/engine";\n'],
  ["apps/player/src/leak.ts", 'import { app } from "electron";\n'],
  ["apps/web/src/leak.ts", 'import * as Haptics from "expo-haptics";\n'],
];

function runs(root) {
  try {
    execFileSync("node", [gate, root], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

let failed = false;
for (const [file, source] of PLANTS) {
  const scratch = mkdtempSync(path.join(tmpdir(), "renderer-boundary-"));
  try {
    mkdirSync(path.dirname(path.join(scratch, file)), { recursive: true });
    writeFileSync(path.join(scratch, file), source);
    if (runs(scratch)) {
      failed = true;
      console.error(`verify-renderer-boundary-proof: the gate passed a forbidden import in ${file}.`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
const allowed = mkdtempSync(path.join(tmpdir(), "renderer-boundary-"));
try {
  mkdirSync(path.join(allowed, "packages/ui/src"), { recursive: true });
  writeFileSync(path.join(allowed, "packages/ui/src/ok.tsx"), 'import { Image } from "expo-image";\nimport Svg from "react-native-svg";\n');
  if (!runs(allowed)) {
    failed = true;
    console.error("verify-renderer-boundary-proof: the gate refused imports the design system is allowed.");
  }
} finally {
  rmSync(allowed, { recursive: true, force: true });
}
if (failed) process.exit(1);
execFileSync("node", [gate], { stdio: "inherit" });
console.log("verify-renderer-boundary-proof: every planted leak is refused and the real tree passes.");
