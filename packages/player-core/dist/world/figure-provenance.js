import { NATION_FIGURES } from "@admin/world";
/**
 * Where a thin country's file says its numbers come from.
 *
 * A thin record states no figure of its own: every number on its file is one
 * a named source published, or a regional estimate where the source is silent,
 * and its temperament and aims are its region's and archetype's until somebody
 * researches it. A player reading a Tuvalu file is owed that sentence, the same
 * way the authored countries' files are owed the reference brief they have and
 * this one does not. Undefined for a country the dataset states in full.
 */
export function figureProvenance(nationId, fidelity = "thin") {
    const figures = NATION_FIGURES[nationId];
    if (!figures)
        return undefined;
    const { vintage, priors } = figures.provenance;
    const estimated = priors.length === 0
        ? "Every one of them comes from a source."
        : priors.length === 1
            ? "One number has no source, so it's an estimate based on its region."
            : `${priors.length} numbers have no source, so they're estimates based on its region.`;
    return (`Its numbers come from the World Bank, the US Energy Information Administration, and the CIA World Factbook, ` +
        `mostly from ${vintage}. ${estimated} ` +
        (fidelity === "thin"
            ? "We haven't researched this country in depth yet, so its temperament and goals are the usual ones for countries like it in its region. "
            : "Its goals, its red line, and which side it leans toward are researched. Its temperament is estimated from how it's governed. ") +
        `It doesn't have a full background brief yet.`);
}
