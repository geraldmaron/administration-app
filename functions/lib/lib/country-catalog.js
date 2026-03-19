"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCountryCatalog = resolveCountryCatalog;
exports.loadCountryCatalog = loadCountryCatalog;
exports.findMissingCountryIds = findMissingCountryIds;
exports.assertRequestedCountryIdsAvailable = assertRequestedCountryIdsAvailable;
exports.resetCountryCatalogCache = resetCountryCatalogCache;
const COUNTRY_CATALOG_TTL_MS = 5 * 60 * 1000;
let _countryCatalogCache = null;
let _countryCatalogFetchedAt = 0;
function isNonEmptyRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}
function mapLegacySnapshot(snapshot) {
    if (snapshot.empty)
        return {};
    const countries = {};
    snapshot.forEach((doc) => {
        countries[doc.id] = doc.data();
    });
    return countries;
}
function resolveCountryCatalog(canonicalCountries, legacyCountries) {
    if (isNonEmptyRecord(canonicalCountries)) {
        return {
            countries: canonicalCountries,
            source: {
                kind: 'canonical',
                path: 'world_state/countries',
                usedFallback: false,
            },
        };
    }
    if (isNonEmptyRecord(legacyCountries)) {
        return {
            countries: legacyCountries,
            source: {
                kind: 'legacy-fallback',
                path: 'countries',
                usedFallback: true,
            },
        };
    }
    throw new Error('[CountryCatalog] No country catalog found. Expected non-empty world_state/countries or countries collection.');
}
async function loadCountryCatalog(db, options = {}) {
    const now = Date.now();
    if (!options.forceRefresh && _countryCatalogCache && (now - _countryCatalogFetchedAt) < COUNTRY_CATALOG_TTL_MS) {
        return _countryCatalogCache;
    }
    const [canonicalSnap, legacySnap] = await Promise.all([
        db.doc('world_state/countries').get(),
        db.collection('countries').get(),
    ]);
    const canonicalCountries = canonicalSnap.exists ? canonicalSnap.data() : undefined;
    const legacyCountries = mapLegacySnapshot(legacySnap);
    const resolved = resolveCountryCatalog(canonicalCountries, legacyCountries);
    _countryCatalogCache = resolved;
    _countryCatalogFetchedAt = now;
    return resolved;
}
function findMissingCountryIds(countries, requestedCountryIds) {
    return requestedCountryIds.filter((countryId) => !countries[countryId]);
}
function assertRequestedCountryIdsAvailable(countries, requestedCountryIds, context = 'Country catalog validation') {
    const missingIds = findMissingCountryIds(countries, requestedCountryIds);
    if (missingIds.length === 0)
        return;
    throw new Error(`[${context}] Missing requested country IDs: ${missingIds.join(', ')}`);
}
function resetCountryCatalogCache() {
    _countryCatalogCache = null;
    _countryCatalogFetchedAt = 0;
}
//# sourceMappingURL=country-catalog.js.map