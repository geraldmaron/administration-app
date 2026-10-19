import type { Charter, PersonId } from "@admin/world";
import type { ConstitutionalGround } from "./legislative-acts.js";
import { judiciaryBenchSeats, type BenchMember } from "./judiciary.js";
import type { ExecutiveOrder } from "./orders.js";
import { justiceStrikePropensity } from "./strike-odds.js";
import { selectPerson, type Campaign } from "./state.js";
import type { CourtHolding, CourtVote } from "./state-judiciary.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import { priorGovernmentAdviceRecusal } from "./court-recusal.js";

export type JusticeOnBench = {
  readonly person: PersonId;
  readonly seat: number;
  readonly senior: boolean;
  readonly member: BenchMember;
  readonly recused?: boolean;
};

export function benchForVotes(campaign: Campaign, challenged?: ExecutiveOrderRecord): readonly JusticeOnBench[] {
  return judiciaryBenchSeats(campaign).flatMap((seat) => {
    if (seat.vacant || !seat.personId) return [];
    const runtime = selectPerson(campaign, seat.personId);
    if (!runtime || runtime.alive === false) return [];
    // 28 U.S.C. §455(b)(3) requires disqualification for a judge's prior
    // governmental advice on the particular controversy. The recorded legal
    // reviewer identifies the adviser even when nomination history is absent.
    return [{ person: seat.personId, seat: seat.seat, senior: seat.senior,
      member: { ideology: runtime.base.ideology, integrity: runtime.base.integrity, competence: runtime.base.competence },
      ...(priorGovernmentAdviceRecusal(seat.personId, challenged)
        ? { recused: true } : {}) }];
  });
}

export type CourtDecision = {
  readonly disposition: "majority" | "equal-division" | "no-quorum";
  readonly holding?: CourtHolding;
  readonly votes: readonly CourtVote[];
  readonly majorityAuthor?: PersonId;
  readonly dissentAuthor?: PersonId;
  readonly majority: number;
  readonly minority: number;
};

/** Probability over the same uniform case draw used by decideCase; a tie keeps the lower judgment. */
export function majorityStrikeChance(charter: Charter, order: ExecutiveOrder, bench: readonly JusticeOnBench[], ground: ConstitutionalGround, lower: CourtHolding,
  meritsChance?: (member: BenchMember) => number | undefined): number | undefined {
  const participating = bench.filter((justice) => !justice.recused);
  if (participating.length < 6) return undefined;
  const thresholds = participating.map((justice) => meritsChance?.(justice.member) ?? justiceStrikePropensity(charter, order, justice.member, ground)).sort((a, b) => b - a);
  const votesNeeded = lower === "struck-down" ? Math.ceil(participating.length / 2) : Math.floor(participating.length / 2) + 1;
  return thresholds[votesNeeded - 1];
}

const author = (side: readonly JusticeOnBench[]): PersonId | undefined =>
  side.find((justice) => justice.senior)?.person ?? [...side].sort((a, b) => a.seat - b.seat)[0]?.person;

/** All votes read the same case uncertainty. A justice's own legal threshold determines their vote. */
export function decideCase(
  charter: Charter,
  order: ExecutiveOrder,
  bench: readonly JusticeOnBench[],
  ground: ConstitutionalGround,
  draw: number,
  _caseId: string,
  meritsChance?: (member: BenchMember) => number | undefined,
): CourtDecision {
  const participating = bench.filter((justice) => !justice.recused);
  if (participating.length < 6) return { disposition: "no-quorum", votes: [], majority: 0, minority: 0 };
  const votes: readonly CourtVote[] = participating.map((justice) => ({
    justice: justice.person, seat: justice.seat,
    vote: draw < (meritsChance?.(justice.member) ?? justiceStrikePropensity(charter, order, justice.member, ground)) ? "strike" : "uphold",
  }));
  const strikes = votes.filter((vote) => vote.vote === "strike").length;
  const upholds = votes.length - strikes;
  if (strikes === upholds) return { disposition: "equal-division", votes, majority: strikes, minority: upholds };
  const holding = strikes > upholds ? "struck-down" : "upheld";
  const winning = participating.filter((justice) => votes.find((vote) => vote.justice === justice.person)?.vote === (holding === "struck-down" ? "strike" : "uphold"));
  const losing = participating.filter((justice) => !winning.includes(justice));
  const majorityAuthor = author(winning);
  const dissentAuthor = author(losing);
  return { disposition: "majority", holding, votes,
    ...(majorityAuthor ? { majorityAuthor } : {}), ...(dissentAuthor ? { dissentAuthor } : {}),
    majority: winning.length, minority: losing.length };
}
