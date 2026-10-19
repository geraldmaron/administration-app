import { z } from "zod";
/**
 * A plank of the platform the President runs on and governs by.
 *
 * Only what every surface that shows a plank needs is fixed here: a name, the
 * sentence a player reads, and the cohorts it courts, which are the people who
 * notice when a pledge made on it is kept or broken. What a plank moves in the
 * simulation is the engine's to say, against the policy catalog it already
 * has, so the dataset carries no stance or act ids it cannot check.
 */
export declare const PlankId: z.core.$ZodBranded<z.ZodString, "PlankId", "out">;
export type PlankId = z.infer<typeof PlankId>;
export declare const Plank: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "PlankId", "out">;
    title: z.ZodString;
    summary: z.ZodString;
    courts: z.ZodArray<z.ZodEnum<{
        veteran: "veteran";
        "age-under-35": "age-under-35";
        "age-35-64": "age-35-64";
        "age-65-plus": "age-65-plus";
        "income-struggling": "income-struggling";
        "income-comfortable": "income-comfortable";
        "income-affluent": "income-affluent";
        "no-degree": "no-degree";
        degree: "degree";
        urban: "urban";
        suburban: "suburban";
        rural: "rural";
        "goods-producing": "goods-producing";
        "frontline-services": "frontline-services";
        "professional-technical": "professional-technical";
        "public-and-uniformed": "public-and-uniformed";
        "not-in-the-workforce": "not-in-the-workforce";
        "race-hispanic": "race-hispanic";
        "race-black": "race-black";
        "race-asian": "race-asian";
        "race-white": "race-white";
        "race-other": "race-other";
        "sex-female": "sex-female";
        "sex-male": "sex-male";
        "foreign-born": "foreign-born";
        "us-born": "us-born";
        "with-disability": "with-disability";
        "no-disability": "no-disability";
        "non-veteran": "non-veteran";
    }>>;
}, z.core.$strip>;
export type Plank = z.infer<typeof Plank>;
