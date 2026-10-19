import {
  GOVERNANCE_REVIEW_INTERVAL,
  POLICY_DOMAIN_SPECS,
  POLICY_DOMAINS,
  reviewsProgramThisTurn,
  selectFeed,
  selectGovernmentStance,
  type Campaign,
  type PolicyDomain,
} from "@admin/engine";
import type { NationId } from "@admin/world";

// What a foreign government is running at home, and when it last changed it.
//
// Every government on the board re-decides its program on its own staggered
// clock and the week's governing moves its country's rates, so the program is
// the reason a foreign economy is doing what its vitals say. A change of
// program is legislated and announced, so it is public: nothing here waits on
// the services.

export type ProgramRow = {
  readonly domain: PolicyDomain;
  readonly domainName: string;
  readonly stanceName: string;
  readonly summary: string;
};

export type ProgramChange = {
  readonly turn: number;
  readonly headline: string;
  /** "This week", "Last week", "5 weeks ago". */
  readonly when: string;
};

export type NationProgram = {
  readonly rows: readonly ProgramRow[];
  readonly lastChange?: ProgramChange;
  /** Weeks until it next reviews the program; 0 when that is this week. */
  readonly reviewInWeeks: number;
};

function weeksAgo(now: number, turn: number): string {
  const weeks = Math.max(0, now - turn);
  return weeks === 0 ? "This week" : weeks === 1 ? "Last week" : `${weeks} weeks ago`;
}

function weeksToReview(nation: NationId, turn: number): number {
  for (let ahead = 0; ahead < GOVERNANCE_REVIEW_INTERVAL; ahead += 1) {
    if (reviewsProgramThisTurn(nation, turn + ahead)) return ahead;
  }
  return GOVERNANCE_REVIEW_INTERVAL;
}

/** The program row on a foreign country's file; undefined for the player's own government or an unknown id. */
export function nationProgram(campaign: Campaign, nation: NationId): NationProgram | undefined {
  if (nation === campaign.founding.nation || campaign.nations[nation] === undefined) return undefined;
  const rows = POLICY_DOMAINS.map((domain) => {
    const stance = selectGovernmentStance(campaign, nation, domain);
    return { domain, domainName: POLICY_DOMAIN_SPECS[domain].name, stanceName: stance.name, summary: stance.summary };
  });
  const change = [...selectFeed(campaign)]
    .filter((item) => item.kind === "governance" && item.actor === nation)
    .sort((a, b) => b.turn - a.turn)[0];
  return {
    rows,
    ...(change ? { lastChange: { turn: change.turn, headline: change.headline, when: weeksAgo(campaign.turn, change.turn) } } : {}),
    reviewInWeeks: weeksToReview(nation, campaign.turn),
  };
}
