import { formatMoney } from "../../format/money.js";
import { formatRatio } from "../../format/figures.js";
import { stateEconomyBoard } from "../../economy/state-economy.js";
import { magnitudeScale } from "./nation-lenses.js";
import { noData, solid } from "../contract.js";
import { rampStep } from "../palette.js";
// The economy by state: jobs and prices against the country, output, and how
// much of a state's income comes through Washington. Each is read off the
// country's live figures through the state's authored standing, so the map
// moves when the national economy does.
const NO_ADMINISTRATION = "No game in progress";
/** Jobs and prices diverge around the country's own figure; these are the gaps at the ramp's ends. */
const JOBS_SPAN = 0.03;
const PRICES_SPAN = 0.3;
/** Federal dependence runs from a tenth of income to DC's federal city; the ramp tops out where the states do. */
const DEPENDENCE_TOP = 0.3;
const signedPoints = (gap) => `${gap >= 0 ? "+" : "−"}${(Math.abs(gap) * 100).toFixed(1)} pts`;
const signedPercent = (gap) => `${gap >= 0 ? "+" : "−"}${Math.round(Math.abs(gap) * 100)}%`;
function stateLens(campaign, palette, read) {
    const rows = campaign ? new Map(stateEconomyBoard(campaign).rows.map((row) => [row.state, row])) : null;
    return (region) => {
        if (region.layer !== "states")
            return null;
        if (!rows)
            return noData(palette, NO_ADMINISTRATION);
        const row = rows.get(region.id);
        return row ? read(row) : noData(palette);
    };
}
/** The diverging ramp read so the warm end is the hard one: more out of work, dearer living. */
const againstNational = (palette, gap, span) => rampStep(palette.div, (gap + span) / (2 * span));
export function jobsLens(campaign, palette) {
    return {
        id: "jobs",
        name: "Jobs compared with the country",
        level: "state",
        scale: "diverging",
        encoding: "color",
        legend: [
            { label: "3 pts fewer out of work", color: palette.div[0] ?? palette.neutral },
            { label: "Same as the country", color: palette.div[3] ?? palette.neutral },
            { label: "3 pts more out of work", color: palette.div[6] ?? palette.neutral },
        ],
        read: stateLens(campaign, palette, (row) => solid(`${formatRatio(row.unemployment)} out of work, ${signedPoints(row.jobsGap)} compared with the country`, -row.jobsGap, againstNational(palette, row.jobsGap, JOBS_SPAN))),
    };
}
export function pricesLens(campaign, palette) {
    return {
        id: "prices",
        name: "Prices compared with the country",
        level: "state",
        scale: "diverging",
        encoding: "color",
        legend: [
            { label: "30% cheaper", color: palette.div[0] ?? palette.neutral },
            { label: "Same as the country", color: palette.div[3] ?? palette.neutral },
            { label: "30% more expensive", color: palette.div[6] ?? palette.neutral },
        ],
        read: stateLens(campaign, palette, (row) => solid(`Cost of living ${signedPercent(row.pricesGap)} compared with the country`, -row.pricesGap, againstNational(palette, row.pricesGap, PRICES_SPAN))),
    };
}
export function outputLens(campaign, palette) {
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
            return solid(`${formatMoney(row.output)} a year, ${formatRatio(row.outputShare)} of the country's economy`, row.output, rampStep(palette.seq, Math.sqrt(share)), magnitudeScale(row.outputShare, largest));
        }),
    };
}
export function dependenceLens(campaign, palette) {
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
        read: stateLens(campaign, palette, (row) => solid(`${formatRatio(row.federalDependence)} of income from federal spending`, row.federalDependence, rampStep(palette.seq, row.federalDependence / DEPENDENCE_TOP))),
    };
}
