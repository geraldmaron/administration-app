/**
 * Validates `scripts/lib/world-name-pools.ts` sizes expected by `scripts/seed-name-pools.ts` and iOS region pools.
 */

import { REGION_NAME_POOLS } from '../../../scripts/lib/world-name-pools';

const MIN_FIRST = 50;
const MIN_LAST = 40;

describe('REGION_NAME_POOLS', () => {
  it('has 10+ regions with minimum given-name and surname coverage per region', () => {
    const keys = Object.keys(REGION_NAME_POOLS);
    expect(keys.length).toBeGreaterThanOrEqual(10);
    for (const region of keys) {
      const pool = REGION_NAME_POOLS[region];
      expect(pool.first_male.length).toBeGreaterThanOrEqual(MIN_FIRST);
      expect(pool.first_female.length).toBeGreaterThanOrEqual(MIN_FIRST);
      expect(pool.first_neutral.length).toBeGreaterThanOrEqual(MIN_FIRST);
      expect(pool.last.length).toBeGreaterThanOrEqual(MIN_LAST);
    }
  });
});
