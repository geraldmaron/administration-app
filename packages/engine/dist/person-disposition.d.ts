import { type IdeologyVector, type Person } from "@admin/world";
export type DispositionAxis = "deference" | "principle" | "boldness" | "forceAppetite" | "craft";
export type Disposition = {
    readonly [K in DispositionAxis]: number;
};
export declare const DISPOSITION_AXES: readonly DispositionAxis[];
export declare function dispositionOf(person: Person): Disposition;
export declare const DISPOSITION_CENTER: Disposition;
/** How far this person sits from the typical cabinet member on one axis, signed. */
export declare function axisLean(person: Person, axis: DispositionAxis): number;
/**
 * How far apart two people sit on the three axes, 0 (identical) to 1
 * (opposed on all three).
 */
export declare function ideologyGap(a: IdeologyVector, b: IdeologyVector): number;
export declare function traitPull(a: Person, b: Person): number;
/**
 * How well two people get on from who they are alone: agreement on the issues,
 * read at `scale` because how wide a gap counts as a quarrel depends on how
 * clustered the group is, plus the temperaments that clash or click. Unclamped,
 * so a caller adding a term of its own clamps once.
 */
export declare function personalAffinity(a: Person, b: Person, scale: number): number;
export declare function rapportCenterOf(): number;
/** How well two leaders get on personally, centered on the typical pair of governments, -1..1. */
export declare function leaderRapport(a: Person, b: Person): number;
/**
 * Which engine modules may read each axis.
 *
 * A budget, not documentation: scripts/verify-disposition-readers.mjs scans the
 * engine for every reader and fails one that is not listed here, or a listing
 * that no longer reads its axis. Two terms in one
 * outcome reading the same person field through two axes is the double count
 * this reader exists to prevent, and the only way to see it before it ships is
 * to know every place an axis is read.
 */
export declare const DISPOSITION_READERS: Readonly<Record<DispositionAxis, readonly string[]>>;
