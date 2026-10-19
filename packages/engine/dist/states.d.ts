import { type State, type StateId } from "@admin/world";
import type { Campaign, StateRuntime } from "./state.js";
import { type AdministrationStanding } from "./party.js";
import type { TurnPhase } from "./turn-loop.js";
import type { RngStreams } from "./rng.js";
/**
 * Fraction of the lean→anchor gap closed each weekly turn.
 *
 * Proportional on purpose. The earlier absolute cap of 0.003/turn could close
 * at most ~0.048 of a gap over a mark's ~16-turn life at BASE_MARK_DECAY, while
 * grievanceLean may open a gap up to 0.25 — live lean could never reach the
 * anchor that justified the drift. At this rate a
 * held mark stack pulls lean most of the way into its anchor inside twenty
 * turns (same half-life shape as OPINION_DRIFT), and once marks decay the
 * anchor slides home and lean follows — a single mark is not permanent.
 */
export declare const STATE_LEAN_DRIFT = 0.06;
export declare const STATE_VOTE_LEVERAGE = 0.4;
/**
 * The fifty-one states as a campaign opens them. Given the campaign's streams,
 * each state's cohort mix is sampled around its authored values (see
 * `demographic-jitter.ts`); without them the authored values stand, which is
 * what a test that needs a fixed country asks for.
 */
export declare function openingStates(streams?: RngStreams): Readonly<Record<StateId, StateRuntime>>;
export declare function selectState(campaign: Campaign, id: StateId): StateRuntime | undefined;
/**
 * EV-weighted lean change since founding, times leverage, signed toward the
 * administration — and scaled by what an administration with no party can bank
 * of a partisan swing.
 */
export declare function selectUsStateVoteDriver(campaign: Campaign, standing: AdministrationStanding): number;
/**
 * The map, state by state.
 *
 * `nationalShare` is the administration's own share, not a Democratic one, and
 * each state's lean is read as alignment rather than as party identity. For a
 * Democrat or a Republican that is the same arithmetic it has always been. For
 * an independent every lean reaches them at three quarters of its strength, so
 * their map is flatter than a partisan's and still adds up to the country's own
 * count (`mapAlignment`).
 */
export declare function electoralVotesWon(campaign: Campaign, nationalShare: number, standing: AdministrationStanding): number;
/**
 * One week's lean step toward `anchor`. Anchor is `base.lean + grievanceLean(marks)`
 * once marks are live; callers share this formula with the
 * reachability proof.
 */
export declare function leanDriftDelta(current: number, anchor: number): number;
/** Omission weight: claim.weight × (0.5 + federalDependence × 0.5). */
export declare function omissionMarkWeight(claimWeight: number, federalDependence: number): number;
/**
 * Weekly housekeeping for every state, in order: mark decay, claim expiry into
 * omission marks (explicit PendingClaims only; never a live-disaster scan),
 * lean drift toward `base.lean + grievanceLean(marks)`. At most one packet per
 * state that moved.
 */
export declare const statePhase: TurnPhase;
export declare function houseSeatsInPlay(states: readonly State[]): number;
/**
 * One state as an election night called it.
 *
 * `electoralVotes` is carried on the call rather than looked up afterward,
 * because the number a night awarded is a fact about that night: apportionment
 * moves between censuses, and a record that re-derived it would rewrite an old
 * result.
 */
export type StateCall = {
    readonly state: StateId;
    /** The administration's share of the two-way vote, 0..1, whoever won: the opposition's is one minus it. */
    readonly share: number;
    readonly electoralVotes: number;
    /**
     * How many of them the administration took. Equal to `electoralVotes` where
     * the administration carried a winner-take-all state and zero where it did
     * not, and anything between in the two states that split them.
     */
    readonly administrationVotes: number;
    readonly winner: "administration" | "opposition";
    /** The rule the state appoints its electors under, as the dataset records it. */
    readonly allocation: "winner-take-all" | "by-district";
    /** Participation lost to inaccessible equipment, recorded only for a documented finding. */
    readonly access?: {
        readonly compliantShare: number;
        readonly affectedEligibleShare: number;
        readonly voteShareMovement: number;
    };
};
/**
 * What the ticket's own states are worth to it on the night.
 *
 * The record is unambiguous that a home state is worth something and modest
 * about how much: only four presidents have ever been elected while losing the
 * state they lived in, and losing candidates routinely carry theirs anyway
 * (Wikipedia, "Home state advantage", opened 2026-09-27). The asymmetry between
 * the two halves is sourced too — a running mate's home-state effect is
 * conditional on how much of their career was spent in that state's politics
 * rather than automatic, and it is the smaller of the two (Devine and Kopko,
 * "The Vice Presidential Home State Advantage Reconsidered", Presidential
 * Studies Quarterly, 2011; abstract opened via Crossref 2026-09-27).
 *
 * The two magnitudes below are a bounded design choice consistent with that
 * record, not a coefficient either source states. They are deliberately small
 * enough that a home state tilts a close state and never carries a hostile one:
 * three points and one point of a two-way share, against state leans that run to
 * a quarter of it.
 */
export declare const HOME_STATE_PRESIDENT = 0.03;
export declare const HOME_STATE_RUNNING_MATE = 0.01;
/**
 * How far the map puts each state from the country, in points of two-way share:
 * the alignment `administrationShare` reads plus the ticket's home-state tilt,
 * before any clamp. A state's call is the national share plus exactly this, so
 * a reading built on it cannot disagree with the map about which side of the
 * country a state sits on.
 */
export declare function stateShareShifts(campaign: Campaign): Readonly<Partial<Record<StateId, number>>>;
/**
 * The map as it would fall if the country voted `nationalShare` this week. A
 * projection, not a record: `stateCalls` is the night that was actually held.
 */
export declare function projectedStateCalls(campaign: Campaign, nationalShare: number): readonly StateCall[];
/**
 * How the map fell, state by state, on the last presidential night.
 *
 * Derived from the share the result itself stored rather than from a fresh
 * projection: the country keeps moving after a November, and a map recomputed
 * from this week's leans would redraw a settled election. Empty until a
 * presidential contest has actually been held, because before one there is no
 * night to report.
 *
 * `electoralVotesWon` is the sum of `administrationVotes` over exactly this
 * list, which is what makes the map and the total one statement instead of two
 * that agree by inspection.
 */
export declare function stateCalls(campaign: Campaign): readonly StateCall[];
