import { rankByFit, type LeaderDraft } from "@admin/engine";
import type { Person } from "@admin/world";
import { assessmentProfile, type AssessmentReading } from "../dossier/assessment-profile";
import type { MetricStance } from "../format/figures";

/** How well a candidate fits the President who would appoint them, in words a card can carry. */
export type BenchFitBand = "strong" | "good" | "fair" | "poor";

export type RankedCandidate = {
  readonly person: Person;
  /** 0..1, higher fits better: politics beside the President's and competence. Party is its own mark. */
  readonly fit: number;
  /** Read against the best fit on the same list, so it compares the names offered for one post. */
  readonly band: BenchFitBand;
  /** Of the other party, or of none while the President has one. */
  readonly crossesTheAisle: boolean;
};

/**
 * A bench ranked for the President choosing from it, best fit first.
 *
 * The ranking is the engine's own (`rankByFit`): the President's party first,
 * then the closest politics, then competence, with an Independent President
 * ranked on politics and competence alone. It is the same order the founding's
 * shortlists and its quick-oath defaults are drawn in, so a card can never
 * recommend somebody the seal would not have picked first. The band is read
 * against the best fit on the list passed in, so pass the list as shown.
 */
export function rankBench(
  candidates: readonly Person[],
  president: Pick<LeaderDraft, "party" | "ideology">,
): readonly RankedCandidate[] {
  return rankByFit(candidates, president).map(({ person, fit, band, crossesTheAisle }) => ({
    person,
    fit,
    band,
    crossesTheAisle,
  }));
}

/** Where a candidate reads a step or more away from the person already in the post. */
export type SeatedDifference = {
  readonly label: string;
  /** The candidate's own verdict word. */
  readonly word: string;
  readonly seatedWord: string;
  /** Signed: below zero, the candidate reads lower than the seated person. */
  readonly steps: number;
};

const STANCE_STEP: Readonly<Record<MetricStance, number>> = { adverse: 0, caution: 1, neutral: 2, favorable: 3 };

function gradedStep(reading: AssessmentReading): number | undefined {
  return reading.stance === undefined ? undefined : STANCE_STEP[reading.stance];
}

/**
 * The one graded reading where a candidate differs most from the person seated
 * in the post, in whole verdict steps, or nothing when every reading lands on
 * the same word. Ambition is a pressure rather than a grade, so it never leads.
 * This is what a card says beside the fit band, so two names the band calls
 * alike still show the player where they part.
 */
export function differenceFromSeated(candidate: Person, seated: Person): SeatedDifference | undefined {
  const theirs = assessmentProfile(seated).readings;
  const ranked = assessmentProfile(candidate)
    .readings.flatMap((reading, index) => {
      const own = gradedStep(reading);
      const other = theirs[index] === undefined ? undefined : gradedStep(theirs[index]);
      if (own === undefined || other === undefined || own === other) return [];
      return [{ reading, seated: theirs[index]!, steps: own - other }];
    })
    .sort((a, b) => Math.abs(b.steps) - Math.abs(a.steps) || Math.abs(b.reading.value - b.seated.value) - Math.abs(a.reading.value - a.seated.value));
  const lead = ranked[0];
  if (!lead) return undefined;
  return { label: lead.reading.label, word: lead.reading.word, seatedWord: lead.seated.word, steps: lead.steps };
}

/** "Loyalty: Weak (seated: Strong)", the line a shortlist card carries under its marks. */
export function seatedDifferenceLine(difference: SeatedDifference): string {
  return `${difference.label}: ${difference.word} (once in office: ${difference.seatedWord})`;
}
