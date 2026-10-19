// Live code and live docs describe the product as it is. They do not narrate
// the nation the game used to be played as, the pivots that retired it, the
// decision records that were folded into DECISIONS.md, or the tracker ids of
// work that is finished. A comment that says "since the pivot" is a pointer to
// a record that no longer exists, and it teaches a reader a history that
// nothing else in the tree backs up. Say the current reason inline, or say
// nothing.
//
// The denylist is word-bounded so it refuses the retired name and not the
// letters inside real ones: the name banks carry real surnames such as
// "Marong", and a bead id is only `admin-` plus three or four base-36
// characters, which is neither the package name `admin-app` nor a content set
// id like `admin-2026w34`.
//
// Exempt, each for a stated reason:
// - the name banks, which hold real surnames;
// - the save store's test, which pins the deliberate refusal of saves written
//   before the rebuild and so has to hold a retired charter id to refuse it;
// - `## Closed` in BACKLOG.md, which is history by design;
// - the W0 decisions map and the map-first PROGRAM.md, which name every deleted
//   record and the pivots in order to say what was deleted and where it went;
// - `verify-publish-gate.mjs`, whose forbidden-SDK list names Firebase to
//   keep it out;
// - this gate and its proof, which hold the patterns.
//
// One optional argument scopes the run to a path under the repository, which is
// how the proof asks the gate about a fixture instead of about the tree.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const TARGETS = process.argv.slice(2);
const ROOTS =
  TARGETS.length > 0
    ? TARGETS
    : ["packages", "apps", "services", "scripts", "docs", "README.md", "eslint.config.mjs", ".github"];

// `worktrees` holds agent checkouts of other commits under .claude; they are not this tree.
const SKIP_DIRS = new Set(["node_modules", "dist", "out", "coverage", ".chrome-profile", "__snapshots__", "worktrees"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".css", ".html", ".json", ".yml", ".yaml"]);

const EXEMPT_PATHS = [
  /(^|\/)name-banks[^/]*\.ts$/,
  /(^|\/)name-banks\//,
  /(^|\/)save-store\.test\.ts$/,
  /(^|\/)w0-decisions-map\.md$/,
  /(^|\/)2026-10-10-map-first\/PROGRAM\.md$/,
  /(^|\/)verify-publish-gate\.mjs$/,
  /(^|\/)verify-no-history-references(-proof)?\.mjs$/,
];

const DENYLIST = [
  ["earlier playable nation", /\bMaron(?:ese)?\b/i],
  ["decision record (RFC)", /\bRFCs?\b/],
  ["decision record (ADR)", /\bADRs?\b/],
  ["the pivots", /\b(?:pre-pivot|post-pivot|the pivot(?:'s)?|pivots? to the United States)\b/i],
  ["retired design source", /\bGrail\b|\bPATTERNS\.md\b/],
  ["archive path", /(?<!\w)_archive\b/],
  ["deleted docs folder", /\bdocs\/(?:RFCs|ADRs|PRDs|specs|grail)\b/],
  // The live audit records are listed here, the universal player program among them; any other audit path names a deleted one.
  ["deleted audit record", /\bdocs\/audits\/(?!2026-10-10-map-first\b|2026-10-11-operations-redesign\b|2026-10-11-simulation-depth\b|2026-10-12-contested-issues\b|2026-10-12-approval-model\b|2026-10-12-coercion-geography\b|2026-10-12-grounded-casting\b|2026-10-12-data-model\b|2026-10-13-appointments\b|2026-10-13-player-visual-audit\b|2026-10-14-worktree-reconciliation\b|2026-10-16-universal-player\b|2026-10-16-control-plane\b|2026-10-16-presidential-authority\b|2026-10-16-act-workspace\b|2026-10-17-ui-uniformity\b|2026-10-17-scenario-harness\b)[\w.-]+/],
  ["deleted client or backend", /\b(?:Kotlin|Firebase)\b/i],
  ["pre-rebuild", /\bpre-rebuild\b/i],
  ["tracker id", /\badmin-(?!app\b|auth\b|web\b|api\b)[a-z0-9]{3,4}(?:\.\d+)*\b/],
];

function* walk(entry) {
  const full = path.join(root, entry);
  if (!existsSync(full)) return;
  const stat = readdirSyncSafe(full);
  if (stat === null) {
    if (EXTS.has(path.extname(full))) yield entry;
    return;
  }
  for (const child of stat) {
    if (SKIP_DIRS.has(child.name)) continue;
    yield* walk(path.join(entry, child.name));
  }
}

function readdirSyncSafe(full) {
  try {
    return readdirSync(full, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOTDIR") return null;
    throw err;
  }
}

// BACKLOG.md's closed log is history by design; everything above it is live.
// Its open items keep their old tracker ids as labels, because citations
// elsewhere resolve to those ids there, so the tracker-id check skips it.
function liveLines(rel, lines) {
  if (path.basename(rel) !== "BACKLOG.md") return lines.map((text, i) => [i + 1, text]);
  const closed = lines.findIndex((line) => line.trim() === "## Closed");
  const end = closed === -1 ? lines.length : closed;
  return lines.slice(0, end).map((text, i) => [i + 1, text]);
}

let seen = 0;
const hits = [];
for (const entry of ROOTS) {
  for (const rel of walk(entry)) {
    const posix = rel.split(path.sep).join("/");
    seen += 1;
    if (EXEMPT_PATHS.some((re) => re.test(posix))) continue;
    const lines = readFileSync(path.join(root, rel), "utf8").split("\n");
    for (const [lineNo, text] of liveLines(posix, lines)) {
      for (const [label, re] of DENYLIST) {
        if (label === "tracker id" && path.basename(posix) === "BACKLOG.md") continue;
        const match = re.exec(text);
        if (match) hits.push(`${posix}:${lineNo}: ${label}: "${match[0]}"`);
      }
    }
  }
}

if (seen === 0) {
  console.error("verify-no-history-references: scanned nothing; a clean report over no files proves nothing.");
  process.exit(1);
}

if (hits.length > 0) {
  console.error(`verify-no-history-references: ${hits.length} reference(s) to retired history.`);
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log(`OK: no history references across ${seen} files.`);
