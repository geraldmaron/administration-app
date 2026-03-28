"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferDefaultSourceKind = inferDefaultSourceKind;
exports.normalizeGenerationScopeInput = normalizeGenerationScopeInput;
const generation_contract_1 = require("../../../shared/generation-contract");
function inferDefaultSourceKind(mode) {
    return mode === 'news' ? 'news' : 'evergreen';
}
function normalizeGenerationScopeInput(input) {
    return (0, generation_contract_1.normalizeGenerationScope)(input);
}
//# sourceMappingURL=generation-scope.js.map