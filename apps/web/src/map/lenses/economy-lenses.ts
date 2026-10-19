import type { Campaign } from "@admin/engine";
import { formatMoney, formatRatio, stateEconomyBoard, type StateEconomyRow } from "@admin/player-core";
import type { Region } from "../data";
import { magnitudeScale } from "./nation-lenses";
import { noData, solid, type LensReading, type MapLens } from "./contract";
import { rampStep, type MapPalette } from "./palette";

// The economy by state: jobs and prices against the country, output, and how
// much of a state's income comes through Washington. Each is read off the
// country's live figures through the state's authored standing, so the map
// moves when the national economy does.

const NO_ADMINISTRATION = "No administration in office";

/** Jobs and prices diverge around the country's own figure; these are the gaps at the ramp's ends. */
const JOBS_SPAN = 0.03;
const PRICES_SPAN = 0.3;
/** Federal dependence runs from a tenth of income to DC's federal city; the ramp tops out where the states do. */
const DEPENDENCE_TOP = 0.3;

const signedPoints = (gap: number): string => `${gap >= 0 ? "+" : "−"}${(Math.abs(gap) * 100).toFixed(1)} pts`;
const signedPercent = (gap: number): string => `${gap >= 0 ? "+" : "−"}${Math.round(Math.abs(gap) * 100)}%`;

type RowReader = (row: StateEconomyRow) => LensReading;

function stateLens(campaign: Campaign | null, palette: MapPalette, read: RowReader): MapLens["read"] {
  const rows = campaign ? new Map(stateEconomyBoard(campaign).rows.map((row) => [row.state as string, row])) : null;
  return (region: Region) => {
    if (region.layer !== "states") return null;
    if (!rows) return noData(palette, NO_ADMINISTRATION);
    const row = rows.get(region.id);
    return row ? read(row) : noData(palette);
  };
}

/** The diverging ramp read so the warm end is the hard one: more out of work, dearer living. */
const againstNational = (palette: MapPalette, gap: number, span: number): string => rampStep(palette.div, (gap + span) / (2 * span));

export function jobsLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  return {
    id: "jobs",
    name: "Jobs against the country",
    level: "state",
    scale: "diverging",
    encoding: "color",
    legend: [
      { label: "3 pts fewer out of work", color: palette.div[0] ?? palette.neutral },
      { label: "As the country", color: palette.div[3] ?? palette.neutral },
      { label: "3 pts more out of work", color: palette.div[6] ?? palette.neutral },
    ],
    read: stateLens(campaign, palette, (row) => solid(`${formatRatio(row.unemployment)} out of work, ${signedPoints(row.jobsGap)} against the country`, -row.jobsGap, againstNational(palette, row.jobsGap, JOBS_SPAN))),
  };
}

export function pricesLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  return {
    id: "prices",
    name: "Prices against the country",
    level: "state",
    scale: "diverging",
    encoding: "color",
    legend: [
      { label: "30% cheaper", color: palette.div[0] ?? palette.neutral },
      { label: "As the country", color: palette.div[3] ?? palette.neutral },
      { label: "30% more expensive", color: palette.div[6] ?? palette.neutral },
    ],
    read: stateLens(campaign, palette, (row) => solid(`Cost of living ${signedPercent(row.pricesGap)} against the country`, -row.pricesGap, againstNational(palette, row.pricesGap, PRICES_SPAN))),
  };
}

export function outputLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  const largest = campaign ? Math.max(0, ...stateEconomyBoard(campaign).rows.map((row) => row.outputShare)) : 0;
  return {
    id: "output",
    name: "Output by state",
    level: "state",
    scale: "sequential",
    encoding: "color-radius",
    legend: [
      { label: "Smallest", color: palette.seq[0] ?? palette.neutral },
      { label: "Largest", color: palette.seq[6] ?? palette.neutral },
    ],
    read: stateLens(campaign, palette, (row) => {
      const share = largest > 0 ? row.outputShare / largest : 0;
      return solid(`${formatMoney(row.output)} a year, ${formatRatio(row.outputShare)} of the nation's output`, row.output, rampStep(palette.seq, Math.sqrt(share)), magnitudeScale(row.outputShare, largest));
    }),
  };
}

export function dependenceLens(campaign: Campaign | null, palette: MapPalette): MapLens {
  return {
    id: "federal-dependence",
    name: "Federal dependence",
    level: "state",
    scale: "sequential",
    encoding: "color",
    legend: [
      { label: "Little federal money", color: palette.seq[0] ?? palette.neutral },
      { label: `${Math.round(DEPENDENCE_TOP * 100)}% of income or more`, color: palette.seq[6] ?? palette.neutral },
    ],
    read: stateLens(campaign, palette, (row) => solid(`${formatRatio(row.federalDependence)} of income through federal outlays`, row.federalDependence, rampStep(palette.seq, row.federalDependence / DEPENDENCE_TOP))),
  };
}
