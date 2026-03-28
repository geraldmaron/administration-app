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
function mapCollectionSnapshot(snapshot) {
    if (snapshot.empty)
        return {};
    const countries = {};
    snapshot.forEach((doc) => {
        countries[doc.id] = doc.data();
    });
    return countries;
}
function resolveCountryCatalog(countries) {
    if (Object.keys(countries).length === 0) {
        throw new Error('[CountryCatalog] No country catalog found. Expected non-empty countries collection.');
    }
    return {
        countries,
        source: {
            kind: 'firestore',
            path: 'countries',
        },
    };
}
async function loadCountryCatalog(db, options = {}) {
    const now = Date.now();
    if (!options.forceRefresh && _countryCatalogCache && (now - _countryCatalogFetchedAt) < COUNTRY_CATALOG_TTL_MS) {
        return _countryCatalogCache;
    }
    const countriesSnap = await db.collection('countries').get();
    const countries = mapCollectionSnapshot(countriesSnap);
    const resolved = resolveCountryCatalog(countries);
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