// The playable nation's mass and output, written from the states that hold
// them. One level owns a fact; every coarser level is a sum of it.
//
// This sits in the assembly pipeline beside applyGeography, applyMemberships,
// applyTrade and applyBands for the reason all four are there: the figure is
// derived, and authoring it a second time by hand only creates a copy that can
// disagree with the first. The dataset validator (checkStateMass) then proves
// the derivation actually ran, which is what makes this a contract rather than
// a convention — a state figure edited without a rebuild fails the dataset.
//
// Today the sums equal the figures already authored on the USA record, so this
// pass changes no number. That is the point at which it is cheapest to install:
// the derivation is in place and provable before the first vintage refresh
// moves a state, rather than after a refresh has already split the two.
//
// Only the United States. Every other nation is the finest authored level it
// has, so its population is authored on the nation and there is nothing to sum.
export const MASS_DERIVED_NATION = "USA";
export function applyStateMass(nations, states) {
    if (states.length === 0)
        return [...nations];
    const population = states.reduce((sum, state) => sum + state.population, 0);
    const gdp = states.reduce((sum, state) => sum + state.grp, 0);
    return nations.map((nation) => {
        if (nation.id !== MASS_DERIVED_NATION)
            return nation;
        return {
            ...nation,
            stats: {
                ...nation.stats,
                demography: { ...nation.stats.demography, population },
                // gdpPerCapita is not recomputed here. It is an authored figure the
                // validator already checks against gdp and population for unit
                // consistency, and silently rewriting it would turn a check that
                // catches a bad edit into one that can never fail.
                economy: { ...nation.stats.economy, gdp },
            },
        };
    });
}
