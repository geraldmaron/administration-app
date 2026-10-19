#!/usr/bin/env node
/**
 * Proves verify-authority-citations can fail: hands the gate a scratch
 * registry and a scratch engine with one planted defect each, requires it to
 * reject every one, requires it to accept a clean scratch pair, then requires
 * it to pass the built tree.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const gate = path.join(here, "verify-authority-citations.mjs");

const GOOD_RECORD = {
  id: "ieepa",
  cite: "50 U.S.C. §§1701–1708",
  title: "IEEPA",
  summary: "Sanctions.",
  limits: ["Needs an emergency."],
  sourceUrl: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section1701",
};

function registrySource(records) {
  return `export const AUTHORITIES = ${JSON.stringify(records)};
export const AUTHORITY_SOURCE_HOSTS = ["uscode.house.gov"];
export const DIRECTIVE_AUTHORITY_EXEMPTIONS = [{ pattern: /^the organic statute of /, reason: "generated" }];
const known = (text) => AUTHORITIES.find((record) => String(text).includes("1702") || String(text).includes(record.cite));
export const orderAuthorityRecord = (authority) => known(authority.cite);
export const resolveAuthorityText = (text) => known(text);
`;
}

function engineSource({ orders, refusal }) {
  return `export const EXECUTIVE_ORDERS = ${JSON.stringify(orders)};
export const DIRECTIVE_KIND_WEIGHT = { investigation: 1 };
export const INSTITUTION_IDS = ["INST-A", "INST-B"];
export const institutionDef = (id) => ({ id });
export const directiveRefusal = (def) => (def.id === "INST-A" ? { authority: ${JSON.stringify(refusal)} } : { authority: "the organic statute of the B" });
`;
}

const GOOD_ORDER = { id: "order-asset-seizure", authority: { cite: "50 U.S.C. §1702(a)(1)(B)", name: "IEEPA" } };
const CLEAN = { records: [GOOD_RECORD], orders: [GOOD_ORDER], refusal: "50 U.S.C. §1702" };

const PLANTS = [
  ["an order citing a law the registry lacks", { ...CLEAN, orders: [{ id: "order-x", authority: { cite: "99 U.S.C. §1", name: "Nothing" } }] }],
  ["an order with no authority", { ...CLEAN, orders: [{ id: "order-bare" }] }],
  ["a directive refusal citing a law the registry lacks", { ...CLEAN, refusal: "presidential power generally" }],
  ["a record with no sourceUrl", { ...CLEAN, records: [{ ...GOOD_RECORD, sourceUrl: undefined }] }],
  ["a record linking over http", { ...CLEAN, records: [{ ...GOOD_RECORD, sourceUrl: "http://uscode.house.gov/x" }] }],
  ["a record linking to an unlisted host", { ...CLEAN, records: [{ ...GOOD_RECORD, sourceUrl: "https://example.com/ieepa" }] }],
  ["two records with one id", { ...CLEAN, records: [GOOD_RECORD, GOOD_RECORD] }],
  ["a record stating no limit", { ...CLEAN, records: [{ ...GOOD_RECORD, limits: [] }] }],
];

function passes(args) {
  try {
    execFileSync("node", [gate, ...args], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function passesScratch(scenario) {
  const scratch = mkdtempSync(path.join(tmpdir(), "authority-citations-"));
  try {
    const registry = path.join(scratch, "registry.mjs");
    const engine = path.join(scratch, "engine.mjs");
    writeFileSync(registry, registrySource(scenario.records));
    writeFileSync(engine, engineSource(scenario));
    return passes([registry, engine]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

let failed = false;
for (const [label, scenario] of PLANTS) {
  if (passesScratch(scenario)) {
    failed = true;
    console.error(`verify-authority-citations-proof: the gate passed ${label}.`);
  }
}
if (!passesScratch(CLEAN)) {
  failed = true;
  console.error("verify-authority-citations-proof: the gate refused a clean registry and engine.");
}
if (!passes([])) {
  failed = true;
  console.error("verify-authority-citations-proof: the gate fails on the built tree.");
}
if (failed) process.exit(1);
