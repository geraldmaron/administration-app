// The per-state rule a contest is decided under, as of the date below.
//
// `runoffThreshold` is the share a candidate needs to win a general election
// outright. Three states require a majority and send the top two to a second
// round otherwise: Georgia for every office, Mississippi for statewide and
// state-level offices since November 2023, and Louisiana for its state
// executive, legislative and local offices (Ballotpedia, "Runoff election",
// opened 2026-09-27, which cites O.C.G.A. 21-2-501, the Mississippi
// Constitution and La. Rev. Stat. Ann. 18:401.7). Everywhere else a plurality
// carries, which is stated here as a threshold below a half rather than as an
// absent field. Maine's and Alaska's ranked-choice counts are not runoffs and
// are not recorded as one.
//
// `allocation` is how the state appoints its presidential electors: every state
// and the District of Columbia is winner-take-all except Maine and Nebraska,
// which appoint by congressional district plus two at large (National Archives,
// "Distribution of Electoral Votes", opened 2026-09-27).
//
// `twoYearTerm` marks the two states whose governor stands every other year
// (governor-terms.ts's source), which is the one case a four-year federal cycle
// cannot express.
//
// `consecutiveTermLimit` is what the state's own constitution allows in a row.
// Thirty-seven states limit their governor and thirteen do not (Wikipedia, "Term
// limits in the United States", gubernatorial section, opened 2026-09-27, citing
// each state's constitution through the Council of State Governments' Book of
// the States): two in a row in thirty-six of them — whether the rule is written
// as two consecutive, as eight years of twelve, as eight of sixteen or as two in
// a lifetime, all four bar the sitting governor from a third in a row — and one
// in Virginia, the only state that bars consecutive terms outright. The District
// of Columbia is recorded with no limit, as its mayor has none.
export const ELECTION_RULES_AS_OF = "2026-09-27";
// prettier-ignore
export const ELECTION_RULES = [
    { state: "AL", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "AK", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "AZ", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "AR", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "CA", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "CO", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "CT", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "DE", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "DC", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "FL", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "GA", runoffThreshold: 0.5, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "HI", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "ID", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "IL", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "IN", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "IA", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "KS", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "KY", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "LA", runoffThreshold: 0.5, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "ME", runoffThreshold: 0, allocation: "by-district", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "MD", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "MA", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "MI", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "MN", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "MS", runoffThreshold: 0.5, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "MO", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "MT", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "NE", runoffThreshold: 0, allocation: "by-district", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "NV", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "NH", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: true, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "NJ", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "NM", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "NY", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "NC", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "ND", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "OH", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "OK", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "OR", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "PA", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "RI", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "SC", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "SD", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "TN", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "TX", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "UT", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "VT", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: true, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "VA", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 1, asOf: "2026-09-27" },
    { state: "WA", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "WV", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
    { state: "WI", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: null, asOf: "2026-09-27" },
    { state: "WY", runoffThreshold: 0, allocation: "winner-take-all", twoYearTerm: false, consecutiveTermLimit: 2, asOf: "2026-09-27" },
];
