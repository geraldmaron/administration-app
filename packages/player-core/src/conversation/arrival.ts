// Which office day a document arrives, and how long it may sit unanswered.
// The table is total over the scenario classes so a new class fails to compile.
import type { OfficeDay } from "@admin/engine";
import type { ScenarioClass, ScenarioSeverity } from "@admin/content";

/**
 * Culture and deaths on day 1, foreign crises on day 2, war and espionage on
 * day 3, domestic trouble on day 4, the economy on day 5, justice on day 6.
 * Tragedy, terror and unrest sit with the domestic classes; a hostage crisis
 * with foreign crises; a triumph with culture.
 */
export const OFFICE_DAYS: Readonly<Record<ScenarioClass, OfficeDay>> = {
  culture: 1,
  death: 1,
  triumph: 1,
  "foreign-crisis": 2,
  hostage: 2,
  war: 3,
  espionage: 3,
  tragedy: 4,
  terror: 4,
  unrest: 4,
  disaster: 4,
  "public-health": 4,
  migration: 4,
  economy: 5,
  technology: 5,
  justice: 6,
  institution: 6,
  scandal: 6,
};

/** Ten days for every severity. The last call is counted back from the close. */
export const RESPONSE_WINDOW_DAYS: Readonly<Record<ScenarioSeverity, number>> = {
  routine: 10,
  serious: 10,
  critical: 10,
};
