import {
  POLICY_DOMAINS,
  POLICY_DOMAIN_SPECS,
  domainAuthority,
  domainChair,
  executionQuality,
  plankDeliverable,
  programStandUpRemaining,
  revenueStatuteRequired,
  selectChairRunner,
  selectPolicyStance,
  stancesForDomain,
  type Campaign,
  type GameDate,
  type PolicyDomain,
} from "@admin/engine";
import { STATE_IDS, plankById, stateById, type StateEconomyAxis, type StateId } from "@admin/world";
import { charterOf } from "../campaign/founding-options";
import { roleTitle } from "../format/figures";

// The standing program, domain by domain: what each domain is set to, who
// carries it, what changing it would run into, and which promises ride on it.
// The stance-by-stance comparison is `stance-comparison.ts`.

/**
 * The parts of a state's economy each domain's program lands on hardest,
 * on the six axes a state is described by. Presentation only: the map colors
 * a state by how much of its living sits in these, so the President sees where
 * a program would be felt before choosing one.
 */
export const POLICY_DOMAIN_AXES: Readonly<Record<PolicyDomain, readonly StateEconomyAxis[]>> = {
  fiscal: ["services"],
  industry: ["industrial", "energy"],
  trade: ["industrial", "agricultural"],
  civil: ["services"],
  security: ["tech"],
  defense: ["defense"],
};

const AXIS_WORDS: Readonly<Record<StateEconomyAxis, string>> = {
  industrial: "industry",
  agricultural: "farming",
  energy: "energy",
  tech: "technology",
  services: "services",
  defense: "defense work",
};

/** The glyph each domain is drawn with. */
export const POLICY_DOMAIN_ICONS: Readonly<Record<PolicyDomain, string>> = {
  fiscal: "departmentTreasury",
  industry: "departmentEnergy",
  trade: "subjectTrade",
  civil: "departmentJustice",
  security: "departmentHomelandSecurity",
  defense: "departmentDefense",
};

export function isPolicyDomain(value: string | undefined): value is PolicyDomain {
  return value !== undefined && (POLICY_DOMAINS as readonly string[]).includes(value);
}

/** What the map's share lens for a domain is a share of, in words. */
export function domainShareWords(domain: PolicyDomain): string {
  const words = POLICY_DOMAIN_AXES[domain].map((axis) => AXIS_WORDS[axis]);
  return words.length === 1 ? words[0]! : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** Each state's share of its economy in the domain's axes, 0..1, from the dataset. */
export function stateIndustryShares(domain: PolicyDomain): ReadonlyMap<StateId, number> {
  const axes = POLICY_DOMAIN_AXES[domain];
  return new Map(
    STATE_IDS.flatMap((id) => {
      const economy = stateById.get(id)?.character.economy;
      return economy ? [[id, axes.reduce((sum, axis) => sum + economy[axis], 0)] as const] : [];
    }),
  );
}

/** A promise that rides on a domain: keeping or changing the program keeps or breaks it. */
export type PledgeAtStake = {
  readonly id: string;
  readonly title: string;
  readonly dueDate: GameDate;
  /** The stance that keeps it. */
  readonly stance: string;
  /** Hold: the program is kept by leaving it in place. Adopt: kept by putting it in place. */
  readonly kind: "hold" | "adopt";
};

/** Every open pledge whose deliverable is a program in this domain. */
export function pledgesOnDomain(campaign: Campaign, domain: PolicyDomain): readonly PledgeAtStake[] {
  return (campaign.pledges ?? []).flatMap((pledge) => {
    if (pledge.status !== "open") return [];
    const deliverable = plankDeliverable(pledge.plank);
    if (!deliverable || deliverable.kind === "sign-order" || deliverable.domain !== domain) return [];
    return [
      {
        id: pledge.id,
        title: plankById.get(pledge.plank as string)?.title ?? (pledge.plank as string),
        dueDate: pledge.dueDate,
        stance: deliverable.stance,
        kind: deliverable.kind === "hold-program" ? ("hold" as const) : ("adopt" as const),
      },
    ];
  });
}

export type PortfolioDomain = {
  readonly domain: PolicyDomain;
  readonly name: string;
  readonly question: string;
  readonly icon: string;
  readonly stance: { readonly id: string; readonly name: string; readonly summary: string; readonly inherited: boolean };
  /** The other positions on the table. */
  readonly alternatives: number;
  readonly chair?: string;
  readonly minister?: string;
  /** The person running the department, for the portrait: the confirmed Secretary or the acting one. */
  readonly ministerId?: string;
  /** How well the chair carries it, 0..1. */
  readonly quality: number;
  readonly authority: string;
  /** Weeks before the standing program starts to bite. Zero once it does. */
  readonly standUpWeeks: number;
  /** Whether some position here can only be reached through a bill. */
  readonly byStatute: boolean;
  readonly pledges: readonly PledgeAtStake[];
  /** What the map's lens for this domain is a share of. */
  readonly shareWords: string;
};

function portfolioDomain(campaign: Campaign, domain: PolicyDomain): PortfolioDomain {
  const spec = POLICY_DOMAIN_SPECS[domain];
  const stance = selectPolicyStance(campaign, domain);
  const chair = domainChair(campaign, domain);
  const holder = chair ? selectChairRunner(campaign, chair) : undefined;
  const others = stancesForDomain(domain).filter((entry) => entry.id !== stance.id);
  return {
    domain,
    name: spec.name,
    question: spec.question,
    icon: POLICY_DOMAIN_ICONS[domain],
    stance: { id: stance.id, name: stance.name, summary: stance.summary, inherited: stance.inherited === true },
    alternatives: others.length,
    ...(chair ? { chair: roleTitle(chair as string, charterOf(campaign).roleTitles) } : {}),
    ...(holder?.alive ? { minister: holder.base.name, ministerId: holder.base.id as string } : {}),
    quality: executionQuality(campaign, domain),
    authority: domainAuthority(domain),
    standUpWeeks: programStandUpRemaining(campaign, domain, stance),
    byStatute: others.some((entry) => revenueStatuteRequired(campaign, domain, entry.id) !== undefined),
    pledges: pledgesOnDomain(campaign, domain),
    shareWords: domainShareWords(domain),
  };
}

/** The six domains of the standing program, in the engine's order. */
export function policyPortfolio(campaign: Campaign): readonly PortfolioDomain[] {
  return POLICY_DOMAINS.map((domain) => portfolioDomain(campaign, domain));
}
