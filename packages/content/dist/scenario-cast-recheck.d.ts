/**
 * The gates that state what the board looks like, as opposed to what the player
 * has done. Re-read when a memo is shown and when a reply is committed, because
 * a memo dealt on a contraction is about the contraction, and answering it
 * after the recovery would price a problem that is gone. Flags, turn windows
 * and relationships are left out on purpose: they describe how the case got
 * here, and a reply or the passing of time moves them without making the memo
 * wrong.
 */
export declare const BOARD_STATE_GATES: ReadonlySet<string>;
