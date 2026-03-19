export type CountryCatalogSourceKind = 'firestore';

export interface CountryCatalogSourceMetadata {
    kind: CountryCatalogSourceKind;
    path: 'countries';
}

export interface CountryCatalogLoadResult<TCountry = Record<string, any>> {
    countries: Record<string, TCountry>;
    source: CountryCatalogSourceMetadata;
}

const COUNTRY_CATALOG_TTL_MS = 5 * 60 * 1000;

let _countryCatalogCache: CountryCatalogLoadResult | null = null;
let _countryCatalogFetchedAt = 0;

function mapCollectionSnapshot(snapshot: FirebaseFirestore.QuerySnapshot): Record<string, any> {
    if (snapshot.empty) return {};

    const countries: Record<string, any> = {};
    snapshot.forEach((doc) => {
        countries[doc.id] = doc.data();
    });
    return countries;
}

export function resolveCountryCatalog(countries: Record<string, any>): CountryCatalogLoadResult {
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

export async function loadCountryCatalog(
    db: FirebaseFirestore.Firestore,
    options: { forceRefresh?: boolean } = {}
): Promise<CountryCatalogLoadResult> {
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

export function findMissingCountryIds(
    countries: Record<string, any>,
    requestedCountryIds: readonly string[]
): string[] {
    return requestedCountryIds.filter((countryId) => !countries[countryId]);
}

export function assertRequestedCountryIdsAvailable(
    countries: Record<string, any>,
    requestedCountryIds: readonly string[],
    context: string = 'Country catalog validation'
): void {
    const missingIds = findMissingCountryIds(countries, requestedCountryIds);
    if (missingIds.length === 0) return;

    throw new Error(`[${context}] Missing requested country IDs: ${missingIds.join(', ')}`);
}

export function resetCountryCatalogCache(): void {
    _countryCatalogCache = null;
    _countryCatalogFetchedAt = 0;
}