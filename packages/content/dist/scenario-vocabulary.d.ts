import { type InstrumentId, type RungLevel } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
export type VocabularyHit = {
    readonly label: string;
    readonly hit: string;
    readonly say: string;
};
/**
 * Every parliamentary word in a passage that is not exempt.
 *
 * `skipMinister` defers the bare "minister" family to the domestic
 * `cabinet-title-literal` rule, which already refuses it on a `cast: "none"`
 * scenario with a message of its own. One defect, one finding.
 */
export declare function parliamentaryHits(passages: readonly {
    readonly label: string;
    readonly text: string;
}[], skipMinister: boolean): readonly VocabularyHit[];
/**
 * The loudest money each tier may declare.
 *
 * A routine week is a budget squabble, an appointment, a provincial complaint —
 * the tier the doctrine calls the connective tissue of governing. A rendered
 * loop had a routine week whose cheapest-looking answer billed about eleven
 * billion dollars at the Record, because nothing connected the band to the
 * volume the week was written at. "Supplemental" is the ceiling for routine
 * precisely because it is the band that has to be asked for: the moment the
 * money needs a vote, the week is not routine any more.
 */
export declare const SEVERITY_SCALE_CEILING: {
    readonly routine: "supplemental";
    readonly serious: "emergency";
    readonly critical: "structural";
};
export declare function scaleExceedsSeverity(severity: keyof typeof SEVERITY_SCALE_CEILING, scale: string): boolean;
export type RungReading = {
    /** Words of the committed rung the reply actually says. */
    readonly own: readonly string[];
    /** Words belonging to another rung of the same ladder, and which rung. */
    readonly other: readonly {
        readonly word: string;
        readonly rung: RungLevel;
        readonly name: string;
    }[];
};
export declare function readRungVocabulary(text: string, instrument: InstrumentId, rung: RungLevel): RungReading;
export declare const INSTRUMENT_RUNG_NAMES: Readonly<Record<InstrumentId, readonly string[]>>;
export declare function committedRungName(instrument: InstrumentId, rung: RungLevel): string;
/**
 * The batch size below which a share means nothing, and the share a batch owes.
 *
 * One in ten is modest on purpose. The engine's `cabinetAttribute` condition is
 * built, tested, and read by not one shipped scenario, so the promise that who
 * the player appointed is legible in today's decision is currently unmet by the
 * whole corpus. A tenth of a batch is roughly "one scenario in a cell of ten",
 * which is what the brief asks for in as many words — low enough that a batch
 * with a genuine reason to skip it is not fighting the gate, high enough that a
 * pool of two thousand ends up with two hundred weeks that read the cabinet.
 */
export declare const CABINET_GATE_BATCH_FLOOR = 8;
export declare const CABINET_GATE_SHARE_FLOOR = 0.1;
export declare function cabinetGatedCount(defs: readonly ScenarioDef[]): number;
