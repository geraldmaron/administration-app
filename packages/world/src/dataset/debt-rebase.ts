// Foreign public debt rebased to a sourced ratio where the vendored stock is
// wrong: `seed/debt-rebase.tsv`, cell for cell. The vendored nation-fiscal.tsv
// is never hand-edited, so a correction lives here and is applied on the way
// into the roster.

export type DebtRebaseRow = {
  readonly nation: string;
  /** Public debt over GDP. */
  readonly ratio: number;
  readonly source: string;
  readonly opened: string;
};

export const DEBT_REBASE: readonly DebtRebaseRow[] = [];

/** A record carrying the figures a rebase reads and writes. */
type Rebased = {
  readonly id: string;
  readonly stats: { readonly economy: { readonly gdp: number; readonly debt: number; readonly costOfLiving?: number } };
};

/**
 * The roster with each rebased nation's stock set to its sourced ratio, on the
 * same identity the ratio is read back through (debt over output at its price
 * level). The identity while the table is empty; a nation with no row keeps its
 * vendored stock.
 */
export function applyDebtRebase<T extends Rebased>(nations: readonly T[], table: readonly DebtRebaseRow[] = DEBT_REBASE): readonly T[] {
  if (table.length === 0) return nations;
  const ratios = new Map(table.map((row) => [row.nation, row.ratio] as const));
  return nations.map((nation) => {
    const ratio = ratios.get(nation.id);
    if (ratio === undefined) return nation;
    const economy = nation.stats.economy;
    const debt = Math.round(ratio * economy.gdp * (economy.costOfLiving ?? 1));
    return { ...nation, stats: { ...nation.stats, economy: { ...economy, debt } } };
  });
}
