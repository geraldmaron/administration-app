import { hasIntelOnNation, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";

// The raw size of a government, for the figures a country file draws as
// power and economy. These are the nation's own runtime stats, so they move
// with the campaign; a screen scales them against its peers and chooses the
// words. Money is in USD millions (DECISIONS §4.3) except per-capita, which is
// whole USD, exactly as the dataset holds them.

export type NationPower = {
  /** Residents, a headcount. */
  readonly population: number;
  /** Gross domestic product, USD millions. */
  readonly gdpUsdMillions: number;
  /** GDP per resident, whole USD, as the dataset states it. */
  readonly gdpPerCapitaUsd: number;
  /**
   * Defense spending, USD millions. Absent where the services have no read on
   * the government: its budget is not a published figure.
   */
  readonly militarySpendUsdMillions?: number;
  /** Military spending as a share of GDP, 0..1, where the budget is read. */
  readonly militarySpendShareOfGdp?: number;
};

/** A foreign government's size, or undefined for an id the board does not carry. */
export function nationPower(campaign: Campaign, nation: NationId): NationPower | undefined {
  const stats = campaign.nations[nation]?.stats;
  if (!stats) return undefined;
  const { population } = stats.demography;
  const { gdp, gdpPerCapita } = stats.economy;
  const spend = hasIntelOnNation(campaign, nation) ? stats.military.budget : undefined;
  return {
    population,
    gdpUsdMillions: gdp,
    gdpPerCapitaUsd: gdpPerCapita,
    ...(spend !== undefined ? { militarySpendUsdMillions: spend, ...(gdp > 0 ? { militarySpendShareOfGdp: spend / gdp } : {}) } : {}),
  };
}
