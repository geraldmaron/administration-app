import { type NationId } from "@admin/world";
import { type Campaign, type Conflict } from "./state.js";
/**
 * Planning value: how warmly a closing government has to read a flag's
 * government (`disposition`, -1..1) to let its ships through when the two are
 * not aligned. Set above neutral, so passage is a favor rather than a default.
 */
export declare const PASSAGE_DISPOSITION = 0.3;
export type StraitPassage = {
    readonly chokepoint: string;
    /** The governments on the strait's shores fighting in the war that closed it. */
    readonly deniers: readonly NationId[];
    /** Named flags let through. */
    readonly passing: readonly NationId[];
    /** Named flags and unsplit cargo stopped. */
    readonly stopped: readonly string[];
    /** 0..1 of the strait's flow stopped. */
    readonly stoppedShare: number;
};
/**
 * Whether the closing government lets this flag's ships through: its own and
 * its co-belligerents' always, its enemies' in this war never, otherwise an
 * aligned government's or one it reads warmly.
 */
export declare function letsThrough(campaign: Campaign, conflict: Conflict, denier: NationId, flag: NationId): boolean;
/** Who passes a strait this war closes, for one commodity's cargo. */
export declare function straitPassage(campaign: Campaign, conflict: Conflict, chokepoint: string, commodity: string, littoral: readonly NationId[]): StraitPassage;
