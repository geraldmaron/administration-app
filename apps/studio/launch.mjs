#!/usr/bin/env node
// The console's front door from a cold checkout: `pnpm studio` at the repo root.
//
// Everything this script does was previously something an operator had to know.
// It checks the two things that otherwise fail as a blank page or a stack
// trace — unbuilt workspace packages, an occupied port — and only then starts
// the server. A failure here names the exact fix.

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const PORT = Number(process.env.PORT ?? 4400);

/** Workspace packages dev-server.mjs imports at module load; an unbuilt one is an import crash before the first request. */
const REQUIRED_BUILDS = [
  ["@admin/world", "packages/world/dist/index.js"],
  ["@admin/engine", "packages/engine/dist/index.js"],
  ["@admin/content", "packages/content/dist/index.js"],
  ["@admin/contracts", "packages/contracts/dist/index.js"],
];

function fail(headline, lines) {
  console.error(`\n  studio: ${headline}\n`);
  for (const line of lines) console.error(`    ${line}`);
  console.error("");
  process.exit(1);
}

function checkBuilds() {
  const missing = REQUIRED_BUILDS.filter(([, dist]) => !existsSync(path.join(ROOT, dist)));
  if (!missing.length) return;
  fail("the workspace packages the console imports are not built.", [
    ...missing.map(([name, dist]) => `missing  ${dist}   (${name})`),
    "",
    "Fix:  pnpm install && pnpm run build",
    "If a build looks like it did nothing, delete that package's tsconfig.tsbuildinfo and build again.",
  ]);
}

function checkPort() {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", (error) => {
      if (error.code !== "EADDRINUSE") throw error;
      fail(`port ${PORT} is already in use.`, [
        "Another studio server (or something else) already holds it.",
        `Check:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN`,
        `Or pick another port:  PORT=4401 pnpm studio`,
      ]);
    });
    probe.once("listening", () => probe.close(() => resolve()));
    // No host, matching how dev-server.mjs binds: a probe pinned to 127.0.0.1
    // succeeds against a server already holding the port on ::, which is the
    // one case this check exists to catch.
    probe.listen(PORT);
  });
}

checkBuilds();
await checkPort();

console.log(`\n  studio  http://localhost:${PORT}`);
console.log("  auth    none — internal, localhost-only console, never deploy this.\n");

const child = spawn(process.execPath, [path.join(HERE, "dev-server.mjs")], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});
child.on("exit", (code) => process.exit(code ?? 0));
