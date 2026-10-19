import { type Campaign } from "@admin/engine";
import type { CalendarEvent } from "./types";
import { type CalendarWindow } from "./window";
/** The customary measure of a new administration, counted from the day this term began. */
export declare const HUNDRED_DAYS = 100;
/**
 * Every constitutional and term date inside the window.
 *
 * The inauguration that ends this term is the same noon as the term's end, so
 * it is told once, as the end.
 */
export declare function termCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[];
