import { projectAppropriation, type Campaign, type Chamber, type ElectionKind } from "@admin/engine";
import { type NationId } from "@admin/world";
import { type MetricStance } from "../format/figures";
export type ChamberReading = {
    readonly chamber: Chamber;
    readonly name: string;
    readonly seats: number;
    readonly administration: number;
    readonly opposition: number;
    readonly independent: number;
    /** What carries an ordinary measure, and what carries one over a veto. */
    readonly majority: number;
    readonly supermajority: number;
    /**
     * What it takes to reach the vote at all. Only the Senate has one — the
     * House closes debate by a rule its own majority writes — and it is the
     * number that actually decides whether ordinary legislation becomes law.
     */
    readonly cloture?: number;
    readonly holdsMajority: boolean;
};
/** Both chambers as they are actually composed, seat for seat. */
export declare function chamberReadings(campaign: Campaign): readonly ChamberReading[];
export type DispositionReading = {
    readonly value: number;
    readonly percent: string;
    readonly stance: MetricStance;
    /** With you / On merits / Cool / Against — the room's word, not a kicker. */
    readonly word: string;
    readonly verdict: string;
};
export declare const DISPOSITION_WORD: Readonly<Record<MetricStance, string>>;
/**
 * What Congress thinks of the administration, which is what every vote in this
 * room is really about — a nomination, a war and a budget all start from it.
 */
export declare function dispositionReading(campaign: Campaign): DispositionReading;
export type ElectionCountdownReading = {
    readonly kind: ElectionKind;
    readonly turnsAway: number;
    /** "The midterms in 12 weeks" / "Re-election this week" — chamber context, never a bare number. */
    readonly headline: string;
};
/**
 * The fixed date every count in this room is really run against.
 *
 * A chamber's composition today is a snapshot; the midterm is when it gets
 * recomposed around whatever this administration is standing on when it
 * lands. Undefined once the presidency's own future is settled — a defeated
 * or term-limited administration has no next election left to read toward.
 */
export declare function electionCountdownReading(campaign: Campaign): ElectionCountdownReading | undefined;
/** What a majority of the Electoral College is: 270 of 538, and never a fraction. */
export declare const ELECTORAL_MAJORITY: number;
export type VoteDriverReading = {
    /** The engine's own sentence for what moved the count. Never re-worded here. */
    readonly reason: string;
    /** The move as a share of the vote, the same unit every signed reading in the app carries. */
    readonly delta: number;
};
export type ElectionProjectionReading = {
    /** The administration's own share of the vote, 0..1, if it were held this week. */
    readonly share: number;
    /**
     * The Electoral College count that share wins on today's map. Undefined for a
     * campaign with no state runtimes, where the contest is settled on the
     * national share alone and a college figure would be invented.
     */
    readonly electoralVotes?: number;
    readonly electoralMajority: number;
    /** Whether the administration would hold the office on this reading. */
    readonly wouldHold: boolean;
    /** Every driver the engine names, largest move first, the anchor excluded. */
    readonly drivers: readonly VoteDriverReading[];
    /** The even split the count is built out of, kept separate from what moved it. */
    readonly anchor: number;
};
/**
 * What the country would do if it voted this week.
 *
 * `projectVote` is the engine's own count and the same one election night runs
 * on, so a president reading this is reading the instrument that will settle
 * it rather than a poll written beside it. The anchor driver is lifted out of
 * the list because it is the ballot's starting point rather than something the
 * administration did — leaving it in the drivers put "a country that starts out
 * evenly split, +50 points" at the top of every reading, which is the one line
 * in it that says nothing about this presidency.
 */
export declare function electionProjectionReading(campaign: Campaign): ElectionProjectionReading;
export type ElectionResultReading = {
    readonly id: string;
    readonly kind: ElectionKind;
    readonly turn: number;
    /** "The midterms" / "Re-election" — the same two words the countdown uses. */
    readonly title: string;
    readonly share: number;
    /** The engine's own sentence for what the night came to. */
    readonly summary: string;
    /** Midterms only: what the country did to each chamber, in seats. */
    readonly seats?: readonly {
        readonly chamber: Chamber;
        readonly name: string;
        readonly moved: number;
    }[];
    /** Presidential only, and absent on a term-limited ending where no contest was held. */
    readonly won?: boolean;
    /** True when no contest was held at all — two terms served, and not on the ballot. */
    readonly uncontested: boolean;
};
/**
 * Every contest this presidency has actually faced, newest first.
 *
 * Read off `termClock.elections`, which is the only record of them: an election
 * reaches the feed as one wire line that scrolls away, and before this the
 * midterm that cost an administration its House majority left no readable trace
 * anywhere in the app a week later.
 */
export declare function electionResultReadings(campaign: Campaign): readonly ElectionResultReading[];
/** The contest that settled this presidency, if one has been held. */
export declare function decidingElectionReading(campaign: Campaign): ElectionResultReading | undefined;
export type PresidencyEndingReading = {
    readonly ending: "removed" | "defeated" | "term-limited";
    readonly title: string;
    readonly sentence: string;
    readonly share?: number;
    readonly electoralVotes?: number;
    readonly electoralMajority?: number;
    /** Empty when the live count no longer matches the stored night. */
    readonly drivers: readonly VoteDriverReading[];
};
/** What the Desk shows once `selectEnding` is no longer in office. */
export declare function presidencyEndingReading(campaign: Campaign): PresidencyEndingReading | undefined;
export type UnauthorizedReading = {
    readonly id: string;
    readonly target: NationId;
    readonly targetName: string;
    readonly description: string;
    /** Weeks left on the sixty days before the force is owed out. */
    readonly weeksRemaining: number;
    /** The statutory window itself, in weeks — sixty days, as the resolution writes it. */
    readonly windowWeeks: number;
    /** How much of that window is gone. The dial needs both, not a bare count. */
    readonly weeksElapsed: number;
    /**
     * Whether the sixty days ran out on this target with the force still in and
     * no vote behind it. The obligation the statute leaves, not a spent clock.
     */
    readonly terminationOwed: boolean;
    readonly latitude: string;
    readonly whenItLapses: string;
    /**
     * The same ring the security room's Termination window draws, off the
     * report obligation this introduction opened — undefined only for a record
     * predating that obligation, or where the clock does not run at all (an
     * authorization has since covered it, or the force is already out).
     *
     * Read off the real `ReportObligation` rather than reconstructed from
     * `WAR_POWERS_WINDOW_TURNS`, so a player who opens the security room after
     * this one sees the same denominator rather than a second, differently
     * scaled clock for the same sixty days.
     */
    readonly termination?: {
        readonly windowDays: number;
        readonly daysElapsed: number;
        readonly statute: string;
    };
};
/**
 * Force used without a vote, and what the clock on it ends in.
 *
 * The clock does not end in relief. Section 1544(b) gives the President three
 * answers at day sixty and no fourth: Congress has voted, the certification has
 * bought thirty days to withdraw, or the force comes out. So a window that has
 * run out is an obligation standing against this administration rather than a
 * latitude restored, and the ladder stays shut while it stands. What is spent
 * either way is the record: it never lapses, and Congress computes what it
 * thinks of this administration from the count of them.
 */
export declare function unauthorizedReadings(campaign: Campaign): readonly UnauthorizedReading[];
export type AuthorizationStanding = {
    readonly id: string;
    readonly title: string;
    /**
     * The country the grant covers.
     *
     * Dropped from this projection until now, which made the same authorization
     * openable in one room and doorless in another: Congress iterates the raw
     * record and had the country in hand, the Desk reads it through here and did
     * not. The id cannot stand in — it is a composite of target and enacting
     * turn, and parsing the country back out of it would be a second definition
     * of that key living where nobody would look for one.
     */
    readonly target: NationId;
    readonly targetName: string;
    readonly weeksLeft: number;
    /** The grant's own term, and how much of it is spent — the dial's denominator. */
    readonly windowWeeks: number;
    readonly weeksElapsed: number;
};
export type WarPowersReading = {
    readonly authorizations: readonly AuthorizationStanding[];
    readonly unauthorized: readonly UnauthorizedReading[];
    readonly headline: string;
    readonly detail: string;
};
/**
 * Standing authorizations, actions taken without one, and what the pair means.
 *
 * Only authorizations still in force are shown — the same `selectActiveAuthorizations`
 * filter the war dossier reads before it will say force against a country is
 * covered. An authorization on file whose clock has already run out is not a
 * standing grant of anything; showing it here made this room say Congress had
 * authorized a war the dossier for that same war correctly called unauthorized.
 */
export declare function warPowersReading(campaign: Campaign): WarPowersReading;
export type AppropriationReading = {
    readonly onPriorYear: boolean;
    readonly weeksLeft: number;
    /**
     * The enacted book's own span, and how much of it is spent. Read off
     * `enactedTurn`/`throughTurn` rather than assumed to be a year: a continuing
     * resolution and a full appropriation are the same field with different
     * spans, and a dial that assumed the longer one would draw a stopgap as
     * barely started on the day it lapses. Zero on a prior-year year, which has
     * no book and so no window.
     */
    readonly windowWeeks: number;
    readonly weeksElapsed: number;
    readonly projection: ReturnType<typeof projectAppropriation>;
    readonly headline: string;
    readonly detail: string;
    readonly stance: MetricStance;
};
/**
 * The money, and what a refused budget actually means.
 *
 * A government whose appropriation fails does not stop. It runs on the prior
 * year's numbers — agencies plan nothing, contracts run month to month, and the
 * country loses a little footing every week it lasts. That is the consequence a
 * player has to be able to read before the vote, because it is the reason to
 * spend standing getting one passed.
 */
export declare function appropriationReading(campaign: Campaign): AppropriationReading;
