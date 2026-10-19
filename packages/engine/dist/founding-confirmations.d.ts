import type { Campaign } from "./state.js";
/**
 * Put the sealed cabinet through the Senate.
 *
 * Every pick is counted against the Senate the seal composed, with the Vice
 * President in the chair; the confirmed keep their seats and the contested go
 * to the calendar under an acting. Runs inside the seal, before the opening
 * approval is recomputed, so the country's first reading is of the cabinet
 * actually seated.
 */
export declare function foundingConfirmations(campaign: Campaign): Campaign;
