import { School } from "../schemas/background.js";
/** The schools written by hand, for the countries the roster authored before the bake. */
export declare const AUTHORED_SCHOOLS: readonly School[];
/** Every school the game knows, the cast's and the founding list's alike. */
export declare const schools: readonly School[];
export declare const schoolById: ReadonlyMap<string, School>;
/**
 * Every school a nation's officials come out of: its own, or, for a small
 * state with no university of note, its region's hub schools, which is where
 * such a state's officials actually study. Throws rather than falling back
 * further: a nation with no entry would otherwise graduate its whole
 * government from whichever list a fallback happened to point at, and the
 * failure would be invisible.
 */
export declare function schoolsFor(nation: string): readonly School[];
/** Every school a President from this nation can name at founding: the cast's schools and the longer founding list. */
export declare function almaMatersFor(nation: string): readonly School[];
/** The nations the catalogue covers, so a test can assert it covers all of them. */
export declare const SCHOOL_NATIONS: readonly string[];
