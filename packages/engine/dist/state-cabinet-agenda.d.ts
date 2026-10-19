import type { NationId, PersonId, RoleId } from "@admin/world";
import type { CombatantCommandId } from "./command-catalog.js";
import type { CommandPosture } from "./combatant-commands.js";
import type { EngagementKind } from "./engagement.js";
/**
 * The act a minister's proposal puts in front of the President, ready to take.
 *
 * Each names exactly what the act's own entry point needs beyond the week it is
 * taken in: an order by its catalogue id, a posture by command and level, an
 * engagement by the government it is made with and its kind. The President is
 * always the one acting, so nothing here says who.
 */
export type ProposalAct = {
    readonly kind: "order";
    readonly order: string;
} | {
    readonly kind: "posture";
    readonly command: CombatantCommandId;
    readonly posture: CommandPosture;
} | {
    readonly kind: "engagement";
    readonly target: NationId;
    readonly engagement: EngagementKind;
};
/**
 * A minister asking for something the President has not offered.
 *
 * The cabinet could be appointed, overruled and dismissed, and in between it
 * asked for nothing — which made every seat a set of numbers that only ever
 * answered. A proposal is the seat speaking first.
 */
export type MinisterProposal = {
    readonly id: string;
    readonly role: RoleId;
    readonly person: PersonId;
    readonly turn: number;
    readonly summary: string;
    /** The week it stops being live. A proposal nobody answers expires rather than waiting forever. */
    readonly expiresTurn?: number;
    /**
     * The act taking it would perform. Absent on a request that asks the
     * President for something rather than proposing a move, and on every
     * proposal saved before a minister could bring one.
     */
    readonly act?: ProposalAct;
};
/**
 * A minister offering to go.
 *
 * Distinct from a dismissal and from a departure the simulation takes: this is a
 * seat putting the decision in the President's hands, which is a different week
 * for the administration than either losing the seat or firing it.
 */
export type ResignationOffer = {
    readonly id: string;
    readonly role: RoleId;
    readonly person: PersonId;
    readonly turn: number;
    readonly reason: string;
    /** The last week the offer stands. After it, the seat has answered its own question. */
    readonly expiresTurn?: number;
};
/** What the cabinet has put to the President and not had answered. */
export type CabinetAgendaState = {
    readonly proposals: readonly MinisterProposal[];
    readonly offers: readonly ResignationOffer[];
    /**
     * The last week any seat proposed anything, so the rate a cabinet speaks at
     * can be paced without counting the list.
     */
    readonly lastProposalTurn?: number;
};
