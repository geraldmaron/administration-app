// Canonical military branch role types — replaces US-centric BranchId enum.
// Each type represents a functional role, not a country-specific name.

export const CANONICAL_BRANCH_TYPES = [
  'ground_forces',
  'maritime',
  'air',
  'marines',
  'special_operations',
  'cyber',
  'space',
  'strategic_nuclear',
  'coast_guard',
  'reserve',
  'paramilitary',
  'intelligence_military',
] as const;

export type CanonicalBranchType = typeof CANONICAL_BRANCH_TYPES[number];
export const ALL_CANONICAL_BRANCH_TYPES: readonly CanonicalBranchType[] = CANONICAL_BRANCH_TYPES;

export function isValidCanonicalBranchType(id: string): id is CanonicalBranchType {
  return (CANONICAL_BRANCH_TYPES as readonly string[]).includes(id);
}
