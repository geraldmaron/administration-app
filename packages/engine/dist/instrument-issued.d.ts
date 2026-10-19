import { type EffectPacket, type EffectSource } from "./effects.js";
import { type RngStreams } from "./rng.js";
import { type ActionProjection, type ResolutionExtras, type ResolutionRequest, type ResolutionResult, type ResolvedConsequence } from "./resolution.js";
import type { StagedResolution } from "./resolution-sequence.js";
import type { Campaign, IssuedInstrumentAct } from "./state.js";
export declare function outstandingInstrumentActs(campaign: Campaign): readonly IssuedInstrumentAct[];
type IssueResult = Extract<ResolutionResult, {
    ok: false;
}> | {
    readonly ok: true;
    readonly projection: ActionProjection;
    readonly packet: EffectPacket;
    readonly pending?: true;
    readonly consequence?: ResolvedConsequence;
    readonly staged?: StagedResolution;
};
/** Issue separately from execution. Escrow and force reservations survive saves. */
export declare function issueAction(campaign: Campaign, request: ResolutionRequest, streams: RngStreams, source?: EffectSource, extras?: ResolutionExtras): IssueResult;
/** A pending order can be recalled; completed operations cannot be undone. */
export declare function withdrawInstrumentAct(campaign: Campaign, id: string): {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly missingCapability: string;
};
export declare function resolveDueInstruments(campaign: Campaign): {
    readonly campaign: Campaign;
    readonly packets: readonly EffectPacket[];
};
export {};
