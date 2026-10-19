// The two language gates every piece of player-facing writing must clear.
// They live here, in content, so the player app's tests and the generation
// pipeline's validator enforce the same lists rather than drifting copies.
// Words that only make sense to someone who has read the engine. Player copy
// speaks in consequences, not mechanisms.
export const MECHANICS_WORDS = [
    "rung",
    "instrument",
    "metric",
    "delta",
    "effect",
    "packet",
    "projection",
    "rng",
    "seed",
    "roll",
    "modifier",
    "stat",
];
// Player copy is written in American English. These are the unambiguous
// British variants — words with a distinct American spelling — kept short on
// purpose: a false positive here blocks a publish.
export const BRITISH_SPELLINGS = [
    "colour",
    "favour",
    "honour",
    "harbour",
    "neighbour",
    "rumour",
    "labour",
    "armour",
    "behaviour",
    "defence",
    "offence",
    "organisation",
    "organise",
    "organised",
    "organising",
    "realise",
    "realised",
    "realising",
    "recognise",
    "recognised",
    "recognising",
    "apologise",
    "apologised",
    "apologising",
    "emphasise",
    "emphasised",
    "emphasising",
    "centre",
    "theatre",
    "programme",
    "whilst",
    "amongst",
    "grey",
    "travelled",
    "travelling",
    "cancelled",
    "fuelled",
    "labelled",
    "learnt",
    "spelt",
    // The noun spellings. American English keeps the -se form for the noun as
    // well as the verb, and these three reach a player constantly: a license to
    // operate, a defense review, an offense taken.
    "licence",
    "defence",
    "offence",
    "pretence",
    // Not a spelling but a register: British idiom in a game whose copy is
    // American. It survived two waves because nothing on this list looked for it.
    "fortnight",
    // The season word, not the spelling: American English says "fall".
    "autumn",
];
/**
 * The endings a British stem takes. A misspelling is wrong in every form it
 * inflects into, and enumerating those forms by hand is what drifted: the list
 * above spells out the `-ise` family's inflections and simply forgot the
 * `-our` family's, so "favour" was refused while "favourable", "favouring",
 * and "neighbourhood" all shipped.
 *
 * Deliberately an explicit set rather than a wildcard. A wildcard suffix would
 * read "greyhound" as `grey` inflected, and a false positive here blocks a
 * publish.
 */
const BRITISH_INFLECTIONS = "(?:s|es|ed|d|ing|er|ers|able|ably|al|ally|ful|fully|less|hood|hoods|ite|ites|itism|ism|ist|ists)?";
function foundIn(text, words, suffix) {
    const lower = text.toLowerCase();
    return words.find((word) => new RegExp(`\\b${word}${suffix}\\b`).test(lower));
}
/**
 * The first mechanics word found in a piece of player copy, if any.
 *
 * Matched in the base form only, because a mechanics word's inflections are
 * ordinary English a scenario may legitimately want: "rolling blackouts" and
 * "statist" are prose, while a bare "roll" or "stat" is the engine leaking.
 */
export function mechanicsWordIn(text) {
    return foundIn(text, MECHANICS_WORDS, "s?");
}
/** The first British spelling found in a piece of player copy, if any. */
export function britishSpellingIn(text) {
    return foundIn(text, BRITISH_SPELLINGS, BRITISH_INFLECTIONS);
}
