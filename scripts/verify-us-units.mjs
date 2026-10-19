// The game is set in the United States, so the player reads miles, Fahrenheit
// and pounds.
//
// This is the same class of defect `verify-american-spelling.mjs` exists for,
// and it was found the same way: the map’s scale bar labeled itself in
// kilometers, an authored particular read "Water temperature · 4°C", and a
// shipped consequence card moved a coastal watch "back a hundred kilometers".
// Every one of those is player-facing copy in a game whose player is an
// American president, and nothing refused any of them.
//
// What this refuses is the *reading*, never the arithmetic. Geodesy is metric —
// a degree of latitude is 111.32 km, and burying a conversion inside the
// formula that has to be right would be worse than the defect. So the rule is
// the one the whole codebase already follows for currency: compute in the unit
// the source declares, convert once, present in the unit the player uses. A
// file may hold `kmPerUnit` as an intermediate; it may not hand the player a
// string that says km.
//
// Deliberately narrow. It reads string literals and authored content rather
// than identifiers, because `distanceKm` is a correct name for a function that
// returns kilometers and renaming it would make the code lie about itself.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ROOTS = ["packages", "apps", "services"];
const SKIP_DIRS = new Set(["node_modules", "dist", "out", ".expo", "audits", "coverage", "__snapshots__"]);

// A generated data file carries no player-readable copy. The flag PNGs are
// base64 blobs, and a blob long enough will eventually contain the letters
// "kg" — which is a false positive about a unit nobody is reading, in a file
// nobody wrote.
const SKIP_FILE = /\.generated\.(ts|tsx)$/;
const EXTS = new Set([".ts", ".tsx", ".json", ".jsonl"]);

// Files whose job is to contain the unit the gate refuses, so the refusal is
// proven rather than assumed.
const ALLOWED = new Set(["scripts/verify-us-units.mjs"]);

/**
 * Each rule matches a unit as a *reader* would meet it: attached to a number,
 * or spelled out as a word. `metric ton` is deliberately absent — it is the
 * standard unit for shipping tonnage in American usage too.
 */
/**
 * What counts as a quantity in front of a unit.
 *
 * Three forms, and the second two are the ones a naive digit-only rule misses —
 * which is exactly what the proof fixture below caught on the first run. A
 * scale bar interpolates its number (`${nice} km`) and prose spells it out
 * ("forty kilometres"), and both reach the player as a metric reading.
 */
const NUMERALS = String.raw`(?:\d|\})`;
const NUMBER_WORDS = String.raw`(?:one|two|three|four|five|six|seven|eight|nine|ten|dozen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|hundreds|thousand|thousands|few|several)`;

/**
 * A numeral may sit flush against its unit ("100km", "${nice} km"); a spelled
 * number must be followed by real whitespace.
 *
 * The second half is not fussiness. Allowing a bare letter to count as a
 * quantity made "Akgün" — a surname in the dataset's name banks — read as "a
 * kg", and the gate reported 180 false positives across the corpus index files
 * on its first run.
 */
const unitRule = (units, say) => ({
  pattern: new RegExp(`(?:${NUMERALS}\\s?|\\b${NUMBER_WORDS}\\s+)(?:${units})\\b`, "i"),
  say,
});

const RULES = [
  unitRule("km|kilomet(?:er|re)s?", "distance in kilometers — the player reads miles"),
  { pattern: /\d\s?°\s?C\b/, say: "temperature in Celsius — the player reads Fahrenheit" },
  unitRule("celsius|centigrade", "temperature in Celsius — the player reads Fahrenheit"),
  unitRule("kg|kilogram(?:me)?s?", "mass in kilograms — the player reads pounds"),
  unitRule("lit(?:er|re)s?", "volume in liters — the player reads gallons"),
  unitRule("hectares?", "area in hectares — the player reads acres"),
  unitRule("centimet(?:er|re)s?|millimet(?:er|re)s?", "metric length — the player reads inches"),
];

function walk(dir, found = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (EXTS.has(path.extname(entry.name)) && !SKIP_FILE.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * What the player can actually read.
 *
 * In source that is string literals and nothing else — a comment explaining
 * that a degree of latitude is 111.32 km is the arithmetic documenting itself,
 * and refusing it would push the explanation out of the file that needs it. In
 * authored content it is the whole line, since a scenario shard is prose.
 *
 * The corpus's index files (overlap, phrases, flags) are hashes and ids rather
 * than writing, so they are not read: nothing in them ever reaches a screen.
 */
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

function readableParts(rel, line) {
  if (rel.endsWith(".json") || rel.endsWith(".jsonl")) return [line];
  return line.match(STRING_LITERAL) ?? [];
}

function isProse(rel) {
  if (!rel.endsWith(".json") && !rel.endsWith(".jsonl")) return true;
  // Authored shards are prose; the indexes beside them are not.
  return rel.includes(`${path.sep}shards${path.sep}`) || rel.includes(`${path.sep}packs${path.sep}`);
}

const failures = [];
for (const rootName of ROOTS) {
  for (const file of walk(path.join(root, rootName))) {
    const rel = path.relative(root, file);
    // Test names are strings and are not player copy. A test asserting that a
    // 15,000 km target is out of reach is describing the geodesy, not the game.
    if (ALLOWED.has(rel) || !isProse(rel) || /\.test\.tsx?$/.test(rel)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const part of readableParts(rel, line)) {
        const hit = RULES.find((rule) => rule.pattern.test(part));
        if (!hit) continue;
        failures.push({ rel, line: index + 1, say: hit.say, text: part.trim().slice(0, 120) });
        return;
      }
    });
  }
}

// The proof: the gate has to fail on a string it has never seen, or a clean
// tree is indistinguishable from a rule that stopped working. Run against a
// fixture rather than against the tree.
const FIXTURE = [
  'const particular = { label: "Water temperature", value: "4°C" };',
  'return { units: nice / kmPerUnit, label: `${nice} km` };',
  '"They pulled the cordon back forty kilometres before dawn."',
];
const proofMisses = FIXTURE.filter((line) => !RULES.some((rule) => rule.pattern.test(line)));
if (proofMisses.length > 0) {
  console.error("verify-us-units: the gate no longer catches what it exists to catch:");
  for (const line of proofMisses) console.error(`  missed: ${line}`);
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`verify-us-units: ${failures.length} metric reading(s) in player-facing text.\n`);
  for (const failure of failures) {
    console.error(`  ${failure.rel}:${failure.line} — ${failure.say}`);
    console.error(`    ${failure.text}`);
  }
  console.error("\nConvert at the point of presentation. Keep the arithmetic in whatever unit its constants are in.");
  process.exit(1);
}

console.log(`verify-us-units: clean — no metric readings in player-facing text (${RULES.length} rules, 3 proof cases).`);
