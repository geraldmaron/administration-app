#!/usr/bin/env node
// Proves verify-deed-reachability.mjs fails the ways it is supposed to, rather
// than passing because today's corpus happens to read no deed at all.
//
//   1. a gate on a deed family the engine has never heard of
//   2. a gate on a deed in the vocabulary that no emitter writes
//   3. a gate on an outcome its family's emitter never produces
//   4. a two-hop chain: a reader waiting on a flag only a dead scenario sets
//   5. an emitted deed that nothing reads and the allowlist does not queue
//   6. an allowlist entry for a deed a scenario now reads
//   7. an allowlist entry for a deed no emitter writes
//   8. an emitter the table names that is no longer in the engine's source
//   9. the honest case — one reader, everything else queued — which must pass
//
// Every case runs against a fixture corpus and a fixture allowlist, never the
// working tree's, so the proof answers for the gate and not for the corpus.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gate = path.join(root, "scripts/verify-deed-reachability.mjs");
const realAllowlist = JSON.parse(readFileSync(path.join(root, "scripts/deed-reachability-allowlist.json"), "utf8"));
const work = mkdtempSync(path.join(tmpdir(), "deed-reachability-proof-"));
const failures = [];

const scenario = (id, gates, sets = []) => ({
  id,
  conditions: gates.map((flag) => ({ kind: "flag", flag, is: true })),
  replies: [{ id: `${id}-reply`, sets }],
});

/** Runs the gate over a fixture; returns its exit status and combined output. */
function run(defs, allowlist, script = gate) {
  const corpus = path.join(work, `corpus-${Math.random().toString(36).slice(2)}`);
  mkdirSync(corpus, { recursive: true });
  writeFileSync(path.join(corpus, "fixture-000.jsonl"), defs.map((def) => JSON.stringify(def)).join("\n") + "\n");
  const list = path.join(work, `allow-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(list, JSON.stringify(allowlist));
  try {
    const out = execFileSync("node", [script, "--corpus", corpus, "--allowlist", list, "--no-packs"], { cwd: root, stdio: "pipe" });
    return { status: 0, out: out.toString() };
  } catch (err) {
    if (typeof err.status !== "number") throw err;
    return { status: err.status, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const allBut = (...read) => Object.fromEntries(Object.entries(realAllowlist).filter(([flag]) => !read.includes(flag)));
const HONEST = "deed:military:high:landed";

function expectFail(label, defs, allowlist, mention) {
  const result = run(defs, allowlist);
  if (result.status === 0) failures.push(`did not reject ${label}`);
  else if (mention && !result.out.includes(mention)) failures.push(`rejected ${label} without naming "${mention}"`);
}

try {
  expectFail("a misspelt deed family", [scenario("reads-a-typo", ["deed:militry:high:landed"]), scenario("reader", [HONEST])], allBut(HONEST), "reads-a-typo");
  expectFail("a deed with no emitter", [scenario("reads-neglect", ["deed:neglect-answered:low:landed"]), scenario("reader", [HONEST])], allBut(HONEST), "no emitter writes it");
  expectFail("an outcome the family never produces", [scenario("reads-failed-pledge", ["deed:pledge:low:failed"]), scenario("reader", [HONEST])], allBut(HONEST), "reads-failed-pledge");
  expectFail(
    "a reader two hops behind a dead deed",
    [
      scenario("dead-root", ["deed:neglect-answered:mid:landed"], ["answered-the-neglect"]),
      scenario("two-hops-down", ["answered-the-neglect"]),
      scenario("reader", [HONEST]),
    ],
    allBut(HONEST),
    "two-hops-down",
  );
  expectFail("an emitted deed nobody reads or queues", [scenario("reader", [HONEST])], allBut(HONEST, "deed:order:low:failed"), "deed:order:low:failed");
  expectFail("an allowlist entry for a deed now read", [scenario("reader", [HONEST])], realAllowlist, HONEST);
  expectFail(
    "an allowlist entry for a deed no emitter writes",
    [scenario("reader", [HONEST])],
    { ...allBut(HONEST), "deed:neglect-answered:low:landed": { owner: "content track", reason: "fixture" } },
    "deed:neglect-answered:low:landed",
  );

  // 8. The table's own honesty: a copy of the gate whose table names a call the
  // engine does not make. It lives beside the gate so it resolves the same root.
  const rotted = path.join(root, "scripts", `.verify-deed-reachability-rotted-${process.pid}.mjs`);
  writeFileSync(rotted, readFileSync(gate, "utf8").replace('orderDeed(ORDER_DOMAIN_BAND[order.domain], "landed"', "signOrderDeedThatDoesNotExist("));
  try {
    const result = run([scenario("reader", [HONEST])], allBut(HONEST), rotted);
    if (result.status === 0 || !result.out.includes("no longer does")) failures.push("did not reject an emitter the engine's source no longer contains");
  } finally {
    rmSync(rotted, { force: true });
  }

  // 9. The honest shape must pass, or every rejection above proves nothing.
  const honest = run([scenario("reader", [HONEST], ["answered-the-strike"]), scenario("follow-up", ["answered-the-strike"])], allBut(HONEST));
  if (honest.status !== 0) failures.push(`rejected the honest case:\n${honest.out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("FAIL: verify-deed-reachability-proof");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("verify-deed-reachability-proof: 9 of 9 cases behave (8 rejected, the honest case passed).");
