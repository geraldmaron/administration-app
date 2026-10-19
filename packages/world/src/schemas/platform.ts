import { z } from "zod";
import { CohortId } from "./cohort.js";

/**
 * A plank of the platform the President runs on and governs by.
 *
 * Only what every surface that shows a plank needs is fixed here: a name, the
 * sentence a player reads, and the cohorts it courts, which are the people who
 * notice when a pledge made on it is kept or broken. What a plank moves in the
 * simulation is the engine's to say, against the policy catalog it already
 * has, so the dataset carries no stance or act ids it cannot check.
 */
export const PlankId = z.string().min(1).brand<"PlankId">();
export type PlankId = z.infer<typeof PlankId>;

export const Plank = z.object({
  id: PlankId,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  courts: z.array(CohortId).min(1),
});
export type Plank = z.infer<typeof Plank>;
