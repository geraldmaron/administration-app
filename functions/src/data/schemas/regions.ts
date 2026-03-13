/**
 * Canonical region definitions for scenario targeting and filtering.
 *
 * Regions are used for:
 * - Scenario generation: target a region so themes feel geographically relevant
 * - Firestore metadata: region_tags written to generated scenarios
 * - ScenarioNavigator: filter eligible scenarios for the player's country
 *
 * Region strings here must match the `region` field stored on each country
 * document in world_state/countries. The DISPLAY_REGIONS map is the canonical
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

// Country ISO code → RegionId for all 80 playable countries
export const COUNTRY_TO_REGION: Record<string, RegionId> = {
  ae: 'middle_east',
  ar: 'south_america',
  at: 'europe',
  au: 'oceania',
  bb: 'caribbean',
  bd: 'south_asia',
  be: 'europe',
  bo: 'south_america',
  br: 'south_america',
  bs: 'caribbean',
  ca: 'north_america',
  ch: 'europe',
  cl: 'south_america',
  cm: 'africa',
  cn: 'east_asia',
  co: 'south_america',
  cr: 'north_america',
  cu: 'caribbean',
  cz: 'europe',
  de: 'europe',
  do: 'caribbean',
  dz: 'africa',
  ec: 'south_america',
  eg: 'africa',
  es: 'europe',
  et: 'africa',
  fj: 'oceania',
  fr: 'europe',
  gb: 'europe',
  gh: 'africa',
  gr: 'europe',
  ht: 'caribbean',
  hu: 'europe',
  id: 'southeast_asia',
  ie: 'europe',
  il: 'middle_east',
  in: 'south_asia',
  iq: 'middle_east',
  ir: 'middle_east',
  it: 'europe',
  jm: 'caribbean',
  jp: 'east_asia',
  ke: 'africa',
  kp: 'east_asia',
  kr: 'east_asia',
  lk: 'south_asia',
  ma: 'africa',
  mx: 'north_america',
  my: 'southeast_asia',
  ng: 'africa',
  nl: 'europe',
  no: 'europe',
  np: 'south_asia',
  nz: 'oceania',
  pa: 'north_america',
  pe: 'south_america',
  pg: 'oceania',
  ph: 'southeast_asia',
  pk: 'south_asia',
  pl: 'europe',
  pt: 'europe',
  qa: 'middle_east',
  ro: 'europe',
  ru: 'eurasia',
  sa: 'middle_east',
  se: 'europe',
  sg: 'southeast_asia',
  sn: 'africa',
  th: 'southeast_asia',
  tn: 'africa',
  tr: 'eurasia',
  tt: 'caribbean',
  tz: 'africa',
  ua: 'europe',
  ug: 'africa',
  us: 'north_america',
  uy: 'south_america',
  ve: 'south_america',
  vn: 'southeast_asia',
  za: 'africa',
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
