import { type StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
export type StaffordResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly declarationId: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function staffordRequestsAwaitingDeclaration(campaign: Campaign): readonly StateId[];
/** A Stafford major-disaster declaration is separate from an NEA emergency. */
export declare function declareStaffordDisaster(campaign: Campaign, state: StateId): StaffordResult;
