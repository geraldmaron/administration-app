/**
 * Filters architect concepts at universal scope so we do not keep drafts that imply
 * foreign relationship tokens (ally/adversary/border_rival) — incompatible with universal
 * scenarios. Diplomacy bundle uses a narrower pattern set so domestic foreign-policy
 * framing (e.g. "adversarial tariffs", "bilateral sanctions debate") is not over-filtered.
 */

import type { BundleId } from '../data/schemas/bundleIds';

export type ConceptText = { concept: string; theme?: string };

/** Patterns that indicate explicit foreign-state / neighbor-actor framing (invalid at universal). */
function universalForeignActorPatterns(bundle: BundleId): RegExp[] {
  const core: RegExp[] = [
    /\bneighboring\s+(?:state|country|power|nation)\b/i,
    /\bneighbor\s+(?:state|country|power)\b/i,
    /border\s*rival/i,
    /\bforeign\s+power\b/i,
    /\ballied\s+nation\b/i,
    /\badversar(?:y|ies)\b/i,
    /\brival\s+nation\b/i,
    /\btrade\s+partner\b/i,
    /\bhostile\s+nation\b/i,
    /border\s*conflict/i,
    /cross[\s-]*border/i,
  ];
  if (bundle === 'diplomacy') {
    return core;
  }
  return [...core, /\bbilateral\b/i];
}

export function filterUniversalConceptsWithForeignRelationshipLanguage<T extends ConceptText>(
  concepts: T[],
  bundle: BundleId
): T[] {
  const patterns = universalForeignActorPatterns(bundle);
  return concepts.filter((c) => {
    const text = `${c.concept} ${c.theme ?? ''}`;
    const hasRelationship = patterns.some((p) => p.test(text));
    return !hasRelationship;
  });
}
