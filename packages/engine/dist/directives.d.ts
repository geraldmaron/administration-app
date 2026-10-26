import type { Campaign } from "./state.js";
import { type DecisionStamp } from "./willingness.js";
import type { EffectPacket } from "./effects.js";
import type { InstitutionDef, InstitutionId } from "./institutions.js";
export type DirectiveId = string;
/**
 * What kind of thing the President is telling a body to do.
 *
 * Cut at the joint the statutes are cut at rather than by department. Directing
 * the general posture of enforcement is lawful nearly everywhere; pointing that
 * enforcement at a named party is barred nearly everywhere it matters, and the
 * two are one word apart in ordinary speech.
 */
export type DirectiveKind = 
/** Open, close or direct a case on a named subject. */
"investigation"
/** Point an existing enforcement function at a named party. */
 | "targeting"
/** How hard the body enforces what it already enforces, across the board. */
 | "enforcement-posture"
/** The pace at which designations are made. */
 | "sanctions-tempo"
/** The policy rate. */
 | "monetary";
/**
 * What became of the instruction.
 *
 * `slow-walked` is the honest middle and the common one: the body did not
 * refuse, it is simply not going to do this quickly, because it is
 * semi-autonomous or because it is not currently capable of much. Nothing in
 * the world moves for a slow-walked directive either, but no memorandum was
 * written and nobody outside the building has anything to read.
 */
export type DirectiveStatus = "carried" | "refused" | "slow-walked";
/**
 * The paper that comes back instead of the thing that was asked for.
 *
 * `reason` is printed unaltered wherever the memorandum is shown. It is the
 * whole of what makes a refusal legible rather than a shrug: the player is not
 * told the request failed, they are told which statute answers it and in what
 * words.
 */
export type RefusalMemorandum = {
    /** The authority the refusal rests on, as counsel cites it. */
    readonly authority: string;
    /** The statutory reason, in the words the memorandum uses. Never summarized. */
    readonly reason: string;
    /** Who signed it. */
    readonly signedBy: string;
};
export type Directive = {
    readonly id: DirectiveId;
    readonly institution: InstitutionId;
    readonly kind: DirectiveKind;
    /** Who or what the body was told to point at, in the words the record keeps. */
    readonly subject: string;
    /** How hard this order leaned. Absent on a directive issued before weights existed; the kind's own weight applies. */
    readonly pressure?: number;
    readonly issuedTurn: number;
    readonly status: DirectiveStatus;
    /** Present on a refusal and only on a refusal. */
    readonly memorandum?: RefusalMemorandum;
    /** The officer's own weighing, on casework a statute does not bar: the Attorney General at Justice, the chair at a commission. */
    readonly judgment?: DecisionStamp;
};
/** Keyed by id. Refused directives are kept forever, for the reason a refusal is. */
export type DirectiveStore = Readonly<Record<DirectiveId, Directive>>;
export declare function foundingDirectives(): DirectiveStore;
/**
 * Every instruction this administration has given, oldest first.
 *
 * Defaulted rather than required on the campaign, because an administration
 * that has never told anybody to do anything genuinely has no record — the same
 * reading `godMode` gets, and the reason the save step for this layer fills
 * nothing.
 */
export declare function selectDirectives(campaign: Campaign): readonly Directive[];
export declare function directivesFor(campaign: Campaign, institution: InstitutionId): readonly Directive[];
export declare function selectRefusedDirectives(campaign: Campaign): readonly Directive[];
/**
 * The instructions this body holds a function for, in the order they are
 * offered.
 *
 * A screen offers these and nothing else. An instruction addressed to a body
 * that holds no such function is not refused by anybody — there is nobody there
 * it could be addressed to — so a control that can only ever come back with
 * that is a control drawn over an absence. Whether an instruction the body
 * could carry is one it may lawfully be given is a different question, and it
 * is answered after the fact, by the memorandum.
 */
export declare function directableKinds(institution: InstitutionId): readonly DirectiveKind[];
/**
 * The refusal, or nothing.
 *
 * The one function the whole layer turns on. It serves the Bureau, the Service,
 * the Board and every independent regulator, and a sixth family added to the
 * table is served by it too without a line changing here.
 */
export declare function directiveRefusal(def: InstitutionDef, kind: DirectiveKind): RefusalMemorandum | undefined;
/**
 * Whether the body takes no direction on its function at all. Independence is
 * the structure (fixed terms, insulated delivery); direction is barred only
 * while the officer at the head is protected from removal. An executive-power
 * commission whose chair serves at the President's pleasure can be supervised
 * on policy, and an adjudicator or the Federal Reserve cannot.
 */
export declare function isDirectionBarred(def: InstitutionDef): boolean;
/** The memorandum as one paragraph, with the statutory reason unaltered inside it. */
export declare function refusalMemorandumText(directive: Directive): string;
/**
 * What being leaned on does to the body that had to write the memorandum.
 *
 * Politicization rather than a dial of its own, and it is worth being plain
 * about why: politicization is already the branch's reading of how far a body
 * has been bent toward the administration's politics rather than its mandate,
 * it already drags implementation quality, and the inspectors general already
 * open audits off it. A refusal that raised a new counter instead would be a
 * consequence with nowhere to land.
 */
export declare const REFUSAL_POLITICIZATION_RISE = 0.06;
/** What it does to how closely the body is being watched. */
export declare const DIRECTIVE_OVERSIGHT_RISE = 0.08;
/**
 * How loud a kind of instruction is, against the base refusal cost.
 *
 * Pointing enforcement at a person, and telling the central bank where to set
 * the rate, are louder than changing how fast a body works. A held pace is
 * the quietest thing a president can still put on paper.
 */
export declare const DIRECTIVE_KIND_WEIGHT: Readonly<Record<DirectiveKind, number>>;
/** The rise a refusal of this instruction actually writes. `pressure` is the particular order; absent, the kind's own weight. */
export declare function directiveMove(kind: DirectiveKind, pressure?: number): {
    readonly politicization: number;
    readonly oversight: number;
};
/**
 * How many refused instructions at one body before somebody opens a file.
 *
 * Two, and the second one is the point. A president who tries once and is told
 * no has done something a general counsel wrote down; a president who tries
 * twice at the same building has done something an inspector general can
 * describe as a pattern, which is the only word that makes it a matter.
 */
export declare const REFUSALS_BEFORE_MATTER = 2;
/**
 * A lawful directive still has to reach a body that will act on it.
 *
 * Below this, or at a body whose statute puts a norm between it and the
 * President, the instruction is recorded and not carried. The reading is the
 * branch's own delivery figure rather than a new one, so a hollowed-out agency
 * slow-walks the President for the same reason it delivers policy badly.
 */
export declare const SLOW_WALK_QUALITY = 0.6;
/**
 * The body whose auditor would take this.
 *
 * A bureau does not have an inspector general of its own — its department's
 * auditor covers it — so a file about the Internal Revenue Service is opened at
 * the Treasury and a file about the Bureau is opened at Justice.
 */
export declare function inspectingBody(def: InstitutionDef): InstitutionId;
export type DirectiveRequest = {
    readonly institution: InstitutionId;
    readonly kind: DirectiveKind;
    readonly subject: string;
    /** How hard this particular order leans. Absent, the kind's own weight. */
    readonly pressure?: number;
    /** Tells apart two instructions of one kind to one body in one week, which would otherwise share a record. */
    readonly key?: string;
};
export type DirectiveResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Tell a body to do something.
 *
 * A barred instruction is not rejected by this function. It succeeds, and what
 * succeeds is the refusal: a memorandum, a body that is now measurably more
 * politicized than it was, and — on the second one at the same building — a
 * file somebody outside this administration has opened on it. Rejecting here
 * would let a president try every agency for free until one of them said yes.
 */
export declare function issueDirective(campaign: Campaign, request: DirectiveRequest): DirectiveResult;
