import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { InstitutionId, InstitutionRuntime } from "./institutions.js";
import type { TurnPhase } from "./turn-loop.js";
import type { InspectorGeneral, OversightMatter } from "./oversight.js";
/**
 * What an agency's own numbers say about whether it needs looking at.
 *
 * Three readings, and each is a different way a body goes wrong. Standing
 * oversight pressure is what other people have already noticed — a leak, a
 * referral, a botched assessment — and it counts for most because it is the
 * only one of the three that is somebody else's judgment rather than the
 * agency's own. Politicization is the body being bent toward the
 * administration's politics and away from its mandate, which is precisely what
 * an inspector general exists to catch. Failing integrity is the ordinary
 * kind of rot underneath both.
 */
export declare function auditWarrant(runtime: InstitutionRuntime): number;
/**
 * The week the auditors take.
 *
 * One audit at a time per body, and at most one opened across the whole
 * government in a week — the worst-run agency first. Both caps are about what
 * the board is for: a president who has hollowed out nine departments should
 * watch the audits arrive one after another with time to answer each, not open
 * the room one morning to nine files and conclude the game has decided against
 * them.
 */
export declare const inspectorGeneralPhase: TurnPhase;
export type InspectorRemovalProjection = {
    readonly institution: InstitutionId;
    readonly institutionName: string;
    /** The week the office actually empties, if notice is filed now. */
    readonly effectiveTurn: number;
    /** The matters that will still be running when it does. */
    readonly openMatters: readonly OversightMatter[];
    /**
     * Whether filing this notice would be moving against a running inquiry.
     *
     * The whole of what the player needs to be told before they do it, and the
     * reason this projection exists at all: the cost of removing an inspector
     * general is not a number, it is which week they are being removed in.
     */
    readonly obstructs: boolean;
    readonly reasoning: string;
};
export declare function projectInspectorRemoval(campaign: Campaign, institution: InstitutionId): InspectorRemovalProjection;
export type OversightResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** How far filing notice moves Congress. Obstructing a live audit costs more than a quiet office. */
export declare function inspectorNoticeCost(obstructs: boolean): number;
/**
 * File the written notice that empties an inspector general's office in thirty
 * days.
 *
 * Not a removal. The office is still occupied, the audit is still running, and
 * both stay that way for the whole notice period — which is the point of the
 * protection and the reason this returns a filing rather than a vacancy.
 */
export declare function fileInspectorRemovalNotice(campaign: Campaign, institution: InstitutionId, reason: string): OversightResult;
/** Every office a president could still move against, for the board that offers it. */
export declare function selectRemovableInspectors(campaign: Campaign): readonly InspectorGeneral[];
