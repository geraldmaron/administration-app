import { type ActionRecord, type Campaign, type ChamberVote } from "@admin/engine";
import type { PlaceKey } from "../navigation/places";
import type { SummonsHistoryLine } from "./types";
/**
 * The owning place's current counsel, as the line a summons brief carries.
 * Where the place has nothing to report, the line says that rather than
 * filling the space.
 */
export declare function counselFor(campaign: Campaign, key: PlaceKey): string;
export declare function ledgerAt(campaign: Campaign, turn: number): readonly ActionRecord[];
export declare function ledgerLine(campaign: Campaign, turn: number, key: string, label: string): SummonsHistoryLine | undefined;
export declare function voteLine(vote: ChamberVote): string;
export declare function historyOf(...lines: readonly (SummonsHistoryLine | undefined)[]): readonly SummonsHistoryLine[];
