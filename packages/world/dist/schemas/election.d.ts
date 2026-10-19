import { z } from "zod";
/**
 * A party as the United States tables name one.
 *
 * Spelled here rather than imported, because the engine holds the union the
 * simulation reads (`UsParty`) and the world package cannot depend on the
 * engine. The three strings are the same three the engine's union and
 * `women-in-cabinet.ts` already use, so a row parses into the engine's type
 * without translation.
 */
export declare const UsPartyId: z.ZodEnum<{
    independent: "independent";
    democrat: "democrat";
    republican: "republican";
}>;
export type UsPartyId = z.infer<typeof UsPartyId>;
/**
 * One Senate seat's class and who holds it.
 *
 * The class assignment itself — which two of the three classes each state votes
 * in — is structural and already held in the engine's own table. This row is the
 * sourced half: which party holds the seat of that class, on the day the table
 * was taken.
 */
export declare const SenateClassRow: z.ZodObject<{
    state: z.ZodEnum<{
        AL: "AL";
        AK: "AK";
        AZ: "AZ";
        AR: "AR";
        CA: "CA";
        CO: "CO";
        CT: "CT";
        DE: "DE";
        DC: "DC";
        FL: "FL";
        GA: "GA";
        HI: "HI";
        ID: "ID";
        IL: "IL";
        IN: "IN";
        IA: "IA";
        KS: "KS";
        KY: "KY";
        LA: "LA";
        ME: "ME";
        MD: "MD";
        MA: "MA";
        MI: "MI";
        MN: "MN";
        MS: "MS";
        MO: "MO";
        MT: "MT";
        NE: "NE";
        NV: "NV";
        NH: "NH";
        NJ: "NJ";
        NM: "NM";
        NY: "NY";
        NC: "NC";
        ND: "ND";
        OH: "OH";
        OK: "OK";
        OR: "OR";
        PA: "PA";
        RI: "RI";
        SC: "SC";
        SD: "SD";
        TN: "TN";
        TX: "TX";
        UT: "UT";
        VT: "VT";
        VA: "VA";
        WA: "WA";
        WV: "WV";
        WI: "WI";
        WY: "WY";
    }>;
    senateClass: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    party: z.ZodEnum<{
        independent: "independent";
        democrat: "democrat";
        republican: "republican";
    }>;
    asOf: z.ZodString;
}, z.core.$strip>;
export type SenateClassRow = z.infer<typeof SenateClassRow>;
/**
 * How a state's House seats were held on the day the roster was taken.
 *
 * The opening map of the House, by party, with the empty seats counted as
 * empty. The engine seats the chamber from it and moves seats from it only
 * through elections. `source` is the roster the counts were taken from.
 */
export declare const HouseDelegationRow: z.ZodObject<{
    state: z.ZodEnum<{
        AL: "AL";
        AK: "AK";
        AZ: "AZ";
        AR: "AR";
        CA: "CA";
        CO: "CO";
        CT: "CT";
        DE: "DE";
        DC: "DC";
        FL: "FL";
        GA: "GA";
        HI: "HI";
        ID: "ID";
        IL: "IL";
        IN: "IN";
        IA: "IA";
        KS: "KS";
        KY: "KY";
        LA: "LA";
        ME: "ME";
        MD: "MD";
        MA: "MA";
        MI: "MI";
        MN: "MN";
        MS: "MS";
        MO: "MO";
        MT: "MT";
        NE: "NE";
        NV: "NV";
        NH: "NH";
        NJ: "NJ";
        NM: "NM";
        NY: "NY";
        NC: "NC";
        ND: "ND";
        OH: "OH";
        OK: "OK";
        OR: "OR";
        PA: "PA";
        RI: "RI";
        SC: "SC";
        SD: "SD";
        TN: "TN";
        TX: "TX";
        UT: "UT";
        VT: "VT";
        VA: "VA";
        WA: "WA";
        WV: "WV";
        WI: "WI";
        WY: "WY";
    }>;
    democrat: z.ZodNumber;
    republican: z.ZodNumber;
    independent: z.ZodNumber;
    vacant: z.ZodNumber;
    source: z.ZodString;
    asOf: z.ZodString;
}, z.core.$strip>;
export type HouseDelegationRow = z.infer<typeof HouseDelegationRow>;
/** How long a state's governor serves, and when the current term runs out. */
export declare const GovernorTermRow: z.ZodObject<{
    state: z.ZodEnum<{
        AL: "AL";
        AK: "AK";
        AZ: "AZ";
        AR: "AR";
        CA: "CA";
        CO: "CO";
        CT: "CT";
        DE: "DE";
        DC: "DC";
        FL: "FL";
        GA: "GA";
        HI: "HI";
        ID: "ID";
        IL: "IL";
        IN: "IN";
        IA: "IA";
        KS: "KS";
        KY: "KY";
        LA: "LA";
        ME: "ME";
        MD: "MD";
        MA: "MA";
        MI: "MI";
        MN: "MN";
        MS: "MS";
        MO: "MO";
        MT: "MT";
        NE: "NE";
        NV: "NV";
        NH: "NH";
        NJ: "NJ";
        NM: "NM";
        NY: "NY";
        NC: "NC";
        ND: "ND";
        OH: "OH";
        OK: "OK";
        OR: "OR";
        PA: "PA";
        RI: "RI";
        SC: "SC";
        SD: "SD";
        TN: "TN";
        TX: "TX";
        UT: "UT";
        VT: "VT";
        VA: "VA";
        WA: "WA";
        WV: "WV";
        WI: "WI";
        WY: "WY";
    }>;
    termYears: z.ZodUnion<readonly [z.ZodLiteral<2>, z.ZodLiteral<4>]>;
    nextElection: z.ZodString;
    asOf: z.ZodString;
}, z.core.$strip>;
export type GovernorTermRow = z.infer<typeof GovernorTermRow>;
/**
 * The rule a contest inside one state is decided under.
 *
 * A runoff threshold below 0.5 means a plurality carries. `allocation` is how
 * the state hands out its electoral votes: `winner-take-all` for most,
 * `by-district` for the two that split them. `twoYearTerm` marks a state whose
 * governor stands every other year, which is the one case a four-year federal
 * cycle cannot express.
 *
 * `consecutiveTermLimit` is how many terms in a row a governor may serve before
 * the state's own constitution takes them off the ballot; `null` is a state that
 * does not limit them at all, which is a fact about the state and not a missing
 * row. A governor who cannot stand again answers a federal request from a
 * different place than one who has to face the voters over it, which is the one
 * thing this number is read for.
 */
export declare const ElectionRule: z.ZodObject<{
    state: z.ZodEnum<{
        AL: "AL";
        AK: "AK";
        AZ: "AZ";
        AR: "AR";
        CA: "CA";
        CO: "CO";
        CT: "CT";
        DE: "DE";
        DC: "DC";
        FL: "FL";
        GA: "GA";
        HI: "HI";
        ID: "ID";
        IL: "IL";
        IN: "IN";
        IA: "IA";
        KS: "KS";
        KY: "KY";
        LA: "LA";
        ME: "ME";
        MD: "MD";
        MA: "MA";
        MI: "MI";
        MN: "MN";
        MS: "MS";
        MO: "MO";
        MT: "MT";
        NE: "NE";
        NV: "NV";
        NH: "NH";
        NJ: "NJ";
        NM: "NM";
        NY: "NY";
        NC: "NC";
        ND: "ND";
        OH: "OH";
        OK: "OK";
        OR: "OR";
        PA: "PA";
        RI: "RI";
        SC: "SC";
        SD: "SD";
        TN: "TN";
        TX: "TX";
        UT: "UT";
        VT: "VT";
        VA: "VA";
        WA: "WA";
        WV: "WV";
        WI: "WI";
        WY: "WY";
    }>;
    runoffThreshold: z.ZodNumber;
    allocation: z.ZodEnum<{
        "winner-take-all": "winner-take-all";
        "by-district": "by-district";
    }>;
    twoYearTerm: z.ZodBoolean;
    consecutiveTermLimit: z.ZodNullable<z.ZodNumber>;
    asOf: z.ZodString;
}, z.core.$strip>;
export type ElectionRule = z.infer<typeof ElectionRule>;
