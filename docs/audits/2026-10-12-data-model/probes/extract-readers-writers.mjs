#!/usr/bin/env node
// Feasibility probe for the metric registry's extractor (TARGET-MODEL.md §5.3).
// Read-only: parses TypeScript source with the compiler API (no build, no type
// check) and reads the committed world dist for the consumer registry.
//
// Reports, for NationStats leaves:
//   - mechanical writers: `setStats` object literals inside `kind: "nationStat"` effects
//   - mechanical readers: property chains `.stats.<group>.<field>` (direct access only),
//     scanned over engine, content, player-core and world source
//   - registry claims (STAT_CONSUMERS) whose leaf has no mechanical reader
// and, for effect kinds, how many source files construct each kind.
//
// Known blind spots, stated so the numbers are read as a floor: destructuring
// (`const { economy } = nation.stats`), computed keys, paths built from strings
// (policy-stats `requestedDelta.path`), and spreads of prebuilt objects.
//
// Usage: node docs/audits/2026-10-12-data-model/probes/extract-readers-writers.mjs

import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const roots = ["packages/engine/src", "packages/content/src", "packages/player-core/src", "packages/world/src"];

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !/\.generated\./.test(name)) out.push(full);
  }
  return out;
}

const readers = new Map(); // leaf -> Set(file)
const writers = new Map(); // leaf -> Set(file)
const kindEmitters = new Map(); // kind -> Set(file)
const add = (map, key, file) => (map.get(key) ?? map.set(key, new Set()).get(key)).add(file);

function literalPaths(node, prefix) {
  const out = [];
  if (!ts.isObjectLiteralExpression(node)) return out;
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue;
    const name = prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : undefined;
    if (!name) continue;
    const p = prefix ? `${prefix}.${name}` : name;
    if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) out.push(...literalPaths(prop.initializer, p));
    else out.push(p);
  }
  return out;
}

for (const dir of roots) {
  for (const file of files(path.join(root, dir))) {
    const rel = path.relative(root, file);
    const src = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const kindProp = node.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "kind" && ts.isStringLiteral(p.initializer));
        if (kindProp) {
          const kind = kindProp.initializer.text;
          add(kindEmitters, kind, rel);
          if (kind === "nationStat") {
            const set = node.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "setStats");
            if (set) for (const leaf of literalPaths(set.initializer, "")) add(writers, leaf, rel);
          }
        }
      }
      if (ts.isPropertyAccessExpression(node) && !ts.isPropertyAccessExpression(node.parent)) {
        const text = node.getText(sf).replace(/\s+/g, "").replace(/\?\./g, ".").replace(/!/g, "");
        const m = text.match(/\.stats\.([a-zA-Z]+)\.([a-zA-Z]+)(?:\.([a-zA-Z]+))?/);
        if (m) {
          add(readers, `${m[1]}.${m[2]}`, rel);
          if (m[3]) add(readers, `${m[1]}.${m[2]}.${m[3]}`, rel);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
}

const { STAT_CONSUMERS } = await import(path.join(root, "packages/world/dist/dataset/stat-consumers.js"));
const leaves = STAT_CONSUMERS.map((c) => c.path);
const noReader = leaves.filter((leaf) => !readers.has(leaf));
const writtenLeaves = leaves.filter((leaf) => writers.has(leaf));

console.log(`NationStats leaves in STAT_CONSUMERS: ${leaves.length}`);
console.log(`  with >=1 mechanical reader (direct .stats.<g>.<f> access, engine+content+player-core+world): ${leaves.length - noReader.length}`);
console.log(`  with no mechanical reader found: ${noReader.length}`);
for (const leaf of noReader) {
  const claim = STAT_CONSUMERS.find((c) => c.path === leaf);
  console.log(`    ${leaf}  — registry says: ${(claim.readBy ?? claim.owedBy).slice(0, 100)}`);
}
console.log(`  with >=1 mechanical nationStat setStats writer: ${writtenLeaves.length}`);
for (const leaf of writtenLeaves) console.log(`    ${leaf}  <- ${[...writers.get(leaf)].sort().join(", ")}`);
console.log(`\nEffect kinds constructed as object literals with a string 'kind' (all object literals with kind:"x", so non-Effect kinds appear too):`);
const effectKinds = ["metric", "opinion", "nationStat", "populationToll", "impactEvent", "externalShock", "condition", "state", "city", "cohort", "relationship", "conflict", "commitment", "macroState", "books"];
for (const k of effectKinds) console.log(`  ${k.padEnd(15)} ${(kindEmitters.get(k)?.size ?? 0).toString().padStart(3)} files`);
