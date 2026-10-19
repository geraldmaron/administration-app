import { type Campaign, type ConversationScript, type CounselStance, type ProjectionImpact, type ReplyProjection } from "@admin/engine";
import type { PersonId } from "@admin/world";
/**
 * One cell of the decision comparison. Every option answers every row, so a
 * row a reply has nothing to say on reads "none", never a blank a player has
 * to interpret.
 */
export type ComparisonCell = {
    readonly kind: "money";
    readonly amount: number;
    readonly text: string;
} | {
    readonly kind: "impact";
    readonly impact: ProjectionImpact;
    readonly favorable: boolean | undefined;
} | {
    readonly kind: "chance";
    readonly chance: number;
    readonly text: string;
} | {
    readonly kind: "lines";
    readonly lines: readonly string[];
} | {
    readonly kind: "counsel";
    readonly person: PersonId;
    readonly name: string;
    readonly stance: CounselStance;
} | {
    readonly kind: "text";
    readonly text: string;
} | {
    readonly kind: "none";
    readonly text: string;
};
/** What a row is about, so a surface can pick its glyph without matching on words. */
export type ComparisonTopic = "money" | "debt" | "effect" | "relationship" | "odds" | "timing" | "downside" | "reaction" | "counsel";
export type ComparisonRow = {
    readonly id: string;
    readonly topic: ComparisonTopic;
    readonly label: string;
    readonly cells: readonly ComparisonCell[];
};
export type ComparisonOption = {
    readonly id: string;
    readonly tone: string;
    readonly text: string;
    readonly available: boolean;
    /** Why the option is locked, in the engine's words. */
    readonly locked?: string;
};
export type DecisionComparison = {
    readonly options: readonly ComparisonOption[];
    readonly rows: readonly ComparisonRow[];
};
/**
 * Every reply to one decision on the same criteria, in the order a President
 * weighs them: what it costs, what it does, how sure it is, when it lands,
 * what can go wrong, who else moves, and which way the cabinet leans. Built
 * only from the projection the decision room commits against, so the
 * comparison cannot promise what the commit will not charge.
 */
export declare function decisionComparison(campaign: Campaign, script: ConversationScript, replies: readonly ReplyProjection[], counterpartName: string): DecisionComparison;
