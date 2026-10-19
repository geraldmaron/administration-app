import { z } from "zod";
/**
 * What a foreign government's leader must match, as of a stated date.
 *
 * The leaders are fictional and faithful: an invented person who shares the
 * real officeholder's sex, age band, title, regime and name culture, seated by
 * the parties that actually govern. So the row carries exactly the facts a
 * draw is held to and nothing that identifies the real person. There is no
 * name field and no source prose; the sources stay with the research record,
 * which is never rendered.
 */
export declare const LeaderSeat: z.ZodEnum<{
    head_of_state: "head_of_state";
    head_of_government: "head_of_government";
}>;
export type LeaderSeat = z.infer<typeof LeaderSeat>;
export declare const LeaderAgeBand: z.ZodEnum<{
    "30-39": "30-39";
    "40-49": "40-49";
    "50-59": "50-59";
    "60-69": "60-69";
    "70-79": "70-79";
    "80+": "80+";
}>;
export type LeaderAgeBand = z.infer<typeof LeaderAgeBand>;
export declare const RegimeType: z.ZodEnum<{
    full_democracy: "full_democracy";
    flawed_democracy: "flawed_democracy";
    hybrid_regime: "hybrid_regime";
    authoritarian: "authoritarian";
    one_party_state: "one_party_state";
    military_junta: "military_junta";
    absolute_monarchy: "absolute_monarchy";
    constitutional_monarchy_executive: "constitutional_monarchy_executive";
    theocracy: "theocracy";
}>;
export type RegimeType = z.infer<typeof RegimeType>;
export declare const LeaderSex: z.ZodEnum<{
    M: "M";
    F: "F";
}>;
export type LeaderSex = z.infer<typeof LeaderSex>;
export declare const LeaderConstraint: z.ZodObject<{
    nation: z.core.$ZodBranded<z.ZodString, "NationId", "out">;
    asOf: z.ZodString;
    seat: z.ZodEnum<{
        head_of_state: "head_of_state";
        head_of_government: "head_of_government";
    }>;
    title: z.ZodString;
    sex: z.ZodEnum<{
        M: "M";
        F: "F";
    }>;
    ageBand: z.ZodEnum<{
        "30-39": "30-39";
        "40-49": "40-49";
        "50-59": "50-59";
        "60-69": "60-69";
        "70-79": "70-79";
        "80+": "80+";
    }>;
    secondSeatTitle: z.ZodString;
    regime: z.ZodEnum<{
        full_democracy: "full_democracy";
        flawed_democracy: "flawed_democracy";
        hybrid_regime: "hybrid_regime";
        authoritarian: "authoritarian";
        one_party_state: "one_party_state";
        military_junta: "military_junta";
        absolute_monarchy: "absolute_monarchy";
        constitutional_monarchy_executive: "constitutional_monarchy_executive";
        theocracy: "theocracy";
    }>;
    nameCulture: z.ZodString;
    nameForm: z.ZodEnum<{
        "given-family": "given-family";
        "family-given": "family-given";
        patronymic: "patronymic";
        "malay-patronymic": "malay-patronymic";
        "mauritanian-patronymic": "mauritanian-patronymic";
    }>;
    governing: z.ZodArray<z.core.$ZodBranded<z.ZodString, "PartyId", "out">>;
    partyless: z.ZodBoolean;
    womenCabinetShare: z.ZodNumber;
    shareFlagged: z.ZodBoolean;
}, z.core.$strip>;
export type LeaderConstraint = z.infer<typeof LeaderConstraint>;
