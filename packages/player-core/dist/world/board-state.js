import { conflictsAsParty, hazardLabel, selectConditionsFor, selectNation, sideOf, } from "@admin/engine";
import { SECTOR_LABELS, stateById } from "@admin/world";
import { formatRatio } from "../format/figures";
const SCOPE_NAMES = {
    city: "one city",
    region: "a whole region",
    nation: "the entire country",
};
// A rising figure is bad for three of these four and good for the fourth, so
// the stance cannot be derived from the number alone.
function risingIsBad(value) {
    if (value >= 0.7)
        return "adverse";
    if (value >= 0.4)
        return "caution";
    return "neutral";
}
function risingIsGood(value) {
    if (value >= 0.6)
        return "favorable";
    if (value >= 0.3)
        return "caution";
    return "adverse";
}
function nameOf(campaign, id) {
    return selectNation(campaign, id)?.base.identity.name ?? id;
}
function weeksRunning(conflict, turn) {
    return Math.max(1, turn - conflict.startedTurn + 1);
}
function intensityReading(conflict) {
    return {
        key: "intensity",
        label: "How heavy the fighting is",
        fraction: conflict.intensity,
        value: formatRatio(conflict.intensity),
        stance: risingIsBad(conflict.intensity),
        note: "How much this week of fighting costs both sides.",
    };
}
function standfirstOf(campaign, conflict) {
    const weeks = weeksRunning(conflict, campaign.turn);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} in. ${conflict.cause}`;
}
function principalWarReading(campaign, conflict, side) {
    const opponent = nameOf(campaign, side === "aggressor" ? conflict.defender : conflict.aggressor);
    return {
        id: conflict.id,
        headline: side === "aggressor" ? `Your war against ${opponent}` : `${opponent}'s war against you`,
        standfirst: standfirstOf(campaign, conflict),
        readings: [
            intensityReading(conflict),
            {
                key: "support",
                label: "Support at home",
                fraction: conflict.warSupport[side],
                value: formatRatio(conflict.warSupport[side]),
                stance: risingIsGood(conflict.warSupport[side]),
                // The thing that actually ends most of them, said plainly.
                note: "When people at home stop backing a war, it ends, even if it's going well on the map.",
            },
            {
                key: "exhaustion",
                label: "How worn out your side is",
                fraction: conflict.exhaustion[side],
                value: formatRatio(conflict.exhaustion[side]),
                stance: risingIsBad(conflict.exhaustion[side]),
                note: "This builds up the longer the war goes on.",
            },
        ],
    };
}
function joinedWarReading(campaign, conflict, side) {
    const alongside = conflict[side];
    const against = side === "aggressor" ? conflict.defender : conflict.aggressor;
    return {
        id: conflict.id,
        headline: `Your war beside ${nameOf(campaign, alongside)}, against ${nameOf(campaign, against)}`,
        standfirst: standfirstOf(campaign, conflict),
        readings: [intensityReading(conflict)],
        joined: { alongside, against },
    };
}
/**
 * Every war the player is actually in, as a principal or beside one. A war
 * between two other nations is the world board's business, not the situation
 * room's — this screen answers "what is this government carrying", and
 * somebody else's war is not on it until this government joins it.
 */
export function warReadings(campaign) {
    const player = campaign.founding.nation;
    return conflictsAsParty(campaign).flatMap((conflict) => {
        const side = sideOf(conflict, player);
        if (!side)
            return [];
        const principal = conflict.aggressor === player || conflict.defender === player;
        return [principal ? principalWarReading(campaign, conflict, side) : joinedWarReading(campaign, conflict, side)];
    });
}
/** Every condition running at home, worst first. */
export function conditionReadings(campaign) {
    return [...selectConditionsFor(campaign, campaign.founding.nation)]
        .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))
        .map((condition) => {
        const weeks = Math.max(1, campaign.turn - condition.startedTurn + 1);
        const where = conditionPlace(campaign, condition);
        const incident = condition.lifetime === "incident";
        return {
            id: condition.id,
            kind: condition.kind,
            headline: hazardLabel(condition.kind),
            standfirst: incident
                ? `${where}. It happened once, and it isn't still going on.`
                : `${where}, ${weeks} ${weeks === 1 ? "week" : "weeks"} in.`,
            ...(incident ? { incident: true } : {}),
            ...(condition.state ? { state: condition.state } : {}),
            severity: {
                key: "severity",
                label: "Severity",
                fraction: condition.severity,
                value: formatRatio(condition.severity),
                stance: risingIsBad(condition.severity),
                note: incident
                    ? "How much damage it did on the day it happened."
                    : "How much damage it does each week it goes on.",
            },
        };
    });
}
function conditionPlace(campaign, condition) {
    const city = condition.city ? campaign.cities[condition.city]?.base.name : undefined;
    const state = condition.state ? stateById.get(condition.state)?.name : undefined;
    const sector = condition.sector ? SECTOR_LABELS[condition.sector] : undefined;
    const named = [city, state, sector].filter((part) => Boolean(part));
    if (named.length > 0)
        return named.join(" · ");
    return `Across ${SCOPE_NAMES[condition.scope]}`;
}
/**
 * The one-line answer to "what is this government carrying", or undefined on a
 * week where the answer is nothing. Undefined rather than "nothing is
 * happening" so the surface can leave the card out entirely: an empty card
 * every quiet week trains the player to stop looking at it.
 */
export function boardStateSummary(campaign) {
    const wars = warReadings(campaign);
    const conditions = conditionReadings(campaign);
    if (wars.length === 0 && conditions.length === 0)
        return undefined;
    const parts = [];
    if (wars.length > 0)
        parts.push(`${wars.length === 1 ? "a war" : `${wars.length} wars`}`);
    if (conditions.length > 0) {
        parts.push(conditions.length === 1 ? "an emergency at home" : `${conditions.length} emergencies at home`);
    }
    const list = parts.length === 1 ? parts[0] : `${parts[0]} and ${parts[1]}`;
    return `You're dealing with ${list}.`;
}
