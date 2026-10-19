import { z } from "zod";
// Ten overlapping cuts of the same population. A person is in exactly ten
// cohorts at once, one per axis, not one of twenty-nine mutually exclusive
// slots. The axes and cells are dataset vocabulary, the way SectorId and
// StateId are; the motivation table that gives each cell its politics is a
// balance constant and lives in the engine, on the precedent COALITION_LENS
// sets.
export const COHORT_AXES = ["age", "class", "schooling", "place", "work", "race", "sex", "nativity", "disability", "veteran"];
export const CohortAxisId = z.enum(COHORT_AXES);
export const COHORT_IDS = [
    "age-under-35",
    "age-35-64",
    "age-65-plus",
    "income-struggling",
    "income-comfortable",
    "income-affluent",
    "no-degree",
    "degree",
    "urban",
    "suburban",
    "rural",
    "goods-producing",
    "frontline-services",
    "professional-technical",
    "public-and-uniformed",
    "not-in-the-workforce",
    "race-hispanic",
    "race-black",
    "race-asian",
    "race-white",
    "race-other",
    "sex-female",
    "sex-male",
    "foreign-born",
    "us-born",
    "with-disability",
    "no-disability",
    "veteran",
    "non-veteran",
];
export const CohortId = z.enum(COHORT_IDS);
/**
 * Which axis each cohort cuts. Exhaustive by type — a Record over CohortId
 * rather than a partial map — so a seventeenth cohort id fails the build
 * until this map says which cut of the country it belongs to.
 */
export const COHORT_AXIS = {
    "age-under-35": "age",
    "age-35-64": "age",
    "age-65-plus": "age",
    "income-struggling": "class",
    "income-comfortable": "class",
    "income-affluent": "class",
    "no-degree": "schooling",
    degree: "schooling",
    urban: "place",
    suburban: "place",
    rural: "place",
    "goods-producing": "work",
    "frontline-services": "work",
    "professional-technical": "work",
    "public-and-uniformed": "work",
    "not-in-the-workforce": "work",
    "race-hispanic": "race",
    "race-black": "race",
    "race-asian": "race",
    "race-white": "race",
    "race-other": "race",
    "sex-female": "sex",
    "sex-male": "sex",
    "foreign-born": "nativity",
    "us-born": "nativity",
    "with-disability": "disability",
    "no-disability": "disability",
    veteran: "veteran",
    "non-veteran": "veteran",
};
/**
 * The cells of one axis, in COHORT_IDS order. Derived from COHORT_AXIS
 * rather than a second hand-kept list, so the axis membership can never
 * drift from the map that owns it.
 */
export function cohortsOfAxis(axis) {
    return COHORT_IDS.filter((id) => COHORT_AXIS[id] === axis);
}
