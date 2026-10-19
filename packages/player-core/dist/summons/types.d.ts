import type { AttentionSource, Campaign, GameDate } from "@admin/engine";
import type { SubjectRef } from "../shell/subject";
import type { AdvisorHref } from "../advisor/types";
import type { MetricStance } from "../format/figures";
import type { PlaceKey } from "../navigation/places";
/**
 * The summons: what the constitution puts on the President's calendar.
 *
 * An attention item is a standing condition — a war is on, a chair is empty.
 * A summons is a *dated obligation*: an appropriation lapses on a turn, an
 * acting officer's authority expires on a day, a report is owed inside 48
 * hours. The difference matters because a condition can be lived with and a
 * clock cannot: it runs out whether or not the president looks at it, and the
 * consequence of not looking is written into law rather than into mood.
 *
 * So a summons is composed, never authored. Every figure on it is read from
 * campaign state through an exported engine selector, and where the record is
 * empty the brief says so rather than inventing a first cycle that never ran.
 */
/** How close the clock is, which is the only thing that ranks one summons over another. */
export type SummonsUrgency = 
/** The turn has arrived or passed: the obligation is live now. */
"due"
/** Inside the last stretch of the window — soon enough to plan the week around. */
 | "closing"
/** On the calendar and worth knowing, but not this week's problem. */
 | "standing";
/**
 * Whether the clock owns the week's opening.
 *
 * An interruption stops ordinary play once, when the week opens. That is a
 * strong claim on the player's attention and is reserved for clocks whose
 * lapse is constitutionally irreversible — the money stops, the force must be
 * withdrawn, the seat is contested, the administration ends. Everything else
 * is a document: it lands in the inbox and waits to be read.
 */
export type SummonsClass = "interruption" | "document";
export type SummonsDue = {
    /** The turn the obligation lands. May be in the past for an already-lapsed clock. */
    readonly dueTurn: number;
    /**
     * The day it lands, which for half these clocks is the record and for the
     * other half is what the turn works out to.
     *
     * The statute is written in days — forty-eight hours to report, sixty days to
     * bring the force home, a date the country votes on — and a summons that
     * carried only the turn rounded all of it back into weeks, so a report owed in
     * two days and one owed in six read as the same obligation. Ranking is done on
     * this rather than on `dueTurn` for exactly that reason.
     */
    readonly dueDate: GameDate;
    readonly urgency: SummonsUrgency;
    /**
     * What the clock is materially about.
     *
     * Two readings sharing a subject are the same problem told twice, and the
     * engine's composer shows one of them. This is what replaced `badgedBy`: a
     * clock that names the same subject as a standing condition is that condition
     * on a deadline, not a second claim on the President.
     */
    readonly subject: string;
    /** The obligation named, in the fewest words that identify it. */
    readonly title: string;
};
/** A labeled row of what actually happened last time, read from the ledger or the record. */
export type SummonsHistoryLine = {
    readonly key: string;
    readonly label: string;
    readonly detail: string;
};
export type SummonsPosture = {
    readonly key: string;
    readonly caption: string;
    readonly figure: string;
    readonly stance?: MetricStance;
};
/**
 * The window a clock is actually written against, where a rule sets one.
 *
 * A summons always knows the turn it lands on. It does not always know how
 * long the window was — an election has a date and no window, an appropriation
 * lapses on a turn nobody started a countdown for. So this is optional, and
 * its absence is a real reading rather than a missing field: a folio that
 * cannot say what the denominator is does not draw a ring pretending to.
 *
 * `length` and `consumed` are given separately and never pre-divided, for the
 * reason the dial takes them that way: a caller cannot drop the denominator on
 * the way in.
 */
export type SummonsWindow = {
    readonly length: number;
    readonly consumed: number;
    readonly unit: "day" | "week";
    /** The rule that set it, already capitalized — "War Powers Resolution". */
    readonly statute?: string;
};
export type SummonsBrief = {
    readonly title: string;
    /** The clock as one sentence, and the headline figure the folio opens on. */
    readonly clockLine: string;
    readonly figure: string;
    readonly stance: MetricStance;
    /** What the record shows of the last time this clock came due. Empty when it never has. */
    readonly history: readonly SummonsHistoryLine[];
    readonly posture: readonly SummonsPosture[];
    /** The window behind the clock, where a rule sets one. Absent for a dated obligation with no countdown. */
    readonly window?: SummonsWindow;
    /** Prose from the owning place's own counsel composer, so counsel never forks. */
    readonly counsel: string;
    readonly door: SummonsDoor;
};
export type SummonsDoor = {
    readonly label: string;
    readonly href: AdvisorHref;
    /**
     * The durable record behind the door, where there is one.
     *
     * Carried beside the href rather than derived from it, so the folio can speak
     * the destination's own noun. Absent when the door opens a place: a clock
     * that pushes an order or a bill must not say "Opens policy." from the place
     * that owns it, which is a sentence read off the wrong fact.
     */
    readonly subject?: SubjectRef;
};
export type SummonsKind = "appropriation" | "shutdown" | "bill-desk" | "rule-effective" | "rule-disapproval" | "war-powers-report" | "war-powers-termination" | "aumf-expiry" | "nomination-stage" | "ruling-due" | "acting-authority" | "departure-transition" | "election-milestone" | "removal-beat" | "treaty-ratification";
/**
 * The half of a clock that can be read without writing a word of prose.
 *
 * Declared apart from `compose` because the attention loop asks every clock what
 * it is owed on every tick, and `compose` reaches the owning place's counsel. The
 * due half imports campaign state and arithmetic; nothing here can pull a place,
 * a door or a verdict in behind it.
 */
export type SummonsDueSpec = {
    readonly id: SummonsKind;
    /** The place the badge belongs to, which is the place that can actually answer the clock. */
    readonly owner: PlaceKey;
    readonly class: SummonsClass;
    /**
     * Which of the engine's sources of presidential attention this clock speaks
     * for, so a statutory deadline and a war reach the desk on one footing.
     */
    readonly source: AttentionSource;
    /**
     * Whether the President can actually answer this clock.
     *
     * A bill is signed, a name is sent up, a force is brought home. An election
     * day and the window Congress holds to undo a rule are dates: nothing the
     * office can do moves either of them. A clock with no answer never rises
     * above `ambient`, because a matter that stops the world and cannot be
     * resolved is a Continue that spends no time and never will.
     */
    readonly answerable: boolean;
    readonly due: (campaign: Campaign) => SummonsDue | undefined;
};
export type SummonsSpec = SummonsDueSpec & {
    /**
     * The clock named in a fixed few words, the same whatever it is about, for a
     * slot too narrow for the brief's title: the brief names the subject, and a
     * department's full name does not fit beside a figure.
     */
    readonly label: string;
    readonly compose: (campaign: Campaign) => SummonsBrief;
};
/** A spec that is currently due, carried with its reading so nothing is computed twice. */
export type Summons = {
    readonly spec: SummonsSpec;
    readonly due: SummonsDue;
    readonly brief: SummonsBrief;
};
/**
 * A clock as the Record reads it, which includes the ones that have stopped.
 *
 * A summons is not consumed by being answered: the appropriation that lapsed in
 * week eleven is a document the presidency has to be able to open again in week
 * forty. `due` is absent for a clock with no live subject, and the brief in that
 * case is the spec's own account of the quiet state — "no bill is on the desk" —
 * rather than a countdown against a record that no longer exists.
 */
export type SummonsReading = {
    readonly spec: SummonsSpec;
    readonly due?: SummonsDue;
    readonly brief: SummonsBrief;
};
