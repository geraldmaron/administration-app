// The report scripts/bake-nations.mjs prints: what it baked, how well its fits
// hold, and how far each authored record sits from what its sources say.
//
// The drift is read, not acted on. The authored records keep their figures;
// this is how a reader finds out that one of them was hand-rounded a long way
// from a published number, and decides whether to move it.
import { getPath, median } from "./nation-seed.mjs";

const RATING_INDEX = { AAA: 21, AA: 19, A: 16, BBB: 13, BB: 10, B: 7, CCC: 4, D: 1 };

/**
 * Figures compared between an authored record and its sources. A magnitude is
 * compared as a ratio; a rate as a difference in its own unit, with the gap
 * beyond which the report calls it out.
 */
const COMPARED = [
  ["demography.population", "ratio"],
  ["economy.gdp", "ratio"],
  ["trade.exports", "ratio"],
  ["trade.imports", "ratio"],
  ["economy.reserves", "ratio"],
  ["economy.debt", "ratio"],
  ["military.budget", "ratio"],
  ["military.activeHeadcount", "ratio"],
  ["softPower.aidReceived", "ratio"],
  ["demography.urbanization", "rate", 0.05],
  ["demography.literacy", "rate", 0.05],
  ["demography.medianAge", "rate", 3],
  ["demography.birthRate", "rate", 0.002],
  ["demography.deathRate", "rate", 0.002],
  ["demography.netMigration", "rate", 0.002],
  ["economy.growth", "rate", 0.02],
  ["economy.inflation", "rate", 0.02],
  ["economy.unemployment", "rate", 0.02],
  ["energy.importDependence", "rate", 0.15],
  ["economy.sovereignRating", "rating", 3],
];

const RATIO_CALLOUT = 1.25;
const fmt = (value) => (typeof value === "number" ? (Math.abs(value) >= 1000 ? Math.round(value).toLocaleString("en-US") : String(Math.round(value * 10_000) / 10_000)) : String(value));

/** How far apart two readings of one figure are, and whether it is far enough to call out. */
function gap(kind, authored, sourced, threshold) {
  if (kind === "ratio") {
    if (authored <= 0 && sourced <= 0) return { size: 0, far: false };
    if (authored <= 0 || sourced <= 0) return { size: Infinity, far: true };
    const ratio = Math.max(authored, sourced) / Math.min(authored, sourced);
    return { size: ratio, far: ratio > RATIO_CALLOUT };
  }
  const size = kind === "rating" ? Math.abs(RATING_INDEX[authored] - RATING_INDEX[sourced]) : Math.abs(authored - sourced);
  return { size, far: size >= threshold };
}

function describe(kind, size) {
  if (kind === "ratio") return size === Infinity ? "one side is zero" : `${size.toFixed(2)}×`;
  return kind === "rating" ? `${size} notches` : fmt(size);
}

function driftRows(authored, baked) {
  const rows = [];
  for (const [dotted, kind, threshold] of COMPARED) {
    const pairs = [];
    for (const [id, record] of authored) {
      const figures = baked.get(id);
      if (!figures || figures.provenance.priors.includes(dotted)) continue;
      const a = getPath(record.stats, dotted);
      const s = getPath(figures.stats, dotted);
      pairs.push({ id, a, s, ...gap(kind, a, s, threshold) });
    }
    const far = pairs.filter((p) => p.far).sort((x, y) => y.size - x.size);
    const finite = pairs.map((p) => p.size).filter(Number.isFinite);
    rows.push({ dotted, kind, n: pairs.length, typical: median(finite), far });
  }
  return rows;
}

function tradeLine(rows) {
  const exports = rows.find((r) => r.dotted === "trade.exports");
  const lower = exports.far.filter((p) => p.a < p.s);
  return `Trade: ${lower.length} of ${exports.n} authored records state exports more than ${RATIO_CALLOUT}× below the World Bank's figure (${lower.slice(0, 8).map((p) => `${p.id} ${fmt(p.a)} vs ${fmt(p.s)}`).join(", ")}${lower.length > 8 ? ", …" : ""}).`;
}

function fitLines(gaps, judgment, judged) {
  const lines = [
    `Gap fits (sourced figures against each other): literacy ~ ln GDP/head n=${gaps.literacy.n} R²=${gaps.literacy.r2.toFixed(2)}; rating ~ ln GDP/head + effectiveness n=${gaps.rating.n} R²=${gaps.rating.r2.toFixed(2)}`,
    `Judged readings, fitted on ${judgment.sampleSize} authored records (R² is how much of the authored spread the sourced predictors explain):`,
  ];
  for (const [dotted, predictors] of judged) {
    const fit = judgment.fits.get(dotted);
    lines.push(`  ${dotted.padEnd(34)} ~ ${predictors.join(" + ").padEnd(26)} R²=${fit.r2.toFixed(2)}`);
  }
  lines.push(`  reserve/active headcount (authored median) ${judgment.reserveRatio.toFixed(3)}; aid given/GDP ~ ln GDP/head R²=${judgment.aidShare.r2.toFixed(2)}`);
  return lines;
}

function bakedLines(authored, baked) {
  const fresh = [...baked].filter(([id]) => !authored.has(id));
  const priorCounts = new Map();
  for (const [, figures] of fresh) for (const dotted of figures.provenance.priors) priorCounts.set(dotted, (priorCounts.get(dotted) ?? 0) + 1);
  const sourcedPriors = [...priorCounts];
  const clamped = fresh.flatMap(([id, figures]) => figures.provenance.clamped.map((dotted) => `${id} ${dotted}`));
  return [
    `Baked ${baked.size} of the roster; ${fresh.length} rows are new countries, ${baked.size - fresh.length} are authored records baked only for this report.`,
    `Sourced figures a prior had to fill in the new rows: ${sourcedPriors.sort((a, b) => b[1] - a[1]).map(([dotted, count]) => `${dotted} ${count}`).join(", ") || "none"}.`,
    `Held to the modeled range: ${clamped.join(", ") || "none"}.`,
  ];
}

export function renderReport({ authored, baked, gaps, judgment, verdict, judged }) {
  const rows = driftRows(authored, baked);
  const lines = [
    "# Nation bake",
    "",
    ...bakedLines(authored, baked),
    `Checks: ${verdict.failures.length === 0 ? "all passed" : `${verdict.failures.length} failed`} — ${verdict.moved} authored records moved by composing, ${verdict.datasetErrors} dataset validation errors.`,
    "",
    "## Fits",
    "",
    ...fitLines(gaps, judgment, judged),
    "",
    "## Drift: authored records against their sources",
    "",
    "Authored figures are unchanged. A ratio is the larger over the smaller; a rate is the difference in its own unit.",
    "",
    tradeLine(rows),
    "",
  ];
  for (const row of rows) {
    const typical = row.typical === undefined ? "n/a" : describe(row.kind, row.typical);
    lines.push(`- ${row.dotted}: ${row.n} compared, typical gap ${typical}, ${row.far.length} called out${row.far.length ? ": " : ""}${row.far.slice(0, 6).map((p) => `${p.id} ${fmt(p.a)}→${fmt(p.s)} (${describe(row.kind, p.size)})`).join(", ")}${row.far.length > 6 ? ", …" : ""}`);
  }
  return lines.join("\n");
}

