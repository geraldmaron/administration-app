import { stateApprovals, type Campaign } from "@admin/engine";
import { formatRatio, formatSignedPoints } from "@admin/player-core";
import { noData, solid, withFigure, type MapLens } from "./contract";
import { rampStep, type MapPalette } from "./palette";

/** At most two points either way fills the ramp: a week's or an act's move by state is rarely larger. */
const DELTA_SPAN = 0.02;

/** Smaller than a twentieth of a point is no change anyone would read. */
const STILL = 0.0005;

type Figures = Readonly<Record<string, number | undefined>>;

/**
 * How far either end of the ramp reaches: the largest move on the board, up
 * to the full span. A fixed span drew a week of tenth-of-a-point moves as one
 * flat "no change"; fitted to the week, the shape of the move shows and the
 * key says the scale it was drawn at.
 */
function spanOf(before: Figures | null, after: Figures | null): number {
  if (!before || !after) return DELTA_SPAN;
  const moves = Object.keys(after).flatMap((id) => (before[id] === undefined || after[id] === undefined ? [] : [Math.abs((after[id] as number) - (before[id] as number))]));
  const largest = moves.reduce((most, move) => Math.max(most, move), 0);
  return Math.min(DELTA_SPAN, Math.max(STILL * 2, largest));
}

function approvalMoveLens(id: string, before: Figures | null, after: Figures | null, empty: string, palette: MapPalette): MapLens {
  const span = spanOf(before, after);
  const reach = formatSignedPoints(span).replace(/^\+/, "");
  return {
    id,
    name: "Change in approval",
    level: "state",
    scale: "diverging",
    encoding: "color",
    legend: [
      { label: `Up ${reach} points or more`, color: palette.div[0] ?? palette.neutral },
      { label: "No change", color: palette.div[3] ?? palette.neutral },
      { label: `Down ${reach} points or more`, color: palette.div[6] ?? palette.neutral },
    ],
    read: (region) => {
      if (region.layer !== "states") return null;
      if (!before || !after) return noData(palette, empty);
      const was = before[region.id];
      const now = after[region.id];
      if (was === undefined || now === undefined) return noData(palette);
      const delta = now - was;
      const moved = Math.abs(delta) < STILL ? "No change" : `${formatSignedPoints(delta)} points`;
      const reading = solid(`${moved}, ${formatRatio(was)} to ${formatRatio(now)}`, delta, rampStep(palette.div, (span - delta) / (2 * span)));
      return Math.abs(delta) < STILL ? reading : withFigure(reading, formatSignedPoints(delta));
    },
  };
}

/**
 * Approval by state, as the change from the campaign before the last act or
 * advance to the campaign now. The dots carry the move, which is the payoff
 * of an act; the exact before and after figures are in the list and tooltip.
 */
export function deltaLens(baseline: Campaign | null, campaign: Campaign | null, palette: MapPalette): MapLens {
  const before = baseline ? (stateApprovals(baseline) as Figures) : null;
  const after = campaign ? (stateApprovals(campaign) as Figures) : null;
  return approvalMoveLens("delta", before, after, "Nothing has changed yet", palette);
}

const WEEK = "week:";

/** The lens id for one closed week's move in approval by state, as the digest names it. */
export const weekLensId = (week: number): string => `${WEEK}${week}`;

/**
 * One closed week's move in approval by state, read off the weekly series the
 * campaign keeps, so the digest can replay any week rather than only the last
 * run. The open week's figures stand in for the row the series has not yet
 * written. Undefined for an id that does not name a week.
 */
export function weekLens(id: string, campaign: Campaign | null, palette: MapPalette): MapLens | undefined {
  if (!id.startsWith(WEEK)) return undefined;
  const week = Number(id.slice(WEEK.length));
  if (!Number.isInteger(week)) return undefined;
  const sample = (turn: number): Figures | null => {
    if (!campaign) return null;
    if (turn >= campaign.turn) return (campaign.week?.stateApproval?.approval ?? stateApprovals(campaign)) as Figures;
    return (campaign.stateApprovalHistory?.find((row) => row.turn === turn)?.approval as Figures | undefined) ?? null;
  };
  return approvalMoveLens(id, sample(week), sample(week + 1), "This week is older than the record of state figures", palette);
}
