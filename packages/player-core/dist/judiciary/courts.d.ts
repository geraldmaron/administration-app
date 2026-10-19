import { type Campaign, type ConstitutionalGround, type CourtCase, type CourtProceeding, type CourtMatter, type CourtSubject, type ExecutiveOrder, type ExecutiveOrderRecord, type InstitutionId, type OfficeId } from "@admin/engine";
import type { IdeologyVector } from "@admin/world";
import { type AssessmentReading } from "../dossier/assessment-profile";
/** One of the three scales a justice is placed on, -1..1, with the word for where they sit on it. */
export type LeanAxis = {
    readonly key: keyof IdeologyVector;
    readonly label: string;
    readonly value: number;
    readonly word: string;
    /** What each end of the scale means, left end first. */
    readonly ends: readonly [string, string];
};
/** The three scales, in the order the glossary names them. */
export declare function leanAxes(ideology: IdeologyVector): readonly LeanAxis[];
export type BenchSeat = {
    readonly seat: number;
    readonly title: string;
    readonly office: OfficeId;
    readonly institution: InstitutionId;
    readonly vacant: boolean;
    readonly chief: boolean;
    readonly personId?: string;
    readonly name: string;
    /** Left to right on the economy, the line the bench is drawn on; absent for an empty seat. */
    readonly lean?: number;
    readonly leanWord?: string;
    readonly href?: string;
    /** A name before the Senate for this seat, in the pipeline's words. */
    readonly pending?: {
        readonly name: string;
        readonly standing: string;
    };
};
export type BenchReading = {
    /** In seat order: the Chief Justice first. */
    readonly seats: readonly BenchSeat[];
    /** The same seats ordered left to right by lean, empty seats last. */
    readonly byLean: readonly BenchSeat[];
    readonly seated: number;
    readonly vacancies: number;
    /** Votes it takes to strike an order with the bench as it sits. */
    readonly majority: number;
};
/** The nine seats as the campaign holds them, and how they line up. */
export declare function benchReading(campaign: Campaign): BenchReading;
export type JusticeVote = {
    readonly caseId: string;
    readonly href: string;
    readonly order: string;
    readonly ruled: string;
    readonly vote: "strike" | "uphold";
    readonly holding: CourtCase["holding"];
    readonly withMajority: boolean;
    readonly wrote?: "majority" | "dissent";
};
export type JusticeFile = {
    readonly personId: string;
    readonly name: string;
    readonly seat: number;
    readonly title: string;
    readonly chief: boolean;
    readonly axes: readonly LeanAxis[];
    /** The readings the simulation reads for a justice (their skill), in words with a bar size; the rest move nothing on the bench. */
    readonly readings: readonly AssessmentReading[];
    /** Every case this justice sat on, newest first: the engine stores each vote when the bench rules. */
    readonly votes: readonly JusticeVote[];
};
/** A seated justice's file: where they sit, the five readings in words, and how they have voted. */
export declare function justiceFile(campaign: Campaign, personId: string): JusticeFile | undefined;
export declare const GROUND_WORDS: Readonly<Record<ConstitutionalGround, string>>;
export type DocketCase = {
    readonly id: string;
    readonly href: string;
    readonly order?: string;
    readonly orderName: string;
    readonly status: "pending" | CourtCase["holding"];
    readonly question: string;
    readonly ground: ConstitutionalGround;
    readonly groundWords: string;
    readonly signed: string;
    readonly due: string;
    /** Weeks until the bench rules; zero or less means it rules at the next week's turn. */
    readonly weeksLeft: number;
    /** The odds the bench strikes it, as the engine would roll them this week. Pending cases only. */
    readonly strikeChance?: number;
    readonly ruled?: string;
    /** The turn the ruling came down, for ordering; absent while the case is pending. */
    readonly ruledTurn?: number;
    /** "6 to 3" for the winning side, or "per curiam" when no justice sat. */
    readonly split?: string;
    /** The order can end while its historical challenge remains before the court. */
    readonly endReason?: ExecutiveOrderRecord["endReason"];
    readonly ended?: string;
    readonly stage?: CourtProceeding["stage"];
    readonly calendar?: CourtProceeding["calendar"];
    readonly responseDue?: string;
    readonly forum?: "lower" | "circuit" | "supreme";
    readonly lower?: CourtProceeding["lower"];
    readonly lowerForum?: CourtProceeding["lowerForum"];
    readonly circuitPanel?: CourtProceeding["circuitPanel"];
    readonly circuit?: CourtProceeding["circuit"];
    readonly interim?: CourtProceeding["interim"];
    readonly appeal?: CourtProceeding["appeal"];
    readonly dismissedAtThreshold?: true;
    readonly subject?: CourtSubject;
    readonly matter?: CourtMatter;
    readonly relief?: "party-specific" | "statutory-construction";
    readonly partyRelief?: CourtProceeding["partyRelief"];
};
/** The odds `judicialReviewPhase` rolls a pending case against, read with this week's bench and statute book. */
export declare function pendingStrikeChance(campaign: Campaign, order: ExecutiveOrder, record: ExecutiveOrderRecord, proceeding: CourtProceeding): number | undefined;
export type CourtDocket = {
    /** Pending federal matters, soonest next step first. */
    readonly pending: readonly DocketCase[];
    /** Rulings, newest first. */
    readonly ruled: readonly DocketCase[];
};
/** Every order and autonomous matter a represented federal court has taken up. */
export declare function courtDocket(campaign: Campaign): CourtDocket;
