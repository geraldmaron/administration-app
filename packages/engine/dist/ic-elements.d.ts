import type { InstitutionId } from "./institutions.js";
export type IcElementId = "IC-ODNI" | "IC-CIA" | "IC-NSA" | "IC-DIA" | "IC-NGA" | "IC-NRO" | "IC-AF" | "IC-SPACE" | "IC-ARMY" | "IC-USMC" | "IC-NAVY" | "IC-FBI" | "IC-DEA" | "IC-DHS" | "IC-USCG" | "IC-INR" | "IC-TREASURY" | "IC-DOE";
export type Discipline = "humint" | "sigint" | "geoint" | "masint" | "osint" | "finint" | "all-source";
/**
 * What the element may collect, which is the first question any tasking runs
 * into. `overt-only` is not a weakness, it is the statutory position of most of
 * this list: they analyze what is collected elsewhere and what is already
 * public, and pointing one of them at a clandestine question does not produce
 * a clandestine answer.
 */
export type CollectionAuthority = "clandestine" | "technical" | "overt-only";
/** What the element may lawfully do inside the United States. */
export type DomesticAuthority = "none" | "counterintelligence-under-ag" | "law-enforcement" | "homeland-analysis";
export type IcElementDef = {
    readonly id: IcElementId;
    readonly name: string;
    readonly abbr: string;
    /** "Independent" for the two that answer to nobody's secretary. */
    readonly parent: string;
    /** The catalog body this element is, where the catalog carries one. */
    readonly institution?: InstitutionId;
    readonly disciplines: readonly Discipline[];
    readonly collection: CollectionAuthority;
    readonly domestic: DomesticAuthority;
    /** Only one element may run covert action absent a presidential determination that another is better placed. */
    readonly covertAction: boolean;
    /** Relative weight in an all-source judgment. Not headcount: how much the finished product leans on it. */
    readonly analyticWeight: number;
    /** Stated plainly, because the player reads these when a request is refused. */
    readonly boundary: string;
};
export declare const IC_ELEMENTS: readonly IcElementDef[];
export declare function icElement(id: IcElementId): IcElementDef | undefined;
