import { z } from "zod";
import { DistrictId } from "./ids.js";
import { StateCohortMix, StateId } from "./state.js";
// One US House seat. Additive to the legislative mechanic, not part of it:
// `delegations.ts`'s continuous seat-split over state lean does not read a
// district. A district exists because a player-facing map that draws 435
// shapes needs 435 numbers under them, which `State.lean` — one average per
// state — cannot honestly supply.
// "democrat" | "republican" only, matching the engine's UsMajorParty. Not
// imported from there — world may not depend on engine (the dependency-
// direction lint) — so the two closed sets are kept in sync by hand, the same
// way ConditionKind is mirrored into content rather than imported across the
// boundary that forbids it.
export const DistrictParty = z.enum(["democrat", "republican"]);
const DistrictObject = z.object({
    id: DistrictId,
    state: StateId,
    /** 0 for an at-large seat (a state with exactly one district). */
    number: z.number().int().nonnegative(),
    /** Owned by the state: every district's population in a state must sum to
     * that state's `State.population`, checked by the dataset validator rather
     * than trusted. */
    population: z.number().positive(),
    /** Dem ← → Rep, Cook-PVI-ish. Finer than `State.lean`, which stays the
     * state average — a district does not overwrite it, it refines it. */
    lean: z.number().min(-1).max(1),
    incumbentParty: DistrictParty,
    /** Optional: where this district's demographic mix departs from its
     * state's `StateCohortMix`. Omitted means "reads as the state average" —
     * authoring 435 full cohort mixes is not required for the map or the
     * dossier to work, only for a district whose politics the state figure
     * alone would mislead a scenario about. */
    cohortSkew: StateCohortMix.partial().optional(),
});
export const District = DistrictObject;
// Unrefined object so the consumer-registry walk can see leaf fields, the
// same convention CityObjectSchema follows.
export const DistrictObjectSchema = DistrictObject;
