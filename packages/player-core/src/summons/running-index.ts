import type { Campaign, GameDate } from "@admin/engine";
import type { MetricStance } from "../format/figures";
import { place } from "../navigation/places";
import { allReadings } from "./registry";
import type { SummonsUrgency, SummonsWindow } from "./types";

// Every institutional clock the presidency carries, running first, each a
// door to its own summons. A clock with no subject this week still opens:
// `summonsReading` answers a quiet clock with its own quiet brief rather than
// a closed door.

export type RunningClockRow = {
  readonly id: string;
  readonly title: string;
  /** The clock's own summons. */
  readonly href: string;
  readonly due?: GameDate;
  readonly urgency?: SummonsUrgency;
  /** The clock in one line and its headline figure, from its composed brief. */
  readonly line: string;
  readonly figure: string;
  readonly stance: MetricStance;
  /** The window a rule sets, where one does: only these draw a countdown. */
  readonly window?: SummonsWindow;
};

export function runningClocks(campaign: Campaign): readonly RunningClockRow[] {
  return allReadings(campaign).map((reading) => ({
    id: reading.spec.id,
    title: reading.brief.title,
    href: place.clock(reading.spec.id),
    line: reading.brief.clockLine,
    figure: reading.brief.figure,
    stance: reading.brief.stance,
    ...(reading.due ? { due: reading.due.dueDate, urgency: reading.due.urgency } : {}),
    ...(reading.brief.window ? { window: reading.brief.window } : {}),
  }));
}
