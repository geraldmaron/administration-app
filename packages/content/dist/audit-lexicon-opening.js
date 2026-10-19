// The words the decapitated-opening rule reads a first sentence with.
//
// A first beat like "Facility stays open past the deadline" is a noun phrase
// whose article a strip pass removed, capitalized so the lowercase check cannot
// see it. Telling that apart from "Backup generators failed" or "Water came
// over the levee" needs a part-of-speech reading the audit does not have, so
// the rule narrows the question to one it can answer with two short lists: is
// the head of the opening phrase a singular count noun, and does a clause start
// right after it? A singular count noun with no determiner, followed by its
// verb or a relative, is the defect; a plural, a mass noun or a modifier
// running into one is not.
//
// Both lists are curated by hand and kept to words that are near-certainly
// count nouns in this game's prose. Left out on purpose: words that open a
// sentence bare in good English ("Word came", "Night fell", "Court resumed",
// "School is out", "Police found") and departments a sentence may name bare
// ("State has a channel", "Treasury wants", "Justice's inspector general").
/** Singular count nouns that cannot head a sentence-opening phrase without a determiner. */
export const OPENING_HEAD_NOUNS = new Set(("facility plant factory refinery mine port harbor ship boat vessel tanker freighter bridge dam levee road highway " +
    "tunnel pipeline hospital clinic prison jail camp university college museum library theater stadium " +
    "man woman boy girl child family doctor nurse teacher farmer driver pilot captain sailor soldier general admiral " +
    "colonel commander spokesman spokeswoman minister secretary director chairman chairwoman inspector auditor " +
    "prosecutor lawyer witness defector informant donor lender reporter journalist editor contractor judge senator " +
    "governor mayor official officer ambassador envoy consul attache " +
    "league council committee commission board agency office ministry bureau panel tribunal union company firm bank " +
    "fund program government navy army military regime junta cabinet guard service delegation convoy column unit " +
    "battalion regiment brigade team crew patrol garrison base embassy consulate checkpoint crossing village town " +
    "city county district province region newspaper network station outlet " +
    "operation inquiry investigation audit review report memo letter cable call video tape photograph recording leak " +
    "story article broadcast headline poll survey study deal treaty agreement accord bill ruling verdict judgment " +
    "warrant subpoena contract order raid strike vote election referendum protest march rally riot ceremony parade " +
    "summit meeting hearing trial case lawsuit complaint petition request proposal plan offer budget grant loan " +
    "festival concert exhibition fire flood storm earthquake explosion blast attack shooting bombing accident crash " +
    "collapse outbreak shutdown closure").split(/\s+/));
/**
 * The words that start a clause straight after the head: an auxiliary or a
 * common finite verb, a relative, or a preposition. "Man who negotiated",
 * "Facility stays open", "Roofing contract for the annex".
 */
export const OPENING_CLAUSE_STARTS = new Set(("is was has had have will would can could may might must should did does " +
    "says said came went got took made ran fell rose broke left sat stood held kept won lost sent began gave told " +
    "stays remains goes comes sits stands runs opens closes wants needs holds keeps looks seems faces shows reports " +
    "who that which whose " +
    "of in at for on from with near to into over under after before by outside inside across around off").split(/\s+/));
/**
 * Words whose presence at the head of a sentence means the phrase already has
 * its determiner, or is not a noun phrase at all: articles, demonstratives,
 * possessives, pronouns, quantifiers, numbers, prepositions and conjunctions.
 */
export const OPENING_DETERMINERS = new Set(("the a an this that these those our their your his her its my we they you i he she it there here every each no " +
    "some any all both either neither another such what which who whose whoever whatever when where while whether " +
    "if as at by for from in into of on onto over under with without after before since until about across against " +
    "along among around behind beyond during inside outside through toward towards upon within and but or nor so yet " +
    "not one two three four five six seven eight nine ten eleven twelve half most many few several").split(/\s+/));
