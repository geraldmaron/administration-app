import { type NationId } from "@admin/world";
import { type InstrumentRung } from "./instrument-gates.js";
export declare const economicRungs: readonly InstrumentRung[];
export declare const assistanceRungs: readonly InstrumentRung[];
/**
 * The standing promise one nation has made to defend another, in the same
 * governance-flag vocabulary an embargo or a severance is written in — so a
 * scenario, a card, or a later rung can read it without a second store.
 */
export declare function securityGuaranteeFlag(actor: NationId, target: NationId): string;
