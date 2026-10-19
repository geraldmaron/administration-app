import { type Campaign, type CombatantCommandId, type CommandPosture } from "@admin/engine";
import type { ForceAssetId, MilitaryBranch, NationId } from "@admin/world";
import { type ForcePrecision } from "../geo/force-placement.js";
export type CommandCommander = {
    readonly name: string;
    readonly service: string;
    readonly acting: boolean;
};
export type CommandCard = {
    readonly id: CombatantCommandId;
    readonly abbr: string;
    readonly name: string;
    /** The command holds a map: countries or seas assigned to it. A functional command, and a geographic one nothing is assigned to, is a card only. */
    readonly hasArea: boolean;
    readonly mission: string;
    readonly commander?: CommandCommander;
    readonly ordered: CommandPosture;
    /** What the theater stands at: never below heightened while it is engaged. */
    readonly effective: CommandPosture;
    readonly engaged: boolean;
    /** Places the command holds forces: installations and zones. */
    readonly places: number;
    /** The command's forces abroad against the largest command's, 0..1, never a head count. */
    readonly weight: number;
    /** How well an order would carry out through this command's chain, 0..1. */
    readonly chain: number;
    /** Each service's share of its formations assigned here, 0..1, services with none left out. */
    readonly assignment: readonly CommandBranchShare[];
    /** Formations assigned across the services (the national bench times each share, rounded down). */
    readonly formations: number;
    /** How many governments the theater is engaged against or has forces committed toward. */
    readonly engagedWith: {
        readonly against: number;
        readonly toward: number;
    };
    readonly href: string;
};
export declare const BRANCH_ORDER: readonly MilitaryBranch[];
export declare const branchName: (branch: MilitaryBranch) => string;
export declare const POSTURE_WORDS: Readonly<Record<CommandPosture, string>>;
/** Every combatant command in the catalog's order, geographic first. */
export declare function commandCards(campaign: Campaign): readonly CommandCard[];
/** The map key that frames a command's area: its countries and seas as one set. A functional command has none, so the world. */
export declare function commandCamera(campaign: Campaign, id: CombatantCommandId): string;
/** The countries a command's area lights on the map, as a selection; a sea is not a region the map selects. */
export declare function commandSelection(campaign: Campaign, id: CombatantCommandId): string | undefined;
export type CommandForceRow = {
    readonly id: string;
    /** The installation's name where its anchor is sourced; otherwise the zone. */
    readonly label: string;
    readonly precision: ForcePrecision;
    readonly what: string;
    /** The force the row holds where it is a commitment of a counted asset. */
    readonly asset?: {
        readonly unitType: ForceAssetId;
        readonly count: number;
    };
    readonly service?: string;
    readonly band?: string;
};
export type CommandZoneForces = {
    readonly zone: string;
    readonly name: string;
    readonly rows: readonly CommandForceRow[];
};
export type CommandBranchShare = {
    readonly branch: MilitaryBranch;
    readonly label: string;
    readonly share: number;
};
export type CommandAmendmentRow = {
    readonly nation: string;
    readonly from: string;
    readonly to: string;
    readonly date: string;
    readonly rationale: string;
};
export type CommandFile = {
    readonly card: CommandCard;
    readonly headquarters: string;
    readonly missions: readonly string[];
    readonly reliefs: number;
    /** Where the chain of command bends on the way to this theater, in words. */
    readonly chainBreaks: readonly string[];
    /** The governments the theater is engaged against or has forces committed toward. */
    readonly engagedAgainst: readonly string[];
    readonly engagedToward: readonly string[];
    readonly assignment: readonly CommandBranchShare[];
    readonly zones: readonly CommandZoneForces[];
    readonly nations: readonly {
        readonly id: NationId;
        readonly name: string;
    }[];
    readonly amendments: readonly CommandAmendmentRow[];
    readonly camera: string;
    readonly selection?: string;
};
/** One command's file, or undefined for an id the catalog does not list. */
export declare function commandFile(campaign: Campaign, id: string): CommandFile | undefined;
