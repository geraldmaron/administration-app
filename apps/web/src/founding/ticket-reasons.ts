import { ideologyCloseness, stateRegion, type RunningMateCandidate } from "@admin/engine";
import { attributeVerdict } from "@admin/player-core";
import { stateById, type IdeologyVector, type StateId } from "@admin/world";

// Where a running mate differs from the top of the ticket, in the terms the
// shortlist is ranked on: region, generation, politics and experience. Each
// line is a fact read off the same inputs the ranking used, and none of them
// claims an effect: the ticket's balance orders this list and nothing else
// reads it, so "brings the West" promised votes no election counted.

export type TicketTop = {
  readonly age: number;
  readonly ideology: IdeologyVector;
  readonly homeState?: StateId;
};

const REGION_NAME: Readonly<Record<string, string>> = {
  northeast: "the Northeast",
  midwest: "the Midwest",
  south: "the South",
  west: "the West",
};

function regionLine(top: TicketTop, mate: StateId | undefined): string | undefined {
  const theirs = stateRegion(mate);
  if (!mate || !theirs) return undefined;
  const state = stateById.get(mate)?.name ?? mate;
  const ours = stateRegion(top.homeState);
  if (top.homeState === mate) return `From ${state}, your own state`;
  if (ours === theirs) return `From ${state}, your own region`;
  return `From ${state}, in ${REGION_NAME[theirs] ?? theirs}`;
}

/** Ten years is where a gap starts to read as a different generation on a ticket. */
const GENERATION_GAP = 10;

function ageLine(top: TicketTop, age: number): string | undefined {
  const gap = age - top.age;
  if (Math.abs(gap) < GENERATION_GAP) return undefined;
  return gap > 0 ? `${gap} years older than you` : `${-gap} years younger than you`;
}

// The ticket balance rewards a gap near a fifth of the closeness scale: close
// enough to run on one platform, far enough to reach other voters.
function politicsLine(top: TicketTop, ideology: IdeologyVector): string {
  const gap = 1 - ideologyCloseness(top.ideology, ideology);
  if (gap < 0.08) return "Politics almost the same as yours";
  if (gap <= 0.35) return "Politics near yours";
  return "Politics well apart from yours";
}

export function ticketReasons(top: TicketTop, candidate: RunningMateCandidate): readonly string[] {
  const lines = [
    regionLine(top, candidate.homeState),
    ageLine(top, candidate.person.age),
    politicsLine(top, candidate.person.ideology),
    `${attributeVerdict(candidate.person.competence)} experience`,
  ];
  return lines.filter((line): line is string => line !== undefined);
}
