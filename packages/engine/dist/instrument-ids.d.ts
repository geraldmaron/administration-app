export type InstrumentId = "diplomatic" | "economic" | "covert" | "military" | "assistance";
export declare const INSTRUMENT_IDS: readonly InstrumentId[];
export type RungLevel = 1 | 2 | 3 | 4 | 5;
export declare const RUNG_LEVELS: readonly RungLevel[];
export declare const INSTRUMENT_COERCION: Record<InstrumentId, number>;
