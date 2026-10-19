import { type Campaign } from "@admin/engine";
import { type SecurityAssessmentRow } from "./assessment-reading.js";
import { type CollectionReading } from "./collection-reading.js";
import { type CommandCard } from "./command-board.js";
import { type CommitmentsReading } from "./commitment-reading.js";
import { type CovertReading } from "./covert-reading.js";
import { type PdbItem, type PdbReading } from "./pdb.js";
export type ServiceReadiness = {
    readonly id: string;
    readonly name: string;
    /** How many kinds of asset the service fields. */
    readonly lines: number;
    /** The share of an asset's fielded force that is free to go this week, averaged over the service's assets, 0..1. */
    readonly ready: number;
    /** The share held abroad by standing commitments, averaged the same way. */
    readonly abroad: number;
    /** The share fielded, uncommitted and not ready to go, averaged the same way. */
    readonly resting: number;
};
export type WarPowersRow = {
    readonly id: string;
    readonly target: string;
    readonly description: string;
    readonly reported: boolean;
    readonly missed: boolean;
    /** Days left before the force must come out without a vote; absent where no sixty-day clock runs. */
    readonly clock?: {
        readonly left: number;
        readonly window: number;
    };
    readonly href: string;
};
export type AuthorizationRow = {
    readonly id: string;
    readonly title: string;
    readonly standing: boolean;
    readonly until: string;
    readonly chance?: string;
};
export type SecurityBoard = {
    readonly pdb: PdbReading;
    readonly commands: readonly CommandCard[];
    readonly functional: readonly CommandCard[];
    readonly readiness: readonly ServiceReadiness[];
    readonly warPowers: readonly WarPowersRow[];
    readonly authorizations: readonly AuthorizationRow[];
    readonly covert: CovertReading;
    readonly collection: CollectionReading;
    readonly assessments: readonly SecurityAssessmentRow[];
    readonly commitments: CommitmentsReading;
};
export declare const URGENCY_WORDS: Readonly<Record<PdbItem["urgency"], string>>;
/** The morning's security items, the ones that need the President first. */
export declare function dailyItems(campaign: Campaign): PdbReading;
/**
 * Readiness by service. Hulls, airframes and formations are not one quantity,
 * so a service's shares are the average of its assets' own shares, each asset
 * counting once; adding raw counts would let the largest fleet of small units
 * stand for the whole service.
 */
export declare function serviceReadiness(campaign: Campaign): readonly ServiceReadiness[];
/** The War Powers paper still open: forces introduced and not brought out. */
export declare function warPowersRows(campaign: Campaign): readonly WarPowersRow[];
/** The force authorizations Congress holds and the ones it has granted. */
export declare function authorizationRows(campaign: Campaign): readonly AuthorizationRow[];
export declare function securityBoard(campaign: Campaign): SecurityBoard;
