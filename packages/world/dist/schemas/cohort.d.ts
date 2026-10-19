import { z } from "zod";
export declare const COHORT_AXES: readonly ["age", "class", "schooling", "place", "work", "race", "sex", "nativity", "disability", "veteran"];
export declare const CohortAxisId: z.ZodEnum<{
    age: "age";
    class: "class";
    schooling: "schooling";
    place: "place";
    work: "work";
    race: "race";
    sex: "sex";
    nativity: "nativity";
    disability: "disability";
    veteran: "veteran";
}>;
export type CohortAxisId = z.infer<typeof CohortAxisId>;
export declare const COHORT_IDS: readonly ["age-under-35", "age-35-64", "age-65-plus", "income-struggling", "income-comfortable", "income-affluent", "no-degree", "degree", "urban", "suburban", "rural", "goods-producing", "frontline-services", "professional-technical", "public-and-uniformed", "not-in-the-workforce", "race-hispanic", "race-black", "race-asian", "race-white", "race-other", "sex-female", "sex-male", "foreign-born", "us-born", "with-disability", "no-disability", "veteran", "non-veteran"];
export declare const CohortId: z.ZodEnum<{
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
}>;
export type CohortId = z.infer<typeof CohortId>;
/**
 * Which axis each cohort cuts. Exhaustive by type — a Record over CohortId
 * rather than a partial map — so a seventeenth cohort id fails the build
 * until this map says which cut of the country it belongs to.
 */
export declare const COHORT_AXIS: Readonly<Record<CohortId, CohortAxisId>>;
/**
 * The cells of one axis, in COHORT_IDS order. Derived from COHORT_AXIS
 * rather than a second hand-kept list, so the axis membership can never
 * drift from the map that owns it.
 */
export declare function cohortsOfAxis(axis: CohortAxisId): readonly CohortId[];
