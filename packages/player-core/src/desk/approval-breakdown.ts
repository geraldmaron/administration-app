import { daysBetween, selectDateOfTurn, type Campaign, type OpinionDriver } from "@admin/engine";
import { formatSignedPoints } from "../format/figures";
import { polarizationReading, type PolarizationReading } from "../record/polarization-reading";
import { approvalDrag, approvalDrivers, type ApprovalDrag, type DriverBar } from "./opinion-causes";

/** One of the six judgments, with how far the last seven days moved it. */
export type JudgmentReading = DriverBar & {
  readonly week: number;
  readonly weekText: string;
};

/**
 * Approval opened up: the six public judgments it is made of, each with its
 * level, heading, cause and the week's move; the one cause pulling it down
 * hardest; and how divided the country is, which damps every move.
 */
export type ApprovalBreakdown = {
  readonly approval: number;
  readonly judgments: readonly JudgmentReading[];
  readonly drag?: ApprovalDrag;
  readonly polarization: PolarizationReading;
};

/** How far the ledger says each judgment moved over the seven days to today. */
function weekMoves(campaign: Campaign): Readonly<Record<OpinionDriver, number>> {
  const moved: Record<string, number> = {};
  for (const entry of campaign.ledger) {
    if (!entry.mood) continue;
    const date = entry.causal?.createdDate ?? selectDateOfTurn(campaign, entry.turn);
    if (daysBetween(date, campaign.calendar) >= 7) continue;
    for (const [driver, delta] of Object.entries(entry.mood)) moved[driver] = (moved[driver] ?? 0) + (delta ?? 0);
  }
  return moved as Readonly<Record<OpinionDriver, number>>;
}

export function approvalBreakdown(campaign: Campaign): ApprovalBreakdown {
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
