import { type Campaign, type InstitutionDef } from "@admin/engine";
import { type LoadNode } from "../institution/office-load.js";
export type OrganogramRelation = "parent" | "peer" | "component";
export type OrganogramEntry = {
    readonly key: string;
    readonly label: string;
    readonly href: string;
    readonly relation: OrganogramRelation;
    readonly title: string;
    readonly load?: LoadNode;
};
export type OrganogramSection = {
    readonly key: OrganogramRelation;
    readonly title: string;
    readonly entries: readonly OrganogramEntry[];
};
/**
 * The bodies already named around this one: the parent it answers to, the peer
 * bodies that share that parent, and the components that answer here.
 */
export declare function officeOrganogram(campaign: Campaign, institution: InstitutionDef): readonly OrganogramSection[];
