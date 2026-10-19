import { TARIFF_PHASE_WEEKS, projectTariffPrices, selectNation, tradeSector } from "@admin/engine";
// What a tariff does to the consumer price level, as the tariff form previews it
// and as the economy room reads it once signed. Both print through `priceStep`
// from the engine's one figure, so the preview and the applied reading are the
// same string for the same tariff.
/** A consumer-price step in points of the price level: "+0.03 pts". */
export function priceStep(step) {
    const points = step * 100;
    if (points === 0)
        return "No measurable change";
    const figure = Math.abs(points) < 0.01 ? "under 0.01" : Math.abs(points).toFixed(2);
    return `${points > 0 ? "+" : "−"}${figure} pts`;
}
/** Every administration tariff in force, with the consumer-price step it carries. */
export function appliedTariffPrices(campaign) {
    return projectTariffPrices(campaign).measures.flatMap((entry) => {
        const measure = campaign.trade.measures[entry.measure];
        if (!measure)
            return [];
        const partner = selectNation(campaign, measure.target)?.base.identity.name ?? String(measure.target);
        const sector = tradeSector(measure.sector)?.name ?? measure.sector;
        return [
            {
                measure: entry.measure,
                label: `${Math.round(measure.rate * 100)}% on ${sector.toLowerCase()} from ${partner}`,
                figure: priceStep(entry.step),
                progress: entry.weeksIn >= TARIFF_PHASE_WEEKS ? "fully passed on to prices" : `${entry.weeksIn} of ${TARIFF_PHASE_WEEKS} weeks in`,
            },
        ];
    });
}
