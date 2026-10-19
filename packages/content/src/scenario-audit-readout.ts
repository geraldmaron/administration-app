// The readout layer: the rules that keep a decision screen carrying data and
// plain sentences rather than atmosphere and essay.
//
// A scenario's `particulars` are the only authored figures the decision screen
// has. When they are missing, or written out in words, the scan grid falls
// back to what the engine can derive on its own — a sourcing tag and a
// relationship percentage — and the player reads a row of jargon instead of
// the facts of the case. That is a content defect wearing a presentation
// defect's clothes, so it is caught here rather than patched on the screen.
import type { ScenarioDef } from "./scenario.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";

export type ReadoutFindingKind =
  | "spelled-particular"
  | "hedged-particular"
  | "figureless-readout"
  | "essayistic-triad"
  | "essayistic-colon"
  | "place-as-actor"
  | "opaque-jargon";

/**
 * Cardinal counts, and only cardinal counts.
 *
 * "None" and "zero" are honest readings of an empty count and stay words —
 * "Arrests so far: None" is exactly right, and a "0" there would read as a
 * measurement rather than an absence. "Half" is a proportion a writer states
 * in prose ("half the cost"), not a count the grid should be rendering as a
 * numeral.
 */
const CARDINAL_WORD =
  "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|" +
  "seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|" +
  "million|billion|dozen)";

const HEDGE_WORD =
  "(?:over|about|around|roughly|nearly|almost|some|under|at least|at most|more than|fewer than|" +
  "less than|upwards of|close to|just over|just under|north of)";

/**
 * A value that *opens* with a spelled count.
 *
 * Anchored to the start on purpose. "Above the last one" carries the word
 * "one" as a pronoun and is not a figure written out; a rule that searched the
 * whole value would have demanded a numeral for it and taught writers to
 * distrust the gate.
 */
const LEADING_COUNT = new RegExp(`^\\s*(?:${HEDGE_WORD}\\s+)?${CARDINAL_WORD}(?:[-\\s]+${CARDINAL_WORD})*\\b`, "i");

/** A value that opens with a hedge, whether or not what follows is a numeral. */
const LEADING_HEDGE = new RegExp(`^\\s*${HEDGE_WORD}\\b`, "i");

const NUMERAL = /\d/;

/**
 * A particular's value writing its figure out in words.
 *
 * Player *prose* spells figures out — that is `numeral-in-prose`, and it is
 * right, because a person reading a briefing aloud says "twelve nights". A
 * particular is not prose. It is a labeled cell in a readout, sitting beside
 * two other cells, and the whole job of that grid is to be scannable at a
 * glance. "Days occupied: Twelve" makes the reader parse a word to recover a
 * number the cell existed to hand them.
 */
export function auditSpelledParticular(def: ScenarioDef, findings: FindingSink): void {
  for (const [index, particular] of (def.particulars ?? []).entries()) {
    const value = particular.value;
    if (NUMERAL.test(value)) {
      if (LEADING_HEDGE.test(value)) {
        findings.push({
          kind: "hedged-particular",
          severity: "warning",
          scenario: def.id,
          message:
            `particular[${index}] "${particular.label}" hedges its own figure: "${value}". ` +
            `A readout cell exists to state a number — give it the count, or a range, and let the prose carry the uncertainty`,
        });
      }
      continue;
    }
    if (!LEADING_COUNT.test(value)) continue;
    findings.push({
      kind: "spelled-particular",
      severity: "error",
      scenario: def.id,
      message:
        `particular[${index}] "${particular.label}" writes its figure in words: "${value}". ` +
        `Particulars are the decision screen's readout, not prose — write the numeral ("12", not "Twelve")`,
    });
  }
}

/**
 * A scenario that ships no figure at all.
 *
 * The scan grid draws three cells. Two of them are engine-derived — a sourcing
 * tag, a relationship reading — and neither is a fact about the case. When the
 * scenario contributes no numeral, those two are the entire readout, and the
 * player is asked to decide on a row that would read identically under any
 * other scenario in the corpus.
 */
export function auditFigurelessReadout(def: ScenarioDef, findings: FindingSink): void {
  const particulars = def.particulars ?? [];
  if (particulars.some((particular) => NUMERAL.test(particular.value))) return;
  if (def.conditions?.some((condition) => condition.kind === "collectionReport") &&
    particulars.some((particular) => /\{\{report(?:FindingCount|AgeDays)\}\}/.test(particular.value))) return;
  findings.push({
    kind: "figureless-readout",
    severity: "error",
    scenario: def.id,
    message:
      `no particular carries a figure, so the decision screen's readout has nothing of this case to draw and ` +
      `falls back to the sourcing tag and the relationship reading — the same two cells every other scenario shows. ` +
      `Give at least one particular a numeral: how many, how much, how long`,
  });
}

/** Every prose passage in a scenario's context block, labeled. */
function contextPassages(def: ScenarioDef): readonly { readonly label: string; readonly text: string }[] {
  const context = def.context;
  if (!context) return [];
  const passages: { readonly label: string; readonly text: string }[] = [];
  for (const key of ["standing", "precedent", "inaction", "unknown"] as const) {
    const text = context[key];
    if (typeof text === "string" && text.trim().length > 0) passages.push({ label: `context.${key}`, text });
  }
  for (const [index, pressure] of (context.pressures ?? []).entries()) {
    passages.push({ label: `context.pressures[${index}]`, text: pressure.want });
  }
  return passages;
}

/**
 * The colon that introduces three parallel clauses.
 *
 * "…the same lesson twice over: the operation is short, the photographs are
 * permanent, and the officers spend years answering." It is a machine's idea of
 * gravity — the same cadence every time, three beats and a summing "and" — and
 * once a reader notices it they see it everywhere. Nothing is lost by writing
 * the three as sentences, which is why this one is an error and the plain
 * essayistic colon below is not.
 */
const COLON_TRIAD = /[a-z]{3,}:\s+[^.!?]*?,[^.!?]*?,\s+and\s+/;

/** A colon joining two independent clauses mid-sentence. */
const COLON_CLAUSE = /[a-z]{3,}:\s+[a-z]/;

export function auditEssayisticColon(def: ScenarioDef, findings: FindingSink): void {
  for (const { label, text } of contextPassages(def)) {
    if (COLON_TRIAD.test(text)) {
      findings.push({
        kind: "essayistic-triad",
        severity: "error",
        scenario: def.id,
        message:
          `${label} builds the colon-then-three-clauses figure, which reads as generated prose rather than a person ` +
          `briefing a president. Break it into sentences: "${text.slice(0, 90)}…"`,
      });
      continue;
    }
    if (COLON_CLAUSE.test(text)) {
      findings.push({
        kind: "essayistic-colon",
        severity: "warning",
        scenario: def.id,
        message:
          `${label} joins two clauses with a colon. It is not wrong, but this corpus reaches for it constantly — ` +
          `check that a period would not read better: "${text.slice(0, 90)}…"`,
      });
    }
  }
}

/** Places, which do not employ anyone. */
const PLACE_NOUN =
  "plaza|square|street|road|camp|border|port|dock|bridge|highway|terminal|airport|compound|perimeter|" +
  "checkpoint|district|quarter|waterfront|ridge|valley|coast|corridor|crossing|runway|harbor";

/** People, who work for institutions. */
const ROLE_NOUN =
  "commanders?|officers?|generals?|ministers?|staff|troops|soldiers?|police|guards?|deputies|agents?|" +
  "inspectors?|prosecutors?|judges?|marshals?|crews?|wardens?";

const PLACE_AS_ACTOR = new RegExp(`\\b(?:the\\s+)?(${PLACE_NOUN})'s\\s+(${ROLE_NOUN})\\b`, "i");

/**
 * A place given a chain of command.
 *
 * "The plaza's commanders" reads as though the plaza were an organization that
 * employs officers. It does not. Somebody commands the officers *at* the plaza,
 * and which body that is — a police department, a guard, a federal service — is
 * exactly the fact the sentence is dodging. The possessive is how a draft
 * skips naming an institution it has not decided on.
 */
export function auditPlaceAsActor(def: ScenarioDef, findings: FindingSink): void {
  for (const { label, text } of contextPassages(def)) {
    const match = PLACE_AS_ACTOR.exec(text);
    if (!match) continue;
    findings.push({
      kind: "place-as-actor",
      severity: "error",
      scenario: def.id,
      message:
        `${label} writes "${match[0]}" — a ${match[1]!.toLowerCase()} does not command anyone. ` +
        `Name the body that does, or point at the people by where they are ("the officers on the ${match[1]!.toLowerCase()}")`,
    });
  }
}

/**
 * Compact operational nouns that hide the act inside them.
 *
 * "Night clearance" is three syllables standing in for sending officers to
 * remove sleeping people from a square in the dark. The compression is the
 * problem: a president reading "night clearance" has not been told what they
 * are authorizing, and the phrase exists because it is easier to write than
 * the sentence it replaces. Each entry names the plain words that do the work.
 */
const OPAQUE_JARGON: Readonly<Record<string, string>> = {
  "night clearance": "say what is actually done, and to whom, after dark",
  "night clearances": "say what is actually done, and to whom, after dark",
  "kinetic action": "say what is struck and with what",
  "kinetic operation": "say what is struck and with what",
  "population movement": "say who moves, and whether they chose to",
  "enhanced posture": "say what changes — more people, different orders, or both",
  "force posture adjustment": "say what changes — more people, different orders, or both",
  "lethal effect": "say who dies",
  "collateral effect": "say who was hit who was not the target",
  "regularization": "say what status the people gain, and what they had before",
  "consequence management": "say what is being cleaned up",
};

export function auditOpaqueJargon(def: ScenarioDef, findings: FindingSink): void {
  for (const { label, text } of contextPassages(def)) {
    const lowered = text.toLowerCase();
    for (const [phrase, remedy] of Object.entries(OPAQUE_JARGON)) {
      if (!lowered.includes(phrase)) continue;
      findings.push({
        kind: "opaque-jargon",
        severity: "warning",
        scenario: def.id,
        message: `${label} compresses the act into "${phrase}" — ${remedy}`,
      });
      break;
    }
  }
}

/** Every readout rule, in one call for the scenario gate to make. */
export function auditReadout(def: ScenarioDef, findings: FindingSink): void {
  auditSpelledParticular(def, findings);
  auditFigurelessReadout(def, findings);
  auditEssayisticColon(def, findings);
  auditPlaceAsActor(def, findings);
  auditOpaqueJargon(def, findings);
}
