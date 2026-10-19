import type { ClassificationLevel } from "@admin/engine";
/**
 * Lowest to highest. The engine models no compartments, so there is no
 * level above TOP SECRET here; a marking the simulation never assigned
 * would claim a sensitivity it does not have.
 */
export declare const CLASSIFICATION_ORDER: readonly ClassificationLevel[];
/** The most restrictive level among those given; UNCLASSIFIED when none is marked. */
export declare function highestClassification(levels: Iterable<ClassificationLevel | undefined>): ClassificationLevel;
/** The words a banner line carries: the level itself, in capitals, as the government prints it. */
export declare function bannerWords(level: ClassificationLevel): string;
