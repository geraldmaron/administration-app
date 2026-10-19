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

function simpleMajority(seats: number): number {
  return Math.floor(seats / 2) + 1;
}

export function breakSenateTie(
  congress: Congress,
  vote: ChamberVote,
  counted: "with" | "against" = "with",
): ChamberVote {
  if (vote.chamber !== "senate" || vote.yeas !== vote.nays) return vote;
  if (vote.required !== simpleMajority(congress.chambers.senate.seats)) return vote;
  const officer = congress.presidingOfficer;
  if (!officer) return { ...vote, passed: false };
  // The Vice President casts an additional vote; no senator's recorded ballot changes.
  if (counted === "against") {
    return { ...vote, nays: vote.nays + 1, passed: false, tieBrokenBy: officer.person, castingVote: { person: officer.person, yea: false } };
  }
  const yeas = vote.yeas + 1;
  return {
    ...vote,
    yeas,
    nays: vote.nays,
    passed: yeas >= vote.required,
    tieBrokenBy: officer.person,
    castingVote: { person: officer.person, yea: true },
  };
}
