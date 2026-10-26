import type { Charter } from "@admin/world";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { ExecutiveOrder } from "./orders.js";
import { type CampaignSeed } from "./rng.js";
import type { CourtHolding, CourtMatter, CourtProceeding, CourtStage } from "./state-judiciary.js";
export declare function openedProceeding(recordId: string, orderId: string, filedTurn: number, dueTurn: number, matter?: CourtMatter): CourtProceeding;
export declare function courtStep(proceeding: CourtProceeding, stage: CourtStage, turn: number, account: string, extra?: Partial<CourtProceeding>, waitUntil?: number): CourtProceeding;
export type CourtBand = {
    readonly min: number;
    readonly max: number;
    readonly source: string;
};
export declare const COURT_TIMING_DAYS: {
    readonly interim: {
        readonly min: 2;
        readonly max: 21;
        readonly source: "Fed. R. Civ. P. 65(b)(2): a temporary restraining order lasts at most 14 days, extendable once for good cause; 65(a): a preliminary injunction on notice. Design band.";
    };
    readonly lowerMerits: {
        readonly min: 60;
        readonly max: 270;
        readonly source: "U.S. Courts, Federal Court Management Statistics, 12 months to 2026-06-30: median civil filing to disposition 6.9 months; challenges with interim relief are often expedited. Design band around it.";
    };
    readonly circuitMerits: {
        readonly min: 90;
        readonly max: 365;
        readonly source: "Federal Court Management Statistics, appellate profile to 2026-06-30: median notice of appeal to disposition 10.1 months, 5.8 to 15.9 by circuit; expedited appeals run shorter.";
    };
    readonly certDisposition: {
        readonly min: 28;
        readonly max: 240;
        readonly source: "Sup. Ct. R. 13.1 (90 days to petition, a deadline), 13.5 (up to 60 more), 15.3 (30 days to respond), 15.5 (distribution at least 14 days after the response, unless waived). No official median found.";
    };
};
/** Weeks a step takes for this proceeding, drawn once inside its band. */
export declare function courtWeeks(seed: CampaignSeed, proceedingId: string, step: keyof typeof COURT_TIMING_DAYS): number;
export declare function thresholdPasses(charter: Charter, order: ExecutiveOrder, ground: ConstitutionalGround, draw: number): boolean;
export declare function lowerMerits(charter: Charter, order: ExecutiveOrder, ground: ConstitutionalGround, draw: number): CourtHolding;
export declare function appealGrantChance(ground: ConstitutionalGround, lower: CourtHolding, adjustment?: number): number;
export declare function appealGranted(ground: ConstitutionalGround, lower: CourtHolding, draw: number, adjustment?: number): boolean;
