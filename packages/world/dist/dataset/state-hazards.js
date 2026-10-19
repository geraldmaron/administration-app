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
