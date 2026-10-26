import type { NationId } from "@admin/world";
import { type HomeEventCondition } from "./condition-kinds.js";
import { type Campaign, type ConditionScope } from "./state.js";
/**
 * The share of foreign intrusions on the United States that become a
 * President's file: a pipeline, a hospital chain, a federal network. A design
 * value. The operator phase records about two notable intrusions into American
 * systems a year once crews have rooted (five seeds, four years each), so one in
 * two gives the President about one a year; the rest stay records of their own.
 */
export declare const CYBER_ESCALATION = 0.5;
/**
 * Strikes that reach a President in a calm labor market, and what a full
 * real-wage squeeze adds. BLS's count of major stoppages doubled when prices
 * outran wages (15 a year to 31), so a full squeeze more than triples the
 * national ones, which are a sliver of the major count either way.
 */
export declare const STOPPAGE_CALM_PER_YEAR = 0.3;
export declare const STOPPAGE_SQUEEZE_PER_YEAR = 0.7;
/**
 * A large bank failing: almost never in calm water, and about once a year
 * while rates are climbing fast or the cycle is in a slump. Every $10 billion
 * failure in the FDIC record from 2005 to 2024 fell inside one of two stress
 * windows. One episode at a time: a second failure while the first runs is that
 * episode deepening, not a new file.
 */
export declare const BANK_CALM_PER_YEAR = 0.02;
export declare const BANK_STRESS_PER_YEAR = 1;
/** Mass killings of ten or more people, Mother Jones, 2005 to 2024. No sourced state dependency, so the rate is flat. */
export declare const MASS_KILLINGS_PER_YEAR = 1.1;
/**
 * Americans held by a hostile government that reach a President, per year at
 * one unit of captor weight. Foley's 14 to 27 new cases a year include many held
 * by armed groups and many the public never hears of; about one in ten is a
 * President's file. The founding world carries about 2.3 units of captor weight
 * (China, Cuba, Iran, Kazakhstan, North Korea and Russia, and Belarus on some
 * seeds), which gives about two a year.
 */
export declare const DETENTION_PER_CAPTOR_WEIGHT = 0.8;
type Candidate = {
    readonly nation: NationId;
    readonly kind: HomeEventCondition;
    readonly chance: number;
};
/** Every government hostile enough to hold an American, with how much it weighs, in id order. */
export declare function captorWeights(campaign: Campaign): readonly {
    readonly nation: NationId;
    readonly weight: number;
}[];
/** The government holding the American, drawn by captor weight off one roll. */
export declare function detentionCaptor(campaign: Campaign, roll: number): NationId | undefined;
/** The home events eligible this week, in kind order, with their weekly chances. */
export declare function homeEventCandidates(campaign: Campaign): readonly Candidate[];
/** Where each home event happens: a mass killing in one city, a failed bank in its state, the rest across the country. */
export declare const HOME_EVENT_SCOPE: Readonly<Record<HomeEventCondition, ConditionScope>>;
/** The onset line a home event files, in plain words, with the place or the captor named. */
export declare function homeEventDescription(campaign: Campaign, kind: HomeEventCondition, place: string, captor?: NationId): string;
export {};
