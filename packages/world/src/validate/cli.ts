#!/usr/bin/env node
// Runs the dataset validator over a dataset JSON file and reports every issue.
// Exits 0 when clean, 1 on findings, 2 on bad usage — so CI can gate on it.
import { readFileSync } from "node:fs";
import { validateDataset } from "./dataset-validator.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: validate-dataset <path-to-dataset.json>");
  process.exit(2);
}

const input = JSON.parse(readFileSync(file, "utf8"));
const errors = validateDataset(input);

if (errors.length === 0) {
  console.log(`OK: ${file} passes shape, referential-integrity, plausibility, and unit checks.`);
  process.exit(0);
}

console.error(`FAIL: ${errors.length} issue(s) in ${file}`);
for (const err of errors) {
  console.error(`  [${err.kind}] ${err.path}: ${err.message}`);
}
process.exit(1);
