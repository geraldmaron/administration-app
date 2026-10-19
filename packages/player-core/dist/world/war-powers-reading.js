import { LATEST_TERMINATION_DAYS, REPORT_WINDOW_DAYS, addDays, apply, approvalFor, blocApprovals, headlineOf, selectElectorate, describeCommitment, joinConflict, nationName, opinionCausesFor, opinionTargets, projectForceAuthorization, projectJoin, selectActiveConflicts, selectAuthorizationAgainst, selectCommitments, selectDateOfTurn, selectObligations, sideOf, terminationClockRuns, terminationDaysRemaining, terminationWindowFromIntroduction, } from "@admin/engine";
import { dispositionReading } from "../congress/congress-reading";
import { formatDate, formatRatio } from "../format/figures";
import { holdingCount } from "./nation-forces";
function nameOf(campaign, id) {
    const identity = campaign.nations[id]?.base.identity;
    return identity ? nationName(identity) : id;
}
function sentenceStart(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
/** The arsenal on the other side, said with the country's name rather than a role in somebody else's war. */
function deterrenceLine(campaign, against, deterrence) {
    if (!deterrence.defenderNuclear)
        return undefined;
    const them = sentenceStart(nameOf(campaign, against));
    return deterrence.mutual
        ? `${them} has nuclear weapons, and so does ${nameOf(campaign, campaign.founding.nation)}. A nuclear war is a real risk here.`
        : `${them} has nuclear weapons, and its response might go far beyond this war's goals.`;
}
export function dueIn(campaign, days, windowDays, caption) {
    return { daysRemaining: days, dueLabel: caption(formatDate(addDays(campaign.calendar, days))), windowDays };
}
export function warPowersBeforeJoin(campaign, conflictId, side) {
    const conflict = campaign.conflicts[conflictId];
    const projection = projectJoin(campaign, conflictId, side);
    if (!conflict || !projection)
        return undefined;
    const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
    const deterrence = deterrenceLine(campaign, against, projection.deterrence);
    const authorization = projection.warPowers.kind === "authorized" ? projection.warPowers.authorization : undefined;
    return {
        report: dueIn(campaign, REPORT_WINDOW_DAYS, REPORT_WINDOW_DAYS, (date) => `Report to Congress by ${date}`),
        ...(authorization
            ? { cover: `Allowed by the ${authorization.title} until ${formatDate(selectDateOfTurn(campaign, authorization.expiresTurn))}` }
            : { withdrawal: dueIn(campaign, LATEST_TERMINATION_DAYS, LATEST_TERMINATION_DAYS, (date) => `Troops must leave by ${date} unless Congress votes`) }),
        ...(projection.refusal ? { refusal: projection.refusal } : {}),
        ...(deterrence ? { deterrence } : {}),
    };
}
function joinPriceWords(campaign, price) {
    const { approval, congress, authorization } = price;
    return [
        `Your approval is ${formatRatio(approval.now)} now. It would be ${formatRatio(approval.settled)} the week you go in and head toward ${formatRatio(approval.heading)} while the war lasts.${price.because ? ` ${price.because}` : ""}`,
        price.unilateral
            ? `Congress's mood toward you is ${congress.before.word.toLowerCase()} now. It would be ${congress.after.word.toLowerCase()} after you enter a war without its approval.`
            : `Congress approved this war, so its mood toward you stays ${congress.after.word.toLowerCase()}.`,
        `Odds Congress approves force against ${nameOf(campaign, authorization.against)}: ${authorization.before} now, ${authorization.after} once you're in.`,
    ];
}
/**
 * Whether the war is the reason approval is heading where it is: the front's
 * cost to the settled headline is larger than what the rally adds to it. The
 * rally is an impulse on the record every bloc reads and the cost is a term in
 * the security judgment, so both are measured on the headline.
 */
function warOutweighsRally(after, warContribution) {
    if (warContribution >= 0)
        return false;
    const settled = { ...after.player.opinion, ...opinionTargets(after) };
    const reading = selectElectorate(after, settled);
    const withoutRally = headlineOf(reading.shares, blocApprovals({ ...reading, valence: reading.valence - reading.rally }));
    const rallyLift = reading.headline - withoutRally;
    const warCost = approvalFor(after, { ...settled, security: Math.min(1, settled.security - warContribution) }) - reading.headline;
    return warCost > rallyLift;
}
export function joinPriceBeforeJoin(campaign, conflictId, side) {
    const conflict = campaign.conflicts[conflictId];
    const joined = joinConflict(campaign, campaign.founding.nation, conflictId, side);
    if (!conflict || !joined.ok)
        return undefined;
    const after = apply(campaign, joined.packet);
    const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
    const war = opinionCausesFor(after, "security").find((cause) => cause.key === "war");
    const price = {
        ...(war && warOutweighsRally(after, war.contribution) ? { because: war.detail } : {}),
        approval: {
            now: campaign.player.metrics.approval,
            settled: after.player.metrics.approval,
            // The headline once the six judgments settle where the board is taking them.
            heading: approvalFor(after, { ...after.player.opinion, ...opinionTargets(after) }),
        },
        congress: { before: dispositionReading(campaign), after: dispositionReading(after) },
        unilateral: after.congress.unauthorized.length > campaign.congress.unauthorized.length,
        authorization: {
            against,
            before: projectForceAuthorization(campaign, against).forecast.likelihood,
            after: projectForceAuthorization(after, against).forecast.likelihood,
        },
    };
    return { ...price, words: joinPriceWords(campaign, price) };
}
export function reportStanding(obligation) {
    if (obligation.filing)
        return obligation.missed === true || obligation.filing.filedDay > obligation.dueDay ? "Filed late" : "Filed";
    return obligation.missed ? "Missed" : "Owed";
}
/**
 * Read off the introductions filed against the government on the other side,
 * the only join the engine records between a war and its War Powers paper:
 * an introduction is filed against a government, not a war.
 */
export function frontWarPowers(campaign, counterpart) {
    const authorization = selectAuthorizationAgainst(campaign, counterpart);
    const latest = selectObligations(campaign).find((obligation) => obligation.target === counterpart);
    const running = latest && terminationClockRuns(campaign, latest) ? latest : undefined;
    return {
        ...(authorization ? { cover: `Allowed by the ${authorization.title} until ${formatDate(selectDateOfTurn(campaign, authorization.expiresTurn))}` } : {}),
        ...(running
            ? { withdrawal: dueIn(campaign, terminationDaysRemaining(campaign, running), terminationWindowFromIntroduction(running), (date) => `Troops must leave by ${date} unless Congress votes`) }
            : {}),
        ...(latest ? { report: reportStanding(latest) } : {}),
    };
}
/**
 * Every war the United States entered beside one of its principals. Entering
 * is the act that starts the War Powers clocks, so the list a joined war
 * appears in is the list that carries them.
 */
export function enteredFronts(campaign) {
    const us = campaign.founding.nation;
    return selectActiveConflicts(campaign).flatMap((conflict) => {
        const side = conflict.joined.aggressor.includes(us) ? "aggressor" : conflict.joined.defender.includes(us) ? "defender" : undefined;
        if (!side)
            return [];
        const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
        return [
            {
                conflictId: conflict.id,
                alongside: side === "aggressor" ? conflict.aggressor : conflict.defender,
                against,
                weeks: Math.max(1, campaign.turn - conflict.startedTurn),
                intensity: conflict.intensity,
                warPowers: frontWarPowers(campaign, against),
            },
        ];
    });
}
/** The United States' forces in this war: its standing commitments against the enemy or the war, and its open introductions against the enemy. */
function ourCommitted(campaign, conflict, enemy) {
    const commitments = selectCommitments(campaign, campaign.founding.nation).filter((commitment) => commitment.status === "active" &&
        ((commitment.target.kind === "nation" && commitment.target.id === enemy) || (commitment.target.kind === "conflict" && commitment.target.id === conflict.id)));
    const lines = commitments.map((commitment) => commitment.source.kind === "orderOfBattle"
        ? `${holdingCount(commitment.source.unitType, commitment.source.count)}: ${describeCommitment(commitment, campaign)}`
        : describeCommitment(commitment, campaign));
    const introductions = selectObligations(campaign)
        .filter((obligation) => obligation.target === enemy && !obligation.terminated)
        .map((obligation) => obligation.description);
    return [...lines, ...introductions];
}
/** Every party to a war, side by side, each with what it has committed. Undefined for a war not on the board. */
export function warPartyForces(campaign, conflictId) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict)
        return undefined;
    const us = campaign.founding.nation;
    const ours = sideOf(conflict, us);
    const enemy = ours === "aggressor" ? conflict.defender : ours === "defender" ? conflict.aggressor : undefined;
    const side = (which) => [conflict[which], ...conflict.joined[which]].map((nation, index) => ({
        nation,
        role: index === 0 ? "principal" : "joined",
        committed: nation === us && enemy ? ourCommitted(campaign, conflict, enemy) : [],
    }));
    return { aggressor: side("aggressor"), defender: side("defender") };
}
