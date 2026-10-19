import { type Campaign } from "@admin/engine";
import { type PersonId } from "@admin/world";
export type RelationshipScope = {
    readonly id: string;
    readonly label: string;
    readonly people: readonly PersonId[];
    readonly evidence: string;
};
/** Public institutional membership is grouping evidence, never private trust or access. */
export declare function relationshipScopes(campaign: Campaign): readonly RelationshipScope[];
