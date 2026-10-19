import { type IdeologyVector, type PersonId, type RoleId } from "@admin/world";
import type { InstitutionId, InstitutionRuntime } from "./institutions.js";
import { type Campaign, type PersonRuntime } from "./state.js";
import { type CampaignSeed } from "./rng.js";
export declare const JUDICIARY_SEAT_COUNT = 9;
/** The nine seat institutions, in seniority order — index 0 is the Chief Justice's. */
export declare const JUDICIARY_SEAT_INSTITUTIONS: readonly InstitutionId[];
export type JudiciaryBench = {
    readonly seats: readonly PersonId[];
    readonly chiefJustice?: PersonId;
};
export type BenchMember = {
    readonly ideology: IdeologyVector;
    readonly integrity: number;
    readonly competence: number;
};
/**
 * Whether the dataset generated this person as material for a cabinet chair:
 * the founding bench's one exclusion, kept in one place for the founding seed
 * and the legacy fallback below. A nomination to a seat no longer reads it;
 * the appointment pool asks for a legal career instead.
 */
export declare function isCabinetEligible(runtime: PersonRuntime): boolean;
/**
 * Nine justices of *this country's* court.
 *
 * Stored state once the campaign has seated at least one of the nine through
 * its own seat institutions — nine specific chairs, each filled or emptied by
 * its own nomination — and a one-time derivation only for a save that never
 * has. See `storedSeats` and `legacyDerivedSeats`.
 */
export declare function selectJudiciaryBench(campaign: Campaign): JudiciaryBench;
/** Bench readings for judicial review — empty when no justices are seated. */
export declare function benchMembersForReview(campaign: Campaign): readonly BenchMember[];
export type BenchSeatView = {
    readonly seat: number;
    readonly personId: PersonId | undefined;
    readonly name: string;
    readonly senior: boolean;
    readonly vacant: boolean;
};
/** Player-facing bench rows — the same nine seats `selectJudiciaryBench` reads. */
export declare function judiciaryBenchSeats(campaign: Campaign): readonly BenchSeatView[];
/**
 * The seat institution a numbered seat corresponds to (1 is the Chief
 * Justice's), for a caller that wants to point at the office rather than at
 * whoever currently holds it — the vacant-seat door a president opens to
 * nominate somebody, in particular.
 */
export declare function judiciarySeatInstitution(seatNumber: number): InstitutionId | undefined;
/**
 * Seed the bench a founding needs: the same integrity-and-competence
 * derivation `legacyDerivedSeats` still carries for a pre-existing save,
 * computed once against the founding cast and handed back as seat
 * assignments to fold into `campaign.institutions` — before that record
 * exists to read the answer back out of.
 *
 * Exported rather than run internally because founding assembles
 * `campaign.institutions` before there is a `Campaign` this module's own
 * selectors could read; the caller that builds that record is the one that
 * has to call this.
 */
export declare function foundingJusticeSeats(people: Readonly<Record<string, PersonRuntime>>, nation: string): Readonly<Record<InstitutionId, PersonId>>;
/**
 * The role a founding-seated justice is marked with, so the generic
 * non-cabinet incumbent sweep (`withCareerIncumbents`) recognizes them as
 * already spoken for. Not `AGENCY_HEAD_ROLE`: a justice was never drawn from
 * that bench, and marking one with it would let a later save misread them as
 * a career civil servant if anything ever branched on the role's identity
 * rather than merely on whether it is set.
 */
export declare const JUDICIARY_SEAT_ROLE: RoleId;
/** Explicitly modeled pre-campaign history; no real fictional justice has a sourced commission date. */
export declare function syntheticJudicialProvenance(seed: CampaignSeed, institutionId: InstitutionId, justiceId: PersonId, age: number, foundingYear: number): NonNullable<InstitutionRuntime["judicialProvenance"]>;
export type FoundingJudiciarySeating = {
    readonly people: Readonly<Record<string, PersonRuntime>>;
    readonly institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>;
};
/**
 * Seat the founding bench in both records at once, called before
 * `withCareerIncumbents` so the generic sweep finds these nine seats already
 * filled and leaves them — and the justices now sitting in them — alone,
 * exactly the way it already leaves a cabinet secretary's institution alone.
 * Without this ordering the two mechanisms compete for the same pool of
 * people and the sweep, running first, seats a justice with whoever it
 * reaches first rather than with the founding's own best bench.
 *
 * A no-op (returning the same two references) when `foundingJusticeSeats`
 * finds nobody to seat, which only happens against a cast with fewer than
 * nine non-cabinet-eligible nationals — a fixture, never the real dataset.
 */
export declare function seatFoundingJustices(people: Readonly<Record<string, PersonRuntime>>, institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>, nation: string, seed?: CampaignSeed, foundingYear?: number): FoundingJudiciarySeating;
