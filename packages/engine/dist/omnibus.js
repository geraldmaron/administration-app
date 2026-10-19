import { CHAMBERS, carried, floorThreshold, headOfGovernment } from "./congress.js";
import { KEEP_GOVERNMENT_OPEN_OPPOSITION, legislativeVoteOn } from "./congress-votes.js";
import { possessive } from "./naming.js";
import { selectBudget } from "./budget.js";
import { selectBudgetYear, selectFiscalYearEndTurn } from "./clock.js";
import { enactBudget, projectBudgetDraft } from "./budget-draft.js";
// The full-year book both sides wrote.
//
// A regular appropriation is counted as the administration's program: each
// line the President moves is voted on its own, and in a Senate that needs
// sixty none of them clears, so the government ran a term on stopgaps. That is
// not how full-year money passes. The appropriators of both caucuses write one
// omnibus, the minority's priorities go in beside the President's, and the
// other side's leaders deliver the votes for a book they helped write. The
// President pays for it twice: half of every change they asked for is given
// away in the negotiation, and the concession is public.
/** The share of each change the President asked for that survives the negotiation. */
const OMNIBUS_KEPT_SHARE = 0.5;
/** What giving half the book away costs the President's standing, the week it passes. */
const OMNIBUS_STANDING_COST = 0.02;
/** Each changed line moved half as far as the President asked. */
function negotiated(campaign, candidate) {
    const standing = selectBudget(campaign);
    const draft = Object.fromEntries(candidate.changed.map((account) => [
        account,
        standing[account] + (candidate.allocation[account] - standing[account]) * OMNIBUS_KEPT_SHARE,
    ]));
    const halved = projectBudgetDraft(campaign, draft);
    // Halfway between two allocations the draft already accepted stays inside the same caps.
    return halved.ok ? halved.candidate : candidate;
}
/**
 * The count on the negotiated book, one vote per chamber: the minority votes at
 * the share it gives a measure its own leaders wrote, and the President's side
 * reads the room as it stands, so a President the room has turned on can still
 * lose it.
 */
export function projectOmnibus(campaign, candidate) {
    const votes = CHAMBERS.map((chamber) => legislativeVoteOn(campaign, {
        chamber,
        appeal: 0,
        required: floorThreshold(campaign.congress, chamber, "ordinary"),
        stance: "neutral",
        oppositionShare: KEEP_GOVERNMENT_OPEN_OPPOSITION,
    }));
    return { conceded: negotiated(campaign, candidate), votes, carries: carried(votes) };
}
/** Pass the negotiated book, or refuse and leave the government to the stopgap. */
export function requestOmnibus(campaign, candidate) {
    const projection = projectOmnibus(campaign, candidate);
    if (!projection.carries) {
        return { ok: false, reason: `Congress will not take up an omnibus on ${possessive(headOfGovernment(campaign))} terms.` };
    }
    const enacted = enactBudget(campaign, projection.conceded);
    if (!enacted.ok)
        return enacted;
    const congress = {
        ...campaign.congress,
        appropriation: {
            enactedTurn: campaign.turn,
            throughTurn: Math.max(campaign.congress.appropriation.throughTurn, selectFiscalYearEndTurn(campaign, selectBudgetYear(campaign))),
            onPriorYear: false,
            priorYear: [],
        },
    };
    return {
        ok: true,
        packet: {
            ...enacted.packet,
            narration: {
                summary: `Congress passes an omnibus both sides' appropriators wrote, funding the government for the year. ${enacted.packet.narration.summary}`,
            },
            effects: [...enacted.packet.effects, { kind: "metric", deltas: { standing: -OMNIBUS_STANDING_COST } }, { kind: "congress", set: congress }],
        },
    };
}
