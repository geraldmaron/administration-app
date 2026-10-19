import { fnv1a, maritimeZone, mulberry32, ringsBounds, ringsContain } from "@admin/world";
import { nationOutline, onLand } from "@admin/world/maps";
// The spots a unit with no sourced site can stand on inside its zone: points
// spread by dart throwing with a minimum spacing (a Poisson-disk sample),
// seeded by the zone's id alone so every campaign and every render draws the
// same set. Inside a nation they are on its land; at sea they avoid every
// coast. Which slot a unit takes is the caller's draw, not this file's.
/** How many slots a zone offers. Enough that a zone holding several units rarely stacks two on one spot. */
export const SLOTS_PER_ZONE = 24;
const DARTS = 1500;
function regionOf(zone) {
    const sea = maritimeZone(zone);
    if (sea)
        return { rings: [sea.ring], atSea: true };
    const outline = nationOutline(zone);
    return outline ? { rings: outline, atSea: false } : undefined;
}
function admits(region, point) {
    if (!ringsContain(region.rings, point))
        return false;
    return region.atSea ? !onLand(point) : true;
}
/**
 * Darts first, then spacing: the share of darts that land in the zone
 * measures how much of its bounding box it fills, and the spacing is set so
 * about twice the slot count would fit in that area. A sea that is mostly
 * coast inside its box (the Baltic) still gets a full set.
 */
function dartThrow(zone, region) {
    const bounds = ringsBounds(region.rings);
    const lonScale = Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180);
    const draw = mulberry32(fnv1a(`slots:${zone}`));
    const darts = Array.from({ length: DARTS }, () => [bounds.west + draw() * (bounds.east - bounds.west), bounds.south + draw() * (bounds.north - bounds.south)]);
    const landed = darts.filter((point) => admits(region, point));
    const area = (bounds.east - bounds.west) * lonScale * (bounds.north - bounds.south) * (landed.length / DARTS);
    const radius = Math.sqrt(area / (SLOTS_PER_ZONE * 2));
    return landed
        .reduce((accepted, point) => {
        if (accepted.length >= SLOTS_PER_ZONE)
            return accepted;
        const crowded = accepted.some(([lon, lat]) => Math.hypot((lon - point[0]) * lonScale, lat - point[1]) < radius);
        return crowded ? accepted : [...accepted, point];
    }, [])
        .map(([lon, lat]) => [round4(lon), round4(lat)]);
}
const round4 = (value) => Math.round(value * 10_000) / 10_000;
const cache = new Map();
/**
 * The seeded slots inside a zone. A nation the map draws no outline for, or a
 * zone too small for a dart to land in, offers the one point the caller knows
 * for it (the government's recorded position), and nothing when there is none.
 */
export function zoneSlots(zone, fallback) {
    let thrown = cache.get(zone);
    if (!thrown) {
        const region = regionOf(zone);
        thrown = region ? dartThrow(zone, region) : [];
        cache.set(zone, thrown);
    }
    if (thrown.length > 0)
        return thrown;
    return fallback ? [fallback] : [];
}
