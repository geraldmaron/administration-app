import type { PersonId, StateId } from "@admin/world";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { PolicyStatPath } from "./policy-stats.js";
export type CourtVote = {
    readonly justice: PersonId;
    readonly seat: number;
    readonly vote: "strike" | "uphold";
};
export type CourtHolding = "upheld" | "struck-down";
export type CourtStage = "threshold" | "interim" | "lower-merits" | "circuit-merits" | "appeal" | "supreme-merits" | "remand" | "final";
export type CourtMoment = {
    readonly turn: number;
    readonly stage: CourtStage;
    readonly account: string;
};
export type SolicitorGeneralEvent = {
    readonly proceedingId: string;
    readonly turn: number;
    readonly kind: "stay-requested" | "stay-granted" | "stay-denied" | "review-granted" | "review-denied" | "overreach" | "merits-rejected" | "restraint";
    readonly change: number;
    readonly account: string;
};
export type SolicitorGeneralRecord = {
    readonly standing: number;
    readonly events: readonly SolicitorGeneralEvent[];
};
export type SupremeCalendar = {
    readonly termYear: number;
    readonly argumentTurn: number;
    readonly opinionTurn: number;
    /** Usual late-June opinion target, not a legal deadline; a no-quorum case can carry into another term. */
    readonly opinionTargetTurn: number;
    readonly status: "scheduled" | "argued" | "carried";
};
export type CourtSubject = {
    readonly kind: "executive-order";
    readonly recordId: string;
    readonly orderId: string;
} | {
    readonly kind: "statutory-authority";
    readonly billId: string;
    readonly actId: string;
    readonly orderId: string;
    readonly recordId: string;
} | {
    readonly kind: "fair-housing-enforcement";
    readonly complaintId: string;
} | {
    readonly kind: "wage-hour-enforcement";
    readonly complaintId: string;
} | {
    readonly kind: "unlawful-surveillance";
    readonly incidentId: string;
} | {
    readonly kind: "state-election-access";
    readonly state: StateId;
    readonly electionTurn: number;
};
/** Facts a filing must establish; old order opinions did not store this brief. */
export type CourtMatter = {
    readonly kind?: "agency-procedure" | "federal-state" | "statutory-authority" | "election-access" | "emergency-construction" | "entry-suspension" | "fair-housing-enforcement" | "wage-hour-enforcement" | "unlawful-surveillance";
    readonly state?: StateId;
    readonly title: string;
    readonly parties: readonly {
        readonly name: string;
        readonly role: "plaintiff" | "defendant";
    }[];
    readonly injury: string;
    readonly jurisdiction: string;
    readonly question: string;
    readonly authority: string;
    readonly disputedFacts: string;
    readonly reliefSought: string;
    readonly affected: string;
    readonly arguments?: readonly string[];
    readonly evidence?: readonly string[];
};
export type CourtProceeding = {
    readonly id: string;
    readonly subject: CourtSubject;
    readonly matter?: CourtMatter;
    readonly filedTurn: number;
    readonly stage: CourtStage;
    readonly nextTurn: number;
    readonly history: readonly CourtMoment[];
    /** The Article III district forum selected at filing; legacy proceedings may lack it. */
    readonly lowerForum?: {
        readonly id: string;
        readonly court: string;
        readonly circuit: string;
        readonly sourceDate: string;
        readonly authorized: number;
        readonly activeRepublican: number;
        readonly activeDemocratic: number;
        readonly vacancies: number;
    };
    readonly interim?: "denied" | "rule-stayed" | "rule-paused" | "party-stayed" | "state-compliance-ordered" | "construction-obligations-stayed";
    readonly lower?: {
        readonly holding: CourtHolding;
        readonly ruledTurn: number;
        readonly ground: ConstitutionalGround;
        readonly enforcement: "stayed-pending-appeal" | "in-force";
        readonly modeledStrikeChance?: number;
        readonly draw?: number;
    };
    /** Three eligible judges are assigned before hearing; loss of one can leave a two-judge quorum. */
    readonly circuitPanel?: {
        readonly assignedTurn: number;
        readonly assigned: readonly {
            readonly seatId: string;
            readonly judge: PersonId;
        }[];
        readonly recusals: readonly {
            readonly seatId: string;
            readonly judge: PersonId;
            readonly turn: number;
            readonly reason: "prior-government-advice";
        }[];
    };
    /** Frozen three-judge circuit panel; a later vacancy does not rewrite its votes. */
    readonly circuit?: {
        readonly court: string;
        readonly ruledTurn: number;
        readonly holding: CourtHolding;
        readonly votes: readonly {
            readonly seatId: string;
            readonly judge: PersonId;
            readonly vote: "strike" | "uphold";
        }[];
    };
    readonly appeal?: "denied" | "granted" | "equally-divided" | "majority";
    /** Government instruction after an adverse lower ruling; absent until the dated desk choice is answered. */
    readonly governmentReview?: "seek" | "seek-with-stay" | "accept" | "defaulted";
    /** The application is distinct from the appeal; these scores and odds are model assumptions, not observed court rates. */
    readonly stayApplication?: {
        readonly status: "pending" | "granted" | "denied";
        readonly requestedTurn: number;
        readonly decidedTurn?: number;
        readonly factors: {
            readonly merits: number;
            readonly irreparableHarm: number;
            readonly harmToOthers: number;
            readonly publicInterest: number;
            readonly modeledGrantChance: number;
            readonly draw?: number;
            readonly solicitorGeneralStanding?: number;
            readonly standingAdjustment?: number;
        };
    };
    readonly reviewDecision?: {
        readonly modeledGrantChance: number;
        readonly draw: number;
        readonly solicitorGeneralStanding: number;
        readonly standingAdjustment: number;
    };
    readonly calendar?: SupremeCalendar;
    readonly remanded?: true;
    /** Actual non-debt contribution withheld from the plaintiff supplier group. */
    readonly partyRelief?: {
        readonly scope: "defense-industrial" | "agency-rule";
        readonly fraction: number;
        readonly active: boolean;
        readonly appliedOnce: true;
        readonly outstanding: Partial<Record<PolicyStatPath, number>>;
        readonly unquantified?: true;
    };
};
export type CourtCase = {
    /** The proceeding id; legacy order opinions retain their original ids. */
    readonly id: string;
    /** The catalogue order when this case challenges one. */
    readonly order?: string;
    /** Absent on completed opinions written before generalized matters existed. */
    readonly subject?: CourtSubject;
    readonly matter?: CourtMatter;
    readonly question: string;
    readonly ground: ConstitutionalGround;
    readonly filedTurn: number;
    readonly dueTurn: number;
    readonly ruledTurn: number;
    readonly holding: CourtHolding;
    /** Participating justices' votes; empty for a lower-court final judgment or a preserved legacy opinion without recorded votes. */
    readonly votes: readonly CourtVote[];
    readonly majorityAuthor?: PersonId;
    readonly dissentAuthor?: PersonId;
    readonly opinion: {
        readonly majority: string;
        readonly dissent?: string;
    };
    /** Absent on pre-procedure completed opinions, which remain historical facts. */
    readonly procedure?: {
        readonly forum: "lower" | "circuit" | "supreme";
        readonly lower?: CourtHolding;
        readonly lowerForum?: CourtProceeding["lowerForum"];
        readonly circuit?: CourtProceeding["circuit"];
        readonly appeal?: CourtProceeding["appeal"];
        readonly dismissedAtThreshold?: true;
        readonly relief?: "party-specific" | "statutory-construction";
        readonly remanded?: true;
        readonly history: readonly CourtMoment[];
    };
};
export type Judiciary = {
    readonly cases: readonly CourtCase[];
    readonly proceedings?: readonly CourtProceeding[];
    readonly solicitorGeneral?: SolicitorGeneralRecord;
};
