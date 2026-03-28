"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRegionId = normalizeRegionId;
exports.normalizeRegionIds = normalizeRegionIds;
exports.normalizeCountryIds = normalizeCountryIds;
exports.inferDefaultSourceKind = inferDefaultSourceKind;
exports.inferScopeKey = inferScopeKey;
exports.normalizeGenerationScope = normalizeGenerationScope;
function slugify(value) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}
function normalizeRegionId(value) {
    if (!value)
        return undefined;
    const normalized = slugify(value);
    return normalized || undefined;
}
function normalizeRegionIds(values) {
    if (!(values === null || values === void 0 ? void 0 : values.length))
        return [];
    return [...new Set(values.map(normalizeRegionId).filter((value) => Boolean(value)))];
}
function normalizeCountryIds(values) {
    if (!(values === null || values === void 0 ? void 0 : values.length))
        return [];
    return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}
function inferDefaultSourceKind(mode) {
    return mode === 'news' ? 'news' : 'evergreen';
}
function inferScopeKey(scopeTier, options) {
    var _a, _b, _c, _d;
    const primaryRegion = (_a = normalizeRegionId(options.region)) !== null && _a !== void 0 ? _a : (_b = options.regions) === null || _b === void 0 ? void 0 : _b[0];
    switch (scopeTier) {
        case 'regional':
            return primaryRegion ? `region:${primaryRegion}` : undefined;
        case 'cluster':
            return ((_c = options.clusterId) === null || _c === void 0 ? void 0 : _c.trim()) ? `cluster:${options.clusterId.trim()}` : undefined;
        case 'exclusive':
            return ((_d = options.applicableCountries) === null || _d === void 0 ? void 0 : _d.length) === 1 ? `country:${options.applicableCountries[0]}` : undefined;
        default:
            return 'universal';
    }
}
function normalizeGenerationScope(input) {
    var _a, _b, _c, _d, _e;
    const scopeTier = (_a = input.scopeTier) !== null && _a !== void 0 ? _a : 'universal';
    const regions = normalizeRegionIds(((_b = input.regions) === null || _b === void 0 ? void 0 : _b.length) ? input.regions : input.region ? [input.region] : []);
    const applicableCountries = normalizeCountryIds(input.applicable_countries);
    const clusterId = ((_c = input.clusterId) === null || _c === void 0 ? void 0 : _c.trim()) || undefined;
    const explicitScopeKey = ((_d = input.scopeKey) === null || _d === void 0 ? void 0 : _d.trim()) || undefined;
    const sourceKind = (_e = input.sourceKind) !== null && _e !== void 0 ? _e : inferDefaultSourceKind(input.mode);
    if (scopeTier === 'regional' && regions.length === 0) {
        return { ok: false, error: 'Regional jobs require region or regions.' };
    }
    if (scopeTier === 'cluster' && !clusterId) {
        return { ok: false, error: 'Cluster jobs require clusterId.' };
    }
    if (scopeTier === 'exclusive') {
        if (!input.exclusivityReason) {
            return { ok: false, error: 'Exclusive jobs require exclusivityReason.' };
        }
        if (applicableCountries.length === 0) {
            return { ok: false, error: 'Exclusive jobs require applicable_countries.' };
        }
    }
    const scopeKey = explicitScopeKey !== null && explicitScopeKey !== void 0 ? explicitScopeKey : inferScopeKey(scopeTier, {
        region: input.region,
        regions,
        clusterId,
        applicableCountries,
    });
    if (!scopeKey) {
        return { ok: false, error: `Missing scopeKey for scope tier ${scopeTier}.` };
    }
    return {
        ok: true,
        value: Object.assign(Object.assign(Object.assign(Object.assign({ scopeTier,
            scopeKey }, (clusterId ? { clusterId } : {})), (input.exclusivityReason ? { exclusivityReason: input.exclusivityReason } : {})), (applicableCountries.length > 0 ? { applicable_countries: applicableCountries } : {})), { sourceKind,
            regions }),
    };
}
//# sourceMappingURL=generation-contract.js.map