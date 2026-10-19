import { type Bill, type Campaign, type Chamber, type ChamberVote, type UsParty } from "@admin/engine";
import type { CongressChamber, CongressSeat, RecordedRoll } from "./congress-system.js";
import { type HillStanding } from "./hill-reading.js";
export type PartySplit = {
    readonly yea: number;
    readonly nay: number;
};
export type RollHistoryEntry = {
    readonly key: string;
    readonly turn: number;
    readonly date: string;
    readonly chamber: Chamber;
    readonly title: string;
    readonly href: string;
    readonly question: string;
    readonly yeas: number;
    readonly nays: number;
    readonly required: number;
    readonly passed: boolean;
    /** Recorded member votes by party; absent when the record kept only the totals. */
    readonly byParty?: Readonly<Record<UsParty, PartySplit>>;
};
export type TermTally = {
    readonly signed: number;
    readonly unsigned: number;
    readonly vetoed: number;
    readonly overridden: number;
    readonly died: number;
    readonly pending: number;
};
export type HillLeader = {
    readonly id: string;
    readonly title: string;
    readonly chamber: Chamber;
    readonly name: string;
    readonly personId?: string;
    readonly href: string;
    readonly party: UsParty;
    readonly standing: HillStanding;
    readonly following: string;
    /** An outreach play already in flight with them, said as its due date. */
    readonly pending?: string;
};
export type HillCommittee = {
    readonly id: string;
    readonly name: string;
    readonly chair?: string;
    readonly chairId?: string;
    readonly chairHref?: string;
    readonly standing: HillStanding;
    readonly inquiries: readonly string[];
};
export type ReachableMember = CongressSeat & {
    /** Distance between the member's recorded economic position and the President's, 0 to 2. */
    readonly distance: number;
};
export type ChamberReach = {
    readonly chamber: Chamber;
    /** Votes the President's nearest caucus lacks for a majority, or for cloture in the Senate. */
    readonly need: number;
    readonly line: string;
    /** Members of the other caucus whose public positions sit nearest the President's, nearest first. */
    readonly nearest: readonly ReachableMember[];
};
export type NextSenateClass = {
    readonly seatClass: 1 | 2 | 3;
    readonly year: number;
    readonly weeks: number;
};
export declare function recordedVotes(bill: Bill): readonly {
    readonly vote: ChamberVote;
    readonly question: string;
}[];
/** Every roll call the term recorded on a bill, oldest first. */
export declare function rollHistory(campaign: Campaign): readonly RollHistoryEntry[];
/** What the term's bills came to. */
export declare function termTally(campaign: Campaign): TermTally;
/** The leaders a President deals with by name, each with how they stand toward the administration. */
export declare function hillLeaders(campaign: Campaign): readonly HillLeader[];
/** Every committee with its chair and its reading of the administration. */
export declare function hillCommittees(campaign: Campaign): readonly HillCommittee[];
/**
 * The members across the aisle a President would call first, read only from
 * public positions: the other caucus, ordered by how near each member's
 * recorded economic position sits to the President's own. A position is not a
 * commitment, so this never says how anyone will vote.
 */
export declare function chamberReach(chamber: CongressChamber, presidentLean: number, shown?: number): ChamberReach;
/** The Senate class that faces the voters at the next November election, if one is scheduled. */
export declare function nextSenateClass(campaign: Campaign): NextSenateClass | undefined;
/** The President's own economic position, which every member's is measured against. */
export declare function presidentLean(campaign: Campaign): number;
export type MemberDepth = CongressSeat & {
    /** Where their recorded economic position sits against the President's: negative is to the left. */
    readonly fromYou?: number;
    /** Their home state's approval of the President, 0 to 1; absent where no state reading is kept. */
    readonly homeApproval?: number;
    /** Their seat faces the voters at the next November election. */
    readonly upNext: boolean;
    /** Their vote on the chamber's newest roll call, when they cast a recorded one. */
    readonly lastVote?: "yea" | "nay";
};
/** One member read in depth from public records only: position against the President's, home-state approval, the next election and the last recorded vote. */
export declare function memberDepth(campaign: Campaign, member: CongressSeat, you: number, senateClass: NextSenateClass | undefined, roll: RecordedRoll | undefined): MemberDepth;
