import type { FaceGenome } from "./types";
import { type Pt } from "./geometry";
export type Layout = {
    readonly age: number;
    /** 0 at thirty, 1 at eighty: how far the years have worked on the face. */
    readonly years: number;
    readonly crownY: number;
    readonly hairlineY: number;
    readonly browY: number;
    readonly eyeY: number;
    readonly tipY: number;
    readonly mouthY: number;
    readonly chinY: number;
    readonly jawY: number;
    readonly cheekY: number;
    readonly templeY: number;
    readonly cheekW: number;
    readonly templeW: number;
    readonly jawW: number;
    readonly chinW: number;
    readonly crownSideW: number;
    readonly face: readonly Pt[];
    readonly eyeInner: number;
    readonly eyeW: number;
    readonly eyeH: number;
    readonly eyeTilt: number;
    readonly noseW: number;
    readonly mouthW: number;
    readonly neckW: number;
    readonly shoulderW: number;
    readonly earTop: number;
    readonly earBottom: number;
    /** How far the collar and shoulders sit from where a mid-length face puts them. */
    readonly bodyShift: number;
};
/** Anything that rests on the shoulders moves with them when a face's length moves the collar. */
export declare function onShoulders(L: Layout, points: readonly Pt[]): Pt[];
export declare function layoutFor(g: FaceGenome, age: number): Layout;
