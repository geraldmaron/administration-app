import type { ScenarioFamilyRun } from "./scenario-families.js";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * How long an arc may go without putting anything in front of the President
 * before it lapses, in calendar days rather than turns so the bound means the
 * same thing whatever a turn is.
 *
 * A planning value. Sixteen weeks is past double the longest callback the
 * corpus writes end to end (about nine weeks), so an arc still being dealt
 * never lapses, and it is short enough that an abandoned one clears inside a
 * season.
 */
export declare const FAMILY_LAPSE_DAYS = 112;
/**
 * Open families whose last beat is at least `FAMILY_LAPSE_DAYS` behind the
 * campaign's date. Measured from the last thing the family dealt rather than
 * from its opening, so a long arc that keeps coming back is a story still
 * running, not one the administration walked away from.
 */
export declare function lapsingFamilies(campaign: Campaign): readonly ScenarioFamilyRun[];
/**
 * Pins whose opener was raised and never answered, once as old as a lapsing
 * arc. They are dropped rather than closed: nothing was dealt under them, so
 * there is no ending to put on the Record, and without a bound every raised
 * opener of a 416-week campaign would stay on the save.
 */
export declare function expiringPins(campaign: Campaign): readonly ScenarioFamilyRun[];
/**
 * Closes every lapsing family as `lapsed`. Goes through the family effect, the
 * one writer of `campaign.scenarioFamilies`, rather than beside it.
 */
export declare const familyLapsePhase: TurnPhase;
