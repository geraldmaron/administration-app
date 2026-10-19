import type { ClassificationLevel } from "@admin/engine";

/**
 * Lowest to highest. The engine models no compartments, so there is no
 * level above TOP SECRET here; a marking the simulation never assigned
 * would claim a sensitivity it does not have.
 */
export const CLASSIFICATION_ORDER: readonly ClassificationLevel[] = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"];

function rank(level: ClassificationLevel): number {
  return CLASSIFICATION_ORDER.indexOf(level);
}

/** The most restrictive level among those given; UNCLASSIFIED when none is marked. */
export function highestClassification(levels: Iterable<ClassificationLevel | undefined>): ClassificationLevel {
  let highest: ClassificationLevel = "UNCLASSIFIED";
  for (const level of levels) {
    if (level !== undefined && rank(level) > rank(highest)) highest = level;
  }
  return highest;
}

/** The words a banner line carries: the level itself, in capitals, as the government prints it. */
export function bannerWords(level: ClassificationLevel): string {
  return level;
}
