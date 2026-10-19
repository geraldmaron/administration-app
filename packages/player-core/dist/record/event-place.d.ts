import type { ActionRecord, Campaign } from "@admin/engine";
/** Where an entry happened, as the map frames it, and the point a pulse is drawn at. */
export type EventPlace = {
    /** The map's framing for the entry: its first US state, else its first government, else the country. */
    readonly camera: string;
    readonly selection?: string;
    /** The place in words and its point, where the entry has a place of its own. */
    readonly pin?: {
        readonly where: string;
        readonly lon: number;
        readonly lat: number;
    };
    /** The state or government the entry is about, for the timeline's subject filter. */
    readonly subject?: {
        readonly id: string;
        readonly label: string;
    };
};
/**
 * The first place the entry's causal stamp names: a US state, else a
 * government other than the President's own, else nowhere in particular and
 * the country is framed. Read off the stamp, never searched for in prose. The
 * pin stands on the stamp's own city when it names one inside that state or
 * government, which is where a decision's briefing was datelined, and on the
 * state's or government's seat otherwise.
 */
export declare function eventPlace(campaign: Campaign, entry: ActionRecord): EventPlace;
