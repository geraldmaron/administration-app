import type { GameDate } from "./state.js";
export declare function selectionDue(date: GameDate, nationId: string): boolean;
/** The first scheduled nation, in calendar order, whose selection is due. */
export declare function selectionDueNation(date: GameDate): string | null;
