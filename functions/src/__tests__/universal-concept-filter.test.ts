/**
 * Universal-scope concept filtering: must not strip valid diplomacy domestic-framing vocabulary.
 */

import { filterUniversalConceptsWithForeignRelationshipLanguage } from '../lib/universal-concept-filter';

describe('filterUniversalConceptsWithForeignRelationshipLanguage', () => {
  it('keeps diplomacy concepts with "adversarial" or "bilateral" (not adversary/adversaries)', () => {
    const concepts = [
      { concept: 'Cabinet split over adversarial tariff escalation', theme: 'trade' },
      { concept: 'Bilateral sanctions package debated in executive council', theme: 'sanctions' },
    ];
    const out = filterUniversalConceptsWithForeignRelationshipLanguage(concepts, 'diplomacy');
    expect(out).toHaveLength(2);
  });

  it('still removes explicit adversary / foreign-power framing for diplomacy', () => {
    const concepts = [
      { concept: 'Summit with a foreign power over hostage release', theme: 'crisis' },
      { concept: 'Border rival mobilizes troops', theme: 'military' },
    ];
    const out = filterUniversalConceptsWithForeignRelationshipLanguage(concepts, 'diplomacy');
    expect(out).toHaveLength(0);
  });

  it('for non-diplomacy bundles, still filters "bilateral"', () => {
    const concepts = [{ concept: 'Bilateral trade deal with neighboring state', theme: 'economy' }];
    const out = filterUniversalConceptsWithForeignRelationshipLanguage(concepts, 'economy');
    expect(out).toHaveLength(0);
  });
});
