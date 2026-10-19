import { type Campaign } from "@admin/engine";
import type { CalendarEvent } from "./types";
import { type CalendarWindow } from "./window";
export declare function foreignElectionCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[];
