import { hasIntelOnNation, selectBindingTreaties, selectRelationship } from "@admin/engine";
import { trustWord } from "../format/figures";
import { place } from "../navigation/places";
import { worldLeaderRows } from "./leaders";
import { formatShare } from "./trade-partners";
import { forcesByHost } from "./us-presence";
import { boardStance, goodsTradeShare, standingToward } from "./standing";
import { atWarWith } from "./world-board";
import { WORLD_REGION_NAMES, worldRegionOf } from "./world-regions";
export const ALIGNMENT_WORDS = {
    aligned: "On your side",
    "leaning-aligned": "Leaning your way",
    neutral: "On neither side",
    "leaning-opposed": "Leaning against you",
    opposed: "Against you",
};
/** Opposed first, aligned last, so a sorted column runs the way the word reads. */
export const ALIGNMENT_RANK = { opposed: 1, "leaning-opposed": 2, neutral: 3, "leaning-aligned": 4, aligned: 5 };
/** A month of closed weeks that moves their trust by less than this reads as steady. */
export const TREND_FLAT = 0.01;
const onAxis = (trust) => (trust + 1) / 2;
export function presenceWord(personnel, most) {
    if (personnel <= 0)
        return "None";
    const share = personnel / most;
    return share >= 0.25 ? "Large" : share >= 0.05 ? "Sizable" : "Small";
}
const TREND_WORDS = { warming: "Warming", cooling: "Cooling", steady: "Steady" };
const TREND_WEEKS_DRAWN = 13;
function trendOf(standing) {
    const theirs = standing?.trend.theirs;
    if (!theirs || theirs.change4 === undefined)
        return undefined;
    const direction = theirs.change4 > TREND_FLAT ? "warming" : theirs.change4 < -TREND_FLAT ? "cooling" : "steady";
    return { direction, word: TREND_WORDS[direction], values: theirs.points.slice(-TREND_WEEKS_DRAWN).map((point) => point.value), change: theirs.change4 };
}
/** Their current trust where the services read it. The band the standing carries is the word; this places it on the axis. */
export function theirTrust(campaign, nation) {
    if (!hasIntelOnNation(campaign, nation))
        return undefined;
    const toward = selectRelationship(campaign, nation, campaign.founding.nation);
    return toward ? Math.max(-1, Math.min(1, toward.trust)) : undefined;
}
function tiesOf(campaign) {
    const binding = selectBindingTreaties(campaign);
    const treaties = binding.reduce((counts, record) => counts.set(record.counterpart, (counts.get(record.counterpart) ?? 0) + 1), new Map());
    return { treaties, allies: new Set(binding.filter((record) => record.kind === "alliance").map((record) => record.counterpart)) };
}
/** Every other government with every fact the World table and map read, ranked for nothing: callers sort. */
export function worldGovernments(campaign) {
    const presence = forcesByHost(campaign);
    const most = Math.max(1, ...presence.values());
    const war = atWarWith(campaign);
    const ties = tiesOf(campaign);
    return worldLeaderRows(campaign).map((leader) => {
        const standing = standingToward(campaign, leader.nation);
        const stance = boardStance(standing);
        const region = worldRegionOf(leader.region);
        const share = goodsTradeShare(campaign, leader.nation) ?? 0;
        const personnel = presence.get(leader.nation) ?? 0;
        const trust = stance === "unread" ? undefined : theirTrust(campaign, leader.nation);
        const ours = standing?.ours?.trust;
        return {
            nation: leader.nation,
            name: leader.nationName,
            capital: leader.capital,
            adjective: leader.adjective,
            href: place.country(leader.nation),
            region,
            regionName: region ? WORLD_REGION_NAMES[region] : "Elsewhere",
            stance,
            standingWord: stance === undefined ? "No relationship" : stance === "unread" ? "Unread" : trustWord(stance),
            trust: trust === undefined ? undefined : onAxis(trust),
            ours: ours ? { word: ours.word, stance: ours.stance } : undefined,
            trend: stance === "unread" ? undefined : trendOf(standing),
            alignment: campaign.nations[leader.nation]?.base.bands.alignmentBand ?? "neutral",
            allied: ties.allies.has(leader.nation),
            treaties: ties.treaties.get(leader.nation) ?? 0,
            tradeShare: share,
            tradeText: formatShare(share),
            forces: personnel,
            forcesText: presenceWord(personnel, most),
            atWar: war.has(leader.nation),
        };
    });
}
