import { LeaderConstraint } from "../schemas/leader-constraint.js";
export declare const LEADER_TABLE_AS_OF = "2026-09-23";
export declare const NATION_LEADER_CONSTRAINTS: Readonly<Record<string, LeaderConstraint>>;
/**
 * Salted hashes of every ordered pair of words in the names of the people the
 * table's sources cite, sitting officeholders among them. The draw refuses a
 * name that carries one (`carriesRealName`); the list holds numbers, never names,
 * and scripts/verify-leader-fidelity.mjs re-derives it from the sources.
 */
export declare const REAL_NAME_SALT = "leader-table-2026-09-23";
export declare const REAL_NAME_HASHES: readonly number[];
