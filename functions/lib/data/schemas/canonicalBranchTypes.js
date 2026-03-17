"use strict";
// Canonical military branch role types — replaces US-centric BranchId enum.
// Each type represents a functional role, not a country-specific name.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CANONICAL_BRANCH_TYPES = exports.CANONICAL_BRANCH_TYPES = void 0;
exports.isValidCanonicalBranchType = isValidCanonicalBranchType;
exports.CANONICAL_BRANCH_TYPES = [
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
];
exports.ALL_CANONICAL_BRANCH_TYPES = exports.CANONICAL_BRANCH_TYPES;
function isValidCanonicalBranchType(id) {
    return exports.CANONICAL_BRANCH_TYPES.includes(id);
}
//# sourceMappingURL=canonicalBranchTypes.js.map