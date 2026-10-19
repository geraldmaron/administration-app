#!/usr/bin/env node
// The person dossier tells a player what each of the five readings actually
// moves, and three of those sentences name a number: the mark past which a
// disaffected officer builds a faction instead of resigning, the discount a
// charismatic one gets on it, and how far integrity holds the weekly odds down.
//
// Those numbers are copies. `attribute-consequence.ts` restates them as local
// constants rather than importing them, on the argument that a sentence checked
// against the constant it was generated from proves only that the file parses.
// That argument is right about tests and silent about drift: the file's own
// test compares `challengeMarkFor()` to the local constant, which is the
// constant compared to itself. Retune the engine's floor to 0.7 and the dossier
// keeps telling players 65% with every gate green.
//
// This gate reads both sides. It is the same rule
// verify-doctrine-metric-alignment.mjs enforces between the engine and the
// content doctrine, applied to the other place engine constants are restated in
// prose — and it is a separate script rather than a sixth check inside that one
// because the two have different sources of truth on the copy side and
// different files to fix, and a gate named for the doctrine that also failed on
// player copy would be a gate whose name lies.
//
// Deliberately narrow: it checks only the constants the player is shown as
// prose. A constant the copy does not cite has nothing to drift from.
//
// It also reads the President's own side. The opening position weighs three of
// the President's readings on the day of the oath (LEADER_PORTFOLIO in
// opening-portfolios.ts), and the dossier once told the player that nothing
// read their integrity while the engine was reading it. So the weights the
// copy prints are compared too, and no line for a reading the portfolio weighs
// may say that nothing reads it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const copyPath = path.join(root, "packages/player-core/src/dossier/attribute-consequence.ts");
const cabinetPath = path.join(root, "packages/engine/src/cabinet.ts");
const portfoliosPath = path.join(root, "packages/engine/src/opening-portfolios.ts");
const personSchemaPath = path.join(root, "packages/world/src/schemas/person.ts");
const foreignLeaderPath = path.join(root, "packages/engine/src/foreign-leader.ts");

const copy = readFileSync(copyPath, "utf8");
const cabinet = readFileSync(cabinetPath, "utf8");
const portfolios = readFileSync(portfoliosPath, "utf8");
const personSchema = readFileSync(personSchemaPath, "utf8");
const foreignLeader = readFileSync(foreignLeaderPath, "utf8");

const failures = [];

/**
 * Pull one `const NAME = <number>;` out of a source file.
 *
 * A miss is a failure, never a skip: the whole point of this gate is that it
 * fails when it can no longer see one of the two sides, rather than passing
 * green on a run that compared nothing.
 */
function constant(source, file, name) {
  const match = source.match(new RegExp(`const ${name}\\s*=\\s*(-?[0-9.]+)\\s*;`));
  if (!match) {
    failures.push(
      `could not find \`${name}\` in ${file} — it was renamed, moved or reshaped. ` +
        `Update this gate's expectation; do not delete the check.`,
    );
    return null;
  }
  return Number(match[1]);
}

/** The engine side: the constants the weekly cabinet sweep actually branches on. */
const engineChallenge = constant(cabinet, "packages/engine/src/cabinet.ts", "CHALLENGE_AMBITION_FLOOR");
const engineDiscount = constant(cabinet, "packages/engine/src/cabinet.ts", "CHARISMATIC_AMBITION_DISCOUNT");
const engineRestraint = constant(cabinet, "packages/engine/src/cabinet.ts", "INTEGRITY_RESTRAINT");

/** The copy side: what the dossier restates and prints. */
const copyChallenge = constant(copy, "attribute-consequence.ts", "CHALLENGE_AMBITION_MARK");
const copyDiscount = constant(copy, "attribute-consequence.ts", "CHARISMATIC_CHALLENGE_DISCOUNT");
const copyRestraint = constant(copy, "attribute-consequence.ts", "INTEGRITY_RESTRAINT");

const PAIRS = [
  {
    label: "the challenge mark",
    engine: engineChallenge,
    copy: copyChallenge,
    engineName: "CHALLENGE_AMBITION_FLOOR",
    copyName: "CHALLENGE_AMBITION_MARK",
    shown: "the ambition consequence line, which prints this as a percentage",
  },
  {
    label: "the charismatic discount on that mark",
    engine: engineDiscount,
    copy: copyDiscount,
    engineName: "CHARISMATIC_AMBITION_DISCOUNT",
    copyName: "CHARISMATIC_CHALLENGE_DISCOUNT",
    shown: "the same ambition line's `— NN% for a charismatic chair —` clause, and the channel marker on the dossier",
  },
  {
    label: "how far integrity restrains a disaffected chair",
    engine: engineRestraint,
    copy: copyRestraint,
    engineName: "INTEGRITY_RESTRAINT",
    copyName: "INTEGRITY_RESTRAINT",
    shown: "the integrity consequence line, which prints this as a percentage",
  },
];

for (const pair of PAIRS) {
  if (pair.engine === null || pair.copy === null) continue;
  if (pair.engine !== pair.copy) {
    failures.push(
      `${pair.label}: the engine branches on ${pair.engineName} = ${pair.engine} ` +
        `(packages/engine/src/cabinet.ts) but the player is told ${pair.copyName} = ${pair.copy} ` +
        `(packages/player-core/src/dossier/attribute-consequence.ts). ${pair.shown}.`,
    );
  }
}

/**
 * The President's own pushes, read out of LEADER_PORTFOLIO: which reading, on
 * which metric, at what weight. A block the gate cannot find is a failure.
 */
function leaderPortfolio() {
  const block = portfolios.match(/export const LEADER_PORTFOLIO[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!block) {
    failures.push("could not find LEADER_PORTFOLIO in packages/engine/src/opening-portfolios.ts — update this gate, do not delete the check");
    return [];
  }
  const pushes = [...block[1].matchAll(/metric:\s*"([^"]+)",\s*attribute:\s*"([^"]+)",\s*weight:\s*(-?[0-9.]+)/g)].map(
    ([, metric, attribute, weight]) => ({ metric, attribute, weight: Number(weight) }),
  );
  if (pushes.length === 0) failures.push("LEADER_PORTFOLIO parsed to no pushes at all — the entry shape changed");
  return pushes;
}

/** The copy constant each leader push is restated as, by reading and metric. */
const LEADER_COPY_CONSTANT = {
  "competence:stability": "LEADER_COMPETENCE_STABILITY_WEIGHT",
  "charisma:standing": "LEADER_CHARISMA_STANDING_WEIGHT",
  "integrity:stability": "LEADER_INTEGRITY_STABILITY_WEIGHT",
};

/**
 * The president line for one reading, as written in the copy.
 *
 * Every subject's copy is nested in a `{ text, readBy? }` line rather than
 * a bare string, and `president` is no longer the last key in an attribute's
 * block (justice, hill and the rest of the eleven standings follow it), so
 * this reads only the `president: { ... }` sub-block within the attribute's
 * own block — never "to the end of the entry," which would swallow every
 * later subject's copy along with it.
 */
function presidentLine(attribute) {
  const entry = copy.match(new RegExp(`\\n  ${attribute}: \\{([\\s\\S]*?)\\n  \\},\\n`));
  if (!entry) return null;
  const block = entry[1].match(/president:\s*\{([\s\S]*?)\n    \},/);
  if (!block) return null;
  const text = block[1].match(/text:\s*[`"]([\s\S]*?)[`"],?\s*$/);
  return text ? text[1] : null;
}

const leaderPushes = leaderPortfolio();
for (const push of leaderPushes) {
  const name = LEADER_COPY_CONSTANT[`${push.attribute}:${push.metric}`];
  if (!name) {
    failures.push(
      `LEADER_PORTFOLIO weighs the President's ${push.attribute} on ${push.metric}, and the dossier has no constant restating it. ` +
        "Add one to attribute-consequence.ts and print it in the president line.",
    );
    continue;
  }
  const printed = constant(copy, "attribute-consequence.ts", name);
  if (printed !== null && printed !== push.weight) {
    failures.push(
      `the President's ${push.attribute} on ${push.metric}: the engine weighs it at ${push.weight} (LEADER_PORTFOLIO) ` +
        `but the dossier prints ${name} = ${printed}.`,
    );
  }
  const line = presidentLine(push.attribute);
  if (line === null) {
    failures.push(`could not find the president line for ${push.attribute} in attribute-consequence.ts`);
  } else if (/Nothing reads it|This trait counts for nothing/.test(line)) {
    failures.push(
      `the President's ${push.attribute} line says nothing reads it, and LEADER_PORTFOLIO weighs it on ${push.metric} at the oath.`,
    );
  }
}

/**
 * No standing kind's sentence names a rule outside its own scope.
 *
 * The bug this replaced sent every non-president standing the cabinet's own
 * copy, so a Hill leader's file said dismissing them cost Standing and a
 * justice's said the same. Read straight from source rather than importing
 * the table, so a sentence moved back onto the wrong subject is caught by a
 * check that does not share its own mistake.
 */
const SCOPE_FORBIDDEN = {
  justice: ["cabinet", "dismiss", "leak", "faction"],
  hill: ["cabinet", "dismiss", "leak", "strike"],
  governor: ["cabinet", "dismiss", "leak", "faction", "lobby"],
  agency: ["cabinet", "dismiss", "leak", "faction", "lobby"],
  foreign: ["cabinet", "dismiss", "leak", "faction", "lobby"],
  "foreign-leader": ["cabinet", "dismiss", "leak", "faction", "lobby"],
  deceased: ["cabinet", "dismiss", "leak", "faction", "lobby"],
};

/**
 * The shared constants and helpers `justice`, `hill`, `governor`, `agency`,
 * `foreign` and `foreign-leader` cells are allowed to reference instead of an
 * inline literal, and how to pull each one's own text back out. Named
 * explicitly, the way the gate above names the engine's own constants: a
 * fifth kind of indirection arriving here fails the lookup below rather than
 * silently reading nothing.
 */
function resolveShared(name) {
  if (name === "NO_READER") {
    const decl = copy.match(/const NO_READER\s*=\s*"([^"]*)"/);
    return decl ? decl[1] : null;
  }
  if (name === "JUSTICE_SKILL" || name === "FOREIGN_LEADER_TEMPERAMENT") {
    const decl = copy.match(new RegExp(`const ${name}[^=]*=\\s*\\{[\\s\\S]*?text:\\s*"([^"]*)"`));
    return decl ? decl[1] : null;
  }
  if (name === "hillLean" || name === "hillLobby" || name === "foreignLeaderLean") {
    const decl = copy.match(new RegExp(`function ${name}\\([^)]*\\)[\\s\\S]*?text:\\s*\`([\\s\\S]*?)\`,`));
    return decl ? decl[1] : null;
  }
  return null;
}

/**
 * The `subject: ...` cell inside one attribute's block, as plain text —
 * whichever of the three shapes the table writes it in: an inline literal
 * (`{ text: "..." }`), a bare shared constant (`JUSTICE_SKILL`), a wrapped
 * one (`{ text: NO_READER }`), or a helper call (`hillLean("loyalty")`).
 */
function subjectLine(attributeBlock, subject) {
  const key = subject.includes("-") ? `"${subject}"` : subject;
  const inline = attributeBlock.match(new RegExp(`(?:^|\\s)${key}:\\s*\\{[\\s\\S]*?text:\\s*[\`"]([\\s\\S]*?)[\`"],?\\s*\\n?\\s*\\}`));
  if (inline) return inline[1];
  const wrapped = attributeBlock.match(new RegExp(`(?:^|\\s)${key}:\\s*\\{\\s*text:\\s*([A-Za-z_$][\\w$]*)\\s*\\}`));
  if (wrapped) return resolveShared(wrapped[1]);
  const called = attributeBlock.match(new RegExp(`(?:^|\\s)${key}:\\s*([A-Za-z_$][\\w$]*)\\(`));
  if (called) return resolveShared(called[1]);
  const bare = attributeBlock.match(new RegExp(`(?:^|\\s)${key}:\\s*([A-Za-z_$][\\w$]*),`));
  return bare ? resolveShared(bare[1]) : null;
}

let scopeChecked = 0;
for (const attribute of ["competence", "loyalty", "integrity", "charisma", "ambition"]) {
  const entry = copy.match(new RegExp(`\\n  ${attribute}: \\{([\\s\\S]*?)\\n  \\},\\n`));
  if (!entry) {
    failures.push(`could not find the "${attribute}" block in attribute-consequence.ts to scope-check`);
    continue;
  }
  for (const [subject, forbidden] of Object.entries(SCOPE_FORBIDDEN)) {
    const text = subjectLine(entry[1], subject);
    if (text === null) {
      failures.push(`could not find a "${subject}" line under "${attribute}" in attribute-consequence.ts`);
      continue;
    }
    scopeChecked += 1;
    const lower = text.toLowerCase();
    for (const word of forbidden) {
      if (lower.includes(word)) {
        failures.push(`${attribute}/${subject} names "${word}", which is outside that standing's scope: "${text.trim()}"`);
      }
    }
  }
}

/**
 * A foreign head of government's lean: which of their readings move the
 * government they lead, and by how much.
 *
 * The engine reads three of them into the offset their government's
 * temperament carries while they hold office (`personalLean` in
 * foreign-leader.ts), and the dossier prints each swing and the bound as
 * points. So the gate checks the swing each copy constant restates, that the
 * engine reads the attribute the copy says it reads at that swing, that each
 * of the three lines prints its constant, and that the two readings the lean
 * does not read say nothing reads them.
 */
const FOREIGN_LEAN = [
  { attribute: "ambition", engineName: "LEADER_AMBITION_SWING", copyName: "FOREIGN_LEADER_AMBITION_SWING" },
  { attribute: "integrity", engineName: "LEADER_INTEGRITY_SWING", copyName: "FOREIGN_LEADER_INTEGRITY_SWING" },
  { attribute: "loyalty", engineName: "LEADER_LOYALTY_SWING", copyName: "FOREIGN_LEADER_LOYALTY_SWING" },
];
const FOREIGN_UNREAD = ["competence", "charisma"];
const FOREIGN_LEADER_REL = "packages/engine/src/foreign-leader.ts";

let foreignCompared = 0;
{
  const engineBound = constant(foreignLeader, FOREIGN_LEADER_REL, "LEADER_OFFSET_BOUND");
  const copyBound = constant(copy, "attribute-consequence.ts", "FOREIGN_LEADER_OFFSET_BOUND");
  if (engineBound !== null && copyBound !== null) {
    foreignCompared += 1;
    if (engineBound !== copyBound) {
      failures.push(`a foreign leader's offset bound: the engine holds LEADER_OFFSET_BOUND = ${engineBound} but the dossier prints FOREIGN_LEADER_OFFSET_BOUND = ${copyBound}.`);
    }
  }
}
for (const lean of FOREIGN_LEAN) {
  const engine = constant(foreignLeader, FOREIGN_LEADER_REL, lean.engineName);
  const printed = constant(copy, "attribute-consequence.ts", lean.copyName);
  if (engine === null || printed === null) continue;
  foreignCompared += 1;
  if (engine !== printed) {
    failures.push(`a foreign leader's ${lean.attribute}: the engine swings it at ${lean.engineName} = ${engine} but the dossier prints ${lean.copyName} = ${printed}.`);
  }
  // The lean is computed once for the seated leader and for the typical one
  // it is measured against, so the attribute arrives as a field of the shared
  // inputs rather than of the person; either spelling is the same reading.
  if (!new RegExp(`(?:person|input)\\.${lean.attribute}\\)\\s*\\*\\s*${lean.engineName}\\b`).test(foreignLeader)) {
    failures.push(`the engine's leader lean no longer reads ${lean.attribute} at ${lean.engineName} (foreign-leader.ts personalLean), and the dossier says it does.`);
  }
  const entry = copy.match(new RegExp(`\\n  ${lean.attribute}: \\{([\\s\\S]*?)\\n  \\},\\n`));
  const cell = entry?.[1].match(/"foreign-leader":\s*([^\n]*)/)?.[1] ?? "";
  if (!cell.includes(lean.copyName)) {
    failures.push(`the foreign-leader line for ${lean.attribute} does not print ${lean.copyName}, which is what their ${lean.attribute} moves their government by.`);
  }
}
for (const attribute of FOREIGN_UNREAD) {
  const entry = copy.match(new RegExp(`\\n  ${attribute}: \\{([\\s\\S]*?)\\n  \\},\\n`));
  const cell = entry?.[1].match(/"foreign-leader":\s*([^\n]*)/)?.[1] ?? "";
  foreignCompared += 1;
  if (!/FOREIGN_LEADER_TEMPERAMENT|NO_READER/.test(cell)) {
    failures.push(`the foreign-leader line for ${attribute} claims a reader, and the engine's leader lean does not read ${attribute}.`);
  }
}

/**
 * Every trait the schema allows has a consumer sentence.
 *
 * Reads the schema's own enum rather than trusting the copy's key list, so a
 * trait the dataset adds is caught here even though nothing in
 * `attribute-consequence.ts` changed at all.
 */
const schemaTraits = personSchema.match(/export const PersonTrait = z\.enum\(\[([\s\S]*?)\]\)/);
const traitNames = schemaTraits ? [...schemaTraits[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]) : null;
if (!traitNames || traitNames.length === 0) {
  failures.push("could not find PersonTrait's enum in packages/world/src/schemas/person.ts — update this gate, do not delete the check");
} else {
  const traitTable = copy.match(/export const TRAIT_EFFECT[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!traitTable) {
    failures.push("could not find TRAIT_EFFECT in attribute-consequence.ts");
  } else {
    for (const trait of traitNames) {
      const row = traitTable[1].match(new RegExp(`\\n  ${trait}:\\s*[\`"]([^\`"]|\\$\\{[^}]*\\})*[\`"]`));
      if (!row) failures.push(`PersonTrait includes "${trait}", and TRAIT_EFFECT in attribute-consequence.ts has no sentence for it.`);
    }
    const tableKeys = [...traitTable[1].matchAll(/\n  ([a-z-]+):\s*[`"]/g)].map((m) => m[1]);
    for (const key of tableKeys) {
      if (!traitNames.includes(key)) {
        failures.push(`TRAIT_EFFECT names "${key}", and PersonTrait's enum in person.ts no longer allows it.`);
      }
    }
  }
}

// A pair list that silently emptied would pass this gate while checking
// nothing, which is the failure mode this whole file exists to prevent.
const compared =
  PAIRS.filter((pair) => pair.engine !== null && pair.copy !== null).length +
  leaderPushes.length +
  scopeChecked +
  foreignCompared +
  (traitNames?.length ?? 0);
if (compared === 0) {
  failures.push("compared no constants at all — every extraction failed, so this run proved nothing");
}

if (failures.length) {
  console.error(
    `verify-person-consequence-alignment: ${failures.length} number(s) the dossier prints no longer match the engine:\n`,
  );
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\nIf the engine is right, update packages/player-core/src/dossier/attribute-consequence.ts — the sentences are " +
      "generated from those constants, so correcting the constant corrects the prose. If the copy is right, the " +
      "engine constant moved by accident and both need review before either ships.",
  );
  process.exit(1);
}

console.log(
  `verify-person-consequence-alignment: ${compared} constant(s) the dossier prints match the engine's current values`,
);
