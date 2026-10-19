import { authorityByCite, type BuiltKey, type MetricStance, type ComparisonCell, type PipTone, type ShortlistCell } from "@admin/player-core";
import type { InkRole } from "@admin/ui";
import type { ReadTone } from "@admin/ui/dossier";

// How the executive's readings are drawn and said: the inks, the tones and
// the law each act on a chair rests on.

export type Quality = "good" | "watch" | "bad";

/** A 0..1 operating reading against the bands the legacy board drew: 60% holds, under 40% fails. */
export function qualityOf(value: number): Quality {
  return value >= 0.6 ? "good" : value >= 0.4 ? "watch" : "bad";
}

export const QUALITY_INK: Readonly<Record<Quality, InkRole>> = { good: "successInk", watch: "warningInk", bad: "danger" };
export const QUALITY_METER: Readonly<Record<Quality, "successInk" | "warningInk" | "danger">> = QUALITY_INK as Readonly<Record<Quality, "successInk" | "warningInk" | "danger">>;

export const BUILT_INK: Readonly<Record<BuiltKey, InkRole>> = { capacity: "color", staffing: "infoInk", budget: "gold", morale: "successInk", leader: "partyInd" };

const STANCE_TONE: Readonly<Record<MetricStance, ReadTone>> = { favorable: "good", neutral: "fair", caution: "watch", adverse: "bad" };

export function stanceTone(stance: MetricStance | undefined): ReadTone {
  return stance ? STANCE_TONE[stance] : "neutral";
}

export function pipTone(tone: PipTone): ReadTone {
  return tone;
}

/** A reading's tone: graded by its stance, ambition as pressure by its band. */
export function readingTone(reading: { readonly kind: "graded" | "pressure"; readonly stance?: MetricStance; readonly band: number }): ReadTone {
  if (reading.kind === "pressure") return reading.band >= 3 ? "pressure-past" : reading.band >= 2 ? "pressure-near" : "pressure-low";
  return stanceTone(reading.stance);
}

/**
 * The law each act on a chair or a person rests on (DECISIONS §8.12). A cabinet
 * secretary serves at the President's pleasure under the executive power; an
 * acting officer serves under the Vacancies Act; a nominee goes to the Senate
 * under the Appointments Clause; a Federal Reserve governor is removable only
 * for cause under the Federal Reserve Act; a request to a member of Congress
 * rests on the power to recommend measures.
 */
export const ACT_LAW = {
  nominate: "U.S. Const. art. II, §2, cl. 2",
  withdraw: "U.S. Const. art. II, §2, cl. 2",
  acting: "5 U.S.C. §§3345–3349d",
  dismiss: "U.S. Const. art. II, §1",
  direct: "U.S. Const. art. II, §1",
  remove: "U.S. Const. art. II, §1",
  removeFed: "12 U.S.C. §§241–242",
  outreach: "U.S. Const. art. II, §3",
  opinion: "U.S. Const. art. II, §2, cl. 1",
} as const;

export type ActLaw = keyof typeof ACT_LAW;

/** The citation and title an act's chip shows, from the registry record itself. */
export function actCitation(act: ActLaw): { readonly cite: string; readonly title: string } {
  const record = authorityByCite(ACT_LAW[act]);
  return { cite: ACT_LAW[act], title: record?.shortTitle ?? record?.title ?? ACT_LAW[act] };
}

/** Which statute governs removing the holder of an institution's chair. */
export function removalLaw(institution: string): ActLaw {
  if (institution === "INST-FED") return "removeFed";
  return "remove";
}

const BAND_WORDS = { slight: "Slight", moderate: "Moderate", major: "Major" } as const;

export type CellWords = { readonly text: string; readonly tone: "good" | "bad" | "neutral" };

/** One cell of a priced comparison, said in words with whether it helps. */
export function cellWords(cell: ShortlistCell | ComparisonCell | undefined): CellWords {
  if (!cell) return { text: "Not measured", tone: "neutral" };
  switch (cell.kind) {
    case "money":
      return { text: cell.text, tone: cell.amount < 0 ? "bad" : "good" };
    case "impact": {
      const verdict = cell.favorable === undefined ? "" : cell.favorable ? ", in your favor" : ", against you";
      return { text: `${BAND_WORDS[cell.impact.band]} ${cell.impact.direction === "up" ? "rise" : "fall"}${verdict}`, tone: cell.favorable === undefined ? "neutral" : cell.favorable ? "good" : "bad" };
    }
    case "chance":
    case "text":
    case "none":
      return { text: cell.text, tone: "neutral" };
    case "lines":
      return { text: cell.lines.join("; "), tone: "neutral" };
    case "counsel":
      return { text: `${cell.name}: ${cell.stance}`, tone: "neutral" };
    case "band":
      return { text: cell.judgment.word, tone: cell.judgment.stance === "favorable" ? "good" : cell.judgment.stance === "adverse" ? "bad" : "neutral" };
  }
}
