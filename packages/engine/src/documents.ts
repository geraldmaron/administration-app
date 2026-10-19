/**
 * Document classification and family — shared game-domain types.
 * Lives in engine (not contracts) so the dependency-direction rule holds:
 * engine may only depend on world.
 *
 * Pruned to the families a reached caller actually stamps: the digest's daily
 * brief, and the decision memo `DecisionBrief.tsx` marks. The wider set this
 * file once declared (cables, sitreps, options papers, bills, court opinions
 * and the rest) had no producer anywhere in the app — seventeen families
 * exercised only by this file's own test — which is the "exported, tested,
 * called by nobody" defect the wave's law calls out by name. A family comes
 * back the day a second document type is actually composed and rendered.
 */

export type ClassificationLevel = "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET" | "TOP SECRET";

export type DocumentFamily = "presidential-daily-brief" | "presidential-decision-memo";

/** Scenario severity band — mirrors `@admin/content` without importing it. */
export type ScenarioSeverity = "routine" | "serious" | "critical";

const SEVERITY_CLASSIFICATION: Readonly<Record<ScenarioSeverity, ClassificationLevel>> = {
  routine: "UNCLASSIFIED",
  serious: "CONFIDENTIAL",
  critical: "SECRET",
};

const SECRET_FAMILIES = new Set<DocumentFamily>(["presidential-daily-brief"]);

const CONFIDENTIAL_FAMILIES = new Set<DocumentFamily>(["presidential-decision-memo"]);

export function classificationForSeverity(severity: ScenarioSeverity): ClassificationLevel {
  return SEVERITY_CLASSIFICATION[severity];
}

export function defaultClassificationForFamily(family: DocumentFamily): ClassificationLevel {
  if (SECRET_FAMILIES.has(family)) return "SECRET";
  if (CONFIDENTIAL_FAMILIES.has(family)) return "CONFIDENTIAL";
  return "CONFIDENTIAL";
}

/**
 * What a marking asks of the reader.
 *
 * A classification with no handling instruction is a costume: it colors a strip
 * and tells the reader nothing they can act on. Every level carries its own
 * line, so a banner can never be drawn without saying why it is there.
 */
const CLASSIFICATION_HELPER: Readonly<Record<ClassificationLevel, string>> = {
  UNCLASSIFIED: "Public record. Anyone may read this.",
  CONFIDENTIAL: "Share only with those who need to know.",
  SECRET: "This one does not leave the room.",
  "TOP SECRET": "Named readers only. Repeating it is itself a breach.",
};

export function classificationHelper(level: ClassificationLevel): string {
  return CLASSIFICATION_HELPER[level];
}

/**
 * Handling caveats — the second half of a real marking line.
 *
 * The level says how much damage disclosure does; the caveat says who may hold
 * it and what state it is in. They are separate facts and a document can carry
 * both, which is why the banner prints `SECRET // NOFORN` rather than inventing
 * a fifth level for every combination.
 */
export type HandlingCaveat = "PRE-DECISIONAL" | "NOFORN" | "ORCON" | "DELIBERATIVE" | "CLOSE HOLD";

const FAMILY_CAVEATS: Readonly<Partial<Record<DocumentFamily, readonly HandlingCaveat[]>>> = {
  "presidential-decision-memo": ["PRE-DECISIONAL", "CLOSE HOLD"],
  "presidential-daily-brief": ["NOFORN", "ORCON"],
};

/**
 * What a document is called on its own cover sheet — the words the reader sees
 * where the family is a code the app uses internally.
 */
const FAMILY_LABEL: Readonly<Record<DocumentFamily, string>> = {
  "presidential-daily-brief": "Presidential daily brief",
  "presidential-decision-memo": "Decision memorandum",
};

export function documentFamilyLabel(family: DocumentFamily): string {
  return FAMILY_LABEL[family];
}

/** The finished marking a surface draws: level, why, and the caveat line. */
export type DocumentMarking = {
  readonly family: DocumentFamily;
  readonly level: ClassificationLevel;
  readonly helper: string;
  readonly caveats: readonly HandlingCaveat[];
  /** `SECRET // NOFORN // ORCON` — the line as it is actually stamped. */
  readonly line: string;
};

export type DocumentMarkingInput = {
  readonly family: DocumentFamily;
  /**
   * The week's own severity, where the document's sensitivity *is* the week's.
   *
   * It decides the level outright rather than raising the family default,
   * because the two answer different questions and the caller passing it is
   * asserting which one applies. A decision memo is a standing family of paper
   * the executive produces constantly; what makes one copy sensitive is the
   * week it is about, and a routine week is not a secret. Raising instead of
   * replacing would have marked every memo the player ever opens, which is how
   * a marking becomes wallpaper.
   */
  readonly severity?: ScenarioSeverity;
  /**
   * The document has been issued, filed, or published. A draft executive order
   * is pre-decisional working paper; the same order once signed is published in
   * the Federal Register and anyone may read it. Release is the single largest
   * mover of a marking, and it is a state the game already tracks — which is
   * what keeps the marking a fact about the document rather than a decoration
   * fixed to its type.
   */
  readonly released?: boolean;
};

/**
 * The one derivation of a document's marking.
 *
 * Deriving it here rather than per surface is what stops the inbox and the
 * document it opens from disagreeing about how closely the same paper is held.
 */
export function documentMarking({ family, severity, released }: DocumentMarkingInput): DocumentMarking {
  const base = severity === undefined ? defaultClassificationForFamily(family) : classificationForSeverity(severity);
  const level = released ? "UNCLASSIFIED" : base;
  // A released document has nothing left to caveat: pre-decisional stops being
  // true the moment the decision is made, and there is no foreign-disclosure
  // rule on a thing that has been published.
  const caveats = released ? [] : (FAMILY_CAVEATS[family] ?? []);
  return {
    family,
    level,
    helper: classificationHelper(level),
    caveats,
    line: [level, ...caveats].join(" // "),
  };
}
