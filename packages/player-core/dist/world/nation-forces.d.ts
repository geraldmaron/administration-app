import { type Campaign, type CommitmentLevel, type ComposedPackage, type ForceDomainId, type ForcePackage, type PackageBrief } from "@admin/engine";
import { type ForceAssetId, type MilitaryBranch, type NationId } from "@admin/world";
export type ForceBandWord = "Formidable" | "Strong" | "Capable" | "Limited" | "Slight";
export type CountedHolding = {
    readonly domain: ForceDomainId;
    readonly branch: MilitaryBranch;
    readonly unitType: ForceAssetId;
    /** The roster label, plural: "Aircraft carriers". */
    readonly label: string;
    /** What the service fields now. */
    readonly total: number;
    /** Held abroad by standing commitments. */
    readonly committed: number;
    /** Free to be sent somewhere this week. */
    readonly available: number;
    /** Fielded, not committed, and not ready to go this week. */
    readonly belowReadiness: number;
    /** The department that holds it, where the holding is the President's own. */
    readonly service?: string;
};
export type InferredDomain = {
    readonly domain: ForceDomainId;
    readonly label: string;
    /** Why no count prints: no order of battle on file, or no reading of the government at all. */
    readonly reason: "inferred" | "unread";
};
/** One domain as a band: how much of a force it is, never how many. */
export type DomainBand = {
    readonly domain: ForceDomainId;
    readonly label: string;
    readonly strength: number;
    readonly band: ForceBandWord;
    readonly counted: boolean;
};
export type NuclearStanding = {
    readonly band: string;
    /** The count, where the services read the government. */
    readonly warheads?: number;
};
/** The force as a whole, in the class it fights in and how long it could keep fighting. */
export type WarfightingClass = {
    readonly label: string;
    readonly sustains: string;
};
export type NationForcesReading = {
    readonly nation: NationId;
    /** Whether the President's services read this government. */
    readonly read: boolean;
    readonly warfighting?: WarfightingClass;
    readonly strip: readonly DomainBand[];
    readonly counted: readonly CountedHolding[];
    readonly inferred: readonly InferredDomain[];
    readonly nuclear?: NuclearStanding;
};
/**
 * A government's forces as far as the President can know them, or undefined
 * for a government not on the board. Counts print only for a domain the
 * dataset holds an order of battle for, in a government the services read.
 */
export declare function nationForces(campaign: Campaign, nation: NationId): NationForcesReading | undefined;
/** What one of the President's own departments holds, counted: the rows `/service/$id` draws. */
export declare function serviceHoldings(campaign: Campaign, service: string): readonly CountedHolding[];
/** A holding as a count a sentence can carry: "11 aircraft carriers", "1 aircraft carrier". */
export declare function holdingCount(unitType: ForceAssetId, count: number): string;
/**
 * The force a military rung would send, as the President chooses it: the
 * package, what the bench leaves free, the count each commitment level reads,
 * and the staff's brief. Undefined for a rung that sends no package.
 */
export type ForcePackageChoice = {
    readonly composed: ComposedPackage;
    readonly brief: PackageBrief;
    readonly levels: readonly {
        readonly level: CommitmentLevel;
        readonly count: number;
    }[];
    /** What the staff sized the package against, when it was sized against a target at all. */
    readonly sizing?: {
        readonly targetName: string;
        readonly arm: "air arm" | "navy" | "army";
        readonly strength: number;
    };
};
/** The force a rung sends against this target: sized to what the target fields, inside what the bench leaves free. */
export declare function forcePackageFor(campaign: Campaign, rung: number, target?: NationId): ForcePackageChoice | undefined;
/** The package the President's chosen count sends, inside the bounds the bench and the bill share; undefined while it is closed. */
export declare function chosenForce(choice: ForcePackageChoice, count: number): ForcePackage | undefined;
