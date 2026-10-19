import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
export type BoardPanelRow = {
    readonly key: string;
    readonly label: string;
    readonly meta: string;
    /** The country the row is about, when it is about one country. */
    readonly nation?: NationId;
};
export type BoardPanel = {
    readonly id: "in-flight" | "watch" | "blocs";
    readonly title: string;
    readonly rows: readonly BoardPanelRow[];
};
/** The board's three panels: what is in flight, whom to watch, and where the blocs stand. */
export declare function boardPanelsReading(campaign: Campaign): readonly BoardPanel[];
