// The population growth rate, written from the three rates that make it.
//
// This sits in the assembly pipeline beside applyStateMass for the same
// reason that one is there: births, deaths and net arrivals are the facts, the
// growth rate is their net, and authoring the net a second time by hand only
// creates a copy that can disagree with its own parts. The dataset validator
// (vital-rates-reproduce-growth) then proves the derivation ran, which is what
// makes this a contract rather than a convention.
//
// Today the identity holds on every authored row, so this pass changes no
// number. That is the point at which it is cheapest to install: the derivation
// is provable before the first vintage refresh moves a birth rate, rather than
// after a refresh has already split the two.
//
// Four decimal places because that is the precision the rates are authored at;
// carrying the raw floating-point sum instead would put a growth rate of
// 0.0015000000000000005 on a nation record and in every save built from it.
const PRECISION = 10_000;
export function applyVitalRates(nations) {
    return nations.map((nation) => {
        const d = nation.stats.demography;
        const growthRate = Math.round((d.birthRate - d.deathRate + d.netMigration) * PRECISION) / PRECISION;
        if (growthRate === d.growthRate)
            return nation;
        return { ...nation, stats: { ...nation.stats, demography: { ...d, growthRate } } };
    });
}
