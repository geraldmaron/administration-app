import { bilateralGoods, hasIntelOnNation, selectRelationship, trustCourse } from "@admin/engine";
import { stanceForDisposition, stanceForPressure, stanceForTrust, trustWord } from "../format/figures";
import { recordStart, trendOf } from "../polling/record-trend";
export const THEIR_VIEW = "Their view of you";
const OUR_READ = "Your view of them";
// Lowest to highest on each band's own scale, so `level` means "how much of
// it": how far they trust, how high the tension runs.
const RISING = ["adverse", "caution", "neutral", "favorable"];
const MOUNTING = ["favorable", "neutral", "caution", "adverse"];
const OUR_TRUST = { favorable: "Trusted", neutral: "Neutral", caution: "Wary", adverse: "Hostile" };
const TENSION = { favorable: "Low", neutral: "Manageable", caution: "Rising", adverse: "High" };
const AIMS = { favorable: "Aligned", neutral: "Mixed", caution: "Apart", adverse: "Opposed" };
const THREAT = { favorable: "Low", neutral: "Modest", caution: "Serious", adverse: "Grave" };
function band(stance, words, scale) {
    return { word: words[stance], stance, level: scale.indexOf(stance) + 1 };
}
const THEIR_TRUST = {
    favorable: trustWord("favorable"),
    neutral: trustWord("neutral"),
    caution: trustWord("caution"),
    adverse: trustWord("adverse"),
};
function sideOf(course, read) {
    const points = course.flatMap((point) => {
        const value = read(point);
        return value === undefined ? [] : [{ turn: point.turn, value }];
    });
    return points.length === 0 ? undefined : trendOf(points);
}
/** The observed course of one government's standing with the United States. */
export function standingTrend(campaign, nation, unread) {
    const course = trustCourse(campaign, nation);
    const ours = sideOf(course, (point) => point.ours);
    const theirs = unread ? undefined : sideOf(course, (point) => point.theirs);
    const tension = sideOf(course, (point) => point.tension);
    return {
        start: recordStart(campaign, campaign.relationsRecord?.since),
        ...(ours ? { ours } : {}),
        ...(theirs ? { theirs } : {}),
        ...(tension ? { tension } : {}),
    };
}
export function standingToward(campaign, nation) {
    const home = campaign.founding.nation;
    if (nation === home || campaign.nations[nation] === undefined)
        return undefined;
    const unread = !hasIntelOnNation(campaign, nation);
    const toward = selectRelationship(campaign, nation, home);
    const from = selectRelationship(campaign, home, nation);
    return {
        unread,
        ...(toward && !unread ? { theirs: { caption: THEIR_VIEW, trust: band(stanceForTrust(toward.trust), THEIR_TRUST, RISING) } } : {}),
        ...(from
            ? {
                ours: { caption: OUR_READ, trust: band(stanceForTrust(from.trust), OUR_TRUST, RISING) },
                tension: band(stanceForPressure(from.tension), TENSION, MOUNTING),
                aims: band(stanceForDisposition(from.alignment), AIMS, RISING),
                threat: band(stanceForPressure(from.militaryThreat), THREAT, MOUNTING),
            }
            : {}),
        trend: standingTrend(campaign, nation, unread),
    };
}
/**
 * How a government is drawn on the board: its own trust in the United States
 * where the services read it, "unread" where they do not, and nothing for a
 * government with no relationship kept either way. The fill, the stance
 * filter and the board's counts all read this, so they cannot disagree.
 */
export function boardStance(standing) {
    if (!standing)
        return undefined;
    if (standing.unread)
        return "unread";
    return standing.theirs?.trust.stance;
}
// The sums across every partner, kept per campaign object (never mutated),
// because a share needs every partner and summing them walks every sector.
const goodsTradeBySnapshot = new WeakMap();
/** US goods trade with every partner together, in the trade volumes' own units. */
export function goodsTradeTotals(campaign) {
    const known = goodsTradeBySnapshot.get(campaign);
    if (known !== undefined)
        return known;
    const totals = Object.keys(campaign.nations)
        .filter((id) => id !== campaign.founding.nation)
        .reduce((sums, id) => {
        const goods = bilateralGoods(campaign, id);
        return { imports: sums.imports + goods.imports, exports: sums.exports + goods.exports };
    }, { imports: 0, exports: 0 });
    goodsTradeBySnapshot.set(campaign, totals);
    return totals;
}
/** A partner's share of US goods trade, 0..1, from the committed trade volumes. */
export function goodsTradeShare(campaign, nation) {
    if (nation === campaign.founding.nation || campaign.nations[nation] === undefined)
        return undefined;
    const { imports, exports } = goodsTradeTotals(campaign);
    const total = imports + exports;
    if (total <= 0)
        return undefined;
    const goods = bilateralGoods(campaign, nation);
    return (goods.imports + goods.exports) / total;
}
