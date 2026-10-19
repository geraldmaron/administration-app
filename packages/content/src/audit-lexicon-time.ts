// The words commit-time copy uses to claim that time has passed.
//
// A rejoinder, a remembered line, a press headline and the inaction text all
// reach the player the moment a decision is committed, and nothing has happened
// yet. A line that says "eleven weeks later a researcher published" is shown on
// day zero, and the next Continue, seven days on, contradicts it. These lists
// name the shapes that make that claim, and the two that don't: a forecast
// ("it could take months") and a precedent ("the last time, it took years").
//
// The shapes are split by how sure the match is. An anchored shape pins the
// narration to a point after the decision: "months later", "the following
// year", "by spring", "over the coming months", "next quarter". A soft shape
// states a duration without saying when it ran, like "spent months" or "took
// four months". It is usually a flash-forward, but not always.

const SPELLED =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|" +
  "seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen";

/** Ordinals by value, for "in the third week": the interval run is one fewer unit than the ordinal names. */
export const ORDINAL_VALUES: Readonly<Record<string, number>> = {
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};

const ORDINAL = `(?:${Object.keys(ORDINAL_VALUES).join("|")}|\\d+(?:st|nd|rd|th))`;

/** How many, when a count is given. Vague counts ("a few", "several") are here and read as three. */
export const TIME_COUNT = `(?:\\d+|a couple of|couple of|a few|a dozen|half a|several|some|many|few|(?:${SPELLED})(?:[\\s-]+(?:${SPELLED}))*|an?)`;

/** A count that is said, not implied: "after a week" and "after years of" are too often backstory to be read as an interval. */
const STATED_COUNT = `(?:\\d+|a couple of|couple of|a few|a dozen|half a|several|(?:${SPELLED})(?:[\\s-]+(?:${SPELLED}))*)`;

const UNIT = "(?:days?|nights?|weeks?|fortnights?|months?|quarters?|seasons?|years?|decades?)";
// "Spring tides" are a height of water, not a season.
const SEASON = "(?:spring(?![\\s-]+tides?\\b)|summer|autumn|fall|winter|harvest)";
const MONTH = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
// A holiday is a proper noun, so it is matched with its capitals.
const HOLIDAY =
  "(?:Christmas(?:\\s+(?:Eve|Day))?|Thanksgiving|Easter|Halloween|Labor\\s+Day|Memorial\\s+Day|Independence\\s+Day|Veterans\\s+Day|" +
  "New\\s+Year['’]s(?:\\s+(?:Day|Eve))?|the\\s+Fourth\\s+of\\s+July|July\\s+Fourth|Hanukkah|Ramadan|Passover)";
// Past tense near an interval is what makes "in eleven weeks" a report rather than a term.
// "-ed" words are taken only where the letter before is not an "e", so "need" and "speed" are not verbs here.
const PAST =
  "(?:was|were|had|did|came|went|found|made|took|gave|got|won|lost|built|paid|sold|fell|rose|ran|began|broke|left|" +
  "brought|bought|held|kept|met|sent|spent|stood|told|became|\\w+(?<!e)ed)";
/** A past-tense verb that is not the participle of a present passive ("are published", "is signed"). */
const PAST_AT = `(?<!\\b(?:is|are|be|been|being|gets?)\\s)\\b${PAST}\\b`;
/**
 * The words between a verb and its interval, inside one clause: a comma, "and",
 * "but" or a present "is" starts another clause, whose verb ("and the first
 * units arrive in two weeks") is the one the interval belongs to.
 */
const clauseGap = (max: number) => `(?:(?!\\b(?:and|but|while|so|is|are)\\b)[^.;:!?,]){0,${max}}?`;

/** Days in one of each unit. A season is a quarter of a year for this purpose. */
export const DAYS_PER_UNIT: Readonly<Record<string, number>> = {
  day: 1,
  night: 1,
  week: 7,
  fortnight: 14,
  month: 30,
  quarter: 91,
  season: 91,
  year: 365,
  decade: 3650,
};

/** Any interval longer than this is out of reach of one Continue, and is an error when anchored. */
export const COMMIT_WINDOW_DAYS = 7;

/** An interval this short is still the night of the decision: "the next morning", "the following day". */
export const SAME_NIGHT_DAYS = 1;

/**
 * A shape, the groups its interval is read from, and which tier it belongs to.
 * `count` and `unit` name capture groups; a shape without a unit group names a
 * point a season or more away and is read as one.
 */
export type TimeShape = {
  readonly name: string;
  readonly pattern: RegExp;
  readonly anchored: boolean;
  /**
   * Whether a sentence that ends its interval at the decision ("had been sealed
   * for eight months") clears it. Every soft shape defers; so do the anchored
   * shapes whose words also tell backstory ("closed after thirty years").
   */
  readonly excusedUpToNow: boolean;
};

const shape = (name: string, source: string, anchored: boolean, flags = "gi", excusedUpToNow = !anchored): TimeShape => ({
  name,
  pattern: new RegExp(source, flags),
  anchored,
  excusedUpToNow,
});

export const TIME_SHAPES: readonly TimeShape[] = [
  // "eleven weeks later", "months later", "a year afterward", "three weeks on,"
  shape("later", `\\b(?:(?<count>${TIME_COUNT})[\\s-]+)?(?<unit>${UNIT})\\s+(?:later|afterwards?|on(?=\\s*,))\\b`, true),
  // "later that year", "later the same month"
  shape("later-that", `\\blater\\s+(?:that|the\\s+same|in\\s+the)\\s+(?<unit>day|night|morning|evening|week|month|quarter|season|year|${SEASON})\\b`, true),
  // "the following year", "the next twelve months", "over the coming months", "next quarter".
  // Not the budget year as a thing ("next year's money", "next year is intact",
  // "its next quarter"), and not the term of an act ("for the next three years").
  shape(
    "following",
    `(?<!\\b(?:its|their|our|his|her|your|my|for|through|across)\\s+(?:the\\s+)?)\\b(?:the\\s+)?(?:following|next|coming|ensuing|subsequent)\\s+(?:(?<count>${TIME_COUNT})\\s+)?(?<unit>${UNIT}|${SEASON}|morning|evening)\\b(?!['’]s|\\s+(?:is|was|are|were|has|had|have)\\b)`,
    true,
  ),
  // "by spring", "that autumn", "in the fall", "come spring"
  shape("season", `\\b(?:by|that|in|come)\\s+(?:the\\s+)?(?:(?:early|late|mid)[\\s-])?${SEASON}\\b(?!\\s+of\\b)`, true),
  // "by March", "that October", "the following June": a month is a proper noun, so matched with its capital.
  shape("month", `\\b(?:[Bb]y|[Tt]hat|[Tt]he following|[Tt]he next)\\s+${MONTH}\\b`, true, "g"),
  // "by the end of the year", "by year's end", "by the new year"
  shape(
    "period-end",
    `\\bby\\s+(?:the\\s+)?(?:(?:end|close|turn)\\s+of\\s+(?:the|that)\\s+(?<unit>week|month|quarter|season|year)|year['’]s\\s+end|year[\\s-]end|new\\s+year)\\b`,
    true,
  ),
  // "inside eight weeks", "within the month", "in under a year"
  shape(
    "within",
    `\\b(?:inside|within|in\\s+under|in\\s+less\\s+than|in\\s+fewer\\s+than)\\s+(?:(?<count>${TIME_COUNT}|the|that)\\s+)?(?<unit>${UNIT})\\b`,
    true,
  ),
  // "After six months, the program was dismantled."
  shape("after-lead", `^\\s*after\\s+(?<count>${STATED_COUNT})\\s+(?<unit>${UNIT})\\b`, true, "gi", true),
  // "the vote carried after five weeks", "the strike collapsed after two weeks of". Not a present
  // headline about backstory ("retires after nineteen years of service"), nor an act's own term.
  shape("after-past", `${PAST_AT}${clauseGap(40)}\\bafter\\s+(?<count>${STATED_COUNT})\\s+(?<unit>${UNIT})\\b`, true, "gi", true),
  // "found it in eleven weeks", "raised its half in seven months"
  shape("in-past", `${PAST_AT}${clauseGap(40)}\\bin\\s+(?<count>${STATED_COUNT})\\s+(?<unit>${UNIT})\\b`, true, "gi", true),
  // "In eight weeks the convictions were in"
  shape(
    "in-past-lead",
    `^\\s*in\\s+(?<count>${STATED_COUNT})\\s+(?<unit>${UNIT})\\b,?\\s+${clauseGap(60)}${PAST_AT}`,
    true,
    "gi",
    true,
  ),
  // "weeks passed", "months went by", "half a year passed before"
  shape(
    "passed",
    `\\b(?:(?<count>${TIME_COUNT})\\s+)?(?<unit>${UNIT})\\s+(?:had\\s+)?(?:passed|went\\s+by|slipped\\s+by|dragged\\s+(?:by|on)|wore\\s+on|elapsed|rolled\\s+by|crept\\s+by)\\b`,
    true,
  ),
  // "nine days of foot traffic passed", "three weeks of talks went by"
  shape(
    "passed-of",
    `\\b(?:(?<count>${TIME_COUNT})\\s+)?(?<unit>${UNIT})\\s+of\\s+(?:[a-z'’-]+\\s+){1,4}?(?:had\\s+)?(?:passed|went\\s+by|slipped\\s+by|dragged\\s+(?:by|on)|wore\\s+on|elapsed|rolled\\s+by|crept\\s+by)\\b`,
    true,
  ),
  // "in the third week the guards stopped", "the strike ended in its second
  // month". Only beside a past-tense verb in the same clause: "animals that
  // have to be sold in the third week" is a schedule, and the present or the perfect ("is in its
  // third week", "has been in its second month") is true tonight.
  shape(
    "ordinal",
    `(?<!\\b(?:is|are|now|still|already|been)\\s+)\\b(?:in|by|into|during|through)\\s+(?:the|its|their|that)\\s+(?<ordinal>${ORDINAL})\\s+(?<unit>day|night|week|month|quarter|season|year)\\b(?:(?<=${PAST_AT}[^,;]*)|(?=,?[^,;]*${PAST_AT}))`,
    true,
    "gi",
    false,
  ),
  // "it was autumn before", "it was March before": a point a season off, reached before the next line.
  shape("was-before", `\\b(?:was|were)\\s+(?:(?:early|late|mid)[\\s-])?(?:${SEASON}|${MONTH})\\s+before\\b`, true),
  // "by Christmas", "that Thanksgiving", "come Easter", "before the Fourth of July"
  shape("holiday", `\\b(?:[Bb]y|[Tt]hat|[Cc]ome|[Bb]efore|[Uu]ntil)\\s+${HOLIDAY}\\b`, true, "g"),
  // "the rest of the year", "the rest of that winter"
  shape("rest-of", `\\brest\\s+of\\s+(?:the|that)\\s+(?<unit>week|month|quarter|season|year|term|${SEASON})\\b`, true),
  // "spent months", "took four months", "dragged on for eleven weeks", "the better part of a year"
  shape(
    "spent",
    `\\b(?:spent|spend|took|lasted|ran|dragged(?:\\s+on)?|stretched(?:\\s+on)?|went)\\s+(?:on\\s+)?(?:for\\s+)?(?:the\\s+)?(?:better\\s+part\\s+of\\s+)?(?:(?<count>${TIME_COUNT})\\s+)?(?<unit>${UNIT})\\b`,
    false,
  ),
  // "questioned for eleven weeks", "the supply was off for eleven days". Only a
  // state or an outcome running for a span: "suspended for a quarter" and "open
  // for five years" are the terms of the act just decided, and are true tonight.
  shape(
    "for",
    `\\b(?:questioned|detained|jailed|held|closed|shut|rationed|argued|debated|stalled|ran|printed|worked|talked|stayed|stays|sat|lay|dark|empty|idle|silent|unusable|off|down|missing|unpaid|unanswered)\\s+(?:\\w+ly\\s+)?for\\s+(?<count>${TIME_COUNT})\\s+(?<unit>${UNIT})\\b`,
    false,
  ),
  // "held through the winter", "played all summer", "locked in for the next three years"
  shape("season-long", `\\b(?:through|over|all)\\s+(?:the\\s+)?${SEASON}\\b(?!\\s+of\\b)`, false),
  shape(
    "term",
    `\\b(?:for|through|across)\\s+the\\s+(?:following|next|coming)\\s+(?:(?<count>${TIME_COUNT})\\s+)?(?<unit>${UNIT}|${SEASON})\\b`,
    false,
  ),
  // "eventually": the leap without a number
  shape("eventually", "\\beventually\\b", false),
];

/**
 * A forecast: the line says what could, will or is expected to happen, not
 * what did. "It could take months" is a minister's judgment and is true the
 * moment it is said. The verbs count only with the "to" or "that" that makes
 * them a forecast, because "the promise it had made" and "the risk" as nouns
 * forecast nothing. Month names are taken out of a sentence before this is
 * tested (`MONTH_NAME`), so "by May" is not read as the modal.
 */
export const FORECAST_MARKERS =
  /\b(?:will|won['’]t|would(?:n['’]t)?|could(?:n['’]t)?|might|may|can(?:['’]t)?|cannot|should(?:n['’]t)?|shall|must|going\s+to|if|unless|whether|likely|unlikely|probably|perhaps|possibly|promising|(?:is|are|was|were|falls?|fell|comes?|came)\s+due|scheduled|slated|set\s+to|on\s+track|(?:expect|threaten|promise|pledge|plan|aim|hope|want|intend|fear|warn|predict|forecast)(?:s|ed|d|ned|ing)?\s+(?:to|that)\b)|['’]ll\b/i;

/**
 * A precedent: the line is about some earlier case, so the interval it names
 * ran out before this decision was made. "The last time this happened, it
 * took years."
 */
export const PRECEDENT_MARKERS =
  /\b(?:last\s+time|the\s+time\s+before|the\s+one\s+before|the\s+previous|previously|historically|in\s+the\s+past|used\s+to|typically|usually|tends?\s+to|every\s+time|each\s+time|whenever|precedent|ago|once\s+(?:took|ran|spent|lasted)|ha(?:s|ve)\s+(?:always|never|taken)|last\s+(?:year|decade|century|spring|summer|autumn|fall|winter|round|cycle)|(?:18|19|20)\d\d)\b|\bthe\s+last\s+(?:\w+\s+){0,3}(?:to|that|who|which)\b/i;

/**
 * An interval that ends at or before the decision rather than after it: the
 * perfect tenses ("has kept that registry for nineteen years", "a border that
 * had been sealed for eight months"), "so far", "for the past year". Only the
 * soft shapes defer to it, since an anchored "later" cannot end at the present.
 */
export const UP_TO_NOW_MARKERS =
  /\b(?:ha(?:s|ve|d)\s+(?:not\s+|never\s+|already\s+|\w+ly\s+)?(?:been|\w+ed|\w+en|\w+wn|kept|held|sat|run|spent|had|gone|done|made|paid|said|told|left|lost|won|stood|built|brought|bought|sold|sent|felt|met|slept)|so\s+far|already|until\s+now|to\s+date|for\s+the\s+(?:past|last)|(?:in|over)\s+the\s+(?:past|last))\b/i;

/** Month names removed before the forecast test, so "by May" is not read as the modal. */
export const MONTH_NAME = new RegExp(`\\b${MONTH}\\b`, "g");
