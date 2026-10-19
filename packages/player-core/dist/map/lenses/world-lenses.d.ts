import type { Campaign } from "@admin/engine";
import { type WorldReadingId } from "../../world/world-readings.js";
import { type MapLens } from "../contract.js";
import type { MapPalette } from "../palette.js";
export declare function worldReadingLens(reading: Extract<WorldReadingId, "trend" | "alignment">, campaign: Campaign | null, palette: MapPalette): MapLens;
