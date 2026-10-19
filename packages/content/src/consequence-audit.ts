import { INSTRUMENT_IDS, RISK_IDS, TREASURY_REFERENCE, consequenceFlag } from "@admin/engine";
import { CONSEQUENCE_COVERAGE_TARGET, CONSEQUENCE_FAILURE_HARM_FLOOR, MISSED_CHECK_MARKERS, phraseIn } from "./audit-lexicon.js";
import { NearDuplicateIndex } from "./corpus/near-duplicate.js";
import type { ConsequenceDef, ConsequenceRecipe, ConsequenceRungBand, ConsequenceValence } from "./consequence.js";
import { LENGTH_CEILINGS, LENGTH_TARGETS } from "./scenario-audit.js";
import { timeFindingsIn, type TimeFindingKind } from "./scenario-audit-time.js";
import {
  auditPassageLanguage,
  auditPassageNeutrality,
  type Passage,
  type PassageEmit,
  type PassageFindingKind,
  type PassageSeverity,
} from "./passage-audit.js";

// The gate an authored aftermath clears before it may ship. It runs the same
// language and world-neutrality family every scenario runs — a consequence is
// player copy like any other — and adds the rules that only make sense for a
// document whose whole job is to dress an outcome the resolver already decided.
//
// The coverage rules are the ones worth reading twice. A card pool is only a
// pool if the draw can always find something; a cell of the matrix with no
// unconditioned card in it is a cell where, on some campaign, the game has
// nothing to say about what just happened. That is not a writing smell, it is
// a hole in the floor, so it is an error over the corpus rather than a warning
// over one document.

export type ConsequenceFindingKind =
  | PassageFindingKind
  | "consequence-unknown-placeholder"
  | "unknown-risk-id"
  | "risk-affinity-off-failure"
  | "inert-consequence"
  | "costless-upside"
  | "valence-magnitude-inversion"
  | "consequence-flag-never-set"
  | "duplicate-consequence-id"
  | "coverage-cell-empty"
  | "coverage-cell-gated"
  | "coverage-cell-thin"
  | "reveal-cell-uncovered"
  | "reveal-without-the-check"
  | "template-overlap"
  | TimeFindingKind;

export type ConsequenceFinding = {
  readonly kind: ConsequenceFindingKind;
  readonly severity: PassageSeverity;
  /** The card the finding is about, or the matrix cell for a coverage rule. */
  readonly consequence: string;
  readonly message: string;
};

// A card names the two parties and nothing else. Everything the binder fills
// for a scenario — the charter's institutions, the counterpart's title — is
// deliberately out of reach, because a card speaks about an act, not a country.
const PLACEHOLDERS: readonly string[] = ["actor", "target"];

const RUNG_BANDS: readonly ConsequenceRungBand[] = ["low", "mid", "high"];
const VALENCES: readonly ConsequenceValence[] = ["success", "partial", "failure"];

function make(kind: ConsequenceFindingKind, severity: PassageSeverity, consequence: string, message: string): ConsequenceFinding {
  return { kind, severity, consequence, message };
}

/** Every line on a card. All of it is on screen the moment the act resolves. */
export function cardPassages(def: ConsequenceDef): readonly Passage[] {
  return [
    ...def.beats.map((text, index) => ({ label: `beat[${index}]`, text })),
    ...def.effects.flatMap((recipe, index) =>
      recipe.kind === "feed" ? [{ label: `headline[${index}]`, text: recipe.headline }] : [],
    ),
    ...(def.remembered ? [{ label: "remembered", text: def.remembered }] : []),
  ];
}

type LengthField = "beat" | "press" | "remembered";

function fieldFor(label: string): LengthField {
  if (label.startsWith("headline")) return "press";
  return label === "remembered" ? "remembered" : "beat";
}

function auditProse(def: ConsequenceDef, findings: ConsequenceFinding[]): void {
  const emit: PassageEmit<ConsequenceFindingKind> = (kind, severity, message) => findings.push(make(kind, severity, def.id, message));
  for (const passage of cardPassages(def)) {
    const field = fieldFor(passage.label);
    auditPassageLanguage(
      passage,
      {
        placeholders: PLACEHOLDERS,
        placeholderKind: "consequence-unknown-placeholder",
        numerals: true,
        ceiling: LENGTH_CEILINGS[field],
        target: LENGTH_TARGETS[field],
      },
      emit,
    );
    // A card is never a set-piece: it is drawn for whichever pair of nations
    // the act happened between, so it may never name one of them.
    auditPassageNeutrality(passage, {}, emit);
  }
}

// --- Mechanics ---------------------------------------------------------------

/**
 * What a card costs the player, on one scale. Treasury is divided by the
 * reference the metric layer scores it against, so a currency figure and a
 * zero-to-one score can be added without one of them dominating by accident.
 * Only harmful movement counts: a card that gives back does not get to net off
 * what it takes, because the two land on the player as separate news.
 */
function recipeHarm(recipe: ConsequenceRecipe): number {
  if (recipe.kind === "grudge") return recipe.weight;
  if (recipe.kind === "feed") return 0;
  if (recipe.kind === "metric") {
    const { treasury = 0, ...rest } = recipe.deltas;
    const scored = Object.values(rest).reduce((sum, delta) => sum + Math.max(0, -(delta ?? 0)), 0);
    return scored + Math.max(0, -treasury) / TREASURY_REFERENCE;
  }
  const { tension = 0, militaryThreat = 0, trust = 0, alignment = 0, tradeDependence = 0 } = recipe.deltas;
  const worsened = Math.max(0, tension) + Math.max(0, militaryThreat);
  return worsened + Math.max(0, -trust) + Math.max(0, -alignment) + Math.max(0, -tradeDependence);
}

export function consequenceHarm(def: ConsequenceDef): number {
  return def.effects.reduce((sum, recipe) => sum + recipeHarm(recipe), 0);
}

function auditMechanics(def: ConsequenceDef, findings: ConsequenceFinding[]): void {
  const error = (kind: ConsequenceFindingKind, message: string) => findings.push(make(kind, "error", def.id, message));

  for (const risk of def.riskAffinity ?? []) {
    if (!RISK_IDS[def.instrument].includes(risk)) {
      error("unknown-risk-id", `names the risk "${risk}", which the ${def.instrument} instrument has no branch for`);
    }
  }
  if (def.riskAffinity && def.valence !== "failure") {
    error(
      "risk-affinity-off-failure",
      `is a ${def.valence} card written for a named failure branch — an outcome that did not fail has no branch to match, so it could never be drawn`,
    );
  }
  if (def.effects.length === 0 && (def.sets ?? []).length === 0 && !def.remembered) {
    error("inert-consequence", "changes nothing: no effects, no flags, nothing remembered — aftermath that leaves no mark is not aftermath");
  }
  if (def.valence !== "failure") {
    // The sibling of the inert card: this one moves numbers, all of them the
    // player's way. An outcome that only gives is a victory lap, and a victory
    // lap has nothing for the next scene to pick up — so it has to leave the
    // room either poorer or changed.
    const costless = consequenceHarm(def) === 0 && (def.sets ?? []).length === 0 && !def.remembered;
    if (costless) {
      error(
        "costless-upside",
        `is a ${def.valence} card that costs nothing, sets no flag and is remembered by nobody — pure gain with no forward hook is a victory lap, not an outcome`,
      );
    }
    const floor = CONSEQUENCE_FAILURE_HARM_FLOOR[def.valence];
    const harm = consequenceHarm(def);
    if (harm > floor) {
      error(
        "valence-magnitude-inversion",
        `is a ${def.valence} card that takes ${harm.toFixed(3)} off the board, past the ${floor} at which a card reads as a failure — the player is told it worked while the numbers say otherwise`,
      );
    }
  }
}

/**
 * The third fairness rule of the unreliable briefing, as a refusal.
 *
 * A reveal card's job is not to announce that the game fooled the player. It is
 * to hand them the move they did not make — the attaché's report nobody asked
 * to see, the second overflight nobody ordered — so the next hedged briefing is
 * a decision instead of a coin flip. A reveal that only says "it was wrong"
 * teaches nothing, and doubt that teaches nothing is the noise this whole
 * mechanism was built to avoid; so it is an error, not a style note.
 */
function auditRevealNamesTheCheck(def: ConsequenceDef, findings: ConsequenceFinding[]): void {
  if (def.conditions?.intelFalse !== true) return;
  const named = def.beats.some((beat) => phraseIn(beat, MISSED_CHECK_MARKERS));
  if (named) return;
  findings.push(
    make(
      "reveal-without-the-check",
      "error",
      def.id,
      "is a reveal card that never names the check that would have caught it: it tells the player the briefing was wrong and leaves them no better at reading the next one",
    ),
  );
}

/**
 * A card is dealt the moment the act resolves, which is the moment the player
 * committed it, so every line on it is commit-time copy: "within three weeks
 * the agent stops answering" is on screen three weeks early.
 */
function auditCardTimeFraming(def: ConsequenceDef, findings: ConsequenceFinding[]): void {
  for (const finding of timeFindingsIn(cardPassages(def))) findings.push(make(finding.kind, finding.severity, def.id, finding.message));
}

export function auditConsequence(def: ConsequenceDef): ConsequenceFinding[] {
  const findings: ConsequenceFinding[] = [];
  auditRevealNamesTheCheck(def, findings);
  auditProse(def, findings);
  auditCardTimeFraming(def, findings);
  auditMechanics(def, findings);
  return findings;
}

// --- Corpus-level rules ------------------------------------------------------

/**
 * The corpus a batch lands in, mirroring the scenario audit's: indexes rather
 * than bodies, so validating against a large pool costs the batch's size.
 */
export type ConsequenceCorpusContext = {
  readonly installedIds?: Iterable<string>;
  readonly overlapIndex?: NearDuplicateIndex;
  /** The cards already shipped, which is what makes a batch's coverage the corpus's coverage. */
  readonly installed?: readonly ConsequenceDef[];
};

const cellKey = (instrument: string, band: ConsequenceRungBand, valence: ConsequenceValence) =>
  `${instrument}/${band}/${valence}`;

/** A card that will be there whatever the campaign looks like: nothing gates it and nothing spends it. */
function isGuaranteed(def: ConsequenceDef): boolean {
  return !def.conditions && !def.riskAffinity && def.once !== true;
}

function cardsInCell(defs: readonly ConsequenceDef[], instrument: string, band: ConsequenceRungBand, valence: ConsequenceValence) {
  return defs.filter((def) => def.instrument === instrument && def.valence === valence && def.rungBands.includes(band));
}

/** A card written for the briefing rather than the act: told only in the rare week the claim's truth is at stake. */
const isBriefingCard = (def: ConsequenceDef) => def.conditions?.intelFalse !== undefined;

/**
 * The floor has to be real in every cell of the matrix, not on average across
 * it. A cell with cards that are all conditioned is the subtler failure of the
 * two: it passes any count-based check and still leaves the draw empty on the
 * campaign where none of those conditions happen to hold.
 */
function auditCoverage(defs: readonly ConsequenceDef[], findings: ConsequenceFinding[]): void {
  for (const instrument of INSTRUMENT_IDS) {
    for (const band of RUNG_BANDS) {
      for (const valence of VALENCES) {
        const key = cellKey(instrument, band, valence);
        const cards = cardsInCell(defs, instrument, band, valence);
        if (cards.length === 0) {
          findings.push(make("coverage-cell-empty", "error", key, "has no card at all: the draw comes back empty and the outcome goes untold"));
          continue;
        }
        if (!cards.some(isGuaranteed)) {
          findings.push(
            make("coverage-cell-gated", "error", key, `has ${cards.length} card(s), every one of them conditioned or once-only — the floor is not guaranteed`),
          );
        }
        // Depth is counted over the cards that speak for an ordinary week. A
        // briefing card is drawn only in the rare week the claim's truth is at
        // stake, so it does nothing about the repetition this target measures
        // and must not be able to talk a thin cell out of saying so.
        const ordinary = cards.filter((def) => !isBriefingCard(def));
        if (ordinary.length < CONSEQUENCE_COVERAGE_TARGET) {
          findings.push(
            make("coverage-cell-thin", "warning", key, `has ${ordinary.length} of a target ${CONSEQUENCE_COVERAGE_TARGET}: write here next`),
          );
        }
      }
    }
  }
}

/**
 * The reveal's own floor, and the reason the marker is not decoration.
 *
 * A reveal is drawn out of one cell of the instrument by band by valence
 * matrix, exactly like every other card, which means a marked scenario whose
 * act happens to land in a cell holding no reveal can never be told its
 * briefing was false. That is the war-fixture failure in its most expensive
 * form: the scenario passes, the claim is drawn false, the campaign privately
 * holds that the yard was empty, and the player is told the strike worked and
 * nothing else. A writer cannot see it, because the scenario they wrote and the
 * pool that fails it are different documents.
 *
 * Every cell, including the success cells: the resolver does not know the
 * briefing was hollow and will happily rule that the act came off. An act that
 * succeeds on a false premise is the sharpest version of this mechanic, not an
 * exception to it, and the cell it lands in has to have something to say.
 */
function auditRevealCoverage(defs: readonly ConsequenceDef[], findings: ConsequenceFinding[]): void {
  for (const instrument of INSTRUMENT_IDS) {
    for (const band of RUNG_BANDS) {
      for (const valence of VALENCES) {
        const covered = cardsInCell(defs, instrument, band, valence).some((def) => def.conditions?.intelFalse === true);
        if (covered) continue;
        findings.push(
          make(
            "reveal-cell-uncovered",
            "error",
            cellKey(instrument, band, valence),
            "has no reveal card: an act that lands here on a briefing that turned out to be false can never be told so, and the marker on the scenario that sent it here is decoration",
          ),
        );
      }
    }
  }
}

/**
 * A card waiting on a flag nothing writes can never be drawn. Chain closure is
 * cross-corpus on purpose: the flag a card waits on is as likely to be stamped
 * by a scenario reply as by another card, so both vocabularies are asked.
 */
function auditFlagClosure(
  defs: readonly ConsequenceDef[],
  pool: readonly ConsequenceDef[],
  knownFlags: ReadonlySet<string>,
  findings: ConsequenceFinding[],
): void {
  const written = new Set([...pool.flatMap((def) => def.sets ?? []), ...pool.map((def) => consequenceFlag(def.id)), ...knownFlags]);
  for (const def of defs) {
    for (const flag of def.conditions?.flagsSet ?? []) {
      if (written.has(flag)) continue;
      findings.push(
        make("consequence-flag-never-set", "error", def.id, `waits on the flag "${flag}", which nothing here or in the content already installed ever sets`),
      );
    }
  }
}

/** A card's phrasing fingerprint: overlapping word triples across its prose, placeholders stripped. */
export function consequenceShingles(def: ConsequenceDef): ReadonlySet<string> {
  const words = cardPassages(def)
    .map((passage) => passage.text)
    .join(" ")
    .toLowerCase()
    .replace(/\{\{[^}]*\}\}/g, " ")
    .split(/[^a-z']+/)
    .filter(Boolean);
  return new Set(words.slice(0, Math.max(0, words.length - 2)).map((_, index) => words.slice(index, index + 3).join(" ")));
}

const OVERLAP_CEILING = 0.35;

/** Cards are only compared within their own cell — two failure cards for one instrument are the pair worth catching. */
const overlapBucket = (def: ConsequenceDef) => `${def.instrument}:${def.valence}`;

function auditTemplateOverlap(defs: readonly ConsequenceDef[], findings: ConsequenceFinding[], installed?: NearDuplicateIndex): void {
  const index = installed ?? new NearDuplicateIndex({ threshold: OVERLAP_CEILING });
  const reported = new Set<string>();
  for (const def of defs) {
    const print = consequenceShingles(def);
    for (const match of index.matches(def.id, overlapBucket(def), print)) {
      const pair = [def.id, match.otherId].sort().join(" ");
      if (reported.has(pair)) continue;
      reported.add(pair);
      findings.push(
        make(
          "template-overlap",
          "warning",
          def.id,
          `shares ${match.estimated ? "about " : ""}${Math.round(match.similarity * 100)}% of its phrasing with "${match.otherId}": one template wearing two hats`,
        ),
      );
    }
    index.add(def.id, overlapBucket(def), print);
  }
}

/**
 * Audit a whole batch. `knownFlags` is the governance memory the content
 * already installed can write, and `corpus.installed` the cards already
 * shipped — coverage is judged over the pool a player will actually draw from,
 * not over the batch in isolation.
 */
export function auditConsequences(
  defs: readonly ConsequenceDef[],
  knownFlags: readonly string[] = [],
  corpus: ConsequenceCorpusContext = {},
): ConsequenceFinding[] {
  const findings = defs.flatMap(auditConsequence);
  const seen = new Set<string>(corpus.installedIds ?? []);
  for (const def of defs) {
    if (seen.has(def.id)) findings.push(make("duplicate-consequence-id", "error", def.id, `consequence id "${def.id}" appears twice`));
    seen.add(def.id);
  }
  const pool = [...(corpus.installed ?? []), ...defs];
  auditCoverage(pool, findings);
  auditRevealCoverage(pool, findings);
  auditFlagClosure(defs, pool, new Set(knownFlags), findings);
  auditTemplateOverlap(defs, findings, corpus.overlapIndex);
  return findings;
}

/** Whether a set of findings is shippable: warnings inform, errors stop. */
export function consequenceAuditPasses(findings: readonly ConsequenceFinding[]): boolean {
  return findings.every((finding) => finding.severity !== "error");
}
