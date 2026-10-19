import type { Effect } from "./effects.js";
import type { InstrumentContext } from "./instrument-gates.js";
/** Mission effects occur only when the military objective succeeds; civilian harm is resolved separately. */
export declare function strikeMissionEffects(ctx: InstrumentContext): readonly Effect[];
