// How many of each state's House seats each party holds, as the Clerk of the
// House lists them.
//
// Read from the Clerk's member data (the XML behind clerk.house.gov's member
// list), the 119th Congress, second session, published 2026-09-02 and opened
// 2026-09-28: one entry per seat, each carrying the state, the district and
// the member's party, and an empty entry for a seat with nobody in it. One row
// here per state, counted from those entries, so the table is the chamber the
// source states rather than a split derived from a state's lean. The delegate
// seats (DC and the territories) do not vote on the floor and are not counted.
//
// Vacancies are kept as vacancies rather than handed to the party that last
// held the seat: on the date of the table Florida's 20th and Texas's 23rd were
// empty. One member, California's 3rd, is listed as an independent. The
// validator holds every row to the state's apportioned seats and the chamber
// to 435.
export const HOUSE_ROSTER_SOURCE = "https://clerk.house.gov/xml/lists/MemberData.xml";
export const HOUSE_ROSTER_AS_OF = "2026-09-02";
// prettier-ignore
export const HOUSE_DELEGATION_TABLE = [
    { state: "AL", democrat: 2, republican: 5, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "AK", democrat: 0, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "AZ", democrat: 3, republican: 6, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "AR", democrat: 0, republican: 4, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "CA", democrat: 43, republican: 8, independent: 1, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "CO", democrat: 4, republican: 4, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "CT", democrat: 5, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "DE", democrat: 1, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "FL", democrat: 7, republican: 20, independent: 0, vacant: 1, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "GA", democrat: 5, republican: 9, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "HI", democrat: 2, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "ID", democrat: 0, republican: 2, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "IL", democrat: 14, republican: 3, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "IN", democrat: 2, republican: 7, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "IA", democrat: 0, republican: 4, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "KS", democrat: 1, republican: 3, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "KY", democrat: 1, republican: 5, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "LA", democrat: 2, republican: 4, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "ME", democrat: 2, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MD", democrat: 7, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MA", democrat: 9, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MI", democrat: 6, republican: 7, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MN", democrat: 4, republican: 4, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MS", democrat: 1, republican: 3, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MO", democrat: 2, republican: 6, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "MT", democrat: 0, republican: 2, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NE", democrat: 0, republican: 3, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NV", democrat: 3, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NH", democrat: 2, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NJ", democrat: 9, republican: 3, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NM", democrat: 3, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NY", democrat: 19, republican: 7, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "NC", democrat: 4, republican: 10, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "ND", democrat: 0, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "OH", democrat: 5, republican: 10, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "OK", democrat: 0, republican: 5, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "OR", democrat: 5, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "PA", democrat: 7, republican: 10, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "RI", democrat: 2, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "SC", democrat: 1, republican: 6, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "SD", democrat: 0, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "TN", democrat: 1, republican: 8, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "TX", democrat: 13, republican: 24, independent: 0, vacant: 1, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "UT", democrat: 0, republican: 4, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "VT", democrat: 1, republican: 0, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "VA", democrat: 6, republican: 5, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "WA", democrat: 8, republican: 2, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "WV", democrat: 0, republican: 2, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "WI", democrat: 2, republican: 6, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
    { state: "WY", democrat: 0, republican: 1, independent: 0, vacant: 0, source: HOUSE_ROSTER_SOURCE, asOf: HOUSE_ROSTER_AS_OF },
];
