import { type NationId } from "@admin/world";
import { type Blockade } from "./blockades.js";
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
    /** Governments off the shore blockading one on it, whose navies stop only that government's cargo and their enemies'. */
    readonly blockaders: readonly NationId[];
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
/**
 * Whether a navy blockading a government on the strait's shores, from off the
 * shore, lets a cargo through. It stops cargo bound for the government it
 * blockades and for governments it is at war with, and no one else's: a navy
 * that does not hold the shore cannot close the strait as a whole.
 */
export declare function blockaderLetsThrough(campaign: Campaign, blockade: Pick<Blockade, "imposer" | "target">, destination: NationId): boolean;
/** Who passes a strait this war closes, for one commodity's cargo. */
export declare function straitPassage(campaign: Campaign, conflict: Conflict, chokepoint: string, commodity: string, littoral: readonly NationId[]): StraitPassage;
