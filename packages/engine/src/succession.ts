import type { PersonId } from "@admin/world";
import type { Campaign } from "./state.js";

// What happens to the office when the President leaves it before the term is
// out: the Vice President sworn in, and the epilogue that follows.
//
// A removal used to end the game on a verdict and an empty chair, as if the
// office went with the person. It does not. The Vice President takes the oath
// the same day, and if there is no Vice President the Speaker of the House
// does, which is the order the Presidential Succession Act sets. The campaign
// does not play on past that oath: the successor's presidency is an epilogue
// here, and continuing it is a later piece of work.
//
// Incapacity under the Twenty-fifth Amendment's fourth section is modeled only
// as a question the balance harness can ask. No surface and no phase reaches
// it: a Cabinet declaring the President unable to serve is a scenario with
// consequences nobody has written, and a mechanism with no scenario behind it
// would be a trapdoor under every campaign.

export type SuccessionMechanism = "removal" | "resignation" | "incapacity";

export type Succession = {
  readonly successor: PersonId;
  readonly mechanism: SuccessionMechanism;
  /** Which office the successor held when the presidency passed to them. */
  readonly from: "vice-president" | "speaker";
};

function living(campaign: Campaign, person: PersonId | undefined): PersonId | undefined {
  if (person === undefined) return undefined;
  return campaign.people[person]?.alive === true ? person : undefined;
}

/**
 * Who would take the oath if the office passed today: the Vice President, and
 * with no living Vice President the Speaker. Asked before the office passes,
 * which is what lets the removal that causes it name who comes next.
 */
export function nextInLine(campaign: Campaign): Pick<Succession, "successor" | "from"> | undefined {
  const vicePresident = living(campaign, campaign.vicePresident);
  if (vicePresident) return { successor: vicePresident, from: "vice-president" };
  const speaker = campaign.congress.leadership.find((figure) => figure.post === "post-house-speaker")?.person;
  const seated = living(campaign, speaker);
  return seated ? { successor: seated, from: "speaker" } : undefined;
}

/** Who succeeds this President, once the office has passed. Undefined while the President serves. */
export function successionOf(campaign: Campaign): Succession | undefined {
  if (!campaign.removal.resolved) return undefined;
  const next = nextInLine(campaign);
  return next ? { ...next, mechanism: "removal" } : undefined;
}

/**
 * The line a removal closes on: the successor taking the oath. Empty when
 * nobody in the line can be named, rather than a sentence about a stranger.
 */
export function successionHandover(campaign: Campaign): string {
  const next = nextInLine(campaign);
  if (!next) return "";
  const name = campaign.people[next.successor]?.base.name;
  if (!name) return "";
  return next.from === "vice-president"
    ? `Within the hour, Vice President ${name} takes the oath of office, and the presidency passes without a break.`
    : `With no Vice President to take it, the oath passes to the Speaker of the House, ${name}, and the presidency continues without a break.`;
}

/**
 * The Twenty-fifth Amendment's fourth section, asked by the balance harness
 * and nothing else: if the Vice President and a majority of the Cabinet
 * declared the President unable to serve today, who would act as President.
 * Nothing is written; the harness reads the answer.
 */
export function section4Succession(campaign: Campaign): Succession | undefined {
  const vicePresident = living(campaign, campaign.vicePresident);
  if (!vicePresident || campaign.removal.resolved) return undefined;
  return { successor: vicePresident, mechanism: "incapacity", from: "vice-president" };
}
