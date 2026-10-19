import { type Campaign, type CombatantCommandId } from "@admin/engine";
import { type LonLat, type NationId, type ZoneId } from "@admin/world";
export type CommandArea = {
    readonly command: CombatantCommandId;
    readonly nations: readonly NationId[];
    readonly seas: readonly ZoneId[];
};
/**
 * The command that holds a sea: the one holding most of its littoral on this
 * campaign's map, the principal littoral breaking a tie. Undefined when no
 * littoral government is on the roster.
 */
export declare function seaCommand(campaign: Campaign, sea: ZoneId | string): CombatantCommandId | undefined;
/** The command whose area a zone falls in, read live. */
export declare function zoneCommand(campaign: Campaign, zone: ZoneId | string): CombatantCommandId | undefined;
/**
 * Every command that has an area, in the catalog's order. A functional command
 * (strategic, special operations, transportation, cyber) never has one, and a
 * geographic command nothing on the map is assigned to (space) has none
 * either: those are cards, never regions.
 */
export declare function commandAreas(campaign: Campaign): readonly CommandArea[];
export type ForcePrecision = "installation" | "zone";
export type ForcePlacement = {
    /** The commitment the forces are, so a marker opens the same record the ledger does. */
    readonly id: string;
    readonly actor: NationId;
    readonly kind: "basing" | "deployment";
    readonly zone: ZoneId;
    readonly zoneName: string;
    readonly command?: CombatantCommandId;
    readonly precision: ForcePrecision;
    readonly point: LonLat;
    /** The installation's name where the anchor is sourced; the zone's otherwise. */
    readonly label: string;
    readonly service?: string;
    readonly personnelBand?: string;
    /** A rough head count for sizing a marker, never shown as a figure. Zero where nothing gives one. */
    readonly personnel: number;
    /** Where the point came from: the opened record behind an anchor, or how the zone was drawn. */
    readonly source: string;
};
/** A band's rough midpoint, for sizing only: "A to B" gives the middle, "under N" half of N, anything else nothing. */
export declare function bandMidpoint(band: string | undefined): number | undefined;
/**
 * Every force on the board with a place to stand: installations at their
 * sourced points, everything else on a seeded slot in its zone. A slot is the
 * hash of the campaign seed and the commitment id, stepped past slots an
 * earlier unit in the same zone already holds, so two units share a spot only
 * when the zone has run out of them.
 */
export declare function placeForces(campaign: Campaign): readonly ForcePlacement[];
