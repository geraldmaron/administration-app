#!/usr/bin/env node
/**
 * Every power the President uses cites the law that grants it (DECISIONS
 * §8.12). Each citation the engine prints resolves to one record in
 * player-core's authority registry, and each record links to a public primary
 * source, so a card that names a statute can always open its text:
 *
 *   every executive order in the catalogue carries an authority, and its cite
 *     resolves to a registry record (orderAuthorityRecord)
 *   the emergency-declaration authority every emergency power waits on resolves
 *   every refusal memorandum a directive can draw, at every institution and
 *     for every directive kind, resolves (resolveAuthorityText) or matches one
 *     of the registry's stated exemptions
 *   every record has a unique id, a cite, a title, a summary, at least one
 *     limit, and an https source on one of the registry's allowed hosts
 *
 * It reads the built packages, so it runs after `pnpm run build`.
 * `node scripts/verify-authority-citations.mjs <registry.js> <engine.js>`
 * checks other modules; the proof twin uses that to show the gate can fail.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.resolve(process.argv[2] ?? path.join(root, "packages/player-core/dist/authority/index.js"));
const enginePath = path.resolve(process.argv[3] ?? path.join(root, "packages/engine/dist/index.js"));

for (const file of [registryPath, enginePath]) {
  if (!existsSync(file)) {
    console.error(`verify-authority-citations: ${path.relative(root, file)} is missing. Run \`pnpm run build\` first.`);
    process.exit(1);
  }
}

const registry = await import(pathToFileURL(registryPath).href);
const engine = await import(pathToFileURL(enginePath).href);
const failures = [];

function hostOf(url) {
  return /^https:\/\/([^/?#:]+)/.exec(String(url ?? ""))?.[1];
}

function checkRecords() {
  const hosts = new Set(registry.AUTHORITY_SOURCE_HOSTS ?? []);
  const seen = new Set();
  const records = registry.AUTHORITIES ?? [];
  if (records.length === 0) failures.push("the registry exports no AUTHORITIES");
  for (const record of records) {
    const label = record.id ?? JSON.stringify(record.cite);
    if (seen.has(record.id)) failures.push(`record id ${label} is used twice`);
    seen.add(record.id);
    for (const field of ["id", "cite", "title", "summary"]) {
      if (typeof record[field] !== "string" || record[field].length === 0) failures.push(`record ${label} has no ${field}`);
    }
    if (!Array.isArray(record.limits) || record.limits.length === 0) failures.push(`record ${label} states no limit`);
    const host = hostOf(record.sourceUrl);
    if (!host) failures.push(`record ${label} has no https sourceUrl`);
    else if (!hosts.has(host)) failures.push(`record ${label} links to ${host}, which is not an allowed primary-source host`);
  }
}

function checkOrders() {
  for (const order of engine.EXECUTIVE_ORDERS ?? []) {
    if (!order.authority) failures.push(`order ${order.id} cites no authority`);
    else if (!registry.orderAuthorityRecord(order.authority)) failures.push(`order ${order.id} cites "${order.authority.cite}", which resolves to no registry record`);
  }
  const declaration = engine.EMERGENCY_DECLARATION_AUTHORITY;
  if (declaration && !registry.orderAuthorityRecord(declaration)) failures.push(`the emergency declaration cites "${declaration.cite}", which resolves to no registry record`);
}

function checkDirectives() {
  const kinds = Object.keys(engine.DIRECTIVE_KIND_WEIGHT ?? {});
  const exemptions = registry.DIRECTIVE_AUTHORITY_EXEMPTIONS ?? [];
  const texts = new Set(
    (engine.INSTITUTION_IDS ?? []).flatMap((id) => {
      const def = engine.institutionDef(id);
      return def ? kinds.map((kind) => engine.directiveRefusal(def, kind)?.authority).filter(Boolean) : [];
    }),
  );
  for (const text of texts) {
    if (exemptions.some((entry) => entry.pattern.test(text))) continue;
    if (!registry.resolveAuthorityText(text)) failures.push(`a directive refusal cites "${text}", which resolves to no registry record`);
  }
}

checkRecords();
checkOrders();
checkDirectives();

if (failures.length > 0) {
  for (const failure of failures) console.error(`verify-authority-citations: ${failure}`);
  process.exit(1);
}
console.log(`verify-authority-citations: ${(registry.AUTHORITIES ?? []).length} authorities; every order and directive citation resolves.`);
