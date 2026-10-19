#!/usr/bin/env node
// Vendors the US rows of Natural Earth's populated places (public domain) into
// scripts/vendor/ne-us-places.tsv, the table bake-map-lod.mjs reads offline to
// name the place each congressional district is known by. Only the columns the
// bake reads are kept; the 11MB attribute table itself is never committed.
//
// Run this ONLY when re-vendoring (a new Natural Earth release). It needs
// network access, curl and unzip.
//
// Run: node scripts/vendor-ne-places.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const URL = "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_populated_places_simple.zip";
const OUT = path.join(root, "scripts/vendor/ne-us-places.tsv");

/** A dBase III table as rows of trimmed strings, keyed by lower-cased field name. */
function readDbf(file) {
  const bytes = readFileSync(file);
  const count = bytes.readUInt32LE(4);
  const headerLength = bytes.readUInt16LE(8);
  const recordLength = bytes.readUInt16LE(10);
  const fields = [];
  for (let at = 32; bytes[at] !== 0x0d; at += 32) {
    fields.push({ name: bytes.toString("latin1", at, at + 11).replace(/\0.*$/, "").toLowerCase(), length: bytes[at + 16] });
  }
  return Array.from({ length: count }, (_, index) => {
    let at = headerLength + index * recordLength + 1;
    const row = {};
    for (const field of fields) {
      row[field.name] = bytes.toString("utf8", at, at + field.length).trim();
      at += field.length;
    }
    return row;
  });
}

function main() {
  const work = mkdtempSync(path.join(tmpdir(), "ne-places-"));
  try {
    const zip = path.join(work, "places.zip");
    execFileSync("curl", ["-sSfL", "-o", zip, URL]);
    execFileSync("unzip", ["-q", "-o", zip, "-d", work]);
    const version = readFileSync(path.join(work, "ne_10m_populated_places_simple.VERSION.txt"), "utf8").trim();
    const rows = readDbf(path.join(work, "ne_10m_populated_places_simple.dbf"))
      .filter((row) => row.adm0_a3 === "USA")
      .map((row) => [row.name, row.adm1name, Number(row.latitude).toFixed(4), Number(row.longitude).toFixed(4), String(Math.round(Number(row.pop_max)))])
      .sort((a, b) => Number(b[4]) - Number(a[4]) || a[0].localeCompare(b[0]));
    const header = [`# Natural Earth 10m populated places ${version} (public domain), US rows. Regenerate: node scripts/vendor-ne-places.mjs`, "name\tstate\tlat\tlon\tpopulation"];
    writeFileSync(OUT, [...header, ...rows.map((row) => row.join("\t"))].join("\n") + "\n");
    console.log(`Wrote ${rows.length} places to ${path.relative(root, OUT)}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();
