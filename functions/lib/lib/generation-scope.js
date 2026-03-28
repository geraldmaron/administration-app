"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferDefaultSourceKind = inferDefaultSourceKind;
exports.normalizeGenerationScopeInput = normalizeGenerationScopeInput;
function inferDefaultSourceKind(mode) {
    return mode === 'news' ? 'news' : 'evergreen';
}
function inferScopeKey(scopeTier, options) {
    var _a, _b, _c;
    const primaryRegion = (_a = options.region) !== null && _a !== void 0 ? _a : (_b = options.regions) === null || _b === void 0 ? void 0 : _b[0];
    switch (scopeTier) {
        case 'regional':
            return primaryRegion ? `region:${primaryRegion}` : '';
        case 'cluster':
            return options.clusterId ? `cluster:${options.clusterId}` : '';
        case 'exclusive':
            return ((_c = options.applicableCountries) === null || _c === void 0 ? void 0 : _c.length) === 1 ? `country:${options.applicableCountries[0]}` : '';
        default:
            return 'universal';
    }
}
function normalizeGenerationScopeInput(input) {
    var _a, _b, _c, _d;
    const scopeTier = (_a = input.scopeTier) !== null && _a !== void 0 ? _a : 'universal';
    const sourceKind = (_b = input.sourceKind) !== null && _b !== void 0 ? _b : inferDefaultSourceKind(input.mode);
    const applicableCountries = Array.isArray(input.applicable_countries)
        ? [...new Set(input.applicable_countries
                .filter((countryId) => typeof countryId === 'string')
                .map((countryId) => countryId.trim())
                .filter((countryId) => countryId.length > 0))]
        : undefined;
    const regions = Array.isArray(input.regions)
        ? [...new Set(input.regions
                .filter((regionId) => typeof regionId === 'string')
                .map((regionId) => regionId.trim())
                .filter((regionId) => regionId.length > 0))]
        : ((_c = input.region) === null || _c === void 0 ? void 0 : _c.trim())
            ? [input.region.trim()]
            : [];
    if (scopeTier === 'regional' && regions.length === 0) {
        return { ok: false, error: 'Regional jobs require region or regions.' };
    }
    if (scopeTier === 'cluster' && !input.clusterId) {
        return { ok: false, error: 'Cluster jobs require clusterId.' };
    }
    if (scopeTier === 'exclusive') {
        if (!input.exclusivityReason) {
            return { ok: false, error: 'Exclusive jobs require exclusivityReason.' };
        }
        if (!(applicableCountries === null || applicableCountries === void 0 ? void 0 : applicableCountries.length)) {
            return { ok: false, error: 'Exclusive jobs require applicable_countries.' };
        }
    }
    const scopeKey = (_d = input.scopeKey) !== null && _d !== void 0 ? _d : inferScopeKey(scopeTier, {
        region: input.region,
        regions,
        clusterId: input.clusterId,
        applicableCountries,
    });
    if (!scopeKey) {
        return { ok: false, error: `Missing scopeKey for scope tier ${scopeTier}.` };
    }
    return {
        ok: true,
        value: {
            scopeTier,
            scopeKey,
            clusterId: input.clusterId,
            exclusivityReason: input.exclusivityReason,
            applicable_countries: applicableCountries,
            sourceKind,
            regions,
        },
    };
}
//# sourceMappingURL=generation-scope.js.map