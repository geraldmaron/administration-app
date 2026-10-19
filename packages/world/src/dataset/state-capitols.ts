// The seat of government of each state and DC: `seed/state-capitols.tsv`,
// cell for cell. A state the gazetteer has no city in is pinned here rather
// than at the national capital.

import type { StateId } from "../schemas/state.js";
import type { StateCapitol } from "../schemas/site.js";

// prettier-ignore
export const STATE_CAPITOLS: readonly StateCapitol[] = [
  { state: "AL", capitol: "Alabama State Capitol", city: "Montgomery", lat: 32.3774, lon: -86.3009, source: "https://www.wikidata.org/wiki/Q473393 (coordinate location)", opened: "2026-10-10" },
  { state: "AK", capitol: "Alaska State Capitol", city: "Juneau", lat: 58.3022, lon: -134.4105, source: "https://www.wikidata.org/wiki/Q2095370 (coordinate location)", opened: "2026-10-10" },
  { state: "AZ", capitol: "Arizona State Capitol", city: "Phoenix", lat: 33.4481, lon: -112.0964, source: "https://www.wikidata.org/wiki/Q670442 (coordinate location)", opened: "2026-10-10" },
  { state: "AR", capitol: "Arkansas State Capitol", city: "Little Rock", lat: 34.7467, lon: -92.2892, source: "https://www.wikidata.org/wiki/Q673076 (coordinate location)", opened: "2026-10-10" },
  { state: "CA", capitol: "California State Capitol", city: "Sacramento", lat: 38.5766, lon: -121.493, source: "https://www.wikidata.org/wiki/Q1026860 (coordinate location)", opened: "2026-10-10" },
  { state: "CO", capitol: "Colorado State Capitol", city: "Denver", lat: 39.7391, lon: -104.9849, source: "https://www.wikidata.org/wiki/Q1111402 (coordinate location)", opened: "2026-10-10" },
  { state: "CT", capitol: "Connecticut State Capitol", city: "Hartford", lat: 41.7642, lon: -72.6822, source: "https://www.wikidata.org/wiki/Q1126213 (coordinate location)", opened: "2026-10-10" },
  { state: "DE", capitol: "Delaware Legislative Hall", city: "Dover", lat: 39.1573, lon: -75.5197, source: "https://www.wikidata.org/wiki/Q1183954 (coordinate location)", opened: "2026-10-10" },
  { state: "DC", capitol: "District government building (city hall)", city: "Washington", lat: 38.895, lon: -77.0314, source: "https://www.wikidata.org/wiki/Q3180858 (coordinate location)", opened: "2026-10-10" },
  { state: "FL", capitol: "Florida State Capitol", city: "Tallahassee", lat: 30.4381, lon: -84.2814, source: "https://www.wikidata.org/wiki/Q1430074 (coordinate location)", opened: "2026-10-10" },
  { state: "GA", capitol: "Georgia State Capitol", city: "Atlanta", lat: 33.7491, lon: -84.3881, source: "https://www.wikidata.org/wiki/Q1509326 (coordinate location)", opened: "2026-10-10" },
  { state: "HI", capitol: "Hawaii State Capitol", city: "Honolulu", lat: 21.3075, lon: -157.8575, source: "https://www.wikidata.org/wiki/Q1290002 (coordinate location)", opened: "2026-10-10" },
  { state: "ID", capitol: "Idaho State Capitol", city: "Boise", lat: 43.6178, lon: -116.1997, source: "https://www.wikidata.org/wiki/Q1491417 (coordinate location)", opened: "2026-10-10" },
  { state: "IL", capitol: "Illinois State Capitol", city: "Springfield", lat: 39.7983, lon: -89.6547, source: "https://www.wikidata.org/wiki/Q1658839 (coordinate location)", opened: "2026-10-10" },
  { state: "IN", capitol: "Indiana Statehouse", city: "Indianapolis", lat: 39.7686, lon: -86.1625, source: "https://www.wikidata.org/wiki/Q1661319 (coordinate location)", opened: "2026-10-10" },
  { state: "IA", capitol: "Iowa State Capitol", city: "Des Moines", lat: 41.5912, lon: -93.6038, source: "https://www.wikidata.org/wiki/Q2977124 (coordinate location)", opened: "2026-10-10" },
  { state: "KS", capitol: "Kansas State Capitol", city: "Topeka", lat: 39.048, lon: -95.6782, source: "https://www.wikidata.org/wiki/Q2613943 (coordinate location)", opened: "2026-10-10" },
  { state: "KY", capitol: "Kentucky State Capitol", city: "Frankfort", lat: 38.1867, lon: -84.8754, source: "https://www.wikidata.org/wiki/Q3696032 (coordinate location)", opened: "2026-10-10" },
  { state: "LA", capitol: "Louisiana State Capitol", city: "Baton Rouge", lat: 30.4571, lon: -91.1874, source: "https://www.wikidata.org/wiki/Q1783159 (coordinate location)", opened: "2026-10-10" },
  { state: "ME", capitol: "Maine State House", city: "Augusta", lat: 44.3072, lon: -69.7817, source: "https://www.wikidata.org/wiki/Q2985164 (coordinate location)", opened: "2026-10-10" },
  { state: "MD", capitol: "Maryland State House", city: "Annapolis", lat: 38.9789, lon: -76.4911, source: "https://www.wikidata.org/wiki/Q1858066 (coordinate location)", opened: "2026-10-10" },
  { state: "MA", capitol: "Massachusetts State House", city: "Boston", lat: 42.3586, lon: -71.0639, source: "https://www.wikidata.org/wiki/Q1150259 (coordinate location)", opened: "2026-10-10" },
  { state: "MI", capitol: "Michigan State Capitol", city: "Lansing", lat: 42.7336, lon: -84.5556, source: "https://www.wikidata.org/wiki/Q1579713 (coordinate location)", opened: "2026-10-10" },
  { state: "MN", capitol: "Minnesota State Capitol", city: "Saint Paul", lat: 44.9543, lon: -93.1022, source: "https://www.wikidata.org/wiki/Q1789816 (coordinate location)", opened: "2026-10-10" },
  { state: "MS", capitol: "Mississippi State Capitol", city: "Jackson", lat: 32.3039, lon: -90.1822, source: "https://www.wikidata.org/wiki/Q3696020 (coordinate location)", opened: "2026-10-10" },
  { state: "MO", capitol: "Missouri State Capitol", city: "Jefferson City", lat: 38.5791, lon: -92.173, source: "https://www.wikidata.org/wiki/Q2749733 (coordinate location)", opened: "2026-10-10" },
  { state: "MT", capitol: "Montana State Capitol", city: "Helena", lat: 46.5858, lon: -112.0184, source: "https://www.wikidata.org/wiki/Q2985180 (coordinate location)", opened: "2026-10-10" },
  { state: "NE", capitol: "Nebraska State Capitol", city: "Lincoln", lat: 40.8081, lon: -96.6997, source: "https://www.wikidata.org/wiki/Q1683354 (coordinate location)", opened: "2026-10-10" },
  { state: "NV", capitol: "Nevada State Capitol", city: "Carson City", lat: 39.1641, lon: -119.7663, source: "https://www.wikidata.org/wiki/Q2781160 (coordinate location)", opened: "2026-10-10" },
  { state: "NH", capitol: "New Hampshire State House", city: "Concord", lat: 43.2067, lon: -71.5381, source: "https://www.wikidata.org/wiki/Q3269508 (coordinate location)", opened: "2026-10-10" },
  { state: "NJ", capitol: "New Jersey State House", city: "Trenton", lat: 40.2204, lon: -74.7699, source: "https://www.wikidata.org/wiki/Q3695455 (coordinate location)", opened: "2026-10-10" },
  { state: "NM", capitol: "New Mexico State Capitol", city: "Santa Fe", lat: 35.6823, lon: -105.94, source: "https://www.wikidata.org/wiki/Q3694507 (coordinate location)", opened: "2026-10-10" },
  { state: "NY", capitol: "New York State Capitol", city: "Albany", lat: 42.6526, lon: -73.7574, source: "https://www.wikidata.org/wiki/Q1510431 (coordinate location)", opened: "2026-10-10" },
  { state: "NC", capitol: "North Carolina State Capitol", city: "Raleigh", lat: 35.7803, lon: -78.6392, source: "https://www.wikidata.org/wiki/Q3694520 (coordinate location)", opened: "2026-10-10" },
  { state: "ND", capitol: "North Dakota State Capitol", city: "Bismarck", lat: 46.8208, lon: -100.783, source: "https://www.wikidata.org/wiki/Q3696010 (coordinate location)", opened: "2026-10-10" },
  { state: "OH", capitol: "Ohio Statehouse", city: "Columbus", lat: 39.9613, lon: -82.9991, source: "https://www.wikidata.org/wiki/Q2281225 (coordinate location)", opened: "2026-10-10" },
  { state: "OK", capitol: "Oklahoma State Capitol", city: "Oklahoma City", lat: 35.4922, lon: -97.5033, source: "https://www.wikidata.org/wiki/Q2937492 (coordinate location)", opened: "2026-10-10" },
  { state: "OR", capitol: "Oregon State Capitol", city: "Salem", lat: 44.9385, lon: -123.0304, source: "https://www.wikidata.org/wiki/Q2419314 (coordinate location)", opened: "2026-10-10" },
  { state: "PA", capitol: "Pennsylvania State Capitol", city: "Harrisburg", lat: 40.2644, lon: -76.8836, source: "https://www.wikidata.org/wiki/Q2915393 (coordinate location)", opened: "2026-10-10" },
  { state: "RI", capitol: "Rhode Island State House", city: "Providence", lat: 41.8309, lon: -71.415, source: "https://www.wikidata.org/wiki/Q2281281 (coordinate location)", opened: "2026-10-10" },
  { state: "SC", capitol: "South Carolina State House", city: "Columbia", lat: 34.0004, lon: -81.0331, source: "https://www.wikidata.org/wiki/Q2915276 (coordinate location)", opened: "2026-10-10" },
  { state: "SD", capitol: "South Dakota State Capitol", city: "Pierre", lat: 44.3672, lon: -100.346, source: "https://www.wikidata.org/wiki/Q2919981 (coordinate location)", opened: "2026-10-10" },
  { state: "TN", capitol: "Tennessee State Capitol", city: "Nashville", lat: 36.1658, lon: -86.7842, source: "https://www.wikidata.org/wiki/Q2570396 (coordinate location)", opened: "2026-10-10" },
  { state: "TX", capitol: "Texas State Capitol", city: "Austin", lat: 30.2747, lon: -97.7406, source: "https://www.wikidata.org/wiki/Q2078042 (coordinate location)", opened: "2026-10-10" },
  { state: "UT", capitol: "Utah State Capitol", city: "Salt Lake City", lat: 40.7772, lon: -111.8881, source: "https://www.wikidata.org/wiki/Q2627661 (coordinate location)", opened: "2026-10-10" },
  { state: "VT", capitol: "Vermont State House", city: "Montpelier", lat: 44.2625, lon: -72.5806, source: "https://www.wikidata.org/wiki/Q723549 (coordinate location)", opened: "2026-10-10" },
  { state: "VA", capitol: "Virginia State Capitol", city: "Richmond", lat: 37.5388, lon: -77.4336, source: "https://www.wikidata.org/wiki/Q2537798 (coordinate location)", opened: "2026-10-10" },
  { state: "WA", capitol: "Washington State Capitol", city: "Olympia", lat: 47.0358, lon: -122.9049, source: "https://www.wikidata.org/wiki/Q2620186 (coordinate location)", opened: "2026-10-10" },
  { state: "WV", capitol: "West Virginia State Capitol", city: "Charleston", lat: 38.3361, lon: -81.6119, source: "https://www.wikidata.org/wiki/Q2920261 (coordinate location)", opened: "2026-10-10" },
  { state: "WI", capitol: "Wisconsin State Capitol", city: "Madison", lat: 43.0747, lon: -89.3842, source: "https://www.wikidata.org/wiki/Q2915273 (coordinate location)", opened: "2026-10-10" },
  { state: "WY", capitol: "Wyoming State Capitol", city: "Cheyenne", lat: 41.1403, lon: -104.8197, source: "https://www.wikidata.org/wiki/Q723806 (coordinate location)", opened: "2026-10-10" },
];

const capitolByState: ReadonlyMap<StateId, StateCapitol> = new Map(STATE_CAPITOLS.map((capitol) => [capitol.state, capitol]));

export function stateCapitol(state: StateId): StateCapitol | undefined {
  return capitolByState.get(state);
}
