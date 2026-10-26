import { type StateId } from "@admin/world";
import { type EffectPacket } from "../effects.js";
import { type Campaign } from "../state.js";
export type ScenarioId = "S0" | "S1" | "S2" | "S3" | "S4";
export type PolicyId = "P0" | "P1" | "P2" | "P3";
type Shock = {
    readonly severity: number;
    readonly disposition: number;
    readonly protest: number;
    readonly insurgency?: number;
};
export type Scenario = {
    readonly id: ScenarioId;
    readonly label: string;
    readonly shock?: Shock;
};
export declare const SCENARIOS: Readonly<Record<ScenarioId, Scenario>>;
export declare const POLICY_LABELS: Readonly<Record<PolicyId, string>>;
/** The balance grid's scenarios. S4 is census-only: it exists to open §252, and a year of it costs eight more runs per policy. */
export declare const SCENARIO_IDS: readonly ScenarioId[];
export declare const POLICY_IDS: readonly PolicyId[];
export declare const DESIGNED: readonly ScenarioId[];
export declare const TARGET: StateId;
/** The week the scenario's unrest is planted: a month in, so the opening program has landed first. */
export declare const INJECT_STEP = 4;
export declare const WEEKS = 52;
export declare const SEED_COUNT = 8;
export declare const domesticForceSeeds: (count?: number) => readonly string[];
/** Each path a force act runs on, as it can be read in the target state on a week. */
export type GroundKey = "251" | "252" | "253" | "regular-forces" | "rebellion" | "invasion" | "proclamation" | "surveil-under-order";
type Tally<K extends string> = Readonly<Record<K, number>>;
/** Every home state, every week, whatever the policy: the reachability census reads these. */
export type NaturalTally = {
    readonly weeks: number;
    /** State-weeks with live unrest reaching the state, placed there or national. */
    readonly reachingStateWeeks: number;
    readonly placedStateWeeks: number;
    /** State-weeks reached only by national unrest, and of those the ones §253 opened on. */
    readonly nationOnlyStateWeeks: number;
    readonly nationOnly253: number;
    /** State-weeks each Insurrection Act occasion was open. */
    readonly open: Tally<"251" | "252" | "253">;
    /** Weeks any state had a §251 or §253 occasion open. */
    readonly troopsPathWeeks: number;
    readonly rebellionWeeks: number;
};
export type DomesticForceRun = {
    readonly scenario: ScenarioId;
    readonly policy: PolicyId;
    readonly seed: string;
    /** Whether the planted unrest closed inside the run; absent in the natural scenario. */
    readonly resolved?: boolean;
    /** Weeks from planting to close, or the weeks remaining plus one when it never closed. */
    readonly weeksToResolve?: number;
    readonly standingChange: number;
    /** Approval change in points (0..100 scale). */
    readonly approvalChange: number;
    readonly peakPressure: number;
    readonly removed: boolean;
    /** National protest pressure as the run closed. */
    readonly finalProtest: number;
    readonly incidents: number;
    /** Acts and applications that went through, by id. */
    readonly acts: Readonly<Record<string, number>>;
    /** Weeks each path was open in the target state, from planting on. */
    readonly targetOpenWeeks: Tally<GroundKey>;
    /** The first week (0 = the planting week) each path opened in the target state. */
    readonly targetFirstOpen: Readonly<Partial<Record<GroundKey, number>>>;
    readonly natural: NaturalTally;
    readonly turnsPlayed: number;
};
/**
 * The scenario's shock as one world packet: the unrest condition placed in
 * the target state, the governor's disposition set, and the national pressures
 * moved. Planted once; from then on the world's own weekly rules run it.
 */
export declare function injectionPacket(campaign: Campaign, scenario: ScenarioId): EffectPacket | undefined;
type Week = {
    readonly state: Campaign;
    readonly packets: readonly EffectPacket[];
    readonly acts: readonly string[];
    readonly incidents: number;
};
/** Walk the policy's steps in order, each against the state the last one left. */
export declare function policyWeek(state: Campaign, policy: PolicyId, target: StateId): Week;
/** The state a policy aims at: the target in a designed scenario, else the worst placed unrest at home. */
export declare function policyTarget(campaign: Campaign, scenario: ScenarioId): StateId | undefined;
/** Fold one week of every home state into the natural tally. */
export declare function observeNatural(tally: NaturalTally, campaign: Campaign): NaturalTally;
/** Which paths are open in one state this week. */
export declare function openPaths(campaign: Campaign, state: StateId): ReadonlySet<GroundKey>;
export declare function runDomesticForce(scenario: ScenarioId, policy: PolicyId, seed: string, weeks?: number): DomesticForceRun;
export type Cell = {
    readonly scenario: ScenarioId;
    readonly policy: PolicyId;
};
export declare const FULL_GRID: readonly Cell[];
export declare function runGrid(cells: readonly Cell[], seeds?: readonly string[], weeks?: number): readonly DomesticForceRun[];
export declare function median(values: readonly number[]): number;
export declare const cellRuns: (runs: readonly DomesticForceRun[], scenario: ScenarioId, policy: PolicyId) => DomesticForceRun[];
export type Metric = (run: DomesticForceRun) => number;
export declare const METRICS: {
    readonly weeks: (run: DomesticForceRun) => number;
    readonly standing: (run: DomesticForceRun) => number;
    readonly approval: (run: DomesticForceRun) => number;
    readonly pressure: (run: DomesticForceRun) => number;
    readonly protest: (run: DomesticForceRun) => number;
    readonly incidents: (run: DomesticForceRun) => number;
};
/** Per-seed pairs of two policies in one scenario, matched by seed. */
export declare function paired(runs: readonly DomesticForceRun[], scenario: ScenarioId, a: PolicyId, b: PolicyId): readonly (readonly [DomesticForceRun, DomesticForceRun])[];
/** The median over seeds of a's metric less b's. */
export declare const pairedDifference: (runs: readonly DomesticForceRun[], scenario: ScenarioId, a: PolicyId, b: PolicyId, metric: Metric) => number;
/** The median over seeds of a's metric over b's. */
export declare const pairedRatio: (runs: readonly DomesticForceRun[], scenario: ScenarioId, a: PolicyId, b: PolicyId, metric: Metric) => number;
/**
 * Whether a run is at least as good as another on every axis a President
 * weighs and better on one: faster to resolve, more standing, more approval,
 * less removal pressure.
 */
export declare function dominates(a: DomesticForceRun, b: DomesticForceRun): boolean;
export declare const dominatedSeeds: (runs: readonly DomesticForceRun[], scenario: ScenarioId, a: PolicyId, b: PolicyId) => number;
/** One scenario's table: a row per policy, medians over seeds. */
export declare function scenarioTable(runs: readonly DomesticForceRun[], scenario: ScenarioId): string;
/** The paired comparisons the pass criteria read, printed whether or not they pass. */
export declare function pairedLines(runs: readonly DomesticForceRun[], scenario: ScenarioId): string;
/** In how many runs of a cell each path opened at least once in the target state. */
export declare function openedIn(runs: readonly DomesticForceRun[], key: GroundKey): number;
export declare function pathTable(runs: readonly DomesticForceRun[], cells: readonly Cell[]): string;
export declare function naturalLine(runs: readonly DomesticForceRun[]): string;
export {};
