import { type Campaign, type EngagementKind, type MetricSet, type TreatyKind } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type EngagementOption, type TreatyOption } from "../world/engagement";
import { treatyReading } from "./preview";
export type RelationshipReading = "trust" | "tension" | "alignment";
/** One reading of the relationship moving, in words: which, which way and how far. */
export type RelationshipStep = {
    readonly reading: RelationshipReading;
    readonly direction: "up" | "down";
    readonly size: string;
};
export type EngagementPlan = {
    readonly option: EngagementOption;
    /** What a yes does to the relationship, both ways. A no changes nothing but the record of it. */
    readonly steps: readonly RelationshipStep[];
};
export declare function engagementPlan(campaign: Campaign, nation: NationId, kind: EngagementKind): EngagementPlan | undefined;
export type TreatyPlan = {
    readonly binds: "ratification" | "signature";
    readonly summary: string;
    /** Their side's reasons, where the services can read that government. */
    readonly counterpart?: TreatyOption;
    /** What the signature itself does to the President's readings. */
    readonly onSigning: Partial<Record<keyof MetricSet, number>>;
    /** Whether going around the Senate sours Congress on the President. */
    readonly congressCools: boolean;
    /** What the treaty does to the relationship once it is in force: on signature, or on ratification. */
    readonly inForce: readonly RelationshipStep[];
    readonly senate?: ReturnType<typeof treatyReading>["senate"];
};
export declare function treatyPlan(campaign: Campaign, nation: NationId, kind: TreatyKind): TreatyPlan | undefined;
