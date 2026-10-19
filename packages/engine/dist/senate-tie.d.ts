/**
 * The Vice President's vote on a tied Senate, and nowhere else.
 *
 * A simple majority that lands 50-50 is settled by the chair when a Vice
 * President is seated and left failing when it is empty. Cloture, an override, a
 * treaty, and a conviction ask for more than half the Senate, so they never
 * reach this.
 *
 * The chair votes with the administration, which is the one thing it is for. On
 * a question counted against the President — a resolution of disapproval on the
 * privileged track — that means voting no, and the tie fails either way; the
 * difference a seated Vice President makes there is to the record, which says
 * who cast the vote that held it.
 */
import type { ChamberVote, Congress } from "./state-legislature.js";
export declare function breakSenateTie(congress: Congress, vote: ChamberVote, counted?: "with" | "against"): ChamberVote;
