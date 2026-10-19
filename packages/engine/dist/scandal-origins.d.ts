import { type PersonId, type RoleId } from "@admin/world";
import type { Campaign, FlagId } from "./state.js";
/** A charge a decision on the President's own record can be asked about. */
export type OwnActCharge = "emergency-powers" | "burned-source" | "covert-failure" | "conduct-in-question";
/** What a story is about, whatever opened it. */
export type ScandalCharge = OwnActCharge | "leak" | "cabinet-leak" | "ig-finding" | "flagged";
export type ScandalOrigin = 
/** A leak placed with a masthead that ran the sourcing back to the building. */
{
    readonly kind: "leak-backfire";
    readonly engagementId: string;
}
/**
 * A decision on the President's own record that the press could take up: the
 * `institutional` cost the act declared, or a covert operation that failed.
 * `eventId` is the ledger entry's own causal id, so the story and the week
 * that caused it are the same fact rather than two.
 */
 | {
    readonly kind: "own-act";
    readonly eventId: string;
    readonly charge: OwnActCharge;
}
/**
 * An officer who talked to the press about something the government did.
 * Opened by the world rather than by the President: the leak is on the ledger
 * with the cabinet sweep's provenance, and the story is about what it said.
 */
 | {
    readonly kind: "cabinet-leak";
    readonly eventId: string;
    readonly person: PersonId;
    /** The colleague a leak was aimed at, when it was aimed: the story is about them. */
    readonly target?: PersonId;
}
/**
 * An inspector general's report on a department, published. The audit ran
 * inside the building for weeks; the week it reports is the week the country
 * reads it, and the story is what it found.
 */
 | {
    readonly kind: "inspector-general";
    readonly matterId: string;
    readonly institution: string;
}
/**
 * A flag a scenario reply set directly. Lifecycled from its turn-stamped
 * marker where one exists; a flag set before markers, or by something that
 * does not stamp them, still stands at full weight for as long as the flag
 * does.
 */
 | {
    readonly kind: "flagged";
    readonly flag: string;
};
/**
 * The officer a story names. Derived from the act's own counsel where the act
 * took counsel, so the person a story asks about is the person who advised the
 * decision rather than a name picked for the occasion.
 */
export type ScandalImplicated = {
    readonly person: PersonId;
    readonly role?: RoleId;
};
export type ScandalIdentity = {
    readonly id: string;
    readonly subject: string;
    readonly origin: ScandalOrigin;
    readonly charge: ScandalCharge;
    readonly brokeTurn: number;
    readonly context?: string;
    readonly implicated?: ScandalImplicated;
};
/**
 * How grave a story is by what it charges, 0..1, scaling what the story costs
 * the country's belief in the government's honesty at any given heat.
 *
 * One at most, so the heaviest story costs what a live story always cost and
 * the rest cost less. The order is the order a public weighs them in: a hearing
 * about the act itself and a covert operation that came apart are about the
 * President's own honesty; a source lost is grave and mostly unseen; reaching
 * for emergency powers splits the country on whether it was warranted; a leak
 * traced to the building is about the staff before it is about the President;
 * an auditor's report is about a department before it is about its chief; and
 * an officer talking out of turn is the officer's story first.
 */
export declare const SCANDAL_GRAVITY: Readonly<Record<ScandalCharge, number>>;
/**
 * The share of cabinet leaks that turn into a story about conduct. Most leaks
 * are an officer losing a policy argument in public, which is a bad day and not
 * a scandal; about one in three carries something the government did that it
 * would rather nobody knew. At the cabinet's six to fifteen leaks a term that is
 * two to five stories a term from inside the building.
 */
export declare const CABINET_LEAK_STORY_SHARE: number;
/**
 * The week a flag was set, off the marker every authored flag is stamped with.
 * A flag with no marker has no date, and is read exactly as it was before
 * markers existed.
 */
export declare function flagSetTurn(campaign: Campaign, flag: FlagId): number | undefined;
/**
 * The flag the scandal phase keeps standing while any story is live, so a
 * scenario can gate on "a story is running" without reading the board. It
 * shares the `scandal:` prefix a scenario would look for, so it is excluded
 * here by name or it would open a story about itself.
 */
export declare const SCANDAL_LIVE_FLAG: FlagId;
export declare function flagIdentity(flag: string, brokeTurn: number): ScandalIdentity;
/** Authored scandal flags standing on the board, with the week each was set where it was stamped. */
export declare function scandalFlags(campaign: Campaign): readonly {
    readonly flag: string;
    readonly setTurn?: number;
}[];
/** Every dated story the campaign's facts can open: bad leaks, the President's own acts, cabinet leaks and auditors' reports. */
export declare function datedScandalIdentities(campaign: Campaign): readonly ScandalIdentity[];
