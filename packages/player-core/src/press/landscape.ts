import { articleTies, composeArticle, pickOutletForFeedItem, selectDateOfTurn, selectOutlets, type Article, type Campaign, type FeedItem, type GameDate } from "@admin/engine";
import type { NationId } from "@admin/world";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
import type { Stance } from "../reading.js";
import { deskFilings, FORMAT_LABEL, STANCE_TONE, STANCE_WORD, type DeskFiling } from "./desks.js";

// The press as the Record reads it: every desk placed by who reads it and how it
// stands with the administration, the wire that carried the term's stories, and
// one story opened whole. Stances are bands; the figure behind a desk's band is
// drawn as a position and never printed.

export type LandscapeDesk = {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly region?: string;
  /** How much of the country reads it, 0..1 of the widest desk on the roster. */
  readonly reach: number;
  /** How warmly it stands toward the administration, 0 hostile to 1 friendly. */
  readonly warmth: number;
  readonly stanceWord: string;
  readonly tone: Stance;
  readonly filings: readonly DeskFiling[];
};

/** Every desk, widest reach first, each placed on the two axes the landscape is drawn on. */
export function pressLandscape(campaign: Campaign): readonly LandscapeDesk[] {
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

/** What kind of paper a feed item is: reporting by a masthead, a notice the administration itself issued, or an intelligence summary. */
export type DispatchGenre = "journalism" | "official" | "intelligence";

export const GENRE_LABEL: Readonly<Record<DispatchGenre, string>> = {
  journalism: "News report",
  official: "Official notice",
  intelligence: "Intelligence summary",
};

function genreOf(item: FeedItem): DispatchGenre {
  if (item.visibility === "intelligence") return "intelligence";
  if (!item.desk && (item.kind === "player-action" || item.kind === "governance")) return "official";
  return "journalism";
}

function sourceOf(item: FeedItem, genre: DispatchGenre): string {
  if (genre === "intelligence") return "Intelligence community";
  if (genre === "official") return "The administration";
  return pickOutletForFeedItem(item)?.name ?? "Wire service";
}

export type WireRow = {
  /** Where the story sits in the campaign's feed, which is the dispatch's address. */
  readonly index: number;
  readonly headline: string;
  readonly date: GameDate;
  readonly when: string;
  readonly genre: DispatchGenre;
  readonly source: string;
};

function dateOfItem(campaign: Campaign, item: FeedItem): GameDate {
  return item.date ?? selectDateOfTurn(campaign, item.turn);
}

/** Every item the term's desks, the administration and the intelligence community filed, newest first. */
export function wireRows(campaign: Campaign): readonly WireRow[] {
  return campaign.feed
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.turn - a.item.turn || b.index - a.index)
    .map(({ item, index }) => {
      const date = dateOfItem(campaign, item);
      const genre = genreOf(item);
      return { index, headline: item.headline, date, when: formatDate(date), genre, source: sourceOf(item, genre) };
    });
}

export type DispatchLink = { readonly label: string; readonly href: string };

export type DispatchReading = {
  readonly index: number;
  readonly article: Article;
  readonly genre: DispatchGenre;
  readonly genreLabel: string;
  readonly source: string;
  readonly when: string;
  /** What the filing desk thought of the administration when it filed, as a word. */
  readonly stanceWord?: string;
  /** The governments the story names, each a door to its file. */
  readonly related: readonly DispatchLink[];
  /** Earlier stories about the same governments, newest first. */
  readonly earlier: readonly { readonly index: number; readonly headline: string; readonly when: string }[];
};

function nationName(campaign: Campaign, id: NationId | undefined): string | undefined {
  return id ? campaign.nations[id]?.base.identity.name : undefined;
}

function namedNations(campaign: Campaign, item: FeedItem): readonly NationId[] {
  const ids = [item.actor, item.target].filter((id): id is NationId => id !== undefined && id !== campaign.founding.nation && campaign.nations[id] !== undefined);
  return [...new Set(ids)];
}

function earlierStories(campaign: Campaign, index: number, item: FeedItem, nations: readonly NationId[]): DispatchReading["earlier"] {
  if (nations.length === 0) return [];
  return campaign.feed
    .map((candidate, at) => ({ candidate, at }))
    .filter(({ candidate, at }) => at !== index && candidate.turn <= item.turn && candidate.visibility === item.visibility && nations.some((id) => candidate.actor === id || candidate.target === id))
    .sort((a, b) => b.candidate.turn - a.candidate.turn || b.at - a.at)
    .map(({ candidate, at }) => ({ index: at, headline: candidate.headline, when: formatDate(dateOfItem(campaign, candidate)) }));
}

/** One story opened whole, written by the desk that filed it, or nothing for an address the feed does not hold. */
export function dispatchReading(campaign: Campaign, index: number): DispatchReading | undefined {
  const item = Number.isInteger(index) ? campaign.feed[index] : undefined;
  if (!item) return undefined;
  const genre = genreOf(item);
  const standing = selectOutlets(campaign).find((row) => row.outlet.id === pickOutletForFeedItem(item)?.id);
  const article = composeArticle(
    item,
    {
      ...(nationName(campaign, item.actor) ? { actor: nationName(campaign, item.actor)! } : {}),
      ...(nationName(campaign, item.target) ? { target: nationName(campaign, item.target)! } : {}),
      playerNation: campaign.founding.nation,
      playerNationName: nationName(campaign, campaign.founding.nation) ?? "the United States",
      ties: articleTies(campaign, item),
    },
    { ...(standing ? { outletDisposition: standing.disposition } : {}), filedOn: formatDate(dateOfItem(campaign, item)) },
  );
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
