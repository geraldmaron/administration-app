// How long each state's governor serves and when the term runs out, as of the
// date below.
//
// Read from the roster of sitting governors and their term ends (Wikipedia's
// "List of current United States governors", whose term-start and term-end
// columns cite the National Governors Association's Governors Roster), opened
// 2026-09-27. `nextElection` is the November the sitting term is contested in:
// the election before the term end, which is the November of the term-end year
// itself in the five states whose term runs to a December or a December 31
// (Alaska, Hawaii, Kentucky, New York, North Dakota) and the November before it
// everywhere else. New Hampshire and Vermont are the two states whose governor
// serves two years, stated by the same source.
//
// Projected forward by `termYears` this is the whole American gubernatorial
// cycle: 36 states in a midterm November, eleven in a presidential one (the
// nine four-year states on that cycle plus the two-year pair), Virginia and New
// Jersey in the November after a presidential election, and Kentucky, Louisiana
// and Mississippi in the November before one. Louisiana's November general
// stands here as one date; its earlier qualifying round is not a second
// election this table can express.
export const GOVERNOR_TERMS_AS_OF = "2026-09-27";
// prettier-ignore
export const GOVERNOR_TERMS = [
    { state: "AL", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "AK", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "AZ", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "AR", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "CA", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "CO", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "CT", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "DE", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "FL", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "GA", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "HI", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "ID", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "IL", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "IN", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "IA", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "KS", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "KY", termYears: 4, nextElection: "2027-11-02", asOf: "2026-09-27" },
    { state: "LA", termYears: 4, nextElection: "2027-11-02", asOf: "2026-09-27" },
    { state: "ME", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "MD", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "MA", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "MI", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "MN", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "MS", termYears: 4, nextElection: "2027-11-02", asOf: "2026-09-27" },
    { state: "MO", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "MT", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "NE", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "NV", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "NH", termYears: 2, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "NJ", termYears: 4, nextElection: "2029-11-06", asOf: "2026-09-27" },
    { state: "NM", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "NY", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "NC", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "ND", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "OH", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "OK", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "OR", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "PA", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "RI", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "SC", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "SD", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "TN", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "TX", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "UT", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "VT", termYears: 2, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "VA", termYears: 4, nextElection: "2029-11-06", asOf: "2026-09-27" },
    { state: "WA", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "WV", termYears: 4, nextElection: "2028-11-07", asOf: "2026-09-27" },
    { state: "WI", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
    { state: "WY", termYears: 4, nextElection: "2026-11-03", asOf: "2026-09-27" },
];
