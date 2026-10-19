import { type IdeologyVector, type PersonTrait } from "@admin/world";

export const GOVERNING_STYLES = ["pragmatic", "principled", "cautious", "hawkish", "dovish"] as const satisfies readonly PersonTrait[];
export type GoverningStyle = (typeof GOVERNING_STYLES)[number];

export type LeadershipAnswers = {
  /**
   * 1: every answer one of three steps, -1, 0 or +1. 2: an answer may sit
   * anywhere between -1 and +1, because a placement on a scale, a split of
   * effort or a ranking says how far, not only which way.
   */
  readonly version: 1 | 2;
  /** Four answers per dimension: economics, authority, internationalism, force, compromise. */
  readonly values: readonly number[];
};

export function validLeadershipAnswers(answers: LeadershipAnswers): boolean {
  const inRange = (value: number) => Number.isFinite(value) && value >= -1 && value <= 1;
  const stepped = (value: number) => Number.isInteger(value) && inRange(value);
  if (answers.values.length !== 20) return false;
  if (answers.version === 1) return answers.values.every(stepped);
  return answers.version === 2 && answers.values.every(inRange);
}

export function scoreLeadershipAnswers(answers: LeadershipAnswers): { readonly ideology: IdeologyVector; readonly style: GoverningStyle; readonly force: number; readonly compromise: number } {
  if (!validLeadershipAnswers(answers)) throw new Error("Answer all 20 leadership questions before using this profile.");
  const dimension = (start: number) => answers.values.slice(start, start + 4).reduce((sum, value) => sum + value, 0) / 4;
  const force = dimension(12);
  const compromise = dimension(16);
  const style = force >= 0.5 ? "hawkish" : force <= -0.5 ? "dovish" : compromise <= -0.5 ? "principled" : compromise >= 0.5 ? "pragmatic" : "cautious";
  return { ideology: { economicLeftRight: dimension(0), authLibertarian: dimension(4), nationalistGlobalist: dimension(8) }, style, force, compromise };
}

/** The stated approach takes priority over a conflicting career stereotype. */
export function withGoverningStyle(traits: readonly PersonTrait[], style: GoverningStyle | undefined): readonly PersonTrait[] {
  if (style === undefined) return traits;
  const opposite: Partial<Record<GoverningStyle, PersonTrait>> = { hawkish: "dovish", dovish: "hawkish", pragmatic: "principled", principled: "pragmatic" };
  return [...new Set([style, ...traits.filter((trait) => trait !== opposite[style])])].slice(0, 3);
}
