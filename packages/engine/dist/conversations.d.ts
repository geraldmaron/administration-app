import type { CivilianRisk } from "./strike-outcomes.js";
import type { TaskingRequest } from "./intelligence.js";
import type { ActionTiming } from "./action-timing.js";
import { type NationId, type PersonId, type RoleId } from "@admin/world";
import { type OrderSubject } from "./orders.js";
import { type AlignmentVector, type Campaign, type MetricSet } from "./state.js";
import type { Effect, EffectPacket, RelationshipScalars } from "./effects.js";
import type { ConversationScript } from "./conversation-script.js";
import { type PositionExposure } from "./position-exposure.js";
import { type PositionAssessment } from "./position-assessment.js";
import type { RngStreams } from "./rng.js";
import type { CapacityCost, Consultee, InstrumentId, RungLevel } from "./instruments.js";
import type { Contest } from "./contest.js";
import type { ForceCostBasis } from "./force-costs.js";
import { type ConflictConsequence, type ConflictMove, type DeterrenceAssessment } from "./conflicts.js";
import { type MetricCost, type ResolutionExtras, type Ripple, type RippleVisibility, type RiskBranch } from "./resolution.js";
import type { StagedResolution } from "./resolution-sequence.js";
export type ConversationTone = "conciliatory" | "firm" | "principled" | "evasive" | "coercive";
export type SpeakerRef = {
    readonly kind: "cabinet";
    readonly role: RoleId;
} | {
    readonly kind: "player";
} | {
    readonly kind: "counterpart";
} | {
    readonly kind: "narrator";
};
export type ScriptedBeat = {
    readonly speaker: SpeakerRef;
    readonly text: string;
};
/**
 * How far one spoken answer may move a relationship.
 *
 * A position is words, and words that could move trust as far as an act of
 * state would make the coercive ladder decorative: the cheapest rung of the
 * ladder moves a relationship by about this much, and it costs a roll, a
 * capability check and a public act to do it. A reply may reach the world; it
 * may not out-punch the instruments.
 */
export declare const POSITION_RELATIONSHIP_LIMIT = 0.15;
/**
 * The fields a spoken answer may move. Trade dependence and alignment are
 * absent on purpose: neither is a thing a government can say into being — one
 * is what the ports actually carry and the other is what the two states
 * actually want.
 */
export type PositionRelationshipDeltas = Partial<Pick<RelationshipScalars, "trust" | "tension" | "militaryThreat">>;
export type ReplyCommitment = {
    readonly kind: "instrument";
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    /**
     * Effects content already resolved for this answer (e.g. a domestic
     * signature routed at cast). Spliced onto the instrument packet after
     * resolveAction, the same way a position's `resolved` rides beside cost.
     */
    readonly resolved?: readonly Effect[];
    /**
     * The room answering the order at the moment it is given, before the
     * dice. An instrument's outcome already has a voice — the resolver's
     * narration, a drawn card, a staged sequence — but the order itself used
     * to land in silence, and a real room does not go quiet when the
     * president commits: somebody acknowledges, names the first friction,
     * puts a dissent on the record. Spoken before the aftermath, and written
     * blind to it — the line must be true whichever branch resolves.
     */
    readonly rejoinder?: ScriptedBeat;
} | {
    readonly kind: "position";
    readonly importSuspensionDays?: number;
    readonly cost: MetricCost;
    readonly pull?: Partial<AlignmentVector>;
    readonly remembered: string;
    readonly relationship?: PositionRelationshipDeltas;
    readonly conflictMove?: ConflictMove;
    readonly collection?: {
        readonly action: "close";
        readonly tasking: string;
    } | {
        readonly action: "task";
        readonly request: TaskingRequest;
    };
    readonly relief?: Extract<OrderSubject, {
        kind: "state";
    }>;
    /** Authored relief reply remains visible but disabled when its report has no lawful allocation. */
    readonly reliefRefusal?: string;
    readonly locale?: {
        readonly act: "relief" | "review";
        readonly state: import("@admin/world").StateId;
        readonly cause: import("./condition-kinds.js").ConditionKind;
    };
    readonly transmit?: string;
    readonly billText?: {
        readonly id: string;
        readonly act: string;
        readonly title: string;
        readonly introducedTurn: number;
        readonly stage: "markup" | "conference";
        readonly text?: import("./state.js").Bill["text"];
    } & ({
        readonly action: "propose";
    } | {
        readonly action: "recommend";
        readonly choice: import("./state.js").BillText;
    });
    readonly judicialNomination?: {
        readonly institution: import("./institutions.js").InstitutionId;
        readonly office: import("./institutions.js").OfficeId;
        readonly title: string;
        readonly vacancyOpenedDay: number;
        readonly nominee: import("@admin/world").PersonId;
        readonly nomineeName: string;
    };
    readonly orderRescission?: {
        readonly proceedingId: string;
        readonly recordId: string;
        readonly orderId: string;
        readonly filedTurn: number;
        readonly stage: import("./state-judiciary.js").CourtStage;
        readonly orderName: string;
        readonly question: string;
    };
    readonly orderReview?: {
        readonly proceedingId: string;
        readonly recordId: string;
        readonly orderId: string;
        readonly filedTurn: number;
        readonly orderName: string;
        readonly question: string;
        readonly ruleState: "unimplemented" | "operative";
        readonly choice: "accept" | "seek" | "seek-with-stay";
    };
    readonly tariff?: {
        readonly target: NationId;
        readonly sector: import("./trade-sectors.js").TradeSectorId;
        readonly rate: number;
        readonly answering?: string;
        readonly sourceSector?: string;
        readonly sourceRate?: number;
        readonly sourceTurn?: number;
    };
    readonly tariffLift?: {
        readonly ours: {
            readonly measure: import("./trade.js").TradeMeasureId;
            readonly sector: string;
            readonly rate: number;
            readonly imposedTurn: number;
        };
        readonly theirs?: {
            readonly measure: import("./trade.js").TradeMeasureId;
            readonly sector: string;
            readonly rate: number;
            readonly imposedTurn: number;
        };
    };
    readonly directive?: {
        readonly matterId: string;
        readonly institution: import("./institutions.js").InstitutionId;
        readonly openedTurn: number;
        readonly matterSubject: string;
    } & ({
        readonly kind: "investigation" | "enforcement-posture";
        readonly subject: string;
    } | {
        readonly kind: "inspector-removal-notice";
        readonly reason: string;
    });
    readonly rejoinder?: ScriptedBeat;
    /**
     * Effects the content layer has already resolved for this answer, applied
     * alongside the priced cost above.
     *
     * This is how a declared impact — what the decision did to people and to
     * money — reaches the board. The resolution itself belongs to content
     * (`@admin/content`'s impact model), because it reads bands the engine has
     * no vocabulary for and prices them against the dataset; the engine's part
     * is to apply what it is handed, which is the only direction the
     * dependency rule permits.
     *
     * Bounded by that same rule rather than by a type: content may only ever
     * produce effects it is already allowed to produce, and the impact model
     * emits opinion and treasury movement alone.
     */
    readonly resolved?: readonly Effect[];
    /**
     * What the answer commits of the government's own capacity to act next,
     * in the content layer's own words.
     *
     * The half of a declared impact that prices nothing, and so reached the
     * board through no effect at all: a president who committed forces or
     * burned a source was shown it before choosing and had no record of it
     * afterwards. Carried opaquely and written straight onto the packet, so
     * the vocabulary stays where it is authored.
     */
    readonly institutional?: readonly string[];
} | {
    readonly kind: "join";
    readonly side: "beside" | "against";
    readonly rejoinder?: ScriptedBeat;
};
export type ReplyOption = {
    readonly id: string;
    readonly tone: ConversationTone;
    readonly text: string;
    readonly commitment: ReplyCommitment;
};
export type { ConversationScript } from "./conversation-script.js";
export type ResolvedSpeaker = {
    readonly kind: "official";
    readonly role: RoleId;
    readonly person: PersonId;
    readonly name: string;
} | {
    readonly kind: "player";
    readonly name: string;
    readonly title: string;
} | {
    readonly kind: "vacant";
    readonly role: RoleId;
} | {
    readonly kind: "counterpart";
    readonly nation: NationId;
    readonly name: string;
    readonly person?: PersonId;
} | {
    readonly kind: "narrator";
};
export type ConversationBeat = {
    readonly speaker: ResolvedSpeaker;
    readonly text: string;
};
export type ReplyProjection = {
    readonly timing?: ActionTiming;
    readonly civilianRisk?: CivilianRisk;
    readonly option: ReplyOption;
    readonly available: boolean;
    readonly missingCapability?: string;
    /**
     * What the current board will actually be charged, not the authored
     * magnitude. `apply()` floors budget authority at zero and clamps every other
     * metric into 0..1, so a debit larger than the balance is not a debit — it is
     * the balance, and a quote that stated the larger figure advertised a price
     * the simulation could not charge.
     */
    readonly cost: MetricCost;
    /**
     * The metrics whose authored debit was larger than what is left to spend.
     * The quote above is already the smaller, true figure; this is what lets the
     * surface say "there is none left" rather than silently print a magnitude
     * nobody recognizes as clamped.
     */
    readonly exhausted?: readonly (keyof MetricSet)[];
    readonly successChance?: number;
    readonly successExposureChance?: number;
    /** The matchup the odds were read off. Absent on a reply with no attempt in it. */
    readonly contest?: Contest;
    readonly risks: readonly RiskBranch[];
    /**
     * What a spoken answer commits the administration to that no roll decides.
     * Present only on a position, which is the reply kind that has no risk branch
     * to name and, until this existed, nothing at all under "if it goes wrong".
     */
    readonly exposure?: readonly PositionExposure[];
    /**
     * The price split by who decides it: what the President spends, exact, and
     * what the answer is assessed to do to the country, as bands the realized
     * figure will be measured against on the Record. Present only on a position.
     */
    readonly assessment?: PositionAssessment;
    readonly ripples: readonly Ripple[];
    readonly rippleVisibility: RippleVisibility;
    readonly deterrence?: DeterrenceAssessment;
    readonly conflict?: ConflictConsequence;
    readonly consultation?: readonly Consultee[];
    readonly capacity?: CapacityCost;
    /** How a military rung's money was reached, as the instrument projection stated it. */
    readonly costBasis?: ForceCostBasis;
};
export type { PositionExposure };
export type ConversationThread = {
    readonly script: ConversationScript;
    readonly beats: readonly ConversationBeat[];
    readonly replies: readonly ReplyProjection[];
};
export declare function assertPlayable(script: ConversationScript): void;
export { resolveSpeaker } from "./conversation-speaker.js";
export declare function projectReply(campaign: Campaign, script: ConversationScript, option: ReplyOption, streams: RngStreams): ReplyProjection;
export declare function openConversation(campaign: Campaign, script: ConversationScript, streams: RngStreams): ConversationThread;
export type ReplyOutcome = {
    readonly packet: EffectPacket;
    readonly beats: readonly ConversationBeat[];
    readonly staged?: StagedResolution;
};
export type ReplyResult = {
    readonly ok: false;
    readonly missingCapability: string;
} | ({
    readonly ok: true;
} & ReplyOutcome);
export declare function commitReply(campaign: Campaign, script: ConversationScript, option: ReplyOption, streams: RngStreams, extras?: ResolutionExtras): ReplyResult;
