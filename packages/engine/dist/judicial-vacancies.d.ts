import type { TurnPhase } from "./turn-loop.js";
export declare function judicialDeathChance(age: number): number;
export declare function judicialRetirementChance(age: number, serviceYears: number, friendlyEarlyTerm: boolean): number;
/** One yearly draw per occupied Article III seat; anonymous circuit judges stay unnamed. */
export declare const judicialVacancyPhase: TurnPhase;
