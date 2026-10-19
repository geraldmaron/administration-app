import { type Campaign, type CourtProceeding } from "@admin/engine";
import { type PersonId } from "@admin/world";
export type CircuitOverview = {
    readonly name: string;
    readonly states: readonly string[];
    readonly republican: number;
    readonly democratic: number;
    readonly vacant: number;
    readonly judges: readonly {
        readonly name: string;
        readonly lean: number;
    }[];
    readonly cases: readonly {
        readonly title: string;
        readonly href: string;
        readonly forum: string;
        readonly state?: string;
    }[];
};
export type CircuitCase = CircuitOverview["cases"][number];
export type CourtPipeline = Readonly<Record<"filed" | "injunction" | "circuit" | "emergency" | "review" | "decision", number>>;
export type SupremeAgreement = {
    readonly justices: readonly {
        readonly id: PersonId;
        readonly name: string;
        readonly lean?: number;
        readonly age?: number;
        readonly tenure?: number;
    }[];
    readonly pairs: readonly {
        readonly first: string;
        readonly second: string;
        readonly together: number;
        readonly shared: number;
    }[];
};
/** The one step a live proceeding counts at; the pipeline and the court-system view both read it. */
export declare function currentStage(row: CourtProceeding): keyof CourtPipeline;
export declare function courtOverview(campaign: Campaign): {
    circuits: readonly CircuitOverview[];
    unassignedCases: readonly {
        readonly title: string;
        readonly href: string;
        readonly forum: string;
        readonly state?: string;
    }[];
    pipeline: Readonly<Record<"emergency" | "review" | "filed" | "decision" | "circuit" | "injunction", number>>;
    agreement: SupremeAgreement;
};
