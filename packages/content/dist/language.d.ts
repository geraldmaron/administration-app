export declare const MECHANICS_WORDS: readonly ["rung", "instrument", "metric", "delta", "effect", "packet", "projection", "rng", "seed", "roll", "modifier", "stat"];
export declare const BRITISH_SPELLINGS: readonly ["colour", "favour", "honour", "harbour", "neighbour", "rumour", "labour", "armour", "behaviour", "defence", "offence", "organisation", "organise", "organised", "organising", "realise", "realised", "realising", "recognise", "recognised", "recognising", "apologise", "apologised", "apologising", "emphasise", "emphasised", "emphasising", "centre", "theatre", "programme", "whilst", "amongst", "grey", "travelled", "travelling", "cancelled", "fuelled", "labelled", "learnt", "spelt", "licence", "defence", "offence", "pretence", "fortnight", "autumn"];
/**
 * The first mechanics word found in a piece of player copy, if any.
 *
 * Matched in the base form only, because a mechanics word's inflections are
 * ordinary English a scenario may legitimately want: "rolling blackouts" and
 * "statist" are prose, while a bare "roll" or "stat" is the engine leaking.
 */
export declare function mechanicsWordIn(text: string): string | undefined;
/** The first British spelling found in a piece of player copy, if any. */
export declare function britishSpellingIn(text: string): string | undefined;
