import { Plank } from "../schemas/platform.js";
/**
 * The planks a US platform can be built from.
 *
 * Parsed at load, the same way the charter is, so a malformed plank fails the
 * build rather than reaching a founding screen.
 *
 * Ten, split evenly between the two parties' usual ground, so either ticket
 * can build a platform of its own without borrowing the other's. Six are
 * economic and four are not. The engine owns what each one commits the
 * administration to; this table owns only what a player reads and who each
 * plank is written for. A plank courts cohorts whose own politics lean the way
 * its program pushes, which the engine's tests check against that program, so
 * a plank never courts the people its own program is against.
 */
export declare const platformPlanks: readonly Plank[];
export declare const plankById: ReadonlyMap<string, Plank>;
