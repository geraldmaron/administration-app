/**
 * The sentences the dossier's reading of a person is drawn from.
 *
 * One bank per reading per direction, and every line is written to state the
 * comparison it is making: this person against the people this chair is
 * normally recruited from. That is not decoration. The five figures are printed
 * as meters on the same screen, and a block that said "Loyalty — Weak" beside a
 * bar reading 0.32 was either restating the bar or, for an opposition leader
 * whose window runs low by design, contradicting it. A sentence that says out
 * loud which yardstick it used cannot do either.
 *
 * The other rule these were written to: a line has to cost the president
 * something, or say what it buys them. High integrity is a person who will
 * refuse you in public. High competence is a department that stops writing
 * things down. Flattery with no consequence attached is the register this bank
 * exists to avoid, and the reason it is eight deep per cell rather than one.
 */
/** Every reading, each way it can land. */
export type AssessmentCell = "competence:high" | "competence:low" | "loyalty:high" | "loyalty:low" | "integrity:high" | "integrity:low" | "charisma:high" | "charisma:low" | "ambition:high" | "ambition:low";
export declare const ASSESSMENT_LINES: Record<AssessmentCell, readonly string[]>;
/**
 * How the fact behind a reading is introduced.
 *
 * Several, drawn by the same hash as the reading itself, because the clause
 * lands under every item on every file in the government: one frame would make
 * the whole cast sound like one form letter with the nouns swapped, which is
 * the failure this pass is correcting elsewhere and would be silly to
 * reintroduce here.
 *
 * `{fact}` is never the first word of a frame, so a driver phrase never needs
 * to be capitalized to be dropped into one.
 */
export declare const BECAUSE_FRAMES: readonly string[];
