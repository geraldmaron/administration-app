// Foreign selections for every government other than the United States.
//
// The rows are the audit table, copied on 2026-09-25 into
// seed/nation-election-calendar.tsv. This module is that table, parsed.
// It does not read the filesystem, and it is not hand-edited.
//
// A scheduled selection is a carried or projected row whose next event is
// a YYYY-MM or a YYYY-MM-DD. An estimate, a conflict, and a cell with no
// such date are not scheduling facts. A month cell keeps the year and the
// month the table states. The table gives no day for those rows.

export type ElectionBasis = "none" | "carried" | "projected" | "estimated";

export type ElectionConfidence = "high" | "medium" | "low";

export type ElectionPrecision = "n/a" | "month" | "year" | "exact_date";

export type ElectionWindowDate = {
  readonly year: number;
  readonly month: number;
  readonly day?: number;
};

export type ElectionCalendarRow = {
  readonly nationId: string;
  readonly leaderSeat: string;
  readonly electionType: string;
  readonly fixedOrFlexible: string;
  readonly nextEvent: string;
  readonly when: ElectionWindowDate | null;
  readonly precision: ElectionPrecision;
  readonly termLengthYears: string;
  readonly basis: ElectionBasis;
  readonly confidence: ElectionConfidence;
  readonly preOathCrossCheck: string;
};

// prettier-ignore
export const ELECTION_CALENDAR: readonly ElectionCalendarRow[] = [
  { nationId: "AFG", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "AGO", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-08", when: { year: 2032, month: 8 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2027-08" },
  { nationId: "ALB", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-05", when: { year: 2029, month: 5 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-05" },
  { nationId: "AND", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-06", when: { year: 2031, month: 6 }, precision: "month", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-06" },
  { nationId: "ARE", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "irregular", nextEvent: "2032-05 (soft)", when: { year: 2032, month: 5 }, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-05" },
  { nationId: "ARG", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2031-10", when: { year: 2031, month: 10 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2027-10" },
  { nationId: "ARM", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-06", when: { year: 2031, month: 6 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-06" },
  { nationId: "ATG", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2031-04", when: { year: 2031, month: 4 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-04" },
  { nationId: "AUS", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "~2031 (soft)", when: null, precision: "year", termLengthYears: "3", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-05" },
  { nationId: "AUT", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-09", when: { year: 2029, month: 9 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-09" },
  { nationId: "AZE", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2031-02", when: { year: 2031, month: 2 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-02" },
  { nationId: "BDI", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "none in window (next 2034-05)", when: null, precision: "month", termLengthYears: "7", basis: "projected", confidence: "medium", preOathCrossCheck: "2027-05" },
  { nationId: "BEL", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-06", when: { year: 2029, month: 6 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-06" },
  { nationId: "BEN", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2033-04", when: { year: 2033, month: 4 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "medium", preOathCrossCheck: "2033-04" },
  { nationId: "BFA", leaderSeat: "head_of_state", electionType: "no_mechanism (transition)", fixedOrFlexible: "irregular", nextEvent: "2029-07 (soft)", when: { year: 2029, month: 7 }, precision: "month", termLengthYears: "n/a", basis: "carried", confidence: "low", preOathCrossCheck: "2029-07" },
  { nationId: "BGD", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-02", when: { year: 2031, month: 2 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-02" },
  { nationId: "BGR", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-04", when: { year: 2030, month: 4 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-04" },
  { nationId: "BHR", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "BHS", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2031-05", when: { year: 2031, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-05" },
  { nationId: "BIH", leaderSeat: "head_of_state", electionType: "presidential (rotating Presidency)", fixedOrFlexible: "fixed", nextEvent: "2030-10", when: { year: 2030, month: 10 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2026-10" },
  { nationId: "BLR", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2030-01", when: { year: 2030, month: 1 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "low", preOathCrossCheck: "2030-01" },
  { nationId: "BLZ", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2030-03", when: { year: 2030, month: 3 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-03" },
  { nationId: "BOL", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-08", when: { year: 2030, month: 8 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-08" },
  { nationId: "BRA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-10", when: { year: 2030, month: 10 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2026-10" },
  { nationId: "BRB", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2031-02", when: { year: 2031, month: 2 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-02" },
  { nationId: "BRN", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "BTN", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2033-11 (outside \"early 2033\")", when: { year: 2033, month: 11 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "low", preOathCrossCheck: "2028-11" },
  { nationId: "BWA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-10", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "CAF", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-12", when: { year: 2032, month: 12 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "high", preOathCrossCheck: "2032-12" },
  { nationId: "CAN", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-10-15", when: { year: 2029, month: 10, day: 15 }, precision: "exact_date", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "CHE", leaderSeat: "head_of_state", electionType: "rotating_council", fixedOrFlexible: "fixed (structural caveat)", nextEvent: "~2031-12 (soft)", when: null, precision: "year", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2026-12" },
  { nationId: "CHL", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-11", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-11" },
  { nationId: "CHN", leaderSeat: "head_of_state", electionType: "party_congress + NPC session", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2032-10 (Party Congress); ~2033-03 (NPC state reappointment)", when: { year: 2032, month: 10 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2027-10" },
  { nationId: "CIV", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-10", when: { year: 2030, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-10" },
  { nationId: "CMR", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-10", when: { year: 2032, month: 10 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "high", preOathCrossCheck: "2032-10" },
  { nationId: "COD", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2033-12 (outside \"early 2033\")", when: { year: 2033, month: 12 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-12" },
  { nationId: "COG", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2031-03", when: { year: 2031, month: 3 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2031-03" },
  { nationId: "COL", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-05", when: { year: 2030, month: 5 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2030-05" },
  { nationId: "COM", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-01 (boundary)", when: { year: 2029, month: 1 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-01" },
  { nationId: "CPV", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-05", when: { year: 2031, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2031-05" },
  { nationId: "CRI", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-02", when: { year: 2030, month: 2 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2030-02" },
  { nationId: "CUB", leaderSeat: "head_of_state", electionType: "presidential (National Assembly selection)", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2033-04 (edge, high uncertainty)", when: { year: 2033, month: 4 }, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-04" },
  { nationId: "CYP", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2033-02", when: { year: 2033, month: 2 }, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-02" },
  { nationId: "CZE", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-10", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "DEU", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-03", when: { year: 2029, month: 3 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-03" },
  { nationId: "DJI", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2031-04", when: { year: 2031, month: 4 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-04" },
  { nationId: "DMA", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2032-12 (soft)", when: { year: 2032, month: 12 }, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-12" },
  { nationId: "DNK", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2030-03", when: { year: 2030, month: 3 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-03" },
  { nationId: "DOM", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-05", when: { year: 2032, month: 5 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2028-05" },
  { nationId: "DZA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-09", when: { year: 2029, month: 9 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-09" },
  { nationId: "ECU", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-02", when: { year: 2029, month: 2 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-02" },
  { nationId: "EGY", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-12", when: { year: 2029, month: 12 }, precision: "month", termLengthYears: "6", basis: "carried", confidence: "high", preOathCrossCheck: "2029-12" },
  { nationId: "ERI", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "ESP", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "~2031-08 (soft)", when: null, precision: "year", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-08" },
  { nationId: "EST", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-03", when: { year: 2031, month: 3 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-03" },
  { nationId: "ETH", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "~2031-10 (soft)", when: null, precision: "year", termLengthYears: "5", basis: "estimated", confidence: "medium", preOathCrossCheck: "2026-10" },
  { nationId: "FIN", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-04", when: { year: 2031, month: 4 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-04" },
  { nationId: "FJI", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "~2031-02 (very soft)", when: null, precision: "year", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-02" },
  { nationId: "FRA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-04/05", when: null, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2027-04" },
  { nationId: "FSM", leaderSeat: "head_of_state", electionType: "presidential (Congress selection)", fixedOrFlexible: "fixed", nextEvent: "2031-03", when: { year: 2031, month: 3 }, precision: "month", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-03" },
  { nationId: "GAB", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-04", when: { year: 2032, month: 4 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "high", preOathCrossCheck: "2032-04" },
  { nationId: "GBR", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2029-08 (soft)", when: { year: 2029, month: 8 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-08" },
  { nationId: "GEO", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-10", when: { year: 2032, month: 10 }, precision: "month", termLengthYears: "4", basis: "estimated", confidence: "medium", preOathCrossCheck: "2028-10" },
  { nationId: "GHA", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2033-01 (edge)", when: { year: 2033, month: 1 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2029-01" },
  { nationId: "GIN", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-12", when: { year: 2032, month: 12 }, precision: "month", termLengthYears: "6", basis: "carried", confidence: "medium", preOathCrossCheck: "2032-12" },
  { nationId: "GMB", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2031-12", when: { year: 2031, month: 12 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2026-12" },
  { nationId: "GNB", leaderSeat: "head_of_state (transitional)", electionType: "no_mechanism (transition)", fixedOrFlexible: "irregular", nextEvent: "~2031-12 (soft)", when: null, precision: "year", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2026-12" },
  { nationId: "GNQ", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-11", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "high", preOathCrossCheck: "2029-11" },
  { nationId: "GRC", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "~2031-05 (soft)", when: null, precision: "year", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2027-05" },
  { nationId: "GRD", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "~2032-06 (soft)", when: null, precision: "year", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-06" },
  { nationId: "GTM", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2031-06", when: { year: 2031, month: 6 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-06" },
  { nationId: "GUY", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2030-09", when: { year: 2030, month: 9 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-09" },
  { nationId: "HND", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-11", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-11" },
  { nationId: "HRV", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-04", when: { year: 2032, month: 4 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2028-04" },
  { nationId: "HTI", leaderSeat: "head_of_government", electionType: "no_mechanism (crisis)", fixedOrFlexible: "irregular", nextEvent: "~2031-12 (very soft)", when: null, precision: "year", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2026-12" },
  { nationId: "HUN", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-04", when: { year: 2030, month: 4 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-04" },
  { nationId: "IDN", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-02", when: { year: 2029, month: 2 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-02" },
  { nationId: "IND", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-05", when: { year: 2029, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-05" },
  { nationId: "IRL", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "CONFLICT: leader-table says 2027-11; term math says ~2029-11", when: null, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-11" },
  { nationId: "IRN", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "IRQ", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-11", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "high", preOathCrossCheck: "2029-11" },
  { nationId: "ISL", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2032-11 (soft)", when: { year: 2032, month: 11 }, precision: "year", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-11" },
  { nationId: "ISR", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "~2030-10 (very soft)", when: null, precision: "year", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2026-10" },
  { nationId: "ITA", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-12", when: { year: 2032, month: 12 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2027-12" },
  { nationId: "JAM", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-09", when: { year: 2030, month: 9 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-09" },
  { nationId: "JOR", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "JPN", leaderSeat: "head_of_government", electionType: "parliamentary + party leadership", fixedOrFlexible: "mixed", nextEvent: "2027-09 (LDP leadership race, pre-oath, informational); general election due by 2030-02", when: { year: 2027, month: 9 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2027-09" },
  { nationId: "KAZ", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-11", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "high", preOathCrossCheck: "2029-11" },
  { nationId: "KEN", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2032-08", when: { year: 2032, month: 8 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2027-08" },
  { nationId: "KGZ", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2033-01 (edge)", when: { year: 2033, month: 1 }, precision: "month", termLengthYears: "6", basis: "projected", confidence: "high", preOathCrossCheck: "2027-01" },
  { nationId: "KHM", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2033-07 (outside \"early 2033\")", when: { year: 2033, month: 7 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-07" },
  { nationId: "KIR", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "~2032-10 (soft)", when: null, precision: "year", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-10" },
  { nationId: "KNA", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2032-08 (soft)", when: { year: 2032, month: 8 }, precision: "year", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-08" },
  { nationId: "KOR", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-03-27", when: { year: 2030, month: 3, day: 27 }, precision: "exact_date", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-03" },
  { nationId: "KWT", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "LAO", leaderSeat: "head_of_state", electionType: "party_congress", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2031-01", when: { year: 2031, month: 1 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-01" },
  { nationId: "LBN", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-05", when: { year: 2032, month: 5 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-05" },
  { nationId: "LBR", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-10", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "6", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "LBY", leaderSeat: "head_of_government", electionType: "no_mechanism (crisis)", fixedOrFlexible: "irregular", nextEvent: "no reliable date derivable", when: null, precision: "n/a", termLengthYears: "n/a", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-02 (deadline, not fixed)" },
  { nationId: "LCA", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2030-12", when: { year: 2030, month: 12 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-12" },
  { nationId: "LIE", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "LKA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-08", when: { year: 2029, month: 8 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-08" },
  { nationId: "LSO", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-10", when: { year: 2032, month: 10 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2027-10" },
  { nationId: "LTU", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-10", when: { year: 2032, month: 10 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2028-10" },
  { nationId: "LUX", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "CONFLICT: leader-table implies 2028-10, term math off a 2024 baseline gives 2029-06", when: null, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-10" },
  { nationId: "LVA", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-10", when: { year: 2030, month: 10 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2026-10" },
  { nationId: "MAR", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "MCO", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "MDA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-10", when: { year: 2032, month: 10 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2028-10" },
  { nationId: "MDG", leaderSeat: "head_of_state (transitional)", electionType: "no_mechanism (transition)", fixedOrFlexible: "irregular", nextEvent: "~2032-10 (soft)", when: null, precision: "year", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-10" },
  { nationId: "MDV", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "none reliable in window (next presidential is 2033-09, outside); parliamentary due 2029-03", when: null, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-09" },
  { nationId: "MEX", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-06-02 (first Sunday of June; corrected in the revision pass, June 1, 2030 is a Saturday)", when: { year: 2030, month: 6, day: 2 }, precision: "exact_date", termLengthYears: "6", basis: "carried", confidence: "high", preOathCrossCheck: "2030-06" },
  { nationId: "MHL", leaderSeat: "head_of_state", electionType: "presidential (Nitijela selection)", fixedOrFlexible: "fixed", nextEvent: "2031-11", when: { year: 2031, month: 11 }, precision: "month", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-11" },
  { nationId: "MKD", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "~2032-05 (soft)", when: null, precision: "year", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-05" },
  { nationId: "MLI", leaderSeat: "head_of_state (transitional)", electionType: "no_mechanism (transition)", fixedOrFlexible: "irregular", nextEvent: "2030-07 (soft)", when: { year: 2030, month: 7 }, precision: "month", termLengthYears: "n/a", basis: "carried", confidence: "low", preOathCrossCheck: "2030-07" },
  { nationId: "MLT", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2031-06", when: { year: 2031, month: 6 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-06" },
  { nationId: "MMR", leaderSeat: "head_of_state", electionType: "no_mechanism (junta-controlled)", fixedOrFlexible: "irregular", nextEvent: "2031-03 (soft, junta-controlled)", when: { year: 2031, month: 3 }, precision: "month", termLengthYears: "n/a", basis: "carried", confidence: "low", preOathCrossCheck: "2031-03" },
  { nationId: "MNE", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-06", when: { year: 2031, month: 6 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-06" },
  { nationId: "MNG", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-06", when: { year: 2032, month: 6 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-06" },
  { nationId: "MOZ", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2029-10", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "MRT", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-06", when: { year: 2029, month: 6 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-06" },
  { nationId: "MUS", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-11", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-11" },
  { nationId: "MWI", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-09", when: { year: 2030, month: 9 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-09" },
  { nationId: "MYS", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2033-02 (edge)", when: { year: 2033, month: 2 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-02" },
  { nationId: "NAM", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "~2029-11 to 2030-03 (date-convention gap)", when: null, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-11" },
  { nationId: "NER", leaderSeat: "head_of_state (transitional)", electionType: "no_mechanism (transition, suspended)", fixedOrFlexible: "irregular", nextEvent: "no reliable date in window", when: null, precision: "n/a", termLengthYears: "n/a", basis: "estimated", confidence: "low", preOathCrossCheck: "2030-03" },
  { nationId: "NGA", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2031-01", when: { year: 2031, month: 1 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-01" },
  { nationId: "NIC", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "NLD", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2030-05 (soft)", when: { year: 2030, month: 5 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-05" },
  { nationId: "NOR", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-09", when: { year: 2029, month: 9 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-09" },
  { nationId: "NPL", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "CONFLICT: leader-table gives 2031-03, Wikipedia aggregator's Nepal cycle gives Nov 2029", when: null, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2031-03" },
  { nationId: "NRU", leaderSeat: "head_of_state", electionType: "presidential (parliamentary selection)", fixedOrFlexible: "disputed", nextEvent: "2029-10 (term length itself disputed)", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "3-4 (disputed)", basis: "carried", confidence: "low", preOathCrossCheck: "2029-10" },
  { nationId: "NZL", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-11 (soft)", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "3", basis: "projected", confidence: "medium", preOathCrossCheck: "2026-11-07" },
  { nationId: "OMN", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "PAK", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-02", when: { year: 2029, month: 2 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-02" },
  { nationId: "PAN", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2029-05", when: { year: 2029, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-05" },
  { nationId: "PER", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2031-04", when: { year: 2031, month: 4 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2031-04" },
  { nationId: "PHL", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "none in window for the presidency (next 2034-05); legislative midterm due 2031", when: null, precision: "month", termLengthYears: "6", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-05" },
  { nationId: "PLW", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-11", when: { year: 2032, month: 11 }, precision: "month", termLengthYears: "4", basis: "estimated", confidence: "low", preOathCrossCheck: "2028-11" },
  { nationId: "PNG", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-07", when: { year: 2032, month: 7 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2027-07" },
  { nationId: "POL", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-11", when: { year: 2031, month: 11 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-11" },
  { nationId: "PRK", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "PRT", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-10 (soft; possible date-convention gap)", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-10" },
  { nationId: "PRY", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2033-04 (edge)", when: { year: 2033, month: 4 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2028-04" },
  { nationId: "PSE", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "QAT", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "ROU", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-05 (soft; government in flux)", when: { year: 2030, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-05" },
  { nationId: "RUS", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2030-03", when: { year: 2030, month: 3 }, precision: "month", termLengthYears: "6", basis: "carried", confidence: "high", preOathCrossCheck: "2030-03" },
  { nationId: "RWA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2029-07", when: { year: 2029, month: 7 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-07" },
  { nationId: "SAU", leaderSeat: "head_of_government (Crown Prince/PM)", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "SDN", leaderSeat: "head_of_state (transitional)", electionType: "no_mechanism (crisis)", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "SEN", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-03", when: { year: 2029, month: 3 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-03" },
  { nationId: "SGP", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2030-12 (soft)", when: { year: 2030, month: 12 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-12" },
  { nationId: "SLB", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-04", when: { year: 2032, month: 4 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-04" },
  { nationId: "SLE", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2033-06 (outside \"early 2033\")", when: { year: 2033, month: 6 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-06" },
  { nationId: "SLV", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "~2030-02 (legislative track, in window); presidential track uncertain", when: null, precision: "month", termLengthYears: "3 (legislative) / 6 (presidential)", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-02" },
  { nationId: "SMR", leaderSeat: "head_of_government (Secretary of State for Foreign Affairs)", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-06 (soft)", when: { year: 2029, month: 6 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "low", preOathCrossCheck: "2029-06" },
  { nationId: "SOM", leaderSeat: "head_of_state", electionType: "no_mechanism (contested)", fixedOrFlexible: "irregular", nextEvent: "no reliable date derivable", when: null, precision: "n/a", termLengthYears: "n/a", basis: "estimated", confidence: "low", preOathCrossCheck: "2027-05 (contested)" },
  { nationId: "SRB", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "CONFLICT / in flux", when: null, precision: "month", termLengthYears: "5", basis: "estimated", confidence: "low", preOathCrossCheck: "2026-10 (seat may move to head of government)" },
  { nationId: "SSD", leaderSeat: "head_of_state", electionType: "presidential (transitional)", fixedOrFlexible: "irregular", nextEvent: "~2030-12 (soft)", when: null, precision: "year", termLengthYears: "4 (unverified)", basis: "estimated", confidence: "low", preOathCrossCheck: "2026-12" },
  { nationId: "STP", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-09", when: { year: 2030, month: 9 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2026-09" },
  { nationId: "SUR", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-05", when: { year: 2030, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-05" },
  { nationId: "SVK", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2031-09", when: { year: 2031, month: 9 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2027-09" },
  { nationId: "SVN", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-03 (soft; possible date-convention gap)", when: { year: 2030, month: 3 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-03" },
  { nationId: "SWE", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-09 (soft; new government still forming as of source date)", when: { year: 2030, month: 9 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2026-09" },
  { nationId: "SWZ", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "SYC", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-10", when: { year: 2030, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-10" },
  { nationId: "SYR", leaderSeat: "head_of_state (transitional)", electionType: "no_mechanism (transitional)", fixedOrFlexible: "fixed (per Declaration)", nextEvent: "2030-03 (soft)", when: { year: 2030, month: 3 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "low", preOathCrossCheck: "2030-03" },
  { nationId: "TCD", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-05", when: { year: 2029, month: 5 }, precision: "month", termLengthYears: "5 (disputed, see note)", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-05" },
  { nationId: "TGO", leaderSeat: "head_of_government (President of the Council of Ministers)", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-04 (soft; post-2024 regime change)", when: { year: 2030, month: 4 }, precision: "month", termLengthYears: "6", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-04" },
  { nationId: "THA", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-03 (soft)", when: { year: 2030, month: 3 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-03" },
  { nationId: "TJK", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "none reliable in window for the presidency (next ~2034-10); legislative due 2030-03", when: null, precision: "month", termLengthYears: "7 (presidential)", basis: "projected", confidence: "medium", preOathCrossCheck: "2027-10" },
  { nationId: "TKM", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2029-03", when: { year: 2029, month: 3 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-03" },
  { nationId: "TLS", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2033-05 (just outside \"early 2033\")", when: { year: 2033, month: 5 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-05" },
  { nationId: "TON", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2029-11 (soft; Wikipedia aggregator's figure conflicts)", when: { year: 2029, month: 11 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "low", preOathCrossCheck: "2029-11" },
  { nationId: "TTO", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-04", when: { year: 2030, month: 4 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-04" },
  { nationId: "TUN", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-10", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "TUR", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2033-05 (just outside \"early 2033\")", when: { year: 2033, month: 5 }, precision: "month", termLengthYears: "5", basis: "projected", confidence: "high", preOathCrossCheck: "2028-05" },
  { nationId: "TUV", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2032-01", when: { year: 2032, month: 1 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "medium", preOathCrossCheck: "2028-01" },
  { nationId: "TWN", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2032-01 (soft; possible date-convention gap against a Mar 2028 baseline)", when: { year: 2032, month: 1 }, precision: "month", termLengthYears: "4", basis: "projected", confidence: "high", preOathCrossCheck: "2028-01" },
  { nationId: "TZA", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2030-10", when: { year: 2030, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2030-10" },
  { nationId: "UGA", leaderSeat: "head_of_state (combined)", electionType: "combined", fixedOrFlexible: "fixed", nextEvent: "2031-01 (soft; possible date-convention gap against a May 2031 baseline)", when: { year: 2031, month: 1 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-01" },
  { nationId: "UKR", leaderSeat: "head_of_state", electionType: "no_mechanism (wartime)", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "URY", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2029-10", when: { year: 2029, month: 10 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2029-10" },
  { nationId: "UZB", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2030-07", when: { year: 2030, month: 7 }, precision: "month", termLengthYears: "7", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-07" },
  { nationId: "VCT", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2030-11", when: { year: 2030, month: 11 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-11" },
  { nationId: "VEN", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "VNM", leaderSeat: "head_of_state (combined)", electionType: "party_congress", fixedOrFlexible: "non_competitive_fixed", nextEvent: "2031-01 (soft)", when: { year: 2031, month: 1 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2031-01" },
  { nationId: "VUT", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "flexible", nextEvent: "2029-01 (boundary)", when: { year: 2029, month: 1 }, precision: "month", termLengthYears: "4", basis: "carried", confidence: "low", preOathCrossCheck: "2029-01" },
  { nationId: "WSM", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed", nextEvent: "2030-08 (soft; Wikipedia aggregator's figure appears stale)", when: { year: 2030, month: 8 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2030-08" },
  { nationId: "XKX", leaderSeat: "head_of_government", electionType: "parliamentary", fixedOrFlexible: "fixed (contested)", nextEvent: "2030-06 (soft; may come far earlier)", when: { year: 2030, month: 6 }, precision: "month", termLengthYears: "4 (unverified)", basis: "carried", confidence: "low", preOathCrossCheck: "2030-06" },
  { nationId: "YEM", leaderSeat: "head_of_state", electionType: "no_mechanism", fixedOrFlexible: "n/a", nextEvent: "none scheduled", when: null, precision: "n/a", termLengthYears: "n/a", basis: "none", confidence: "high", preOathCrossCheck: "none scheduled" },
  { nationId: "ZAF", leaderSeat: "head_of_state", electionType: "presidential (National Assembly selection)", fixedOrFlexible: "fixed", nextEvent: "2029-05 (soft; possible date-convention gap against a Sep 2029 baseline)", when: { year: 2029, month: 5 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "medium", preOathCrossCheck: "2029-05" },
  { nationId: "ZMB", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed", nextEvent: "2031-08", when: { year: 2031, month: 8 }, precision: "month", termLengthYears: "5", basis: "carried", confidence: "high", preOathCrossCheck: "2031-08" },
  { nationId: "ZWE", leaderSeat: "head_of_state", electionType: "presidential", fixedOrFlexible: "fixed (contested)", nextEvent: "2030-08", when: { year: 2030, month: 8 }, precision: "month", termLengthYears: "7 (new, disputed)", basis: "carried", confidence: "low", preOathCrossCheck: "2030-08" },
];

const BY_NATION = new Map(ELECTION_CALENDAR.map((row) => [row.nationId, row]));

export function calendarRow(nationId: string): ElectionCalendarRow | null {
  return BY_NATION.get(nationId) ?? null;
}

export function scheduledSelection(nationId: string): ElectionCalendarRow | null {
  const row = calendarRow(nationId);
  if (!row?.when) return null;
  if (row.basis !== "carried" && row.basis !== "projected") return null;
  if (row.nextEvent.startsWith("CONFLICT")) return null;
  return row;
}

// --- Dated selections, for the simulation that holds them ------------------
//
// The table states most dates to the month and some only to the year. A
// selection has to happen on a day, so the day is a rule rather than a fact:
// the fifteenth for a month cell, and the fifteenth of June for a year cell.
// Both are planning values, and every dated selection says whether its day was
// stated or set by the rule, so nothing downstream can present the rule's day
// as the table's.

/** The oath the calendar's pre-oath column is measured against. */
export const CALENDAR_OATH: Required<ElectionWindowDate> = { year: 2029, month: 1, day: 20 };

/** The day a month-precision selection is held on. A planning value, not the table's. */
export const MONTH_PRECISION_DAY = 15;

/** The month a year-precision selection is held in. A planning value, not the table's. */
export const YEAR_PRECISION_MONTH = 6;

/**
 * How far the row can be taken as a date: a carried or projected row is a
 * scheduling fact, an estimated row is the researcher's estimate, and a
 * conflict row is two sources that disagree. A simulation holds all three on
 * their dates; a report lists the last two apart.
 */
export type SelectionStanding = "scheduled" | "estimated" | "conflict";

export type DatedSelection = {
  readonly nationId: string;
  readonly date: Required<ElectionWindowDate>;
  readonly standing: SelectionStanding;
  /** The day, or the day and month, came from the precision rule rather than the table. */
  readonly planningDay: boolean;
};

const DATE_IN_CELL = /(\d{4})-(\d{2})(?:-(\d{2}))?/g;
const YEAR_IN_CELL = /^~?(\d{4})\b/;

function dayKey(date: Required<ElectionWindowDate>): number {
  return date.year * 10_000 + date.month * 100 + date.day;
}

function isBeforeOath(date: Required<ElectionWindowDate>): boolean {
  return dayKey(date) < dayKey(CALENDAR_OATH);
}

/** Every date a cell names, in the order it names them, each on a day. */
function datesInCell(cell: string, precision: ElectionPrecision): readonly { date: Required<ElectionWindowDate>; planningDay: boolean }[] {
  const stated = [...cell.matchAll(DATE_IN_CELL)].map((match) => ({
    date: { year: Number(match[1]), month: Number(match[2]), day: match[3] ? Number(match[3]) : MONTH_PRECISION_DAY },
    planningDay: !match[3],
  }));
  if (stated.length > 0 || precision !== "year") return stated;
  const year = YEAR_IN_CELL.exec(cell)?.[1];
  return year ? [{ date: { year: Number(year), month: YEAR_PRECISION_MONTH, day: MONTH_PRECISION_DAY }, planningDay: true }] : [];
}

function standingOf(row: ElectionCalendarRow): SelectionStanding {
  if (row.nextEvent.startsWith("CONFLICT")) return "conflict";
  return row.basis === "estimated" ? "estimated" : "scheduled";
}

/** The first whole number in the term cell, or null where the table gives none. */
export function termYears(nationId: string): number | null {
  const match = /\d+/.exec(calendarRow(nationId)?.termLengthYears ?? "");
  return match ? Number(match[0]) : null;
}

/**
 * The selection the table puts between its own date and the oath, if any.
 *
 * Read off the pre-oath column, which is the leader table's own next date. A
 * January 2029 row at month precision falls on the fifteenth under the day
 * rule, which is before the oath: that side of the line is the rule's choice,
 * not the table's, and the selection says so through `planningDay`.
 */
export function preOathSelection(nationId: string): DatedSelection | null {
  const row = calendarRow(nationId);
  if (!row || row.basis === "none") return null;
  const first = datesInCell(row.preOathCrossCheck, "month")[0];
  if (!first || !isBeforeOath(first.date)) return null;
  return { nationId, date: first.date, standing: "scheduled", planningDay: first.planningDay };
}

/**
 * The first selection the table puts on or after the oath.
 *
 * A row the table leaves without a date in the window ("none in window", "no
 * reliable date") has none. A row that names only a pre-oath date is carried
 * one term past it, and keeps the row's own standing.
 */
export function windowSelection(nationId: string): DatedSelection | null {
  const row = calendarRow(nationId);
  if (!row || row.basis === "none") return null;
  if (/^(none|no )/i.test(row.nextEvent)) return null;
  const standing = standingOf(row);
  const after = datesInCell(row.nextEvent, row.precision).find((entry) => !isBeforeOath(entry.date));
  if (after) return { nationId, date: after.date, standing, planningDay: after.planningDay };
  const before = preOathSelection(nationId);
  const term = termYears(nationId);
  if (!before || term === null) return null;
  return { nationId, date: { ...before.date, year: before.date.year + term }, standing, planningDay: before.planningDay };
}
