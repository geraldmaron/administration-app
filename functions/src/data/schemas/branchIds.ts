// @deprecated — use CanonicalBranchType from canonicalBranchTypes.ts instead.
// This file is kept only for backward compatibility during migration.
// Do not add new uses of BranchId.

export const BRANCH_IDS = {
  ARMY: 'army',
  NAVY: 'navy',
  AIR_FORCE: 'air_force',
  MARINES: 'marines',
  SPECIAL_FORCES: 'special_forces',
  CYBER_COMMAND: 'cyber_command',
  SPACE_COMMAND: 'space_command',
  COAST_GUARD: 'coast_guard',
  NATIONAL_GUARD: 'national_guard',
  STRATEGIC_NUCLEAR: 'strategic_nuclear',
  INTELLIGENCE: 'intelligence',
} as const;

export type BranchId = (typeof BRANCH_IDS)[keyof typeof BRANCH_IDS];
export const ALL_BRANCH_IDS: readonly BranchId[] = Object.values(BRANCH_IDS);
export function isValidBranchId(id: string): id is BranchId {
  return Object.values(BRANCH_IDS).includes(id as BranchId);
}
