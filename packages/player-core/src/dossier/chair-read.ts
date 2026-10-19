import type { AttributeKey } from "@admin/engine";
import type { Person } from "@admin/world";
import { loyaltyWord, type MetricStance } from "../format/figures";
import { assessmentProfile, type AssessmentReading } from "./assessment-profile";
import { attributeIsRead, type ConsequenceSubject } from "./attribute-consequence";

// One read of a chair's holder, for a roster that cannot spend five columns on
// every officer. Most officers read well on most things, so five columns of
// "Strong" are noise that hides the one officer who is not. The read leads
// with the reading that decides it, draws every reading the simulation uses as
// a pip, and keeps the reason for the opening of the explanation.
//
// It is a band, never a figure: nothing in the office hands a president an
// officer's loyalty as a number, and the read inherits that from the profile.

export type ReadTone = "good" | "watch" | "bad";

/** How one reading draws as a pip: graded readings by their band, ambition by where it sits against the mark. */
export type PipTone = "good" | "fair" | "watch" | "bad" | "pressure-low" | "pressure-near" | "pressure-past";

export type ReadPip = {
  readonly key: AttributeKey;
  readonly label: string;
  readonly word: string;
  readonly tone: PipTone;
  /** What this reading moves for an officer in the simulation. */
  readonly consequence: string;
};

export type ChairRead = {
  readonly tone: ReadTone;
  /** The read in a word or two: "Sound", "Loyalty soft". */
  readonly word: string;
  /** Why the read says what it does, in one sentence. */
  readonly reason: string;
  /** The readings the read is made of, in profile order: what decides whether a chair holds. */
  readonly pips: readonly ReadPip[];
  /** Readings on file that do not bear on whether the chair holds, said in the explanation only. */
  readonly others: readonly ReadPip[];
};

/**
 * What the read is made of. Each is a reading the simulation uses to decide
 * whether a chair holds: loyalty drives a leak, resignation or challenge,
 * integrity restrains an unhappy officer, ambition decides whether they break
 * as a resignation or a faction, and competence is the work. Charisma is left
 * out on purpose: for a serving officer it only sets what a dismissal costs.
 */
const COMPOSITE: ReadonlySet<AttributeKey> = new Set<AttributeKey>(["competence", "loyalty", "integrity", "ambition"]);

const GRADED_TONE: Readonly<Record<MetricStance, PipTone>> = { favorable: "good", neutral: "fair", caution: "watch", adverse: "bad" };

/** Which graded reading decides the read when two are equally far out: the one that walks out first, then the one that cannot deliver. */
const PRIORITY: readonly AttributeKey[] = ["loyalty", "competence", "integrity"];

function pipOf(reading: AssessmentReading): ReadPip {
  const base = { key: reading.key, label: reading.label, consequence: reading.consequence };
  if (reading.kind === "pressure") {
    const tone: PipTone = reading.word === "Past the danger point" ? "pressure-past" : reading.word === "Near the danger point" ? "pressure-near" : "pressure-low";
    return { ...base, word: reading.word, tone };
  }
  const stance = reading.stance ?? "neutral";
  // A secretary's loyalty reads in the roster's own words: whether they still answer to this President.
  const word = reading.key === "loyalty" ? loyaltyWord(stance) : reading.word;
  return { ...base, word, tone: GRADED_TONE[stance] };
}

function decidingPip(pips: readonly ReadPip[], tone: PipTone): ReadPip | undefined {
  return PRIORITY.map((key) => pips.find((pip) => pip.key === key && pip.tone === tone)).find((pip) => pip !== undefined);
}

/**
 * Why a low reading is the one that decides the read, in a sentence a popover
 * or a card can carry. Each restates what the reading's own consequence line
 * says it moves for an officer; the full line stays on the dossier.
 */
const LOW_REASON: Readonly<Partial<Record<AttributeKey, string>>> = {
  loyalty: "When loyalty is low, they may leak, resign, or turn on you.",
  competence: "Their department's work goes worse. That means worse odds on its tools, weaker programs, and a less accurate read of the odds when they advise you.",
  integrity: "Little would stop them if they turned against you. Integrity is what keeps an unhappy officer from leaking, resigning, or turning on you.",
};

/** Ambition only bites once loyalty slips, so past the mark it qualifies the read rather than leading it. */
function ambitionNote(pips: readonly ReadPip[]): string {
  const ambition = pips.find((pip) => pip.key === "ambition");
  if (ambition?.tone === "pressure-past") return " Their ambition is past the danger point. If they break with you, they'll start a rival faction instead of resigning.";
  if (ambition?.tone === "pressure-near") return " Their ambition is close to the point where they'd start a rival faction.";
  return "";
}

/** The read of one officer, from the one assessment every person surface draws. */
/** A deciding trait read as one phrase: "Integrity weak", but "Disloyal" alone, because the word already names the trait. */
function readWord(pip: { readonly label: string; readonly word: string }): string {
  const stem = pip.label.toLowerCase().slice(0, 4);
  return pip.word.toLowerCase().includes(stem) ? pip.word : `${pip.label} ${pip.word.toLowerCase()}`;
}

export function chairRead(person: Person, subject: ConsequenceSubject = "cabinet"): ChairRead {
  const read = assessmentProfile(person, { subject })
    .readings.filter((reading) => attributeIsRead(reading.key, subject))
    .map(pipOf);
  const pips = read.filter((pip) => COMPOSITE.has(pip.key));
  const others = read.filter((pip) => !COMPOSITE.has(pip.key));
  const note = ambitionNote(pips);
  const bad = decidingPip(pips, "bad");
  if (bad) return { tone: "bad", word: readWord(bad), reason: `${reasonFor(bad)}${note}`, pips, others };
  const watch = decidingPip(pips, "watch");
  if (watch) return { tone: "watch", word: readWord(watch), reason: `${reasonFor(watch)}${note}`, pips, others };
  return { tone: "good", word: "Sound", reason: `Loyal enough, capable enough, and honest enough that nothing here is working against you right now.${note}`, pips, others };
}

function reasonFor(pip: ReadPip): string {
  return LOW_REASON[pip.key] ?? pip.consequence;
}
