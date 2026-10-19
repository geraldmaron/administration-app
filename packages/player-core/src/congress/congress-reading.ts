import {
  CHAMBERS,
  isSameDate,
  selectDateOfTurn,
  selectObligations,
  terminationClockRuns,
  terminationDaysRemaining,
  terminationWindowDays,
  CHAMBER_NAMES,
  WAR_POWERS_WINDOW_TURNS,
  clotureOf,
  expiredObligations,
  chamberMajority,
  majorityOf,
  electoralVotesWon,
  nextElection,
  projectAppropriation,
  projectVote,
  selectShutdown,
  selectActiveAuthorizations,
  selectEnding,
  selectNation,
  selectTermClock,
  supermajorityOf,
  type Campaign,
  type Chamber,
  type ElectionKind,
  type ElectionResult,
  type ReportObligation,
  type UnauthorizedAction,
} from "@admin/engine";
import { ELECTORAL_COLLEGE, type NationId } from "@admin/world";
import { formatRatio, stanceForRatio, type MetricStance } from "../format/figures";
import { fundedThroughDate } from "../budget/funded-through";

// What the Hill looks like from the Oval Office.
//
// Three arithmetics run through this room and they are genuinely different
// questions: whether a chamber would carry a measure, whether the President may
// use force without asking, and whether the government is spending this year's
// appropriation or last year's. Each is projected by the engine; this module
// only decides how the projections read, so a whip count shown here and the one
// the vote runs against cannot come apart.

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
export function chamberReadings(campaign: Campaign): readonly ChamberReading[] {
  return CHAMBERS.map((chamber) => {
    const composition = campaign.congress.chambers[chamber];
    const majority = majorityOf(composition.seats);
    return {
      chamber,
      name: CHAMBER_NAMES[chamber],
      seats: composition.seats,
      administration: composition.administration,
      opposition: composition.opposition,
      independent: composition.independent,
      majority,
      supermajority: supermajorityOf(composition.seats),
      ...(chamber === "senate" ? { cloture: clotureOf(composition.seats) } : {}),
      // Independents caucus with their anchor party and a tie goes to the
      // administration, the same count that seats the Speaker.
      holdsMajority: chamberMajority(campaign.congress, chamber) === "administration",
    };
  });
}

export type DispositionReading = {
  readonly value: number;
  readonly percent: string;
  readonly stance: MetricStance;
  /** With you / On merits / Cool / Against — the room's word, not a kicker. */
  readonly word: string;
  readonly verdict: string;
};

export const DISPOSITION_WORD: Readonly<Record<MetricStance, string>> = {
  favorable: "With you",
  neutral: "Even",
  caution: "Cool",
  adverse: "Against",
};

const DISPOSITION_VERDICTS: Readonly<Record<MetricStance, string>> = {
  favorable: "Congress is willing to work with you.",
  neutral: "Congress looks at each of your proposals on its own.",
  caution: "Congress is in no hurry to help you.",
  adverse: "Congress is against you, so every bill you send starts at a disadvantage.",
};

/**
 * What Congress thinks of the administration, which is what every vote in this
 * room is really about — a nomination, a war and a budget all start from it.
 */
export function dispositionReading(campaign: Campaign): DispositionReading {
  const value = campaign.congress.disposition;
  const stance = stanceForRatio(value);
  return {
    value,
    percent: formatRatio(value),
    stance,
    word: DISPOSITION_WORD[stance],
    verdict: DISPOSITION_VERDICTS[stance],
  };
}

export type ElectionCountdownReading = {
  readonly kind: ElectionKind;
  readonly turnsAway: number;
  /** "The midterms in 12 weeks" / "Re-election this week" — chamber context, never a bare number. */
  readonly headline: string;
};

const ELECTION_KIND_WORD: Readonly<Record<ElectionKind, string>> = {
  midterm: "The midterms",
  presidential: "Re-election",
};

/**
 * The fixed date every count in this room is really run against.
 *
 * A chamber's composition today is a snapshot; the midterm is when it gets
 * recomposed around whatever this administration is standing on when it
 * lands. Undefined once the presidency's own future is settled — a defeated
 * or term-limited administration has no next election left to read toward.
 */
export function electionCountdownReading(campaign: Campaign): ElectionCountdownReading | undefined {
  const scheduled = nextElection(campaign);
  if (!scheduled) return undefined;
  const word = ELECTION_KIND_WORD[scheduled.kind];
  const headline =
    scheduled.turnsAway === 0
      ? `${word} this week`
      : `${word} in ${scheduled.turnsAway} week${scheduled.turnsAway === 1 ? "" : "s"}`;
  return { kind: scheduled.kind, turnsAway: scheduled.turnsAway, headline };
}

/** What a majority of the Electoral College is: 270 of 538, and never a fraction. */
export const ELECTORAL_MAJORITY = Math.floor(ELECTORAL_COLLEGE / 2) + 1;

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

const ELECTORATE_ANCHOR_REASON = "a country that starts out evenly split";

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
export function electionProjectionReading(campaign: Campaign): ElectionProjectionReading {
  const projection = projectVote(campaign);
  const hasMap = Object.keys(campaign.states).length > 0;
  const electoralVotes = hasMap ? electoralVotesWon(campaign, projection.share, campaign.congress) : undefined;
  const anchor = projection.drivers.find((driver) => driver.reason === ELECTORATE_ANCHOR_REASON)?.delta ?? 0;
  const drivers = projection.drivers
    .filter((driver) => driver.reason !== ELECTORATE_ANCHOR_REASON && driver.delta !== 0)
    .map((driver) => ({ reason: driver.reason, delta: driver.delta }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return {
    share: projection.share,
    ...(electoralVotes === undefined ? {} : { electoralVotes }),
    electoralMajority: ELECTORAL_MAJORITY,
    wouldHold: electoralVotes === undefined ? projection.share > 0.5 : electoralVotes >= ELECTORAL_MAJORITY,
    drivers,
    anchor,
  };
}

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
  readonly seats?: readonly { readonly chamber: Chamber; readonly name: string; readonly moved: number }[];
  /** Presidential only, and absent on a term-limited ending where no contest was held. */
  readonly won?: boolean;
  /** True when no contest was held at all — two terms served, and not on the ballot. */
  readonly uncontested: boolean;
};

function resultReading(result: ElectionResult): ElectionResultReading {
  // A term-limited ending is written as a presidential result with a zero
  // share, because the clock has to record that the date arrived. Printing that
  // zero would tell a two-term president they lost with nothing, so the reading
  // states there was no contest instead of quoting a count nobody cast.
  const uncontested = result.kind === "presidential" && result.won === undefined;
  return {
    id: result.id,
    kind: result.kind,
    turn: result.turn,
    title: ELECTION_KIND_WORD[result.kind],
    share: result.voteShare,
    summary: result.summary,
    ...(result.swing
      ? {
          seats: CHAMBERS.map((chamber) => ({
            chamber,
            name: CHAMBER_NAMES[chamber],
            moved: result.swing![chamber],
          })),
        }
      : {}),
    ...(result.won === undefined ? {} : { won: result.won }),
    uncontested,
  };
}

/**
 * Every contest this presidency has actually faced, newest first.
 *
 * Read off `termClock.elections`, which is the only record of them: an election
 * reaches the feed as one wire line that scrolls away, and before this the
 * midterm that cost an administration its House majority left no readable trace
 * anywhere in the app a week later.
 */
export function electionResultReadings(campaign: Campaign): readonly ElectionResultReading[] {
  return [...selectTermClock(campaign).elections].reverse().map(resultReading);
}

/** The contest that settled this presidency, if one has been held. */
export function decidingElectionReading(campaign: Campaign): ElectionResultReading | undefined {
  return electionResultReadings(campaign).find((reading) => reading.kind === "presidential");
}

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

function closedEnding(ending: "removed" | "term-limited"): PresidencyEndingReading {
  if (ending === "removed") {
    return {
      ending,
      title: "Removed from office",
      sentence: "Congress removed you from office. Your time as President is over.",
      drivers: [],
    };
  }
  return {
    ending,
    title: "Both terms served",
    sentence: "You served two full terms, so you couldn't run again. Your time as President is over.",
    drivers: [],
  };
}

function defeatReading(campaign: Campaign): PresidencyEndingReading {
  const result = decidingElectionReading(campaign);
  const projection = electionProjectionReading(campaign);
  const stored = result !== undefined && !result.uncontested ? result : undefined;
  const share = stored?.share ?? projection.share;
  const agrees = stored === undefined || Math.abs(stored.share - projection.share) < 1e-9;
  const hasMap = Object.keys(campaign.states).length > 0;
  const electoralVotes = hasMap ? electoralVotesWon(campaign, share, campaign.congress) : undefined;
  return {
    ending: "defeated",
    title: "Lost the election",
    sentence: stored?.summary ?? "You lost the election. Your time as President is over.",
    share,
    ...(electoralVotes === undefined ? {} : { electoralVotes }),
    electoralMajority: ELECTORAL_MAJORITY,
    drivers: agrees ? projection.drivers : [],
  };
}

/** What the Desk shows once `selectEnding` is no longer in office. */
export function presidencyEndingReading(campaign: Campaign): PresidencyEndingReading | undefined {
  const ending = selectEnding(campaign);
  if (ending === "in-office") return undefined;
  if (ending === "defeated") return defeatReading(campaign);
  return closedEnding(ending);
}

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

const TERMINATION_STATUTE = "War Powers Resolution";

/**
 * The report obligation opened by the same introduction as this unauthorized
 * action.
 *
 * `warPowersRecord` and `forceIntroduction` are always called together, on the
 * same `ctx`, so the two records share a target and an opening day by
 * construction — matched here on the day rather than trusted to line up,
 * because a reading has to fail closed if that ever stops being true rather
 * than pair an action with the wrong war's obligation.
 */
function obligationFor(campaign: Campaign, action: UnauthorizedAction): ReportObligation | undefined {
  const openedOn = selectDateOfTurn(campaign, action.turn);
  return selectObligations(campaign).find(
    (obligation) => obligation.target === action.target && isSameDate(obligation.openedDate, openedOn),
  );
}

function terminationReading(
  campaign: Campaign,
  action: UnauthorizedAction,
): UnauthorizedReading["termination"] {
  const obligation = obligationFor(campaign, action);
  if (!obligation || !terminationClockRuns(campaign, obligation)) return undefined;
  const windowDays = terminationWindowDays(obligation);
  const daysElapsed = windowDays - terminationDaysRemaining(campaign, obligation);
  return { windowDays, daysElapsed, statute: TERMINATION_STATUTE };
}

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
export function unauthorizedReadings(campaign: Campaign): readonly UnauthorizedReading[] {
  const owed = new Set(expiredObligations(campaign).map((obligation) => obligation.target));
  return campaign.congress.unauthorized.map((action) => {
    const weeksElapsed = Math.max(0, campaign.turn - action.turn);
    const weeksRemaining = Math.max(0, WAR_POWERS_WINDOW_TURNS - weeksElapsed);
    const terminationOwed = owed.has(action.target);
    return {
      id: action.id,
      windowWeeks: WAR_POWERS_WINDOW_TURNS,
      weeksElapsed,
      target: action.target,
      targetName: nationName(campaign, action.target),
      description: action.description,
      weeksRemaining,
      terminationOwed,
      latitude:
        weeksRemaining > 0
          ? `${weeksRemaining} week${weeksRemaining === 1 ? "" : "s"} left on the 60-day clock. Until it runs out, you need a vote of Congress to use major force anywhere else.`
          : terminationOwed
            ? `The 60 days in ${nationName(campaign, action.target)} are up, and your forces are still there. Until Congress votes or they come home, you can't use major force anywhere else.`
            : "The 60 days are over, and nothing more is needed here. Congress voted, or your forces came home.",
      whenItLapses:
        "This stays on your record after the clock ends. Congress keeps count of every time you used force without asking it first. That count never goes down, and it weighs on how Congress feels about you.",
      termination: terminationReading(campaign, action),
    };
  });
}

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
export function warPowersReading(campaign: Campaign): WarPowersReading {
  const authorizations = selectActiveAuthorizations(campaign).map((authorization) => ({
    id: authorization.id,
    title: authorization.title,
    target: authorization.target,
    targetName: nationName(campaign, authorization.target),
    weeksLeft: Math.max(0, authorization.expiresTurn - campaign.turn),
    windowWeeks: Math.max(0, authorization.expiresTurn - authorization.enactedTurn),
    weeksElapsed: Math.max(0, campaign.turn - authorization.enactedTurn),
  }));
  const unauthorized = unauthorizedReadings(campaign);
  const live = unauthorized.filter((action) => action.weeksRemaining > 0);
  const owed = unauthorized.filter((action) => action.terminationOwed);
  return {
    authorizations,
    unauthorized,
    headline:
      owed.length > 0
        ? "Forces Congress never approved are past the 60-day limit"
        : live.length > 0
          ? "Your forces are in action without Congress's approval"
          : authorizations.length > 0
            ? "Congress has approved your use of force"
            : "You can still act on your own authority",
    detail:
      owed.length > 0
        ? "The 60 days are up and your forces are still there. Now you need Congress to vote yes, or you need to bring them home. Every week you wait costs more than the week before."
        : live.length > 0
          ? "You told Congress instead of asking it. Until the clock runs out, you can't start a second military action on your own."
          : authorizations.length > 0
            ? "Congress has given you permission to use force against the government it names. That permission lasts until it runs out."
            : "You can order a blockade, strike, or invasion on your own, but you have to tell Congress, and that starts a 60-day clock. Acting alone costs you goodwill and makes Congress less willing to approve the next one.",
  };
}

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
export function appropriationReading(campaign: Campaign): AppropriationReading {
  const { appropriation } = campaign.congress;
  const weeksLeft = Math.max(0, appropriation.throughTurn - campaign.turn);
  const projection = projectAppropriation(campaign);
  const shutdown = selectShutdown(campaign);
  const windowWeeks = appropriation.onPriorYear
    ? 0
    : Math.max(0, appropriation.throughTurn - appropriation.enactedTurn);
  const weeksElapsed = Math.max(0, campaign.turn - appropriation.enactedTurn);
  if (shutdown) {
    return {
      onPriorYear: true,
      weeksLeft: 0,
      windowWeeks: 0,
      weeksElapsed,
      projection,
      headline: `The government is closed: day ${shutdown.days}`,
      detail: `The money has run out, so the government has stopped all but its most essential work. There are two ways to reopen it. A short-term funding bill (a continuing resolution) reopens it at last year's levels for 6 weeks. A full budget reopens it for the year.`,
      stance: "adverse",
    };
  }
  return {
    onPriorYear: appropriation.onPriorYear,
    weeksLeft,
    windowWeeks,
    weeksElapsed,
    projection,
    headline: appropriation.onPriorYear
      ? "Running on last year's budget"
      : `Funded for ${weeksLeft} more week${weeksLeft === 1 ? "" : "s"}`,
    detail: appropriation.onPriorYear
      ? "Congress hasn't passed your budget. Every department is spending what it spent last year and can't start anything new. The country gets a little less stable each week this lasts."
      : `Your current budget lasts until ${fundedThroughDate(campaign, appropriation.throughTurn)}. If Congress turns down your next budget, the government keeps running on the money it already has.`,
    stance: appropriation.onPriorYear ? "adverse" : "favorable",
  };
}

function nationName(campaign: Campaign, id: NationId): string {
  return selectNation(campaign, id)?.base.identity.name ?? (id as string);
}
