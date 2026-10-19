import { type Campaign, type CombatantCommandId, type CommitmentKind, type CommandPosture } from "@admin/engine";
import { type NowReading } from "../desk/now-readings.js";
import { type CommandCard } from "./command-board.js";
import { type SecurityBoard, type ServiceReadiness } from "./security-board.js";
export type OperationKind = CommitmentKind | "covert";
export declare const OPERATION_KIND_LABELS: Readonly<Record<OperationKind, string>>;
export type OperationTone = "good" | "watch" | "bad" | "neutral";
export type OperationRow = {
    readonly id: string;
    readonly kind: OperationKind;
    readonly kindLabel: string;
    readonly what: string;
    /** Who or what it is aimed at, linked where the target has a page. */
    readonly subject: {
        readonly name: string;
        readonly href?: string;
    };
    /** The command whose area it falls in. */
    readonly theater?: {
        readonly abbr: string;
        readonly href: string;
    };
    readonly stage: string;
    readonly tone: OperationTone;
    /** What it spends a week in money; absent where it is paid in forces or has no price of its own. */
    readonly weekly?: number;
    readonly weeklyText?: string;
    /** Whole weeks since it began. */
    readonly weeks: number;
    /** Weeks to its review, or absent where it has no end date. */
    readonly reviewIn?: number;
    readonly flag?: {
        readonly text: string;
        readonly tone: Exclude<OperationTone, "neutral" | "good">;
    };
    /** The act that changes it. */
    readonly act: {
        readonly kind: "commitment" | "close-finding";
        readonly id: string;
    };
};
/** A review inside this many weeks is flagged, so the table sorts what is about to lapse to the top. */
export declare const REVIEW_SOON_WEEKS = 4;
/** Every operation still open: covert findings standing and the commitments abroad that have not been wound down. */
export declare function operationRows(campaign: Campaign): readonly OperationRow[];
export type PostureCharge = {
    readonly id: CombatantCommandId;
    readonly abbr: string;
    readonly href: string;
    readonly posture: CommandPosture;
    readonly engaged: boolean;
    readonly cost: number;
};
export type ReadinessReading = {
    readonly reading: NowReading;
    /** What the commands phase takes off the reading every week while theaters stand above routine, 0..1. */
    readonly weeklyCost: number;
    readonly charges: readonly PostureCharge[];
};
/** Military readiness with the one weekly charge the security desk can name exactly: the postures the commands hold. */
export declare function readinessReading(campaign: Campaign, cards?: readonly CommandCard[]): ReadinessReading;
export type PostureTally = {
    readonly surge: number;
    readonly heightened: number;
    readonly routine: number;
    readonly total: number;
    readonly engaged: number;
};
export type ForceTally = {
    readonly ready: number;
    readonly abroad: number;
    readonly resting: number;
    readonly lines: number;
};
export type OperationsTally = {
    readonly total: number;
    readonly byKind: readonly {
        readonly kind: OperationKind;
        readonly label: string;
        readonly count: number;
    }[];
    readonly flagged: number;
    readonly weeklyBill: string;
};
export type IntelTally = {
    readonly urgent: number;
    readonly watch: number;
    readonly ambient: number;
    readonly taskings: number;
    readonly reports: number;
    readonly stale: number;
    readonly assessments: number;
    readonly revised: number;
};
export type ObligationTally = {
    readonly open: number;
    readonly overdue: number;
    /** The row with the fewest days left on a sixty-day clock. */
    readonly soonest?: {
        readonly target: string;
        readonly left: number;
        readonly href: string;
    };
    readonly authorizationsWaiting: number;
    readonly authorizationsGranted: number;
};
export type SecurityOverview = {
    readonly rows: readonly OperationRow[];
    readonly readiness: ReadinessReading;
    readonly postures: PostureTally;
    readonly force: ForceTally;
    readonly operations: OperationsTally;
    readonly intel: IntelTally;
    readonly obligations: ObligationTally;
};
export declare function postureTally(cards: readonly CommandCard[]): PostureTally;
/** The services' shares averaged over every asset line they field, so a fleet of small units does not outweigh a few large ones. */
export declare function forceTally(services: readonly ServiceReadiness[]): ForceTally;
export declare function operationsTally(campaign: Campaign, rows: readonly OperationRow[]): OperationsTally;
export declare function obligationTally(board: Pick<SecurityBoard, "warPowers" | "authorizations">): ObligationTally;
export declare function intelTally(campaign: Campaign, board: Pick<SecurityBoard, "pdb" | "collection" | "assessments">): IntelTally;
/** The whole overview for one campaign; the board is passed in so the screen reads each ledger once. */
export declare function securityOverview(campaign: Campaign, board: SecurityBoard): SecurityOverview;
