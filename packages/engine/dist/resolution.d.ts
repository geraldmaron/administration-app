import { type SupportChoice, type SupportProjection } from "./action-support.js";
import { type CivilianRisk } from "./strike-outcomes.js";
import { type ActionTiming } from "./action-timing.js";
import type { NationId } from "@admin/world";
import { type CasualtyBand, type Campaign } from "./state.js";
import type { Effect, EffectPacket, EffectSource } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type ConflictConsequence, type DeterrenceAssessment } from "./conflicts.js";
import { type CoalitionBacking } from "./coalition.js";
import { type GateShortfall, type CapacityCost, type Consultee, type InstrumentContext, type InstrumentId, type RungLevel } from "./instruments.js";
import type { ForcePackage } from "./force-packages.js";
import { type ForceCostBasis } from "./force-costs.js";
import { type Contest } from "./contest.js";
import { type ForceDomain, type NuclearReading } from "./forces.js";
import { type ConsequenceCard, type ConsequenceContext, type ConsequenceValence } from "./consequences.js";
import { type ResolutionSequenceEntry, type StagedResolution } from "./resolution-sequence.js";
import type { MetricDeltas } from "./effect-types.js";
export type ResolutionRequest = {
    readonly actor: NationId;
    readonly target: NationId;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    /** Scaleable package. Omitted, the rung's preferred count is used. */
    readonly force?: ForcePackage;
    readonly support?: SupportChoice;
    readonly civilianProtection?: "standard" | "additional-assessment";
    readonly strikeObjective?: import("./strike-assessment.js").StrikeObjective;
    readonly regimeAct?: import("./state-world.js").RegimeAct;
    readonly assessedSite?: {
        readonly site: NonNullable<import("./impact-event.js").ImpactSpec["site"]>;
        readonly exposure: import("./impact-event.js").ImpactExposure;
    };
};
export type MetricCost = MetricDeltas;
export type RiskBranch = {
    readonly id: string;
    readonly chance: number;
    readonly description: string;
};
export type RippleRelation = "bloc-partner" | "ally" | "trade-partner" | "bloc-peer" | "observer" | "domestic";
export type Ripple = {
    readonly nation: NationId;
    readonly relation: RippleRelation;
    readonly magnitude: number;
    readonly approves?: true;
    readonly reason: string;
};
export type RippleVisibility = "always" | "if-exposed";
export type ActionProjection = {
    readonly request: ResolutionRequest;
    readonly rungName: string;
    readonly timing?: ActionTiming;
    readonly civilianRisk?: CivilianRisk;
    readonly strikeAssessment?: import("./strike-assessment.js").StrikeAssessmentReading;
    readonly support?: SupportProjection;
    /**
     * Always `true` on a projection the resolver returned, and present so that a
     * bare instrument projection satisfies the same shape a scenario reply's
     * projection does.
     *
     * Without it every surface that had a shared way to render a price — one
     * label per metric moved, the odds, the worst branch, the war line, who
     * notices — had to fall back to a local reading for the ladder, and the
     * local reading printed the first cost mark and threw the other three away.
     * A rung that costs money, stability, standing and readiness showed a dollar
     * figure and nothing else.
     */
    readonly available: true;
    readonly cost: MetricCost;
    readonly successChance: number;
    /**
     * The matchup the odds were read off, layer by layer. Present on every
     * projection because a number the player cannot take apart is a number they
     * cannot plan against: this is what lets a surface say *why* a strike is a
     * coin flip and a démarche is not.
     */
    readonly contest: Contest;
    readonly risks: readonly RiskBranch[];
    readonly ripples: readonly Ripple[];
    readonly rippleVisibility: RippleVisibility;
    /** Chance that a successful covert operation is attributed to its actor. Separate from mission success. */
    readonly successExposureChance?: number;
    /**
     * What the defender's arsenal makes of this, present only on the military
     * rungs where it is the question (4 and up). Deterrence is never a locked
     * door: it is already in `successChance`, and it is stated here so the player
     * reads *why* the number is what it is before committing to it.
     */
    readonly deterrence?: DeterrenceAssessment;
    /**
     * What this act would do to the war ledger — start one, or make a running one
     * hotter. Present only where the question arises (military rungs 4 and up).
     * The single largest consequence any act in the game has, and until it was
     * stated here the projection pane did not mention it at all.
     */
    readonly conflict?: ConflictConsequence;
    /**
     * Who in the government has to have heard about this before it is ordered.
     * Role ids rather than titles: the ids are the engine's cross-charter
     * contract and the words a screen prints are presentation.
     */
    readonly consultation: readonly Consultee[];
    /**
     * What the act takes out of the establishment and how many weeks the
     * establishment is short of it afterward. Absent on the rungs that spend no
     * capacity, which is most of them.
     */
    readonly capacity?: CapacityCost;
    /** What the President's backers did to this act: already in `successChance` and `cost`, stated so the screen can say so. */
    readonly coalition?: CoalitionBacking;
    /** How a military rung's money was reached: what is sent, at what price, by how far. */
    readonly costBasis?: ForceCostBasis;
};
export type ProjectionResult = {
    readonly ok: true;
    readonly projection: ActionProjection;
} | {
    readonly ok: false;
    readonly reason: string;
    readonly missingCapability: string;
    readonly shortfall?: GateShortfall;
};
export type ResolutionResult = {
    readonly ok: false;
    readonly reason: string;
    readonly missingCapability: string;
    readonly shortfall?: GateShortfall;
} | {
    readonly ok: true;
    readonly projection: ActionProjection;
    readonly success: boolean;
    readonly civilianCasualties?: CasualtyBand;
    readonly risk?: RiskBranch;
    readonly consequence?: ResolvedConsequence;
    /**
     * Which authored step sequence this act plays out as, when one was
     * banked for the situation. Presentation only: the packet below already
     * carries every effect, and a staged act costs exactly what an unstaged
     * one costs.
     */
    readonly staged?: StagedResolution;
    readonly packet: EffectPacket;
};
export type ResolvedConsequence = {
    readonly id: string;
    readonly valence: ConsequenceValence;
    readonly beats: readonly string[];
};
export type ResolutionExtras = {
    readonly consequences?: readonly ConsequenceCard[];
    readonly context?: ConsequenceContext;
    /**
     * The step sequences this caller has. Most situations are not banked and
     * never will be, so an empty draw is ordinary rather than a failure.
     */
    readonly sequences?: readonly ResolutionSequenceEntry[];
};
/**
 * The matchup between two governments on one instrument, with no act proposed.
 *
 * A dossier needs the comparison before the player has picked a rung — what
 * their air force is against yours is a fact about the pair, not about a
 * decision — and it must be the same comparison the resolver will use when a
 * decision is made. So it is this function, and the projection calls the same
 * assembler. There is no second estimator here either.
 */
export declare function contestBetween(campaign: Campaign, actor: NationId, target: NationId, instrument: InstrumentId): Contest | undefined;
/** What a government's forces consist of, domain by domain, as this campaign currently holds them. */
export declare function liveForceDomains(campaign: Campaign, id: NationId): readonly ForceDomain[] | undefined;
/** What a government's arsenal is worth as a threat, as this campaign currently holds it. */
export declare function liveNuclearReading(campaign: Campaign, id: NationId): NuclearReading | undefined;
export declare const RISK_IDS: Readonly<Record<InstrumentId, readonly string[]>>;
/** The context a rung reads its gate and its effects from; shared with the success-effects reader. */
export declare function actionContext(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): InstrumentContext;
export declare function projectAction(campaign: Campaign, request: ResolutionRequest, streams: RngStreams): ProjectionResult;
export type EffectContribution = {
    readonly effects: readonly Effect[];
    readonly metricDeltas: MetricCost;
};
export declare function resolveAction(campaign: Campaign, request: ResolutionRequest, streams: RngStreams, source?: EffectSource, extras?: ResolutionExtras): ResolutionResult;
