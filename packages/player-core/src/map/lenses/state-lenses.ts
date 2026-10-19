import { projectVote, projectedStateCalls, stateApprovals, type Campaign, type StateCall } from "@admin/engine";
import { formatRatio } from "../../format/figures.js";
import { leanWords, peopleWords } from "../../world/nation-overview.js";
import { districtById, stateById } from "@admin/world";
import { noData, solid, withFigure, type LensReading, type MapLens, type RegionRef } from "../contract.js";
import { magnitudeScale } from "./nation-lenses.js";
import { rampStep, type MapPalette } from "../palette.js";

// The state-level lenses: approval, partisan lean and the projected call.
// Approval is read from the engine's state approval, the same figure the
// headline averages, and is never shown at district level because no district
// figure would be honest.

const NO_ADMINISTRATION = "No game in progress";

/**
 * Approval's diverging scale: 70% or more at the favorable (cool) end, 30% or
 * less at the adverse end, so a state reads the same way here as under the
 * electoral call, where "for you" is the cool end.
 */
const APPROVAL_LOW = 0.3;
const APPROVAL_SPAN = 0.4;

function stateOnly(region: RegionRef, read: (id: string) => LensReading | null): LensReading | null {
  return region.layer === "states" ? read(region.id) : null;
}

export function approvalLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const approvals = campaign ? stateApprovals(campaign) : null;
  return {
    id: "approval",
    name: "Approval by state",
    level: "state",
    scale: "sequential",
    encoding: "color",
    // Approval is the public behind the President, not a party: its ramp is slate to gold, never blue to red.
    legend: [
      { label: "70% or more", color: palette.standing[6] ?? palette.neutral },
      { label: "50%", color: palette.standing[3] ?? palette.neutral },
      { label: "30% or less", color: palette.standing[0] ?? palette.neutral },
    ],
    read: (region) =>
      stateOnly(region, (id) => {
        if (!approvals) return noData(palette, NO_ADMINISTRATION);
        const approval = (approvals as Readonly<Record<string, number | undefined>>)[id];
        if (approval === undefined) return noData(palette);
        return withFigure(solid(`${formatRatio(approval)} approve`, approval, rampStep(palette.standing, (approval - APPROVAL_LOW) / APPROVAL_SPAN)), formatRatio(approval));
      }),
  };
}

/** Lean in points, the way a reader says it: D+12, R+4, Even. The panel says it the same way. */
export const leanText = leanWords;

/** Lean's scale runs to 30 points either way; DC and the reddest states sit at the ends. */
const LEAN_SPAN = 0.3;

export function leanLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const leanOf = (id: string): number | undefined => (campaign ? campaign.states[id as keyof typeof campaign.states]?.lean : undefined) ?? stateById.get(id)?.lean;
  return {
    id: "lean",
    name: "Partisan lean",
    level: "state",
    scale: "diverging",
    encoding: "color",
    legend: [
      { label: "D+30", color: palette.div[0] ?? palette.neutral },
      { label: "Even", color: palette.div[3] ?? palette.neutral },
      { label: "R+30", color: palette.div[6] ?? palette.neutral },
    ],
    read: (region) => {
      // A district has its own authored lean, so inside a detached state each one is drawn by it.
      const lean = region.layer === "districts" ? districtById.get(region.id)?.lean : region.layer === "states" ? leanOf(region.id) : null;
      if (lean === null) return null;
      if (lean === undefined) return noData(palette);
      return withFigure(solid(leanText(lean), lean, rampStep(palette.div, (lean + LEAN_SPAN) / (2 * LEAN_SPAN))), leanText(lean));
    },
  };
}

/** A carried state is safe at 55% of the two-way vote or more, and leaning under it. */
const SAFE_SHARE = 0.55;

/** One state's call: carried, lost, or (Maine and Nebraska) split by district. */
export function callReading(call: StateCall, palette: MapPalette): LensReading {
  const forYou = call.winner === "administration";
  // `share` is the administration's whoever won; the winner's is the larger of it and its complement.
  const ours = call.share;
  const winning = forYou ? call.share : 1 - call.share;
  const split = call.administrationVotes > 0 && call.administrationVotes < call.electoralVotes;
  if (split) {
    return {
      text: `Split: ${call.administrationVotes} of ${call.electoralVotes} electoral votes for you`,
      rank: ours,
      fill: { kind: "dither", colors: [palette.forLean, palette.againstLean], weights: [call.administrationVotes, call.electoralVotes - call.administrationVotes] },
    };
  }
  const safe = winning >= SAFE_SHARE;
  const color = forYou ? (safe ? palette.forStrong : palette.forLean) : safe ? palette.againstStrong : palette.againstLean;
  return solid(`${forYou ? "Called for you" : "Called against you"}, ${formatRatio(winning)} to ${formatRatio(1 - winning)}, ${call.electoralVotes} electoral votes`, ours, color);
}

export function callLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const calls = campaign ? new Map(projectedStateCalls(campaign, projectVote(campaign).share).map((call) => [call.state as string, call])) : null;
  return {
    id: "call",
    name: "Electoral call",
    level: "state",
    scale: "categorical",
    encoding: "dither",
    legend: [
      { label: "Safe for you", color: palette.forStrong },
      { label: "Leans your way", color: palette.forLean },
      { label: "Leans against you", color: palette.againstLean },
      { label: "Safe against you", color: palette.againstStrong },
    ],
    read: (region) =>
      stateOnly(region, (id) => {
        if (!calls) return noData(palette, NO_ADMINISTRATION);
        const call = calls.get(id);
        return call ? callReading(call, palette) : noData(palette);
      }),
  };
}

/** How many people live in each state, the live headcount: color on a log scale, radius by area. */
export function statePopulationLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const peopleOf = (id: string): number | undefined => (campaign ? campaign.states[id as keyof typeof campaign.states]?.population : undefined) ?? stateById.get(id)?.population;
  const max = Math.max(...[...stateById.keys()].map((id) => peopleOf(id) ?? 0));
  return {
    id: "state-population",
    name: "Population by state",
    level: "state",
    scale: "sequential",
    encoding: "color-radius",
    legend: [
      { label: "Fewer", color: palette.seq[0] ?? palette.neutral },
      { label: "More", color: palette.seq[6] ?? palette.neutral },
    ],
    read: (region) =>
      stateOnly(region, (id) => {
        const people = peopleOf(id);
        if (people === undefined || people <= 0) return noData(palette);
        return withFigure(solid(`${peopleWords(people)} people`, people, rampStep(palette.seq, (Math.log10(people) - 5.7) / 1.9), magnitudeScale(people, max)), peopleWords(people));
      }),
  };
}
