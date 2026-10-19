import {
  backgroundDrivers,
  roleProfileByRole,
  schoolById,
  type BackgroundDriver,
  type Person,
  type SchoolTier,
  type StudyField,
} from "@admin/world";
import { RECORD_ATTRIBUTE_KEYS, type RecordAttributeKey } from "./bio.js";
import { ASSESSMENT_LINES, BECAUSE_FRAMES, type AssessmentCell } from "./person-assessment-lines.js";
import { WORLD_PHRASE } from "./person-network-rules.js";
import { attributePositions, type AttributeKey } from "./bio.js";
import { hashIndex } from "./rng.js";

// What the player is actually asking when they open somebody's file before
// handing them a department.
//
// The five bars already say what the numbers are. This says what the numbers
// MEAN for this chair, which is a different question and the only one worth a
// paragraph: 0.32 loyalty is disqualifying in a chief of staff and unremarkable
// in an opposition leader, because the two seats are drawn from different
// windows. The reading here is always the person against the window their own
// seat is recruited from, never against a flat midpoint.
//
// That framing is also the fix for a contradiction this block used to print.
// The old version selected a strength on the band-relative yardstick and then
// captioned it with an absolute verdict word, so an opposition leader who was
// unusually loyal *for that chair* got "Strengths: Loyalty — Weak" beside
// "Weaknesses: Loyalty — Reads weak for this chair." One yardstick, and a
// sentence that states the comparison out loud, cannot produce that.
//
// Nothing here is stored. Every line is a pure function of the person's own
// record, the same discipline the long-form dossier works under: a save carries
// five numbers and a career, not five paragraphs per head, and an assessment
// can never drift out of agreement with the person it assesses.

export type AssessmentTone = "strength" | "risk";

export type PersonAssessmentItem = {
  readonly attribute: AttributeKey;
  /** "Competence", "Ambition" — the reading being spoken about. */
  readonly label: string;
  readonly tone: AssessmentTone;
  /** The chair-relative sentence. Never a bare grade. */
  readonly reading: string;
  /**
   * The fact behind it, where the record carries one — "Most of it is the long
   * run in the civil service." Empty only for a person whose whole background
   * moves this reading not at all, which the generator does not produce.
   */
  readonly because: string;
};

export type PersonAssessment = {
  readonly strengths: readonly PersonAssessmentItem[];
  readonly risks: readonly PersonAssessmentItem[];
};

const ATTRIBUTE_LABEL: Readonly<Record<AttributeKey, string>> = {
  competence: "Competence",
  loyalty: "Loyalty",
  integrity: "Integrity",
  charisma: "Charisma",
  ambition: "Ambition",
};

/**
 * Ambition is the one reading whose high side is the president's problem.
 *
 * The engine already believes this everywhere else: the dossier's standing
 * section calls anybody past 0.6 a rival, and a rival faction is where a
 * cabinet challenge comes from. A block that listed high ambition under
 * "strengths" would be telling the player the opposite of what the simulation
 * is about to do to them.
 */
const INVERTED: ReadonlySet<AttributeKey> = new Set(["ambition"]);

/**
 * How far from the middle of a seat's own window a reading has to land before
 * it is worth a sentence.
 *
 * Measured rather than guessed, over a full 5,400-person world cast: at 0.15
 * the median official has two readings worth saying something about and 0.7%
 * have none, which is the shape wanted — a page that flags everything flags
 * nothing, and one that flags a single attribute is the block this replaces.
 */
const MARGIN = 0.15;

/** At most two each way, so a file is a judgment rather than a character sheet. */
const PER_SIDE = 2;

// --- The fact behind the reading. -----------------------------------------

const TIER_PHRASE: Readonly<Record<SchoolTier, string>> = {
  "global-elite": "the name on the degree",
  "national-flagship": "the flagship university",
  regional: "a provincial university nobody outside it has heard of",
  "service-academy": "the academy",
};

const FIELD_PHRASE: Readonly<Record<StudyField, string>> = {
  law: "reading law",
  economics: "an economist's training",
  engineering: "an engineer's training",
  "military-science": "reading military science",
  medicine: "a medical training",
  "international-relations": "reading international relations",
  "public-administration": "reading public administration",
  journalism: "a journalist's training",
  theology: "reading theology",
  "natural-sciences": "a scientist's training",
};

/**
 * How long a run in one world reads out loud.
 *
 * A number would be more precise and less true: the record already lays the
 * spans out on the career rail beside this, and repeating "fourteen" in prose
 * adds a digit rather than a fact. What changes a person is whether the world
 * had them for a while or for a life.
 */
function spanPhrase(years: number): string {
  if (years >= 20) return "a career in";
  if (years >= 10) return "a long run in";
  if (years >= 5) return "a spell in";
  return "a short spell in";
}

/**
 * One driver said out loud. Exported so a gate can check that the clause a
 * dossier prints is a fact the person's own record holds, rather than trusting
 * that it is.
 */
export function driverPhrase(driver: BackgroundDriver): string {
  switch (driver.kind) {
    case "school":
      return TIER_PHRASE[driver.tier];
    case "field":
      return FIELD_PHRASE[driver.field];
    case "postgraduate":
      return "going back for the second degree";
    case "career":
      return `${spanPhrase(driver.years)} ${WORLD_PHRASE[driver.archetype]}`;
  }
}

/** What a driver is, for the purpose of not citing it twice on one file. */
function driverKey(driver: BackgroundDriver): string {
  return driver.kind === "career" ? `career:${driver.archetype}` : driver.kind;
}

/**
 * The largest thing in this life pushing this reading in the direction it
 * actually went, that this file has not already blamed something else on.
 *
 * Signed rather than absolute on purpose: naming the hardest push regardless of
 * direction would let a file say a person's integrity reads low *because of*
 * the decade in medicine that was pulling it the other way.
 *
 * `spent` is what keeps a file from reading as one sentence four times. A
 * career in business is the largest term in three of a governor's five
 * readings, so without it the block prints "a career in business" under
 * charisma, under ambition and under integrity, and a player learns nothing
 * from the second and third. Naming the next-largest honest cause instead says
 * more, and where the record has nothing else pushing that way the block states
 * the reading and stops rather than repeating itself.
 */
function reasonFor(
  person: Person,
  attribute: AttributeKey,
  high: boolean,
  spent: ReadonlySet<string>,
): BackgroundDriver | undefined {
  const tier = schoolById.get(person.education.school as string)?.tier;
  return backgroundDrivers(person.education, person.career, tier, attribute).find(
    (driver) => (high ? driver.weight > 0 : driver.weight < 0) && !spent.has(driverKey(driver)),
  );
}

function pick(person: Person, key: string, bank: readonly string[]): string {
  return bank[hashIndex(`${person.id as string}:${key}`, bank.length)]!;
}

function item(person: Person, attribute: AttributeKey, high: boolean, spent: Set<string>): PersonAssessmentItem {
  const cell: AssessmentCell = `${attribute}:${high ? "high" : "low"}`;
  // Loyalty gets no background reason, and this is the only attribute that
  // does not. The other four are facts of a life — a decade in medicine, a
  // career in business — and they do not move once the person exists. Loyalty
  // is a number the President moves during play, so blaming today's reading on
  // a career in the civil service tells the player their Secretary was always
  // like this, when what actually moved it was something this administration
  // did last month. Same rule the biography follows: the past is a record.
  const driver = RECORD_ATTRIBUTE_KEYS.includes(attribute as RecordAttributeKey)
    ? reasonFor(person, attribute, high, spent)
    : undefined;
  if (driver) spent.add(driverKey(driver));
  return {
    attribute,
    label: ATTRIBUTE_LABEL[attribute],
    tone: INVERTED.has(attribute) === high ? "risk" : "strength",
    reading: pick(person, `reading:${cell}`, ASSESSMENT_LINES[cell]),
    because: driver ? pick(person, `because:${attribute}`, BECAUSE_FRAMES).replace("{fact}", driverPhrase(driver)) : "",
  };
}

/**
 * What is unusual about this person for the chair they are being weighed for,
 * and which way it cuts.
 *
 * `role` is passed rather than read off the person because it is the seat being
 * weighed: a candidate is measured against the chair they do not yet hold, and
 * their own eligibility is the honest fallback.
 */
export function personAssessment(person: Person, role?: string): PersonAssessment {
  const seat = role ?? (person.eligibleRoles[0] as string | undefined);
  const ranges = seat === undefined ? undefined : roleProfileByRole.get(seat)?.attributes;
  const positions = attributePositions(person, ranges);

  const ranked = [...positions]
    .map(([attribute, position]) => ({ attribute, position, deviation: Math.abs(position - 0.5) }))
    .sort((a, b) => b.deviation - a.deviation);

  // A person whose whole record sits inside the margin still gets the one
  // sentence their most unusual reading earns. Saying nothing at all about
  // somebody the player is about to seat is the failure mode this block exists
  // to fix, and an empty block reads as a bug rather than as a judgment.
  const notable = ranked.filter((entry) => entry.deviation >= MARGIN);
  const speaking = notable.length > 0 ? notable : ranked.slice(0, 1);

  const strengths: PersonAssessmentItem[] = [];
  const risks: PersonAssessmentItem[] = [];
  // Walked hardest-reading first, so where two readings share a cause the
  // larger of them gets to name it and the smaller finds its own.
  const spent = new Set<string>();
  for (const entry of speaking) {
    const high = entry.position >= 0.5;
    const side = INVERTED.has(entry.attribute) === high ? risks : strengths;
    if (side.length >= PER_SIDE) continue;
    side.push(item(person, entry.attribute, high, spent));
  }
  return { strengths, risks };
}
