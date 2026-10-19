import { type Campaign } from "@admin/engine";
import { type PlaceKey } from "../navigation/places";
import type { PlaceCounsel } from "./counsel-shape";
export type { CounselAct, PlaceCounsel } from "./counsel-shape";
/** What a place currently counsels. A place with none of its own says so rather than inventing one. */
export declare function placeCounsel(campaign: Campaign, key: PlaceKey): PlaceCounsel;
