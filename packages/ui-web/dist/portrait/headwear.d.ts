import { type FaceGenome, type Headwear } from "./types";
import { type Layout } from "./layout";
/** Coverings that hide the hair entirely, so no cut is drawn beneath them. */
export declare const HIDES_HAIR: ReadonlySet<Headwear>;
/** Coverings that also hide the ears. */
export declare const HIDES_EARS: ReadonlySet<Headwear>;
export declare const FRAMES: Readonly<Record<FaceGenome["eyewear"]["frame"], string>>;
export declare function headwear(id: string, L: Layout, g: FaceGenome): string;
export declare function glasses(L: Layout, g: FaceGenome): string;
export declare function earrings(L: Layout, g: FaceGenome): string;
