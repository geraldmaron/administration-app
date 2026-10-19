import { type Campaign, type Effect, type GameDate } from "@admin/engine";
import type { CastScenario } from "./scenario-cast.js";
export declare function scenarioCaseId(scenario: string | CastScenario): string;
export declare function scenarioAnswerEffect(campaign: Campaign, scenarioId: string, replyId: string): Effect | undefined;
/**
 * Putting a scenario matter off, said to its case as well.
 *
 * A scenario matter and its case are one document. A deferral recorded only on
 * the matter leaves the case believing it is still today's work, and the frozen
 * decision comes back on the next read however often it is put off.
 */
export declare function scenarioPutOffEffect(campaign: Campaign, matterId: string, until: GameDate): Effect | undefined;
