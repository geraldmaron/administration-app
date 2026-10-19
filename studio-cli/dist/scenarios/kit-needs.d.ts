import { type ScenarioDef } from "@admin/content";
/**
 * Issues held back until the engine models them as standing law with its own
 * state, levers and audits. A scenario about one written before then would be
 * priced by the generic metrics alone, which is exactly the flattening the
 * contested-issues program exists to remove.
 */
export declare const CONTESTED_ISSUES: readonly ["abortion and reproductive care", "guns", "immigration enforcement policy (border and arrival crises in the migration class stay open)", "race and civil rights", "voting and elections law", "LGBTQ issues", "policing and criminal-justice policy", "religion and speech", "drugs", "education policy", "climate regulation", "labor law as a culture-war issue", "healthcare mandates", "national symbols"];
export type SuggestedCell = {
    readonly cell: string;
    readonly why: string;
};
/**
 * Cells in the order a planner should take them: the class furthest below its
 * target first, each with the cast and severity it is shortest of. War weeks
 * are cast on the war itself, so a war cell always reads the live front.
 */
export declare function suggestCells(bodies: readonly ScenarioDef[]): readonly SuggestedCell[];
export declare function kitNeeds(bodies: readonly ScenarioDef[]): string;
