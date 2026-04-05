/**
 * Canonical region definitions for scenario targeting and filtering.
 *
 * Regions are used for:
 * - Scenario generation: target a region so themes feel geographically relevant
 * - Firestore metadata: region_tags written to generated scenarios
 * - ScenarioNavigator: filter eligible scenarios for the player's country
 *
 * Region strings here must match the `region` field stored on each country
 * document in the Firestore countries collection. The DISPLAY_REGIONS map is the canonical
 * source; REGION_LABEL is used for prompt injection and user-facing text.
 */

export const REGION_IDS = [
  'africa',
  'asia',
  'caribbean',
  'east_asia',
  'europe',
  'eurasia',
  'middle_east',
  'north_america',
  'oceania',
  'south_america',
  'south_asia',
  'southeast_asia',
] as const;

export type RegionId = typeof REGION_IDS[number];

// Maps REGION_IDS (snake_case) ↔ Firestore region strings (Title Case)
export const REGION_TO_DISPLAY: Record<RegionId, string> = {
  africa: 'Africa',
  asia: 'Asia',
  caribbean: 'Caribbean',
  east_asia: 'East Asia',
  europe: 'Europe',
  eurasia: 'Eurasia',
  middle_east: 'Middle East',
  north_america: 'North America',
  oceania: 'Oceania',
  south_america: 'South America',
  south_asia: 'South Asia',
  southeast_asia: 'Southeast Asia',
};

// Reverse map: Firestore region string → canonical RegionId
export const DISPLAY_TO_REGION: Record<string, RegionId> = Object.fromEntries(
  Object.entries(REGION_TO_DISPLAY).map(([id, display]) => [display, id as RegionId])
) as Record<string, RegionId>;

// Country ISO code → RegionId for all playable countries
export const COUNTRY_TO_REGION: Record<string, RegionId> = {
  au: 'oceania',
  br: 'south_america',
  ca: 'north_america',
  cn: 'east_asia',
  de: 'europe',
  fr: 'europe',
  gb: 'europe',
  gh: 'africa',
  il: 'middle_east',
  in: 'south_asia',
  ir: 'middle_east',
  jm: 'caribbean',
  jp: 'east_asia',
  kr: 'east_asia',
  mx: 'north_america',
  ng: 'africa',
  ru: 'eurasia',
  sa: 'middle_east',
  tr: 'eurasia',
  us: 'north_america',
  ua: 'europe',
  za: 'africa',
  id: 'southeast_asia',
  sg: 'southeast_asia',
  eg: 'africa',
};

/** Get the RegionId for a country ISO code. Returns undefined if unknown. */
export function getRegionForCountry(countryId: string): RegionId | undefined {
  return COUNTRY_TO_REGION[countryId.toLowerCase()];
}

/** Get the display name for a region (e.g. 'east_asia' → 'East Asia') */
export function getRegionDisplayName(regionId: RegionId): string {
  return REGION_TO_DISPLAY[regionId] ?? regionId;
}

/** Check whether a country belongs to a given region */
export function countryInRegion(countryId: string, regionId: RegionId): boolean {
  return COUNTRY_TO_REGION[countryId.toLowerCase()] === regionId;
}

/** Normalize a region string from Firestore to a canonical RegionId */
export function normalizeRegion(regionStr: string): RegionId | undefined {
  return DISPLAY_TO_REGION[regionStr] as RegionId | undefined;
}
