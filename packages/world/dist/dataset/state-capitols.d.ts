import type { StateId } from "../schemas/state.js";
import type { StateCapitol } from "../schemas/site.js";
export declare const STATE_CAPITOLS: readonly StateCapitol[];
export declare function stateCapitol(state: StateId): StateCapitol | undefined;
