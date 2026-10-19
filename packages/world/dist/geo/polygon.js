const KM_PER_DEGREE_LAT = 110.574;
const KM_PER_DEGREE_LON_AT_EQUATOR = 111.32;
/** Even-odd containment: a point inside an odd number of rings is inside, so holes read as outside. */
export function ringsContain(rings, point) {
    return rings.reduce((inside, ring) => (ringContains(ring, point) ? !inside : inside), false);
}
export function ringContains(ring, [x, y]) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
            inside = !inside;
    }
    return inside;
}
/** Twice the signed area in square degrees; zero for a degenerate ring. */
export function ringSignedArea(ring) {
    return ring.reduce((sum, [x1, y1], index) => {
        const [x2, y2] = ring[(index + 1) % ring.length];
        return sum + (x1 * y2 - x2 * y1);
    }, 0);
}
function orientation(a, b, c) {
    const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
    return Math.abs(value) < 1e-12 ? 0 : Math.sign(value);
}
/**
 * Whether two segments cross at a point interior to both. Touching at an end,
 * or running along a shared edge, is not a crossing: two seas that share a
 * boundary meet there without overlapping.
 */
export function segmentsCross(a, b, c, d) {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    return o1 * o2 < 0 && o3 * o4 < 0;
}
function edges(ring) {
    return ring.map((point, index) => [point, ring[(index + 1) % ring.length]]);
}
/** Every pair of non-adjacent edges that cross, as edge indices. Empty for a simple ring. */
export function ringSelfCrossings(ring) {
    const list = edges(ring);
    const crossings = [];
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 2; j < list.length; j++) {
            if (i === 0 && j === list.length - 1)
                continue;
            if (segmentsCross(list[i][0], list[i][1], list[j][0], list[j][1]))
                crossings.push([i, j]);
        }
    }
    return crossings;
}
/**
 * Whether two simple rings share interior. An edge crossing proves it; with
 * no crossing, one ring's interior can still hold the other whole, which a
 * vertex test catches. A vertex sitting on the other's boundary is skipped,
 * since shared corners are how neighboring seas meet.
 */
export function ringsOverlap(a, b) {
    if (edges(a).some(([p, q]) => edges(b).some(([r, s]) => segmentsCross(p, q, r, s))))
        return true;
    const strictlyInside = (ring, point) => ringContains(ring, point) && distanceToRingKm(ring, point) > 0.01;
    return a.some((point) => strictlyInside(b, point)) || b.some((point) => strictlyInside(a, point));
}
function localKm(origin, point) {
    const kmPerLon = KM_PER_DEGREE_LON_AT_EQUATOR * Math.cos((origin[1] * Math.PI) / 180);
    return [(point[0] - origin[0]) * kmPerLon, (point[1] - origin[1]) * KM_PER_DEGREE_LAT];
}
function segmentDistanceKm(point, a, b) {
    const [ax, ay] = localKm(point, a);
    const [bx, by] = localKm(point, b);
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
    return Math.hypot(ax + t * dx, ay + t * dy);
}
/** Kilometers from a point to the nearest edge of a ring, on a local flat-earth approximation. */
export function distanceToRingKm(ring, point) {
    return edges(ring).reduce((best, [a, b]) => Math.min(best, segmentDistanceKm(point, a, b)), Number.POSITIVE_INFINITY);
}
/** Kilometers from a point to the nearest edge of any ring. */
export function distanceToRingsKm(rings, point) {
    return rings.reduce((best, ring) => Math.min(best, distanceToRingKm(ring, point)), Number.POSITIVE_INFINITY);
}
export function ringsBounds(rings) {
    const points = rings.flat();
    return {
        west: Math.min(...points.map((p) => p[0])),
        south: Math.min(...points.map((p) => p[1])),
        east: Math.max(...points.map((p) => p[0])),
        north: Math.max(...points.map((p) => p[1])),
    };
}
