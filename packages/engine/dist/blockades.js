import { forceScale } from "./force-packages.js";
import { chokepointExposure } from "./geography.js";
import { liveNation } from "./instrument-gates.js";
export function applyBlockade(campaign, effect) {
    return { ...campaign, blockades: { ...campaign.blockades, [effect.set.id]: effect.set } };
}
/** Planning value: the share of seaborne trade a blockade stops against a coast with nothing to funnel it. */
export const BLOCKADE_BASE_CUT = 0.5;
/** Planning value: what a strait the target's trade has to pass adds, per unit of exposure: a navy sits on the strait. */
export const BLOCKADE_STRAIT_CUT = 0.25;
/** Planning value: the most a blockade stops; some trade always leaks by land, by air and by night. */
export const BLOCKADE_MAX_CUT = 0.9;
/** What a blockade ordered with this force against this coast would stop. */
export function blockadeCut(ctx) {
    const exposure = chokepointExposure(liveNation(ctx.campaign, ctx.target));
    const cut = (BLOCKADE_BASE_CUT + BLOCKADE_STRAIT_CUT * exposure) * forceScale(3, ctx.force);
    return Math.round(Math.min(BLOCKADE_MAX_CUT, Math.max(0, cut)) * 1000) / 1000;
}
/**
 * The record a landed blockade leaves, tied to the effects in the same packet
 * that hold it on station.
 */
export function blockadeRecord(ctx, conflictId, siblings) {
    const commitment = siblings.find((effect) => effect.kind === "commitment");
    const obligation = siblings.find((effect) => effect.kind === "warPowers" && effect.open !== undefined);
    const set = {
        id: `blockade:${ctx.actor}:${ctx.target}:${ctx.campaign.turn}`,
        imposer: ctx.actor,
        target: ctx.target,
        startedTurn: ctx.campaign.turn,
        cut: blockadeCut(ctx),
        conflictId,
        ...(commitment?.kind === "commitment" ? { commitmentId: commitment.set.id } : {}),
        ...(obligation?.kind === "warPowers" && obligation.open ? { obligationId: obligation.open.id } : {}),
    };
    return { kind: "blockade", set };
}
function stillOnStation(campaign, blockade) {
    if (campaign.conflicts[blockade.conflictId]?.status !== "active")
        return false;
    if (blockade.commitmentId !== undefined && campaign.commitments[blockade.commitmentId]?.status !== "active")
        return false;
    if (blockade.obligationId === undefined)
        return true;
    const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === blockade.obligationId);
    return obligation?.terminated === undefined;
}
const inForceBySnapshot = new WeakMap();
/** Every blockade still on station, oldest first. */
export function blockadesInForce(campaign) {
    const known = inForceBySnapshot.get(campaign);
    if (known)
        return known;
    const standing = Object.values(campaign.blockades ?? {})
        .filter((blockade) => stillOnStation(campaign, blockade))
        .sort((a, b) => a.startedTurn - b.startedTurn || a.id.localeCompare(b.id));
    inForceBySnapshot.set(campaign, standing);
    return standing;
}
/** The blockade this government already holds on that one, if it holds one. */
export function blockadeBy(campaign, imposer, target) {
    return blockadesInForce(campaign).find((blockade) => blockade.imposer === imposer && blockade.target === target);
}
/**
 * How much of a country's seaborne trade is stopped this week, 0..1.
 *
 * The heaviest blockade on it, not the sum: two navies off one coast stop the
 * same ships, and a second blockade adding its cut to the first would be the
 * compounding this record exists to end.
 */
export function blockadeCutOn(campaign, nation) {
    return blockadesInForce(campaign)
        .filter((blockade) => blockade.target === nation)
        .reduce((heaviest, blockade) => Math.max(heaviest, blockade.cut), 0);
}
