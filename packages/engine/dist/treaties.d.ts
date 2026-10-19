import type { Charter, NationId, OrgId, TreatyId } from "@admin/world";
import { type Campaign, type ChamberVote, type IssuedTreatyAct, type LobbyForecast, type TreatyKind, type TreatyRecord } from "./state.js";
import { type EffectPacket } from "./effects.js";
export type TreatyTerms = {
    readonly kind: TreatyKind;
    readonly name: string;
    readonly summary: string;
    /**
     * What the Senate thinks of this kind of instrument before it reads the
     * particular one. An arms-control treaty is the hardest thing to get sixty-
     * seven votes for and a trade agreement is the easiest, and neither of those
     * facts has anything to do with the counterpart.
     *
     * Absent for a kind that binds on signature: it never reaches a Senate whip
     * count to have an opinion about.
     */
    readonly senateAppeal?: number;
    /** What being in force does to the relationship it is with. */
    readonly effect: {
        readonly trust: number;
        readonly alignment: number;
        readonly tension: number;
    };
    /** How warm the counterpart has to be before there is anything to sign. */
    readonly minTrust: number;
    /**
     * Whether this instrument needs the Senate's two thirds before it does
     * anything, or takes effect the moment it is signed.
     *
     * An Article II treaty binds on ratification. Most of what the United States
     * actually concludes abroad is a congressional-executive or sole executive
     * agreement instead (Case-Zablocki Act, 1 U.S.C. section 112b) — the
     * President's own authority is enough, no vote is taken, and what is bought
     * with the missing vote is durability: the relationship effect is smaller,
     * and the next administration can walk away from it unilaterally in a way it
     * cannot from a ratified treaty.
     */
    readonly bindsOn: "ratification" | "signature";
};
export declare const TREATY_TERMS: Readonly<Record<TreatyKind, TreatyTerms>>;
/**
 * The instrument a standing defense compact already is.
 *
 * A mutual-defense body is not a club that has a treaty somewhere near it: NATO
 * *is* the North Atlantic Treaty, and every member is party to the same
 * document. So the id is minted per compact rather than per pair — two members
 * hold one instrument between them, and a surface that counts what is in force
 * counts it once however many capitals are inside it.
 *
 * Distinct from `treatyRecordId` by construction, so an inherited compact can
 * never be confused with something this administration signed.
 */
export declare function compactTreatyId(org: OrgId): TreatyId;
export declare function treatyTitle(campaign: Campaign, kind: TreatyKind, counterpart: NationId): string;
export type RatificationProjection = {
    readonly vote: ChamberVote;
    readonly wouldRatify: boolean;
    /** Hidden engine odds; ordinary play reads `forecast` instead. */
    readonly successChance: number;
    readonly forecast: LobbyForecast;
    /** The one-line reason the count is what it is — no exact shortfall. */
    readonly reasoning: string;
};
/**
 * The whip count before the treaty is sent up. Pure and seed-independent: the
 * engine still uses the exact arithmetic; ordinary play reads likelihood and
 * confidence instead of the yeas.
 */
export declare function projectRatification(campaign: Campaign, record: TreatyRecord): RatificationProjection;
export type TreatyResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
    readonly record: TreatyRecord;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Sign it abroad.
 *
 * Deliberately not gated on whether the Senate would ratify. A president who has
 * negotiated an agreement the Hill will refuse has done something real and
 * consequential, and refusing the signature here would model a presidency that
 * can only ever promise what it can already deliver — which is not this office.
 */
export declare function signTreaty(campaign: Campaign, charter: Charter, kind: TreatyKind, counterpart: NationId): TreatyResult;
export type TreatyIssueResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly projection: RatificationProjection;
    readonly act: IssuedTreatyAct;
    readonly packet: EffectPacket;
};
/**
 * Send it to the Senate. The floor has not voted; Continue brings the count on
 * the due date. Ordinary play freezes likelihood and confidence, not the yeas.
 */
export declare function issueRatification(campaign: Campaign, id: string): TreatyIssueResult;
/** Resolve one issued ratification whose due date has arrived. */
export declare function resolveIssuedTreaty(campaign: Campaign, id: string, roleTitles?: Readonly<Record<string, string>>): TreatyResult;
export declare function dueIssuedTreatyActs(campaign: Campaign): readonly IssuedTreatyAct[];
/** Every treaty still waiting on the Senate floor, whether or not it is due. */
export declare function outstandingIssuedTreatyActs(campaign: Campaign): readonly IssuedTreatyAct[];
/** Apply every ratification that has come due. */
export declare function resolveDueTreaties(campaign: Campaign, roleTitles?: Readonly<Record<string, string>>): {
    readonly campaign: Campaign;
    readonly packets: readonly EffectPacket[];
};
/** Take it back off the table, which a president may do and a Senate may not. */
export declare function withdrawTreaty(campaign: Campaign, id: string): TreatyResult;
