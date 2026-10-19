import { type ChoiceOutcome } from "../choice/choice-outcome";
import type { DecisionComparison } from "./decision-comparison";
/** Every option of a decision comparison as a results-list row, in option order. */
export declare function decisionOutcomes(comparison: DecisionComparison): readonly ChoiceOutcome[];
