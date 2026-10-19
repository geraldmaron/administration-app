import type { NationBooks } from "./national-books.js";
/** Whether two books records say the same thing, so a government whose books did not move writes nothing. */
export declare function sameBooks(a: NationBooks | undefined, b: NationBooks): boolean;
