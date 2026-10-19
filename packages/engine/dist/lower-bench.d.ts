import { type StateId } from "@admin/world";
import type { Effect } from "./effects.js";
import type { Campaign, PersonRuntime } from "./state.js";
import type { InstitutionDef, InstitutionId, InstitutionRuntime, OfficeId } from "./institutions.js";
import { DISTRICT_SEAT_SOURCE } from "./lower-bench-source.js";
import { type CampaignSeed } from "./rng.js";
import type { ExecutiveOrder } from "./orders.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
export declare const DISTRICT_FORUMS: import("./lower-bench-source.js").DistrictSeatSourceRow[];
export declare const SHARED_DISTRICT_SEATS: import("./lower-bench-source.js").DistrictSeatSourceRow[];
type DistrictRow = (typeof DISTRICT_SEAT_SOURCE)[number];
export type DistrictForum = {
    readonly id: string;
    readonly court: string;
    readonly circuit: string;
    readonly state: string;
    readonly sourceRows: readonly DistrictRow[];
    readonly authorized: number;
    readonly activeRepublican: number;
    readonly activeDemocratic: number;
    readonly vacancies: number;
};
/** A shared judgeship appears in each eligible forum, while the source row is nationally counted once. */
export declare const DISTRICT_FORUM_READINGS: readonly DistrictForum[];
/** State-specific filings stay in that state; federal-wide acts start in D.C. */
export declare function districtForumFor(state: StateId | undefined, caseId: string, seed: CampaignSeed): DistrictForum;
/** Appointer mix is a small modeled uncertainty around the legal merits, never the merits itself. */
export declare function districtStrikeChance(legalChance: number, forum: DistrictForum, order: ExecutiveOrder): number;
export type CircuitSeat = {
    readonly id: InstitutionId;
    readonly office: OfficeId;
    readonly circuit: string;
    readonly ordinal: number;
};
export declare const CIRCUIT_SEATS: readonly CircuitSeat[];
/** Office definitions exist for the existing Senate pipeline, outside the agency catalog. */
export declare const CIRCUIT_SEAT_DEFS: readonly InstitutionDef[];
export declare const CIRCUIT_SEAT_IDS: Set<string>;
export declare function isCircuitSeat(id: string): boolean;
/** The same case and campaign always draw the same three occupied seats. */
export declare function eligibleCircuitSeat(campaign: Campaign, seat: CircuitSeat, challenged?: ExecutiveOrderRecord): boolean;
export declare function circuitPanelRecusals(campaign: Campaign, circuit: string, challenged?: ExecutiveOrderRecord): {
    seatId: string;
    judge: string & import("zod").$brand<"PersonId">;
    turn: number;
    reason: "prior-government-advice";
}[];
export declare function circuitPanelFor(campaign: Campaign, circuit: string, caseId: string, challenged?: ExecutiveOrderRecord, excluded?: ReadonlySet<string>): readonly CircuitSeat[];
/** One authoritative occupied/vacant record per light seat; no current judge is identified. */
export declare function foundingCircuitSeats(seed: CampaignSeed, foundingYear: number): Readonly<Record<InstitutionId, InstitutionRuntime>>;
export type MaterializedSeat = {
    readonly seat: CircuitSeat;
    readonly person: PersonRuntime;
    readonly effects: readonly Effect[];
};
/** A panel event, never a selector, gives an anonymous source seat a fictional identity. */
export declare function materializeCircuitSeat(campaign: Campaign, seat: CircuitSeat, drawn?: readonly PersonRuntime[]): MaterializedSeat | undefined;
export {};
