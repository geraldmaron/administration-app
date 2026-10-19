import type { Campaign, LobbyApproach, LobbyForecast } from "./state.js";
import type { HillMember } from "./hill.js";
import { confidenceFromEvidence, likelihoodFromUnitInterval } from "./assessments.js";
import { SHARED_CREDIT_FRACTION } from "./credit-share.js";
import type { FiscalMatter } from "./lobbying-favors.js";

// The words a Hill play is said in: the card before it, the forecast, and the
// account the record keeps after. Kept apart from the arithmetic in
// `lobbying.ts` so the five plays can each be said in full without the module
// that prices them growing past what one reader can hold.

type Matter = { readonly billId: string; readonly title: string } | undefined;

export type PlayCopy = { readonly summary: string; readonly offer?: { readonly summary: string }; readonly footer: string };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const creditPercent = `${Math.round(SHARED_CREDIT_FRACTION * 100)}%`;

function tradeCopy(fiscal: FiscalMatter | undefined, blocked: string | undefined): PlayCopy {
  if (blocked || !fiscal) {
    return {
      summary:
        "No eligible appropriation project is on the floor. A budget negotiation needs live fiscal business — a spending bill, an authorization, or a funding measure — not an invented district line.",
      footer: "No eligible project.",
    };
  }
  const offer = `Support on ${fiscal.title} in exchange for its place in the appropriation path — a political commitment recorded when they accept, not money leaving the treasury today. The bill's own enactment is the charge.`;
  return { summary: offer, offer: { summary: offer }, footer: "Authorize the offer." };
}

export function playCopy(
  approach: LobbyApproach,
  member: HillMember,
  matter: Matter,
  fiscal: FiscalMatter | undefined,
  blocked: string | undefined,
): PlayCopy {
  const about = matter ? ` ${matter.title}` : " the next measure that reaches their floor";
  if (approach === "public") {
    return {
      summary: `Make the case for${about} in ${member.name}'s own media market. Observed local sentiment is not the same as how the rest of the chamber will take being leaned on.`,
      footer: "Make the appeal.",
    };
  }
  if (approach === "trade") return tradeCopy(fiscal, blocked);
  if (approach === "credit") {
    return matter
      ? {
          summary: `Put ${member.name}'s name on ${matter.title}. When it becomes law, ${creditPercent} of the ground it would win you goes to them instead.`,
          footer: "Share the credit.",
        }
      : { summary: "No live bill has credit worth sharing.", footer: "Nothing to share." };
  }
  if (approach === "campaign") {
    return {
      summary: `Campaign beside ${member.name} in their home state. You lend them your name there, and your standing pays for it.`,
      footer: "Go to their state.",
    };
  }
  return {
    summary: `Ask ${member.name} directly for${about}. A useful call can improve access without delivering the vote.`,
    footer: "Place the call.",
  };
}

const DELAY_DAYS: Readonly<Record<LobbyApproach, number>> = { call: 1, credit: 2, trade: 3, public: 4, campaign: 5 };

export function delayDaysFor(approach: LobbyApproach): number {
  return DELAY_DAYS[approach];
}

const SUPPORTING: Readonly<Record<Exclude<LobbyApproach, "call">, string>> = {
  public: "The read is the country's present mood and the press standing, not charm in the room.",
  trade: "A specific, reportable commitment is worth more to them than an unstructured ask.",
  credit: "Their name on a law is worth more to a member than anything said in a room.",
  campaign: "A President at their side at home is a thing a member can show their voters.",
};

export function lobbyForecast(campaign: Campaign, member: HillMember, approach: LobbyApproach, chance: number): LobbyForecast {
  const history = campaign.congress.lobbying.filter((record) => record.post === member.figure.post).length;
  const evidence = clamp01(0.28 + Math.min(0.35, history * 0.12) + (approach === "public" ? campaign.press.standing * 0.25 : 0.15));
  const confidence = confidenceFromEvidence(evidence);
  const supporting = approach === "call" ? `${member.name} still takes the call, which is not the same as moving.` : SUPPORTING[approach];
  const uncertainty =
    approach === "public"
      ? "A public miss can harden the rest of the chamber, not only this member."
      : "Goodwill and a vote are different things, and this office cannot see the difference in advance.";
  return {
    likelihood: likelihoodFromUnitInterval(chance),
    confidence,
    confidenceBasis:
      confidence === "high"
        ? "Recent dealings and a public record give the whip something to stand on."
        : confidence === "moderate"
          ? "The whip is working from caucus, office, and what this administration has already tried."
          : "Little on the record about how this member answers a private ask.",
    supporting,
    uncertainty,
    source: "Office of the Whip",
    asOf: campaign.calendar,
  };
}

export function reasonFor(approach: LobbyApproach, chance: number, member: HillMember): string {
  if (approach === "public") {
    return chance < 0.4
      ? `The country is not currently in a mood to be asked to lean on anybody, and ${member.name} will be the one who says so.`
      : `${member.name} holds a seat the administration can reach voters in, and both of them know it.`;
  }
  if (approach === "trade") {
    return "The offer is specific enough to be worth something and public enough to be reported as what it is.";
  }
  if (approach === "credit") {
    return `${member.name} gets a law with their name on it, and the President's own leaders get to watch.`;
  }
  if (approach === "campaign") {
    return `${member.name} gets the President at their side at home, which is worth more to a member than a call.`;
  }
  return chance < 0.4
    ? `${member.name} takes the call, listens, and has already decided how it ends.`
    : `${member.name} takes the call, and there is something in it for both offices.`;
}

/** What the record says happened, said once the member has answered. */
export function accountOf(approach: LobbyApproach, target: string, landed: boolean, title: string): string {
  if (approach === "public") {
    return landed
      ? `${title} takes the argument to ${target}'s own voters, and by the weekend the member's office is answering for the no rather than the administration.`
      : `${title} takes the argument to ${target}'s own voters, who side with the member — who is now the one person on the Hill this administration has publicly failed to move.`;
  }
  if (approach === "trade") {
    return landed
      ? `${target} accepts the appropriation commitment on the live fiscal business, and the vote comes with it. No treasury movement until that bill is enacted.`
      : `${target} hears the offer and makes no commitment about the vote, which is a thing a member is entitled to do.`;
  }
  if (approach === "credit") {
    return landed
      ? `${target} takes the credit and the vote that goes with it.`
      : `${target} takes the credit gladly and keeps the vote to themselves.`;
  }
  if (approach === "campaign") {
    return landed
      ? `${title} campaigns beside ${target} at home, and ${target} comes back to Washington owing the visit.`
      : `${title} campaigns beside ${target} at home. ${target} is grateful, and no closer on the vote.`;
  }
  return landed
    ? `${title} calls ${target}, and the conversation ends somewhere useful to both offices.`
    : `${title} calls ${target}, and the conversation ends where it began.`;
}
