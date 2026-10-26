// The project is written in American English — every identifier, every comment,
// every line of player-facing copy.
//
// `packages/content` already refused British spellings in *authored content*
// (`BRITISH_SPELLINGS`, enforced by the scenario and consequence audits), which
// caught the prose a model generates and nothing else. The engine, the design
// system, the app, the docs and the dataset were written the other way, so the
// game shipped a `defence` policy domain, `colour` tokens and `neighbour`
// fields under a rule that only applied to half of it. This is the other half.
//
// Stems rather than whole words: refusing "colour" refuses colours, coloured
// and colourful without listing them. The few files that must contain a British
// spelling are the ones testing that it gets refused, and they are named here
// rather than exempted by pattern — an exemption nobody has to justify is how
// the rule erodes.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// One optional argument scopes the run to a path under the repository, which is
// how the proof asks the gate about a fixture instead of about the tree. A gate
// whose proof can only run on a clean tree reports the tree's state as its own,
// and goes unrunnable for the whole of a wave.
const TARGETS = process.argv.slice(2);
const ROOTS =
  TARGETS.length > 0
    ? TARGETS
    : ["packages", "apps", "services", "scripts", "docs", "README.md"];
// `.chrome-profile` is the CDP profile the showcase capture scripts spin up.
// It is gitignored scratch, but it lands under apps/ on any machine that has
// run a capture, and it carries bundled Chrome extension source written in
// someone else's English — which is not ours to spell-check.
// `sources` holds the world dataset's research provenance, which quotes the
// titles of foreign sources verbatim ("Labour", "Defence") as citations.
// `out` is Electron Forge's packaged app. Chromium's own licenses are not ours
// to spell-check, and the directory is gitignored.
const SKIP_DIRS = new Set([
  "node_modules",
  // A vendored build of MapLibre GL ("grey" is in its source, not ours).
  "maplibre",
  "dist",
  "out",
  ".expo",
  "audits",
  "sources",
  "coverage",
  "__snapshots__",
  ".chrome-profile",
]);
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".css", ".html"]);

// The negative tests: files whose job is to contain the spelling the gate
// refuses, so the refusal itself is proven rather than assumed.
const ALLOWED = new Set([
  "packages/content/src/language.ts",
  "packages/content/src/scenario-audit.test.ts",
  "packages/content/src/consequence-audit.test.ts",
  "scripts/verify-american-spelling.mjs",
  // The proof seeds the violations it expects to be refused, so it has to hold
  // them in its own source. Listed for the same reason as the gate itself.
  "scripts/verify-american-spelling-proof.mjs",
  // Holds "kilometres" deliberately: the US-units gate has to refuse the
  // British spelling of a metric unit as well as the American one, and its
  // proof fixture is where that case is written down.
  "scripts/verify-us-units.mjs",
]);

const STEMS = [
  "behaviour", "colour", "defence", "programme", "organis", "urbanis", "neighbour", "labour", "honour",
  "armour", "offence", "favour", "harbour", "rumour", "licence", "centre", "theatre", "spectre", "sombre",
  "calibre", "fibre", "sabre", "lustre", "metre", "litre", "grey", "sceptic", "amongst", "whilst",
  "realis", "recognis", "normalis", "summaris", "capitalis", "specialis", "characteris", "apologis",
  "modernis", "prioritis", "legitimis", "stabilis", "mobilis", "nationalis", "privatis", "optimis",
  "neutralis", "synthesis", "synchronis", "serialis", "stylis", "randomis", "memoris", "customis",
  "centralis", "civilis", "globalis", "liberalis", "militaris", "radicalis", "polaris", "standardis",
  "sanitis", "utilis", "generalis", "minimis", "maximis", "colonis",
  "analyse", "paralyse", "travelled", "travelling", "cancelled", "modelled", "modelling", "signalling",
  "labelled", "labelling", "fuelled", "learnt", "practise", "manoeuvre", "aluminium", "judgement",
  "acknowledgement", "moustache", "jewellery", "marvellous", "cheque", "storey", "plough",
];

// An "-is" stem is only British in its verb forms. "nationalist" and
// "globalist" are American exactly as they stand, and a rule that read them as
// inflections of "nationalise" would refuse the alignment axis this game is
// built on. So those stems are matched with the endings that make them verbs,
// and never on their own.
const VERB_ENDINGS = "(?:e|es|ed|ing|ation|ations|able|ably)";

// Words nobody spells this way in any dialect, produced by applying the
// -ise/-ize rule to a word that never took it. "Realizm" is the one this
// repo actually grew: eight of them, in the docs, in the strategy, and worst
// of all inside a director prompt that instructs a generation model to write
// with "procedural realizm" — a batch's own craft brief, misspelling the
// thing it is asking for. The -is stems above are matched only in their verb
// forms precisely so "realism" is left alone, so nothing was ever going to
// catch the over-correction going the other way.
const OVERCORRECTIONS = ["izm", "izmatic"];

// Proper nouns that contain a refused stem and are not misspelled, because a
// name has no dialect to be wrong in. Listed as whole words, one justification
// each, rather than by exempting the file that holds them: the name banks run
// to thousands of lines, and a file-level pass there would hide every real
// "colour" the dataset ever grows.
//
// "Greybull" is the authentic form of a Crow name that the name bank carries
// alongside Blackwolf, Ironcloud and Twoeagles — spelling it "Graybull" would
// not be an Americanization, it would be a different name that nobody has.
// The four military schools below are named institutions that really exist and
// really spell it that way. "Australian Defense Force Academy" is not the
// American spelling of a name — it is the wrong name for a real place, which
// is a worse defect than the one this gate exists to catch. Listed per name
// rather than by exempting `schools.ts`, so a genuine "colour" added to that
// catalogue tomorrow is still caught.
const PROPER_NOUNS = [
  // Not a noun but the same rule: `aria-labelledby` is the W3C's own attribute
  // name. The spec spells it that way and no American form exists; code that
  // names, matches, or documents the attribute is quoting a standard, not
  // writing prose. Matched with the attribute suffix so a bare "labelled" in
  // a sentence is still refused.
  /\blabelledby\b/g,
  /\bGreybull\b/g,
  /\bPLA National Defence University\b/g,
  /\bNigerian Defence Academy\b/g,
  /\bNational Defence Academy, Khadakwasla\b/g,
  /\bAustralian Defence Force Academy\b/g,
  /\bEthiopian Defence University\b/g,
  /\bStrategic_Mutual_Defence_Agreement\b/g,
  // Registered names of foreign political parties. A party's legal name is a
  // proper noun, not a spelling choice: Britain's Labour Party is not spelled
  // "Labor" and Colombia's Centro Democrático is rendered "Democratic Centre"
  // in English. The rule this gate enforces is that the game speaks American
  // English; it is not that the game renames other countries' institutions.
  // Licensed by name rather than by exempting the file, so a genuine British
  // spelling in the authored slates is still refused.
  /\bLabour Party\b/g,
  /\bLabour Front\b/g,
  /\bDemocratic Centre\b/g,
  /\bparty-[a-z]{3}-labour\b/g,
  // The bare short name, quoted — the display form of the party above.
  /"Labour"/g,
  // Seated tickets of the thin records, as the CIA World Factbook names them
  // (roster-tables.generated.ts): Armenia's "I Have the Honour" alliance
  // (Pativ Unem), Estonia's Centre Party (Keskerakond), Nepal's CPN (Maoist
  // Centre), and Portugal's CDS, the Democratic and Social Centre. The same
  // rule as Labour: a foreign party's English name is its name.
  /\bI Have the Honour Alliance\b/g,
  /\bparty-arm-i-have-the-honour-alliance\b/g,
  /\bCentre Party\b/g,
  /\bparty-est-centre-party\b/g,
  /\bMaoist Centre\b/g,
  /\bDemocratic and Social Centre\b/g,
  // Personal names in the vendored banks (name-banks.vendored.ts) whose
  // letters contain a refused stem: Aggrey is a South Sudanese given name,
  // Metreveli a Georgian surname. Quoted, so the same letters in prose are
  // still refused.
  /"Aggrey"/g,
  /"Metreveli"/g,
  // Wikidata's English label for the ideology, used verbatim as the lookup key
  // that places a seated party on the game's axes (nation-roster-priors.mjs);
  // the key is the source's spelling because it has to match the source.
  /"euroscepticism"/g,
  // The Shanghai Cooperation Organisation is the body's own official English name (the SCO's charter and website spell it so); the dataset names it exactly.
  /\bShanghai Cooperation Organisation\b/g,
];

// --- Register, not spelling -------------------------------------------------
//
// Two words that are spelled the same in both dialects and still wrong here.
// "Autumn" is fall and "a fortnight" is two weeks, and a US-set game whose
// copy says either is speaking in a voice no American reader has. A third is
// worse than either: a tropical storm that makes landfall in Florida is a
// hurricane, and the game called it a cyclone everywhere for as long as
// `cyclone` was the identifier for the kind.
//
// Three things separate this family from the stems above, and each is why it
// needed its own rule rather than another entry on that list.
//
// It is matched in CODE ONLY, comments stripped. "A bad fortnight" in a doc
// comment explaining a mean-reversion rate is an engineer writing to an
// engineer, and the rule that refuses the word in a sentence a player reads has
// no business in there.
//
// It is matched in the packages that produce player-facing copy, and not in
// `scripts` (test scaffolding, which nobody reads) or `packages/content` (whose
// own audit already refuses the register in authored prose — `language.ts`'s
// `BRITISH_SPELLINGS`, enforced by the scenario and consequence audits; the
// files that would trip here are the rules and the tests that prove that
// refusal).
//
// And "cyclone" is matched only in its prose forms — after an article, or in the
// plural — because `cyclone` is also the identifier for the hazard kind, in the
// world enum, the exposure field, every exhaustive table and every save ever
// written. An identifier never reads "a cyclone".
const REGISTER_ROOTS = ["packages/engine", "packages/world", "packages/player-core", "packages/ui-web", "packages/design", "apps/web"];

const REGISTER_PATTERN = new RegExp(
  ["\\bautumn\\b", "\\bfortnights?\\b", "\\b(?:a|an|the)\\s+cyclones?\\b", "\\bcyclones\\b"].join("|"),
  "gi",
);

// The one licensed home for the word, and the reason nothing else may say it:
// the basin table is where "a cyclone" is the correct answer, for the Indian
// Ocean and the south Pacific. Licensed by file rather than by pattern, because
// the whole point of that table is that every other caller asks it.
const REGISTER_ALLOWED = new Set([
  "packages/engine/src/condition-impacts.ts",
  // The test that proves the basin rule: asserting that the Indian Ocean and the
  // south Pacific are told about in the word their own weather services use means
  // holding that word, in prose, as the expected value. Listed for the same
  // reason as the gate and its proof.
  "packages/engine/src/condition-incidents.test.ts",
  // The baked corpus: a build artifact whose every line came out of an authored
  // shard, so its register is `packages/content`'s audit to enforce at the
  // source. Refusing it here would report the bake and not the shard, and the
  // fix would have to be made in a file this gate is not looking at.
  "packages/player-core/src/content/bundled-corpus.generated.ts",
]);

function inRegisterScope(rel) {
  return REGISTER_ROOTS.some((root) => rel === root || rel.startsWith(`${root}/`));
}

/**
 * The line with its comments blanked, and whether a block comment is still open
 * after it.
 *
 * Blanked rather than dropped so a column number still means something, and
 * approximate on purpose: a `//` inside a string literal blanks the rest of the
 * line, which can only ever hide a finding rather than invent one. A gate that
 * needed a parser to say "do not call it a cyclone" would not be worth having.
 */
function codeOnly(line, insideBlock) {
  let out = "";
  let block = insideBlock;
  for (let at = 0; at < line.length; at += 1) {
    if (block) {
      if (line.startsWith("*/", at)) {
        block = false;
        out += "\u0000\u0000";
        at += 1;
        continue;
      }
      out += "\u0000";
      continue;
    }
    if (line.startsWith("//", at)) return { code: out + "\u0000".repeat(line.length - at), block };
    if (line.startsWith("/*", at)) {
      block = true;
      out += "\u0000\u0000";
      at += 1;
      continue;
    }
    out += line[at];
  }
  return { code: out, block };
}

// "analyses" and "paralyses" are the American plurals of "analysis" and
// "paralysis" as well as the British verb forms, and no rule can tell those
// apart. So these two stems are matched only where no "s" follows, which still
// refuses "analyse", "analysed" and "analysing" and leaves the noun alone.
const NOT_BEFORE_S = new Set(["analyse", "paralyse"]);

const PATTERN = new RegExp(
  [
    // "programme" is a proper prefix of "programmer", which is the American
    // spelling — match the stem only where no letter follows it.
    ...STEMS.map((stem) =>
      stem.endsWith("is")
        ? `${stem}${VERB_ENDINGS}`
        : stem === "programme"
          ? `${stem}(?![a-z])`
          : NOT_BEFORE_S.has(stem)
            ? `${stem}(?!s)`
            : stem,
    ),
    ...OVERCORRECTIONS.map((over) => `[a-z]${over}\\b`),
  ].join("|"),
  "gi",
);

/** A lowercase letter followed by an uppercase one: two words of an identifier meeting. */
const CAMEL_HUMP = /[a-z][A-Z]/;

/** An encoded payload, blanked before the line is scanned. See the call site. */
const DATA_URI = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// A named root that is absent (a working doc deleted, a workspace not checked
// out) is skipped rather than fatal: the gate exists to find misspellings in
// what is here, not to assert which files exist.
const files = ROOTS.flatMap((target) => {
  const full = path.join(root, target);
  if (!existsSync(full)) return [];
  try {
    return target.endsWith(".md") ? [full] : walk(full);
  } catch {
    return [];
  }
}).filter((file) => EXTS.has(path.extname(file)));

const findings = [];
for (const file of files) {
  const rel = path.relative(root, file);
  if (ALLOWED.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  const register = inRegisterScope(rel) && !REGISTER_ALLOWED.has(rel);
  let block = false;
  text.split("\n").forEach((line, index) => {
    if (register) {
      const stripped = codeOnly(line, block);
      block = stripped.block;
      for (const match of stripped.code.matchAll(REGISTER_PATTERN)) {
        findings.push({ rel, line: index + 1, word: match[0].trim(), text: line.trim().slice(0, 90) });
      }
    }
    // Blanked rather than skipped, so a line carrying both a licensed proper
    // noun and a genuine British spelling still reports the second one. A
    // base64 payload is blanked the same way and for the same reason: it is
    // an encoded byte string, not prose, and a long enough one contains every
    // short letter sequence by chance — a baked flag matched "zIzM" and failed
    // a spelling gate. Blanking the payload rather than exempting the file
    // keeps any real sentence in a generated file under the rule.
    const scanned = [DATA_URI, ...PROPER_NOUNS].reduce(
      (acc, noun) => acc.replace(noun, (m) => "\u0000".repeat(m.length)),
      line,
    );
    for (const match of scanned.matchAll(PATTERN)) {
      // The pattern ignores case, so a stem can straddle a camelCase hump: "crimeTrend" reads "meTre".
      // A real misspelling never changes from lower to upper case inside its own letters.
      if (CAMEL_HUMP.test(match[0])) continue;
      findings.push({ rel, line: index + 1, word: match[0], text: line.trim().slice(0, 90) });
    }
  });
}

// The way this class of gate goes quiet: a clean report over nothing. A run that
// found no file to read has answered no question, and saying OK to that is worse
// than failing, because it looks like proof.
if (files.length === 0) {
  console.error(`verify-american-spelling: read no files under ${ROOTS.join(", ")} — the gate scanned nothing.`);
  process.exit(1);
}

if (findings.length > 0) {
  console.error(`verify-american-spelling: ${findings.length} misspelling(s) — British forms, or -ize over-corrections of words that never took it.\n`);
  for (const finding of findings.slice(0, 40)) {
    console.error(`  ${finding.rel}:${finding.line}  ${finding.word} — ${finding.text}`);
  }
  if (findings.length > 40) console.error(`  ... and ${findings.length - 40} more`);
  process.exit(1);
}

console.log(`OK: American spelling across ${files.length} files.`);
