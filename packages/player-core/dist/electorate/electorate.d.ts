import { type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import { type Campaign } from "@admin/engine";
import { type BlocTopline } from "./blocs";
import { type CrosstabGroup, type MostImportantProblem } from "../polling/crosstabs";
import { type OpinionTrends } from "../polling/opinion-trends";
import { type PollReading } from "../polling/polls";
import { type Stance } from "../reading";
export type JudgmentRow = {
    readonly driver: string;
    readonly label: string;
    readonly meaning: string;
    /** How well the country judges the administration on this, 0..1. */
    readonly value: number;
    readonly figure: string;
    readonly stance: Stance;
    readonly word: string;
    /** How much the week weighs this judgment, 0..1. */
    readonly weight: number;
    /** Whether the week itself has made it matter more. */
    readonly salient: boolean;
    /** The heaviest thing doing it, named. */
    readonly cause?: string;
    readonly causeDetail?: string;
};
export type ToplineView = {
    readonly poll: PollReading;
    /** Approval week by week, oldest first, ending now: the settled series the engine keeps. */
    readonly series: readonly number[];
    /** How many leading points are the predecessor's quarter. */
    readonly inherited: number;
    /** Points since the oath on the same series; undefined with no governed week closed. */
    readonly sinceOath?: number;
    readonly judgments: readonly JudgmentRow[];
};
export type CohortMemoryRow = {
    readonly cohort: CohortId;
    readonly axis: CohortAxisId;
    readonly axisLabel: string;
    readonly name: string;
    readonly share: number;
    /** Signed live memory; negative is harm not yet forgiven. */
    readonly strain: number;
    /** The part of its memory that is about this group rather than the country, signed. */
    readonly displacement: number;
    readonly reading: string;
};
export type StateApprovalCell = {
    readonly state: StateId;
    readonly name: string;
    readonly approval: number;
    readonly figure: string;
    readonly stance: Stance;
    readonly word: string;
    /** Against the previous weekly sample; undefined when there is no earlier sample. */
    readonly change?: number;
    /** Weekly record from the oath, oldest first. */
    readonly history: readonly number[];
};
export type ElectorateView = {
    readonly topline: ToplineView;
    readonly problems: readonly MostImportantProblem[];
    readonly cuts: readonly CrosstabGroup[];
    /**
     * Where the country stands across the ten cuts: each cut's share-weighted
     * support, averaged. The line every cut's gap is read against, because the
     * tracking poll carries its own sampling error and a group's reading does not.
     */
    readonly cutsAverage: number;
    /** The country as the three blocs a player is shown, and what moved each. */
    readonly blocs: BlocTopline;
    readonly memory: readonly CohortMemoryRow[];
    readonly states: readonly StateApprovalCell[];
    /** The judgments, cells and blocs as observed week by week, and where that record starts. */
    readonly trends: OpinionTrends;
};
/** The whole book on the electorate this week. */
export declare function electorateView(campaign: Campaign): ElectorateView;
export type DemographicCell = {
    readonly cohort: CohortId;
    readonly name: string;
    readonly state: number;
    readonly nation: number;
    /** State share less national share, in share units. */
    readonly gap: number;
};
export type DemographicAxis = {
    readonly axis: CohortAxisId;
    readonly name: string;
    readonly cells: readonly DemographicCell[];
};
/**
 * A state's composition on each of the ten axes against the country's
 * population-weighted figure. Undefined for a state the campaign does not carry
 * or whose dataset has no cohort mix.
 */
export declare function stateDemographics(campaign: Campaign, id: StateId): readonly DemographicAxis[] | undefined;
