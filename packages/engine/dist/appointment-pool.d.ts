import { type CareerArchetype, type Person, type StudyField } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import { type OfficeId } from "./institutions.js";
import { type SeatKind } from "./appointment-eligibility.js";
/** How long a life seat's nominee could serve, read from age. A derived band, never a figure. */
export type TenureBand = "decades" | "a-decade-or-two" | "under-a-decade";
/** Why a candidate is where they are on the list, heaviest reason first. */
export type PoolReason = {
    readonly kind: "career";
    readonly years: number;
    readonly careers: readonly CareerArchetype[];
} | {
    readonly kind: "study";
    readonly field: StudyField;
    readonly postgraduate: boolean;
} | {
    readonly kind: "agency-bench";
} | {
    readonly kind: "serving";
    readonly commandYears: number;
} | {
    readonly kind: "veteran";
    readonly yearsOut: number;
} | {
    readonly kind: "home-circuit";
    readonly circuit: string;
} | {
    readonly kind: "tenure";
    readonly band: TenureBand;
} | {
    readonly kind: "party";
    readonly side: "own" | "other";
};
export type PoolCandidate = {
    readonly person: PersonRuntime;
    /** The rank key, 0..1. Internal: a screen shows the reasons and banded readings, never this. */
    readonly score: number;
    readonly reasons: readonly PoolReason[];
};
/** The fewest credible names a seat should offer before a bench is generated for it. */
export declare const POOL_MINIMUM: Readonly<Record<SeatKind, number>>;
export declare function tenureBand(age: number): TenureBand;
/** Whether a person is from the seat's circuit, read off their birthplace; residence is not modeled. */
export declare function fromCircuit(person: Pick<Person, "birthplace">, circuit: string): boolean;
/**
 * Every name the President could send up for this office, best fit first, with
 * the reasons each was ranked on. Empty for an office the Senate does not
 * confirm, or one that does not exist.
 */
export declare function appointmentPool(campaign: Campaign, office: OfficeId): readonly PoolCandidate[];
