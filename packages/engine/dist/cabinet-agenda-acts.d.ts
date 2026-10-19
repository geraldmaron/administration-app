import { type Campaign, type MinisterProposal, type ProposalAct, type ResignationOffer } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
import { type RngStreams } from "./rng.js";
export type ResignationAnswer = "accept" | "decline";
/** Being asked to stay is worth something to the Secretary who offered. */
export declare const DECLINED_OFFER_LOYALTY = 0.04;
/** A Secretary whose request was taken was listened to. */
export declare const TAKEN_PROPOSAL_LOYALTY = 0.01;
export type AgendaPrice = {
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
};
type Refused = {
    readonly ok: false;
    readonly reason: string;
};
export type ResignationAnswerProjection = ({
    readonly ok: true;
    readonly offer: ResignationOffer;
} & AgendaPrice) | Refused;
export type ProposalProjection = ({
    readonly ok: true;
    readonly proposal: MinisterProposal;
    readonly kind: "vacancy" | "delivery" | ProposalAct["kind"];
} & AgendaPrice) | Refused;
export type AgendaActResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | Refused;
/** The price of answering an offer, which `answerResignationOffer` spends as it stands. */
export declare function projectResignationAnswer(campaign: Campaign, id: string, answer: ResignationAnswer): ResignationAnswerProjection;
/** Accept or decline a Secretary's offer to resign. */
export declare function answerResignationOffer(campaign: Campaign, id: string, answer: ResignationAnswer): AgendaActResult;
/** The price of taking a request, which `takeMinisterProposal` spends as it stands. */
export declare function projectMinisterProposal(campaign: Campaign, id: string): ProposalProjection;
/**
 * Take a Secretary's request: the surge or the nomination it asked for, or the
 * act they brought, and the credit of having been heard. An act goes through
 * its own entry point, so taking a Secretary's order is signing that order and
 * nothing less; the draw it carries is the one signing it directly would.
 */
export declare function takeMinisterProposal(campaign: Campaign, id: string, streams?: RngStreams): AgendaActResult;
export {};
