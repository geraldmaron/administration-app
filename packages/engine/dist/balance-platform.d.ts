import type { AdministrationParty } from "./state-legislature.js";
import type { FoundingChoices } from "./founding.js";
/** A platform to found on. */
export type HarnessPlatform = Pick<FoundingChoices, "platform" | "firstHundredDays">;
/**
 * The platform a proxy is founded on: the planks its program enacts, in the
 * order the program names them, then its party's ground up to the ceiling.
 *
 * The first-hundred-days priority is the first of those a hundred days can
 * settle. The seal refuses a plank that holds a program there, because a
 * program in force from the first day is kept by doing nothing.
 */
export declare function platformForProgram(program: readonly string[], party: AdministrationParty): HarnessPlatform;
/** The platform in the words a summary line prints. */
export declare function formatPlatform(platform: HarnessPlatform): string;
