import { type Campaign, type InstitutionDef, type InstitutionId, type OfficeDef } from "@admin/engine";
import { type PersonId, type RoleId } from "@admin/world";
import { type AttributeJudgment } from "./machine-readings.js";
export type Staffing = "confirmed" | "acting" | "vacant";
export type ExecutiveAlertKind = "proposal" | "resignation" | "inquiry";
export type ExecutiveAlert = {
    readonly kind: ExecutiveAlertKind;
    readonly text: string;
};
export type ExecutiveNode = {
    readonly institution: InstitutionId;
    /** The chair's office id, the route's `:id`. */
    readonly office: string;
    readonly name: string;
    readonly abbr: string;
    /** The chair's own title: "Secretary of the Treasury". */
    readonly title: string;
    readonly href: string;
    readonly emblem: string;
    readonly staffing: Staffing;
    readonly holder?: PersonId;
    readonly holderName?: string;
    readonly competence?: AttributeJudgment;
    readonly loyalty?: AttributeJudgment;
    readonly alerts: readonly ExecutiveAlert[];
    /** The sourced headquarters, where the dataset records one. */
    readonly site?: {
        readonly name: string;
        readonly lat: number;
        readonly lon: number;
    };
    readonly children: readonly ExecutiveNode[];
};
export type ExecutiveSectionKey = "white-house" | "executive-office" | "departments" | "intelligence" | "independent";
export type ExecutiveSection = {
    readonly key: ExecutiveSectionKey;
    readonly title: string;
    readonly lead: string;
    readonly nodes: readonly ExecutiveNode[];
};
/** The two White House staff chairs the catalog seats as offices of the Executive Office of the President. */
export declare const WHITE_HOUSE_OFFICE_ROLE: Readonly<Record<string, RoleId>>;
type Holding = {
    readonly staffing: Staffing;
    readonly holder?: PersonId;
};
/** Who sits in a chair and how, read from the record that owns that chair. */
export declare function officeHolding(campaign: Campaign, def: InstitutionDef, office: OfficeDef): Holding;
/** What is waiting on the President from this chair: its Secretary's requests and offers, and open inquiries into the body. */
export declare function officeAlerts(campaign: Campaign, def: InstitutionDef): readonly ExecutiveAlert[];
/** The executive branch in five sections, the departments in order of precedence with their agencies beneath. */
export declare function executiveTree(campaign: Campaign): readonly ExecutiveSection[];
/** Whether a chair needs the President: anything waiting from it, or nobody confirmed in it. */
export declare function nodeNeedsAttention(node: ExecutiveNode): boolean;
/** The tree cut to the chairs that need the President, keeping a parent wherever one of its agencies does. */
export declare function attentionTree(sections: readonly ExecutiveSection[]): readonly ExecutiveSection[];
/** Every chair in the tree with a sourced headquarters, flattened: the map's office pins. */
export declare function executivePins(campaign: Campaign): readonly ExecutiveNode[];
export {};
