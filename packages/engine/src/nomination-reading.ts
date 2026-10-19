import type { Campaign } from "./state.js";
import { selectPendingOnFloor } from "./nomination.js";
import { isTerminal, type NominationStage } from "./nomination-stages.js";

// How the appointments pipeline reads as a whole. Split from nomination.ts,
// which holds the pipeline itself; this file holds what a surface reads off it.

/**
 * How the pipeline reads as a whole: what the player is looking at when they
 * open the appointments room.
 */
export type PipelineReading = {
  readonly total: number;
  readonly inExecutive: number;
  readonly inCommittee: number;
  readonly onFloor: number;
  readonly confirmed: number;
  readonly failed: number;
  readonly medianDays: number;
};

export function selectPipelineReading(campaign: Campaign): PipelineReading {
  const all = Object.values(campaign.nominations);
  const active = all.filter((nomination) => !isTerminal(nomination.stage));
  const executiveStages: readonly NominationStage[] = ["shortlist", "vetting", "prepared", "nominated"];
  const committeeStages: readonly NominationStage[] = [
    "referred",
    "disclosures",
    "hearing-scheduled",
    "hearing",
    "committee-action",
  ];
  const confirmed = all.filter(
    (nomination) => nomination.stage === "confirmed" || nomination.stage === "sworn-in",
  );
  const durations = confirmed
    .map((nomination) => {
      const seated = nomination.history.find((step) => step.stage === "confirmed");
      return seated ? seated.day - nomination.openedDay : undefined;
    })
    .filter((days): days is number => days !== undefined)
    .sort((a, b) => a - b);

  return {
    total: all.length,
    inExecutive: active.filter((nomination) => executiveStages.includes(nomination.stage)).length,
    inCommittee: active.filter((nomination) => committeeStages.includes(nomination.stage)).length,
    onFloor: selectPendingOnFloor(campaign).length,
    confirmed: confirmed.length,
    failed: all.filter(
      (nomination) =>
        nomination.stage === "rejected" || nomination.stage === "returned" || nomination.stage === "withdrawn",
    ).length,
    medianDays: durations.length === 0 ? 0 : durations[Math.floor(durations.length / 2)]!,
  };
}
