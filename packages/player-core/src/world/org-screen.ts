import { describeCommitment, selectActiveConflicts, selectCompactCalls, type Campaign, type Commitment } from "@admin/engine";
import { organizationById, type NationId, type Organization } from "@admin/world";
import type { Stance } from "../reading";
import { boardStance, standingToward } from "./standing";
import { nationNameIn } from "./war-screen";

// An international body as a screen reads it: who sits in it, how those
// governments stand toward the United States, what the United States' own seat
// is, and what the President has promised in or toward it. A government the
// services cannot read is listed as unread and ranked last, never guessed.

const KIND_WORDS: Readonly<Record<Organization["kind"], string>> = {
  defense: "A defense alliance",
  economic: "An economic group",
  political: "A political group",
};

const TRADE_WORDS: Readonly<Record<NonNullable<Organization["tradeCompetence"]>, string>> = {
  "customs-union": "A customs union. Members charge the same tariffs on goods from outside the group.",
  fta: "A free-trade area. Members don't charge tariffs on each other's goods.",
  none: "",
};

const STANCE_WORDS: Readonly<Record<Stance | "unread", string>> = {
  favorable: "Trusts you",
  neutral: "Neutral",
  caution: "Wary of you",
  adverse: "Hostile",
  unread: "Unread",
};

const STANCE_LEVEL: Readonly<Record<Stance | "unread", number>> = { favorable: 4, neutral: 3, caution: 2, adverse: 1, unread: 0 };

export type OrgMember = {
  readonly nation: NationId;
  readonly name: string;
  readonly us: boolean;
  readonly stance: Stance | "unread";
  readonly word: string;
  /** Where the member sits on its four steps, as a fraction of the meter; 0 for an unread government. */
  readonly fraction: number;
  /** Fighting in a war right now. */
  readonly atWar: boolean;
};

export type OrgAlignment = {
  readonly counts: Readonly<Record<Stance | "unread", number>>;
  /** Share of the readable members that trust the United States or stand on the merits. */
  readonly warm: number;
  readonly readable: number;
  readonly word: string;
};

export type OrgCommitment = { readonly id: string; readonly line: string; readonly status: Commitment["status"]; readonly toward: "body" | "member" };

export type OrgCall = { readonly conflict: string; readonly ally: string; readonly aggressor: string; readonly answered: boolean };

export type OrgScreenReading = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly history: string;
  readonly trade?: string;
  readonly scope?: string;
  readonly usMember: boolean;
  readonly usRole: string;
  readonly members: readonly OrgMember[];
  readonly alignment: OrgAlignment;
  readonly commitments: readonly OrgCommitment[];
  readonly calls: readonly OrgCall[];
  /** The members in the map's set form: `nation:A|nation:B`. */
  readonly set: string;
};

function memberships(campaign: Campaign, nation: NationId): readonly string[] {
  const runtime = campaign.nations[nation];
  return runtime ? (runtime.memberships ?? runtime.base.memberships) : [];
}

/** The governments sitting in the body this week, as accessions and withdrawals have left its roster. */
export function orgMembersOf(campaign: Campaign, org: string): readonly NationId[] {
  return (Object.keys(campaign.nations) as NationId[]).filter((nation) => memberships(campaign, nation).includes(org)).sort();
}

function readMember(campaign: Campaign, nation: NationId, fighting: ReadonlySet<string>): OrgMember {
  const us = nation === campaign.founding.nation;
  const stance = us ? "favorable" : (boardStance(standingToward(campaign, nation)) ?? "unread");
  return {
    nation,
    name: nationNameIn(campaign, nation),
    us,
    stance,
    word: us ? "The United States" : STANCE_WORDS[stance],
    fraction: us ? 1 : STANCE_LEVEL[stance] / 4,
    atWar: fighting.has(nation),
  };
}

function alignmentOf(members: readonly OrgMember[]): OrgAlignment {
  const others = members.filter((member) => !member.us);
  const counts: Record<Stance | "unread", number> = { favorable: 0, neutral: 0, caution: 0, adverse: 0, unread: 0 };
  for (const member of others) counts[member.stance] += 1;
  const readable = others.length - counts.unread;
  const warm = readable === 0 ? 0 : (counts.favorable + counts.neutral) / readable;
  const word = readable === 0 ? "All of them are unread" : warm >= 0.75 ? "Broadly with you" : warm >= 0.4 ? "Divided" : "Mostly against you";
  return { counts, warm, readable, word };
}

function commitmentRows(campaign: Campaign, org: string, members: ReadonlySet<string>): readonly OrgCommitment[] {
  return Object.values(campaign.commitments)
    .filter((commitment) => commitment.actor === campaign.founding.nation && (commitment.status === "active" || commitment.status === "proposed" || commitment.status === "suspended"))
    .flatMap((commitment): OrgCommitment[] => {
      const body = commitment.target.kind === "org" && commitment.target.id === org;
      const member = commitment.target.kind === "nation" && members.has(commitment.target.id);
      return body || member ? [{ id: commitment.id, line: describeCommitment(commitment, campaign), status: commitment.status, toward: body ? "body" : "member" }] : [];
    })
    .sort((a, b) => a.toward.localeCompare(b.toward) || a.line.localeCompare(b.line));
}

function usRoleLine(campaign: Campaign, org: Organization, usMember: boolean, calls: readonly OrgCall[]): string {
  if (!usMember) return `The United States isn't a member of the ${org.name}.`;
  if (org.kind === "defense") {
    const open = calls.filter((call) => !call.answered).length;
    return open > 0 ? `A member. ${open === 1 ? "An ally has been attacked, and the alliance is waiting for the United States to respond." : `${open} allies have been attacked, and the alliance is waiting for the United States to respond.`}` : "A member. Every member has promised to defend the others.";
  }
  return org.kind === "economic" ? "A member, with a say in the trade rules the group sets." : "A member, with a voice at the group's meetings.";
}

/** One body's screen reading. Undefined for an id the dataset does not know. */
export function orgScreenReading(campaign: Campaign, id: string): OrgScreenReading | undefined {
  const org = organizationById.get(id);
  if (!org) return undefined;
  const nations = orgMembersOf(campaign, id);
  const fighting = new Set<string>(selectActiveConflicts(campaign).flatMap((conflict) => [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender]));
  const members = nations
    .map((nation) => readMember(campaign, nation, fighting))
    .sort((a, b) => Number(b.us) - Number(a.us) || STANCE_LEVEL[b.stance] - STANCE_LEVEL[a.stance] || a.name.localeCompare(b.name));
  const calls = selectCompactCalls(campaign)
    .filter((call) => call.org === id)
    .map((call) => ({ conflict: call.conflict, ally: nationNameIn(campaign, call.ally), aggressor: nationNameIn(campaign, call.aggressor), answered: call.answered }));
  const usMember = nations.includes(campaign.founding.nation);
  const trade = org.tradeCompetence ? TRADE_WORDS[org.tradeCompetence] : "";
  return {
    id,
    name: org.name,
    kind: KIND_WORDS[org.kind],
    history: org.history,
    ...(trade ? { trade } : {}),
    ...(org.defenseScope ? { scope: org.defenseScope.kind === "parties-territory" ? "The promise covers attacks on the members' own land." : "The promise covers only a set area, not every place a member is attacked." } : {}),
    usMember,
    usRole: usRoleLine(campaign, org, usMember, calls),
    members,
    alignment: alignmentOf(members),
    commitments: commitmentRows(campaign, id, new Set(nations)),
    calls,
    set: nations.map((nation) => `nation:${nation}`).join("|"),
  };
}
