/**
 * The second sentence of every card bio: what this person is like, once the
 * first sentence has said where they were.
 *
 * The line is chosen by whichever reading landed furthest from the middle of
 * its own seat's window, in the direction it landed — read as character, not as
 * a score. A low reading is a person, not a penalty: low ambition is the rarest
 * and most useful thing in a deputy, and low loyalty is somebody who serves the
 * office rather than whoever is sitting in it.
 *
 * **Ten sentences used to close every bio in the world.** Five readings times
 * two directions, one string each, dealt across the whole cast — so the half of
 * a bio that is supposed to be the person was the most repeated prose in the
 * game. Six per cell, drawn by a hash of the person's own id, is what makes the
 * closing sentence a fact about them rather than a category they fell into.
 */
export declare const ATTRIBUTE_LINES: Record<string, {
    readonly high: readonly string[];
    readonly low: readonly string[];
}>;
