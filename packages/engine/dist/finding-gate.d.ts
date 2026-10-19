import { type CapabilityCheck, type InstrumentContext } from "./instrument-gates.js";
/**
 * The statutory gate on a covert act: the President's own government may not
 * run one without a finding standing over the target (50 U.S.C. §3093(a)). A
 * finding signed under the 48-hour path stands the same as a written one.
 * Other governments' covert acts carry no finding in this model.
 */
export declare function findingGate(ctx: InstrumentContext): CapabilityCheck;
