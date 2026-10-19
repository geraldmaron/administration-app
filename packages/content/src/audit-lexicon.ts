import { genericCharters, InstitutionKind, usaCharter, worldNations } from "@admin/world";
import { PLAYABLE_INSTITUTION_NAMES, PLAYABLE_REAL_NAMES } from "./audit-real-names.js";

// The word lists the content audit measures player copy against, and the
// matchers that apply them. Two kinds live here, for two different reasons.
//
// The world-derived lists — nation names, demonyms, capitals, charter
// institutions, cabinet chair titles — are generated from the dataset rather
// than typed out. A hand-maintained list of this kind rots the first time a
// nation or a charter is added and nobody remembers the list exists; deriving
// it means the day a nation joins the dataset, naming it in generic prose
// starts failing on its own.
//
// The real-world lists — news organizations, filler — are curated by hand,
// because nothing in the dataset knows about them. They are kept short and
// unambiguous on purpose: a false positive here blocks a publish, so an entry
// earns its place only if it is near-certainly wrong in player copy.

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word boundaries only where the literal's own edge is a word character, so
// "Washington, D.C." matches without the trailing dot breaking the anchor.
function bounded(literal: string, flags: string): RegExp {
  const head = /^\w/.test(literal) ? "\\b" : "";
  const tail = /\w$/.test(literal) ? "\\b" : "";
  return new RegExp(`${head}${escapeRegExp(literal)}${tail}`, flags);
}

/**
 * The first proper noun from `list` appearing in `text`, matched
 * case-sensitively — capitalization is what separates Turkey the nation from
 * turkey the bird, and China the nation from china the crockery.
 */
export function properNounIn(text: string, list: readonly string[]): string | undefined {
  return list.find((entry) => bounded(entry, "").test(text));
}

/** The first phrase from `list` appearing in `text`, ignoring case. */
export function phraseIn(text: string, list: readonly string[]): string | undefined {
  return list.find((entry) => bounded(entry, "i").test(text));
}

const allNations = [...worldNations];
const allCharters = [usaCharter, ...genericCharters];

/**
 * Every nation's name, demonym, and capital — the United States included. Generic
 * content names no country at all: it uses the binder's tokens, and the live
 * board decides who the scenario turned out to be about.
 */
export const NATION_PROPER_NOUNS: readonly string[] = [
  ...new Set(allNations.flatMap((nation) => [nation.identity.name, nation.identity.adjective, nation.identity.capital])),
].sort((a, b) => b.length - a.length);

/**
 * Every institution any charter names. A campaign founded under a junta has
 * no National Assembly and a parliamentary one has no Officer Corps Council,
 * so prose that names a body outright is only true for one charter in seven.
 */
export const CHARTER_INSTITUTIONS: readonly string[] = [
  ...new Set(allCharters.flatMap((charter) => charter.institutions.map((institution) => institution.name))),
].sort((a, b) => b.length - a.length);

function titleFromRoleId(roleId: string): string {
  return roleId
    .replace(/^role-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The titles the one charter a player can actually found under gives its own
 * cabinet — "Secretary of the Treasury", "Secretary of Defense".
 *
 * These are permitted in prose. The dataset ships one playable nation, and
 * `openingChoices` pins its charter from `identity.government` rather than
 * offering a choice, so every campaign in play runs under the same
 * constitution and these titles are simply what the cabinet screen says.
 *
 * Forbidding them is not cost-free. With no way to name a minister the corpus
 * reaches for "chair" — charter-neutral, and meaningless to a player who reads
 * "both chairs think it's theirs" and cannot tell whether that is two people,
 * two committees, or two pieces of furniture.
 *
 * Derived from `playable` rather than from a hardcoded charter id, so marking a
 * second nation playable widens what prose may say by exactly that nation's own
 * vocabulary — and narrows nothing, because a title only leaves this list when
 * no playable charter uses it.
 */
const PLAYABLE_CHARTERS = allCharters.filter((charter) =>
  worldNations.some((nation) => nation.playable && (nation.identity.government as string) === (charter.id as string)),
);

export const PLAYABLE_CHAIR_TITLES: readonly string[] = [
  ...new Set(PLAYABLE_CHARTERS.flatMap((charter) => Object.values(charter.roleTitles ?? {}))),
].sort((a, b) => b.length - a.length);

/**
 * The titles of the playable government's cabinet-rank officers beyond the
 * seats the charter actually models. The charter seats five roles; the United
 * States has fifteen executive departments and a row of cabinet-rank posts, and
 * a week about the ports or the farm belt has to be able to say who owns it.
 * Real titles, not inventions; allowed only while the United States is playable.
 */
export const PLAYABLE_GOVERNMENT_TITLES: readonly string[] = PLAYABLE_CHARTERS.some((charter) =>
  charter.id.includes("usa"),
)
  ? [
      "Secretary of State",
      "Secretary of the Treasury",
      "Secretary of Defense",
      "Attorney General",
      "Secretary of the Interior",
      "Secretary of Agriculture",
      "Secretary of Commerce",
      "Secretary of Labor",
      "Secretary of Health and Human Services",
      "Secretary of Housing and Urban Development",
      "Secretary of Transportation",
      "Secretary of Energy",
      "Secretary of Education",
      "Secretary of Veterans Affairs",
      "Secretary of Homeland Security",
      "Director of National Intelligence",
      "Director of the Budget",
      "Chief of Staff",
      "National Security Advisor",
      "Chairman of the Joint Chiefs",
      "Press Secretary",
      "Trade Representative",
      "Vice President",
      "Surgeon General",
      "Solicitor General",
    ]
  : [];

/** Whether a phrase is one the live constitution actually calls one of its own seats. */
export function isPlayableChairTitle(text: string): boolean {
  const wanted = text.trim().toLowerCase();
  return (
    PLAYABLE_CHAIR_TITLES.some((title) => title.toLowerCase() === wanted) ||
    PLAYABLE_GOVERNMENT_TITLES.some((title) => title.toLowerCase() === wanted)
  );
}

/**
 * The institutions the one charter a player can actually found under names its
 * own — "Congress", for the same reason `PLAYABLE_CHAIR_TITLES` names its own
 * chairs. A domestic scenario about the government the player actually holds
 * is not lying by naming the body that government has, because the dataset
 * ships one playable nation under one pinned charter. Refusing every
 * institution outright would only be right if several charters were reachable
 * and a named body were true for one of them.
 */
export const PLAYABLE_CHARTER_INSTITUTIONS: readonly string[] = [
  ...new Set(PLAYABLE_CHARTERS.flatMap((charter) => charter.institutions.map((institution) => institution.name))),
].sort((a, b) => b.length - a.length);

/** Whether a phrase is one the live constitution actually names as its own institution. */
export function isPlayableInstitution(text: string): boolean {
  const wanted = text.trim().toLowerCase();
  return PLAYABLE_CHARTER_INSTITUTIONS.some((name) => name.toLowerCase() === wanted);
}

/**
 * The chair titles the charters name, kept to the multi-word ones and to the
 * ones no playable charter uses. A bare
 * "President" or "Chancellor" is ordinary prose about somebody else's head of
 * state; "Foreign Minister" is this campaign's own cabinet, which a different
 * charter calls something else entirely.
 */
export const CABINET_CHAIR_TITLES: readonly string[] = [
  ...new Set(
    allCharters.flatMap((charter) => [
      ...charter.cabinetRoles.map((role) => titleFromRoleId(role)),
      // A charter's authored display titles are just as much this campaign's
      // own cabinet as the id-derived forms — "Secretary of State" leaks the
      // same way "Foreign Minister" does.
      ...Object.values(charter.roleTitles ?? {}),
    ]),
  ),
]
  .filter((title) => title.includes(" ") && !isPlayableChairTitle(title))
  .sort((a, b) => b.length - a.length);

/** Every institution kind the binder can fill a token for. */
export const INSTITUTION_KINDS: readonly InstitutionKind[] = InstitutionKind.options;

/**
 * The kinds every charter in the dataset actually has. A token for one of
 * these always resolves, so content may write it with no further ceremony; a
 * token for any other kind is only sometimes real, and content that uses one
 * has to say so. Derived rather than declared, so adding a charter without a
 * judiciary automatically demotes `judiciary` to gated.
 */
export const UNIVERSAL_INSTITUTION_KINDS: readonly InstitutionKind[] = INSTITUTION_KINDS.filter((kind) =>
  allCharters.every((charter) => charter.institutions.some((institution) => institution.kind === kind)),
);

/**
 * "Minister of Finance", "Secretary for Defense" — the same leak, phrased the
 * other way round. The tail takes every Title Case word that follows, so a
 * real multi-word title ("Director of National Intelligence") is captured
 * whole and can match the playable list, instead of being cut to "Director
 * of National" and refused forever.
 */
export const CABINET_TITLE_PATTERN =
  /\b(?:Minister|Ministry|Secretary|Director|Department)\s+(?:of|for)\s+(?:the\s+)?[A-Z]\w+(?:\s+(?:and\s+)?[A-Z]\w+)*/;

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
export const GENERIC_MINISTER_PATTERN = /\bministers?\b/i;

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
export const HONORIFIC_NAME_PATTERN =
  /\b(?:General|Colonel|Major|Captain|Sergeant|Admiral|Commander|Lieutenant|Marshal|Doctor|Dr\.|Professor|Senator|Governor|Ambassador|Reverend|Father|Sister|Rabbi|Sheikh|Mr\.|Mrs\.|Ms\.)\s+[A-Z][a-z]+\b/;

/**
 * Real outlets. The papers in this game are fictional and in-canon; a real
 * masthead in player copy breaks that in the one place a player would notice.
 */
export const NEWS_ORGANIZATIONS: readonly string[] = [
  "Agence France-Presse",
  "Al Jazeera",
  "Associated Press",
  "BBC",
  "Bloomberg",
  "CNBC",
  "CNN",
  "Der Spiegel",
  "Financial Times",
  "Fox News",
  "Le Monde",
  "MSNBC",
  "New York Times",
  "Newsweek",
  "NPR",
  "Politico",
  "Reuters",
  "Sky News",
  "TASS",
  "The Economist",
  "The Guardian",
  "Wall Street Journal",
  "Washington Post",
  "Xinhua",
];

/**
 * The only capitalized words generic prose may carry mid-sentence. Measured
 * over the whole shipped corpus: every legitimate mid-sentence capital was a
 * weekday or a month, and every other one was an invented proper noun — a
 * judge's surname, a cemetery's name — that rule 29 exists to keep out. "I"
 * rides along for completeness; the register barely uses it.
 */
export const ALLOWED_MID_SENTENCE_CAPITALS: ReadonlySet<string> = new Set([
  ...["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].flatMap((day) => [day, `${day}s`]),
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "I",
]);

/**
 * Every capitalized token the other proper-noun rules already own. A real
 * nation, a charter institution, a chair title, or a real outlet mid-sentence
 * is a finding those rules report with their own, better message — the
 * invented-name rule skips these so one defect never arrives as two findings.
 */

export const KNOWN_CAPITALIZED_TOKENS: ReadonlySet<string> = new Set(
  [
    ...NATION_PROPER_NOUNS,
    ...CHARTER_INSTITUTIONS,
    ...CABINET_CHAIR_TITLES,
    // Permitted in prose, so their capitals are not inventions either.
    ...PLAYABLE_CHAIR_TITLES,
    ...PLAYABLE_GOVERNMENT_TITLES,
    ...PLAYABLE_INSTITUTION_NAMES, ...PLAYABLE_REAL_NAMES,
    ...NEWS_ORGANIZATIONS.map((name) => name),
  ]
    .flatMap((entry) => entry.split(/[\s-]+/))
    .filter((word) => /^[A-Z]/.test(word)),
);

/**
 * A capitalized word standing where no sentence starts. Everything the board
 * can genuinely name arrives through a placeholder, so a mid-sentence capital
 * that is not a weekday, a month, or a token another rule owns is an invented
 * proper noun: a surname with no title to trip `HONORIFIC_NAME_PATTERN`
 * ("Seat Marchen"), a named cemetery, a district nobody rolled. Sentence
 * starts — after ., ?, !, or a colon, with an optional closing quote — are
 * skipped, because English capitalizes those for free.
 */
export function inventedProperNounIn(text: string): string | undefined {
  const clean = text.replace(/\{\{[^}]*\}\}/g, " ");
  for (const sentence of clean.split(/(?<=[.?!:])["'”’]?\s+/)) {
    for (const match of sentence.matchAll(/\b[A-Z][a-z]+\b/g)) {
      const word = match[0]!;
      // The sentence's own opening word is capitalized by grammar, not by
      // naming: skip a match with nothing but an opening quote before it.
      if (sentence.slice(0, match.index).replace(/["'“‘\s]/g, "") === "") continue;
      if (ALLOWED_MID_SENTENCE_CAPITALS.has(word)) continue;
      if (KNOWN_CAPITALIZED_TOKENS.has(word)) continue;
      return word;
    }
  }
  return undefined;
}

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
export const STILTED_WORDS: readonly string[] = [
  "adjudicate",
  "aforementioned",
  "ameliorate",
  "anteroom",
  "apprise",
  "cognizant",
  "comport",
  "effectuate",
  "emolument",
  "evince",
  "exigent",
  "forthwith",
  "heretofore",
  "hitherto",
  "malfeasance",
  "obligates",
  "obviate",
  "opprobrium",
  "peruse",
  "probity",
  "promulgate",
  "rectitude",
  "reciprocation",
  "remonstrate",
  "therein",
  "thereof",
  "unremarked",
  "whereupon",
  "vouchsafe",
];

/**
 * A reply announcing a continuing process: a review opened, an inquiry
 * convened, an investigation ordered. The announcement is a promise the game
 * has to keep — a player who orders a formal review of every chair's
 * disclosures and never hears of it again learns that scandals evaporate,
 * which is the opposite of what governance memory exists to teach. Matched
 * against reply text and remembered lines; the paired audit rule asks whether
 * anything ever reads the flag such a reply stamps.
 */
export const PROCESS_ANNOUNCEMENT: RegExp = new RegExp(
  "\\b(?:open|opens|opened|order|orders|ordered|launch|launches|launched|convene|convenes|convened|" +
    "form|forms|formed|announce|announces|announced|commission|commissions|commissioned|" +
    "stand up|stood up|turn(?:s|ed)? into)\\b[^.?!]{0,60}?" +
    "\\b(?:review|inquiry|inquest|investigation|audit|commission|tribunal|panel)\\b",
  "i",
);

/** Register breaks: a head of government's cabinet does not talk like this. */
export const FILLER_PHRASES: readonly string[] = [
  "at the end of the day",
  "big time",
  "circle back",
  "double down",
  "folks",
  "game-changer",
  "kick the can",
  "let's be real",
  "low-hanging fruit",
  "no-brainer",
  "reach out to them",
  "touch base",
  "win-win",
];

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
export const HEDGE_MARKERS: readonly string[] = [
  "a defector",
  "a single channel",
  "a single report",
  "a single source",
  "allegedly",
  "cannot be confirmed",
  "cannot confirm",
  "cannot verify",
  "hearsay",
  "never independently confirmed",
  "no independent confirmation",
  "not been confirmed",
  "not been independently confirmed",
  "not independently confirmed",
  "one defector",
  "one source",
  "purportedly",
  "reportedly",
  "single-sourced",
  "unconfirmed",
  "uncorroborated",
  "unverified",
  "without corroboration",
  "without independent confirmation",
];

// The words a doubt has to be *about* before it counts as one.
//
// "Disputed" and "disagree" are two of the commonest words in this corpus and
// almost never about sourcing: the disputed side of a border, the chiefs who
// disagree about what to do. Listing them as bare literals is what let a marked
// briefing carrying no tell at all clear the fairness gate — a lie shipping
// unmarked, which is the exact unfairness the marker exists to prevent. So the
// doubt is matched as a relation instead: something whose job is to know is the
// thing in doubt, or the thing in doubt is a piece of reporting.

/** The parts of a government whose job is to know, and the paper they hand up. */
const SOURCING_NOUN =
  "(?:sources?|sourcing|services?|agenc(?:y|ies)|desks?|stations?|analysts?|labs?|examiners?|reports?|reporting|assessments?|estimates?|figures?|accounts?|intercepts?|channels?|files?|numbers?)";

/**
 * Reporting product alone. Narrower than the list above because this one stands
 * as the *object* of a doubt verb, where "claim" and "account" turn political:
 * disputing a neighbor's account of a border incident says nothing about how
 * well sourced anybody's own briefing is.
 */
const SOURCING_PRODUCT = "(?:sources?|sourcing|reporting|reports?|assessments?|estimates?|figures?|intercepts?|files?)";

// A cabinet speaks with contractions, so the negated forms have to be matched
// in the shape a writer actually types them. Spelling only the expanded form
// rejected "two analysts that won't sign the same word" — a clear tell, written
// in the voice the brief asks for — and pushed writers into stiffer prose to
// satisfy the matcher. Both curly and straight apostrophes, because prose
// arrives with either.
const APOS = "['’]";
const NEGATED = `(?:${["will not", "would not", `won${APOS}t`, `wouldn${APOS}t`].join("|")})`;
const DOES_NOT = `(?:${["does not", "do not", "did not", `doesn${APOS}t`, `don${APOS}t`, `didn${APOS}t`].join("|")})`;

const DOUBT_VERB =
  "(?:disputes?|disputed|disputing|contests?|contested|contesting|disagrees?|disagreed|" +
  `${DOES_NOT} agree|` +
  `${NEGATED} sign|${NEGATED} stand behind|${NEGATED} confirm|` +
  "declines? to confirm|declined to confirm)";

/**
 * The sourcing sense of a doubt, in the three shapes a briefing writes it:
 * the doubter named first ("the second service disputes it", "the estimate is
 * contested"), named after the verb ("disputed by the second service"), or the
 * doubted paper named after it ("disputes the estimate"). Up to two words may
 * intervene, which reaches "the figure is quietly disputed" without reaching
 * across the punctuation that ends a clause.
 */
export const HEDGE_PATTERNS: readonly RegExp[] = [
  new RegExp(`\\b${SOURCING_NOUN}\\s+(?:\\w+\\s+){0,2}${DOUBT_VERB}\\b`, "i"),
  new RegExp(`\\b${DOUBT_VERB}\\s+by\\s+(?:\\w+\\s+){0,2}${SOURCING_NOUN}\\b`, "i"),
  new RegExp(`\\b${DOUBT_VERB}\\s+(?:\\w+\\s+){0,2}${SOURCING_PRODUCT}\\b`, "i"),
];

/** Three phrasings a writer can copy, quoted by the generation brief beside the literals. */
export const HEDGE_RELATION_EXAMPLES: readonly string[] = [
  "the second service disputes it",
  "the estimate is contested by the desk that produced it",
  "the two reports do not agree",
];

/** The tell this passage carries, whether it is one of the literals or the relation. */
export function hedgeIn(text: string): string | undefined {
  const literal = phraseIn(text, HEDGE_MARKERS);
  if (literal) return literal;
  for (const pattern of HEDGE_PATTERNS) {
    const found = pattern.exec(text)?.[0];
    if (found) return found.trim();
  }
  return undefined;
}

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
export const MISSED_CHECK_MARKERS: readonly string[] = [
  "had anyone",
  "if anyone had",
  "nobody asked",
  "nobody checked",
  "nobody had asked",
  "nobody looked",
  "nobody ordered",
  "nobody read",
  "nobody requested",
  "nobody sought",
  "no one asked",
  "no one checked",
  "no one looked",
  "no one read",
  "no one requested",
  "no one sought",
  "never opened",
  "never ordered",
  "never read",
  "never requested",
  "sat unopened",
  "sat unread",
  "was never read",
  "was never sought",
  "went unread",
  "would have caught",
  "would have shown",
  "would have said",
  "would have told",
];

/** Subjects that describe having a scenario rather than describing this one. */
export const GENERIC_SUBJECT_PHRASES: readonly string[] = [
  "a crisis unfolds",
  "a delicate situation",
  "a difficult decision",
  "a matter of concern",
  "a tough choice",
  "an important decision",
  "the situation is developing",
  "things escalate",
  "tensions are high",
  "tensions rise",
];

/**
 * Stand-in metros a domestic week must not use once the gazetteer can name
 * the place. Bind `locus.city` and write `{{city}}`; these phrases are the
 * industrial zone as flavor.
 */
export const GENERIC_PLACE_PHRASES: readonly string[] = [
  "industrial zone",
  "the district",
  "provincial city",
  "the plant city",
  "a provincial capital",
  "the rust-belt city",
  "commuter belt",
];

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
export const CONSEQUENCE_FAILURE_HARM_FLOOR = { success: 0.06, partial: 0.18 } as const;

/**
 * How many cards each cell of the instrument × band × valence matrix wants
 * before it stops repeating itself. One is the floor the audit refuses below;
 * this is the depth at which a player stops recognizing the line.
 */
export const CONSEQUENCE_COVERAGE_TARGET = 3;

/** Doubled function words — the commonest typo a generator makes, and invisible on a reread. */
export const DOUBLED_WORDS: readonly string[] = [
  "and and",
  "a a",
  "an an",
  "in in",
  "is is",
  "it it",
  "of of",
  "the the",
  "to to",
  "we we",
];

/**
 * Nouns that, standing next to a figure, turn prose into a specific country's
 * balance sheet. Generic content says "a mid-sized economy", never the number.
 */
export const CAPABILITY_NOUNS: readonly string[] = [
  "aircraft",
  "barrels",
  "budget",
  "citizens",
  "debt",
  "deficit",
  "economy",
  "exports",
  "gdp",
  "imports",
  "inhabitants",
  "population",
  "reserves",
  "reservists",
  "soldiers",
  "tanks",
  "troops",
  "warheads",
  "warships",
];

/** A figure with a magnitude behind it, as opposed to a date, a count of hours, or a percentage. */
export const MAGNITUDE_FIGURE = /\b\d[\d,.]*\s*(?:thousand|million|billion|trillion)\b|\$\s?\d/i;

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
export const NUMERAL_FIGURE = /(?:[$£€¥₽₹]\s?)?\d[\d,.]*\s?%?|[$£€¥₽₹]/;

const SPELLED_NUMBER =
  "(?:a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|several)";
const MAGNITUDE_WORD = "(?:hundred|thousand|million|billion|trillion)";

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
export const SPELLED_CAPABILITY_FIGURE = new RegExp(
  `\\b${SPELLED_NUMBER}\\s+${MAGNITUDE_WORD}\\s+(?:\\w+\\s+){0,3}(?:${CAPABILITY_NOUNS.join("|")})\\b`,
  "i",
);

// --- Briefing register ------------------------------------------------------

/**
 * A clock reading: the hour something happened or is due, in any of the forms
 * player copy is allowed to write one. Numerals are already refused in prose
 * by `NUMERAL_FIGURE`, so the spelled forms are the ones that reach a reader.
 */
export const CLOCK_TIME =
  /\b(?:at|by|since|from|before|after)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|midnight|noon|dawn|first light|dusk|nightfall)\b|\b\d{1,2}[:.]\d{2}\b/i;

/**
 * The vocabulary of a duty log: shifts, rosters, gates, the machinery of a
 * working day. These words are not wrong in a scenario — a strike is *about*
 * shifts, and the detail is what makes a scene concrete. What they cannot be
 * is the subject of the sentence a head of government is opened with.
 */
export const ROUTINE_OPERATIONS_NOUNS: readonly string[] = [
  "clock on",
  "clocked on",
  "clock in",
  "clocked in",
  "shift",
  "shifts",
  "night shift",
  "dawn shift",
  "roster",
  "rosters",
  "rota",
  "depot",
  "depots",
  "quay",
  "quays",
  "yard",
  "yards",
  "gate crew",
  "picket",
  "pickets",
  "turnstile",
  "turnstiles",
  "timetable",
  "headcount",
  "manifest",
];

/**
 * A bare count of operational units — "seventeen depots of twenty", "two in
 * three shifts". Distinct from `SPELLED_CAPABILITY_FIGURE`, which is about
 * quoting a nation's strength; this is about quoting the state of a working
 * day, which is a register problem rather than a world-neutrality one.
 */
export const OPERATIONAL_COUNT = new RegExp(
  `\\b${SPELLED_NUMBER}\\s+(?:in|of|out of)\\s+${SPELLED_NUMBER}\\b|\\b${SPELLED_NUMBER}\\s+(?:${ROUTINE_OPERATIONS_NOUNS.map(escapeRegExp).join("|")})\\b`,
  "i",
);

/**
 * The vocabulary of the ultimatum: a decision being put on a timer by the
 * prose rather than by the fiction. None of these phrases is wrong in a
 * critical week — a currency run really does end when the markets open — but a
 * routine week that carries one has been dressed up as a thriller, and a
 * corpus where every week talks like this has one volume. Matched
 * case-insensitively, whole phrases, by `phraseIn`.
 */
export const COUNTDOWN_PHRASES: readonly string[] = [
  "you have until",
  "hours to decide",
  "by tonight",
  "by morning",
  "by nightfall",
  "by the weekend",
  "before the markets open",
  "the clock is",
  "out of time",
  "running out of time",
];

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
export const UNNAMED_CAPABILITY =
  /\b(?:send|sends|deploy|deploys|order|orders|launch|launches|commit|commits|put|puts|scramble|scrambles)\s+(?:in\s+)?the\s+(?:team|teams|unit|units|crew|crews|men|guys|boys|operators|assets|package|kit)\b/i;
