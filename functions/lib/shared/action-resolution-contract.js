"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATROCITY_DELTA_BOUNDS = exports.TYG_DELTA_BOUNDS = exports.MILITARY_DELTA_BOUNDS = exports.DIPLOMATIC_DELTA_BOUNDS = void 0;
exports.DIPLOMATIC_DELTA_BOUNDS = {
    relationship: { min: -35, max: 20 },
    metric: { min: -10, max: 6 },
};
exports.MILITARY_DELTA_BOUNDS = {
    metric: { min: -50, max: 5 },
    targetMilitary: { min: -50, max: 0 },
    targetCyber: { min: -50, max: 0 },
};
exports.TYG_DELTA_BOUNDS = {
    metric: { min: -20, max: 5 },
    relationship: { min: -25, max: 10 },
};
exports.ATROCITY_DELTA_BOUNDS = {
    metric: { min: -50, max: 0 },
    relationship: { min: -50, max: 0 },
};
//# sourceMappingURL=action-resolution-contract.js.map