import { InstitutionKind } from "@admin/world";
/**
 * The first proper noun from `list` appearing in `text`, matched
 * case-sensitively — capitalization is what separates Turkey the nation from
 * turkey the bird, and China the nation from china the crockery.
 */
export declare function properNounIn(text: string, list: readonly string[]): string | undefined;
/** The first phrase from `list` appearing in `text`, ignoring case. */
export declare function phraseIn(text: string, list: readonly string[]): string | undefined;
/**
 * Every nation's name, demonym, and capital — the United States included. Generic
 * content names no country at all: it uses the binder's tokens, and the live
 * board decides who the scenario turned out to be about.
 */
export declare const NATION_PROPER_NOUNS: readonly string[];
/**
 * Every institution any charter names. A campaign founded under a junta has
 * no National Assembly and a parliamentary one has no Officer Corps Council,
 * so prose that names a body outright is only true for one charter in seven.
 */
export declare const CHARTER_INSTITUTIONS: readonly string[];
export declare const PLAYABLE_CHAIR_TITLES: readonly string[];
/**
 * The titles of the playable government's cabinet-rank officers beyond the
 * seats the charter actually models. The charter seats five roles; the United
 * States has fifteen executive departments and a row of cabinet-rank posts, and
 * a week about the ports or the farm belt has to be able to say who owns it.
 * Real titles, not inventions; allowed only while the United States is playable.
 */
export declare const PLAYABLE_GOVERNMENT_TITLES: readonly string[];
/** Whether a phrase is one the live constitution actually calls one of its own seats. */
export declare function isPlayableChairTitle(text: string): boolean;
/**
 * The institutions the one charter a player can actually found under names its
 * own — "Congress", for the same reason `PLAYABLE_CHAIR_TITLES` names its own
 * chairs. A domestic scenario about the government the player actually holds
 * is not lying by naming the body that government has, because the dataset
 * ships one playable nation under one pinned charter. Refusing every
 * institution outright would only be right if several charters were reachable
 * and a named body were true for one of them.
 */
export declare const PLAYABLE_CHARTER_INSTITUTIONS: readonly string[];
/** Whether a phrase is one the live constitution actually names as its own institution. */
export declare function isPlayableInstitution(text: string): boolean;
/**
 * The chair titles the charters name, kept to the multi-word ones and to the
 * ones no playable charter uses. A bare
 * "President" or "Chancellor" is ordinary prose about somebody else's head of
 * state; "Foreign Minister" is this campaign's own cabinet, which a different
 * charter calls something else entirely.
 */
export declare const CABINET_CHAIR_TITLES: readonly string[];
/** Every institution kind the binder can fill a token for. */
export declare const INSTITUTION_KINDS: readonly InstitutionKind[];
/**
 * The kinds every charter in the dataset actually has. A token for one of
 * these always resolves, so content may write it with no further ceremony; a
 * token for any other kind is only sometimes real, and content that uses one
 * has to say so. Derived rather than declared, so adding a charter without a
 * judiciary automatically demotes `judiciary` to gated.
 */
export declare const UNIVERSAL_INSTITUTION_KINDS: readonly InstitutionKind[];
/**
 * "Minister of Finance", "Secretary for Defense" — the same leak, phrased the
 * other way round. The tail takes every Title Case word that follows, so a
 * real multi-word title ("Director of National Intelligence") is captured
 * whole and can match the playable list, instead of being cut to "Director
 * of National" and refused forever.
 */
export declare const CABINET_TITLE_PATTERN: RegExp;
/**
 * "the minister", "our finance minister" — the word alone, any case, with no
 * multi-word chair name attached to trip `CABINET_CHAIR_TITLES` or
 * `CABINET_TITLE_PATTERN`, both of which only match Title Case. Not every
 * charter's chairs are called that — the US constitutional charter, among
 * others, calls them Secretaries (`Charter.roleTitles`) — so "minister" reads
 * true for some campaigns and false for others exactly like a hardcoded
 * chair name does. Scoped to domestic (`cast: "none"`) scenarios only: there
 * is exactly one government in that fiction, so the word can only mean the
 * player's own cabinet and the reading is unambiguous. A scenario with a
 * counterpart may still legitimately say "their foreign minister" — that
 * sentence is about somebody else's charter, which this game does not model
 * down to the chair-title level, and stays allowed.
 */
export declare const GENERIC_MINISTER_PATTERN: RegExp;
/**
 * "General Marks", "Dr. Reeves" — a specific fictional individual invented in
 * prose, outside the cabinet-chair vocabulary above. Nobody but the seated
 * cast exists at generation time: people are drawn from a per-campaign
 * name-pool roll (`generateNationPool`), so a title welded to a surname names
 * someone who is guaranteed not to exist in most campaigns. A role or
 * function ("the general who ran the facility", "the government's most
 * visible critic") is the sanctioned way to point at someone without naming
 * them. Two capitalized words in a row keeps this narrow — a lowercase
 * second word ("general strike") never matches.
 */
export declare const HONORIFIC_NAME_PATTERN: RegExp;
/**
 * Real outlets. The papers in this game are fictional and in-canon; a real
 * masthead in player copy breaks that in the one place a player would notice.
 */
export declare const NEWS_ORGANIZATIONS: readonly string[];
/**
 * The only capitalized words generic prose may carry mid-sentence. Measured
 * over the whole shipped corpus: every legitimate mid-sentence capital was a
 * weekday or a month, and every other one was an invented proper noun — a
 * judge's surname, a cemetery's name — that rule 29 exists to keep out. "I"
 * rides along for completeness; the register barely uses it.
 */
export declare const ALLOWED_MID_SENTENCE_CAPITALS: ReadonlySet<string>;
/**
 * Every capitalized token the other proper-noun rules already own. A real
 * nation, a charter institution, a chair title, or a real outlet mid-sentence
 * is a finding those rules report with their own, better message — the
 * invented-name rule skips these so one defect never arrives as two findings.
 */
export declare const KNOWN_CAPITALIZED_TOKENS: ReadonlySet<string>;
/**
 * A capitalized word standing where no sentence starts. Everything the board
 * can genuinely name arrives through a placeholder, so a mid-sentence capital
 * that is not a weekday, a month, or a token another rule owns is an invented
 * proper noun: a surname with no title to trip `HONORIFIC_NAME_PATTERN`
 * ("Seat Marchen"), a named cemetery, a district nobody rolled. Sentence
 * starts — after ., ?, !, or a colon, with an optional closing quote — are
 * skipped, because English capitalizes those for free.
 */
export declare function inventedProperNounIn(text: string): string | undefined;
/**
 * Words a plain-spoken briefing does not reach for. None of them is wrong —
 * each has a meaning — but every one has a plainer way to be said, and a room
 * where ministers say "anteroom" and "obligates" reads as costume drama
 * rather than as people. Curated from a corpus scan rather than imagined:
 * each entry either appeared in shipped content and read stiff, or is the
 * classic bureaucratic reach a generator makes when it is writing "important".
 * A warning, not an error — a single word is a writer's call; the list exists
 * so the call is made on purpose.
 */
export declare const STILTED_WORDS: readonly string[];
/**
 * A reply announcing a continuing process: a review opened, an inquiry
 * convened, an investigation ordered. The announcement is a promise the game
 * has to keep — a player who orders a formal review of every chair's
 * disclosures and never hears of it again learns that scandals evaporate,
 * which is the opposite of what governance memory exists to teach. Matched
 * against reply text and remembered lines; the paired audit rule asks whether
 * anything ever reads the flag such a reply stamps.
 */
export declare const PROCESS_ANNOUNCEMENT: RegExp;
/** Register breaks: a head of government's cabinet does not talk like this. */
export declare const FILLER_PHRASES: readonly string[];
/**
 * The tell on a briefing that can turn out to be wrong.
 *
 * Every entry names *how well sourced* a claim is, not how likely it is. That
 * distinction is the whole rule: "the timing is uncertain" is a forecast and
 * tells a player nothing about whether to go and check, while "the second
 * service disputes it" points at a specific unread file. A list that accepted
 * ordinary hedging would let a marked scenario pass its fairness rule on prose
 * carrying no tell at all, and the player would be reading noise.
 *
 * Kept tight and unambiguous for the usual reason a curated list is: a false
 * positive here lets a lie ship unmarked, which is exactly the unfairness the
 * marker exists to prevent.
 */
export declare const HEDGE_MARKERS: readonly string[];
/**
 * The sourcing sense of a doubt, in the three shapes a briefing writes it:
 * the doubter named first ("the second service disputes it", "the estimate is
 * contested"), named after the verb ("disputed by the second service"), or the
 * doubted paper named after it ("disputes the estimate"). Up to two words may
 * intervene, which reaches "the figure is quietly disputed" without reaching
 * across the punctuation that ends a clause.
 */
export declare const HEDGE_PATTERNS: readonly RegExp[];
/** Three phrasings a writer can copy, quoted by the generation brief beside the literals. */
export declare const HEDGE_RELATION_EXAMPLES: readonly string[];
/** The tell this passage carries, whether it is one of the literals or the relation. */
export declare function hedgeIn(text: string): string | undefined;
/**
 * The phrases that name a check nobody ran.
 *
 * A reveal card exists to tell a player their briefing was wrong, and the third
 * fairness rule is that it must also tell them what would have caught it —
 * "the attaché's report, which nobody asked to see, said the trucks were
 * empty". Without that, a reveal is the game announcing it fooled you, which
 * teaches nothing and is precisely the unfairness-dressed-as-depth this whole
 * mechanism refuses. With it, the player learns a move.
 *
 * Every entry is a phrase about a document or a question that existed and was
 * not consulted — never merely about being wrong, because being wrong is what
 * the card already says.
 */
export declare const MISSED_CHECK_MARKERS: readonly string[];
/** Subjects that describe having a scenario rather than describing this one. */
export declare const GENERIC_SUBJECT_PHRASES: readonly string[];
/**
 * Stand-in metros a domestic week must not use once the gazetteer can name
 * the place. Bind `locus.city` and write `{{city}}`; these phrases are the
 * industrial zone as flavor.
 */
export declare const GENERIC_PLACE_PHRASES: readonly string[];
/**
 * How hard a consequence card of a given valence may bite before it stops
 * reading as that valence at all. Harm is measured on one normalized scale —
 * every metric, relationship and grudge movement that costs the player
 * something, with treasury divided by its reference so a currency figure and a
 * zero-to-one score can be added together honestly.
 *
 * A success card that takes more than a fifteenth off the board is not a
 * success being narrated, it is a failure filed under the wrong valence, and a
 * player reading "it worked" while the numbers fall is being lied to. Exported
 * so the generation brief quotes the bound the validator enforces rather than a
 * remembered copy of it.
 */
export declare const CONSEQUENCE_FAILURE_HARM_FLOOR: {
    readonly success: 0.06;
    readonly partial: 0.18;
};
/**
 * How many cards each cell of the instrument × band × valence matrix wants
 * before it stops repeating itself. One is the floor the audit refuses below;
 * this is the depth at which a player stops recognizing the line.
 */
export declare const CONSEQUENCE_COVERAGE_TARGET = 3;
/** Doubled function words — the commonest typo a generator makes, and invisible on a reread. */
export declare const DOUBLED_WORDS: readonly string[];
/**
 * Nouns that, standing next to a figure, turn prose into a specific country's
 * balance sheet. Generic content says "a mid-sized economy", never the number.
 */
export declare const CAPABILITY_NOUNS: readonly string[];
/** A figure with a magnitude behind it, as opposed to a date, a count of hours, or a percentage. */
export declare const MAGNITUDE_FIGURE: RegExp;
/**
 * A digit or a currency mark anywhere in player copy.
 *
 * Prose a player is meant to feel writes the number the way a person says it
 * out loud: "five million dollars", "eleven children", "a third of the fleet".
 * "$5 million" is a cell from a spreadsheet — it reads as reporting about a
 * government rather than as the room the player is sitting in.
 *
 * A currency mark is refused for a second reason on top of register: the
 * world names no real country, so it has no dollar, pound, or euro to spend.
 */
export declare const NUMERAL_FIGURE: RegExp;
/**
 * The same capability claim as `MAGNITUDE_FIGURE`, written out in words.
 *
 * Spelling numbers out is required of player copy (`NUMERAL_FIGURE`), and on
 * its own that would have opened a hole in the rule above: "40 thousand
 * troops" is refused while "forty thousand troops" would not have been, and
 * both are true of exactly one nation and false of whoever gets cast.
 *
 * Adjacency rather than the same sentence, because the sentence is too coarse
 * a window. "four million routed offshore ... while the budget speech promised
 * belt-tightening" puts a magnitude and a capability noun in one sentence and
 * is correct writing — the sum is a bribe, not the national budget. Three
 * intervening words reaches "five thousand of their best soldiers" without
 * reaching across a clause boundary.
 */
export declare const SPELLED_CAPABILITY_FIGURE: RegExp;
/**
 * A clock reading: the hour something happened or is due, in any of the forms
 * player copy is allowed to write one. Numerals are already refused in prose
 * by `NUMERAL_FIGURE`, so the spelled forms are the ones that reach a reader.
 */
export declare const CLOCK_TIME: RegExp;
/**
 * The vocabulary of a duty log: shifts, rosters, gates, the machinery of a
 * working day. These words are not wrong in a scenario — a strike is *about*
 * shifts, and the detail is what makes a scene concrete. What they cannot be
 * is the subject of the sentence a head of government is opened with.
 */
export declare const ROUTINE_OPERATIONS_NOUNS: readonly string[];
/**
 * A bare count of operational units — "seventeen depots of twenty", "two in
 * three shifts". Distinct from `SPELLED_CAPABILITY_FIGURE`, which is about
 * quoting a nation's strength; this is about quoting the state of a working
 * day, which is a register problem rather than a world-neutrality one.
 */
export declare const OPERATIONAL_COUNT: RegExp;
/**
 * The vocabulary of the ultimatum: a decision being put on a timer by the
 * prose rather than by the fiction. None of these phrases is wrong in a
 * critical week — a currency run really does end when the markets open — but a
 * routine week that carries one has been dressed up as a thriller, and a
 * corpus where every week talks like this has one volume. Matched
 * case-insensitively, whole phrases, by `phraseIn`.
 */
export declare const COUNTDOWN_PHRASES: readonly string[];
/**
 * Authorizing a capability the player was never shown.
 *
 * "Send the team" is the shape: a definite article pointing at a force that
 * appears nowhere in the briefing, the particulars, or the cabinet's words. A
 * head of government is not handed "the team" — they are told what exists and
 * asked to commit a named thing to a named place, and the whole weight of the
 * decision is in which named thing. The vague form reads like a line from a
 * thriller rather than an order anyone could actually give, and it hides the
 * one fact the choice turns on.
 *
 * Matched as verb-plus-bare-noun rather than as the noun alone, so "send the
 * rescue team" and "order the marine detachment in" pass: the defect is the
 * missing qualifier, not the word.
 */
export declare const UNNAMED_CAPABILITY: RegExp;
