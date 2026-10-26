import { type DyadKind, type NationId, type NationTraits, type Relationship } from "@admin/world";
import type { Question, Term } from "./willingness.js";
export type WorldEventFamily = "sanctions-package" | "border-clash" | "accession" | "disaster-aid" | "election-interference";
type Bank = {
    /** Three headlines, the actor and the subject already named with their articles. */
    readonly headlines: readonly [Line, Line, Line];
    /** Three standfirsts: what the event leaves standing, as a clause a piece can build on. */
    readonly standfirsts: readonly [Line, Line, Line];
};
type Line = (actor: string, subject: string) => string;
export type WorldEventTemplate = {
    readonly id: string;
    readonly family: WorldEventFamily;
    /** The dyad kinds from the founding table this template can fire on; empty where any relationship will do. */
    readonly dyads: readonly DyadKind[];
    readonly question: Question;
    /** Where the deciding government's weighing has to land. Planning values, named so a rule can move one in one place. */
    readonly threshold: number;
    /** How many weeks the same pair waits before the template can fire on it again. */
    readonly cooldownWeeks: number;
    /** The campaign fields a firing writes, as the register names them. */
    readonly writes: readonly string[];
    readonly bank: Bank;
};
export declare const TEMPLATES: readonly WorldEventTemplate[];
export declare function templateOf(family: WorldEventFamily): WorldEventTemplate;
/** The governments the sourced table records as this one's rivals or enemies. */
export declare function sourcedRivals(nation: NationId): readonly NationId[];
/** The sourced kind of the pair, if the table records one. */
export declare function dyadKindOf(a: NationId, b: NationId): DyadKind | undefined;
/** A government deciding whether to act against a rival: a border clash, an election interfered with. */
export declare function hostileActTerms(temper: NationTraits, edge: Relationship, kind: DyadKind | undefined, neighbors: boolean): readonly Term[];
/**
 * A member voting on a measure against a target: its own reading of the
 * target, what it would lose, the obligation of sitting in the bloc, and
 * whether it is a government that stays out of others' affairs.
 */
export declare function sanctionVoteTerms(temper: NationTraits, edge: Relationship): readonly Term[];
/** A member voting on whether to admit a government: its own ties to the applicant and the trade between them. */
export declare function admissionVoteTerms(temper: NationTraits, edge: Relationship): readonly Term[];
/** What a member weighs about leaving a body: what it resents, what it would give up, and what the exit itself costs. */
export type WithdrawalReading = {
    /** Its mean trust toward the other members. */
    readonly meanTrust: number;
    /** Its mean trade dependence on them. */
    readonly trade: number;
    /** On a defense body, the worst threat it reads from outside the body: what the guarantee is worth to it. */
    readonly protection: number;
    /** The grudges it carries against members and the coercion they have lately aimed at it, 0..1. */
    readonly grievance: number;
    /** What the body's own exit costs: unpicking a customs union costs most, leaving a forum least. */
    readonly exitCost: number;
    /** The body has no exit clause, so leaving repudiates a treaty. */
    readonly repudiation: boolean;
};
/** A member deciding whether to leave a body, from what it resents, what it would lose and what leaving costs. */
export declare function withdrawalVoteTerms(temper: NationTraits, reading: WithdrawalReading): readonly Term[];
/** A government deciding whether to send help after a disaster. */
export declare function aidTerms(temper: NationTraits, edge: Relationship, severity: number, proximity: number, sharesBody: boolean): readonly Term[];
/** The history kind a firing leaves on the acting government's edge, which is also how its cooldown is read. */
export declare const worldEventKind: (family: WorldEventFamily) => string;
/** Whether this family has fired on this edge inside its cooldown. */
export declare function firedRecently(edge: Relationship | undefined, family: WorldEventFamily, turn: number): boolean;
/** Which of the bank's three lines a firing uses: fixed by the week and the pair, so a replay files the same words. */
export declare function eventLineIndex(turn: number, actor: string, subject: string): 0 | 1 | 2;
export {};
