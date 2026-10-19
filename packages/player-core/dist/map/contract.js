import { stateById, worldNations } from "@admin/world";
/** A reading with its short figure for the map's labels. */
export function withFigure(reading, figure) {
    return { ...reading, figure };
}
export function noData(palette, text = "No data") {
    return { text, rank: Number.NEGATIVE_INFINITY, fill: { kind: "solid", color: palette.nodata } };
}
export function solid(text, rank, color, scale) {
    return { text, rank, fill: scale === undefined ? { kind: "solid", color } : { kind: "solid", color, scale } };
}
export function neutralLens() {
    return { id: "neutral", name: "The map", level: "nation", scale: "categorical", encoding: "color", legend: [], read: () => null };
}
const LAYER_OF_LEVEL = { nation: "world", state: "states", district: "districts" };
const REF_OF_LAYER = { world: "nation", states: "state", districts: "district" };
export function layerOfLevel(level) {
    return LAYER_OF_LEVEL[level];
}
/** A region's ref, the form a selection and a route name it in: `nation:FRA`, `state:CA`, `district:NY-12`. */
export function refOf(region) {
    return `${REF_OF_LAYER[region.layer]}:${region.id}`;
}
/** The region a ref names, or undefined for a ref that is no region. */
export function regionOfRef(ref) {
    const colon = ref.indexOf(":");
    if (colon <= 0)
        return undefined;
    const kind = ref.slice(0, colon);
    const id = ref.slice(colon + 1);
    const layer = Object.entries(REF_OF_LAYER).find(([, name]) => name === kind)?.[0];
    return layer && id ? { layer, id } : undefined;
}
const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id, nation.identity.name]));
/** The name a player reads for a region. */
export function regionName(region) {
    if (region.layer === "world")
        return NATION_NAMES.get(region.id) ?? region.name ?? region.id;
    if (region.layer === "states")
        return stateById.get(region.id)?.name ?? region.id;
    return `District ${region.id}`;
}
/** The state a district belongs to, read off the district's id ("CO-03"). */
function stateOfDistrict(region) {
    const state = region.id.split("-")[0];
    return region.layer === "districts" && state ? { layer: "states", id: state } : undefined;
}
/**
 * What a lens says about a region as drawn. A nation lens reads a US state or
 * district as the United States, so the country does not go neutral when the
 * map draws its states. A state lens with nothing of its own to say about a
 * district reads the district's state, said as statewide.
 */
export function readRegion(lens, region, effective) {
    if (lens.level === "nation" && region.layer !== "world")
        return lens.read({ layer: "world", id: "USA" }, effective);
    const own = lens.read(region, effective);
    if (own || lens.level !== "state")
        return own;
    const state = stateOfDistrict(region);
    const statewide = state ? lens.read(state, "state") : null;
    return statewide ? { ...statewide, text: `${statewide.text}, statewide` } : null;
}
