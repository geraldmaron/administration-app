"use strict";
// @deprecated — use CanonicalBranchType from canonicalBranchTypes.ts instead.
// This file is kept only for backward compatibility during migration.
// Do not add new uses of BranchId.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_BRANCH_IDS = exports.BRANCH_IDS = void 0;
exports.isValidBranchId = isValidBranchId;
exports.BRANCH_IDS = {
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
};
exports.ALL_BRANCH_IDS = Object.values(exports.BRANCH_IDS);
function isValidBranchId(id) {
    return Object.values(exports.BRANCH_IDS).includes(id);
}
//# sourceMappingURL=branchIds.js.map