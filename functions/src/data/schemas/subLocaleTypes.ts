// Sub-locale types — represents administrative subdivisions and cities within countries.
// Enables scenarios to target specific geographic sub-areas.

export type SubLocaleType =
  | 'capital'
  | 'major_city'
  | 'state'
  | 'province'
  | 'territory'
  | 'autonomous_region'
  | 'border_region'
  | 'industrial_hub'
  | 'port_city';

export interface SubLocale {
  id: string;                    // e.g. "usa_new_york", "france_paris"
  countryId: string;             // parent country canonical ID
  name: string;                  // display name
  type: SubLocaleType;
  parentSubdivisionId?: string;  // for cities — which state/province they're in
  population_millions: number;
  economic_weight: number;       // 0–1, share of national GDP
  political_sensitivity: number; // 0–100
  tags: string[];                // ["port", "border", "financial_hub", "swing_region", "nuclear_site", etc.]
  locale_tokens: {
    locale_name: string;
    locale_type: string;
    region_type: string;
    terrain: string;
  };
}
