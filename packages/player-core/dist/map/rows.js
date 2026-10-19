import { layerOfLevel, readRegion, refOf, regionName } from "./contract.js";
/** The one color a fill draws as: a solid's color, a mix's largest share, or the quiet land. */
export function fillColor(fill, palette) {
    if (fill.kind === "solid")
        return fill.color;
    if (fill.kind === "none")
        return palette.land;
    const top = fill.weights.reduce((best, weight, index) => (weight > (fill.weights[best] ?? 0) ? index : best), 0);
    return fill.colors[top] ?? palette.land;
}
function toRow(region, reading, palette) {
    return {
        regionKey: refOf(region),
        label: regionName(region),
        value: reading.text,
        rank: reading.rank,
        fill: fillColor(reading.fill, palette),
        ...(reading.fill.kind === "dither" ? { mix: { colors: reading.fill.colors, weights: reading.fill.weights } } : {}),
        ...(reading.figure === undefined ? {} : { figure: reading.figure }),
        ...(reading.salience === undefined ? {} : { salience: reading.salience }),
    };
}
/**
 * The lens as a ranked list at the level the map is drawing: the data table,
 * the arrow-key order and the forced-colors view. Regions the lens says
 * nothing about are left out; regions with no data sort last.
 */
export function lensRows(lens, regions, effective, palette) {
    // A state lens drawn at district level still ranks states: its districts carry only their state's value.
    const layer = layerOfLevel(lens.level === "state" && effective === "district" ? "state" : effective);
    return regions
        .filter((region) => region.layer === layer)
        .flatMap((region) => {
        const reading = lens.read(region, effective);
        return reading ? [toRow(region, reading, palette)] : [];
    })
        .sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label));
}
/** The lens read for a map: the ranked rows, plus the color of every other drawn region the lens says something about. */
export function lensView(lens, regions, effective, palette) {
    const rows = lensRows(lens, regions, effective, palette);
    const listed = new Set(rows.map((row) => row.regionKey));
    const paint = regions.flatMap((region) => {
        const key = refOf(region);
        if (listed.has(key))
            return [];
        const reading = readRegion(lens, region, effective);
        return reading ? [{ regionKey: key, fill: fillColor(reading.fill, palette), label: regionName(region), value: reading.text }] : [];
    });
    return { id: lens.id, name: lens.name, level: lens.level, legend: lens.legend, rows, paint };
}
