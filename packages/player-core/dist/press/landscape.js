import { articleTies, composeArticle, pickOutletForFeedItem, selectDateOfTurn, selectOutlets } from "@admin/engine";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { deskFilings, FORMAT_LABEL, STANCE_TONE, STANCE_WORD } from "./desks.js";
/** Every desk, widest reach first, each placed on the two axes the landscape is drawn on. */
export function pressLandscape(campaign) {
    const rows = selectOutlets(campaign);
    const widest = Math.max(0.01, ...rows.map((row) => row.outlet.reach));
    return rows
        .map((row) => ({
        id: row.outlet.id,
        name: row.outlet.name,
        format: FORMAT_LABEL[row.outlet.format],
        ...(row.outlet.region ? { region: row.outlet.region } : {}),
        reach: row.outlet.reach / widest,
        warmth: Math.max(0, Math.min(1, row.disposition)),
        stanceWord: STANCE_WORD[row.stance],
        tone: STANCE_TONE[row.stance],
        filings: deskFilings(campaign, row.outlet.id, 2),
    }))
        .sort((a, b) => b.reach - a.reach || a.name.localeCompare(b.name));
}
export const GENRE_LABEL = {
    journalism: "News report",
    official: "Official notice",
    intelligence: "Intelligence summary",
};
function genreOf(item) {
    if (item.visibility === "intelligence")
        return "intelligence";
    if (!item.desk && (item.kind === "player-action" || item.kind === "governance"))
        return "official";
    return "journalism";
}
function sourceOf(item, genre) {
    if (genre === "intelligence")
        return "Intelligence community";
    if (genre === "official")
        return "The administration";
    return pickOutletForFeedItem(item)?.name ?? "Wire service";
}
function dateOfItem(campaign, item) {
    return item.date ?? selectDateOfTurn(campaign, item.turn);
}
/** Every item the term's desks, the administration and the intelligence community filed, newest first. */
export function wireRows(campaign) {
    return campaign.feed
        .map((item, index) => ({ item, index }))
        .sort((a, b) => b.item.turn - a.item.turn || b.index - a.index)
        .map(({ item, index }) => {
        const date = dateOfItem(campaign, item);
        const genre = genreOf(item);
        return { index, headline: item.headline, date, when: formatDate(date), genre, source: sourceOf(item, genre) };
    });
}
function nationName(campaign, id) {
    return id ? campaign.nations[id]?.base.identity.name : undefined;
}
function namedNations(campaign, item) {
    const ids = [item.actor, item.target].filter((id) => id !== undefined && id !== campaign.founding.nation && campaign.nations[id] !== undefined);
    return [...new Set(ids)];
}
function earlierStories(campaign, index, item, nations) {
    if (nations.length === 0)
        return [];
    return campaign.feed
        .map((candidate, at) => ({ candidate, at }))
        .filter(({ candidate, at }) => at !== index && candidate.turn <= item.turn && candidate.visibility === item.visibility && nations.some((id) => candidate.actor === id || candidate.target === id))
        .sort((a, b) => b.candidate.turn - a.candidate.turn || b.at - a.at)
        .map(({ candidate, at }) => ({ index: at, headline: candidate.headline, when: formatDate(dateOfItem(campaign, candidate)) }));
}
/** One story opened whole, written by the desk that filed it, or nothing for an address the feed does not hold. */
export function dispatchReading(campaign, index) {
    const item = Number.isInteger(index) ? campaign.feed[index] : undefined;
    if (!item)
        return undefined;
    const genre = genreOf(item);
    const standing = selectOutlets(campaign).find((row) => row.outlet.id === pickOutletForFeedItem(item)?.id);
    const article = composeArticle(item, {
        ...(nationName(campaign, item.actor) ? { actor: nationName(campaign, item.actor) } : {}),
        ...(nationName(campaign, item.target) ? { target: nationName(campaign, item.target) } : {}),
        playerNation: campaign.founding.nation,
        playerNationName: nationName(campaign, campaign.founding.nation) ?? "the United States",
        ties: articleTies(campaign, item),
    }, { ...(standing ? { outletDisposition: standing.disposition } : {}), filedOn: formatDate(dateOfItem(campaign, item)) });
    const nations = namedNations(campaign, item);
    return {
        index,
        article,
        genre,
        genreLabel: GENRE_LABEL[genre],
        source: sourceOf(item, genre),
        when: formatDate(dateOfItem(campaign, item)),
        ...(genre === "journalism" && article.stance ? { stanceWord: STANCE_WORD[article.stance] } : {}),
        related: nations.map((id) => ({ label: nationName(campaign, id) ?? id, href: place.country(id) })),
        earlier: earlierStories(campaign, index, item, nations),
    };
}
