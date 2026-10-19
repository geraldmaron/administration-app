import { type DistrictId, type StateId } from "@admin/world";
import type { Campaign, Congress, GrievanceMark, StateDelegation, StateRuntime, UsMajorParty, UsParty } from "./state.js";
import type { ChamberComposition } from "./state-legislature.js";
import type { TurnPhase } from "./turn-loop.js";
/** How far a bloc moves toward its target in one week. Slower than a member (0.03). */
export declare const DELEGATION_DRIFT = 0.02;
/**
 * How far a state's live lean carries its bloc from the room's disposition.
 * Slightly softer than a named member's caucus tilt (0.16): a bloc turns as a
 * mean, not as a person with a future of their own.
 */
export declare const CAUCUS_TILT_STATE = 0.12;
/** How hard the live mark stack pulls a bloc's disposition target. */
export declare const GRIEVANCE_WEIGHT = 0.12;
/**
 * Lean is Dem ← → Rep; sign it toward the caucus anchor.
 *
 * Structural, not political: this is how many of a state's members sit with
 * each caucus, which is a fact about the state. How much of that caucus the
 * president can call on is `administrationAlignment`, and the two are only the
 * same number when the president belongs to a party.
 */
export declare function leanTowardAnchor(lean: number, caucusAnchor: UsMajorParty): number;
/**
 * How the live mark stack reads for disposition, −1..1. Separate from
 * `grievanceLean` (which displaces the lean anchor): same marks, different
 * consequence — mood of the bloc rather than where the state's politics sit.
 */
export declare function grievanceReading(marks: readonly GrievanceMark[]): number;
/**
 * What a state's congressional bloc settles toward this week.
 *
 * Room disposition is the baseline; lean and marks displace it. `beliefReading`
 * is the T9 term (partyReading of the caucus against the last signature) and
 * defaults to 0 until that reader is wired.
 */
export declare function delegationTarget(congress: Congress, state: StateRuntime, beliefReading?: number): number;
/**
 * One step toward the target. Within one DELEGATION_DRIFT, land exactly —
 * same snap rule as members and governors.
 */
export declare function driftDelegation(delegation: StateDelegation, target: number): StateDelegation;
export declare function senateClassesOf(id: Exclude<StateId, "DC">): readonly [1 | 2 | 3, 1 | 2 | 3];
/**
 * Who seats a senate seat that is not being contested.
 *
 * A senate election settles one third of the chamber. The other two thirds are
 * not up, and an apportionment that re-derived all hundred seats from the
 * night's national swing would quietly move seats nobody voted on — the defect
 * this hook exists to close. `undefined` means the seat is free to be seated by
 * the apportionment below.
 */
export type SenateSeatHolder = (state: Exclude<StateId, "DC">, seatClass: 1 | 2 | 3) => UsParty | undefined;
/**
 * The chamber the player inherits: Classes 1 and 2 as the source recorded them,
 * Class 3 left free.
 *
 * Class 3 was decided in the November before the oath, which in this game is
 * the founding's own mandate — so it is the third the opening apportionment
 * seats from the composition W1 handed it, and the other two thirds are the
 * real map.
 */
export declare const openingSenateHolder: SenateSeatHolder;
/** Holds every class but `contested`, at the party the state's live delegation carries. */
export declare function senateHolderExcept(contested: 1 | 2 | 3, states: Readonly<Record<StateId, StateRuntime>>): SenateSeatHolder;
/**
 * Derive every state's congressional bloc from the live chambers: the House
 * from the seats as they were held, moved to the chamber's counts; the Senate
 * from the leans with the classes not up held where they are. Pure and
 * seed-independent: same congress and same states give an identical table.
 */
export declare function apportionDelegations(congress: Congress, states: Readonly<Record<StateId, StateRuntime>>, heldSenate?: SenateSeatHolder): Readonly<Record<StateId, StateDelegation>>;
/** Write the apportioned table onto a state map. Founding and recompose only. */
export declare function withApportionedDelegations(congress: Congress, states: Readonly<Record<StateId, StateRuntime>>, heldSenate?: SenateSeatHolder): Readonly<Record<StateId, StateRuntime>>;
/** Sum of house seats across every state, including DC's zeros. */
export declare function sumHouseDelegations(states: Readonly<Record<StateId, StateRuntime>>): ChamberComposition;
/** Sum of senate seat parties across the fifty states (DC excluded). */
export declare function sumSenateDelegations(states: Readonly<Record<StateId, StateRuntime>>, caucusAnchor: UsMajorParty): ChamberComposition;
/**
 * Weekly drift of every apportioned bloc toward its target. Lives after
 * congressPhase so the baseline is this week's room disposition (ARCHITECTURE
 * slot 17). Governor drift stays a sibling call in turn-phases until T21
 * absorbs both into one composed packet; both already occupy the same slot.
 */
export declare const delegationPhase: TurnPhase;
/**
 * Which party holds a given congressional district.
 *
 * The apportionment above splits a state's seats by party and stops there: it
 * knows Ohio sends nine Republicans and six Democrats and cannot say which nine
 * districts they are, and a district room, a primary challenge and a
 * redistricting fight all need the seat itself rather than the state's total.
 *
 * The seated delegation is what answers it: a state that sends nine Republicans
 * sends them from its nine most Republican districts and its Democrats from the
 * other end, which is the ranking an election flips seats along.
 * The authored `incumbentParty` is deliberately not read — it is a sign-of-lean
 * reading fixed at authoring time, so it would disagree with the chamber the
 * moment a midterm moved a seat, and the district page would print a holder the
 * delegation says does not exist.
 *
 * Undefined for a district whose seat the delegation puts with an independent,
 * and for a state whose delegation has not been apportioned: neither is a major
 * party holding the seat, and neither is a party this can name.
 */
export declare function districtHolder(campaign: Campaign, district: DistrictId): UsMajorParty | undefined;
