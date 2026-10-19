import {
  confidenceFromEvidence,
  chamberMajority,
  selectHillMember,
  type Campaign,
  type Chamber,
  type Confidence,
  type HillCaucus,
  type HillMember,
  type HillPostId,
  type UsMajorParty,
} from "@admin/engine";
import { attributeVerdict, loyaltyWord, stanceForRatio, type MetricStance } from "../format/figures";

// How the President reads the people and the chambers around them: as a band
// and a confidence rather than a figure. Nothing in the office hands a
// president a secretary's loyalty as a number, so the word is the reading and
// the confidence says how much of it has been seen at work.

export type JudgedAttribute = "loyalty" | "competence" | "integrity" | "charisma";

export type AttributeJudgment = {
  readonly attribute: JudgedAttribute;
  readonly label: string;
  readonly word: string;
  readonly stance: MetricStance;
  /** Which of the four bands the reading falls in, lowest 0 to highest 3, for a mark that draws the band and not the figure. */
  readonly band: 0 | 1 | 2 | 3;
  readonly confidence: Confidence;
  /** What the confidence rests on, in the words a card prints beside it. */
  readonly basis: string;
};

const LABEL: Readonly<Record<JudgedAttribute, string>> = {
  loyalty: "Loyalty",
  competence: "Competence",
  integrity: "Integrity",
  charisma: "Charisma",
};

// Loyalty is the least observable of the three original readings, so a read
// from reputation alone starts low; competence has a public record behind it
// and starts moderate. Charisma is public by nature — a debate stage, a
// interview, a stump speech — so it starts at the same prior as competence.
// Each contested call they advised on is the President watching them work,
// and it firms the loyalty read fastest because that is where a loyalty shows;
// charisma earns nothing from a contested call, since advising in a closed
// room is not the venue charisma is read in.
const EVIDENCE_PRIOR: Readonly<Record<JudgedAttribute, number>> = { loyalty: 0.25, competence: 0.5, integrity: 0.35, charisma: 0.5 };
const EVIDENCE_PER_CALL: Readonly<Record<JudgedAttribute, number>> = { loyalty: 0.12, competence: 0.06, integrity: 0.06, charisma: 0 };

const BAND_OF: Readonly<Record<MetricStance, 0 | 1 | 2 | 3>> = { adverse: 0, caution: 1, neutral: 2, favorable: 3 };

function basisFor(calls: number): string {
  if (calls === 0) return "from their record alone";
  return `from ${calls} contested ${calls === 1 ? "call" : "calls"}`;
}

/**
 * One person's reading as a band and a confidence.
 *
 * `contestedCalls` is how many contested decisions they have advised the
 * President on: none for a nominee or a newly seated secretary.
 */
export function judgeAttribute(attribute: JudgedAttribute, value: number, contestedCalls = 0): AttributeJudgment {
  const stance = stanceForRatio(value);
  const calls = Math.max(0, Math.floor(contestedCalls));
  const evidence = Math.min(1, EVIDENCE_PRIOR[attribute] + EVIDENCE_PER_CALL[attribute] * calls);
  return {
    attribute,
    label: LABEL[attribute],
    word: attribute === "loyalty" ? loyaltyWord(stance) : attributeVerdict(value),
    stance,
    band: BAND_OF[stance],
    confidence: confidenceFromEvidence(evidence),
    basis: basisFor(calls),
  };
}

// --- Who holds each chamber -------------------------------------------------

export type ChamberControl = {
  readonly chamber: Chamber;
  /** The party whose caucus holds the majority. Independents caucus with the Democrats. */
  readonly party: UsMajorParty;
  readonly caucus: HillCaucus;
  /** The major party the administration caucuses with: its own, or the nearest for an Independent President. */
  readonly anchor: UsMajorParty;
  /** The majority's floor leader: the Speaker in the House, the Majority Leader in the Senate. */
  readonly leader?: HillMember;
};

const MAJORITY_POST: Readonly<Record<Chamber, HillPostId>> = {
  house: "post-house-speaker",
  senate: "post-senate-majority-leader",
};

/** Which party holds a chamber and who leads its floor, counted the way the engine counts control. */
export function chamberControl(campaign: Campaign, chamber: Chamber): ChamberControl {
  const anchor = campaign.congress.caucusAnchor;
  const caucus = chamberMajority(campaign.congress, chamber);
  const party: UsMajorParty = caucus === "administration" ? anchor : anchor === "democrat" ? "republican" : "democrat";
  const leader = selectHillMember(campaign, MAJORITY_POST[chamber]);
  return { chamber, party, caucus, anchor, ...(leader ? { leader } : {}) };
}
