import { type Campaign, type ConversationScript } from "@admin/engine";
import { type NationId, type StateId } from "@admin/world";
import { type ScenarioClass, type ScenarioCondition, type ScenarioDef, type ScenarioSeverity, type WeightBoost } from "./scenario.js";
import { type ResolvedLocus } from "./scenario-locus.js";
import { roleHintTargets } from "./scenario-role-hints.js";
import { type FrozenCollectionReport } from "./scenario-report.js";
import { type FrozenOversightMatter } from "./scenario-matter.js";
import { type FrozenTradeMeasure } from "./scenario-trade.js";
import { type FrozenBill } from "./scenario-bill.js";
import { type FrozenJudicialVacancy } from "./scenario-judicial-vacancy.js";
import { type FrozenOrderCase } from "./scenario-order-case.js";
export { roleHintTargets };
/**
 * Everything binding, liveness, and weight actually read. A `ScenarioDef`
 * satisfies it, and so does a bodiless `ScenarioSelector` — which is the point:
 * a draw over a large pool touches only this much of each candidate.
 */
export type ScenarioSelectorLike = {
    readonly id: string;
    readonly subjects?: ScenarioDef["subjects"];
    readonly class: ScenarioClass;
    readonly severity: ScenarioSeverity;
    readonly cast: ScenarioDef["cast"];
    readonly conditions: readonly ScenarioCondition[];
    readonly weight: number;
    readonly boosts?: readonly WeightBoost[];
    readonly once?: boolean;
    /**
     * Locus binds selection may need without loading the body: `state` gates
     * `stateGrievance`, `ground` says whose season a calendar gate is read in,
     * and `bind` says the place comes from the running condition rather than
     * from a roll.
     */
    readonly locus?: {
        readonly state?: StateId;
        readonly ground?: "home" | "counterpart";
        readonly bind?: "condition";
        readonly settlement?: "small" | "commercial-port" | "road-border";
        readonly settlementId?: ScenarioDef["locus"]["settlementId"];
    };
    /** The arc this scenario belongs to, where it belongs to one. See `family` on ScenarioDef. */
    readonly family?: ScenarioDef["family"];
};
/**
 * A transmission with its counterpart bound. Deliberately not part of the
 * `ConversationScript` the engine opens: the script is the thread, and the
 * whole point of a transmission is that it is not in the thread.
 */
export type ResolvedTransmission = {
    readonly relay: string;
    readonly attribution: string;
    readonly text: string;
    readonly nation: NationId;
    readonly nationName: string;
    /**
     * What the card credits above the text. The nation for a government, and
     * a placement for anyone else operating on its territory.
     */
    readonly source: string;
};
export type CastScenario = {
    readonly def: ScenarioDef;
    /** Frozen identity of this staging. Legacy casts and one-run family members use the template id. */
    readonly occurrence?: string;
    readonly counterpart: NationId;
    readonly script: ConversationScript;
    readonly weight: number;
    /** Where on the earth this is happening, if the scenario declares a locus. */
    readonly locus?: ResolvedLocus;
    /** What the counterpart said, if they said anything. Read beside the thread, never in it. */
    readonly transmission?: ResolvedTransmission;
    /** Issued intelligence as it read when this decision was raised. */
    readonly report?: FrozenCollectionReport;
    readonly matter?: FrozenOversightMatter;
    readonly tradeMeasure?: FrozenTradeMeasure;
    readonly bill?: FrozenBill;
    readonly judicialVacancy?: FrozenJudicialVacancy;
    readonly orderCase?: FrozenOrderCase;
};
export { scenarioOccurrenceKey } from "./scenario-occurrence.js";
export declare function bindCounterpart(campaign: Campaign, def: ScenarioSelectorLike): NationId | undefined;
export declare function scenarioLive(campaign: Campaign, def: ScenarioSelectorLike, counterpart: NationId): boolean;
/**
 * Whether the decision in front of the President is still about something.
 *
 * A bound scenario carries the record it was cast against, and this asks the
 * board whether that record is still running. It is the recheck a frozen case
 * needs and liveness cannot give it: once a case is raised the pick is pinned on
 * purpose, so the only honest way to withdraw it is to ask about the pinned
 * record by id. A cast with no bind is always still about something.
 */
export declare function castStillBound(campaign: Campaign, cast: CastScenario): boolean;
export { effectiveWeight, FLAG_AGE_SATURATION } from "./scenario-cast-weight.js";
export { renderScenarioBrief } from "./scenario-brief-render.js";
/** Bind a scenario to the live board and render it into a playable script. */
export declare function castScenario(campaign: Campaign, def: ScenarioDef): CastScenario | undefined;
/** Missing required subjects exclude this candidate without inventing a replacement. */
export declare function tryCastBound(campaign: Campaign, def: ScenarioDef, counterpart: NationId): CastScenario | undefined;
/**
 * Render a scenario whose counterpart is already bound. Selection binds once,
 * over selectors, and hands the winning counterpart here — so the prose of a
 * scenario that was never drawn is never interpolated.
 */
export declare function castBound(campaign: Campaign, def: ScenarioDef, counterpart: NationId): CastScenario;
/** A candidate that survived binding and its conditions, priced but not yet written out. */
export type LiveSelector<T extends ScenarioSelectorLike = ScenarioSelectorLike> = {
    readonly selector: T;
    readonly counterpart: NationId;
    readonly weight: number;
};
/**
 * Everything the board makes live this turn, as selectors. No prose is
 * interpolated here, which is what lets the pool grow to five figures: a
 * candidate costs one counterpart binding and its own conditions, and a
 * candidate that fails either costs nothing more.
 */
export declare function liveSelectors<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[]): readonly LiveSelector<T>[];
/**
 * The weighted draw, over selectors alone. Deterministic for (seed, turn,
 * pool): the same campaign at the same turn always faces the same decision.
 */
export declare function drawSelector<T extends ScenarioSelectorLike>(campaign: Campaign, selectors: readonly T[]): LiveSelector<T> | undefined;
/**
 * Every live scenario, fully cast. Only what the board made live is rendered,
 * but that is still every live one — a caller putting a single decision on a
 * desk wants `selectScenario`, which renders exactly the one it drew.
 */
export declare function eligibleScenarios(campaign: Campaign, defs: readonly ScenarioDef[]): readonly CastScenario[];
/** The decision this turn puts in front of the player: one draw, one body rendered. */
export declare function selectScenario(campaign: Campaign, defs: readonly ScenarioDef[]): CastScenario | undefined;
export { rememberReply } from "./scenario-reply-memory.js";
