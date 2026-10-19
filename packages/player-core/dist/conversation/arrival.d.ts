import type { OfficeDay } from "@admin/engine";
import type { ScenarioClass, ScenarioSeverity } from "@admin/content";
/**
 * Culture and deaths on day 1, foreign crises on day 2, war and espionage on
 * day 3, domestic trouble on day 4, the economy on day 5, justice on day 6.
 * Tragedy, terror and unrest sit with the domestic classes; a hostage crisis
 * with foreign crises; a triumph with culture.
 */
export declare const OFFICE_DAYS: Readonly<Record<ScenarioClass, OfficeDay>>;
/** Ten days for every severity. The last call is counted back from the close. */
export declare const RESPONSE_WINDOW_DAYS: Readonly<Record<ScenarioSeverity, number>>;
