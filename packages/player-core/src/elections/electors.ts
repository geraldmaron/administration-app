import { otherMajorParty, type Campaign } from "@admin/engine";
import { stateById } from "@admin/world";
import { formatRatio } from "../format/figures";
import type { FinaleChamber, FinaleContest } from "./finale";

// The night's electors as a chamber is drawn: two parties' seats and the line a
// majority is counted from, so the finale reads like every other count in the
// game. The administration's party is the one the caucus anchors to.

export type ElectorBlock = {
  readonly party: "democrat" | "republican";
  readonly label: string;
  readonly seats: number;
};

export type ElectorsReading = {
  readonly parties: readonly ElectorBlock[];
  readonly majority: number;
  readonly total: number;
  readonly verdict: string;
  /** States the night split between the two sides: Maine and Nebraska, by district. */
  readonly splitStates: number;
};

const PARTY_LABEL = { democrat: "Democrats", republican: "Republicans" } as const;

/** The electoral college of a decided night, administration and opposition seated by party, Democrats on the left. */
export function electorsReading(campaign: Campaign, contest: FinaleContest): ElectorsReading {
  const anchor = campaign.congress.caucusAnchor;
  const other = otherMajorParty(anchor);
  const blocks: readonly ElectorBlock[] = [
    { party: anchor, label: PARTY_LABEL[anchor], seats: contest.electoralVotes },
    { party: other, label: PARTY_LABEL[other], seats: contest.opponentVotes },
  ];
  const parties = anchor === "democrat" ? blocks : [blocks[1]!, blocks[0]!];
  const margin = Math.abs(contest.electoralVotes - contest.opponentVotes);
  const split = contest.calls.filter((call) => call.administrationVotes > 0 && call.administrationVotes < call.electoralVotes).length;
  return {
    parties,
    majority: contest.electoralMajority,
    total: contest.electoralVotes + contest.opponentVotes,
    verdict: contest.won
      ? `You won ${contest.electoralVotes} electoral votes, ${margin} more than the other side.`
      : `You won ${contest.electoralVotes} electoral votes, ${margin} fewer than the other side.`,
    splitStates: split,
  };
}

export type ClosestCall = {
  readonly state: string;
  readonly name: string;
  readonly electoralVotes: number;
  readonly forYou: boolean;
  /** "Carried by 1 point" or "Lost by 2 points", in whole points of the two-way vote. */
  readonly margin: string;
};

/** Every state the night was counted in, narrowest margin first. */
export function closestCalls(contest: FinaleContest): readonly ClosestCall[] {
  return [...contest.calls]
    .sort((a, b) => Math.abs(a.share - 0.5) - Math.abs(b.share - 0.5) || b.electoralVotes - a.electoralVotes)
    .map((call) => {
      const forYou = call.winner === "administration";
      const points = Math.max(1, Math.round(Math.abs(call.share - 0.5) * 200));
      return {
        state: call.state as string,
        name: stateById.get(call.state as never)?.name ?? (call.state as string),
        electoralVotes: call.electoralVotes,
        forYou,
        margin: `${forYou ? "Carried" : "Lost"} by ${points} ${points === 1 ? "point" : "points"}, ${formatRatio(forYou ? call.share : 1 - call.share)} of the two-way vote`,
      };
    });
}

/** A chamber the next President meets, seated by party from the left, as the hemicycle draws it. */
export function finaleChamberParties(chamber: FinaleChamber): readonly { readonly party: "democrat" | "republican" | "independent"; readonly seats: number; readonly label: string }[] {
  const of = (party: "democrat" | "republican") => (party === chamber.anchor ? chamber.composition.administration : chamber.composition.opposition);
  return [
    { party: "democrat" as const, seats: of("democrat"), label: "Democrats" },
    { party: "independent" as const, seats: chamber.composition.independent, label: "Independents" },
    { party: "republican" as const, seats: of("republican"), label: "Republicans" },
  ].filter((party) => party.seats > 0);
}
