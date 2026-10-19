import { type CastScenario, type ScenarioDef } from "@admin/content";
import type { AttentionMatter, Campaign, ConsequenceCard, GameDate } from "@admin/engine";
/**
 * Mount everything delivery fetched, on top of what the binary carries.
 *
 * An id already authored into the core pack is dropped rather than mounted
 * twice, which would give it double the weight its author gave it.
 */
export declare function mountDeliveredScenarios(scenarios: readonly ScenarioDef[]): void;
/** How deep the desk's draw actually is, for anything that reports pool size. */
export declare function poolSize(): number;
export declare const BUNDLED_CONSEQUENCES: readonly ConsequenceCard[];
/**
 * Every decision this week has earned, most loaded first. Usually one; more on
 * a week the board genuinely stacks, which is what the pacing director decides
 * (`@admin/content`'s `scenario-director.ts`) rather than the desk.
 */
export declare function pendingConversations(campaign: Campaign): readonly CastScenario[];
/**
 * Freezes what the desk would stage today into cases, after closing any whose
 * subject is over. The same campaign comes back when nothing moved.
 *
 * It raises exactly what `pendingConversations` would show, so the desk-closed
 * week after an answer stays closed rather than seating the next draw.
 */
export declare function seatScenarioCases(campaign: Campaign): Campaign;
/** The one the desk opens on. The rest of the week's staging waits behind it. */
export declare function pendingConversation(campaign: Campaign): CastScenario | undefined;
/** The attention id a staged scenario is raised under, which is also what a deferral of it is keyed on. */
export declare function scenarioMatterId(scenarioId: string): string;
/**
 * The week's staged decisions, as a source the engine's advance can ask.
 *
 * The director is one voice among the sources that can stop a presidency, and
 * deliberately not the loudest: a bill on the desk and an authored crisis reach
 * the same composer and are ranked against each other there.
 *
 * A routine or serious pick the board did not earn is `ambient`. It still
 * reaches the desk — the folio is where a scenario is answered, and nothing
 * here withholds it — but it never competes for the three and it never stops
 * time. A critical pick is hard either way: Continue has to be able to find
 * it waiting and walk past it. With a corpus deep enough that something is
 * live essentially every week, treating every pick as a stop halts the run
 * after exactly one tick, forever.
 */
export declare function scenarioMatterSource(campaign: Campaign, date: GameDate): readonly AttentionMatter[];
