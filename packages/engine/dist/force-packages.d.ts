import { type ForceAssetId, type MilitaryBranch, type NationId } from "@admin/world";
import { type Campaign } from "./state.js";
export type PackageRung = 2 | 3 | 4 | 5;
export type ForcePackage = {
    readonly branch: MilitaryBranch;
    readonly unitType: ForceAssetId;
    readonly count: number;
    /**
     * The size the staff proposed for this target, which the count is measured
     * against. Absent on an older save or an order with no target in view, when
     * the package's own fixed proposal stands in.
     */
    readonly preferred?: number;
};
export type ForcePackageSpec = {
    readonly id: string;
    readonly name: string;
    readonly rung: PackageRung;
    readonly branch: MilitaryBranch;
    readonly unitType: ForceAssetId;
    readonly min: number;
    readonly preferred: number;
};
export declare const FORCE_PACKAGE_SPECS: readonly ForcePackageSpec[];
/** The arm's strength the package faces, 0..1, or undefined with no target to read. */
export declare function opposingStrength(campaign: Campaign, target: NationId | undefined, spec: ForcePackageSpec): number | undefined;
/** A package as the staff would size it against this target; the spec itself where nothing scales it. */
export declare function specAgainst(campaign: Campaign, target: NationId | undefined, spec: ForcePackageSpec): ForcePackageSpec;
export type ComposedPackage = {
    readonly spec: ForcePackageSpec;
    readonly available: number | undefined;
    readonly min: number;
    readonly max: number;
    readonly defaultCount: number;
    readonly closedReason?: string;
};
export declare function specForRung(rung: number): ForcePackageSpec | undefined;
/**
 * How far past its preferred size a package may be sent. Its effects scale by
 * the same bound, so a count the picker offers above it would commit hulls
 * that change nothing; the money is per unit sent (`force-costs.ts`).
 */
export declare const PACKAGE_MAX_SCALE = 1.5;
export declare function scaleAgainstPreferred(count: number, preferred: number): number;
/** The most of this package that can be sent: whole units at the scale billing reaches, never below its floor. */
export declare function packageCeiling(spec: ForcePackageSpec): number;
/** How hard the package lands against the size the staff proposed: what every effect of the rung scales by. */
export declare function forceScale(rung: number, force?: ForcePackage): number;
export declare function clampForce(spec: ForcePackageSpec, count: number, available: number | undefined): ForcePackage;
/** Every package the actor could send, each sized against the target when one is named. */
export declare function composeForcePackages(campaign: Campaign, actor: NationId, target?: NationId): readonly ComposedPackage[];
export declare function packageForce(composed: ComposedPackage, count: number): ForcePackage | undefined;
