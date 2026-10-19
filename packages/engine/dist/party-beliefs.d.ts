import { type Party, type PartyBeliefs } from "@admin/world";
import { type DomesticSignature } from "./domestic-signature.js";
import type { OpinionEffect } from "./effects.js";
import type { Campaign } from "./state.js";
import type { AdministrationParty } from "./state-legislature.js";
/**
 * How far a figure's caucus-party reading of the live signature may move their
 * disposition target. Small beside CAUCUS_TILT (0.16): a platform agreement is
 * a nudge, not a rewrite of who they caucus with.
 */
export declare const BELIEF_WEIGHT = 0.08;
/**
 * Peak polarization one act may emit from belief-split alone. Held under the
 * joint MAX_TURN_POLARIZE ceiling with every other writer — this constant is
 * not a separate allowance.
 */
export declare const BELIEF_SPLIT_POLARIZATION = 0.008;
/**
 * What a domestic signature asserts in ideology space. Pure fold: the act's own
 * declared values are read on the axis they are declared on, sectors land on
 * economy axes first, and then the six axes plus the urban and federal tilts
 * become a three-axis stance a party can agree or disagree with.
 *
 * Industrial / energy / defense / agricultural protection pull nationalist;
 * services and tech pull globalist. Federal and urban tilts pull left; energy
 * and industrial protection pull mildly right. Defense and federal outlays pull
 * authoritarian.
 */
export declare function signatureStance(signature: DomesticSignature): PartyBeliefs;
/**
 * How a party's caucus reads one act. Signed: positive is "this is what we
 * are for". Not a vote — a disposition input and a framing input.
 */
export declare function partyReading(beliefs: PartyBeliefs, signature: DomesticSignature): number;
/**
 * How a whole ticket reads one act: the platform reading, scaled by how alike
 * the ticket's members read anything at all.
 *
 * A whipped caucus mostly reads its platform. The bloc of people who joined
 * neither party does not — it contains both ends, so the same act that moves a
 * major caucus a long way leaves the independents where they were. That is a
 * fact about cohesion rather than about position, and reading the platform
 * without it is how a bloc with a centrist mean got mistaken for a centrist
 * bloc.
 */
export declare function ticketReading(ticket: Party, signature: DomesticSignature): number;
/**
 * How far apart two platforms read the same act, 0..1. An act two caucuses read
 * in opposite directions is divisive by construction, without an author having
 * to declare it.
 */
export declare function beliefSplit(a: PartyBeliefs, b: PartyBeliefs, signature: DomesticSignature): number;
/** The same, between two seated tickets, so cohesion counts. */
export declare function ticketSplit(a: Party, b: Party, signature: DomesticSignature): number;
export type TicketReading = {
    readonly party: AdministrationParty;
    readonly ticket: Party;
    readonly reading: number;
};
export type PartyReadingSelection = {
    readonly administration: TicketReading;
    /**
     * One entry for a president with a party. Two for an independent, who is
     * opposed from both directions at once and has to argue the act to each side
     * on its own terms.
     */
    readonly opposition: readonly TicketReading[];
};
/**
 * How every seated bloc reads one act, for the decision memo. A reading, not a
 * gate — content must not condition on partyBelief. The administration's own
 * entry is its own ticket, including the independent one: a president who ran
 * as an independent is read against what that bloc believes, not against the
 * caucus they happen to sit nearest.
 */
export declare function selectPartyReading(campaign: Campaign, signature: DomesticSignature): PartyReadingSelection;
/** BELIEF_SPLIT_POLARIZATION × a split — the amount to feed OpinionEffect.polarize. */
export declare function beliefSplitPolarizeAmount(split: number): number;
/**
 * The widest any two seated blocs read this act apart.
 *
 * With a president who has a party there is one pair and this is the old
 * administration-versus-opposition split. With an independent there are three,
 * and the widest is usually the two majors reading each other — which is the
 * honest answer: the country polarizes around an act whoever signed it, and a
 * president standing outside both caucuses does not make the caucuses agree.
 */
export declare function widestTicketSplit(campaign: Campaign, signature: DomesticSignature): number;
/**
 * Opinion effects an act with a signature emits from belief-split alone.
 * Callers splice these beside routeDomestic / resolveImpact the same way those
 * compilers return effects. Zero when every seated bloc reads the act alike.
 */
export declare function beliefSplitEffects(campaign: Campaign, signature: DomesticSignature): readonly OpinionEffect[];
