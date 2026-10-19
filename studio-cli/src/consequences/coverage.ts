import {
  CONSEQUENCE_COVERAGE_TARGET,
  ConsequenceInstrument,
  ConsequenceRungBand,
  ConsequenceValence,
  CORE_CONSEQUENCES,
  type ConsequenceDef,
} from "@admin/content";

// Where to write next, as a table. The audit already refuses an empty cell and
// frowns at a thin one, but it says so one batch at a time; a writer deciding
// what to spend a week on needs the whole matrix at once, with the bundled
// floor and the corpus counted together because that sum is what a player
// actually draws from.

export type CoverageCell = {
  readonly instrument: ConsequenceInstrument;
  readonly band: ConsequenceRungBand;
  readonly valence: ConsequenceValence;
  readonly core: number;
  readonly corpus: number;
  readonly total: number;
  /** Whether anything in the cell is unconditioned — the floor the draw can always reach. */
  readonly guaranteed: boolean;
};

const inCell = (
  defs: readonly ConsequenceDef[],
  instrument: ConsequenceInstrument,
  band: ConsequenceRungBand,
  valence: ConsequenceValence,
): readonly ConsequenceDef[] =>
  defs.filter((def) => def.instrument === instrument && def.valence === valence && def.rungBands.includes(band));

const isGuaranteed = (def: ConsequenceDef): boolean => !def.conditions && !def.riskAffinity && def.once !== true;

export function consequenceCoverage(corpus: readonly ConsequenceDef[] = []): readonly CoverageCell[] {
  const cells: CoverageCell[] = [];
  for (const instrument of ConsequenceInstrument.options) {
    for (const band of ConsequenceRungBand.options) {
      for (const valence of ConsequenceValence.options) {
        const core = inCell(CORE_CONSEQUENCES, instrument, band, valence);
        const shipped = inCell(corpus, instrument, band, valence);
        cells.push({
          instrument,
          band,
          valence,
          core: core.length,
          corpus: shipped.length,
          total: core.length + shipped.length,
          guaranteed: [...core, ...shipped].some(isGuaranteed),
        });
      }
    }
  }
  return cells;
}

// A cell is reported as core+corpus rather than as one number: the bundled
// floor is the part nobody is going to write more of, so a writer reading this
// wants to see how much of a cell's depth is theirs.
function depth(cell: CoverageCell): string {
  const written = cell.corpus > 0 ? `${cell.core}+${cell.corpus}` : `${cell.core}`;
  if (cell.total === 0) return "EMPTY";
  return cell.guaranteed ? written : `${written} gated`;
}

export function formatCoverage(cells: readonly CoverageCell[]): string {
  const valences = ConsequenceValence.options;
  const lines = [
    `consequence coverage — ${cells.length} cells, target ${CONSEQUENCE_COVERAGE_TARGET} per cell (core pack + corpus)`,
    "",
    ["instrument".padEnd(12), "band".padEnd(6), ...valences.map((valence) => valence.padEnd(10))].join(""),
  ];
  for (const instrument of ConsequenceInstrument.options) {
    for (const band of ConsequenceRungBand.options) {
      const row = valences.map((valence) => {
        const cell = cells.find((c) => c.instrument === instrument && c.band === band && c.valence === valence);
        return (cell ? depth(cell) : "-").padEnd(10);
      });
      lines.push([instrument.padEnd(12), band.padEnd(6), ...row].join(""));
    }
  }
  const empty = cells.filter((cell) => cell.total === 0).length;
  const gated = cells.filter((cell) => cell.total > 0 && !cell.guaranteed).length;
  const atTarget = cells.filter((cell) => cell.total >= CONSEQUENCE_COVERAGE_TARGET).length;
  lines.push(
    "",
    `${atTarget}/${cells.length} cells at target; ${empty} empty; ${gated} with no unconditioned floor card`,
    empty + gated > 0 ? "an empty or wholly gated cell is a hole in the floor: write there first" : "the floor is whole; write where the count is lowest",
  );
  return lines.join("\n");
}
