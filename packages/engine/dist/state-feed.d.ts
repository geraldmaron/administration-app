import type { NationId } from "@admin/world";
import type { FeedVisibility, GameDate } from "./state-campaign.js";
import type { OutletStance } from "./press-outlets.js";
export declare const SCENE_CLASS_VALUES: readonly ["tragedy", "terror", "unrest", "disaster", "public-health", "migration", "foreign-crisis", "war", "espionage", "hostage", "technology", "economy", "scandal", "justice", "institution", "culture", "death", "triumph"];
export type SceneClass = (typeof SCENE_CLASS_VALUES)[number];
/** The register vocabulary, exported as a value for the same reason. */
export declare const SCENE_REGISTER_VALUES: readonly ["intact", "strained", "damaged", "ceremonial"];
export type SceneRegister = (typeof SCENE_REGISTER_VALUES)[number];
/** Optional still hint for dispatch hero photography. Aligns with content `SceneFacets`. */
export type SceneFacetHint = {
    readonly kind?: SceneClass;
    readonly register?: SceneRegister;
};
export type ArticleFacts = {
    /** The person, department or body the story turns on, as a reader would name it. */
    readonly subject?: string;
    /** A magnitude, already in the units it should be printed in. */
    readonly figure?: string;
    /** What is actually at stake, as a clause the piece can build a paragraph on. */
    readonly stake?: string;
    /**
     * The instrument, rung, or program the move used, as the catalogue names it.
     * Not a person: putting "Trade Advisory" in `subject` would send it through
     * the career bank.
     */
    readonly instrument?: string;
    /** Where the wire filed from — "Geneva", not a full postal address. */
    readonly dateline?: string;
    /** Topic slugs for the wire header; when absent, derived from feed kind. */
    readonly topicTags?: readonly string[];
    /** Optional still hint when the feed kind alone is too coarse. */
    readonly sceneFacet?: SceneFacetHint;
    /**
     * Where in its own arc the thing being reported stands.
     *
     * A story about a flood is written one way on the first morning and another
     * way in the week it recedes, and without this the composer had only the fact
     * that a flood existed. Absent means the piece is not about something with an
     * arc, which is most of them.
     */
    readonly phase?: "onset" | "worsening" | "easing" | "over";
};
export type FeedItem = {
    readonly turn: number;
    readonly kind: "player-action" | "npc-action" | "operator" | "drift" | "press" | "conflict" | "condition" | "governance" | "pursuit" | "bloc";
    readonly visibility: FeedVisibility;
    readonly headline: string;
    readonly actor?: NationId;
    readonly target?: NationId;
    readonly facts?: ArticleFacts;
    /** The day it was filed. An item filed before the day was kept has none, and reads by its week. */
    readonly date?: GameDate;
    /**
     * Which masthead filed it, and what that masthead thought of the
     * administration at the moment it did.
     *
     * The stance is copied at filing rather than read back later, because a paper
     * that has since come round did not write a friendlier story last month. An
     * item with no desk is one the wire carried without a masthead, which is every
     * item written before the corps had parts.
     */
    readonly desk?: {
        readonly outletId: string;
        readonly stance: OutletStance;
        readonly byline?: string;
    };
    /**
     * Every other masthead that filed on the same thing.
     *
     * A week two papers both covered is a different week from one only the
     * friendly paper ran, and the feed had no way to say so: one item meant one
     * story, whoever wrote it. Absent means the one desk above, not a second
     * filing that went unrecorded.
     */
    readonly filings?: readonly {
        readonly outletId: string;
        readonly stance: OutletStance;
    }[];
};
/**
 * That this campaign has been governed from outside the fiction.
 *
 * The field is optional on `Campaign` because most campaigns never carry one,
 * and it has no `false` state on purpose: a campaign is either untouched, in
 * which case there is nothing to record, or it has been touched, in which case
 * the record is permanent. `apply()` enforces the permanence — no effect can
 * clear it — because the paywall sells sandbox freedom, and freedom that could
 * be switched back off would instead be sold as competitive advantage.
 *
 * `actions` is not a statistic. It is the count every achievement and
 * leaderboard reads to know it is looking at a campaign it must not rank, and
 * `enabledTurn` is what a retrospective needs to say which part of the term was
 * played and which part was authored.
 */
export type GodModeState = {
    readonly enabled: true;
    readonly enabledTurn: number;
    readonly actions: number;
    readonly branchPoints: readonly number[];
};
