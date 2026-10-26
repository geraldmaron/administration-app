import { STATE_IDS, StateDisasterEligibility } from "../schemas/index.js";
// Which states a domestic disaster condition is allowed to land in, by kind.
// Grounded in real seismicity, hydrology, climatology and storm tracks —
// not a weight, a gate: placement stays inside the eligible set
// (`placeUsOnset`), so a state left off cannot be hit at all. Pandemic is
// the one kind with no geography: disease doesn't respect terrain, so every
// state is eligible.
export const STATE_DISASTER_ELIGIBILITY = StateDisasterEligibility.parse({
    // Active seismic zones: the Pacific Rim, the Intermountain West's fault
    // systems, the New Madrid seismic zone (AR/MO/TN/KY), and Oklahoma's
    // induced seismicity from wastewater injection.
    earthquake: ["AK", "AR", "CA", "CO", "HI", "ID", "KY", "MO", "NV", "OK", "OR", "TN", "UT", "WA", "WY"],
    // Major river systems prone to overbank flooding, coastal storm-surge
    // risk, and flash-flood-prone terrain — the broadest list by far, because
    // most of the country sits on a floodplain or a coastline somewhere.
    flood: [
        "AK", "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY",
        "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH",
        "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WV", "WI", "WY",
    ],
    // The arid West, the Great Plains, and the Southeast's documented dry
    // cycles (the 2007-08 Southeast drought among them).
    drought: ["AZ", "CA", "CO", "GA", "KS", "MT", "NC", "NE", "ND", "NM", "NV", "OK", "OR", "SC", "SD", "TX", "UT", "WA", "WY"],
    // Atlantic and Gulf coasts. Arkansas, Kentucky, Missouri, Oklahoma and
    // Tennessee are off the list: a hurricane does not make landfall in Tulsa
    // or Nashville.
    cyclone: ["AL", "FL", "GA", "LA", "MS", "NC", "SC", "TX", "VA"],
    // The arid/forested West's fire regime, plus the Southeast's pine forests.
    wildfire: ["AZ", "CA", "CO", "FL", "GA", "ID", "MT", "NC", "NM", "NV", "OK", "OR", "SC", "TX", "UT", "WA", "WY"],
    // No geography — every state and DC is eligible.
    pandemic: [...STATE_IDS],
    // The three added kinds, on the same footing as the six above: which states
    // the federal declaration record actually names, plus the storm track or
    // climate region where the record is thin.
    //
    // Tornado carries the severe-storm and tornado declarations together, which is
    // why it is the broadest list of the three: the record's most-declared states
    // are Mississippi, Kentucky, Tennessee, Oklahoma and Kansas, and every one of
    // them is here. The four states with no severe-storm season worth declaring
    // against are the ones off the list: Alaska, Hawaii and the two desert states
    // where the terrain does not make them.
    tornado: [
        "AL", "AR", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME",
        "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NY", "OH", "OK", "PA", "RI", "SC", "SD", "TN",
        "TX", "VA", "VT", "WI", "WV", "WY",
    ],
    // Winter storm, snowstorm and ice storm read together. The snow belt, the
    // northern plains and the Northeast, plus the Southern states an ice storm
    // shuts down precisely because they are not built for one — Kentucky and
    // Tennessee are among the most-declared states in the whole record, and ice is
    // a large part of why. Off the list: the states that do not freeze.
    "winter-storm": [
        "AK", "CO", "CT", "DC", "DE", "IA", "ID", "IL", "IN", "KS", "KY", "MA", "MD", "ME", "MI", "MN", "MO", "MT",
        "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SD", "TN", "TX", "UT", "VA",
        "VT", "WA", "WI", "WV", "WY",
    ],
    // Heat is the one hazard here the declaration record barely names, because heat
    // is answered by states and utilities and not declared. So this list is the
    // climate rather than the record: the desert Southwest and the humid South,
    // where the heat itself is extreme, plus the northern cities where a heat wave
    // kills because the housing stock has no cooling in it. Off the list: Alaska,
    // and the temperate Pacific Northwest and mountain states where a heat wave is
    // a bad week rather than an emergency.
    "heat-wave": [
        "AL", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "IL", "IN", "KS", "KY", "LA", "MA", "MD",
        "MI", "MN", "MO", "MS", "NC", "NE", "NJ", "NM", "NV", "NY", "OH", "OK", "PA", "RI", "SC", "TN", "TX", "UT",
        "VA", "WI",
    ],
});
// How often each kind of significant disaster strikes the United States, in
// events a year. A gate says where a hazard can land; this says how often it
// lands at all, so the home queue reads the country's own record rather than a
// world-style exposure score.
//
// The weather kinds are NOAA NCEI's billion-dollar disaster series, 2005 to 2024
// (events-US-1980-2024.csv, CPI-adjusted, opened 2026-10-25): severe storms 8.4
// a year (read as the tornado kind, which carries severe storms and tornadoes
// together), tropical cyclones 2.0, flooding 1.45, wildfire 0.8, winter storms
// 0.6 plus freezes 0.15. NOAA files heat waves under "drought" (0.9 a year), so
// that class is split evenly between drought and heat, which is a judgment, not
// a measurement. NOAA's series leaves out geophysical events: the earthquake
// rate is OpenFEMA's earthquake major-disaster declarations, 2005 to 2024 (ten
// declarations, about eight events). The pandemic rate is the disease
// public-health-emergency determinations HHS/ASPR lists for 2005 to 2024 (2009
// H1N1, 2016 Zika, 2020 COVID-19, 2022 mpox).
export const US_SIGNIFICANT_HAZARDS_PER_YEAR = {
    tornado: 8.4,
    cyclone: 2.0,
    flood: 1.45,
    wildfire: 0.8,
    "winter-storm": 0.75,
    drought: 0.45,
    "heat-wave": 0.45,
    earthquake: 0.4,
    pandemic: 0.2,
};
// Which series each rate is read from, so a consumer can say whether a kind is
// a billion-dollar-class event or already a declaration-level one.
export const US_HAZARD_RATE_SERIES = {
    tornado: "noaa-billion-dollar",
    cyclone: "noaa-billion-dollar",
    flood: "noaa-billion-dollar",
    wildfire: "noaa-billion-dollar",
    "winter-storm": "noaa-billion-dollar",
    drought: "noaa-billion-dollar",
    "heat-wave": "noaa-billion-dollar",
    earthquake: "fema-declaration",
    pandemic: "hhs-phe",
};
export const STATE_HAZARD_EXPOSURE = {
    "tornado": {
        AK: 0.13, AL: 57.13, AR: 39.57, AZ: 4.53, CA: 8.87, CO: 44.47, CT: 2.17, DC: 0.1, DE: 0.77, FL: 57.43,
        GA: 35.1, HI: 0.47, IA: 54.8, ID: 3.63, IL: 61.57, IN: 26.47, KS: 81.7, KY: 27.27, LA: 43.97, MA: 1.93,
        MD: 8.93, ME: 1.8, MI: 13.3, MN: 44.1, MO: 46.87, MS: 56.6, MT: 6.87, NC: 31.2, ND: 28.53, NE: 49.73, NH: 0.93,
        NJ: 2.6, NM: 9.07, NV: 1.6, NY: 9.23, OH: 23.87, OK: 69.37, OR: 2.93, PA: 17.03, RI: 0.33, SC: 26.23, SD: 26.4,
        TN: 29.93, TX: 133, UT: 2.03, VA: 18.13, VT: 0.57, WA: 2.7, WI: 24.03, WV: 2.77, WY: 10.17,
    },
    "flood": {
        AK: 0.8, AR: 0.1, AZ: 0.25, CA: 0.3, CO: 0.15, FL: 0.05, HI: 0.25, IA: 0.4, ID: 0.45, IL: 0.25, IN: 0.05,
        KS: 0.05, KY: 0.35, LA: 0.35, MA: 0.05, MD: 0.15, ME: 0.35, MI: 0.25, MN: 0.55, MO: 0.25, MS: 0.1, MT: 0.4,
        NC: 0.15, ND: 0.5, NE: 0.2, NH: 0.2, NM: 0.35, NV: 0.1, NY: 0.3, OH: 0.1, OK: 0.1, OR: 0.2, PA: 0.1, SC: 0.05,
        SD: 0.35, TN: 0.1, TX: 0.4, UT: 0.3, VA: 0.05, VT: 0.45, WA: 0.4, WI: 0.25, WV: 0.55, WY: 0.2,
    },
    "cyclone": {
        AL: 0.45, AR: 0.05, CA: 0.15, CT: 0.2, DC: 0.1, DE: 0.2, FL: 1, GA: 0.35, HI: 0.05, KY: 0.05, LA: 0.6, MA: 0.1,
        MD: 0.15, ME: 0.05, MS: 0.35, NC: 0.5, NH: 0.1, NJ: 0.2, NY: 0.35, OH: 0.05, PA: 0.2, RI: 0.1, SC: 0.35,
        TN: 0.05, TX: 0.35, VA: 0.3, VT: 0.05, WV: 0.1,
    },
    "wildfire": {
        AK: 0.6, AZ: 2.6, CA: 10.95, CO: 2.1, CT: 0.05, FL: 0.9, GA: 0.55, HI: 0.95, ID: 0.95, KS: 0.65, KY: 0.1,
        LA: 0.2, MT: 1.95, NC: 0.2, ND: 0.15, NE: 0.35, NH: 0.05, NJ: 0.05, NM: 2.25, NV: 2.5, NY: 0.05, OK: 4.8,
        OR: 3.7, RI: 0.05, SC: 0.1, SD: 0.6, TN: 0.25, TX: 6.9, UT: 1.4, VA: 0.15, WA: 5.2, WY: 0.95,
    },
    "winter-storm": {
        AR: 0.15, AZ: 0.05, CA: 0.1, CT: 0.05, DC: 0.1, DE: 0.1, GA: 0.1, IA: 0.05, IL: 0.1, KS: 0.25, KY: 0.2,
        LA: 0.05, MA: 0.2, MD: 0.15, ME: 0.1, MO: 0.15, MS: 0.05, NC: 0.05, ND: 0.15, NE: 0.1, NH: 0.15, NJ: 0.2,
        NY: 0.15, OK: 0.25, PA: 0.1, RI: 0.05, SC: 0.1, SD: 0.25, TN: 0.25, TX: 0.1, VA: 0.2, VT: 0.1, WI: 0.05,
        WV: 0.15,
    },
    "earthquake": {
        AK: 0.05, CA: 0.15, DC: 0.05, HI: 0.05, UT: 0.05, VA: 0.05,
    },
};
/**
 * What an eligible state with no event in the record still carries, in events a
 * year: half an event over the record's span (add-half smoothing). Without it a
 * state the gate admits but twenty quiet years never named could never be
 * struck, which would make the record a second, stricter gate.
 */
export const HAZARD_EXPOSURE_FLOOR = {
    tornado: 0.5 / 30,
    flood: 0.5 / 20,
    cyclone: 0.5 / 20,
    wildfire: 0.5 / 20,
    "winter-storm": 0.5 / 20,
    earthquake: 0.5 / 20,
};
// Tornadoes a year whose track starts or ends within fifteen miles of each
// city's center, from the same SPC file, 1995 to 2024. A tornado's footprint is
// a few square miles, so a city-scope tornado lands where tornadoes touch down
// near cities and not where people live: New York City saw ten in thirty years,
// Oklahoma City seventy-two. Keyed by the slug after "CITY-USA-"; a city absent
// here recorded none.
const CITY_TORNADOES_BY_SLUG = {
    "akron": 0.667, "albany": 0.167, "albuquerque": 0.133, "allentown": 0.3, "amarillo": 0.733, "anchorage": 0.033,
    "ann-arbor": 0.3, "appleton": 0.933, "asheville": 0.067, "athens": 0.3, "atlanta": 0.833, "atlantic-city": 0.1,
    "augusta": 0.667, "austin": 0.667, "bakersfield": 0.167, "baltimore": 0.8, "baton-rouge": 0.733,
    "beaumont": 0.633, "birmingham": 1.333, "boise": 0.233, "boston": 0.067, "boulder": 0.167, "bremerton": 0.067,
    "bridgeport": 0.167, "brownsville": 0.3, "buffalo": 0.2, "canton": 0.5, "cape-coral": 1.467,
    "cedar-rapids": 1.1, "champaign": 1.4, "charleston-sc": 1.033, "charleston-wv": 0.3, "charlotte": 0.667,
    "charlottesville": 0.3, "chattanooga": 1.167, "chicago": 0.533, "cincinnati": 0.367, "clarksville": 1.1,
    "cleveland": 0.3, "college-station": 0.733, "colorado-springs": 0.267, "columbia-sc": 1.1, "columbus": 0.8,
    "columbus-ga": 0.867, "corpus-christi": 0.833, "dallas": 1.3, "davenport": 1.5, "dayton": 0.9,
    "deltona": 0.433, "denver": 0.6, "des-moines": 1.5, "detroit": 0.067, "duluth": 0.1, "durham": 0.3,
    "erie": 0.1, "eugene": 0.1, "evansville": 1.133, "fargo": 0.667, "fayetteville-ar": 0.6,
    "fayetteville-nc": 0.333, "flint": 0.867, "fort-collins": 0.2, "fort-smith": 1.033, "fort-walton": 1.133,
    "fort-wayne": 0.5, "fresno": 0.367, "gainesville-fl": 0.367, "grand-rapids": 0.567, "green-bay": 0.367,
    "greensboro": 0.3, "gulfport": 1.367, "hagerstown": 0.5, "harrisburg": 0.7, "hartford": 0.167, "hickory": 0.8,
    "honolulu": 0.133, "houston": 1.133, "huntington": 0.233, "huntsville": 1.7, "indianapolis": 0.733,
    "jackson-ms": 2.5, "jacksonville": 0.933, "kalamazoo": 0.433, "kansas-city": 0.567, "kennewick": 0.067,
    "killeen": 0.6, "kingsport": 0.267, "knoxville": 0.5, "lafayette-in": 1.033, "lafayette-la": 1.233,
    "lake-charles": 1.467, "lakeland": 1.3, "lancaster-pa": 0.5, "lansing": 0.333, "las-cruces": 0.067,
    "las-vegas": 0.033, "lexington": 0.333, "lincoln": 0.9, "little-rock": 1.7, "los-angeles": 0.2,
    "louisville": 1.433, "lubbock": 0.833, "lynchburg": 0.2, "macon": 0.833, "madison": 0.967, "manchester": 0.033,
    "mcallen": 0.267, "memphis": 0.333, "merced": 0.267, "miami": 1.633, "milwaukee": 0.133, "minneapolis": 0.733,
    "mobile": 1.633, "modesto": 0.2, "montgomery": 1.633, "myrtle-beach": 0.633, "naples": 0.9, "nashville": 1.9,
    "new-haven": 0.267, "new-london": 0.133, "new-orleans": 1.633, "new-york": 0.333, "north-port": 1.433,
    "ocala": 0.7, "ogden": 0.333, "oklahoma-city": 2.4, "olympia": 0.1, "omaha": 0.767, "orlando": 0.633,
    "oxnard": 0.167, "palm-bay": 0.967, "pensacola": 0.933, "peoria": 1.3, "philadelphia": 0.767, "phoenix": 0.2,
    "pittsburgh": 0.6, "port-st-lucie": 0.933, "portland": 0.333, "portland-me": 0.033, "providence": 0.333,
    "provo": 0.1, "raleigh": 0.6, "reading": 0.2, "reno": 0.2, "richmond": 0.9, "riverside": 0.167,
    "roanoke": 0.267, "rochester": 0.1, "rochester-mn": 0.433, "rockford": 0.967, "sacramento": 0.433,
    "salem": 0.333, "salisbury": 0.267, "salt-lake-city": 0.2, "san-antonio": 0.667, "san-diego": 0.033,
    "san-francisco": 0.067, "san-jose": 0.133, "san-luis-obispo": 0.133, "santa-barbara": 0.067, "santa-cruz": 0.2,
    "santa-rosa": 0.167, "savannah": 0.633, "seattle": 0.067, "shreveport": 1.167, "sioux-falls": 0.9,
    "south-bend": 0.767, "spokane": 0.267, "springfield-il": 1.467, "springfield-ma": 0.2, "springfield-mo": 1.4,
    "st-cloud": 0.433, "st-louis": 1.333, "stockton": 0.233, "syracuse": 0.033, "tallahassee": 0.733,
    "tampa": 1.467, "toledo": 0.433, "topeka": 0.7, "trenton": 0.667, "tucson": 0.167, "tulsa": 1.667,
    "tuscaloosa": 1.167, "vallejo": 0.1, "virginia-beach": 0.267, "visalia": 0.167, "waco": 0.367,
    "washington-dc": 1, "wichita": 0.533, "wilmington-nc": 1.3, "winston-salem": 0.4, "worcester": 0.333,
    "yakima": 0.1, "york": 0.367, "youngstown": 0.533,
};
export const CITY_TORNADOES_PER_YEAR = Object.fromEntries(Object.entries(CITY_TORNADOES_BY_SLUG).map(([slug, rate]) => [`CITY-USA-${slug}`, rate]));
