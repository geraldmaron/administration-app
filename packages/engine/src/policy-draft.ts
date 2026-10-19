import type { Charter, RoleId } from "@admin/world";
import { selectChairRunner } from "./appointments.js";
import {
  POLICY_DOMAINS,
  POLICY_DOMAIN_SPECS,
  domainChair,
  executionQuality,
  inheritedStance,
  legislableDomains,
  movementToDeltas,
  playerGdp,
  policyStance,
  round3,
  selectPolicies,
  selectPolicyStance,
  sentenceList,
  sumDeltas,
  type PolicyDomain,
  type PolicyOutlookLine,
  type PolicySet,
  type PolicyStance,
} from "./policy.js";
import {
  selectLaws,
  type AlignmentVector,
  type Campaign,
  type MetricSet,
} from "./state.js";
import { LEGISLATIVE_ACTS } from "./legislative-acts.js";
import { obligationAvailability } from "./funding.js";
import type { Effect, EffectPacket } from "./effects.js";
import { roleTitle } from "./naming.js";
import { domainAuthority, programStandUpRemaining, stanceOpposition, type PolicyOpposition } from "./policy-teeth.js";
import { programRestingOffset } from "./governance.js";
import type { MetricDeltas } from "./effect-types.js";

// Changing the program: what a draft would cost, what it would be worth, and
// the packet that adopts it.
//
// Split from policy.ts, which owns what the standing program *is* and what it
// does every week. This owns the moment it changes — a different question, with
// its own projection, its own refusals, and the one enactment price that is
// deliberately not scaled by the minister carrying it.

export type PolicyResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

export type PolicyDraftInput = Partial<Record<PolicyDomain, string>>;

export type PolicyDraftLine = PolicyOutlookLine & {
  readonly previous: PolicyStance;
  readonly changed: boolean;
  readonly enactment: MetricDeltas;
};

export type PolicyDraftCandidate = {
  readonly policies: PolicySet;
  readonly changes: readonly PolicyDraftLine[];
  readonly lines: readonly PolicyDraftLine[];
  readonly enactment: MetricDeltas;
  readonly perTurn: MetricDeltas;
  /**
   * The approval rating this program is being weighed against, as it stands.
   *
   * Not a projection, and it used to be one: it read the headline composite
   * after the program's own metric deltas, so drafting a bill moved the number
   * on screen before the bill existed. The headline is now the public's, and a
   * program reaches the public through what it does to order, to the forces, to
   * standing and to the accounts, over the season the public takes to notice
   * (`OPINION_DRIFT`). There is no honest one-week figure to quote, so this
   * quotes today's and the surface says so.
   */
  readonly approvalNow: number;
};

export type PolicyDraftResult =
  | { readonly ok: true; readonly candidate: PolicyDraftCandidate }
  | { readonly ok: false; readonly reason: string };

/**
 * What this charter calls a seat, in a sentence the player reads.
 *
 * Resolved through the charter's own title map rather than by splitting the
 * role id apart, because the ids are a cross-charter contract written in the
 * engine's neutral vocabulary and the words in them are not English anybody
 * governs in. Split, `role-treasury-minister` printed "treasury minister" on
 * every refusal the policy room could produce — under a charter whose own
 * `roleTitles` say "Secretary of the Treasury", in a game whose government is
 * American.
 */
function roleWords(role: RoleId, charter?: Charter): string {
  return roleTitle(role as string, charter?.roleTitles);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function projectedMetricsAfter(current: MetricSet, deltas: MetricDeltas): MetricSet {
  const projected = {
    treasury: Math.max(0, current.treasury + (deltas.treasury ?? 0)),
    stability: clamp01(current.stability + (deltas.stability ?? 0)),
    militaryReadiness: clamp01(current.militaryReadiness + (deltas.militaryReadiness ?? 0)),
    standing: clamp01(current.standing + (deltas.standing ?? 0)),
  };
  // Approval is carried, not projected. A program moves order, force, standing
  // and money this week; the public revises its judgment of the government over
  // the following season (`OPINION_DRIFT`). A projection that moved the poll
  // the moment the bill was drafted would be quoting the player a number no
  // week of the game will ever produce.
  return { ...projected, approval: current.approval };
}

/**
 * Normalize a policy draft before any UI previews or commits it.
 *
 * This is the authoritative contract for the six-domain policy workspace: the
 * candidate is complete, gated, priced, and projected here, so a screen never
 * needs to reproduce multipliers, treasury conversion, approval derivation, or
 * effect combination. `enactPolicyDraft()` consumes this same candidate.
 */
export function projectPolicyDraft(
  campaign: Campaign,
  draft: PolicyDraftInput,
  // Optional so every existing caller is unchanged; supplied, the refusals name
  // the seat the way this constitution names it.
  charter?: Charter,
): PolicyDraftResult {
  const allowed = new Set(legislableDomains(campaign));
  const policies = { ...selectPolicies(campaign) } as { -readonly [K in PolicyDomain]: string };
  const requested = Object.entries(draft) as [PolicyDomain, string][];

  for (const [domain, stanceId] of requested) {
    if (!POLICY_DOMAINS.includes(domain)) return { ok: false, reason: `No such policy domain exists: ${domain}.` };
    const stance = policyStance(stanceId);
    if (!stance) return { ok: false, reason: "No such program exists." };
    if (stance.domain !== domain) {
      return { ok: false, reason: `${stance.name} belongs to ${POLICY_DOMAIN_SPECS[stance.domain].name}, not ${POLICY_DOMAIN_SPECS[domain].name}.` };
    }
    const seatedChair = domainChair(campaign, domain);
    if (!allowed.has(domain) || seatedChair === undefined) {
      const spec = POLICY_DOMAIN_SPECS[domain];
      return {
        ok: false,
        reason: `Your charter seats nobody who answers for ${spec.name.toLowerCase()}. There is nobody who could put such a program into effect.`,
      };
    }
    const holder = selectChairRunner(campaign, seatedChair);
    if (!holder || !holder.alive) {
      return {
        ok: false,
        reason: `The ${roleWords(seatedChair, charter)}'s seat is empty. A program cannot be signed by a vacancy — seat someone first.`,
      };
    }
    policies[domain] = stance.id;
  }

  const gdp = playerGdp(campaign);
  const lines = legislableDomains(campaign).map((domain): PolicyDraftLine => {
    const stance = policyStance(policies[domain]) ?? inheritedStance(domain);
    const previous = selectPolicyStance(campaign, domain);
    const chair = domainChair(campaign, domain)!;
    const holder = selectChairRunner(campaign, chair);
    const quality = executionQuality(campaign, domain);
    return {
      domain,
      stance,
      previous,
      changed: stance.id !== previous.id,
      chair,
      minister: holder && holder.alive ? holder.base.name : undefined,
      quality: round3(quality),
      perTurn: movementToDeltas(stance.perTurn, gdp, quality),
      enactment: movementToDeltas(stance.enactment, gdp, 1, 1),
    };
  });
  const changes = lines.filter((line) => line.changed);
  if (requested.length > 0 && changes.length === 0) {
    return { ok: false, reason: "That program is already standing." };
  }

  const perTurn = sumDeltas(lines.map((line) => line.perTurn));
  const enactment = sumDeltas(changes.map((line) => line.enactment));
  const approvalNow = projectedMetricsAfter(campaign.player.metrics, perTurn).approval;
  return {
    ok: true,
    candidate: {
      policies: policies as PolicySet,
      changes,
      lines,
      enactment,
      perTurn,
      approvalNow,
    },
  };
}

/**
 * What one standing stance would cost, before it is adopted.
 *
 * An order projects, a rung projects, a peace table projects, a veto projects —
 * and the one act a president takes that binds every week of the rest of the
 * term did not. The policy room could price a whole draft (`projectPolicyDraft`)
 * but a screen showing a single stance beside its siblings had no way to ask
 * "what does *this* one cost", so the standing program was the only decision in
 * the game with no price on it at the point of choosing.
 *
 * Same shape family as `projectOrder`: what it costs, what it is worth, who
 * carries it, whether it can be taken at all, and one sentence saying why the
 * answer is what it is. Pure and seed-independent, and it reaches the same
 * `projectPolicyDraft` the enactment path runs, so the price shown and the
 * price charged cannot drift.
 */
/** What a drafted stance would move where the economy rests: growth, inflation and unemployment. */
export type RestingMove = { readonly growth: number; readonly inflation: number; readonly unemployment: number };

export type PolicyStanceProjection = {
  readonly domain: PolicyDomain;
  readonly stance: PolicyStance;
  readonly previous: PolicyStance;
  readonly available: boolean;
  /**
   * What the draft moves against the resting point the President is
   * actually held to, `programRestingOffset` with this domain's line
   * swapped at the chair's own `executionQuality` — never `policyRestingOffset`
   * of the draft alone, which has no chair and so no quality, and would
   * overstate a draft nobody has yet been asked to carry. Undefined on the
   * unavailable branch, where no draft was ever priced.
   */
  readonly restingMove?: RestingMove;
  /** Present only when it cannot be adopted, in the words a screen prints. */
  readonly missing?: string;
  /** Paid once, the week it is signed. */
  readonly enactment: MetricDeltas;
  /** What holding it costs, or earns, every week after that. */
  readonly perTurn: MetricDeltas;
  /** The chair answerable for it, and who is sitting in it. */
  /**
   * The chair that would sign it, where the charter seats one. Absent for a
   * domain this constitution has nobody answerable for — which is a real
   * reading rather than a missing field, and the reason the projection also
   * carries `missing`.
   */
  readonly chair?: RoleId;
  readonly minister?: string;
  /** How well that chair would carry it, 0..1-ish on the competence band. */
  readonly quality: number;
  readonly alignment: Partial<AlignmentVector>;
  /** The approval rating the program is weighed against. See `approvalNow` above. */
  readonly approvalNow: number;
  /**
   * The constituency this stance pushes against hardest, read off the
   * country's own cohorts rather than authored per stance. Undefined for a
   * stance that pushes nowhere — the inherited position, honestly, and only
   * ever that one.
   */
  readonly opposition: PolicyOpposition | undefined;
  /** What a president may actually do about this domain, in one clause. */
  readonly authority: string;
  /**
   * Weeks left before this stance, if signed today, would start doing
   * anything to the country. Zero for the inherited position, which was
   * already running on the morning of the oath, and zero for a program that
   * has already stood the wait out.
   */
  readonly standUpTurns: number;
  readonly reasoning: string;
};

export function projectPolicyStance(
  campaign: Campaign,
  charter: Charter,
  domain: PolicyDomain,
  stanceId: string,
): PolicyStanceProjection {
  const previous = selectPolicyStance(campaign, domain);
  const stance = policyStance(stanceId) ?? previous;
  const chair = domainChair(campaign, domain);
  const holder = chair ? selectChairRunner(campaign, chair) : undefined;
  const minister = holder && holder.alive ? holder.base.name : undefined;
  const drafted = projectPolicyDraft(campaign, { [domain]: stanceId }, charter);
  if (!drafted.ok) {
    return {
      domain,
      stance,
      previous,
      available: false,
      missing: drafted.reason,
      enactment: {},
      perTurn: {},
      ...(chair ? { chair } : {}),
      ...(minister ? { minister } : {}),
      quality: round3(executionQuality(campaign, domain)),
      alignment: {},
      approvalNow: campaign.player.metrics.approval,
      opposition: stanceOpposition(stance),
      authority: domainAuthority(domain),
      standUpTurns: programStandUpRemaining(campaign, domain, stance),
      reasoning: drafted.reason,
    };
  }
  const line = drafted.candidate.lines.find((entry) => entry.domain === domain)!;
  const before = programRestingOffset(campaign, campaign.founding.nation);
  const after = programRestingOffset(campaign, campaign.founding.nation, { [domain]: line.stance.id });
  const restingMove: RestingMove = {
    growth: round3(after["economy.growth"] - before["economy.growth"]),
    inflation: round3(after["economy.inflation"] - before["economy.inflation"]),
    unemployment: round3(after["economy.unemployment"] - before["economy.unemployment"]),
  };
  return {
    domain,
    stance: line.stance,
    previous,
    available: true,
    restingMove,
    enactment: line.enactment,
    perTurn: line.perTurn,
    ...(chair ? { chair } : {}),
    ...(minister ? { minister } : {}),
    quality: line.quality,
    alignment: line.stance.alignment,
    approvalNow: drafted.candidate.approvalNow,
    opposition: stanceOpposition(line.stance),
    authority: domainAuthority(domain),
    standUpTurns: programStandUpRemaining(campaign, domain, line.stance),
    // A line only reaches here on a draft that succeeded, and a draft only
    // succeeds where a chair resolved — so the seat is named rather than
    // hedged. Guarded anyway, because a sentence is a poor place to learn that
    // an invariant moved.
    reasoning: chair
      ? minister
        ? `Under ${charter.name} this program is the ${roleWords(chair, charter)}'s to carry, and ${minister} would carry it as well as ${minister} carries anything.`
        : `Under ${charter.name} this program answers to the ${roleWords(chair, charter)}, and that seat is empty.`
      : `Under ${charter.name} nobody is answerable for this program.`,
  };
}

/**
 * The domains whose substance is revenue, and the statute each of them takes.
 *
 * A president does not set the tax and entitlement program by picking a
 * position. Revenue bills originate in the House, the President proposes rather
 * than enacts, and tax law is permanent statute — three separate constitutional
 * facts the direct path collapsed into one dial. The engine already knew
 * better in the same directory: `act-tax-relief-and-growth` is a bill that has
 * to pass.
 *
 * Only `fiscal` is here. The audit named trade as the other revenue family and
 * the catalogue has no trade bill for it to take: tariff schedules are the one
 * revenue power Congress has genuinely delegated to the President, which is why
 * `imposeTariff` carries the statutory `authority` it is taken under. Gating
 * the trade brief on a bill nobody wrote would have been a dead branch, not a
 * check.
 *
 * A domain routes to one bill, or to a pair split by the direction the
 * stance itself pushes. Fiscal is the pair: a rate cut and a closed loophole
 * are different bills wanting different Congresses, and a single fiscal
 * statute made every left-leaning position wait on a bill whose own `arises`
 * predicate is a right-leaning bill's condition — reachable only out of a
 * slump, which a redistribution program is not written to answer.
 */
const REVENUE_STATUTES: Partial<Record<PolicyDomain, string | { readonly left: string; readonly right: string }>> = {
  fiscal: { left: "act-tax-fairness-and-revenue", right: "act-tax-relief-and-growth" },
};

export type RevenueStatute = { readonly actId: string; readonly title: string };

/**
 * Which of a domain's routed bills a given stance takes, by the sign of its
 * own alignment pull. Omitting `stanceId` reads the same as it always has —
 * the right-leaning bill — which is the one existing callers that have not
 * yet been updated to name a stance keep getting; only a caller passing the
 * stance it is actually proposing sees the left-leaning one.
 */
function revenueStatuteActId(
  route: string | { readonly left: string; readonly right: string },
  stanceId: string | undefined,
): string {
  if (typeof route === "string") return route;
  const leaning = (stanceId ? policyStance(stanceId) : undefined)?.alignment.economicLeftRight ?? 0;
  return leaning < 0 ? route.left : route.right;
}

/**
 * The bill this domain's program needs before the stance may change, or
 * `undefined` where the domain is executive or the statute is already law.
 *
 * `stanceId` names the position actually being proposed, where the caller has
 * one — see `revenueStatuteActId`.
 */
export function revenueStatuteRequired(
  campaign: Campaign,
  domain: PolicyDomain,
  stanceId?: string,
): RevenueStatute | undefined {
  const route = REVENUE_STATUTES[domain];
  if (!route) return undefined;
  const actId = revenueStatuteActId(route, stanceId);
  // Checking only whether `actId` was ever enacted let a stance the President
  // had left and come back to skip its own law forever, off a law that
  // authorized an earlier take the country has since changed. Each swap
  // inside the domain's family of routed bills is its own change to the
  // take, so what clears this stance is that nothing else routed to the
  // family has a *later* `resolvedTurn` than its own law's. A law with no
  // resolved turn (founding-era authority, never carried through the normal
  // legislative resolution) never counts as later than anything — it is the
  // absence of a signal, not an early one — which is what keeps two such
  // laws, present together from the country's founding, from arbitrarily
  // "superseding" each other by whatever order a selector happened to hand
  // them back in.
  const family = typeof route === "string" ? [route] : [route.left, route.right];
  const familyLaws = selectLaws(campaign).filter((bill) => family.includes(bill.act));
  const mine = familyLaws.find((bill) => bill.act === actId);
  const supersededBy = mine && familyLaws.some((bill) => bill.act !== actId && (bill.resolvedTurn ?? -Infinity) > (mine.resolvedTurn ?? -Infinity));
  if (mine && !supersededBy) return undefined;
  const act = LEGISLATIVE_ACTS.find((entry) => entry.id === actId);
  return act ? { actId, title: act.title } : undefined;
}

export function enactPolicyDraft(campaign: Campaign, candidate: PolicyDraftCandidate): PolicyResult {
  if (candidate.changes.length === 0) return { ok: false, reason: "That program is already standing." };
  for (const line of candidate.changes) {
    const statute = revenueStatuteRequired(campaign, line.domain, line.stance.id);
    if (statute) {
      return {
        ok: false,
        reason: `${POLICY_DOMAIN_SPECS[line.domain].name} policy is written in statute. ${statute.title} has to pass before the program changes; transmit it to the Hill and take the count.`,
      };
    }
  }

  // The enactment lump is an obligation like any other, asked of the same
  // guard an order or a locale act asks: a program the authority cannot cover
  // is refused with the shortfall named, not booked against a floor. A program
  // that obligates nothing is a change of posture, and a lapse does not stop
  // the President from changing their mind.
  const spend = Math.abs(candidate.enactment.treasury ?? 0);
  if (spend > 0) {
    const room = obligationAvailability(campaign, spend);
    if (!room.ok) {
      return { ok: false, reason: `This program obligates money the administration does not have: it needs ${room.missing}.` };
    }
  }

  const effects: Effect[] = candidate.changes.map((line) => ({
    kind: "policy",
    domain: line.domain,
    stance: line.stance.id,
  }));
  if (Object.keys(candidate.enactment).length > 0) effects.push({ kind: "metric", deltas: candidate.enactment });

  const alignment = sumAlignment(candidate.changes.map((line) => line.stance.alignment));
  if (Object.keys(alignment).length > 0) effects.push({ kind: "alignment", pull: alignment });

  effects.push({
    kind: "feed",
    items: candidate.changes.map((line) => ({
      turn: campaign.turn,
      kind: "press" as const,
      visibility: "public" as const,
      headline: `The government adopts ${line.stance.name.toLowerCase()} as its ${POLICY_DOMAIN_SPECS[line.domain].name.toLowerCase()} program, replacing ${line.previous.name.toLowerCase()}.`,
      // The program is an instrument, not a person: the article bank reads it
      // as the thing adopted, and the stake as what changed.
      facts: {
        instrument: line.stance.name,
        stake: `${POLICY_DOMAIN_SPECS[line.domain].name.toLowerCase()} policy moving from ${line.previous.name.toLowerCase()} to ${line.stance.name.toLowerCase()}`,
      },
    })),
  });

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: {
        summary: policyDraftSummary(candidate.changes),
      },
      effects,
    },
  };
}

function sumAlignment(entries: readonly Partial<AlignmentVector>[]): Partial<AlignmentVector> {
  const total: { -readonly [K in keyof AlignmentVector]?: number } = {};
  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry) as [keyof AlignmentVector, number][]) {
      total[key] = round3((total[key] ?? 0) + value);
    }
  }
  return total;
}

function policyDraftSummary(changes: readonly PolicyDraftLine[]): string {
  if (changes.length === 1) {
    const line = changes[0]!;
    return `${POLICY_DOMAIN_SPECS[line.domain].name} policy moves from ${line.previous.name.toLowerCase()} to ${line.stance.name.toLowerCase()}.`;
  }
  const domains = changes.map((line) => POLICY_DOMAIN_SPECS[line.domain].name.toLowerCase());
  return `The program changes ${changes.length} domains: ${sentenceList(domains)}.`;
}

/**
 * Adopt a stance. The change is the decision; the stance then works every turn
 * until it is changed again.
 *
 * Enactment costs are paid once, now, and are deliberately not scaled by
 * competence — the price of putting a program in place is paid by the
 * government, not by the ministry.
 */
export function enactPolicy(campaign: Campaign, stanceId: string): PolicyResult {
  const stance = policyStance(stanceId);
  if (!stance) return { ok: false, reason: "No such program exists." };

  const projected = projectPolicyDraft(campaign, { [stance.domain]: stance.id });
  return projected.ok ? enactPolicyDraft(campaign, projected.candidate) : projected;
}

