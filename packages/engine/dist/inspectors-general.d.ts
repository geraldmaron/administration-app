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
/** How far filing notice moves Congress. Obstructing a live audit costs more than a quiet office, and a deficient notice more again. */
export declare function inspectorNoticeCost(obstructs: boolean, deficient?: boolean): number;
/**
 * What the written communication rests its removal on. The statute allows the
 * President to remove an inspector general for any reason and requires that
 * the reasons be stated in detail and in the particular case; a ground names
 * the kind of reason, and the particulars carry the case.
 */
export type InspectorRemovalGround = "misconduct" | "incapacity" | "performance" | "conflict-of-interest"
/** A conclusion, not a cause: it states that the President no longer wants this person, and nothing about the case. */
 | "loss-of-confidence";
/** One particular of the case: the record it rests on, when it happened, and what the notice says it shows. */
export type InspectorRemovalParticular = {
    /** The oversight matter the cited conduct is documented in. */
    readonly matterId: string;
    /** The week the cited conduct occurred. */
    readonly turn: number;
    readonly statement: string;
};
export type InspectorRemovalAccount = {
    readonly ground: InspectorRemovalGround;
    readonly particulars: readonly InspectorRemovalParticular[];
};
/** Why a particular does not make the notice case-specific. */
export type AccountDefect = "conclusory" | "no-such-record" | "outside-tenure" | "protected-audit";
/** An account that states a conclusion and cites what it points at, where the callers hold only a sentence. */
export declare function conclusoryAccount(statement: string, matterId: string, turn: number): InspectorRemovalAccount;
/**
 * The ways an account fails to be case-specific, judged on the records the
 * campaign holds and never on the words of a statement: a conclusory ground, a
 * particular citing no record that exists, conduct dated outside the
 * inspector's service, or conduct that is the audit the office exists to run.
 */
export declare function accountDefects(campaign: Campaign, inspector: InspectorGeneral, account: InspectorRemovalAccount): readonly AccountDefect[];
/**
 * File the written notice that empties an inspector general's office in thirty
 * days.
 *
 * Not a removal. The office is still occupied, the audit is still running, and
 * both stay that way for the whole notice period — which is the point of the
 * protection and the reason this returns a filing rather than a vacancy.
 *
 * The notice has to carry an account: a ground and the particulars of the
 * case. Without particulars there is no communication of reasons at all and
 * nothing is filed. With them, the campaign's own records decide whether the
 * account is case-specific, and a deficient one is filed on the record as
 * deficient and costs the Hill more. The statute gives the President the
 * removal and gives Congress the right to be told why, so the price of a thin
 * notice is the question it invites.
 */
export declare function fileInspectorRemovalNotice(campaign: Campaign, institution: InstitutionId, account: InspectorRemovalAccount): OversightResult;
/** Every office a president could still move against, for the board that offers it. */
export declare function selectRemovableInspectors(campaign: Campaign): readonly InspectorGeneral[];
