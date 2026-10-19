import type { Campaign } from "@admin/engine";
import type { CalendarEvent } from "./types";
import { type CalendarWindow } from "./window";
/** A case on the Supreme Court's calendar has its argument as its next step, so it is told once, as the argument. */
export declare function courtCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[];
