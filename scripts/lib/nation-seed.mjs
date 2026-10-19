// The pinned nation seed tables, read into dataset units.
//
// Everything here is either a unit conversion of a figure a source published or
// a statistic of those figures (a median, a least-squares fit). Nothing is a
// number about a particular country typed by hand. scripts/bake-nations.mjs
// composes these into full records; this module only reads and measures.
import { readFileSync } from "node:fs";
import path from "node:path";

export const QBTU_TO_TWH = 293.07107;

/** Tables and the columns each carries; identity cells are text, the rest `value@year`. */
const TABLES = {
  identity: "nation-identity.tsv",
  wb: "nation-figures.tsv",
  fiscal: "nation-fiscal.tsv",
  energy: "nation-energy.tsv",
};

function readTable(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.length > 0 && !line.startsWith("#"));
  const columns = lines[0].split("\t");
  const rows = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split("\t");
    if (cells.length !== columns.length) {
      throw new Error(`${path.basename(file)}: expected ${columns.length} columns, got ${cells.length}: ${cells[0]}`);
    }
    if (rows.has(cells[0])) throw new Error(`${path.basename(file)}: duplicate row ${cells[0]}`);
    rows.set(cells[0], Object.fromEntries(columns.map((column, i) => [column, cells[i]])));
  }
  return rows;
}

/** "12.5@2023" → { value: 12.5, year: 2023 }; a malformed cell fails the bake rather than baking as missing. */
function parseCell(raw, where) {
  if (raw === "") return undefined;
  const match = /^(-?[\d.]+(?:e[-+]?\d+)?)@(\d{4})$/i.exec(raw);
  if (!match || Number.isNaN(Number(match[1]))) throw new Error(`${where}: malformed seed cell "${raw}"`);
  return { value: Number(match[1]), year: Number(match[2]) };
}

function parseFigures(row, table) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([column]) => column !== "iso3")
      .map(([column, raw]) => [column, parseCell(raw, `${table} ${row.iso3}.${column}`)]),
  );
}

/** Every roster government's seed, keyed by ISO3. The identity table is the roster. */
export function loadSeed(seedDir) {
  const tables = Object.fromEntries(Object.entries(TABLES).map(([key, file]) => [key, readTable(path.join(seedDir, file))]));
  const seed = new Map();
  for (const [iso3, identity] of tables.identity) {
    const figures = Object.fromEntries(
      ["wb", "fiscal", "energy"].map((key) => {
        const row = tables[key].get(iso3);
        if (!row) throw new Error(`${TABLES[key]} has no row for roster government ${iso3}`);
        return [key, parseFigures(row, TABLES[key])];
      }),
    );
    seed.set(iso3, { iso3, identity, ...figures });
  }
  for (const key of ["wb", "fiscal", "energy"]) {
    for (const iso3 of tables[key].keys()) {
      if (!seed.has(iso3)) throw new Error(`${TABLES[key]} has a row for ${iso3}, which is not on the roster`);
    }
  }
  return seed;
}

export function getPath(object, dotted) {
  return dotted.split(".").reduce((node, key) => node?.[key], object);
}

export function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Solves A·x = b by Gaussian elimination with partial pivoting. */
function solve(a, b) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    if (Math.abs(m[pivot][col]) < 1e-12) throw new Error("least-squares fit is singular — a predictor is constant across the sample");
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row][col] / m[col][col];
      for (let k = col; k <= n; k += 1) m[row][k] -= factor * m[col][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Ordinary least squares with an intercept.
 *
 * `samples` are `{ x: number[], y: number }`. Returns the coefficients, the
 * sample size and R² so the bake can print how well each fit holds.
 */
export function fitLinear(samples) {
  const k = samples[0].x.length + 1;
  if (samples.length <= k) throw new Error(`least-squares fit needs more than ${k} samples, has ${samples.length}`);
  const xtx = Array.from({ length: k }, () => new Array(k).fill(0));
  const xty = new Array(k).fill(0);
  for (const { x, y } of samples) {
    const row = [1, ...x];
    for (let i = 0; i < k; i += 1) {
      xty[i] += row[i] * y;
      for (let j = 0; j < k; j += 1) xtx[i][j] += row[i] * row[j];
    }
  }
  const coef = solve(xtx, xty);
  const predict = (x) => coef[0] + x.reduce((sum, value, i) => sum + coef[i + 1] * value, 0);
  const mean = samples.reduce((sum, s) => sum + s.y, 0) / samples.length;
  const total = samples.reduce((sum, s) => sum + (s.y - mean) ** 2, 0);
  const residual = samples.reduce((sum, s) => sum + (s.y - predict(s.x)) ** 2, 0);
  return { coef, n: samples.length, r2: total > 0 ? 1 - residual / total : 1, predict };
}

const value = (cell) => cell?.value;

/**
 * The per-country quantities regional medians are taken over: ratios, so a
 * median of them can stand in for a missing figure at any country's scale.
 */
export function seedRatios(row) {
  const { wb, fiscal, energy, identity } = row;
  const gdp = value(wb.gdp_usd);
  const imports = value(wb.imports_usd);
  const forces = identity.standing_forces !== "no";
  const consumption = value(energy.consumption_qbtu);
  // EIA books a country's net electricity exports against its renewables line,
  // which can leave that fuel's consumption below zero (Turkmenistan's does);
  // no fuel is burned in negative amounts, so a share never starts below zero.
  const fuels = ["oil_qbtu", "coal_qbtu", "gas_qbtu", "nuclear_qbtu", "renewables_qbtu"].map((column) => {
    const reading = value(energy[column]);
    return reading === undefined ? undefined : Math.max(0, reading);
  });
  const fuelTotal = fuels.every((v) => v !== undefined) ? fuels.reduce((a, b) => a + b, 0) : 0;
  return {
    exportsShare: gdp && value(wb.exports_usd) !== undefined ? value(wb.exports_usd) / gdp : undefined,
    importsShare: gdp && imports !== undefined ? imports / gdp : undefined,
    reserveMonths: imports && value(wb.reserves_usd) !== undefined ? (value(wb.reserves_usd) / imports) * 12 : undefined,
    militaryShare: forces && gdp && value(wb.military_usd) !== undefined ? value(wb.military_usd) / gdp : undefined,
    costPerSoldier: forces && value(wb.armed_forces) > 0 && value(wb.military_usd) !== undefined ? value(wb.military_usd) / value(wb.armed_forces) : undefined,
    debtShare: value(fiscal.debt_pct_gdp) !== undefined ? value(fiscal.debt_pct_gdp) / 100 : undefined,
    inflation: value(wb.inflation) !== undefined ? value(wb.inflation) / 100 : undefined,
    unemployment: value(wb.unemployment) !== undefined ? value(wb.unemployment) / 100 : undefined,
    growth: value(wb.growth) !== undefined ? value(wb.growth) / 100 : undefined,
    homicide: value(wb.homicide_per_100k),
    energyPerHead: consumption > 0 && value(wb.population) ? (consumption * QBTU_TO_TWH) / value(wb.population) : undefined,
    selfSufficiency: consumption > 0 && value(energy.production_qbtu) !== undefined ? value(energy.production_qbtu) / consumption : undefined,
    oilShare: fuelTotal > 0 ? (fuels[0] + fuels[1]) / fuelTotal : undefined,
    gasShare: fuelTotal > 0 ? fuels[2] / fuelTotal : undefined,
    nuclearShare: fuelTotal > 0 ? fuels[3] / fuelTotal : undefined,
    renewablesShare: fuelTotal > 0 ? fuels[4] / fuelTotal : undefined,
  };
}

/** Medians of every ratio by GeoNames continent, with the world median as the fallback. */
export function continentMedians(seed) {
  const byContinent = new Map();
  const all = [...seed.values()].map((row) => ({ continent: row.identity.continent, ratios: seedRatios(row) }));
  const keys = Object.keys(all[0].ratios);
  const medianOf = (rows) => Object.fromEntries(keys.map((key) => [key, median(rows.map((r) => r.ratios[key]))]));
  const world = medianOf(all);
  for (const continent of new Set(all.map((r) => r.continent))) {
    const local = medianOf(all.filter((r) => r.continent === continent));
    byContinent.set(continent, Object.fromEntries(keys.map((key) => [key, local[key] ?? world[key]])));
  }
  return (continent) => byContinent.get(continent) ?? world;
}
