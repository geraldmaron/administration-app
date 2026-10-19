import { type DefenseScope, type NationId, type OrgId, type Organization } from "@admin/world";
import type { EffectPacket } from "./effects.js";
import { type Campaign, type Conflict } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * How long the president has before silence is an answer.
 *
 * Short, because it is. An alliance whose members take a season to decide
 * whether the treaty applies has already answered the question.
 */
export declare const CALL_GRACE_TURNS = 3;
/**
 * The rung at which an act counts as answering a call.
 *
 * A démarche is not an answer to an invasion. Anything from rung two up is
 * the president having done something the aggressor can feel; rung one is a
 * statement, and a compact that accepted a statement as an answer would be a
 * compact that binds nothing.
 */
export declare const ANSWERING_RUNG = 2;
export type CompactCall = {
    readonly org: OrgId;
    readonly orgName: string;
    /** The member under attack. */
    readonly ally: NationId;
    readonly aggressor: NationId;
    readonly conflict: string;
    readonly openedTurn: number;
    /** Everyone else in the compact — the ones drawing a conclusion either way. */
    readonly watching: readonly NationId[];
    /** Weeks the call has stood unanswered past its grace. Zero while in grace. */
    readonly unansweredTurns: number;
    readonly answered: boolean;
    /** The watching members who have answered it themselves: in the war beside the ally, or acting against the aggressor. */
    readonly answeredBy: readonly NationId[];
};
/** The flag that stands while a compact has an open call on the president. */
export declare function compactCallFlag(org: OrgId): string;
/**
 * Has the president done anything the aggressor can feel since the war opened?
 *
 * Read off the causal stamps rather than off a stored answer, which is the
 * first thing the deepened graph is load-bearing for. Every act the president
 * takes now names the country it was taken against, so the question "did the
 * United States do anything about Russia after the invasion" is a scan of the
 * ledger rather than a second record kept alongside it.
 *
 * A commitment is what settles the rung: `apply()` writes it onto the entry
 * from the packet, so an act's weight survives an authored aftermath that
 * replaced the sentence.
 */
export declare function answeredCall(campaign: Campaign, aggressor: NationId, since: number, by?: NationId): boolean;
/**
 * Every call currently standing on the president, oldest first.
 *
 * A call exists while an ally in a defense compact the president also sits in
 * is the defender in an active war. It is answered the moment the president
 * does something to the aggressor at rung two or above, and it stops existing
 * when the war does — including when the ally loses.
 */
export declare function selectCompactCalls(campaign: Campaign): readonly CompactCall[];
/**
 * The compact's week.
 *
 * One packet, like the bloc phase it sits beside, and for the same reason: a
 * president with three treaty allies in three wars is living through one
 * situation, not three notices.
 */
export declare const compactPhase: TurnPhase;
/** Exported for the tests and the dossier: what this compact binds its members to. */
export declare function compactKind(org: OrgId): "defense" | "economic" | "political" | undefined;
/** What a shared body weighs in a government's decision about a war: defense where it binds, any other shared body less, none nothing. */
export declare const OBLIGATION_WEIGHT: {
    readonly defense: 1;
    readonly shared: 0.4;
    readonly none: 0;
};
export type ObligationBody = Pick<Organization, "kind" | "defenseScope">;
/** Whether a defense treaty's promise reaches a victim in this region. A body with no stated area binds wherever a party is attacked. */
export declare function defenseHolds(scope: DefenseScope | undefined, victimRegion: string): boolean;
/**
 * The obligation a set of shared bodies carries toward one partner in one war.
 *
 * `victimRegion` is given only when the partner is the war's victim: a
 * defense treaty obliges its members to defend one another, never to join one
 * another's attack, so the aggressor's partners get a shared body's weight
 * and no more.
 */
export declare function obligationWeight(bodies: readonly ObligationBody[], victimRegion: string | undefined): number;
/** The bodies both membership lists hold, read from the registry. A body the registry does not know is left out. */
export declare function sharedBodies(memberships: readonly OrgId[], other: readonly OrgId[]): readonly Organization[];
/** The flag a call from the United States leaves, per body and per war, so a second war is a second call. */
export declare function usCallFlag(org: OrgId, conflictId: string): string;
export type CallableCompact = {
    readonly org: OrgId;
    readonly orgName: string;
    readonly conflict: string;
    readonly called: boolean;
};
/**
 * The defense bodies the United States can call on, war by war: those it sits
 * in, in a war it fights on the defending side, that the aggressor does not
 * also sit in. A body both belligerents hold is a fracture, the same rule
 * `selectCompactCalls` applies the other way round.
 */
export declare function selectCallableCompacts(campaign: Campaign): readonly CallableCompact[];
/** Every body the United States has called on for this war. */
export declare function calledCompactsIn(campaign: Campaign, conflictId: string): readonly OrgId[];
export type CompactCallResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Call a defense body to answer. A priced act like any other: it costs a
 * little standing whatever comes of it, and what comes of it is each member's
 * own decision, taken in the war's next week.
 */
export declare function callCompact(campaign: Campaign, org: OrgId, conflictId: string): CompactCallResult;
export type { Conflict };
