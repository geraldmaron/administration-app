#!/usr/bin/env node
// Proves verify-no-history-references.mjs fails the ways it is supposed to,
// rather than passing because today's tree happens to be clean: one planted hit
// per denylist category, the lookalikes that must pass, each exemption, and a
// run over no files.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = "scripts/verify-no-history-references.mjs";
const FIXTURE = "scripts/__history_fixture_tmp__";

const failures = [];

function run(target) {
  try {
    return { ok: true, out: String(execFileSync("node", [gate, target], { cwd: root, stdio: "pipe" })) };
  } catch (err) {
    if (err.status && err.status !== 0) return { ok: false, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

function withFixture(name, body, check) {
  const full = path.join(root, FIXTURE);
  mkdirSync(full, { recursive: true });
  try {
    writeFileSync(path.join(full, name), body);
    check(run(FIXTURE));
  } finally {
    rmSync(full, { recursive: true, force: true });
  }
}

function refuses(label, body, word, name = "fixture.ts") {
  withFixture(name, body, (result) => {
    if (result.ok) failures.push(`did not refuse ${label}`);
    else if (!result.out.includes(word)) failures.push(`refused ${label} without naming "${word}"`);
  });
}

function accepts(label, body, name = "fixture.ts") {
  withFixture(name, body, (result) => {
    if (!result.ok) failures.push(`refused ${label}: ${result.out.trim()}`);
  });
}

refuses("the earlier nation", "// Maron had a different charter.\n", "Maron");
refuses("the earlier nation's adjective", "// The Maronese cradle.\n", "Maronese");
refuses("an RFC citation", "// per RFC 0009 section 3\n", "RFC");
refuses("an ADR citation", "// see ADR 0017\n", "ADR");
refuses("a pivot reference", "// Ported from the pre-pivot dossier.\n", "pre-pivot");
refuses("the pivot as an event", "// Since the pivot to the United States.\n", "the pivot");
refuses("the retired design source", "// Governed by the Grail.\n", "Grail");
refuses("a retired brief path", "// See docs/PATTERNS.md.\n", "PATTERNS.md");
refuses("an archive path", "// Lives in docs/_archive/old.md\n", "_archive");
refuses("a deleted docs folder", "// See docs/RFCs/0004.md\n", "docs/RFCs");
refuses("a deleted audit record", "// Measured in docs/audits/2026-09-01-surface/notes.md\n", "docs/audits/2026-09-01-surface");
refuses("a retired client", "// The Kotlin client did this.\n", "Kotlin");
refuses("a retired backend", "// Firebase held the saves.\n", "Firebase");
refuses("a pre-rebuild reference", "// Saves from the pre-rebuild build.\n", "pre-rebuild");
refuses("a bead id", "// Tracked as admin-3yr.\n", "admin-3yr");
refuses("a bead id with a suffix", "// Tracked as admin-2xa.11.\n", "admin-2xa.11");

accepts("the package name", 'const ua = "admin-app vendor";\n// admin-app-dataset-vendor/1.0\n');
accepts("a content set id", 'export const set = "admin-2026w34";\n');
accepts("a real surname", 'export const surnames = ["Marong", "Maroney"];\n');
accepts("a matrix pivot", "let pivot = col;\n");
accepts("the current audit program path", "// docs/audits/2026-10-10-map-first/PROGRAM.md\n");

accepts("a name bank", 'export const bank = ["Maron"];\n', "name-banks.ts");
accepts("the save store's refusal test", 'const charter = "charter-maron-presidential";\n', "save-store.test.ts");
accepts("the decisions map", "RFC 0004 went to DECISIONS.md. ADR 0021 too. admin-3yr.\n", "w0-decisions-map.md");
accepts("a publish-gate SDK list", 'const FORBIDDEN = [["firebase", /firebase/i]]; // Firebase\n', "verify-publish-gate.mjs");
accepts("a closed backlog log", "## Open\n\nlive text\n\n## Closed\n\n- BL-1 closed under RFC 0004, admin-3yr.\n", "BACKLOG.md");
refuses("history above the closed log", "## Open\n\n- see RFC 0004\n\n## Closed\n", "RFC", "BACKLOG.md");

const empty = run("scripts/__history_empty_tmp__");
if (empty.ok) failures.push("reported clean after reading no files at all");
else if (!/scanned nothing/.test(empty.out)) failures.push("refused an empty run without saying it read nothing");

if (failures.length > 0) {
  console.error(`verify-no-history-references-proof: ${failures.length} failure(s).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("OK: verify-no-history-references refuses each category, and passes lookalikes and exemptions.");
