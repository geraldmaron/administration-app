import { casualtyBand, declaredWarheads, hasIntelOnNation, joinCounterfactual, projectLikelyJoiners, selectBases, selectMunitions, settlementEffects, } from "@admin/engine";
import { reasonLines } from "../reasons/reason-lines";
// A war's own file: who joined and why, what it has cost in bands, the stocks
// it has drawn, and how it can end. Every figure is read off the engine's own
// selectors; nothing here decides a war, and no reason is composed twice —
// `reasonLines` is the one phrase table, and it is the one place the fog is
// enforced, so a joiner this file cannot explain prints "Joined" alone rather
// than a guess.
const NOTABLE_NON_JOINERS_SHOWN = 3;
/**
 * Whether a stamp answers the question of going into a war. A government
 * deciding on its own asks "join-war"; one the President's call reached asks
 * "answer-call" instead, and both are a decision about the same war.
 */
function isJoinStamp(stamp) {
    return stamp?.question === "join-war" || stamp?.question === "answer-call";
}
/**
 * The stamp a nation's join into this conflict was resolved with, if the join
 * kept one: its own decision to go in, or its answer to the President's call.
 */
function joinStampFor(campaign, nation, conflictId) {
    for (let index = campaign.ledger.length - 1; index >= 0; index -= 1) {
        const entry = campaign.ledger[index];
        const stamp = entry.causal?.decision;
        if (isJoinStamp(stamp) && stamp.actor === nation && (stamp.subject === undefined || stamp.subject === conflictId))
            return stamp;
    }
    return undefined;
}
function joinersOf(campaign, conflict) {
    const sides = ["aggressor", "defender"];
    return sides.flatMap((side) => conflict.joined[side].map((nation) => {
        const stamp = joinStampFor(campaign, nation, conflict.id);
        return { nation, side, reasons: stamp ? reasonLines(stamp, campaign) : [] };
    }));
}
/**
 * Up to three governments the engine named for staying out of this war, the
 * surface's "did not send forces" line: the refusals it stamped when it
 * decided them, oldest first, whether a government stayed out on its own or
 * turned down the President's call. A government the President's services
 * cannot read is not named, because who declined is itself an intelligence
 * read; one that fought and has gone home is in the war's record of leavers,
 * not here; and one that has since come in is a joiner.
 */
function notableNonJoiners(campaign, conflict) {
    const excluded = new Set([conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender, ...(conflict.left ?? []), campaign.founding.nation]);
    const named = campaign.ledger.flatMap((entry) => {
        const stamp = entry.causal?.decision;
        if (!isJoinStamp(stamp) || stamp.acts || stamp.subject !== conflict.id)
            return [];
        return excluded.has(stamp.actor) ? [] : [stamp.actor];
    });
    return [...new Set(named)].filter((nation) => hasIntelOnNation(campaign, nation)).slice(0, NOTABLE_NON_JOINERS_SHOWN);
}
/** One war's file. Undefined for a conflict not on the board. */
export function warFileReading(campaign, conflictId) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict)
        return undefined;
    const belligerents = [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender];
    return {
        conflictId,
        conflict,
        joiners: joinersOf(campaign, conflict),
        notableNonJoiners: notableNonJoiners(campaign, conflict),
        likelyJoiners: {
            aggressor: projectLikelyJoiners(campaign, conflictId, "aggressor"),
            defender: projectLikelyJoiners(campaign, conflictId, "defender"),
        },
        casualties: {
            aggressor: casualtyBand(campaign, conflict, "aggressor"),
            defender: casualtyBand(campaign, conflict, "defender"),
        },
        arsenals: new Map(belligerents.map((nation) => [nation, declaredWarheads(campaign, nation)])),
        munitions: selectMunitions(campaign),
        // Installations in a belligerent's own territory, read as context for the front — not a claim that the base itself is committed to this war.
        bases: selectBases(campaign).filter((base) => belligerents.includes(base.country)),
        settlement: settlementEffects(campaign, conflict),
        counterfactuals: (nation) => joinCounterfactual(campaign, conflictId, nation),
    };
}
