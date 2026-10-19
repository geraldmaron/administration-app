import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { Stance } from "../reading";
import { type WorldRegionId } from "./world-regions";
export declare const WORLD_LENSES: readonly ["standing", "forces", "trade"];
export type WorldLensId = (typeof WORLD_LENSES)[number];
export type WorldRow = {
    readonly nation: NationId;
    readonly name: string;
    readonly capital: string;
    readonly adjective: string;
    readonly href: string;
    /** The lens's reading in words. */
    readonly value: string;
    /** Where the reading sits on its own scale, 0..1, for the meter beside the name. On standing it is their trust itself, so it varies inside a band; an unread government has none. */
    readonly fraction: number;
    /** The row's standing, whichever lens ranks it, for the mark beside the name. */
    readonly stance: Stance | "unread" | undefined;
    readonly atWar: boolean;
    /** The part of the world it is counted under on the World home. */
    readonly region: WorldRegionId | undefined;
};
/** The standing axis's bands as spans of 0..1, read off the same cuts the band words are, so a drawn boundary and the word beside it cannot disagree. */
export declare const STANDING_BANDS: readonly {
    readonly stance: Stance;
    readonly word: string;
    readonly from: number;
    readonly to: number;
}[];
export declare function atWarWith(campaign: Campaign): ReadonlySet<NationId>;
/** Every other government ranked for a lens, the accessible twin of the map's own colors. */
export declare function worldRows(campaign: Campaign, lens: WorldLensId): readonly WorldRow[];
/** The rows a search matches: the government's name, its capital, or the adjective it goes by. */
export declare function searchWorldRows(rows: readonly WorldRow[], query: string): readonly WorldRow[];
export type Mover = {
    readonly nation: NationId;
    readonly name: string;
    readonly href: string;
    readonly headline: string;
    /** "This week", "Last week", "3 weeks ago". */
    readonly when: string;
    readonly stance: Stance | "unread" | undefined;
};
export type InFlight = {
    readonly id: string;
    readonly kind: "operation" | "authorization" | "treaty" | "retaliation";
    readonly title: string;
    readonly detail: string;
    readonly href: string;
};
export type WarRow = {
    readonly id: string;
    readonly headline: string;
    readonly weeks: number;
    readonly intensity: number;
    readonly intensityText: string;
    readonly youAreParty: boolean;
    readonly href: string;
};
export type WorldWatchlist = {
    readonly movers: readonly Mover[];
    readonly inFlight: readonly InFlight[];
    readonly wars: readonly WarRow[];
};
/** The movers, what is in flight and the wars, for the World's home. */
export declare function worldWatchlist(campaign: Campaign): WorldWatchlist;
export type StanceCounts = Readonly<Record<Stance | "unread", number>>;
export type RegionTile = {
    readonly region: WorldRegionId;
    readonly name: string;
    readonly total: number;
    readonly counts: StanceCounts;
    readonly atWar: number;
    /** The governments a President would look for first: at war with the US, hostile, then the closest friends. */
    readonly notable: readonly NationId[];
};
export type WorldOverview = {
    readonly total: number;
    readonly counts: StanceCounts;
    readonly atWar: number;
    readonly regions: readonly RegionTile[];
};
/** Every other government counted by its standing toward the US, overall and for each part of the world. */
export declare function worldOverview(campaign: Campaign): WorldOverview;
