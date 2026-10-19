// Admits the documents the desk is already staging. An absent docket admits
// every warranted document that week; after that, only the office day's class.
import {
  addDays,
  compareDates,
  dayOfWeekInOffice,
  daysBetween,
  type Campaign,
  type DocketEntry,
  type GameDate,
  type StagingSource,
} from "@admin/engine";
import { scenarioOccurrenceKey, stagingWarranted, type CastScenario } from "@admin/content";
import { LAST_CALL_DAYS } from "../desk/attention-policy";
import { OFFICE_DAYS, RESPONSE_WINDOW_DAYS } from "./arrival";
import { pendingConversations, scenarioMatterId } from "./scripts";

function laterDate(left: GameDate, right: GameDate): GameDate {
  return daysBetween(left, right) > 0 ? right : left;
}

function heldIds(campaign: Campaign): ReadonlySet<string> {
  return new Set((campaign.docket ?? []).map((entry) => entry.id));
}

function entryFor(cast: CastScenario, arrives: GameDate, closes: GameDate): DocketEntry {
  const deadline = cast.bill?.conferenceDeadline;
  return {
    id: scenarioMatterId(scenarioOccurrenceKey(cast)),
    ref: { scenario: cast.def.id, counterpart: cast.counterpart },
    arrives,
    closes: deadline && compareDates(deadline, closes) < 0 ? deadline : closes,
  };
}

function warranted(campaign: Campaign): readonly CastScenario[] {
  return pendingConversations(campaign).filter((cast) => stagingWarranted(campaign, cast.def.class));
}

function migrated(campaign: Campaign, date: GameDate, cast: CastScenario): DocketEntry {
  const arrives = addDays(date, 1 - dayOfWeekInOffice(campaign, date));
  const windowClose = addDays(arrives, RESPONSE_WINDOW_DAYS[cast.def.severity]);
  const kept = addDays(date, LAST_CALL_DAYS + 1);
  return entryFor(cast, arrives, laterDate(windowClose, kept));
}

function forToday(campaign: Campaign, date: GameDate, cast: CastScenario): DocketEntry | undefined {
  if (OFFICE_DAYS[cast.def.class] !== dayOfWeekInOffice(campaign, date)) return undefined;
  if (heldIds(campaign).has(scenarioMatterId(scenarioOccurrenceKey(cast)))) return undefined;
  return entryFor(cast, date, addDays(date, RESPONSE_WINDOW_DAYS[cast.def.severity]));
}

/** The clock's staging source. A quiet-week document is not held. */
export function scenarioStagingSource(): StagingSource<Campaign> {
  return (campaign, date) => {
    const staged = warranted(campaign);
    if (campaign.docket === undefined) return staged.map((cast) => migrated(campaign, date, cast));
    return staged.flatMap((cast) => {
      const entry = forToday(campaign, date, cast);
      return entry ? [entry] : [];
    });
  };
}
