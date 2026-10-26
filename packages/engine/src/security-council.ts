import { organizations, type NationId, type Organization } from "@admin/world";
import { sharedBodies } from "./compacts.js";
import { disposition } from "./relationships.js";
import { selectNation, selectRelationship, type Campaign } from "./state.js";

// The Security Council as a voting body, read off the organization registry's
// council rule rather than a list of countries here. Charter Art. 27: each
// member has one vote; a procedural decision needs nine affirmative votes; any
// other needs nine including the concurring votes of the permanent members,
// and a party to a dispute abstains in a Chapter VI decision. A permanent
// member that abstains lets a draft pass: only a "no" is a veto.
//
// What a vote buys is stated in `councilEffects`, and it is never domestic
// law or a won war. The Council can bind other governments (Art. 25) and
// authorize member states to use force (Art. 42); it cannot give a President
// authority at home, which the War Powers Resolution and Congress hold, and it
// does not make the force it authorizes succeed.

export type CouncilMeasure = "procedural" | "recommendation" | "sanctions" | "authorize-force";
export type CouncilPosition = "for" | "against" | "abstain";

export type CouncilProposal = {
  readonly sponsor: NationId;
  readonly target?: NationId;
  readonly measure: CouncilMeasure;
  /** Governments party to the dispute, who must abstain on a recommendation. Defaults to the target. */
  readonly parties?: readonly NationId[];
};

export type CouncilReason = "adopted" | "vetoed" | "short-of-votes";

export type CouncilTally = {
  readonly for: number;
  readonly against: number;
  readonly abstain: number;
  readonly adopted: boolean;
  readonly reason: CouncilReason;
  /** Permanent members that voted no on a substantive question. Empty on a procedural one, which carries no veto. */
  readonly vetoedBy: readonly NationId[];
};

export type CouncilEffects = {
  readonly standing: "agenda" | "recommendation" | "binding-measures" | "authorization-of-force";
  /** Art. 25: members agree to carry out the Council's decisions. A recommendation is not one. */
  readonly bindsMembers: boolean;
  /** Art. 42: states may act. No state is obliged to, because the Art. 43 force agreements were never made. */
  readonly authorizesForce: boolean;
  readonly usDomesticAuthority: "none";
  readonly militaryOutcome: "none";
};

export type CouncilOutcome = CouncilTally & {
  readonly measure: CouncilMeasure;
  readonly positions: Readonly<Record<string, CouncilPosition>>;
  /** What an adopted resolution does; a failed one does nothing. */
  readonly effects: CouncilEffects | undefined;
};

const SUBSTANTIVE: ReadonlySet<CouncilMeasure> = new Set(["recommendation", "sanctions", "authorize-force"]);

/** How much more a government must prefer the sponsor to the target before it votes yes, by how far the measure reaches. Planning values. */
const YES_MARGIN: Readonly<Record<CouncilMeasure, number>> = { procedural: 0, recommendation: 0.04, sanctions: 0.12, "authorize-force": 0.25 };
/** How far a government must prefer the target to the sponsor before it votes no rather than abstains. */
const NO_MARGIN = 0.1;
/** What a treaty partner's standing counts for a government that shares a defense body or a treaty with the sponsor. */
const PARTNER_BONUS = 0.25;
/** What a member's feeling toward the sponsor counts against its feeling toward the target: a draft is about the target first. */
const SPONSOR_WEIGHT = 0.5;

const EFFECTS: Readonly<Record<CouncilMeasure, CouncilEffects>> = {
  procedural: { standing: "agenda", bindsMembers: false, authorizesForce: false, usDomesticAuthority: "none", militaryOutcome: "none" },
  recommendation: { standing: "recommendation", bindsMembers: false, authorizesForce: false, usDomesticAuthority: "none", militaryOutcome: "none" },
  sanctions: { standing: "binding-measures", bindsMembers: true, authorizesForce: false, usDomesticAuthority: "none", militaryOutcome: "none" },
  "authorize-force": { standing: "authorization-of-force", bindsMembers: false, authorizesForce: true, usDomesticAuthority: "none", militaryOutcome: "none" },
};

export function councilEffects(measure: CouncilMeasure): CouncilEffects {
  return EFFECTS[measure];
}

export function isSubstantive(measure: CouncilMeasure): boolean {
  return SUBSTANTIVE.has(measure);
}

/** The Council as the registry holds it, or undefined where a dataset ships none. */
export function securityCouncil(): Organization | undefined {
  return organizations.find((org) => org.council !== undefined);
}

/** Art. 27 on a set of positions: the count, the veto and whether the draft is adopted. */
export function tallyCouncil(
  rule: NonNullable<Organization["council"]>,
  measure: CouncilMeasure,
  positions: Readonly<Record<string, CouncilPosition>>,
): CouncilTally {
  const votes = Object.values(positions);
  const count = (position: CouncilPosition) => votes.filter((p) => p === position).length;
  const substantive = isSubstantive(measure);
  const vetoedBy = substantive
    ? rule.permanent.filter((seat) => positions[seat as string] === "against").sort()
    : [];
  const yes = count("for");
  const enough = yes >= rule.threshold;
  const reason: CouncilReason = !enough ? "short-of-votes" : vetoedBy.length > 0 ? "vetoed" : "adopted";
  return { for: yes, against: count("against"), abstain: count("abstain"), adopted: reason === "adopted", reason, vetoedBy };
}

function lean(campaign: Campaign, from: NationId, to: NationId): number {
  const relationship = selectRelationship(campaign, from, to);
  return relationship ? disposition(relationship, campaign) : 0;
}

function protects(campaign: Campaign, member: NationId, target: NationId): boolean {
  const mine = selectNation(campaign, member)?.base.memberships ?? [];
  const theirs = selectNation(campaign, target)?.base.memberships ?? [];
  const treaty = (selectRelationship(campaign, member, target)?.treaties.length ?? 0) > 0;
  return treaty || sharedBodies(mine, theirs).some((body) => body.kind === "defense");
}

/** How one member votes: its own cause first, then a treaty partner's, then which of the two it would rather see prevail. */
export function councilPosition(campaign: Campaign, member: NationId, proposal: CouncilProposal): CouncilPosition {
  const { sponsor, target, measure } = proposal;
  const parties = proposal.parties ?? (target ? [target] : []);
  // Art. 27(3) binds a sponsoring party too, so abstention outranks the sponsor's own yes.
  if (measure === "recommendation" && parties.includes(member)) return "abstain";
  if (member === sponsor) return "for";
  if (target && measure !== "procedural" && member === target) return "against";
  if (target && measure !== "procedural" && protects(campaign, member, target) && !protects(campaign, member, sponsor)) return "against";
  const partner = protects(campaign, member, sponsor) ? PARTNER_BONUS : 0;
  const stance = partner + SPONSOR_WEIGHT * lean(campaign, member, sponsor) - (target ? lean(campaign, member, target) : 0);
  if (stance >= YES_MARGIN[measure]) return "for";
  return stance <= -NO_MARGIN ? "against" : "abstain";
}

/** The vote on a draft resolution, member by member in id order, with what an adopted one does. */
export function councilVote(campaign: Campaign, proposal: CouncilProposal): CouncilOutcome | undefined {
  const body = securityCouncil();
  if (!body?.council) return undefined;
  const positions: Record<string, CouncilPosition> = {};
  for (const member of [...body.members].sort()) positions[member as string] = councilPosition(campaign, member, proposal);
  const tally = tallyCouncil(body.council, proposal.measure, positions);
  return { ...tally, measure: proposal.measure, positions, effects: tally.adopted ? councilEffects(proposal.measure) : undefined };
}
