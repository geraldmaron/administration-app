import { selectNation, type Campaign } from "@admin/engine";
import { STATE_IDS, type StateId } from "@admin/world";

// The economy state by state, as the economy and budget lenses draw it. No
// state carries an economy of its own: each reading is the country's live
// figure carried through the state's authored standing against it
// (`character.vitalAnchor`), and a state's output is its authored share of
// the national product applied to the product this week, so the states still
// sum to the country. Nothing here is stored or billed.

export type StateEconomyRow = {
  readonly state: StateId;
  readonly name: string;
  /** Unemployment this week, 0..1: the country's rate plus the state's standing gap. */
  readonly unemployment: number;
  /** The state's unemployment less the country's, in rate units; positive is more out of work. */
  readonly jobsGap: number;
  /** Cost of living against the country's, as a fraction: 0.18 is 18% dearer. */
  readonly pricesGap: number;
  /** Gross state product this week, USD millions. */
  readonly output: number;
  /** The state's share of national output. */
  readonly outputShare: number;
  /** The share of state income that comes through federal outlays. */
  readonly federalDependence: number;
};

export type StateEconomyBoard = {
  /** The country's own unemployment this week, the line every state's gap is read against. */
  readonly nationalUnemployment: number;
  readonly rows: readonly StateEconomyRow[];
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Every state's economy this week, in `STATE_IDS` order. Empty for a campaign that governs no nation. */
export function stateEconomyBoard(campaign: Campaign): StateEconomyBoard {
  const nation = selectNation(campaign, campaign.founding.nation);
  if (!nation) return { nationalUnemployment: 0, rows: [] };
  const national = nation.stats.economy.unemployment;
  const states = STATE_IDS.flatMap((id) => {
    const runtime = campaign.states[id];
    return runtime ? [{ id, runtime }] : [];
  });
  const authoredTotal = states.reduce((sum, { runtime }) => sum + runtime.base.grp, 0);
  const rows = states.map(({ id, runtime }): StateEconomyRow => {
    const anchor = runtime.base.character.vitalAnchor;
    const unemployment = clamp01(national + anchor.unemployment);
    const outputShare = authoredTotal > 0 ? runtime.base.grp / authoredTotal : 0;
    return {
      state: id,
      name: runtime.base.name,
      unemployment,
      jobsGap: unemployment - national,
      pricesGap: anchor.costOfLiving,
      output: outputShare * nation.stats.economy.gdp,
      outputShare,
      federalDependence: runtime.base.character.federalDependence,
    };
  });
  return { nationalUnemployment: national, rows };
}
