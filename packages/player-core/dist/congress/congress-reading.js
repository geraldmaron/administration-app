import { CHAMBERS, isSameDate, selectDateOfTurn, selectObligations, terminationClockRuns, terminationDaysRemaining, terminationWindowDays, CHAMBER_NAMES, WAR_POWERS_WINDOW_TURNS, clotureOf, expiredObligations, chamberMajority, majorityOf, electoralVotesWon, nextElection, projectAppropriation, projectVote, selectShutdown, selectActiveAuthorizations, selectEnding, selectNation, selectTermClock, supermajorityOf, } from "@admin/engine";
import { ELECTORAL_COLLEGE } from "@admin/world";
import { formatRatio, stanceForRatio } from "../format/figures";
import { fundedThroughDate } from "../budget/funded-through";
/** Both chambers as they are actually composed, seat for seat. */
export function chamberReadings(campaign) {
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
export const DISPOSITION_WORD = {
    favorable: "With you",
    neutral: "Even",
    caution: "Cool",
    adverse: "Against",
};
const DISPOSITION_VERDICTS = {
    favorable: "Congress is willing to work with you.",
    neutral: "Congress looks at each of your proposals on its own.",
    caution: "Congress is in no hurry to help you.",
    adverse: "Congress is against you, so every bill you send starts at a disadvantage.",
};
/**
 * What Congress thinks of the administration, which is what every vote in this
 * room is really about — a nomination, a war and a budget all start from it.
 */
export function dispositionReading(campaign) {
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
const ELECTION_KIND_WORD = {
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
export function electionCountdownReading(campaign) {
    const scheduled = nextElection(campaign);
    if (!scheduled)
        return undefined;
    const word = ELECTION_KIND_WORD[scheduled.kind];
    const headline = scheduled.turnsAway === 0
        ? `${word} this week`
        : `${word} in ${scheduled.turnsAway} week${scheduled.turnsAway === 1 ? "" : "s"}`;
    return { kind: scheduled.kind, turnsAway: scheduled.turnsAway, headline };
}
/** What a majority of the Electoral College is: 270 of 538, and never a fraction. */
export const ELECTORAL_MAJORITY = Math.floor(ELECTORAL_COLLEGE / 2) + 1;
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
export function electionProjectionReading(campaign) {
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
function resultReading(result) {
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
                    moved: result.swing[chamber],
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
export function electionResultReadings(campaign) {
    return [...selectTermClock(campaign).elections].reverse().map(resultReading);
}
/** The contest that settled this presidency, if one has been held. */
export function decidingElectionReading(campaign) {
    return electionResultReadings(campaign).find((reading) => reading.kind === "presidential");
}
function closedEnding(ending) {
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
function defeatReading(campaign) {
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
export function presidencyEndingReading(campaign) {
    const ending = selectEnding(campaign);
    if (ending === "in-office")
        return undefined;
    if (ending === "defeated")
        return defeatReading(campaign);
    return closedEnding(ending);
}
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
function obligationFor(campaign, action) {
    const openedOn = selectDateOfTurn(campaign, action.turn);
    return selectObligations(campaign).find((obligation) => obligation.target === action.target && isSameDate(obligation.openedDate, openedOn));
}
function terminationReading(campaign, action) {
    const obligation = obligationFor(campaign, action);
    if (!obligation || !terminationClockRuns(campaign, obligation))
        return undefined;
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
export function unauthorizedReadings(campaign) {
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
            latitude: weeksRemaining > 0
                ? `${weeksRemaining} week${weeksRemaining === 1 ? "" : "s"} left on the 60-day clock. Until it runs out, you need a vote of Congress to use major force anywhere else.`
                : terminationOwed
                    ? `The 60 days in ${nationName(campaign, action.target)} are up, and your forces are still there. Until Congress votes or they come home, you can't use major force anywhere else.`
                    : "The 60 days are over, and nothing more is needed here. Congress voted, or your forces came home.",
            whenItLapses: "This stays on your record after the clock ends. Congress keeps count of every time you used force without asking it first. That count never goes down, and it weighs on how Congress feels about you.",
            termination: terminationReading(campaign, action),
        };
    });
}
/**
 * Standing authorizations, actions taken without one, and what the pair means.
 *
 * Only authorizations still in force are shown — the same `selectActiveAuthorizations`
 * filter the war dossier reads before it will say force against a country is
 * covered. An authorization on file whose clock has already run out is not a
 * standing grant of anything; showing it here made this room say Congress had
 * authorized a war the dossier for that same war correctly called unauthorized.
 */
export function warPowersReading(campaign) {
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
        headline: owed.length > 0
            ? "Forces Congress never approved are past the 60-day limit"
            : live.length > 0
                ? "Your forces are in action without Congress's approval"
                : authorizations.length > 0
                    ? "Congress has approved your use of force"
                    : "You can still act on your own authority",
        detail: owed.length > 0
            ? "The 60 days are up and your forces are still there. Now you need Congress to vote yes, or you need to bring them home. Every week you wait costs more than the week before."
            : live.length > 0
                ? "You told Congress instead of asking it. Until the clock runs out, you can't start a second military action on your own."
                : authorizations.length > 0
                    ? "Congress has given you permission to use force against the government it names. That permission lasts until it runs out."
                    : "You can order a blockade, strike, or invasion on your own, but you have to tell Congress, and that starts a 60-day clock. Acting alone costs you goodwill and makes Congress less willing to approve the next one.",
    };
}
/**
 * The money, and what a refused budget actually means.
 *
 * A government whose appropriation fails does not stop. It runs on the prior
 * year's numbers — agencies plan nothing, contracts run month to month, and the
 * country loses a little footing every week it lasts. That is the consequence a
 * player has to be able to read before the vote, because it is the reason to
 * spend standing getting one passed.
 */
export function appropriationReading(campaign) {
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
function nationName(campaign, id) {
    return selectNation(campaign, id)?.base.identity.name ?? id;
}
