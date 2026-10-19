import { type Campaign, type CampaignSeed, type CandidateFit, type FoundingChoices, type LeaderDraft, type LegacyFoundingFields, type OpeningPosition, type RunningMateCandidate } from "@admin/engine";
import { type Charter, type Cradle, type Nation, type Person, type RoleId, type WhiteHouseStaffRoleId } from "@admin/world";
export type FoundingOptions = {
    readonly seed: CampaignSeed;
    readonly nations: readonly Nation[];
    readonly charters: readonly Charter[];
    readonly cradles: readonly Cradle[];
    readonly pool: readonly Person[];
};
export declare function foundingOptions(seed: CampaignSeed): FoundingOptions;
export declare function charterFor(options: FoundingOptions, charterId: string | undefined): Charter | undefined;
/**
 * The charter a campaign in play was founded under.
 *
 * Throws rather than falling back to the first charter: the removal arc's
 * mechanism, its narration and its thresholds all come from here, so a silent
 * substitution would hand the player a different constitution's fail state.
 */
export declare function charterOf(campaign: Campaign): Charter;
/**
 * Whether the world this campaign was founded in still exists.
 *
 * A save can be perfectly intact — right format version, right shape, checksum
 * good — and still be unopenable, because the dataset moved out from under it.
 * A campaign founded under a charter the dataset no longer carries comes back off
 * the device referring to a constitution and a country that are gone.
 *
 * It has to be caught at load. Before this, the first thing to ask for the
 * charter threw — from inside a render, three components deep — and the whole
 * app came down with a stack trace on a save the library had already listed as
 * healthy. The player's real position is that this campaign cannot be
 * continued, which is a sentence the library can say.
 */
export declare function retiredWorldReason(campaign: Campaign): string | undefined;
/**
 * The shortlist per cabinet chair, ranked by fit to the President the player
 * is drafting, which is the order the quick oath seats from. A caller that has
 * not asked for a President yet gets the one the founding opens on, so its
 * lists and `openingChoices`' preselected chairs are always the same ranking.
 */
export declare function cabinetSlate(options: FoundingOptions, charter: Charter, nation: Nation, president?: Pick<LeaderDraft, "party" | "ideology">): Readonly<Record<RoleId, readonly Person[]>>;
/**
 * The running-mate shortlist for the President being drafted, best-balanced
 * first, leaving out anyone already named for another post.
 */
export declare function runningMateSlate(options: FoundingOptions, choices: Pick<FoundingChoices, "leader" | "cabinet" | "runningMate" | "staff">): readonly RunningMateCandidate[];
/** The shortlist for one White House post, best fit first, leaving out anyone named for another post. */
export declare function staffSlate(options: FoundingOptions, choices: Pick<FoundingChoices, "leader" | "cabinet" | "runningMate" | "staff">, post: WhiteHouseStaffRoleId): readonly CandidateFit[];
export declare const DEFAULT_SEED: string & import("zod").$brand<"CampaignSeed">;
/**
 * The slate setup opens on: the playable nation, the constitution it names,
 * the homeland cradle, no elective compacts, and the strongest available
 * candidate per seat. The player edits the biography and the Cabinet; the rest
 * is what they inherit on taking office.
 */
export declare function openingChoices(options: FoundingOptions): FoundingChoices & LegacyFoundingFields;
/**
 * What the campaign would open on if it were sealed right now — recomputed on
 * every keystroke of the founding screen, which is what makes the cabinet a
 * choice with a visible price rather than a form to fill in.
 */
export declare function openingFor(options: FoundingOptions, choices: FoundingChoices): OpeningPosition | undefined;
