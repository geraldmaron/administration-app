import type { EffectPacket } from "./effect-types.js";
import { type ScandalCharge, type ScandalImplicated } from "./scandal-origins.js";
import type { Campaign, FlagId, ScandalResponse, ScandalVerb } from "./state.js";
export declare const SCANDAL_RESPONSE_VERBS: readonly ["come-clean", "fight-it", "give-them-someone"];
export type ScandalResponseVerb = ScandalVerb;
/** How an answer lands against the file: the story fades, holds, or gets heavier. */
export type ScandalPriceWord = "fading" | "steady" | "heavy";
export type ScandalResponseTarget = {
    readonly id: string;
    readonly subject: string;
    readonly stage: "breaking" | "developing" | "fading" | "resolved";
    readonly charge: ScandalCharge;
    readonly implicated?: ScandalImplicated;
};
export type ScandalResponseProjection = {
    readonly verb: ScandalResponseVerb;
    readonly label: string;
    readonly ask: string;
    /** What choosing it puts at risk, in words, before the choice. */
    readonly risk: string;
    readonly price: ScandalPriceWord;
    /** Present when this answer cannot be given to this story at all. */
    readonly unavailable?: string;
};
export type ScandalResponseResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly verb: ScandalResponseVerb;
    readonly price: ScandalPriceWord;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** An answer on the record: which verb, how it landed, and the week it was given. */
export type ScandalAnswer = {
    readonly verb: ScandalResponseVerb;
    readonly price: ScandalPriceWord;
    readonly turn: number;
};
export declare const SCANDAL_RESPONSE_LABELS: Readonly<Record<ScandalResponseVerb, string>>;
/** The dated flag a save kept before `press.scandalResponses` recorded the answer with. Read, never written. */
export declare function scandalResponseFlag(id: string, verb: ScandalResponseVerb): FlagId;
/**
 * The President's answer to a story: the stored response, or on an older save
 * the dated flag it was kept as. A flag with no week on its marker is an answer
 * with no date, so it says the story was answered but not when.
 */
export declare function scandalResponseOf(campaign: Campaign, id: string): (Omit<ScandalResponse, "turn"> & {
    readonly turn?: number;
}) | undefined;
export declare function scandalResponseTaken(campaign: Campaign, id: string): ScandalResponseVerb | undefined;
/** Hidden evidence in [0, 1), the same number every time this story is read. */
export declare function scandalEvidenceStrength(seed: string, scandalId: string): number;
/** How this answer meets this file: one verb fits, one is a step off, one is the worst answer to give. */
export declare function scandalResponsePrice(seed: string, id: string, charge: ScandalCharge, verb: ScandalResponseVerb): ScandalPriceWord;
/** What the President's counsel thinks the papers can prove: a thin file, a file with a name in it, or a thick one. */
export type ScandalFileRead = "thin" | "named" | "thick";
/**
 * How often counsel reads the file right. Nobody inside the building sees the
 * newsroom's documents, so the read is a judgment and is sometimes wrong; right
 * often enough to be worth asking, wrong often enough that the choice is still
 * the President's.
 */
export declare const SCANDAL_COUNSEL_ACCURACY = 0.6;
/** Counsel's read of the file, the same every time the story is read, and right about three times in five. */
export declare function scandalCounselRead(seed: string, id: string, charge: ScandalCharge): ScandalFileRead;
/** The answer on the record for a story, with the week it was given, if any. */
export declare function scandalAnswer(campaign: Campaign, id: string, charge: ScandalCharge): ScandalAnswer | undefined;
export declare function projectScandalResponses(campaign: Campaign, scandal: ScandalResponseTarget): readonly ScandalResponseProjection[];
export declare function favoredScandalResponse(campaign: Campaign, scandal: ScandalResponseTarget): ScandalResponseVerb;
export declare function respondToScandal(campaign: Campaign, scandal: ScandalResponseTarget | undefined, verb: ScandalResponseVerb): ScandalResponseResult;
