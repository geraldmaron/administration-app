import { type Campaign } from "@admin/engine";
import type { CalendarEvent, CalendarOptions } from "./types";
/** By date; on one day the harder obligation first, then a stable order by id. */
export declare function compareEvents(a: CalendarEvent, b: CalendarEvent): number;
/**
 * Every dated thing on the President's calendar, soonest first.
 *
 * Derived on read from the clocks the engine and the summons layer already
 * keep. Nothing is stored and nothing is written: reading the calendar cannot
 * move the world.
 */
export declare function buildCalendar(campaign: Campaign, options?: CalendarOptions): readonly CalendarEvent[];
