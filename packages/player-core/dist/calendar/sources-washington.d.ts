import { type Campaign } from "@admin/engine";
import type { CalendarEvent } from "./types";
import { type CalendarWindow } from "./window";
export declare function legislativeCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[];
export declare function seatCalendar(campaign: Campaign, window: CalendarWindow, horizonDays: number): readonly CalendarEvent[];
