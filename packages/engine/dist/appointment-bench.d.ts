import type { Effect } from "./effects.js";
import type { Campaign } from "./state.js";
import type { OfficeId } from "./institutions.js";
/**
 * The `person` effects that stock a newly opened seat's bench up to its
 * minimum, or none where the cast already offers enough credible names or the
 * seat is not one a bench is generated for.
 *
 * `campaign` is the state the vacancy opens on; the people the bench already
 * holds count, so the second vacancy on a court draws only what the first one
 * left short.
 */
export declare function vacancyBenchEffects(campaign: Campaign, office: OfficeId, day?: number): readonly Effect[];
