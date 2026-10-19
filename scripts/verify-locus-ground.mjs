#!/usr/bin/env node
// Every authored scenario says whose soil it happens on.
//
// `ScenarioLocus.ground` used to be optional, and `resolveLocus` filled the gap
// with `?? "counterpart"`. That default was not neutral: a scenario carries a
// cast almost always, so an author who simply did not think about ground got
// their event geolocated in whichever foreign nation the board had cast. The
// schema's own comment described a conditional default ("unset, a domestic
// scenario is at home and a cast one on the counterpart's ground") that the
// implementation never had — it read the field and nothing else.
//
// What that cost, measured over the shipped corpus before this gate existed:
// 135 of 303 scenarios rendered on foreign soil. `the-concert-under-threat`
// ("the concert hall downtown where the national orchestra opens tonight")
// drew as "Moscow — the concert hall downtown", and asked the President of the
// United States to cancel a concert in Moscow and accept a Russian detail at
// the door. A reference scenario reading "the fourth-floor payroll office, two
// corridors from yours" pointed two corridors from a foreign head of state.
//
// None of it failed anything. The field was optional, so the strict parse
// passed; the default was legal, so the audit family passed. A silent default
// on a field this load-bearing cannot be caught by a schema — only by a rule
// that says the field must be there.
//
// So: no locus may omit `ground`, anywhere content is authored, and no source
// may reintroduce a default for it. The check reads the authored files rather
// than the built ones, because the build is where a missing field would have
// already been silently resolved.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];
let checked = 0;

/** Every JSONL corpus the room authors, plus the reference set writers copy from. */
const JSONL_DIRS = [
  path.join(root, "content", "corpus", "shards"),
  path.join(root, "content", "reference"),
];

for (const dir of JSONL_DIRS) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
    const file = path.join(dir, name);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let scenario;
      try {
        scenario = JSON.parse(trimmed);
      } catch {
        failures.push(`${path.relative(root, file)}:${index + 1} is not parseable JSON`);
        return;
      }
      if (!scenario.locus) return;
      checked += 1;
      if (scenario.locus.ground !== "home" && scenario.locus.ground !== "counterpart") {
        failures.push(
          `${path.relative(root, file)}:${index + 1} — ${scenario.id} has a locus with no ground. ` +
            `site "${scenario.locus.site}", descriptor "${String(scenario.locus.descriptor).slice(0, 60)}…". ` +
            `Say "home" or "counterpart"; there is no default.`,
        );
      }
    });
  }
}

// The TypeScript packs are authored content too — core.ts is what a build with
// no corpus ships, so a pack scenario missing ground is a scenario every cold
// install can be dealt.
const PACK_DIR = path.join(root, "packages", "content", "src", "packs");
for (const name of ["core.ts", "pilot.ts"]) {
  const file = path.join(PACK_DIR, name);
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  // A locus literal is `locus: { … }`; find each and require a ground inside it.
  const pattern = /locus:\s*\{/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let end = start;
    for (let i = start; i < source.length; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const literal = source.slice(start, end + 1);
    checked += 1;
    if (!/\bground:\s*"(home|counterpart)"/.test(literal)) {
      const lineNumber = source.slice(0, match.index).split("\n").length;
      failures.push(
        `packages/content/src/packs/${name}:${lineNumber} — a locus literal has no ground. ` +
          `Say "home" or "counterpart"; there is no default.`,
      );
    }
  }
}

// And the resolver may not grow the default back. This is the half that makes
// the gate hold: backfilling the data without closing the hole leaves the next
// authored scenario free to fall through it again.
const resolver = path.join(root, "packages", "content", "src", "scenario-locus.ts");
if (existsSync(resolver)) {
  const source = readFileSync(resolver, "utf8");
  if (/locus\.ground\s*\?\?/.test(source) || /ground\s*=\s*locus\.ground\s*\|\|/.test(source)) {
    failures.push(
      `packages/content/src/scenario-locus.ts reintroduced a default for locus.ground. ` +
        `The field is required; resolve it directly.`,
    );
  }
} else {
  failures.push("packages/content/src/scenario-locus.ts is missing — this gate cannot check the resolver.");
}

// A run that checked nothing is a run that proves nothing.
if (checked === 0) {
  failures.push("no authored loci were found at all — this gate checked nothing and cannot pass.");
}

if (failures.length > 0) {
  console.error(`verify-locus-ground: ${failures.length} problem(s) across ${checked} authored loci.\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`verify-locus-ground: ${checked} authored loci, every one says whose soil it is on.`);
