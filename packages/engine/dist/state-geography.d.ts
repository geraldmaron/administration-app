import type { PersonId, State } from "@admin/world";
import type { ChamberComposition, UsParty } from "./state-legislature.js";
import { type AdministrationStanding } from "./party.js";
/**
 * Something a state remembers, for or against the administration. Mirrors
 * `Grudge` on purpose — same fields, same decay shape — because a state's
 * memory and a nation's are the same kind of fact at a different scale, and a
 * reader who already knows how a grudge decays should not have to learn a
 * second vocabulary for a mark.
 *
 * Exactly two writers may ever land in a state's `marks`: a routed act
 * writes one directly, and an expired `PendingClaim` (below) writes one
 * through `statePhase`. A derived-neglect scan over live state (an
 * unanswered disaster condition, an unmet obligation) must not become a
 * third — that is the obligation ledger's job, and the obligation ledger
 * reads live state rather than journaling into this array. Both permitted
 * writers use this exact shape and nothing wider, which is what lets one
 * selector sum `weight * valence` over `marks` once and be a complete count,
 * rather than every consumer having to know which of several places a
 * state's grievance might be recorded.
 */
export type GrievanceMark = {
    readonly turn: number;
    /** Machine-readable slug a condition can name: "aid-withheld", "plant-closed". */
    readonly signature: string;
    readonly weight: number;
    readonly valence: 1 | -1;
    readonly decayRate: number;
    /** The player-facing sentence. A memory nobody can read is not a memory. */
    readonly reason: string;
};
/**
 * A promise the state is owed an explicit answer to, opened by a named act or
 * a named scenario reply — never by scanning history for a condition that
 * went unaddressed. That narrower reading is deliberate and load-bearing: a
 * general detector over live state is a second enumerator of the same
 * omission this expiry already produces once it fires, and this type exists
 * so nothing needs to build that second detector to answer "what did the
 * state not get". A derived question of that shape belongs to the obligation
 * ledger, which works from live state and needs no journal of its own; a
 * `PendingClaim` is reserved for the narrower fact that someone explicitly
 * told this state an answer was coming.
 *
 * When a claim expires unanswered, the phase that reads this array writes
 * exactly one `GrievanceMark` (`signature: "omitted:" + this.signature`,
 * `valence: -1`) and removes the claim. A claim answered before
 * `expiresTurn` — a routed or gazetteer effect landing on the state with a
 * matching `signature` and positive valence — is removed without a mark. A
 * given `signature` can be pending at most once per state at a time; a
 * reopened claim replaces rather than duplicates.
 */
export type PendingClaim = {
    readonly signature: string;
    readonly openedTurn: number;
    readonly expiresTurn: number;
    readonly weight: number;
    readonly reason: string;
};
/** One of a state's two senators, kept as a light figure rather than a person. */
export type SenateSeat = {
    readonly party: UsParty;
    readonly seatClass: 1 | 2 | 3;
    readonly disposition: number;
};
/**
 * A state's congressional bloc, apportioned out of the chamber's own
 * composition rather than modeled as individual members. `house` is a full
 * `ChamberComposition` so a state's own seats read the same way the
 * chamber's do; summed across every state it must equal
 * `congress.chambers.house` exactly, a fact the apportionment writer is
 * tested against rather than one this shape can enforce on its own.
 */
export type StateDelegation = {
    readonly house: ChamberComposition;
    readonly senate: readonly [SenateSeat, SenateSeat];
    readonly disposition: number;
};
export type GovernorStanding = {
    readonly person: PersonId;
    readonly party: UsParty;
    readonly disposition: number;
    /** The turn this governor took office. Absent on a bench seated at founding, which nobody was elected into. */
    readonly since?: number;
    /**
     * The day the current term runs out, as an ISO date.
     *
     * States do not all elect governors on the same cycle — two-year and four-year
     * terms, odd years and even — so a single "next election" rule read off the
     * federal calendar would put half the bench on the wrong ballot. Absent means
     * no term end is on file, never that the seat is safe.
     */
    readonly termEnds?: string;
    /**
     * Consecutive terms this governor has actually won, which is what a state's
     * own term limit is measured against.
     *
     * Counted from the campaign forward rather than from a career on file: how
     * long a governor had already served when the President took the oath is not
     * a fact the dataset carries, and a number invented for it would take a
     * governor off a ballot for a term nobody played. Absent means none have been
     * counted, which reads as "not term-limited" and is the honest answer.
     */
    readonly termsWon?: number;
    /**
     * What this governor remembers of the administration's answers to matters in
     * the state, on the disposition scale: it moves the standing the governor
     * settles toward, and fades. Absent means nothing remembered.
     */
    readonly answerTilt?: number;
};
/**
 * Deterministic eviction bounds for `marks` and `claims`. When a list would
 * exceed its bound, the writer drops the entry with the lowest `weight`,
 * ties broken by the lowest `turn`, ties broken by `signature` ascending —
 * fully ordered, so eviction is identical on every machine. The bound
 * numbers themselves are not fiction-time quantities the way decay rates
 * are: they cap magnitude and save size and hold at any pacing granularity.
 */
export declare const MAX_STATE_MARKS = 8;
export declare const MAX_STATE_CLAIMS = 3;
/**
 * Per-turn weight drop for a routed act's mark. Kept at 0.06 (~sixteen weeks of
 * life) rather than slowed to ~0.02: reachability comes from proportional lean
 * drift (STATE_LEAN_DRIFT), not from making every mark outlive the midterm.
 * Slowing this rate re-introduces state pairs that cannot reach each other.
 */
export declare const BASE_MARK_DECAY = 0.06;
/**
 * Per-turn weight drop for an omission mark. Half of BASE_MARK_DECAY so an
 * unanswered claim is remembered roughly twice as long as an act. The
 * asymmetry is deliberate: what a government failed to do outlasts what it did.
 */
export declare const OMISSION_DECAY = 0.03;
/**
 * How hard a unit of net mark weight displaces the lean anchor. Net weight ×
 * this scale, then clamped to ±GRIEVANCE_LEAN_CAP so a full mark stack cannot
 * rewrite a state's politics in one season.
 */
export declare const GRIEVANCE_LEAN_SCALE = 0.12;
export declare const GRIEVANCE_LEAN_CAP = 0.25;
/**
 * Signed lean displacement the live mark stack asks for. Derived every read —
 * never stored — so the anchor cannot disagree with the memory that justifies
 * it.
 */
export declare function grievanceLean(marks: readonly GrievanceMark[], standing: AdministrationStanding): number;
/**
 * Live per-state overlay. `base` is the authored snapshot and does not move;
 * everything else does. `delegation` and `governor` are optional rather than
 * defaulted, because a campaign can carry a state neither has been computed
 * for. `governor` is additionally and permanently absent for DC,
 * which has none; omitted rather than undefined, so a JSON save round-trips
 * the same shape it was written with, the same convention `CityRuntime`
 * already uses for `adminLean`.
 */
export type StateRuntime = {
    readonly base: State;
    readonly lean: number;
    /**
     * Live headcount, opened at `base.population`. The one writer is
     * `vitalsPhase` (`vitals.ts`), which distributes the nation's own
     * population delta across every state pro rata by population share and
     * then sums the states it just wrote back into the nation's figure — so
     * the two can never disagree, even where a floor at zero has to clamp one
     * of them.
     */
    readonly population: number;
    readonly delegation?: StateDelegation;
    /** Newest last. Bounded at MAX_STATE_MARKS; see the eviction rule above. */
    readonly marks: readonly GrievanceMark[];
    readonly claims: readonly PendingClaim[];
    readonly governor?: GovernorStanding;
    /** Governor's written Stafford request, tied to a live natural disaster. */
    readonly staffordRequest?: {
        readonly id: string;
        readonly conditionId: string;
        readonly cause: string;
        readonly requestedTurn: number;
        readonly beyondStateCapacity: boolean;
        readonly responsePlan: boolean;
        readonly resourcesCommitted: boolean;
        readonly costShareAccepted: boolean;
    };
    /** The President's separate major-disaster declaration under 42 U.S.C. §5170. */
    readonly staffordDeclaration?: {
        readonly id: string;
        readonly requestId: string;
        readonly declaredTurn: number;
    };
    /** A dated finding about accessible equipment for one future federal election. */
    readonly electionAccess?: {
        readonly electionTurn: number;
        readonly observedTurn: number;
        readonly actor: string;
        readonly responseDueTurn?: number;
        readonly response?: string;
        /** Share of polling places with compliant accessible equipment, 0..1. */
        readonly compliantShare: number;
        /** Additional share of all polling places the state can equip before the election, 0..1. */
        readonly installationCapacity?: number;
        /** A prospective court order can raise coverage; old election calls never re-read this. */
        readonly remediedShare?: number;
        /** Equipment installation completes only after this turn, if ordered. */
        readonly remedyDueTurn?: number;
    };
};
