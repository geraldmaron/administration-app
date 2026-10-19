import { type Campaign, type Chamber, type UsParty } from "@admin/engine";
import { type StateId } from "@admin/world";
import { type FloorGroupKey } from "./floor-schedule.js";
import { type DelegationReading } from "./hill-reading.js";
export type SeatVote = "yea" | "nay" | "unrecorded";
export type CongressSeat = {
    readonly seat: string;
    readonly chamber: Chamber;
    readonly state: StateId;
    readonly stateName: string;
    readonly party: UsParty;
    readonly name: string;
    readonly personId?: string;
    readonly href?: string;
    /** Economic position from the member's public record, -1 left to 1 right; absent when no member is recorded. */
    readonly lean?: number;
    /** The leadership post the member holds, by title. */
    readonly post?: string;
    /** No living member holds the seat. */
    readonly vacant: boolean;
    readonly seatClass?: 1 | 2 | 3;
};
export type ThresholdKey = "majority" | "cloture" | "override" | "sustain";
export type ChamberThreshold = {
    readonly key: ThresholdKey;
    readonly label: string;
    readonly votes: number;
    /** Seats the President's nearest caucus is short of this line on its own; 0 when it clears it. */
    readonly short: number;
    /** The caucus reaches this line only through the Vice President's tie-breaking vote. */
    readonly tieBreak?: boolean;
};
export type CongressChamber = {
    readonly chamber: Chamber;
    readonly name: string;
    readonly seats: number;
    /** Members in seating order, left to right: Democrats, independents, Republicans, each by recorded position. */
    readonly members: readonly CongressSeat[];
    /** Seats the chamber has that no record fills. Drawn hollow, never as a party. */
    readonly unrecorded: number;
    readonly parties: readonly {
        readonly party: UsParty;
        readonly label: string;
        readonly seats: number;
    }[];
    /** The caucus the President stands nearest, independents counted where they caucus. */
    readonly caucus: {
        readonly name: string;
        readonly relation: string;
        readonly parties: readonly UsParty[];
        readonly seats: number;
        readonly opposing: number;
    };
    readonly thresholds: readonly ChamberThreshold[];
    readonly holdsMajority: boolean;
    readonly majorityLine: string;
    readonly lastRoll?: RecordedRoll;
    /** The seated members' parties do not add up to the chamber's count, which is what votes run on. */
    readonly recordsDisagree: boolean;
};
export type RecordedRoll = {
    readonly billId: string;
    readonly title: string;
    readonly href: string;
    readonly question: string;
    readonly date: string;
    readonly turn: number;
    readonly yeas: number;
    readonly nays: number;
    readonly required: number;
    readonly passed: boolean;
    /** Each member's recorded vote by seat. A seat missing here has no recorded vote. */
    readonly votes: ReadonlyMap<string, boolean>;
};
export type BillLane = FloorGroupKey;
export type CongressBill = {
    readonly id: string;
    readonly title: string;
    readonly href: string;
    readonly lane: BillLane;
    readonly sponsor: string;
    readonly line: string;
};
export type CongressSystem = {
    readonly chambers: readonly CongressChamber[];
    readonly delegations: readonly DelegationReading[];
    readonly bills: readonly CongressBill[];
};
export declare const BILL_LANES: readonly BillLane[];
/** Congress as one system, read from recorded state. */
export declare function congressSystem(campaign: Campaign): CongressSystem;
