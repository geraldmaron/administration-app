import { type Campaign, type ChamberVote, type EffectPacket, type FitBand, type InstitutionId, type MetricCost, type OfficeId, type PipelineReading, type SeatKind } from "@admin/engine";
import { type AttributeJudgment } from "../government/machine-readings";
export type SeatGroup = "cabinet" | "agencies" | "courts";
export type DeskCandidate = {
    readonly personId: string;
    readonly name: string;
    /** The heaviest two reasons as one line, and every reason in full. */
    readonly why: string;
    readonly reasons: readonly string[];
    /** Fit with the President, banded against the others offered for this seat. */
    readonly fit: FitBand;
    readonly crossesAisle: boolean;
    /** Banded readings, never figures: competence and loyalty, or competence and integrity for a judge. */
    readonly readings: readonly AttributeJudgment[];
    /** The Senate's count today: a staff projection, not a recorded vote. */
    readonly vote: ChamberVote;
    readonly consensus: boolean;
    /** What vetting will raise, which also slows the nomination. */
    readonly vetting: readonly string[];
    readonly objections: readonly string[];
    /** What sending the name up charges now, off the packet the nomination commits. */
    readonly cost: MetricCost;
    readonly unavailable?: string;
};
export type DeskSeat = {
    readonly office: OfficeId;
    readonly institution: InstitutionId;
    readonly title: string;
    readonly body: string;
    readonly group: SeatGroup;
    readonly kind: SeatKind;
    readonly days: number;
    readonly acting?: string;
    readonly committee?: string;
    readonly candidates: readonly DeskCandidate[];
    /** Everyone the seat's rules let the President send, of whom `candidates` are the best fit. */
    readonly eligible: number;
    /** The recommended name; absent for a Supreme Court seat, which the President always picks. */
    readonly recommended?: string;
};
export type AppointmentDesk = {
    readonly seats: readonly DeskSeat[];
    readonly pipeline: PipelineReading;
};
/** How many names a seat sets out: enough to choose between, each counted against today's Senate. */
export declare const DESK_CANDIDATES = 8;
/** Every open Senate-confirmed seat, cabinet then agencies then courts, longest open first in each; `only` narrows it to some. */
export declare function appointmentDesk(campaign: Campaign, only?: (seat: {
    readonly office: OfficeId;
    readonly group: SeatGroup;
}) => boolean): AppointmentDesk;
/** The President's choice for each seat they are filling, in desk order. */
export type DeskPick = {
    readonly office: OfficeId;
    readonly person: string;
};
/**
 * The names a desk sends: the President's choice where they made one (none
 * leaves the seat open), otherwise the best fit nobody else on the desk is
 * picked for. A choice comes first, so picking for one seat the name another
 * seat was defaulting to moves that seat's default to its next name rather
 * than sending one person up twice. A Supreme Court seat is never filled by
 * default.
 */
export declare function deskPicks(desk: AppointmentDesk, chosen?: Readonly<Record<string, string | null>>): readonly DeskPick[];
/** Each seat's recommended name, as the picks a desk opens with. */
export declare function deskDefaults(desk: AppointmentDesk): readonly DeskPick[];
export type DeskPlan = {
    readonly packets: readonly EffectPacket[];
    /** Who goes up for what, in the order the packets apply. */
    readonly lines: readonly {
        readonly office: OfficeId;
        readonly title: string;
        readonly name: string;
    }[];
    /** Picks the plan could not send, each with the engine's own reason. */
    readonly refused: readonly {
        readonly office: OfficeId;
        readonly title: string;
        readonly name: string;
        readonly reason: string;
    }[];
    /** What the batch charges now, summed over its packets the way apply() sums them. */
    readonly cost: MetricCost;
};
/**
 * The nominations the picks send, one packet per seat, each built on the state
 * the ones before it leave: the engine's own batch, so a person picked for two
 * seats goes up for the first and is refused for the second, and the refusal
 * says why.
 */
export declare function deskPlan(campaign: Campaign, picks: readonly DeskPick[]): DeskPlan;
