/**
 * The five readings on a person, assembled once for every surface that draws
 * them.
 *
 * There were three of these tables — one on the dossier, one on the cabinet
 * roster's readouts, one in the shortlist card — none importing from the
 * others, and two independent copies of the rule that picks the reading worth
 * naming first. Regrading an attribute in one propagated to none of them.
 *
 * The shape does one thing the three did not: it makes ambition's status
 * structural. A reading carries `kind`, and a pressure never carries a stance,
 * so a renderer cannot reach for a favorable or an adverse color on the one
 * reading the same screen calls ungraded two elements away. That was a live
 * defect — an amber caution chip on the ambition row — and it came back from a
 * boolean flag that a caller was free to reinterpret.
 *
 * No renderer import: the cabinet roster's own view model is a plain module
 * kept off the render graph so it can be unit tested, and it reads this.
 */
import type { AttributeKey } from "@admin/engine";
import { attributePositions } from "@admin/engine";
import { roleProfileByRole, type Person } from "@admin/world";
import { attributeVerdict, roleTitle, stanceForRatio, type MetricStance } from "../format/figures";
import { attributeConsequence, attributeIsRead, challengeMarkFor, type ConsequenceSubject } from "./attribute-consequence";

/**
 * A graded reading takes a stance: higher is better and the color says so. A
 * pressure never does. The simulation does not score ambition as good and does
 * not need to — it only ever costs, and only past the mark a challenge is
 * mounted at.
 */
export type ReadingKind = "graded" | "pressure";

export type AssessmentReading = {
  readonly key: AttributeKey;
  readonly label: string;
  /**
   * Two marks for five readings, on purpose. There is no conventional glyph
   * for "integrity," and five invented ones would be five marks a reader has
   * to learn before the name beside them tells them the same thing. The name
   * carries the identity; the mark says only which of the two kinds of reading
   * this is.
   */
  readonly mark: string;
  readonly kind: ReadingKind;
  /** 0..1 as stored, used only to size a bar — never printed as a figure. */
  readonly value: number;
  /**
   * Empty, on purpose. Nothing in the fiction of the office hands a president
   * a minister's loyalty, integrity, ambition, charisma or competence as a
   * number, so the trailing figure column stays blank and `word` carries the
   * whole reading (`scripts/verify-disclosure.mjs`).
   */
  readonly figure: string;
  /** The qualitative read. For a pressure this is a direction, never a verdict. */
  readonly word: string;
  /** Undefined whenever `kind` is "pressure". A caller must not compute one. */
  readonly stance?: MetricStance;
  /** Where this sits in the window the chair actually recruits from, 0..1. Undefined off-chair. */
  readonly position?: number;
  /** What this reading moves, for this subject, in the simulation. */
  readonly consequence: string;
};

/** The one reading worth naming first. Ambition is eligible; it is drawn as pressure, not as a fault. */
export type AssessmentWatch = {
  readonly key: AttributeKey;
  readonly label: string;
  readonly kind: ReadingKind;
  readonly line: string;
};

export type AssessmentProfile = {
  /** Always five, in the fixed order competence, loyalty, integrity, charisma, ambition. */
  readonly readings: readonly AssessmentReading[];
  readonly watch?: AssessmentWatch;
  /** The chair the readings were placed against, where the seat authors a window. */
  readonly seat?: string;
};

export type AssessmentOptions = {
  /** The seat id whose recruiting window places the readings — "role-treasury-minister". */
  readonly role?: string;
  /** Whose file this is. An officer unless the caller says otherwise. */
  readonly subject?: ConsequenceSubject;
  /** The charter's own titles, so the seat reads as the player's government names it. */
  readonly titles?: Readonly<Record<string, string>>;
};

/**
 * Declared as a full record rather than an array of keys so a sixth attribute
 * arriving in the simulation fails to compile here instead of quietly going
 * undrawn on every person surface.
 */
const ATTRIBUTE_LABEL: Readonly<Record<AttributeKey, string>> = {
  competence: "Competence",
  loyalty: "Loyalty",
  integrity: "Integrity",
  charisma: "Charisma",
  ambition: "Ambition",
};

const ATTRIBUTE_ORDER: readonly AttributeKey[] = ["competence", "loyalty", "integrity", "charisma", "ambition"];

const PRESSURE_KEYS: ReadonlySet<AttributeKey> = new Set<AttributeKey>(["ambition"]);

/**
 * Two marks for five readings. Keyed by kind rather than by attribute so a
 * sixth reading arriving in the simulation inherits a mark from what it is,
 * and nobody has to invent a glyph for it.
 */
const READING_MARK: Readonly<Record<ReadingKind, string>> = {
  graded: "graded",
  pressure: "pressure",
};

/** Above this, the worst reading is the thing a reader should be told first. */
export const WATCH_RISK_FLOOR = 0.6;

/**
 * Which readings can run against the administration at all, and which way.
 *
 * Competence is absent deliberately: a chair who is merely unremarkable at the
 * job is not the thing to lead a row with, and both of the rules this replaces
 * left it out for the same reason.
 */
const WATCHABLE: readonly AttributeKey[] = ["loyalty", "integrity", "charisma", "ambition"];

/** How far a reading runs against the administration. Ambition counts up; the rest count down. */
function riskOf(key: AttributeKey, value: number): number {
  return PRESSURE_KEYS.has(key) ? value : 1 - value;
}

// A tenth of the range short of the mark is close enough that a bad month of
// loyalty puts the chair over it, which is the fact worth flagging.
const PRESSURE_NEAR_BAND = 0.1;

/**
 * How ambition reads, as a distance from the mark rather than as a grade.
 *
 * The mark is the only thing ambition means: below it a chair who has lost
 * faith walks out, and past it they stay and build a following. Naming the
 * person's own mark — a charismatic chair's sits lower — says more than any
 * verdict word could, and says it without pretending there is a good half of
 * the range.
 */
function pressureWord(value: number, mark: number): string {
  if (value >= mark) return "Past the danger point";
  if (value >= mark - PRESSURE_NEAR_BAND) return "Near the danger point";
  return "Below the danger point";
}

function readingFor(
  key: AttributeKey,
  person: Person,
  subject: ConsequenceSubject,
  positions: ReadonlyMap<AttributeKey, number> | undefined,
): AssessmentReading {
  const value = person[key];
  const pressure = PRESSURE_KEYS.has(key);
  const kind: ReadingKind = pressure ? "pressure" : "graded";
  const position = positions?.get(key);
  return {
    key,
    label: ATTRIBUTE_LABEL[key],
    mark: READING_MARK[kind],
    kind,
    value,
    figure: "",
    word: pressure ? pressureWord(value, challengeMarkFor(person.traits)) : attributeVerdict(value),
    ...(pressure ? {} : { stance: stanceForRatio(value) }),
    ...(position === undefined ? {} : { position }),
    consequence: attributeConsequence(key, subject),
  };
}

/**
 * The sentence a row leads with when one reading is far enough out to be the
 * point. A pressure gets its own opening: "watch" is a word for a fault, and
 * ambition is not one.
 */
function watchLine(key: AttributeKey, label: string, consequence: string): string {
  const noun = label.toLowerCase();
  return PRESSURE_KEYS.has(key)
    ? `The trait that matters most here is ${noun}. ${consequence}`
    : `Watch their ${noun}. ${consequence}`;
}

// Only a trait the game reads for this chair: naming one it ignores would tell the President to plan around nothing.
function watchFor(readings: readonly AssessmentReading[], subject: ConsequenceSubject): AssessmentWatch | undefined {
  const candidates = readings.filter((reading) => WATCHABLE.includes(reading.key) && attributeIsRead(reading.key, subject));
  let worst: AssessmentReading | undefined;
  let worstRisk = -1;
  for (const reading of candidates) {
    const risk = riskOf(reading.key, reading.value);
    if (risk > worstRisk) {
      worst = reading;
      worstRisk = risk;
    }
  }
  if (!worst || worstRisk <= WATCH_RISK_FLOOR) return undefined;
  return {
    key: worst.key,
    label: worst.label,
    kind: worst.kind,
    line: watchLine(worst.key, worst.label, worst.consequence),
  };
}

/**
 * The five readings, the one worth naming first, and the chair they were
 * placed against.
 *
 * `role` is the seat id, not its title: the window a reading is placed in
 * belongs to the seat the person is being read for, and 0.32 loyalty is
 * disqualifying in a chief of staff and unremarkable in an opposition leader
 * because those two chairs recruit from different windows. A seat that authors
 * no window gets no `position` rather than a placement pretending to be one.
 */
export function assessmentProfile(person: Person, options?: AssessmentOptions): AssessmentProfile {
  const subject = options?.subject ?? "cabinet";
  const role = options?.role;
  const window = role === undefined ? undefined : roleProfileByRole.get(role)?.attributes;
  const positions = window ? attributePositions(person, window) : undefined;
  const readings = ATTRIBUTE_ORDER.map((key) => readingFor(key, person, subject, positions));
  const watch = watchFor(readings, subject);
  return {
    readings,
    ...(watch ? { watch } : {}),
    ...(window && role !== undefined ? { seat: roleTitle(role, options?.titles) } : {}),
  };
}
