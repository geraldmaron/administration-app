import { CHAMBER_NAMES, majorityOf, supermajorityOf } from "./congress.js";
import { independentsSitWith, voteOn } from "./congress-votes.js";
import { caucusBreakShare } from "./electorate.js";
import { ownIdentifierApproval } from "./opinion.js";
export { CAUCUS_BREAK_CEILING } from "./electorate.js";
const REMOVAL_VOTE_STEPS = [
    { beat: 1, step: "articles", chamber: "house", question: "Articles of impeachment", verb: "impeach", required: majorityOf },
    { beat: 2, step: "conviction", chamber: "senate", question: "Conviction and removal", verb: "convict", required: supermajorityOf },
];
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/**
 * What the case itself is worth to an opposition member, on top of how the
 * chamber is already disposed toward the administration.
 *
 * Deliberately modest, and measured from the rung the vote decides rather than
 * from the bottom of the ladder: what moves a member is how far past the bar
 * for this question the case has gone. An appeal large enough to carry a count
 * on its own would be the scalar ladder again, wearing a whip count.
 */
const CASE_APPEAL_CEILING = 0.3;
function caseAppeal(pressure, rung) {
    return CASE_APPEAL_CEILING * clamp01((pressure - rung) / (1 - rung));
}
/**
 * When the President's own caucus votes to remove them: only when the charge is
 * grave, and then in proportion to how far the President's own identifiers have
 * given up (`electorate.ts#caucusBreakShare`). A member reads their own voters,
 * not the country: at a 30 percent headline an honest failing President still
 * holds about 78 percent of their identifiers, so a quarter of the caucus is
 * gone if a grave charge arrives, and none of it without one.
 *
 * `collapsed` says whether the break is under way at all: more than a twentieth
 * of the caucus, about two senators in fifty.
 */
export const CAUCUS_BREAK_VISIBLE = 0.05;
export function caucusBreakAt(campaign, pressure, removalRung) {
    const grave = pressure >= removalRung;
    const approval = ownIdentifierApproval(campaign);
    const share = caucusBreakShare(approval);
    return { grave, approval, collapsed: share > CAUCUS_BREAK_VISIBLE, breaking: grave ? share : 0 };
}
function caucusWhip(vote, sitWithAdministration) {
    const tallies = vote.byCaucus;
    const independents = sitWithAdministration ? tallies.independent : { seats: 0, yeas: 0 };
    const otherSide = tallies.opposition.yeas + (sitWithAdministration ? 0 : tallies.independent.yeas);
    return {
        seats: tallies.administration.seats + independents.seats,
        yeas: tallies.administration.yeas + independents.yeas,
        mustBreak: Math.max(0, vote.required - otherSide),
    };
}
/**
 * Both counts at a given reading. `rungs` is the ladder: each count's case is
 * measured from its own rung, and the charge is grave at the last one.
 */
export function countRemovalVotes(state, charter, pressure, rungs) {
    if (charter.removalMechanism !== "impeachment")
        return [];
    const caucusBreak = caucusBreakAt(state, pressure, rungs[rungs.length - 1]);
    const sitWithAdministration = independentsSitWith(state.congress.caucusAnchor) === "administration";
    return REMOVAL_VOTE_STEPS.map((spec) => {
        const vote = voteOn(state, {
            chamber: spec.chamber,
            appeal: caseAppeal(pressure, rungs[spec.beat]),
            required: spec.required(state.congress.chambers[spec.chamber].seats),
            stance: "opposition",
            counted: "against",
            administrationBreak: caucusBreak.breaking,
        });
        return {
            beat: spec.beat,
            step: spec.step,
            question: spec.question,
            vote,
            caucus: caucusWhip(vote, sitWithAdministration),
            caucusBreak,
        };
    });
}
/**
 * One count, in a sentence: what the chamber has, against what it needs, and,
 * while it is short on the President's own side, how many of them it needs.
 */
export function removalVoteLine(vote) {
    const verb = REMOVAL_VOTE_STEPS.find((spec) => spec.step === vote.step).verb;
    const chamber = CHAMBER_NAMES[vote.vote.chamber];
    const count = `${chamber.charAt(0).toUpperCase()}${chamber.slice(1)} counts ${vote.vote.yeas} of the ${vote.vote.required} votes needed to ${verb}`;
    const { caucus } = vote;
    return !vote.vote.passed && caucus.mustBreak > caucus.yeas
        ? `${count}; ${caucus.mustBreak} of your own ${caucus.seats} would have to break.`
        : `${count}.`;
}
