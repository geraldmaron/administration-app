import { NationPartySystem, type Nation } from "../schemas/nation.js";
export declare const NATION_PARTY_SYSTEMS: Readonly<Record<string, NationPartySystem>>;
/**
 * Attach each nation's politics to its record.
 *
 * A nation with nothing authored is a research gap, not a country with no
 * politics — `contest: "none"` is the second statement and has to be written
 * down rather than inferred from silence. So an unauthored nation throws here
 * rather than assembling into a dataset the validator would refuse anyway,
 * which puts the failure on the id that caused it instead of on a schema error
 * fifty nations later.
 */
export declare function applyPartySystems<T extends {
    readonly id: Nation["id"];
}>(nations: readonly T[]): (T & {
    partySystem: NationPartySystem;
})[];
