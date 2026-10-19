import {
  confirmationVote,
  institutionForRole,
  openNomination,
  projectDismissal,
  removeOfficer,
  withdrawNomination,
  type Campaign,
  type ConfirmationProjection,
  type EffectPacket,
  type InstitutionId,
  type DeltaMetricKey,
  type MetricCost,
  type NominationId,
  type RemovalConstraint,
  type RiskBranch,
} from "@admin/engine";
import type { PersonId, RoleId } from "@admin/world";

/**
 * The one act a person's file carries, and what it costs, read before the
 * President confirms it. The price is the engine's own projection of the act,
 * the same arithmetic the commit spends, so the dialog can never quote a
 * number the act does not charge.
 */
export type LeverSeat =
  | { readonly kind: "cabinet"; readonly role: RoleId; readonly title: string }
  | {
      readonly kind: "officer";
      readonly institution: InstitutionId;
      readonly title: string;
      readonly body: string;
      readonly removal: RemovalConstraint;
    };

/** The price of an act in the shape the terms row draws: what it moves now, and what follows. */
export type LeverTerms = {
  readonly cost: MetricCost;
  readonly risks: readonly RiskBranch[];
};

export type PersonLever =
  /** No chair, or a chair this office has no removal rule for. */
  | { readonly kind: "none"; readonly rule: string }
  /** The law refuses the act, and says so in its own words. */
  | { readonly kind: "refused"; readonly rule: string; readonly refusal: string }
  | ({
      readonly kind: "available";
      /** The office's own removal rule, stated before the control. */
      readonly rule: string;
      /** A cabinet officer leaves quietly or as a rival faction; the engine's rule decides which. */
      readonly departure?: "quiet" | "faction";
    } & LeverTerms);

const OFFICER_RULE: Readonly<Record<RemovalConstraint, string>> = {
  "at-will": "You can remove them whenever you want. You don't need a reason.",
  "for-cause": "You can remove them only for a specific, stated reason.",
  "term-protected": "They serve a fixed term. You can't end it early.",
};

const CABINET_RULE = "You can fire them at any time, for any reason. Their seat stays empty until the Senate confirms someone new.";

/** Every metric move a packet carries, summed the way apply() sums them, so the price shown is the price charged. */
export function packetCost(packet: EffectPacket): MetricCost {
  return packet.effects.reduce<MetricCost>((total, effect) => {
    if (effect.kind !== "metric") return total;
    const next: MetricCost = { ...total };
    for (const [key, delta] of Object.entries(effect.deltas) as [DeltaMetricKey, number | undefined][]) next[key] = (next[key] ?? 0) + (delta ?? 0);
    return next;
  }, {});
}

/**
 * An officer below the cabinet, priced off the packet `removeOfficer` would
 * commit. The stated cause decides whether a for-cause removal is allowed at
 * all, never what it costs, so the price is read with one supplied; the
 * control that commits asks the President for the real one.
 */
function officerLever(campaign: Campaign, seat: Extract<LeverSeat, { kind: "officer" }>): PersonLever {
  const rule = OFFICER_RULE[seat.removal];
  const result = removeOfficer(campaign, seat.institution, seat.removal === "for-cause" ? "stated" : undefined);
  if (!result.ok) return { kind: "refused", rule, refusal: result.reason };
  const politicizes = result.packet.effects.some((effect) => effect.kind === "institution" && effect.changes?.politicization !== undefined);
  return {
    kind: "available",
    rule,
    cost: packetCost(result.packet),
    risks: politicizes
      ? [{ id: "removal-politicized", chance: 1, description: `${seat.body} gets a reputation for bending to your politics.` }]
      : [],
  };
}

/** What emptying this person's chair would cost, from the engine's own projection of the act. */
export function personLever(campaign: Campaign, seat: LeverSeat | undefined): PersonLever {
  if (!seat) return { kind: "none", rule: "They don't hold a job you can remove them from." };
  if (seat.kind === "officer") return officerLever(campaign, seat);
  const projection = projectDismissal(campaign, seat.role);
  if (!projection.ok) return { kind: "refused", rule: CABINET_RULE, refusal: projection.reason };
  return {
    kind: "available",
    rule: CABINET_RULE,
    cost: projection.cost,
    risks: projection.risks,
    departure: projection.resentful ? "faction" : "quiet",
  };
}

export type AppointmentLever =
  | { readonly kind: "refused"; readonly refusal: string }
  | ({
      readonly kind: "available";
      /** Whether the Senate's count today clears the majority: a staff projection, not the vote. */
      readonly confirms: boolean;
      readonly vote: ConfirmationProjection["vote"];
    } & LeverTerms);

/**
 * What sending this person up for a cabinet seat would cost, off the packet
 * the nomination commits, and where the Senate's count stands today. The same
 * nomination the appointments desk sends: there is no same-day appointment.
 */
export function appointmentLever(campaign: Campaign, role: RoleId, person: PersonId): AppointmentLever {
  const office = institutionForRole(role)?.offices[0]?.id;
  const opened = office ? openNomination(campaign, office, person) : undefined;
  if (!opened) return { kind: "refused", refusal: "You can't nominate anyone to that seat." };
  if (!opened.ok) return { kind: "refused", refusal: opened.reason };
  const vote = confirmationVote(campaign, person);
  return { kind: "available", confirms: vote.passed, vote, cost: packetCost(opened.packet), risks: [] };
}

/** What pulling a name back from the Senate costs, off the packet the withdrawal would commit. */
export function withdrawalLever(campaign: Campaign, nomination: NominationId): LeverTerms | undefined {
  const result = withdrawNomination(campaign, nomination);
  return result.ok ? { cost: packetCost(result.packet), risks: [] } : undefined;
}
