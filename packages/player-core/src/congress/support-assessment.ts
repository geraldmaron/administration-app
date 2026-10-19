import { actOf, partyReading, stateAffinity, usTicket, type Bill, type Campaign, type Chamber, type GameDate } from "@admin/engine";
import type { PersonId, StateId } from "@admin/world";

export type PublicMemberAssessment = {
  readonly person: PersonId;
  readonly seat: string;
  readonly state: StateId;
  readonly party: string;
  readonly alignment: "favorable" | "adverse" | "mixed" | "unknown";
  readonly basis: readonly string[];
  readonly priorVote?: { readonly yea: boolean; readonly turn: number; readonly title: string };
};

export type ChamberSupportAssessment = {
  readonly chamber: Chamber;
  readonly seats: number;
  readonly required: number;
  readonly clotureRequired?: number;
  readonly interval: { readonly lower: number; readonly upper: number };
  readonly confidence: "unknown";
  readonly asOf: GameDate;
  readonly provenance: string;
  readonly members: readonly PublicMemberAssessment[];
  readonly lobbying: readonly { readonly turn: number; readonly account: string }[];
};

/** Public alignment supplies context, never a commitment or a calibrated probability. */
export function assessMemberSupport(campaign: Campaign, bill: Bill, against = false): readonly ChamberSupportAssessment[] {
  const act = actOf(bill);
  const signature = act?.domestic;
  return (["house", "senate"] as const).map((chamber) => {
    const seats = campaign.congress.chambers[chamber].seats;
    const members = (campaign.congress.members ?? []).filter((member) => member.chamber === chamber).map((member): PublicMemberAssessment => {
      const party = signature ? partyReading(usTicket(member.party).beliefs, signature) : 0;
      const state = campaign.states[member.state];
      const local = signature && state ? stateAffinity(state.base.character, state.lean, signature) : 0;
      const alignment = !signature || against ? "unknown" : party > 0 && local >= 0 ? "favorable" : party < 0 && local <= 0 ? "adverse" : "mixed";
      const basis = signature && !against ? [
        party > 0 ? "Their party's official positions support this bill" : party < 0 ? "Their party's official positions oppose this bill" : "Their party's positions don't point either way",
        local > 0 ? "What their home state's economy needs points toward yes" : local < 0 ? "What their home state's economy needs points toward no" : "Their home state's needs don't point either way",
      ] : [against ? "Where they stood on this before doesn't tell you how they'll vote on overriding your veto" : "There's no public record of where they stand on this"];
      const previous = Object.values(campaign.bills).filter((entry) => entry.act === bill.act && entry.id !== bill.id).flatMap((entry) => entry.passage.flatMap((vote) => {
        if (vote.recordedTurn === undefined) return [];
        const prior = vote.rollCall?.find((row) => row.person === member.person);
        return prior ? [{ yea: prior.yea, turn: vote.recordedTurn, title: entry.title }] : [];
      })).sort((a, b) => b.turn - a.turn)[0];
      return { person: member.person, seat: member.seat, state: member.state, party: member.party, alignment, basis, ...(previous ? { priorVote: previous } : {}) };
    });
    return { chamber, seats, required: against ? Math.ceil(seats * 2 / 3) : Math.floor(seats / 2) + 1,
      ...(!against && chamber === "senate" && (act?.track ?? "ordinary") === "ordinary" ? { clotureRequired: Math.ceil(seats * 0.6) } : {}),
      interval: { lower: 0, upper: seats }, confidence: "unknown", asOf: { ...campaign.calendar },
      provenance: "This comes from each party's official positions, what each state needs, past votes on related bills, and your own lobbying. No member has promised you a vote. The range is still open, and it isn't the chance of any result.",
      members, lobbying: campaign.congress.lobbying.map((record) => ({ turn: record.turn, account: record.account })),
    };
  });
}
