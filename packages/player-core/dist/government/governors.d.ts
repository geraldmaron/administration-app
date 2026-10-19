import { type FacedPerson, type StateId } from "@admin/world";
import { type Campaign, type UsParty } from "@admin/engine";
/**
 * The fifty governors as one roster: a jurisdiction of its own, read from the
 * standing the engine keeps on each state rather than re-derived here.
 *
 * The District has no governor and is left out rather than drawn as a vacancy —
 * an empty chair that was never a chair would read as something to fill.
 */
export type GovernorRow = {
    readonly state: StateId;
    readonly stateName: string;
    readonly region: string;
    readonly electoralVotes: number;
    /** The governor as their face is drawn: the whole record the portrait reads, so it matches every other screen. */
    readonly person?: FacedPerson;
    readonly party?: UsParty;
    /** 0..1, how the governor sits toward the administration. */
    readonly disposition?: number;
};
export declare function governorRows(campaign: Campaign): readonly GovernorRow[];
