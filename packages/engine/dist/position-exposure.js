import { READINESS_RECOVERY_PER_TURN } from "./capacity.js";
import { COHORT_MOTIVATION } from "./demos.js";
import { nationName } from "./naming.js";
import { selectNation, selectRelationship } from "./state.js";
import { selectState } from "./states.js";
// The same floor the cost marks draw at: a movement the glyph renders as flat
// must not be spoken as a consequence beside it.
const MARK_FLOOR = 0.005;
/** How many places or people a line names before it stops being a sentence and starts being a table. */
const NAMED_LIMIT = 3;
function joinNames(names) {
    if (names.length <= 1)
        return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
function frontExposure(commitment) {
    switch (commitment.conflictMove) {
        case undefined:
            return undefined;
        case "offerTerms":
            return {
                id: "front-offered",
                description: "Terms offered are terms on the record. Refused, you asked in public and were turned down in public.",
            };
        case "acceptTerms":
            return {
                id: "front-accepted",
                description: "These are the terms the war is settled on, and the terms are what it is remembered by.",
            };
        case "deescalate":
            return {
                id: "front-cooled",
                description: "Standing down is read as standing down, by the people counting on you as well as by the people across from you.",
            };
    }
}
function briefingExposure(script) {
    if (script.briefingDoubted !== true)
        return undefined;
    return {
        id: "briefing-unconfirmed",
        description: "The claim underneath this has not been confirmed, and the answer is built on it.",
    };
}
/**
 * Money the country ends up owing, as opposed to money the administration
 * obligates.
 *
 * The price line quotes the reply's own `cost.treasury`, which is budget
 * authority the President spends. A scenario's declared financial impact is a
 * different book entirely: it is borrowed, it lands on the national debt, and
 * it is still there at the end of the term. Nothing on the decision surface
 * said so, so a player reading a small figure under "It costs you" had no way
 * to tell a decision that spends a hundred million of their own apportionment
 * from one that puts a supplemental on the country's account.
 */
function borrowedExposure(commitment) {
    const owed = (commitment.resolved ?? []).some((effect) => effect.kind === "choiceBorrowing" && effect.amount > 0);
    if (!owed)
        return undefined;
    return {
        id: "debt-borrowed",
        description: "The money behind this is borrowed rather than appropriated: it lands on the national debt and is still there when you leave.",
    };
}
/**
 * What the answer takes out of the force, and for how long.
 *
 * The clock is the part the price line cannot say: "readiness falls noticeably"
 * is a magnitude, and what actually constrains the next month is that the
 * military rungs are gated on the reading the whole time it is rebuilding.
 */
function forceExposure(commitment) {
    const spent = commitment.cost.militaryReadiness;
    if (spent === undefined || spent >= -MARK_FLOOR)
        return undefined;
    const weeks = Math.ceil(-spent / READINESS_RECOVERY_PER_TURN);
    return {
        id: "force-short",
        description: `The force is short of what this spends for about ${weeks === 1 ? "a week" : `${weeks} weeks`}, and the military rungs are gated on readiness the whole time.`,
    };
}
/** The counterpart's own reading of the sentence, which is what they act on later rather than the sentence itself. */
function counterpartExposure(campaign, script, commitment) {
    if (script.counterpart === campaign.founding.nation)
        return undefined;
    if (!selectRelationship(campaign, script.counterpart, campaign.founding.nation))
        return undefined;
    const identity = selectNation(campaign, script.counterpart)?.base.identity;
    const who = identity ? nationName(identity) : script.counterpart;
    const moved = commitment.relationship ?? {};
    if ((moved.tension ?? 0) > 0 || (moved.militaryThreat ?? 0) > 0) {
        return { id: "counterpart-hardens", description: `${who} reads this as a threat, and the reading is what they act on afterwards.` };
    }
    if ((moved.trust ?? 0) < 0) {
        return { id: "counterpart-trust", description: `${who} trusts you less for it, and trust is what the next thing you ask them for is priced against.` };
    }
    return { id: "counterpart-remembers", description: `${who} keeps this sentence in its record of you and reads it back the next time you need something.` };
}
/** Which people carry it. Read off the strain the commit actually writes, never off the band the impact row already draws. */
function cohortExposure(commitment) {
    const strained = (commitment.resolved ?? []).flatMap((effect) => effect.kind === "cohort" && (effect.addStrain !== undefined || (effect.replaceStrains ?? []).length > 0)
        ? [COHORT_MOTIVATION[effect.cohort]?.name ?? effect.cohort]
        : []);
    const named = [...new Set(strained)].slice(0, NAMED_LIMIT);
    if (named.length === 0)
        return undefined;
    return {
        id: "cohorts-strained",
        description: `${joinNames(named)} carry this one, and a group that carries something remembers it through the next election.`,
    };
}
/**
 * Which places carry it. Lean is the only thing a state's own reading is
 * counted in, and nothing on the decision surface said a word about it.
 *
 * A national signature moves every state that clears the floor, and the
 * effects arrive in the order the states are declared — which is alphabetical,
 * so a flood on the Mississippi used to name Alabama, Alaska and Arizona. The
 * line names the states that move most, weighted by what their answer is
 * worth in electoral votes, and says how many more there are.
 */
function stateExposure(campaign, commitment) {
    const weights = new Map();
    for (const effect of commitment.resolved ?? []) {
        if (effect.kind !== "state" || (effect.deltas?.lean ?? 0) === 0)
            continue;
        const state = selectState(campaign, effect.state);
        const weight = Math.abs(effect.deltas?.lean ?? 0) * (state?.base.electoralVotes ?? 1);
        const known = weights.get(effect.state);
        if (!known || known.weight < weight) {
            weights.set(effect.state, { name: state?.base.name ?? effect.state, weight });
        }
    }
    const ranked = [...weights.values()].sort((a, b) => b.weight - a.weight).map((entry) => entry.name);
    if (ranked.length === 0)
        return undefined;
    const named = joinNames(ranked.slice(0, NAMED_LIMIT));
    return {
        id: "states-moved",
        description: ranked.length <= NAMED_LIMIT
            ? `${named} move on this, and a state's answer is counted in electoral votes.`
            : `${ranked.length} states move on this, led by ${named}, and a state's answer is counted in electoral votes.`,
    };
}
function alignmentExposure(commitment) {
    if (!commitment.pull)
        return undefined;
    return {
        id: "alignment-staked",
        description: "This stakes the administration on where it stands, and the half of the country that reads it the other way is not persuaded by it.",
    };
}
/**
 * Everything this answer exposes, heaviest first.
 *
 * The order is a judgment about what a president needs to meet first when the
 * surface has room for one line: a war before a briefing, a briefing before a
 * debt the country carries past the term, the debt before the force, the force
 * before a foreign capital's memory, a capital's memory before the people and
 * places at home, and the argument about where you stand last — it is the one
 * the player already knows they are having.
 */
export function projectPositionExposure(campaign, script, commitment) {
    return [
        frontExposure(commitment),
        briefingExposure(script),
        borrowedExposure(commitment),
        forceExposure(commitment),
        counterpartExposure(campaign, script, commitment),
        cohortExposure(commitment),
        stateExposure(campaign, commitment),
        alignmentExposure(commitment),
    ].filter((entry) => entry !== undefined);
}
