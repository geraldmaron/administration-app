import { type Campaign, type EffectPacket, type HillPostId, type LobbyApproach } from "@admin/engine";
import { type ActComparison } from "./act-comparison.js";
/** The bill on the desk, signed or returned; left there, it becomes law unsigned on its deadline. Undefined once it is off the desk. */
export declare function deskComparison(campaign: Campaign, billId: string): ActComparison | undefined;
/** The packet a desk choice commits. A veto refused for want of a message throws in the engine's words. */
export declare function deskPacket(campaign: Campaign, billId: string, choice: "sign" | "veto", objection: string): EffectPacket;
/** The administration's own bills it could send up this week. */
export declare function transmitComparison(campaign: Campaign): ActComparison;
export declare function transmitPacket(campaign: Campaign, actId: string): EffectPacket;
/** Every play, by the key the engine knows them by, in the order the engine lists them. */
export declare const LOBBY_APPROACHES: readonly LobbyApproach[];
/** Every way to work a member, each read from where they and their chamber stand today. Undefined when nobody holds the post. */
export declare function lobbyComparison(campaign: Campaign, post: HillPostId): ActComparison | undefined;
export declare function lobbyPacket(campaign: Campaign, post: HillPostId, approach: LobbyApproach): EffectPacket;
export type ExtensionNotice = {
    readonly id: string;
    readonly target: string;
    readonly daysLeft: number;
    readonly line: string;
    /** The War Powers section where this force is decided on: its war, or the target's security view. */
    readonly home: string;
    /** Why it cannot be certified today; absent when it can. */
    readonly refusal?: string;
    /** The necessity already certified, once the thirty days have been taken. */
    readonly certified?: string;
};
/**
 * The grounds a President can certify, with the target named. The statute asks
 * for unavoidable military necessity in the course of bringing the force out,
 * and the reasons that meet that test are few and the same for every country;
 * the engine records the sentence and Congress reads it back, so a fixed set
 * keeps the record legible without asking the player to draft legal prose.
 */
export declare function extensionGrounds(target: string): readonly {
    readonly value: string;
    readonly label: string;
}[];
/** Every introduction whose sixty-day clock is running, and whether its thirty-day extension can be certified now. */
export declare function extensionNotices(campaign: Campaign): readonly ExtensionNotice[];
/** Certifying the thirty days; uncertified, the sixty run out, which is the waiting line. */
export declare function extensionComparison(notice: ExtensionNotice): ActComparison;
export declare function extensionPacket(campaign: Campaign, id: string, necessity: string): EffectPacket;
