import { type Campaign, type CoverageBand, type FeedItem, type ScandalStage } from "@admin/engine";
import { type DeskProfile } from "./desks.js";
import { type PodiumReading } from "./press-office.js";
import { type DispatchGenre } from "./landscape.js";
/** How a story leans toward the administration, from the stance of the desk that filed it. */
export type CoverageTone = "critical" | "even" | "friendly";
export declare const COVERAGE_TONES: readonly CoverageTone[];
export declare const COVERAGE_TONE_WORD: Readonly<Record<CoverageTone, string>>;
type FeedKind = FeedItem["kind"];
export declare const TOPIC_LABEL: Readonly<Record<FeedKind, string>>;
export type CoverageRow = {
    /** The story's address in the campaign's feed. */
    readonly index: number;
    readonly headline: string;
    /** The week the story was filed in: the week that closed when it ran, which is the digest's week number. */
    readonly week: number;
    readonly when: string;
    readonly genre: DispatchGenre;
    readonly source: string;
    /** The masthead that carries it; absent for the administration's own notices and intelligence summaries. */
    readonly outletId?: string;
    readonly tone?: CoverageTone;
    readonly topic: FeedKind;
    readonly topicLabel: string;
    /** The governments the story names, each a door to its file. */
    readonly nations: readonly {
        readonly id: string;
        readonly name: string;
        readonly href: string;
    }[];
};
/** Every story filed, newest first, each with the desk that carries it, how it leans, what it is about and who it names. */
export declare function coverageRows(campaign: Campaign): readonly CoverageRow[];
export type CoverageFilter = {
    readonly topic?: FeedKind;
    readonly outlet?: string;
    readonly tone?: CoverageTone;
    readonly week?: number;
};
export declare function filterCoverage(rows: readonly CoverageRow[], filter: CoverageFilter): readonly CoverageRow[];
/** The topics the feed holds, with how many stories each has, most first. */
export declare function coverageTopics(rows: readonly CoverageRow[]): readonly {
    readonly topic: FeedKind;
    readonly label: string;
    readonly count: number;
}[];
export type WeekCoverage = {
    /** The digest's week number for the week this coverage closed. */
    readonly week: number;
    readonly critical: number;
    readonly even: number;
    readonly friendly: number;
    /** Stories with no filing desk: the administration's notices and intelligence summaries. */
    readonly other: number;
    readonly total: number;
    readonly current: boolean;
};
/** The last weeks of coverage, oldest first, each split by how the filing desks leaned. Weeks nothing was filed in are kept as empty columns. */
export declare function coverageByWeek(campaign: Campaign, limit?: number): readonly WeekCoverage[];
export type DeskRow = DeskProfile & {
    /** Where the desk stands, 0 hostile to 1 friendly: the position drawn, never printed. */
    readonly disposition: number;
    /** Stories it has carried in the feed, and how many of them were this week's. */
    readonly filed: number;
    readonly thisWeek: number;
    readonly last?: {
        readonly index: number;
        readonly headline: string;
    };
    /** Its strongest reason for standing where it does, in a sentence. */
    readonly why: string;
};
/** Every desk, hostile end first, with the stories it has filed and its latest. */
export declare function deskRows(campaign: Campaign): readonly DeskRow[];
export type RunningStory = {
    readonly id: string;
    readonly subject: string;
    readonly stage: ScandalStage;
    readonly stageWord: string;
    readonly weeks: number | undefined;
    readonly age: string;
    /** How hot it runs, 0..1. */
    readonly heat: number;
    readonly keptAliveBy: {
        readonly id: string;
        readonly name: string;
    };
    readonly href: string;
};
/** The stories still running against the administration, hottest first. */
export declare function runningStories(campaign: Campaign): readonly RunningStory[];
export type PressKpis = {
    readonly standing: PodiumReading["standing"];
    /** Desks by the way the record is taking them. */
    readonly warming: number;
    readonly cooling: number;
    readonly hostileDesks: number;
    readonly friendlyDesks: number;
    readonly deskCount: number;
    /** This week's toned stories by lean; the share is of the stories a desk filed. */
    readonly week: WeekCoverage | undefined;
    readonly criticalShare: number | undefined;
    readonly friendlyShare: number | undefined;
    /** The mean weekly volume over the four weeks before this one, for the week's count to be read against. */
    readonly earlierAverage: number | undefined;
    readonly running: number;
    readonly hottest: string | undefined;
    readonly silenceWeeks: number;
    readonly silenceLimit: number;
    readonly silence: string;
    readonly secretary: (NonNullable<PodiumReading["secretary"]> & {
        readonly href: string;
        readonly read?: {
            readonly tone: "good" | "watch" | "bad";
            readonly word: string;
        };
    }) | undefined;
};
/** The press in the numbers a President reads first, every one from the same desk rows, weeks and stories the page draws below. */
export declare function pressKpis(campaign: Campaign): PressKpis;
/** The headline of the page in a sentence, from the same readings as the tiles. */
export declare function pressLede(kpis: PressKpis): string;
export type AbroadRow = {
    readonly outletId: string;
    readonly outlet: string;
    /** The government whose capital the outlet files from, a door to its file. */
    readonly nation: {
        readonly id: string;
        readonly name: string;
        readonly href: string;
    };
    readonly band: CoverageBand;
    readonly caption: string;
    readonly lede: string;
    readonly signature: string;
};
/** The week's pieces from the press abroad, the coolest toward the administration first. */
export declare function abroadRows(campaign: Campaign): readonly AbroadRow[];
export {};
