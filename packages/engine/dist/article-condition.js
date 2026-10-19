import { CONDITION_KINDS } from "./condition-kinds.js";
import { hazardNouns } from "./condition-impacts.js";
import { capitalize } from "./article-desk.js";
import { possessive } from "./naming.js";
import { regionPhrase } from "./feed-cap.js";
const FOOTPRINT = {
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
};
// Every noun a headline can carry for a kind, the basin names for a cyclone
// included, longest first so "a winter storm" is not read as something shorter.
const NOUNS = [
    ...CONDITION_KINDS.flatMap((kind) => hazardNouns(kind).map((noun) => ({ noun, kind }))),
].sort((a, b) => b.noun.length - a.noun.length);
function regionName(tag) {
    return regionPhrase(tag.replace(/^fold:/, ""));
}
const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const countWord = (n) => COUNT_WORDS[n] ?? String(n);
function foldOf(item) {
    const tag = item.facts?.topicTags?.find((entry) => entry.startsWith("fold:"));
    const count = Number(item.facts?.figure);
    const region = tag ? regionName(tag) : undefined;
    if (!region || !Number.isInteger(count) || count < 2)
        return undefined;
    return { count, region };
}
function phaseOf(item) {
    if (item.facts?.phase)
        return item.facts.phase;
    const headline = item.headline;
    if (/\bstruck by\b/.test(headline))
        return "onset";
    if (/\bis worsening\b/.test(headline))
        return "worsening";
    if (/\bis still dealing with\b/.test(headline))
        return "easing";
    if (/\b(?:is over|declared over)\b/.test(headline))
        return "over";
    return undefined;
}
// Both the wording the onset writes now and the wording older saves carry.
function extentOf(headline) {
    if (/\bin one (?:city|town|district)\b/.test(headline))
        return "local";
    if (/\b(?:across a region|in one region|in part of the country)\b/.test(headline))
        return "part";
    if (/\b(?:nationwide|across the whole country|across the country)\b/.test(headline))
        return "whole";
    return undefined;
}
export function readCondition(item) {
    if (item.kind !== "condition")
        return {};
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
function bare(noun) {
    return noun.replace(/^an? /, "");
}
export function plural(noun) {
    return !/^an? /.test(noun) && /s$/.test(noun);
}
const ONSET_LEDE = {
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
};
/** The hazard as a second reference: "an earthquake" is "the earthquake" once the lede has named it. */
export function theHazard(noun) {
    return `the ${bare(noun)}`;
}
// What the engine bills each kind of condition, said as a reporter would.
const COST = {
    weather: (place, noun) => `${capitalize(theHazard(noun))} ${plural(noun) ? "draw" : "draws"} down ${possessive(place)} reserves and ${plural(noun) ? "slow" : "slows"} its economy for as long as ${plural(noun) ? "they last" : "it lasts"}.`,
    health: (place) => `The epidemic draws on ${possessive(place)} reserves and keeps people out of work while it runs.`,
    order: (place) => `Unrest is a direct challenge to whoever governs ${place}, and it is paid for in order before anything else.`,
    economy: (place, noun) => `${capitalize(theHazard(noun))} ${plural(noun) ? "are" : "is"} paid for in ${possessive(place)} jobs, prices and reserves.`,
};
function ledeFor(read, place) {
    const { kind, noun, phase } = read;
    if (!kind || !noun)
        return undefined;
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
const EXTENT_WORDS = {
    local: "confined to one place",
    part: "in part of the country",
    whole: "across the whole country",
};
/** The body of a condition piece abroad, or nothing when the headline named no hazard the desk can read. */
export function conditionParagraphs(desk, read) {
    const place = desk.target;
    if (!place)
        return undefined;
    if (read.fold) {
        return [
            `${capitalize(place)} was the first of the ${countWord(read.fold.count)} to be reported.`,
        ];
    }
    const lede = ledeFor(read, place);
    if (!lede || !read.kind || !read.noun)
        return undefined;
    if (read.phase === "over")
        return [lede];
    return [lede, COST[FOOTPRINT[read.kind]](place, read.noun)];
}
export function conditionStandfirst(desk, read) {
    const place = desk.target;
    if (!place)
        return undefined;
    if (read.fold)
        return `This week's emergencies abroad in ${read.fold.region}, ${place} first among them.`;
    if (!read.noun)
        return undefined;
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
export function conditionRelevance(reader, desk, read) {
    const place = desk.target;
    if (!place || read.fold || read.phase === "over" || !read.kind)
        return undefined;
    const footprint = FOOTPRINT[read.kind];
    if (footprint !== "weather" && footprint !== "health")
        return undefined;
    return `${capitalize(reader)} has no part in this unless ${place} asks for help or the President offers it.`;
}
/** The words a home piece can use for its hazard: the noun, and where it was filed from. */
export function homeHazard(desk, read) {
    if (!read.noun)
        return undefined;
    const dateline = desk.item.facts?.dateline;
    return { noun: read.noun, where: dateline ? `in ${dateline}` : "at home" };
}
export function conditionFootprint(read) {
    return read.kind ? FOOTPRINT[read.kind] : undefined;
}
