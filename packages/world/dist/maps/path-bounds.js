const EMPTY = { minX: 0, minY: 0, width: 0, height: 0 };
// The baked paths are absolute moves and lines only (see
// scripts/bake-map-geometry.mjs), so every number in the string is a coordinate
// in x, y order. That is what makes reading the extent a scan rather than a
// parse — this deliberately does not understand curves, because none are baked.
const NUMBER = /-?\d+(?:\.\d+)?/g;
const cache = new Map();
const componentCache = new Map();
/** The extent of a baked country path, in projected viewBox units. Memoised: the geometry never changes at runtime. */
export function pathBounds(d) {
    const hit = cache.get(d);
    if (hit)
        return hit;
    const numbers = d.match(NUMBER);
    if (!numbers || numbers.length < 2)
        return EMPTY;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let index = 0; index + 1 < numbers.length; index += 2) {
        const x = Number(numbers[index]);
        const y = Number(numbers[index + 1]);
        if (x < minX)
            minX = x;
        if (x > maxX)
            maxX = x;
        if (y < minY)
            minY = y;
        if (y > maxY)
            maxY = y;
    }
    const bounds = { minX, minY, width: maxX - minX, height: maxY - minY };
    cache.set(d, bounds);
    return bounds;
}
/**
 * Bounds for each movable island/mainland component in a baked country path.
 * Countries such as the United States are not one visual rectangle: Alaska,
 * Hawaii, and the mainland all share one ISO path. Situation-scale maps need
 * to reason about the component the player is actually looking at, not the
 * union of every detached part.
 */
export function pathComponentBounds(d) {
    const hit = componentCache.get(d);
    if (hit)
        return hit;
    const components = d
        .split(/(?=M )/g)
        .map((part) => pathBounds(part))
        .filter((bounds) => bounds.width > 0 && bounds.height > 0)
        .sort((a, b) => b.width * b.height - a.width * a.height);
    componentCache.set(d, components);
    return components;
}
