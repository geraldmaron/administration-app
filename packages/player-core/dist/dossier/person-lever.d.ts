import { type Campaign, type ConfirmationProjection, type EffectPacket, type InstitutionId, type MetricCost, type NominationId, type RemovalConstraint, type RiskBranch } from "@admin/engine";
import type { PersonId, RoleId } from "@admin/world";
/**
 * The one act a person's file carries, and what it costs, read before the
 * President confirms it. The price is the engine's own projection of the act,
 * the same arithmetic the commit spends, so the dialog can never quote a
 * number the act does not charge.
 */
export type LeverSeat = {
    readonly kind: "cabinet";
    readonly role: RoleId;
    readonly title: string;
} | {
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
{
    readonly kind: "none";
    readonly rule: string;
}
/** The law refuses the act, and says so in its own words. */
 | {
    readonly kind: "refused";
    readonly rule: string;
    readonly refusal: string;
} | ({
    readonly kind: "available";
    /** The office's own removal rule, stated before the control. */
    readonly rule: string;
    /** A cabinet officer leaves quietly or as a rival faction; the engine's rule decides which. */
    readonly departure?: "quiet" | "faction";
} & LeverTerms);
/** Every metric move a packet carries, summed the way apply() sums them, so the price shown is the price charged. */
export declare function packetCost(packet: EffectPacket): MetricCost;
/** What emptying this person's chair would cost, from the engine's own projection of the act. */
export declare function personLever(campaign: Campaign, seat: LeverSeat | undefined): PersonLever;
export type AppointmentLever = {
    readonly kind: "refused";
    readonly refusal: string;
} | ({
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
export declare function appointmentLever(campaign: Campaign, role: RoleId, person: PersonId): AppointmentLever;
/** What pulling a name back from the Senate costs, off the packet the withdrawal would commit. */
export declare function withdrawalLever(campaign: Campaign, nomination: NominationId): LeverTerms | undefined;
