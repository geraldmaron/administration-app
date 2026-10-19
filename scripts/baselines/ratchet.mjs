// The one reader every ratchet baseline in this directory goes through.
//
// A ratchet is a gate that cannot pass today's tree without forgiving what is
// already wrong with it, and must not forgive anything new. Each baseline here
// is a JSON file of `{ "$comment", "entries": { key: count } }`, where a key is
// whatever the gate counts (a file, an export, a registry path) and the count
// is how many findings it was allowed on the day the baseline was taken.
//
// Three verdicts, and only one of them is a pass:
//
//   grew   a key counts more than its entry allows, or counts at all with no
//          entry. A new finding fails the gate, however small.
//   stale  a key counts less than its entry allows. The fix landed, so the
//          baseline has to come down with it; left alone, the headroom would
//          forgive the next regression at the same place without anyone
//          noticing. Run the gate with `--update-baseline` to shrink it.
//   equal  the tree is exactly as forgiven as it was.
//
// Growth is also refused against the committed baseline. A baseline edited in
// the working tree to admit a new finding would otherwise pass its own gate,
// so the gate compares the working file with the one at HEAD and fails any
// key that rose. That is the check this repository's flow can actually hold,
// because every gate runs on the uncommitted tree before the commit is made.
// On a tree whose HEAD has no such file yet, the first baseline is written
// freely and the note says so.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The entries of a baseline file; an absent file is an empty baseline. */
export function readBaseline(file) {
  if (!existsSync(file)) return {};
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const entries = parsed.entries ?? {};
  for (const [key, count] of Object.entries(entries)) {
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`${file}: entry "${key}" must be a whole number of at least 1, got ${JSON.stringify(count)}`);
    }
  }
  return entries;
}

/**
 * The same baseline as HEAD has it, or undefined when HEAD has none (or there
 * is no git to ask). RATCHET_COMMITTED_ROOT points it at a directory standing
 * in for HEAD, which is how the proofs stage a committed baseline.
 */
export function committedBaseline(repoRoot, relPath) {
  const staged = process.env.RATCHET_COMMITTED_ROOT;
  if (staged) {
    const file = path.join(staged, relPath);
    return existsSync(file) ? readBaseline(file) : undefined;
  }
  try {
    const text = execFileSync("git", ["show", `HEAD:${relPath}`], { cwd: repoRoot, stdio: "pipe" }).toString();
    return JSON.parse(text).entries ?? {};
  } catch {
    return undefined;
  }
}

/** Every key whose count moved, sorted, with what the baseline allows and what the tree has. */
export function compareToBaseline(baseline, current) {
  const keys = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort();
  const grew = [];
  const stale = [];
  for (const key of keys) {
    const allowed = baseline[key] ?? 0;
    const found = current[key] ?? 0;
    if (found > allowed) grew.push({ key, allowed, found });
    else if (found < allowed) stale.push({ key, allowed, found });
  }
  return { grew, stale };
}

/** Keys whose working-tree allowance is higher than HEAD's. */
export function raisedSinceCommit(working, committed) {
  if (committed === undefined) return [];
  return Object.entries(working)
    .filter(([key, count]) => count > (committed[key] ?? 0))
    .map(([key, count]) => ({ key, allowed: committed[key] ?? 0, found: count }));
}

/**
 * Rewrites a baseline to the tree's current counts, refusing any key that
 * would rise above what HEAD allows. Returns the keys it refused.
 */
export function writeBaseline(file, comment, current, committed) {
  const refused = raisedSinceCommit(current, committed);
  if (refused.length > 0) return refused;
  const entries = Object.fromEntries(
    Object.entries(current)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(file, `${JSON.stringify({ $comment: comment, entries }, null, 2)}\n`);
  return [];
}

/**
 * The whole ratchet in one call: compare, report, and (with
 * `--update-baseline`) shrink. Returns true when the gate should pass.
 */
export function holdRatchet({ label, repoRoot, file, comment, current, update, describe = (key) => key }) {
  const relPath = path.relative(repoRoot, file);
  const committed = committedBaseline(repoRoot, relPath);
  if (update) {
    const refused = writeBaseline(file, comment, current, committed);
    if (refused.length === 0) {
      console.log(`${label}: wrote ${relPath} with ${Object.keys(current).length} forgiven key(s).`);
      return true;
    }
    console.error(`${label}: refused to raise ${relPath} above what HEAD allows. Fix these instead:`);
    for (const row of refused) console.error(`    ${describe(row.key)}  HEAD allows ${row.allowed}, the tree has ${row.found}`);
    return false;
  }
  const working = readBaseline(file);
  const { grew, stale } = compareToBaseline(working, current);
  const raised = raisedSinceCommit(working, committed);
  if (committed === undefined) console.log(`${label}: NOTE — HEAD has no ${relPath}; this tree's baseline is the first.`);
  for (const row of grew) console.error(`${label}: NEW  ${describe(row.key)}  (${row.found} found, ${row.allowed} forgiven)`);
  for (const row of stale) {
    console.error(`${label}: STALE  ${describe(row.key)}  (${row.found} found, ${row.allowed} forgiven) — shrink the baseline`);
  }
  for (const row of raised) {
    console.error(`${label}: RAISED  ${describe(row.key)}  (HEAD forgave ${row.allowed}, the working baseline ${row.found})`);
  }
  if (stale.length > 0) console.error(`${label}: run with --update-baseline to take the stale headroom out of ${relPath}.`);
  return grew.length === 0 && stale.length === 0 && raised.length === 0;
}
