import {
  computeTagComboFingerprint,
  normalizeTagsForStorage,
  tagJaccardSimilarity,
  findTagOverlap,
} from '../lib/semantic-dedup';

describe('normalizeTagsForStorage', () => {
  test('lowercases, trims, dedupes, and sorts tag arrays', () => {
    const raw = ['Education', 'education', '  Student_Loans  ', 'Protest'];
    expect(normalizeTagsForStorage(raw)).toEqual(['education', 'protest', 'student_loans']);
  });

  test('drops empty and non-string entries safely', () => {
    const raw = ['', 'tag', '   ', null as unknown as string, undefined as unknown as string];
    expect(normalizeTagsForStorage(raw)).toEqual(['tag']);
  });
});

describe('computeTagComboFingerprint', () => {
  test('ignores the bundle-injected tag so order-independent combos match', () => {
    const a = computeTagComboFingerprint(['education', 'student_loans', 'protest'], 'education');
    const b = computeTagComboFingerprint(['protest', 'student_loans', 'education'], 'education');
    expect(a).toBe(b);
    expect(a).toBe('protest|student_loans');
  });

  test('takes at most the first 3 canonical tags (sorted)', () => {
    const fp = computeTagComboFingerprint(
      ['zebra', 'alpha', 'beta', 'gamma', 'delta'],
      'unrelated_bundle',
    );
    // After sort: alpha, beta, delta, gamma, zebra → top 3 = alpha|beta|delta
    expect(fp).toBe('alpha|beta|delta');
  });

  test('different combinations produce different fingerprints', () => {
    const a = computeTagComboFingerprint(['education', 'student_loans', 'protest'], 'education');
    const b = computeTagComboFingerprint(['education', 'inequality', 'protest'], 'education');
    expect(a).not.toBe(b);
  });
});

describe('tagJaccardSimilarity', () => {
  test('identical tag sets → 1.0', () => {
    expect(tagJaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeCloseTo(1.0);
  });

  test('disjoint tag sets → 0.0', () => {
    expect(tagJaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  test('2/3 overlap → 0.5 (|intersect| / |union|)', () => {
    // {a,b,c} ∩ {a,b,d} = {a,b} → 2; ∪ = {a,b,c,d} → 4
    expect(tagJaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'd'])).toBeCloseTo(0.5);
  });
});

describe('findTagOverlap', () => {
  test('rejects candidate whose Jaccard is ≥ threshold', () => {
    const existing = [
      ['education', 'student_loans', 'protest'],
      ['economy', 'inflation'],
    ];
    // {education, student_loans, protest} ∩ {education, protest, inequality} = {education, protest}
    // union = 4 → 0.5 — below default 0.6 threshold so NOT rejected
    expect(findTagOverlap(['education', 'protest', 'inequality'], existing)).toBe(-1);

    // Same as first entry → 1.0 → rejected at index 0
    expect(findTagOverlap(['education', 'student_loans', 'protest'], existing)).toBe(0);
  });

  test('handles empty candidate gracefully', () => {
    expect(findTagOverlap([], [['a']])).toBe(-1);
  });
});
