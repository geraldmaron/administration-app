/** Singular count nouns that cannot head a sentence-opening phrase without a determiner. */
export declare const OPENING_HEAD_NOUNS: ReadonlySet<string>;
/**
 * The words that start a clause straight after the head: an auxiliary or a
 * common finite verb, a relative, or a preposition. "Man who negotiated",
 * "Facility stays open", "Roofing contract for the annex".
 */
export declare const OPENING_CLAUSE_STARTS: ReadonlySet<string>;
/**
 * Words whose presence at the head of a sentence means the phrase already has
 * its determiner, or is not a noun phrase at all: articles, demonstratives,
 * possessives, pronouns, quantifiers, numbers, prepositions and conjunctions.
 */
export declare const OPENING_DETERMINERS: ReadonlySet<string>;
