import type { InstrumentId, RungLevel } from "./instrument-ids.js";
import type { Effect } from "./effects.js";
import { type InstrumentContext, type InstrumentRung } from "./instrument-gates.js";
export { INSTRUMENT_COERCION, INSTRUMENT_IDS, RUNG_LEVELS, type InstrumentId, type RungLevel } from "./instrument-ids.js";
export { securityGuaranteeFlag } from "./instruments-economic.js";
export type { CapabilityCheck, GateShortfall, InstrumentContext, InstrumentRung } from "./instrument-gates.js";
export declare function covertWatchReportEffect(ctx: InstrumentContext, exposed: boolean): Effect | undefined;
/** The one exposure finding shared by the surveillance effect and its resolver. */
export declare function foreignSurveillanceExposed(ctx: InstrumentContext): boolean;
/** The target-directed charge shared by attributed covert successes. */
export declare function exposedCovertTargetEffect(ctx: InstrumentContext): Effect | undefined;
export declare const INSTRUMENT_RUNGS: readonly InstrumentRung[];
export declare function rungDefinition(instrument: InstrumentId, rung: RungLevel): InstrumentRung;
export declare function rungsForInstrument(instrument: InstrumentId): readonly InstrumentRung[];
export type CapacityCost = {
    readonly label: string;
    /** The reading it spends, in its own 0..1 points. */
    readonly amount: number;
    /** Weeks of regeneration before the establishment is whole again. */
    readonly weeks: number;
    readonly note: string;
};
/**
 * What a rung takes out of the establishment, and how long the establishment is
 * short of it.
 *
 * This is the only lag the simulation actually has: an order resolves the week
 * it is given, and what it costs is a capacity that comes back at a published
 * rate. Quoting that rate as weeks is a real forecast — spend fifteen points of
 * readiness at two points a week and the force is not whole for eight weeks,
 * during which the rungs above it are shut.
 */
export declare function capacityCost(instrument: InstrumentId, rung: RungLevel): CapacityCost | undefined;
export { consultationFor, type Consultee } from "./consultation.js";
