import type { CharterId, FlagDesign, NationId, OrgId, PersonId, PlankId, RoleId, WhiteHouseStaff } from "@admin/world";
import type { LeaderDraft } from "./leader.js";
/**
 * How decisively the election that seated this administration was won. It
 * sets the Congress the President inherits and how long the goodwill lasts;
 * a narrow win and a landslide are different presidencies from the first day.
 */
export type FoundingMandate = "landslide" | "comfortable" | "narrow" | "popular-vote-loss";
export type FoundingConfig = {
    readonly nation: NationId;
    readonly nationName: string;
    readonly name: string;
    readonly title: string;
    readonly charter: CharterId;
    readonly cradle: string;
    readonly compacts: readonly OrgId[];
    readonly cabinet: Readonly<Record<RoleId, PersonId>>;
    /**
     * The banner the administration was founded under. Stored as the design
     * rather than as an image: it is drawn at every size from the same ids, it
     * diffs like the rest of the founding, and a save carries four fields for it
     * instead of an asset.
     */
    readonly flag: FlagDesign;
    /**
     * The biography the player authored for themselves. Retained past the seal
     * because it is the only record of *why* their readings are what they are —
     * the composed Person carries the numbers, this carries the life that
     * produced them, which is what a dossier and a retrospective read back.
     */
    readonly leader: LeaderDraft;
    readonly leadRole: RoleId;
    /**
     * The planks the President ran on, in the order they were chosen. Optional
     * because a campaign held only in memory may predate the field;
     * `normalizeCampaign` reads its absence as a platform of nothing.
     */
    readonly platform?: readonly PlankId[];
    /** The White House staff picked at the seal. Absent the same way `platform` can be. */
    readonly staff?: WhiteHouseStaff;
    /** Absent when the founding took the seeded default rather than choosing one. */
    readonly mandate?: FoundingMandate;
    /**
     * The as-of date of the leader table the foreign cast was drawn against.
     * Absent on a campaign founded before there was one: its leaders were drawn
     * at random, so a screen reading this campaign must not give them the
     * table's titles or say they were modeled on real governments. Never filled
     * in on load, for the same reason.
     */
    readonly leaderTable?: string;
};
