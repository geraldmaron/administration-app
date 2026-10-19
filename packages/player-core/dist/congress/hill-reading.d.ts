import { type Campaign, type Chamber, type HillPostId, type UsParty } from "@admin/engine";
import { type StateId } from "@admin/world";
import { type MetricStance } from "../format/figures.js";
export type HillStanding = {
    readonly value: number;
    readonly percent: string;
    readonly word: string;
    readonly stance: MetricStance;
};
export declare function standingOf(value: number): HillStanding;
/** How each chamber's floor reads the administration once its leaders and delegations are counted. */
export declare function chamberStandings(campaign: Campaign): readonly {
    readonly chamber: Chamber;
    readonly name: string;
    readonly standing: HillStanding;
}[];
export type PartySeatCount = {
    readonly party: "democrat" | "republican" | "independent";
    readonly seats: number;
    readonly label: string;
};
/** A chamber's seats by party, in the order they sit from the left. */
export declare function chamberParties(campaign: Campaign, chamber: Chamber): readonly PartySeatCount[];
export type LobbyHistoryRow = {
    readonly id: string;
    readonly when: string;
    readonly approach: string;
    readonly landed: boolean;
    readonly account: string;
};
export type HillPostReading = {
    readonly id: HillPostId;
    readonly title: string;
    readonly chamberName: string;
    readonly chamber: Chamber;
    readonly brief: string;
    readonly href: string;
    readonly holderId?: string;
    /** "Speaker Reyes", or the post alone when nobody holds it. */
    readonly name: string;
    readonly party: UsParty;
    readonly side: string;
    readonly standing: HillStanding;
    /** How much of the chamber follows them, in words. */
    readonly following: string;
    /** The state the holder comes from, which the map frames. */
    readonly homeState?: StateId;
    readonly homeStateName?: string;
    /** A lobbying play already in flight with them, said as its due date. */
    readonly pending?: string;
    readonly history: readonly LobbyHistoryRow[];
};
/** About one member in N, from a share of the chamber. */
export declare function followingWords(influence: number): string;
/** The leaders and chairs, in the order the posts are listed. */
export declare function hillPosts(campaign: Campaign): readonly HillPostReading[];
export declare function hillPostReading(campaign: Campaign, post: string): HillPostReading | undefined;
export type CommitteeReading = {
    readonly id: string;
    readonly name: string;
    readonly chair?: string;
    readonly standing: HillStanding;
    /** What it has open on the administration, newest first. Empty when it is not investigating. */
    readonly inquiries: readonly string[];
};
/** Every committee, the ones investigating the administration first. */
export declare function committeeReadings(campaign: Campaign): readonly CommitteeReading[];
export type DelegationReading = {
    readonly state: StateId;
    readonly name: string;
    readonly house: {
        readonly democrat: number;
        readonly republican: number;
        readonly independent: number;
        readonly seats: number;
    };
    readonly senators: readonly {
        readonly party: string;
        readonly up: string;
    }[];
    readonly standing: HillStanding;
};
/** One state's bloc in Congress, as the campaign seats it today. */
export declare function delegationReading(campaign: Campaign, state: string): DelegationReading | undefined;
