import { z } from "zod";
import { DisasterKind } from "./nation.js";
import { StateId } from "./state.js";

// Which states a domestic disaster is allowed to land in. Without this, the
// engine's placement roll is uniform across all 51 — a cyclone in Kansas, an
// earthquake in Rhode Island — which reads as broken the moment a player
// notices it. One list per kind, not a weight per state: eligibility is a
// gate (could this plausibly happen here at all), not a claim about relative
// frequency within the eligible set.
export const StateDisasterEligibility = z.record(DisasterKind, z.array(StateId).min(1));
export type StateDisasterEligibility = z.infer<typeof StateDisasterEligibility>;
