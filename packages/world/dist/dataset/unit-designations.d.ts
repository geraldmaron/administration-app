import { type MilitaryBranch } from "../schemas/nation.js";
/**
 * How large the named formation is.
 *
 * `unit` is the battalion, squadron and company scale everything in the game is
 * written at. `formation` is the scale that owns those — a line that puts two
 * battalions across a river cannot be attributed to a battalion, and without
 * this axis it silently was.
 */
export declare const UNIT_ECHELONS: readonly ["unit", "formation"];
export type UnitEchelon = (typeof UNIT_ECHELONS)[number];
export type UnitDesignation = {
    readonly branch: MilitaryBranch;
    readonly branchDisplay: string;
    readonly echelon: UnitEchelon;
    readonly number: number;
    readonly type: string;
    /** "319th Interceptor Squadron" — the string a beat's prose actually carries. */
    readonly designation: string;
};
/**
 * What the caller's prose needs the drawn unit to be.
 *
 * A line whose verbs are aviation verbs cannot take an undersea squadron, and
 * an unconstrained draw does not know that. So the constraint travels with the
 * line that needs it and the draw is narrowed here rather than the prose being
 * written down to whatever six branches have in common.
 */
export type UnitDesignationConstraint = {
    /** Absent means any branch. */
    readonly branches?: readonly MilitaryBranch[];
    /** Absent means `unit`, the scale everything is written at by default. */
    readonly echelon?: UnitEchelon;
};
/** The branches that can be drawn at all under one constraint. */
export declare function branchesFor(constraint: UnitDesignationConstraint): readonly MilitaryBranch[];
/**
 * A deterministic, fictional unit designation: branch + number + type, e.g.
 * "319th Interceptor Squadron". `seedParts` is joined the same way an
 * engine `RngStreams.stream(...keyParts)` call joins a stream key — a caller
 * composes it from the campaign seed plus whatever identifies the draw (a
 * resolution beat id, a step index), so the same call always names the same
 * unit and two different draws in the same campaign do not collide.
 *
 * `constraint` narrows the draw to what the caller's prose can carry. An empty
 * constraint is the old behavior: any branch, at unit scale.
 */
export declare function generateUnitDesignation(constraint: UnitDesignationConstraint, ...seedParts: Array<string | number>): UnitDesignation;
