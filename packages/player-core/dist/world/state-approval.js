import { projectVote, projectedStateCalls, stateApprovals, stateShareShifts, } from "@admin/engine";
import { formatRatio } from "../format/figures";
export const STATE_APPROVAL_HISTORY_NOTE = "Recorded every week since you took office. There's nothing from before that.";
/**
 * Why a state's approval and its call disagree, or nothing where they agree.
 *
 * `shift` is how far the map already puts this state from the country. When it
 * points the way the call went, the state's own lean is what outweighs the
 * figure; when it does not, the state is following the national vote, which
 * runs on more than approval.
 */
export function stateApprovalDivergence(approval, call, shift) {
    const approves = approval >= 0.5;
    const carried = call.winner === "administration";
    if (approves === carried)
        return undefined;
    const figure = `${approves ? "Approves" : "Disapproves"} at ${formatRatio(approves ? approval : 1 - approval)}`;
    if (approves) {
        return shift < 0
            ? `${figure}, but it's still expected to vote against you. The state's usual party lean matters more here than your approval.`
            : `${figure}, but it's still expected to vote against you. The national vote is running behind your approval, and this state is following it.`;
    }
    return shift > 0
        ? `${figure}, but it's still expected to vote for you. The state's usual party lean carries it.`
        : `${figure}, but it's still expected to vote for you. The national vote is running ahead of your approval, and this state is following it.`;
}
function historyOf(campaign, id) {
    return (campaign.stateApprovalHistory ?? []).flatMap((sample) => {
        const approval = sample.approval[id];
        return approval === undefined ? [] : [{ turn: sample.turn, approval }];
    });
}
/** A state's approval, its projected call, the line between them, and its weekly record. Undefined for a state the campaign does not carry. */
export function stateApprovalReading(campaign, id) {
    const approval = stateApprovals(campaign)[id];
    const call = projectedStateCalls(campaign, projectVote(campaign).share).find((entry) => entry.state === id);
    const shift = stateShareShifts(campaign)[id];
    if (approval === undefined || call === undefined || shift === undefined)
        return undefined;
    const divergence = stateApprovalDivergence(approval, call, shift);
    return {
        approval,
        call,
        ...(divergence === undefined ? {} : { divergence }),
        history: historyOf(campaign, id),
        historyNote: STATE_APPROVAL_HISTORY_NOTE,
    };
}
