import { type Charter, type CharterId, type CradleId, type FlagDesign, type NationId, type OrgId, type Person, type PersonId, type PlankId, type RoleId, type WhiteHouseStaff, type WorldDataset } from "@admin/world";
import { type LeaderDraft } from "./leader.js";
import { type CampaignSeed } from "./rng.js";
import { type AdministrationParty } from "./party.js";
import { type OpeningPreset } from "./opening-world.js";
import type { OpeningElectorate } from "./opinion.js";
import type { Campaign } from "./state.js";
import type { FoundingMandate } from "./state-founding.js";
import { type FitPresident } from "./cast-fit.js";
/**
 * The fields a founding carried when the player built the nation they
 * governed: which country, under which constitution, from which cradle, in
 * which compacts, under which banner. The United States founding answers every
 * one of them, so a choice may leave any of them out and the seal reads the
 * country's own answer instead (`resolveFoundingFields`). They are still
 * accepted, and honored when given, so a caller that names them founds exactly
 * what it always did.
 */
export type LegacyFoundingFields = {
    readonly nationId: NationId;
    readonly nationName: string;
    readonly name: string;
    readonly title: string;
    readonly charterId: CharterId;
    readonly cradleId: CradleId;
    readonly compactIds: readonly OrgId[];
    readonly flag: FlagDesign;
};
export type FoundingChoices = Partial<LegacyFoundingFields> & {
    /**
     * The ministries the player appoints. The lead chair is *not* in here while
     * the founding is in progress — it is the player themselves, authored in
     * `leader` rather than drafted from the pool — and is filled in at seal time
     * from the composed leader so that the sealed campaign has one complete
     * cabinet map.
     */
    readonly cabinet: Readonly<Record<RoleId, PersonId>>;
    /**
     * Who the player is: a biography they author, not a candidate they pick.
     * The readings that biography is worth are derived from it (leader.ts), so
     * the same choices always produce the same person.
     */
    readonly leader: LeaderDraft;
    /**
     * The running mate, from the Senate committee chairs and congressional
     * leaders of the President's own ticket. Absent, the best-balanced candidate
     * is seated (vice-president.ts). The Vice President is never a cabinet chair.
     */
    readonly runningMate?: PersonId;
    /** The planks the President runs on, in the order the player chose them. */
    readonly platform?: readonly PlankId[];
    /**
     * The planks promoted to first-hundred-days pledges: due a hundred days after
     * the oath rather than at the midterm, for larger stakes either way.
     */
    readonly firstHundredDays?: readonly PlankId[];
    /** The White House staff; a post left out is filled with the best fit (white-house.ts). */
    readonly staff?: WhiteHouseStaff;
    /** Absent, the founding takes the seeded default. */
    readonly mandate?: FoundingMandate;
    /** Which world the oath opens on. Absent, the board is drawn from the seed. */
    readonly openingPreset?: OpeningPreset;
    /**
     * Harness only: false seals the founding with no carried board, so a battery
     * can compare staged wars on the same world with and without it. No player
     * path passes it; absent reads as true.
     */
    readonly carriedWorld?: boolean;
};
/** Every mandate a founding can declare, strongest first. */
export declare const FOUNDING_MANDATES: readonly FoundingMandate[];
/** The legacy fields as the seal will read them: given, or the country's own answer. */
export type ResolvedFoundingFields = {
    readonly nationId: NationId | undefined;
    readonly charterId: CharterId | undefined;
    readonly cradleId: CradleId | undefined;
    readonly compactIds: readonly OrgId[];
    readonly flag: FlagDesign;
    readonly title: string | undefined;
};
/**
 * Fills each legacy field the choice left out from the dataset: the first
 * playable nation, the charter that nation names, the first cradle, no
 * compacts, the default banner, and the lead chair's own title. These are the
 * same answers `openingChoices` has always written in, so leaving a field out
 * founds the same campaign as naming it.
 */
export declare function resolveFoundingFields(dataset: WorldDataset, choices: FoundingChoices): ResolvedFoundingFields;
export type FoundingRejection = {
    readonly subject: string;
    readonly explanation: string;
};
export type FoundingValidation = {
    readonly ok: boolean;
    readonly rejections: readonly FoundingRejection[];
};
export declare function generateFoundingPool(seed: CampaignSeed, dataset: WorldDataset): readonly Person[];
/**
 * How many candidates a chair offers at founding.
 *
 * The nation's bench is deeper than this (`personPoolSpecs`) because a campaign
 * hires out of it for forty turns. Founding needs enough faces to feel like a
 * live political cast without turning the screen into a spreadsheet; five gives
 * every chair a real bench while keeping each list skimmable.
 */
export declare const SHORTLIST_DEPTH = 5;
/**
 * The ministries a charter seats that the player actually appoints to.
 *
 * The charter's first chair is the player's own and is never on a shortlist:
 * offering it would let a founding seat somebody else as head of government
 * while the player is composed into the same office.
 */
export declare function appointableRoles(charter: Charter): readonly RoleId[];
export declare function draftCabinetCandidates(charter: Charter, nationId: NationId, pool: readonly Person[], president?: FitPresident): Readonly<Record<RoleId, readonly Person[]>>;
export declare function validateFounding(dataset: WorldDataset, choices: FoundingChoices, pool: readonly Person[]): FoundingValidation;
/** The chosen slate as people rather than ids, for anything that has to read them. */
export declare function seatedPeople(cabinet: Readonly<Record<RoleId, PersonId>>, pool: readonly Person[]): Readonly<Partial<Record<RoleId, Person>>>;
/** The party shares this seed draws, read from the side of the aisle the President's ticket sits on. */
export declare function openingElectorate(seed: CampaignSeed, leader: {
    readonly party: AdministrationParty;
    readonly ideology: {
        readonly economicLeftRight: number;
    };
}): OpeningElectorate;
export declare function sealFounding(seed: CampaignSeed, dataset: WorldDataset, choices: FoundingChoices): Campaign;
