import { hasIntelOnNation } from "@admin/engine";
/** A foreign government's size, or undefined for an id the board does not carry. */
export function nationPower(campaign, nation) {
    const stats = campaign.nations[nation]?.stats;
    if (!stats)
        return undefined;
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
