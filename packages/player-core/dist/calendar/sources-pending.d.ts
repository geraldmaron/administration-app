import type { Campaign } from "@admin/engine";
import type { CalendarEvent } from "./types";
import { type CalendarWindow } from "./window";
export declare function pendingCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[];
