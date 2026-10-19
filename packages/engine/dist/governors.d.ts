import { type NationId, type PartyId, type StateId } from "@admin/world";
import type { Campaign, GameDate, GovernorRaceResult, GovernorStanding, PersonRuntime, StateRuntime, UsParty } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type TurnPhase } from "./turn-loop.js";
import { type Term, type Willingness, type WillingnessProjection } from "./willingness.js";
/** Map a US charter PartyId onto the chamber UsParty vocabulary. */
export declare function usPartyFromPersonParty(party: PartyId | string | undefined): UsParty;
/** The seated governor for a state, if founding (or a later seat) put one there. */
export declare function governorPersonOf(people: Readonly<Record<string, PersonRuntime>>, state: StateId): PersonRuntime | undefined;
/**
 * The next November this state elects a governor, on or after `from`.
 *
 * Projected off the sourced row rather than read off the federal calendar: the
 * table states one election the state actually holds and how long the term it
 * decides runs, and every later one is that date plus a whole number of terms.
 * That is what puts 36 statehouses on a midterm, eleven on a presidential year,
 * Virginia and New Jersey on the November after a presidential election and
 * Kentucky, Louisiana and Mississippi on the one before — none of which a single
 * "every four years from now" rule can say at once.
 */
export declare function nextGubernatorialElection(state: StateId, from: GameDate): GameDate | undefined;
/** Every state whose governor is on today's ballot. Empty on all but a handful of days. */
export declare function governorRacesDueToday(campaign: Campaign): readonly Exclude<StateId, "DC">[];
/**
 * Every state whose governor is on this week's ballot, in a year with no federal
 * election in it.
 *
 * The week rather than the day, and only the odd years. A governors' night in an
 * even year is part of the federal result the run stops the player on, and it is
 * settled inside that result on its own date. An odd year has no federal result
 * and no stop, so the night is one of the week's own settlements — and a weekly
 * settlement is the only thing that lands in the same place in the ledger whether
 * the week runs as one list or as seven office days. Filed from the day loop
 * instead, it arrived between two of the following week's phases while carrying
 * the closed week's turn.
 *
 * The window is the seven days from the week's open, which is the same seven days
 * under both layouts even though the phase runs on day 6 of one and day 7 of the
 * other.
 */
export declare function governorRacesDueThisWeek(campaign: Campaign): readonly Exclude<StateId, "DC">[];
/**
 * Derive standing from the seated person and the state's live delegation.
 * Opens (and re-seats) at the delegation's disposition so the two start agreed.
 *
 * `termEnds` is the November this seat is next contested, carried on the
 * standing so nothing downstream has to re-derive a date the seating already
 * knew — and so a governor a year from their own voters reads that way on the
 * Desk without the Desk owning the calendar.
 */
export declare function deriveGovernorStanding(person: PersonRuntime, delegationDisposition: number, termEnds?: GameDate): GovernorStanding;
/** Read the standing already on the state, or undefined for DC / unseated. */
export declare function selectGovernor(campaign: Campaign, id: StateId): GovernorStanding | undefined;
/**
 * Stamp every non-DC state with a GovernorStanding derived from its seated
 * person and its already-apportioned delegation. Called at founding after
 * withApportionedDelegations and withGovernorSeats.
 */
export declare function withSeatedGovernors(states: Readonly<Record<StateId, StateRuntime>>, people: Readonly<Record<string, PersonRuntime>>, opened?: GameDate): Readonly<Record<StateId, StateRuntime>>;
/**
 * One step toward the delegation's live disposition, same rate and snap rule
 * the chamber uses: within one step, land on the target exactly.
 */
export declare function driftGovernorStanding(standing: GovernorStanding, target: number): GovernorStanding;
/** Weeks for a governor's memory of the administration's answers to halve. A design value; the balance run sizes it. */
export declare const GOVERNOR_TILT_HALF_LIFE_WEEKS = 26;
/**
 * Weekly drift: each seated governor moves toward that state's delegation
 * disposition plus what it remembers of the administration's answers in the state
 * disposition. Sibling of `delegationPhase` in turn-phases (ARCHITECTURE slot
 * 17); T21 may compose them into one packet. The slot after congressPhase is
 * intentional so the target is this week's chamber mood.
 */
export declare const governorPhase: TurnPhase;
/** The midpoint the delegation-derived disposition is measured against. */
export declare const GOVERNOR_CONSENT_THRESHOLD = 0.5;
/**
 * How much of the answer the draw may decide.
 *
 * Small on purpose: structure decides a governor's answer, and a noise band wide
 * enough to overturn the party term would make the same request from the same
 * President to the same statehouse come out differently for no reason anyone
 * could read back.
 */
export declare const GOVERNOR_NOISE_BOUND = 0.03;
/** What the federal government is asking the statehouse for. */
export type GovernorAsk = {
    /**
     * How bad the thing in front of them is, 0..1 — a condition's severity, or
     * zero where nothing is under way and the request is political rather than
     * operational.
     */
    readonly severity: number;
    /** Named for the record the refusal leaves, not read by the arithmetic. */
    readonly of: string;
};
/**
 * Whether the state's own constitution takes the sitting governor off the ballot.
 *
 * Counted from `termsWon`, which only the game's own elections write, so a
 * governor seated at founding is never term-limited: how long they had already
 * served is not on file, and inventing it would bar somebody from a ballot for a
 * term nobody played.
 */
export declare function governorIsTermLimited(campaign: Campaign, state: StateId): boolean;
/**
 * The six terms a governor's answer is made of.
 *
 * Exported because the forecast and the decision must be built from one list:
 * the whole reason `projectWillingness` exists is that a player is shown the same
 * sum the world is about to take, and two call sites assembling their own terms
 * is how that stops being true.
 */
export declare function governorConsentTerms(campaign: Campaign, state: StateId, ask: GovernorAsk): readonly Term[];
/** The answer, with the one draw the question is allowed. */
export declare function governorWillingness(campaign: Campaign, state: StateId, ask: GovernorAsk, streams: RngStreams): Willingness;
/** The same sum with no draw in it: what a screen may show before the ask is made. */
export declare function projectGovernorWillingness(campaign: Campaign, state: StateId, ask: GovernorAsk): WillingnessProjection;
export type GovernorAnswer = {
    readonly consents: boolean;
    readonly willingness: Willingness;
    /**
     * The record of the answer. Carries the stamp on its provenance and no state
     * effect: a governor saying yes or no changes nothing by itself, and what has
     * to survive is the reason, which is what the ledger is.
     */
    readonly packet: EffectPacket;
};
/**
 * A governor's answer and the record it leaves.
 *
 * One producer for both call sites, so a refusal read on the Desk and a refusal
 * that forced a federalization are the same event with the same reasons rather
 * than two sites that each built their own.
 */
export declare function governorAnswer(campaign: Campaign, state: StateId, ask: GovernorAsk, streams: RngStreams): GovernorAnswer;
/**
 * Which state each governor is seated in.
 *
 * Seats used to be handed out by alphabetical accident, so a Democrat governed
 * Wyoming as often as not. Party is a fact about a person the pool already
 * carries and lean is a fact about a state the dataset already authors, and a
 * seating that ignored both printed a contradiction on the state's own file.
 *
 * Three passes, safest seats first. A state with a clear lean takes a governor
 * of that party; a swing state takes whichever party it tilts toward; only
 * then does anyone left fill a chair, because an unseated statehouse is a
 * worse lie than an off-lean governor. An independent is seated only once both
 * parties' benches are empty, which the bench's own party floor makes rare: the
 * fifty governors the record holds are all Democrats and Republicans. Nothing
 * here is random: the same seed still seats the same people.
 */
export declare function seatGovernorsByLean(people: Readonly<Record<string, PersonRuntime>>, nation: NationId): Readonly<Record<string, PersonRuntime>>;
export type GovernorRaceOutcome = {
    readonly result: GovernorRaceResult;
    readonly effects: readonly Effect[];
};
export type GovernorNight = {
    readonly results: readonly GovernorRaceResult[];
    readonly effects: readonly Effect[];
};
/** Every statehouse on today's ballot: the even-year night, inside the federal result. */
export declare function holdGovernorRacesDueToday(campaign: Campaign, turn: number): GovernorNight;
/** Every statehouse on this week's ballot: the odd-year night, one of the week's settlements. */
export declare function holdGovernorRacesThisWeek(campaign: Campaign, turn: number): GovernorNight;
/** How a governors' night reads in one line, for the feed and the result's own summary. */
export declare function describeGovernorNight(results: readonly GovernorRaceResult[], campaign: Campaign): string;
