import type { CityId, SettlementId, NationId, PersonId, StateId } from "@admin/world";
/** Identity and provenance only. A named facility acquires no simulated capacity here. */
export type StorySubject = {
    readonly key: string;
    readonly id: string;
    readonly kind: "person" | "institution" | "facility" | "organization" | "place";
    readonly name: string;
    readonly description: string;
    readonly nation: NationId;
    readonly state?: StateId;
    readonly city?: CityId;
    readonly settlement?: SettlementId;
    readonly person?: PersonId;
    readonly institution?: string;
    readonly originCase: string;
    readonly originScenario: string;
    readonly originTurn: number;
};
export type StoryBinding = {
    readonly scenario: string;
    readonly family?: string;
    readonly subjects: readonly StorySubject[];
    readonly place?: {
        readonly state: StateId;
        readonly city?: CityId;
        readonly settlement?: SettlementId;
    };
};
