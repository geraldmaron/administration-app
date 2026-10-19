#!/usr/bin/env node
/**
 * Every trade-measure kind is an act somebody can order.
 *
 * `TradeMeasureKind` declared eight members and the engine constructed exactly
 * one of them. Six were dead enum vocabulary sitting one module away from the
 * instrument ladder that needed them, and the seventh — the tariff — was doing
 * all the work, so the register's vocabulary was twice as wide as the board's
 * and a reader could not tell which half was real.
 *
 * This fails when a declared kind has no constructor anywhere in the engine.
 * The remedy is either to build the act or to delete the member; what it will
 * not allow is a third state where the type says the game can do something it
 * cannot.
 *
 *   node scripts/verify-trade-measure-kinds.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tradePath = path.join(root, "packages/engine/src/trade.ts");
const engineSrc = path.join(root, "packages/engine/src");

function fail(lines) {
  console.error(lines.join("\n"));
  process.exit(1);
}

const declaration = readFileSync(tradePath, "utf8").match(
  /export type TradeMeasureKind =([\s\S]*?);/,
);
if (!declaration) {
  fail(["verify-trade-measure-kinds: no TradeMeasureKind declaration in packages/engine/src/trade.ts."]);
}

const kinds = [...declaration[1].matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
if (kinds.length === 0) {
  fail(["verify-trade-measure-kinds: TradeMeasureKind declares no members. A check that checks nothing fails."]);
}

function sources(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules" || entry.name === "__fixtures__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, acc);
    else if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const files = sources(engineSrc);
if (files.length === 0) {
  fail(["verify-trade-measure-kinds: no engine sources found. A run over an empty corpus proves nothing."]);
}

/**
 * A kind is constructed where a `TradeMeasure` is built with it, or where a
 * table the builder reads is keyed by it. Both are the act existing; a mention
 * in a comment or a doc string is not.
 */
const constructors = new Map(kinds.map((kind) => [kind, []]));
for (const file of files) {
  const rel = path.relative(root, file);
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
    for (const kind of kinds) {
      const built = new RegExp(`kind:\\s*"${kind}"`).test(code);
      const keyed = new RegExp(`(^|[\\s{,])"?${kind}"?\\s*:`).test(code) && /_AS_RATE|_AUTHORITY|COERCION|MEASURE/.test(text);
      if (built || keyed) constructors.get(kind).push(`${rel}:${index + 1}`);
    }
  });
}

const dead = kinds.filter((kind) => constructors.get(kind).length === 0);
if (dead.length > 0) {
  fail([
    "verify-trade-measure-kinds FAILED — declared trade-measure kinds nothing in the engine constructs:",
    ...dead.map((kind) => `  "${kind}" — no measure is ever built with it`),
    "",
    "Build the act that writes it, or delete the member from TradeMeasureKind.",
  ]);
}

console.log(
  `verify-trade-measure-kinds: ${kinds.length} kinds, every one constructed — ${kinds
    .map((kind) => `${kind} (${constructors.get(kind).length})`)
    .join(", ")}.`,
);
