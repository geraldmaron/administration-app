import { type Nation, type NationId } from "@admin/world";
import { type Campaign, type OperatorRuntime } from "./state.js";
import { type RngStreams } from "./rng.js";
import type { InstrumentId } from "./instruments.js";
import type { TurnPhase } from "./turn-loop.js";
import { type Term } from "./willingness.js";
export declare const OPERATOR_KINDS: readonly ["cartel", "insurgency", "cyber-crew", "pmc", "market-actor"];
export type OperatorKind = (typeof OPERATOR_KINDS)[number];
export type OperatorProfile = {
    readonly kind: OperatorKind;
    readonly label: string;
    readonly pressure: (nation: Nation) => number;
    readonly answerableWith: readonly InstrumentId[];
    readonly crisis: (host: Nation) => string;
};
export declare const OPERATOR_PROFILES: Record<OperatorKind, OperatorProfile>;
export declare const MAX_OPERATORS_PER_HOST = 2;
export declare const MAX_OPERATORS = 12;
export declare const MAX_NEW_OPERATORS_PER_TURN = 2;
export type OperatorCrisis = {
    readonly operator: OperatorRuntime;
    readonly host: NationId;
    readonly headline: string;
    readonly answerableWith: readonly InstrumentId[];
};
export declare function operatorPressure(kind: OperatorKind, nation: Nation): number;
export declare function operatorId(kind: OperatorKind, host: NationId, turn: number): string;
export declare function emergingOperators(campaign: Campaign, streams: RngStreams): OperatorRuntime[];
export declare function crisisFor(campaign: Campaign, operator: OperatorRuntime): OperatorCrisis | undefined;
/** What sets an operator's weekly act rate, each term already weighted: its host's pressure, a war, and the regime's grip. */
export declare function operatorActTerms(campaign: Campaign, operator: OperatorRuntime): readonly Term[];
/** The weekly chance an operator acts, from its terms, held inside a floor and a ceiling so no host is ever quiet or certain. */
export declare function operatorActRate(terms: readonly Term[]): number;
export declare const operatorPhase: TurnPhase;
