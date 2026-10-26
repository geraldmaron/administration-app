import { type NationId } from "@admin/world";
import { type Campaign } from "./state.js";
import { type InstrumentRung } from "./instrument-gates.js";
export declare const economicRungs: readonly InstrumentRung[];
type AidPurpose = "civil" | "security";
/**
 * Planning value: how much one remembered act of aid for the same purpose
 * damps the goodwill of the next. Goodwill from help falls as help becomes
 * the expected thing, whatever the act is called.
 */
export declare const AID_SATURATION = 1;
/**
 * 0..1 of an act of aid's goodwill that still lands: each earlier act of the
 * same purpose from the same giver to the same recipient, faded by the
 * calendar at a favor's half-life (`FAVOR_HALF_LIFE_DAYS`), damps it.
 */
export declare function aidReception(campaign: Campaign, actor: NationId, target: NationId, purpose: AidPurpose): number;
export declare const assistanceRungs: readonly InstrumentRung[];
/**
 * The standing promise one nation has made to defend another, in the same
 * governance-flag vocabulary an embargo or a severance is written in — so a
 * scenario, a card, or a later rung can read it without a second store.
 */
export declare function securityGuaranteeFlag(actor: NationId, target: NationId): string;
export {};
