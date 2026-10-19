import type { Article } from "../article.js";
import type { FeedItem } from "../state.js";
import { SMALL_STATE_POPULATION } from "../condition-impacts.js";

// The register defects a composed article can carry, as checks a machine can
// run. Shared by the coherence test and scripts/dev/sample-articles.mjs so the
// sample report and the gate count the same thing.
//
// Each check reads the finished text against what the item actually carried,
// because a line is only dishonest relative to its facts: "the administration
// has not commented" is a reported fact on a story about the administration and
// an invention on a story about a flood in Barbados.

export type DefectClass =
  | "a-bare-figure"
  | "b-extent"
  | "c-sourcing"
  | "d-contradiction"
  | "e-mood"
  | "f-slot"
  | "h-us-watching";

export type Defect = { readonly kind: DefectClass; readonly rule: string; readonly text: string };

export type DefectContext = {
  readonly item: FeedItem;
  readonly playerNation?: string;
  /** Population of the nation the item is filed against, when it is a nation. */
  readonly targetPopulation?: number;
};


// Lines the banks used to print that carry no particular: mood, or a claim to
// know what the building is thinking. Any of them returning is a regression.
export const MOOD_PHRASES: readonly string[] = [
  "stopped calling this temporary",
  "will say from whom",
  "Everyone in the building knows",
  "its own kind of answer",
  "quietly becoming the story",
  "Silence will be read",
  "willing to put their name to",
  "The second week of being seen not to manage",
  "with or without an answer from this building",
  "the advantage of deciding things in a committee",
  "either the explanation or the coincidence",
  "Neither would say untrue",
  "Nobody has needed to",
  "worth the career",
  "worth their career",
  "lost control of this one",
  "did not ask, and did not have to",
  "by very few people",
  "written to land on this government's desk",
  "not written for this government",
  "What it discusses will not",
  "Leaving it there is also a choice",
  "before theirs hardens",
  "The week now belongs to whoever answers",
  "Routine consultation",
  "The meetings are the story",
  "Four times is a policy",
  "will use the word",
  "stop resolving themselves",
  "outlasts the afternoon",
  "A majority this size",
  "It has, at length",
  "how drift reads",
  "nobody scheduled a meeting",
  "while the building was looking elsewhere",
  "Treat it as a floor, not a verdict",
  "neither will put a figure to it",
  "said less than it met",
  "already being argued with",
  "starts being government",
  "relief that was refused",
  "do not ask permission",
  "not a mood, not a leak",
  "which of them believes it is winning",
  "Nobody is calling it the last one either",
  "cheaper to do again",
  "do not quietly stop",
  "usually the point of",
  "a story with a diary",
  "answering a text that already exists",
  "the private part",
  "who still answers the next one",
  "and did not get them",
  "Legislated as a break",
  "It legislated a break",
  "That is the story.",
  "is the part that travels",
  "cannot agree on a number",
  "Somebody moved first",
  "Someone decided this was worth",
  "Nobody will put it in writing",
  "Someone tested it",
  "Nobody has denied it",
  "whether anyone wanted it to",
  "did not survive first contact",
  "a longer afternoon",
  "after the story was already filed",
  "for eleven seconds",
  "starts to travel",
  "the shock locally or exports",
  "the next ask happens in",
];

// Specific sourcing: a count of officials, a confirmation, a refusal to comment.
// The engine files no item with sourcing attached, so any of these is invented.
const HARD_SOURCING: readonly RegExp[] = [
  /\b(?:two|three|several) officials\b/i,
  /\bconfirmed by\b/i,
  /\bdeclined to (?:comment|put a name|say)\b/i,
  /\bnot returning calls\b/i,
  /\breturned? a call\b/i,
  /\bsources close to\b/i,
  /\bsourced to\b/i,
];

// What the administration said or did not say: a reported fact on a story the
// administration is in, and an invention on one it is not.
const ADMINISTRATION_COMMENT: readonly RegExp[] = [
  /\b(?:administration|White House|building)\b[^.]*\b(?:commented|comment|statement|briefed|briefing|account|line|explanation|framing|framed|answer|asked for patience|put a figure)\b/i,
  /\bofficials (?:offered|said|framed|asked)\b/i,
];

const US_WATCHING: readonly RegExp[] = [
  /\b(?:United States|this administration|this government|Washington)\b[^.]*\b(?:is watching|is reading|watches)\b/i,
  /\bchanges the room this administration\b/i,
  /\bon this administration's calendar\b/i,
  /\bpart of the map this government reads\b/i,
];

const BARE_FIGURE: readonly RegExp[] = [
  /\b(?:is|was|did:|count:|figure:)\s+\d[\d,.]*(?=\s*(?:[.,;]|$|and\b|but\b))/,
  /:\s*\d[\d,.]*\.(?:\s|$)/,
];

const NON_WEATHER_NOUNS: readonly string[] = [
  "civil unrest",
  "a recession",
  "runaway prices",
  "mass unemployment",
  "a debt crisis",
  "an energy shortage",
  "a housing crisis",
  "an epidemic",
];

const WEATHER_WORDS = /\b(?:weather|relief agencies|relief that|disaster)\b/i;

const ONGOING = /(?:stopped calling this temporary|is survivable|cannot hold|starts to travel|is worsening|being seen not to manage|relief that arrives late|second week|week two)/i;

function aboutAdministration(item: FeedItem, playerNation: string | undefined): boolean {
  if (playerNation === undefined) return false;
  return item.actor === playerNation || item.target === playerNation;
}

function bodyTexts(article: Article): readonly string[] {
  return [article.standfirst, ...(article.relevance ? [article.relevance] : []), ...article.paragraphs];
}

function sentencesOf(text: string): readonly string[] {
  return text.match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g)?.map((part) => part.trim()) ?? [text];
}

function checkFigures(texts: readonly string[], push: (kind: DefectClass, rule: string, text: string) => void): void {
  for (const text of texts) {
    for (const rule of BARE_FIGURE) if (rule.test(text)) push("a-bare-figure", rule.source, text);
  }
}

function checkExtent(article: Article, context: DefectContext, push: (kind: DefectClass, rule: string, text: string) => void): void {
  for (const text of [article.headline, ...bodyTexts(article)]) {
    if (/\bacross a region\b/i.test(text)) push("b-extent", "across a region", text);
    const small = context.targetPopulation !== undefined && context.targetPopulation < SMALL_STATE_POPULATION;
    if (small && /\b(?:nationwide|in one city|in one region)\b/i.test(text)) push("b-extent", "large-country extent on a small state", text);
  }
}

function checkSourcing(article: Article, context: DefectContext, push: (kind: DefectClass, rule: string, text: string) => void): void {
  const ours = aboutAdministration(context.item, context.playerNation);
  for (const text of bodyTexts(article)) {
    for (const rule of HARD_SOURCING) if (rule.test(text)) push("c-sourcing", rule.source, text);
    if (ours) continue;
    for (const rule of ADMINISTRATION_COMMENT) if (rule.test(text)) push("c-sourcing", `administration comment on a story it is not in: ${rule.source}`, text);
  }
}

function checkContradictions(article: Article, context: DefectContext, push: (kind: DefectClass, rule: string, text: string) => void): void {
  const { item, playerNation } = context;
  const over = item.facts?.phase === "over" || /\b(?:is over|declared over)\b/i.test(item.headline);
  const onset = /\bstruck by\b/i.test(item.headline);
  const aimed = playerNation !== undefined && item.target === playerNation && item.actor !== undefined && item.actor !== playerNation;
  const ours = playerNation !== undefined && item.actor === playerNation;
  for (const text of bodyTexts(article)) {
    if (over && ONGOING.test(text)) push("d-contradiction", "an emergency declared over, written as ongoing", text);
    if (onset && /\b(?:second week|week two)\b/i.test(text)) push("d-contradiction", "an onset written as its second week", text);
    if (/^Nothing happened this week/i.test(text) && /\b(?:jumps|falls|defaults|re-rated|strikes down|upholds)\b/i.test(item.headline)) {
      push("d-contradiction", "nothing happened, over a headline that happened", text);
    }
    if (aimed && /\b(?:not written for this government|not named in the move|not the named target)\b/i.test(text)) push("d-contradiction", "aimed at us, written as not", text);
    if (!aimed && !ours && /\b(?:aimed squarely at this government|This government is the named target)\b/.test(text)) push("d-contradiction", "not aimed at us, written as aimed", text);
    if (ours && /\b(?:it was not us|without asking this government)\b/i.test(text)) push("d-contradiction", "our own move, written as someone else's", text);
  }
}

function checkSlots(article: Article, context: DefectContext, push: (kind: DefectClass, rule: string, text: string) => void): void {
  const nonWeather = context.item.kind === "condition" && NON_WEATHER_NOUNS.some((noun) => context.item.headline.toLowerCase().includes(noun));
  for (const text of bodyTexts(article)) {
    const doubled = text.match(/\b([A-Za-z]+)\s+\1\b/i);
    if (doubled && !/^(?:that|had)$/i.test(doubled[1]!)) push("f-slot", "an adjacent duplicated word", text);
    if (/[.!?]\s+[a-z]/.test(text)) push("f-slot", "a lowercase sentence start", text);
    if (/\s[,.;]|\.\.|\?\.|!\./.test(text)) push("f-slot", "broken punctuation", text);
    if (nonWeather && text !== article.headline && WEATHER_WORDS.test(text)) push("f-slot", "weather words for a condition that is not weather", text);
    if (/\bhas a name attached to it now\b/.test(text)) push("f-slot", "a person written as an event", text);
    if (/\bThe (?:the|a|an)\b/.test(text)) push("f-slot", "a doubled article", text);
    if (/\b(?:engagement|world-event):[a-z-]+/.test(text)) push("f-slot", "a catalogue id printed as prose", text);
    if (/\b(?:emergency relief|development money|disaster aid) against\b/.test(text)) push("f-slot", "help written as an attack", text);
    if (/\b(?:at|of|to|in|for|on|by|with|from|and|against) The [A-Z]/.test(text)) push("f-slot", "a capitalized article mid-sentence", text);
    if (/\b(?:leaves|of|to|in) the (?:OPEC\+?|BRICS|ASEAN|NATO)\b/.test(text)) push("f-slot", "an article on an acronym", text);
  }
}

// A piece's opening lines are read first and alone, so a pronoun there has
// nothing before it to refer to; later paragraphs may lean on the lede.
function checkOpenings(article: Article, push: (kind: DefectClass, rule: string, text: string) => void): void {
  for (const text of [article.standfirst, article.relevance ?? "", article.paragraphs[0] ?? ""]) {
    if (/^(?:Its|It|They|Their|Them)\b/.test(text)) push("f-slot", "a pronoun with nothing to refer to", text);
  }
}

// Names that take the definite article mid-sentence; printed bare they read
// "against United States".
const ARTICLED_NATIONS = /\b(?:against|to|in|from|with|on|of|by) (?:United States|United Kingdom|United Arab Emirates|Netherlands|Philippines|Bahamas|Gambia|Czech Republic|Dominican Republic|Central African Republic|Democratic Republic of the Congo|Republic of the Congo)\b/;

// What the feed's own producers file as headlines, read with the composed text.
function checkHeadline(article: Article, push: (kind: DefectClass, rule: string, text: string) => void): void {
  const text = article.headline;
  if (/[.!?]:/.test(text)) push("f-slot", "a sentence stop before a colon", text);
  if (/\b[a-z-]+:[A-Z]{3}:/.test(text) || /\(strike-assessment:/.test(text)) push("f-slot", "an internal id in a headline", text);
  if (/\bacross (?:Caribbean|Middle East|Caucasus)\b/.test(text)) push("f-slot", "a region missing its article", text);
  if (/\bliving through a disaster\b/.test(text)) push("f-slot", "every folded condition called a disaster", text);
  if (ARTICLED_NATIONS.test(text)) push("f-slot", "a country missing its article", text);
  if (/\b(?:a recession|runaway prices) in one (?:city|town)\b/.test(text)) push("b-extent", "a national economy given a city limit", text);
}

function checkMood(article: Article, push: (kind: DefectClass, rule: string, text: string) => void): void {
  for (const text of bodyTexts(article)) {
    for (const phrase of MOOD_PHRASES) if (text.includes(phrase)) push("e-mood", phrase, text);
  }
}

function checkWatching(article: Article, context: DefectContext, push: (kind: DefectClass, rule: string, text: string) => void): void {
  if (aboutAdministration(context.item, context.playerNation)) return;
  for (const text of bodyTexts(article)) {
    for (const rule of US_WATCHING) if (rule.test(text)) push("h-us-watching", rule.source, text);
  }
}

/** Every defect in one composed article, read against the item it was composed from. */
export function articleDefects(article: Article, context: DefectContext): readonly Defect[] {
  const found: Defect[] = [];
  const push = (kind: DefectClass, rule: string, text: string) => found.push({ kind, rule, text });
  checkFigures(bodyTexts(article), push);
  checkExtent(article, context, push);
  checkSourcing(article, context, push);
  checkContradictions(article, context, push);
  checkSlots(article, context, push);
  checkOpenings(article, push);
  checkHeadline(article, push);
  checkMood(article, push);
  checkWatching(article, context, push);
  return found;
}

/** A sentence with its names and numbers blanked, so two fills of one bank line read as one line. */
export function sentenceShape(sentence: string, names: readonly string[]): string {
  const blanked = names.reduce((text, name) => (name.length > 2 ? text.split(name).join("<N>") : text), sentence);
  return blanked.replace(/\d[\d,.]*/g, "<#>");
}

/**
 * Sentences that recur across distinct stories often enough to read as a tell:
 * the shape and how many stories carried it, most frequent first.
 */
export function repeatedSentences(
  articles: readonly Article[],
  names: readonly string[],
  minShare: number,
): readonly { readonly shape: string; readonly stories: number }[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    const shapes = new Set(bodyTexts(article).flatMap(sentencesOf).map((sentence) => sentenceShape(sentence, names)));
    for (const shape of shapes) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  }
  const floor = Math.max(3, Math.ceil(articles.length * minShare));
  return [...counts.entries()]
    .filter(([, stories]) => stories >= floor)
    .map(([shape, stories]) => ({ shape, stories }))
    .sort((a, b) => b.stories - a.stories);
}
