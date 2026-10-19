import {
  casualtyBand,
  documentMarking,
  selectActiveConflicts,
  selectBases,
  selectFindings,
  selectMunitions,
  selectObligations,
  sideOf,
  terminationClockRuns,
  terminationDaysRemaining,
  type Campaign,
  type DocumentMarking,
} from "@admin/engine";

// The morning brief's security section: what the services read overnight, in
// the order it matters, limited to what the President's own services can
// actually see. It composes what the engine already knows — no simulation
// runs to produce it — the same rule every W5 reading in this file family
// follows.

export type PdbUrgency = "hard" | "soft" | "ambient";

export type PdbItem = {
  readonly id: string;
  readonly headline: string;
  readonly urgency: PdbUrgency;
};

export type PdbReading = {
  readonly marking: DocumentMarking;
  readonly items: readonly PdbItem[];
};

function warItem(campaign: Campaign, conflictId: string): PdbItem | undefined {
  const conflict = campaign.conflicts[conflictId];
  if (!conflict) return undefined;
  const ourSide = sideOf(conflict, campaign.founding.nation);
  if (!ourSide) return undefined;
  const band = casualtyBand(campaign, conflict, ourSide);
  const cost = band ? `, with ${band.killed.low.toLocaleString("en-US")} to ${band.killed.high.toLocaleString("en-US")} killed so far` : "";
  return { id: `war:${conflictId}`, headline: `The fighting is at ${Math.round(conflict.intensity * 100)}% intensity${cost}.`, urgency: "ambient" };
}

function munitionsItems(campaign: Campaign): readonly PdbItem[] {
  const reading = selectMunitions(campaign);
  if (!reading) return [];
  return reading.classes
    .filter((row) => row.index !== null && row.index < 0.4)
    .map((row) => ({
      id: `munitions:${row.id}`,
      headline: `We're running low on ${row.id.replace(/-/g, " ")}${row.onOrder > 0 ? ". More is on order" : ""}.`,
      urgency: "soft" as const,
    }));
}

function clockItems(campaign: Campaign): readonly PdbItem[] {
  return selectObligations(campaign)
    .filter((obligation) => terminationClockRuns(campaign, obligation))
    .map((obligation) => {
      const days = terminationDaysRemaining(campaign, obligation);
      return {
        id: `clock:${obligation.target}`,
        headline: `The War Powers time limit on force against ${obligation.target} runs out in ${days} ${days === 1 ? "day" : "days"}.`,
        urgency: days <= 14 ? ("hard" as const) : ("soft" as const),
      };
    });
}

function findingsItem(campaign: Campaign): PdbItem | undefined {
  const open = selectFindings(campaign).filter((finding) => finding.closedDay === undefined).length;
  if (open === 0) return undefined;
  return { id: "findings", headline: `You have ${open} open ${open === 1 ? "finding" : "findings"} approving secret operations.`, urgency: "ambient" };
}

function basingItem(campaign: Campaign): PdbItem | undefined {
  const bases = selectBases(campaign);
  if (bases.length === 0) return undefined;
  return { id: "basing", headline: `You have forces at ${bases.length} ${bases.length === 1 ? "base" : "bases"} abroad.`, urgency: "ambient" };
}

/**
 * Today's brief: the wars this government is fighting, its munitions running
 * short, its War Powers clocks closing, and what the community has found
 * open. Never undefined once a campaign exists — a quiet night is still a
 * brief, it is simply a short one.
 */
export function pdbReading(campaign: Campaign): PdbReading {
  const items = [
    ...selectActiveConflicts(campaign).flatMap((conflict) => {
      const item = warItem(campaign, conflict.id);
      return item ? [item] : [];
    }),
    ...clockItems(campaign),
    ...munitionsItems(campaign),
    ...[findingsItem(campaign), basingItem(campaign)].filter((item): item is PdbItem => item !== undefined),
  ];
  return { marking: documentMarking({ family: "presidential-daily-brief" }), items };
}
