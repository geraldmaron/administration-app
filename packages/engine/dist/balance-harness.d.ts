import { type Charter, type IdeologyVector } from "@admin/world";
import { type EffectPacket } from "./effects.js";
import { type FoundingChoices } from "./founding.js";
import type { CabinetOutcome } from "./cabinet.js";
import type { Pledge } from "./pledges.js";
import type { AdministrationParty } from "./state-legislature.js";
import { type InstrumentId, type RungLevel } from "./instruments.js";
import { type ProxyProfile, type SkillProxy } from "./balance-proxies.js";
import { type HarnessPlatform } from "./balance-platform.js";
import { type CampaignEnding } from "./elections.js";
import { type Campaign, type ConditionKind, type ConditionScope, type MetricSet } from "./state.js";
import { type TurnPhase } from "./turn-loop.js";
import type { ApprovalMovement } from "./opinion-movement.js";
import { type AttributedMetric, type MetricAttribution, type StretchShare } from "./stability-attribution.js";
/**
 * Stand-ins for how a person plays, since there is no human in a test.
 *
 * The population and every dial that defines it live in `balance-proxies.ts`;
 * re-exported here because the harness has always been the import site and a
 * second one would only mean two ways to name the same player.
 */
export { SKILL_PROXIES, BRACKET_PROXIES, PROXY_PROFILES, type SkillProxy, type ProxyProfile } from "./balance-proxies.js";
export { candidateTargetsForBalance } from "./balance-choice.js";
/** A year of weekly turns — the horizon a campaign is balanced against. */
export declare const HORIZON_TURNS = 52;
/**
 * The horizon that actually reaches the dates the term bends around.
 *
 * `HORIZON_TURNS` is a year, which is the right length for the questions the
 * standing gate asks — removal, the tradeoff mix, whether governing beats not
 * governing — and the wrong length for every question about elections, because
 * the first midterm falls at turn 104 and the contest at 208. Measured at 52
 * turns, the seat swing, the incumbency edge and the constitutional record's
 * drag were arithmetic no campaign in the gate had ever executed. This horizon
 * runs both terms out and one week past the second contest, so a campaign that
 * is never removed and never defeated ends `term-limited` rather than simply
 * stopping mid-term with its clock unread.
 */
export declare const TERM_HORIZON_TURNS: number;
export type CampaignOutcome = {
    readonly seed: string;
    /**
     * The proxy that played it. A profile a measurement builds for itself has no
     * name in the population, so it reads "profile" and the measurement that
     * built it keeps its own label.
     */
    readonly skill: SkillProxy | "profile";
    readonly removed: boolean;
    readonly removalTurn?: number;
    readonly turnsPlayed: number;
    readonly finalPressure: number;
    readonly peakPressure: number;
    readonly beats: number;
    readonly opening: MetricSet;
    readonly final: MetricSet;
    readonly metricSeries: readonly MetricSet[];
    readonly actionsAttempted: number;
    readonly actionsLanded: number;
    /** Turns where the agent had at least one option it could actually afford and pass. */
    readonly turnsWithOptions: number;
    /** Turns whose best option was a free win: high odds, negligible cost, no ripple. */
    readonly freeWinTurns: number;
    /** Turns where every option carried either poor odds or a ripple somebody pays for. */
    readonly tradeoffTurns: number;
    readonly instrumentUse: Readonly<Record<InstrumentId, number>>;
    readonly rungUse: Readonly<Record<RungLevel, number>>;
    /** How the presidency stood when the run ended, in the engine's own word. */
    readonly ending: CampaignEnding;
    /** Whether this campaign's charter puts its executive on a ballot at all. */
    readonly electoral: boolean;
    /** Every fixed date this campaign actually reached, in the order it reached them. */
    readonly elections: readonly ElectionRecord[];
    /** The party the President ran as. */
    readonly party: AdministrationParty;
    /** How often the cabinet broke, by the way it broke, over the campaign as played. */
    readonly cabinetBreaks: Readonly<Record<CabinetOutcome, number>>;
    /** Stories that broke, and the weeks one or more of them was live. */
    readonly scandals: {
        readonly broken: number;
        readonly liveWeeks: number;
        readonly origins: Readonly<Record<string, number>>;
    };
    /**
     * Every condition the player's own country lived through.
     *
     * A claim about a standing kind is a claim about how often it opens and how
     * long it stays, and neither is visible in any per-turn metric: a metric
     * series records what the country felt, not what was happening to it. The
     * ledger the run leaves behind is the only place both are readable.
     */
    readonly conditions: readonly ConditionSpell[];
    /** The platform's promises as the run left them; empty for a run founded on no platform. */
    readonly pledges: readonly Pledge[];
    /** What the President ran on, so every figure can be read against the promises behind it. */
    readonly platform: HarnessPlatform;
    /** Which judgments moved approval over the run, and by which road (the owner's driver-share report). */
    readonly approvalMovement: ApprovalMovement;
    /** Which stretch of the week moved the country's order and the money, falls and rises apart. */
    readonly metricMovement: MetricAttribution;
};
/** One condition's life, flattened to the figures a distribution can be taken over. */
export type ConditionSpell = {
    readonly kind: ConditionKind;
    readonly scope: ConditionScope;
    readonly startedTurn: number;
    /** Weeks it ran. A spell still open at the end counts to the last turn played. */
    readonly dwellTurns: number;
    readonly closed: boolean;
};
/** One contest, flattened to the figures a distribution can be taken over. */
export type ElectionRecord = {
    readonly kind: "midterm" | "presidential";
    readonly turn: number;
    readonly voteShare: number;
    readonly won?: boolean;
    readonly houseSwing?: number;
    readonly senateSwing?: number;
};
export type BalanceReport = {
    /** The party every President in this run ran as. */
    readonly party: AdministrationParty;
    /** The players this run measured, in report order. */
    readonly proxies: readonly SkillProxy[];
    readonly bySkill: Readonly<Record<SkillProxy, SkillSummary>>;
    readonly outcomes: readonly CampaignOutcome[];
};
export type SkillSummary = {
    readonly campaigns: number;
    /** The platform this player ran on, in words; one per player, because it is derived from the program. */
    readonly platform: string;
    readonly removalRate: number;
    readonly medianRemovalTurn?: number;
    readonly beatRate: number;
    readonly medianFinalApproval: number;
    readonly medianFinalStability: number;
    /**
     * Reported separately from approval because the headline hides it. Over one
     * year, careful play and passivity move standing and stability in opposite
     * directions by comparable amounts, and neither reaches the headline at more
     * than a season's lag, so approval over this horizon is close to a wash while
     * the underlying difference is enormous. A gate on the headline at this
     * horizon is measuring a lag; a gate on this is measuring the effect.
     */
    readonly medianFinalStanding: number;
    readonly medianTreasuryRatio: number;
    readonly approvalRange: number;
    /**
     * Median (last - first) of the approval series: where a year of this kind of
     * play leaves the country's judgment, signed.
     *
     * Reported beside the range because the range alone cannot tell a headline
     * that never moved from one that rose and fell back — and because two real
     * movements running against each other (a polarized country healing while an
     * unstaffed government decays) show up in the range as a flat campaign.
     */
    readonly approvalDrift: number;
    readonly successRate: number;
    readonly freeWinShare: number;
    readonly tradeoffShare: number;
    readonly instrumentShare: Readonly<Record<InstrumentId, number>>;
    readonly rungShare: Readonly<Record<RungLevel, number>>;
    /**
     * Cabinet breaks per campaign, scaled to a four-year term so a one-year run
     * and a two-term run read on one scale. The mean rather than the median,
     * because most campaigns count a handful of each and a median of small
     * integers hides the rate.
     */
    readonly cabinetPerTerm: Readonly<Record<CabinetOutcome, number>>;
    /** Mean scandals broken and live-scandal weeks per campaign, and the share of campaigns that had one at all. */
    readonly scandals: {
        readonly brokenPerCampaign: number;
        readonly liveWeeksPerCampaign: number;
        readonly campaignsWithScandal: number;
        readonly originsPerCampaign: Readonly<Record<string, number>>;
    };
    /** Mean share of approval movement per judgment and per road, across campaigns. */
    readonly approvalDrivers: Pick<ApprovalMovement, "byDriver" | "byPath">;
    /** Each stretch of the week's share of the gross falls and rises in order and money, across campaigns. */
    readonly metricDrivers: Readonly<Record<AttributedMetric, readonly StretchShare[]>>;
    /**
     * The term arc. Every figure here is `undefined` at the standing one-year
     * horizon, because no campaign reaches a fixed date inside 52 turns — an
     * absent measurement rather than a zero, so a gate cannot assert on an
     * election that was never held.
     */
    readonly term?: TermSummary;
};
export type TermSummary = {
    /** Campaigns whose charter puts the executive on a ballot. The rest hold none. */
    readonly electoralCampaigns: number;
    readonly midtermsHeld: number;
    readonly contestsHeld: number;
    readonly medianMidtermShare: number;
    readonly medianMidtermHouseSwing: number;
    readonly medianMidtermSenateSwing: number;
    readonly medianContestShare: number;
    /** Share of contests the incumbent won. Excludes the term-limited non-contest. */
    readonly reelectionRate: number;
    readonly endings: Readonly<Record<CampaignEnding, number>>;
};
/**
 * The Presidents a run can be founded under. Each sits a little toward its own
 * side, mirrored, so a Democrat and a Republican differ by party and by the
 * direction of their politics and by nothing else; the Independent sits at the
 * center, which anchors them on the Democratic caucus.
 */
export declare const HARNESS_PRESIDENTS: Readonly<Record<AdministrationParty, IdeologyVector>>;
export type { HarnessPlatform } from "./balance-platform.js";
/**
 * A campaign founded the way the founding screen's quick oath founds one: the
 * United States under its own constitution, the President of the given party,
 * the best-fitting candidate in every chair, and the ticket, the staff and the
 * mandate left to the founding's own defaults.
 */
/** Which board a harness founding opens on. The battery compares staged wars with and without the carried one. */
export type HarnessWorld = Pick<FoundingChoices, "carriedWorld" | "openingPreset">;
export declare function foundedForBalance(seedText: string, party?: AdministrationParty, platform?: HarnessPlatform, world?: HarnessWorld): {
    readonly campaign: Campaign;
    readonly charter: Charter;
};
/** A program a run takes up partway through, pursued from that week the way the opening one is. */
export type ScheduledProgram = {
    /** Weeks since the oath: 0 is the first week governed. */
    readonly week: number;
    readonly program: readonly string[];
};
/** What a measurement adds to a run without changing how the proxy plays it. */
export type PlayOptions = {
    readonly schedule?: readonly ScheduledProgram[];
    /** Sees the state each weekly phase plans against, beside the approval attribution that already does. */
    readonly observePhase?: (id: string, state: Campaign) => void;
    /** Sees the campaign each week of the run closes on, so a test can hold the whole state rather than its metrics. */
    readonly observeWeek?: (state: Campaign) => void;
    /**
     * Decisions a measurement takes for the President each week, applied after
     * the proxy's own act: a way to ask what a habit the proxies do not have
     * (overruling the room, say) does to a run without inventing a proxy for it.
     */
    readonly decide?: (state: Campaign, step: number) => readonly EffectPacket[];
    /**
     * Wraps each weekly phase, by its id, before the run walks it. A proof that
     * asks whether some mark on a packet changes the world (strip it from every
     * phase and compare) needs the phase list the player app runs, not a copy of
     * it; without a wrapper the run walks that list exactly as it is.
     */
    readonly wrapPhase?: (id: string, run: TurnPhase) => TurnPhase;
    /** Office-day groups. The default. Pass false for the one-shot Friday tick. */
    readonly layout?: boolean;
};
export declare function playCampaign(seedText: string, player: SkillProxy | ProxyProfile, horizon?: number, party?: AdministrationParty, platform?: HarnessPlatform, options?: PlayOptions): CampaignOutcome;
export declare function balanceSeeds(count: number): readonly string[];
/**
 * Seeds whose charter actually puts the executive on a ballot.
 *
 * Every seed now founds the United States under its own constitution, so every
 * seed qualifies; the filter stays because a term-arc run is only meaningful
 * over campaigns that reach a fixed date, and asking the founded charter is
 * what keeps that true if a founding ever seats another one. Nothing is skipped
 * or faked here: the charter is founded and asked, so the filter cannot drift
 * from what the phase does.
 */
export declare function electoralSeeds(count: number, searchLimit?: number): readonly string[];
/**
 * Runs a set of seeds against a set of players.
 *
 * The proxy list is a parameter rather than the whole population, because the
 * two questions the harness answers have different prices. "Do the standing
 * bands still hold" is asked of the three bracket proxies whose numbers are
 * written into `balance.test.ts`, and running the other ten through it would
 * quadruple the gate's cost without moving a single assertion. "Does the shape
 * of the outcome depend on *how* a president governs" can only be asked of the
 * whole population, and is asked in `population-balance.test.ts` at its own
 * seed count. A gate that ran everything everywhere would be slower than both
 * and would answer neither question better.
 */
export declare function runBalanceHarness(seeds: readonly string[], horizon?: number, proxies?: readonly SkillProxy[], party?: AdministrationParty, platform?: HarnessPlatform): BalanceReport;
export declare function formatBalanceReport(report: BalanceReport): string;
