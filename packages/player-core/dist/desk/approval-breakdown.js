import { daysBetween, selectDateOfTurn } from "@admin/engine";
import { formatSignedPoints } from "../format/figures";
import { polarizationReading } from "../record/polarization-reading";
import { approvalDrag, approvalDrivers } from "./opinion-causes";
/** How far the ledger says each judgment moved over the seven days to today. */
function weekMoves(campaign) {
    const moved = {};
    for (const entry of campaign.ledger) {
        if (!entry.mood)
            continue;
        const date = entry.causal?.createdDate ?? selectDateOfTurn(campaign, entry.turn);
        if (daysBetween(date, campaign.calendar) >= 7)
            continue;
        for (const [driver, delta] of Object.entries(entry.mood))
            moved[driver] = (moved[driver] ?? 0) + (delta ?? 0);
    }
    return moved;
}
export function approvalBreakdown(campaign) {
    const moves = weekMoves(campaign);
    const drag = approvalDrag(campaign);
    return {
        approval: campaign.player.metrics.approval,
        judgments: approvalDrivers(campaign).map((bar) => {
            const week = moves[bar.driver] ?? 0;
            return { ...bar, week, weekText: Math.abs(week) < 0.0005 ? "No change this week" : `${formatSignedPoints(week)} pts this week` };
        }),
        ...(drag ? { drag } : {}),
        polarization: polarizationReading(campaign),
    };
}
