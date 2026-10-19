import { boardStance, standingToward } from "../../world/standing.js";
import { orgMembersOf } from "../../world/org-screen.js";
import { treatyScreenReading } from "../../world/treaty-screen.js";
import { noData, solid } from "../contract.js";
// The lenses of a set: the belligerents and joiners of a war, the members of a
// body, the parties to an instrument. The lens id names its subject
// (`sides:<war id>`, `body:<org id>`, `parties:<treaty id>`), the way a bill's
// whip count does, because the subject is what it colors. Governments outside
// the set read as neutral land, which is what lets the set detach from them.
const NO_ADMINISTRATION = "No game in progress";
const SIDES = "sides:";
const BODY = "body:";
const PARTIES = "parties:";
export const sidesLensId = (conflictId) => `${SIDES}${conflictId}`;
export const bodyLensId = (orgId) => `${BODY}${orgId}`;
export const partiesLensId = (treatyId) => `${PARTIES}${treatyId}`;
function partyOf(conflict, nation) {
    if (nation === conflict.aggressor)
        return { side: "aggressor", principal: true };
    if (nation === conflict.defender)
        return { side: "defender", principal: true };
    if (conflict.joined.aggressor.includes(nation))
        return { side: "aggressor", principal: false };
    if (conflict.joined.defender.includes(nation))
        return { side: "defender", principal: false };
    return undefined;
}
/** A war's two sides in two colors, the principals in the side's body tone and the joiners lit, the United States in gold. */
function sidesLens(id, conflictId, campaign, palette) {
    const conflict = campaign?.conflicts[conflictId];
    const tone = (side, principal) => (side === "aggressor" ? (principal ? palette.againstLean : palette.againstStrong) : principal ? palette.forLean : palette.forStrong);
    return {
        id,
        name: "The two sides",
        level: "nation",
        scale: "categorical",
        encoding: "color",
        legend: [
            { label: "Defending side", color: palette.forLean },
            { label: "Joined the defense", color: palette.forStrong },
            { label: "Attacking side", color: palette.againstLean },
            { label: "Joined the attack", color: palette.againstStrong },
            { label: "The United States", color: palette.own },
        ],
        read: (region) => {
            if (region.layer !== "world")
                return null;
            if (!campaign)
                return noData(palette, NO_ADMINISTRATION);
            if (!conflict)
                return noData(palette, "No such war");
            const party = partyOf(conflict, region.id);
            if (!party)
                return null;
            const word = `${party.side === "aggressor" ? "Attacking side" : "Defending side"}, ${party.principal ? "a main party" : "joined"}`;
            if (region.id === campaign.founding.nation)
                return solid(`The United States: ${word.toLowerCase()}`, 3, palette.own);
            return solid(word, party.principal ? 2 : 1, tone(party.side, party.principal));
        },
    };
}
const STANCE_WORDS = { favorable: "Trusts you", neutral: "Neutral", caution: "Wary of you", adverse: "Hostile", unread: "Unread" };
/** A body's members, each in the color of how it stands toward the United States, the United States in gold. */
function bodyLens(id, orgId, campaign, palette) {
    const members = new Set(campaign ? orgMembersOf(campaign, orgId) : []);
    const colors = { favorable: palette.favorable, neutral: palette.steady, caution: palette.caution, adverse: palette.adverse, unread: palette.unread };
    return {
        id,
        name: "Members and how they stand",
        level: "nation",
        scale: "categorical",
        encoding: "color",
        legend: [
            { label: "Trusts you", color: palette.favorable },
            { label: "Neutral", color: palette.steady },
            { label: "Wary of you", color: palette.caution },
            { label: "Hostile", color: palette.adverse },
            { label: "Unread", color: palette.unread },
        ],
        read: (region) => {
            if (region.layer !== "world")
                return null;
            if (!campaign)
                return noData(palette, NO_ADMINISTRATION);
            if (!members.has(region.id))
                return null;
            if (region.id === campaign.founding.nation)
                return solid("The United States, a member", 5, palette.own);
            const stance = boardStance(standingToward(campaign, region.id)) ?? "unread";
            return solid(STANCE_WORDS[stance], { favorable: 4, neutral: 3, caution: 2, adverse: 1, unread: 0 }[stance], colors[stance]);
        },
    };
}
/** The parties to an instrument, the United States in gold and the rest in one tone. */
function partiesLens(id, treatyId, campaign, palette) {
    const reading = campaign ? treatyScreenReading(campaign, treatyId) : undefined;
    const parties = new Set(reading?.parties.map((party) => party.nation) ?? []);
    return {
        id,
        name: "The parties",
        level: "nation",
        scale: "categorical",
        encoding: "color",
        legend: [
            { label: "The United States", color: palette.own },
            { label: "A party", color: palette.forLean },
        ],
        read: (region) => {
            if (region.layer !== "world")
                return null;
            if (!campaign)
                return noData(palette, NO_ADMINISTRATION);
            if (!parties.has(region.id))
                return null;
            if (region.id === campaign.founding.nation)
                return solid("The United States, a party", 2, palette.own);
            return solid("A party", 1, palette.forLean);
        },
    };
}
/** The set lens a directive names, or undefined where the id is none of the three. */
export function setLens(id, campaign, palette) {
    if (id.startsWith(SIDES))
        return sidesLens(id, id.slice(SIDES.length), campaign, palette);
    if (id.startsWith(BODY))
        return bodyLens(id, id.slice(BODY.length), campaign, palette);
    if (id.startsWith(PARTIES))
        return partiesLens(id, id.slice(PARTIES.length), campaign, palette);
    return undefined;
}
