import { CONDITION_KINDS, type ConditionKind } from "./condition-kinds.js";
import { hazardNouns } from "./condition-impacts.js";
import { capitalize, type Desk } from "./article-desk.js";
import { possessive } from "./naming.js";
import { regionPhrase } from "./feed-cap.js";
import type { FeedItem } from "./state.js";

// How a standing condition abroad, or one at home, is written.
//
// A condition item carries almost nothing: the country, a headline naming the
// hazard and how far it reaches, and where the thing stands in its arc. The
// banks this replaces filled that silence with mood — a "number on the file"
// that was really the feed's count of folded lines, "week two" on an onset, a
// relief argument over civil unrest. What a piece can honestly add is what the
// kind of condition costs the country it is in, which is what the engine
// actually bills it, and where in its arc it is. Everything else is left out,
// so a foreign condition reads as two short paragraphs and no more.

type Footprint = "weather" | "health" | "order" | "event" | "economy";

const FOOTPRINT: Readonly<Record<ConditionKind, Footprint>> = {
  earthquake: "weather",
  flood: "weather",
  drought: "weather",
  cyclone: "weather",
  wildfire: "weather",
  tornado: "weather",
  "winter-storm": "weather",
  "heat-wave": "weather",
  pandemic: "health",
  unrest: "order",
  recession: "economy",
  "inflation-shock": "economy",
  "unemployment-shock": "economy",
  "fiscal-crisis": "economy",
  "energy-shortage": "economy",
  "housing-crunch": "economy",
  cyberattack: "event",
  "work-stoppage": "economy",
  "bank-failure": "economy",
  "mass-casualty-attack": "event",
  "wrongful-detention": "event",
};

// Every noun a headline can carry for a kind, the basin names for a cyclone
// included, longest first so "a winter storm" is not read as something shorter.
const NOUNS: readonly { readonly noun: string; readonly kind: ConditionKind }[] = [
  ...CONDITION_KINDS.flatMap((kind) => hazardNouns(kind).map((noun) => ({ noun, kind }))),
].sort((a, b) => b.noun.length - a.noun.length);

export type ConditionPhase = "onset" | "worsening" | "easing" | "over";
type Extent = "local" | "part" | "whole";

/** What the composer can honestly read off a condition item. */
export type ConditionRead = {
  readonly kind?: ConditionKind;
  /** The hazard with its article, as the headline printed it: "an earthquake", "civil unrest". */
  readonly noun?: string;
  readonly phase?: ConditionPhase;
  readonly extent?: Extent;
  /** The week's regional roll-up: how many countries the line now stands for, and where. */
  readonly fold?: { readonly count: number; readonly region: string };
};

function regionName(tag: string): string | undefined {
  return regionPhrase(tag.replace(/^fold:/, ""));
}

const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

function foldOf(item: FeedItem): ConditionRead["fold"] {
  const tag = item.facts?.topicTags?.find((entry) => entry.startsWith("fold:"));
  const count = Number(item.facts?.figure);
  const region = tag ? regionName(tag) : undefined;
  if (!region || !Number.isInteger(count) || count < 2) return undefined;
  return { count, region };
}

function phaseOf(item: FeedItem): ConditionPhase | undefined {
  if (item.facts?.phase) return item.facts.phase;
  const headline = item.headline;
  if (/\bstruck by\b/.test(headline)) return "onset";
  if (/\bis worsening\b/.test(headline)) return "worsening";
  if (/\bis still dealing with\b/.test(headline)) return "easing";
  if (/\b(?:is over|declared over)\b/.test(headline)) return "over";
  return undefined;
}

// Both the wording the onset writes now and the wording older saves carry.
function extentOf(headline: string): Extent | undefined {
  if (/\bin one (?:city|town|district)\b/.test(headline)) return "local";
  if (/\b(?:across a region|in one region|in part of the country)\b/.test(headline)) return "part";
  if (/\b(?:nationwide|across the whole country|across the country)\b/.test(headline)) return "whole";
  return undefined;
}

export function readCondition(item: FeedItem): ConditionRead {
  if (item.kind !== "condition") return {};
  const lower = item.headline.toLowerCase();
  const found = NOUNS.find(({ noun }) => lower.includes(noun) || lower.includes(noun.replace(/^an? /, "")));
  const fold = foldOf(item);
  const phase = phaseOf(item);
  const extent = extentOf(item.headline);
  return {
    ...(found && !fold ? { kind: found.kind, noun: found.noun } : {}),
    ...(phase ? { phase } : {}),
    ...(extent ? { extent } : {}),
    ...(fold ? { fold } : {}),
  };
}

function bare(noun: string): string {
  return noun.replace(/^an? /, "");
}

export function plural(noun: string): boolean {
  return !/^an? /.test(noun) && /s$/.test(noun);
}

const ONSET_LEDE: Readonly<Record<ConditionKind, (place: string, noun: string) => string>> = {
  earthquake: (place) => `An earthquake has hit ${place}.`,
  flood: (place) => `Flooding has hit ${place}.`,
  drought: (place) => `Drought has taken hold in ${place}.`,
  cyclone: (place, noun) => `${capitalize(noun)} has made landfall in ${place}.`,
  wildfire: (place) => `Wildfires are burning in ${place}.`,
  tornado: (place) => `A tornado has touched down in ${place}.`,
  "winter-storm": (place) => `A winter storm has shut down parts of ${place}.`,
  "heat-wave": (place) => `A heat wave has settled over ${place}.`,
  pandemic: (place) => `An epidemic has broken out in ${place}.`,
  unrest: (place) => `${possessive(place)} government is facing civil unrest.`,
  recession: (place) => `${capitalize(place)} is in a recession.`,
  "inflation-shock": (place) => `Prices in ${place} are rising faster than its government can hold them.`,
  "unemployment-shock": (place) => `Unemployment in ${place} has jumped.`,
  "fiscal-crisis": (place) => `${capitalize(place)} can no longer borrow on terms it can pay.`,
  "energy-shortage": (place) => `${capitalize(place)} is short of the fuel and power it runs on.`,
  "housing-crunch": (place) => `${capitalize(place)} is in a housing crisis.`,
  cyberattack: (place) => `Hackers have broken into systems ${place} runs on.`,
  "work-stoppage": (place) => `A national strike has stopped work in ${place}.`,
  "bank-failure": (place) => `Regulators have closed a large bank in ${place}.`,
  "mass-casualty-attack": (place) => `A gunman has killed people in ${place}.`,
  "wrongful-detention": (place) => `A government abroad is holding a citizen of ${place}.`,
};

/** The hazard as a second reference: "an earthquake" is "the earthquake" once the lede has named it. */
export function theHazard(noun: string): string {
  return `the ${bare(noun)}`;
}

// What the engine bills each kind of condition, said as a reporter would.
const COST: Readonly<Record<Footprint, (place: string, noun: string) => string>> = {
  weather: (place, noun) =>
    `${capitalize(theHazard(noun))} ${plural(noun) ? "draw" : "draws"} down ${possessive(place)} reserves and ${plural(noun) ? "slow" : "slows"} its economy for as long as ${plural(noun) ? "they last" : "it lasts"}.`,
  health: (place) => `The epidemic draws on ${possessive(place)} reserves and keeps people out of work while it runs.`,
  order: (place) => `Unrest is a direct challenge to whoever governs ${place}, and it is paid for in order before anything else.`,
  event: (place, noun) => `${capitalize(theHazard(noun))} is a test of whoever governs ${place}, and it is paid for in the public's confidence.`,
  economy: (place, noun) => `${capitalize(theHazard(noun))} ${plural(noun) ? "are" : "is"} paid for in ${possessive(place)} jobs, prices and reserves.`,
};

function ledeFor(read: ConditionRead, place: string): string | undefined {
  const { kind, noun, phase } = read;
  if (!kind || !noun) return undefined;
  const verb = plural(noun) ? "have" : "has";
  switch (phase) {
    case "worsening":
      return `${capitalize(noun)} in ${place} ${verb} gotten worse.`;
    case "easing":
      return `${capitalize(noun)} in ${place} ${plural(noun) ? "are" : "is"} easing, and ${plural(noun) ? "have" : "has"} not ended.`;
    case "over":
      return `${capitalize(place)} has come through ${bare(noun) === noun ? noun : `the ${bare(noun)}`}.`;
    default:
      return ONSET_LEDE[kind](place, noun);
  }
}

const EXTENT_WORDS: Readonly<Record<Extent, string>> = {
  local: "confined to one place",
  part: "in part of the country",
  whole: "across the whole country",
};

/** The body of a condition piece abroad, or nothing when the headline named no hazard the desk can read. */
export function conditionParagraphs(desk: Desk, read: ConditionRead): readonly string[] | undefined {
  const place = desk.target;
  if (!place) return undefined;
  if (read.fold) {
    return [
      `${capitalize(place)} was the first of the ${countWord(read.fold.count)} to be reported.`,
    ];
  }
  const lede = ledeFor(read, place);
  if (!lede || !read.kind || !read.noun) return undefined;
  if (read.phase === "over") return [lede];
  return [lede, COST[FOOTPRINT[read.kind]](place, read.noun)];
}

export function conditionStandfirst(desk: Desk, read: ConditionRead): string | undefined {
  const place = desk.target;
  if (!place) return undefined;
  if (read.fold) return `This week's emergencies abroad in ${read.fold.region}, ${place} first among them.`;
  if (!read.noun) return undefined;
  const noun = capitalize(read.noun);
  switch (read.phase) {
    case "worsening":
      return `${noun} in ${place}, and a worse week than the last.`;
    case "easing":
      return `${noun} in ${place}, past its worst but not over.`;
    case "over":
      return `${noun} in ${place} is over.`;
    default:
      return read.extent ? `${noun} in ${place}, ${EXTENT_WORDS[read.extent]}.` : `${noun} in ${place}.`;
  }
}

// Only the line that names something the reader can do: a disaster abroad can
// be answered with aid. Unrest, a downturn, a fold or a close ask nothing of
// the reader on their own; the composer falls back to the reader's real ties.
export function conditionRelevance(reader: string, desk: Desk, read: ConditionRead): string | undefined {
  const place = desk.target;
  if (!place || read.fold || read.phase === "over" || !read.kind) return undefined;
  const footprint = FOOTPRINT[read.kind];
  if (footprint !== "weather" && footprint !== "health") return undefined;
  return `${capitalize(reader)} has no part in this unless ${place} asks for help or the President offers it.`;
}

/** The words a home piece can use for its hazard: the noun, and where it was filed from. */
export function homeHazard(desk: Desk, read: ConditionRead): { readonly noun: string; readonly where: string } | undefined {
  if (!read.noun) return undefined;
  const dateline = desk.item.facts?.dateline;
  return { noun: read.noun, where: dateline ? `in ${dateline}` : "at home" };
}

export function conditionFootprint(read: ConditionRead): Footprint | undefined {
  return read.kind ? FOOTPRINT[read.kind] : undefined;
}
