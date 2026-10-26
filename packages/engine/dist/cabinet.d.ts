import type { PersonId, RoleId } from "@admin/world";
import { type Campaign, type PersonRuntime } from "./state.js";
import type { Effect } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
export type CabinetOutcome = "leak" | "challenge" | "resignation";
/** The same hazard as a weekly draw. */
export declare const ORDINARY_EXIT_RATE: number;
export declare function cabinetRiskRate(person: PersonRuntime["base"]): number;
/** The Chief of Staff's reading, 0..1: competence and loyalty, equally. Undefined with nobody in the job. */
export declare function chiefOfStaffReading(campaign: Campaign): number | undefined;
export declare function chiefOfStaffDiscipline(campaign: Campaign): number;
/** The odds this Secretary breaks this week, under the chief who is running the building. */
export declare function breakRateOf(campaign: Campaign, person: PersonRuntime["base"]): number;
export declare function cabinetOutcomeFor(person: PersonRuntime["base"]): CabinetOutcome;
/**
 * How this chair breaks, given who is sitting in it now.
 *
 * A Secretary who already leads a bloc of their own has nothing left to
 * declare, so a second break is not a second challenge: one prudent two-term
 * run counted thirteen repeat challenges from the same chairs, each billed to
 * the country's order as if a new faction had formed. It is a resignation. A
 * rival who has declared and still cannot carry the room takes the bloc out of
 * the building rather than going on leaking from inside it, and counting that
 * break as a leak left a founded cabinet losing fewer than two members a term
 * however far its break rate was raised: a raised rate only added leaks from
 * chairs that were never going to leave.
 */
export declare function cabinetOutcomeOf(holder: PersonRuntime): CabinetOutcome;
/**
 * How a chair was emptied of the person who held it.
 *
 * The first two leave a living person with no seat, and the difference between
 * them is the whole of what a former officer is: one walked out on the
 * President and one was pushed. A press room, a committee summons and a
 * scenario that wants a hostile witness all need to know which. A death in
 * office empties the chair by the same path, so content can gate on it too.
 */
export type CabinetDeparture = "resigned" | "dismissed" | "died";
/** The flag authored content gates on: `cabinet-departure:<how>:<role>`. */
export declare function departureFlag(departure: CabinetDeparture, role: RoleId): string;
/** The same fact about one person, so a file can say what became of them: `cabinet-departure:<how>:<role>:<person>`. */
export declare function personDepartureFlag(departure: CabinetDeparture, role: RoleId, person: PersonId): string;
export type FormerService = {
    readonly person: PersonId;
    readonly role: RoleId;
    readonly departure: CabinetDeparture;
};
/**
 * What became of a person who used to hold a chair, or nothing if they never did.
 *
 * Read off the flags rather than off a field on the person, for the reason the
 * flags exist: a departure is an event in the campaign's record, the corpus can
 * already gate on one, and a person record that carried it would be a second
 * copy of a fact the record already holds. The most recent departure wins,
 * which is the honest answer for somebody dismissed from one seat and
 * reappointed to another before walking out of that one.
 */
export declare function selectFormerService(campaign: Campaign, person: PersonId): FormerService | undefined;
/** The effects that empty a chair without ending the person in it. */
export declare function departureEffects(departure: CabinetDeparture, role: RoleId, person: PersonId, turn: number): readonly Effect[];
/**
 * What keeping this chair costs the government this week: the odds the phase
 * draws against, and the way the seat breaks if the draw goes against it.
 *
 * Derived on demand from the same gate the phase runs, never stored. Absent
 * for a chair the phase does not roll for at all, so a surface reading it has
 * no way to invent a risk for the player's own seat or an empty one.
 */
export type CabinetExposure = {
    readonly role: RoleId;
    readonly person: PersonId;
    /** The odds of a break this week. */
    readonly rate: number;
    readonly outcome: CabinetOutcome;
    /** The weekly draws left before the term ends. */
    readonly weeksLeft: number;
    /**
     * The chance the chair breaks at least once before the term ends, if nothing
     * about the person changes: `1 - (1 - rate)^weeksLeft`. Stated here so a
     * roster and a dossier read one figure rather than each compounding its own.
     */
    readonly restOfTerm: number;
};
/** The chance of at least one break in `weeks` independent weekly draws at `rate`. */
export declare function breakChanceOver(rate: number, weeks: number): number;
export declare function selectCabinetExposure(campaign: Campaign, role: RoleId): CabinetExposure | undefined;
/**
 * The same exposure asked for by person, for a surface that has a minister
 * rather than a chair.
 *
 * Takes the first seat that yields a reading rather than the first seat that
 * matches the person: the player's own persona holds a chair too, and matching
 * on the name alone would answer for that seat and report no exposure for the
 * ministry they actually run.
 */
export declare function selectCabinetExposureFor(campaign: Campaign, person: PersonId): CabinetExposure | undefined;
export declare const cabinetConsequencesPhase: TurnPhase;
export { factionEffects, factionFlag, factionPressure, projectFactionReconciliation, reconcileFaction, reconciledFlag, rivalFaction, selectFactions, type CabinetFaction, type FactionReconciliation, } from "./cabinet-faction.js";
