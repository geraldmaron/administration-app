import { HANDBOOK } from "../glossary/handbook";
import { PLACES } from "../navigation/places";
export const isLinkEntry = (entry) => entry.kind !== "term";
/** Groups in the order results list them, with the words a result group is headed by. */
export const SEARCH_GROUPS = [
    { kind: "place", label: "Places" },
    { kind: "person", label: "People" },
    { kind: "member", label: "Members of Congress" },
    { kind: "judge", label: "Judges" },
    { kind: "office", label: "Offices" },
    { kind: "country", label: "Countries" },
    { kind: "state", label: "States" },
    { kind: "bill", label: "Bills" },
    { kind: "case", label: "Court cases" },
    { kind: "war", label: "Wars" },
    { kind: "treaty", label: "Treaties" },
    { kind: "org", label: "Organizations" },
    { kind: "command", label: "Military commands" },
    { kind: "order", label: "Executive orders" },
    { kind: "term", label: "Handbook" },
];
/** Words a player might type for a place that are not in its name. */
const PLACE_KEYWORDS = {
    brief: ["home", "desk", "today", "decisions"],
    washington: ["cabinet", "executive", "government", "offices"],
    nation: ["states", "country", "domestic", "tariff", "sanction", "embargo", "approval", "approval rating", "polls", "polling", "poll", "public opinion", "opinion", "judgments", "electors", "polarization", "blocs", "independents", "partisans"],
    world: ["countries", "nations", "foreign", "allies", "tariff", "sanction", "embargo"],
    record: ["history", "timeline", "ledger"],
    administrations: ["saves", "slots", "load", "campaigns"],
    settings: ["camera", "contrast", "color", "density", "god mode", "attention", "dark", "theme"],
    handbook: ["help", "guide", "how to play", "manual", "tutorial", "chapters", "explainers"],
    recovery: ["save error", "repair", "storage"],
    founding: ["new game", "oath", "start"],
    digest: ["history", "last week", "weeks", "summary"],
};
/** Every place a player can stand today: the ones whose route exists. */
export function placeEntries(routeExists) {
    return Object.keys(PLACES)
        .filter((key) => routeExists(PLACES[key].href))
        .map((key) => ({
        kind: "place",
        id: `place:${key}`,
        title: PLACES[key].title,
        detail: `Opens ${PLACES[key].reference}.`,
        icon: PLACES[key].icon,
        href: PLACES[key].href,
        keywords: PLACE_KEYWORDS[key] ?? [],
    }));
}
/** Each Handbook chapter as a place, so search can open the chapter that explains a subject. */
export function chapterEntries(routeExists) {
    if (!routeExists(PLACES.handbook.href))
        return [];
    return HANDBOOK.map((chapter) => ({
        kind: "place",
        id: `chapter:${chapter.id}`,
        title: chapter.title,
        detail: chapter.opens,
        icon: PLACES.handbook.icon,
        href: `${PLACES.handbook.href}/${chapter.id}`,
        keywords: ["handbook", "chapter", "help", "guide", "how to play"],
    }));
}
export function termEntries(glossary) {
    return glossary.map((entry) => ({
        kind: "term",
        id: `term:${entry.id}`,
        title: entry.term,
        detail: entry.definition,
        ...(entry.icon ? { icon: entry.icon } : {}),
        entry,
    }));
}
/** 3 for a name that starts with the query, 2 for a word in it that does, 1 for any other match; 0 is no match. */
function score(entry, query) {
    const title = entry.title.toLowerCase();
    if (title.startsWith(query))
        return 3;
    if (title.split(/[\s-]+/).some((word) => word.startsWith(query)))
        return 2;
    const keywords = isLinkEntry(entry) ? entry.keywords : [];
    if (keywords.some((word) => word.startsWith(query)))
        return 2;
    if (title.includes(query))
        return 1;
    return entry.kind === "term" && query.length >= 3 && entry.detail.toLowerCase().includes(query) ? 0.5 : 0;
}
const EMPTY_QUERY_PLACES = 8;
const MAX_RESULTS = 30;
const GROUP_ORDER = new Map(SEARCH_GROUPS.map((group, index) => [group.kind, index]));
/** The entries for a query, best first; at one score, places come before people and bodies, and those before terms. */
export function search(entries, raw) {
    const query = raw.trim().toLowerCase();
    if (query.length === 0)
        return entries.filter((entry) => entry.kind === "place").slice(0, EMPTY_QUERY_PLACES);
    return entries
        .map((entry, index) => ({ entry, index, score: score(entry, query) }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score || (GROUP_ORDER.get(a.entry.kind) ?? 99) - (GROUP_ORDER.get(b.entry.kind) ?? 99) || a.index - b.index)
        .slice(0, MAX_RESULTS)
        .map((row) => row.entry);
}
/** Results gathered under their kind's heading, groups in the fixed order and rows in rank order. */
export function groupResults(results) {
    return SEARCH_GROUPS.map((group) => ({ ...group, entries: results.filter((entry) => entry.kind === group.kind) })).filter((group) => group.entries.length > 0);
}
