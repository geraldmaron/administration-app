import { MARITIME_ZONE_PREFIX } from "../schemas/zone.js";
// The seas the board places forces in. Thirteen, each one water where US or
// allied forces are actually tasked or a carried war sits: the Gulf posture,
// the Red Sea patrols, the Black Sea war, the Baltic flank, the Taiwan and
// Korea theaters, the South China Sea, the Caribbean and the eastern Pacific
// counter-drug lanes, and the three ocean basins that connect them. A finer
// list would be a nautical chart; a coarser one would put Bahrain and Djibouti
// in the same water.
//
// Every ring is the game's own approximation drawn on whole and half degrees,
// with names in common usage. None reproduces the International Hydrographic
// Organization's limits, and none is a claim about territorial waters. Rings
// run over coasts freely, because land inside a ring is still its nation's
// zone; neighbors share edges rather than overlap, and the validator proves it.
const DRAWN = "game approximation on whole and half degrees; not IHO limits, not territorial waters";
const zone = (id, name, ring, littoral) => ({
    id: id,
    name,
    ring: ring.map(([lon, lat]) => [lon, lat]),
    littoral: littoral.map((nation) => nation),
    provenance: DRAWN,
});
// prettier-ignore
export const MARITIME_ZONES = [
    zone("SEA-north-atlantic", "North Atlantic", [
        [-80.1, 25.5], [-80.0, 32.0], [-75.5, 35.2], [-74.0, 40.5], [-70.0, 41.5], [-66.0, 44.5], [-60.0, 46.5], [-53.0, 47.0],
        [-56.0, 52.5], [-64.0, 60.0], [-60.0, 66.5], [-53.0, 66.5], [-44.0, 59.8], [-35.0, 66.0], [-22.0, 70.5], [-10.0, 75.0],
        [10.0, 75.0], [31.0, 71.0], [14.0, 67.0], [5.0, 62.0], [5.0, 58.5], [8.0, 58.0], [10.5, 57.7], [11.8, 57.6],
        [12.6, 56.1], [10.7, 55.5], [10.5, 54.2], [8.5, 55.0], [8.0, 53.6], [4.5, 52.5], [2.0, 51.0], [-5.0, 48.5],
        [-1.5, 46.0], [-2.0, 43.4], [-9.3, 43.2], [-9.0, 38.7], [-9.0, 37.0], [-6.3, 36.5], [-5.6, 36.1], [-5.3, 35.9],
        [-6.0, 35.5], [-9.5, 32.0], [-17.0, 21.0], [-17.0, 12.0], [-50.0, 8.0], [-59.5, 13.0], [-60.8, 14.5], [-61.5, 17.0],
        [-64.5, 18.4], [-68.0, 18.8], [-74.0, 20.5], [-80.0, 23.3],
    ], ["USA", "GBR", "FRA", "ESP", "PRT", "IRL", "NOR", "ISL", "DEU", "NLD", "BEL", "DNK", "CAN", "MAR"]),
    zone("SEA-caribbean", "Caribbean Sea", [
        [-87.5, 21.5], [-85.0, 22.0], [-80.0, 23.3], [-74.0, 20.5], [-68.0, 18.8], [-64.5, 18.4], [-61.5, 17.0], [-60.8, 14.5],
        [-59.5, 13.0], [-61.0, 10.5], [-63.0, 10.4], [-68.0, 10.5], [-71.5, 12.5], [-76.0, 9.2], [-77.5, 8.5], [-79.5, 9.5],
        [-83.7, 11.0], [-83.5, 15.0], [-88.0, 16.0],
    ], ["CUB", "VEN", "COL", "JAM", "HTI", "DOM", "PAN", "CRI", "NIC", "HND", "GTM", "BLZ", "MEX", "TTO"]),
    zone("SEA-eastern-pacific", "Eastern Pacific", [
        [-117.0, 32.5], [-110.0, 23.0], [-105.0, 20.0], [-95.0, 15.5], [-87.0, 13.0], [-80.0, 7.5], [-79.0, 1.0], [-81.5, -6.0],
        [-76.0, -14.0], [-70.3, -18.5], [-100.0, -18.5], [-120.0, 0.0], [-125.0, 32.5],
    ], ["MEX", "GTM", "SLV", "HND", "NIC", "CRI", "PAN", "COL", "ECU", "PER", "CHL"]),
    zone("SEA-mediterranean", "Mediterranean Sea", [
        [-5.6, 36.1], [-2.0, 36.7], [0.0, 38.7], [3.2, 41.8], [3.0, 43.4], [6.5, 43.1], [8.8, 44.4], [10.5, 43.0],
        [12.5, 41.5], [15.6, 40.0], [15.6, 38.0], [17.0, 39.0], [18.5, 40.0], [16.0, 41.5], [12.3, 44.5], [13.6, 45.7],
        [15.5, 44.0], [19.4, 41.8], [19.4, 40.3], [21.0, 38.3], [22.5, 36.5], [23.5, 38.0], [23.0, 40.5], [26.0, 40.8],
        [26.2, 39.5], [27.3, 37.0], [28.5, 36.6], [30.5, 36.5], [32.5, 36.1], [36.0, 36.8], [36.0, 34.5], [34.5, 31.5],
        [32.3, 31.3], [30.0, 31.4], [25.0, 31.6], [20.0, 30.8], [19.5, 32.5], [15.0, 32.3], [11.0, 33.5], [10.2, 37.2],
        [3.0, 36.9], [-2.0, 35.1], [-5.3, 35.9],
    ], ["ITA", "GRC", "ESP", "FRA", "TUR", "CYP", "MLT", "HRV", "ALB", "MNE", "ISR", "LBN", "SYR", "EGY", "LBY", "TUN", "DZA", "MAR"]),
    zone("SEA-baltic", "Baltic Sea", [
        [10.5, 54.2], [10.7, 55.5], [12.6, 56.1], [14.5, 56.2], [16.5, 57.5], [16.6, 59.0], [18.5, 60.2], [17.5, 62.0],
        [21.0, 65.8], [25.4, 65.2], [21.5, 63.0], [21.5, 60.5], [24.0, 60.0], [30.2, 60.0], [26.5, 59.5], [23.5, 59.2],
        [23.0, 57.5], [21.0, 56.5], [21.0, 55.5], [18.5, 54.6], [14.0, 53.9],
    ], ["SWE", "FIN", "EST", "LVA", "LTU", "POL", "DEU", "DNK", "RUS"]),
    zone("SEA-black-sea", "Black Sea", [
        [28.0, 41.5], [28.6, 43.5], [29.7, 45.2], [30.8, 46.5], [33.5, 46.0], [35.0, 45.5], [38.0, 47.2], [39.3, 47.0],
        [38.0, 45.0], [41.6, 41.6], [36.0, 41.7], [31.0, 41.1],
    ], ["UKR", "RUS", "TUR", "ROU", "BGR", "GEO"]),
    zone("SEA-red-sea", "Red Sea and Gulf of Aden", [
        [32.5, 30.0], [35.0, 28.0], [39.0, 22.0], [42.5, 15.0], [43.5, 12.7], [45.0, 13.0], [49.0, 14.0], [52.2, 15.6],
        [51.3, 11.8], [49.0, 11.3], [44.0, 10.5], [43.2, 11.5], [42.5, 13.0], [39.5, 15.5], [37.0, 19.0], [35.5, 24.0],
        [33.5, 27.5],
    ], ["YEM", "SAU", "EGY", "ERI", "DJI", "SOM", "SDN", "JOR", "ISR"]),
    zone("SEA-persian-gulf", "Persian Gulf and Gulf of Oman", [
        [47.5, 30.5], [50.0, 30.5], [54.0, 27.5], [56.0, 27.5], [57.5, 26.0], [61.7, 25.0], [59.8, 22.5], [57.0, 23.5],
        [56.0, 24.5], [54.0, 23.8], [51.0, 23.8], [49.5, 26.5], [47.5, 29.0],
    ], ["IRN", "SAU", "ARE", "QAT", "BHR", "KWT", "IRQ", "OMN"]),
    zone("SEA-arabian-sea", "Arabian Sea", [
        [61.7, 25.0], [67.5, 24.5], [72.8, 21.0], [74.5, 14.0], [76.3, 8.5], [73.0, 5.0], [51.5, 10.0], [51.3, 11.8],
        [52.2, 15.6], [55.0, 17.0], [57.5, 19.0], [59.8, 22.5],
    ], ["OMN", "PAK", "IND", "YEM", "SOM"]),
    zone("SEA-indian-ocean", "Indian Ocean", [
        [104.5, 1.0], [103.5, 1.4], [101.0, 3.0], [100.3, 5.5], [98.3, 8.0], [98.5, 12.0], [97.5, 16.5], [94.5, 16.0],
        [92.0, 21.0], [89.0, 22.0], [86.5, 20.0], [80.3, 15.5], [80.0, 10.0], [77.5, 8.0], [76.3, 8.5], [73.0, 5.0],
        [51.5, 10.0], [48.0, 4.0], [42.0, -2.0], [40.0, -10.0], [40.5, -15.0], [35.0, -24.0], [32.5, -29.0], [25.0, -34.5],
        [20.0, -36.0], [20.0, -45.0], [115.0, -45.0], [115.0, -34.5], [113.5, -25.0], [114.0, -22.0], [122.0, -18.0], [129.0, -14.5],
        [125.0, -10.0], [115.0, -9.0], [105.5, -6.8],
    ], ["IND", "LKA", "BGD", "MMR", "THA", "MYS", "IDN", "AUS", "MDV", "KEN", "TZA", "MOZ", "MDG", "ZAF", "SOM", "MUS", "SYC", "COM"]),
    zone("SEA-south-china-sea", "South China Sea", [
        [119.6, 25.4], [121.5, 25.3], [120.8, 21.9], [121.9, 18.5], [120.5, 16.0], [120.0, 13.0], [119.5, 10.0], [117.0, 7.5],
        [116.0, 5.5], [114.0, 4.5], [109.5, 1.5], [104.5, 1.0], [103.5, 4.0], [102.2, 6.2], [99.5, 9.5], [100.0, 13.5],
        [102.5, 12.5], [105.0, 8.6], [106.5, 10.4], [109.3, 12.0], [108.8, 15.5], [106.6, 17.5], [105.7, 19.0], [106.5, 21.0],
        [108.0, 21.6], [110.0, 21.0], [113.5, 22.2], [117.0, 23.0],
    ], ["CHN", "VNM", "PHL", "MYS", "BRN", "IDN", "TWN", "SGP", "THA", "KHM"]),
    zone("SEA-western-pacific", "Western Pacific", [
        [121.5, 25.3], [119.6, 25.4], [120.5, 27.5], [122.0, 30.0], [121.0, 32.5], [119.5, 35.0], [121.0, 37.0], [117.7, 39.0],
        [121.5, 41.0], [124.3, 39.8], [125.5, 37.8], [126.4, 35.0], [127.5, 34.5], [129.8, 33.3], [131.5, 31.5], [135.0, 33.5],
        [139.0, 34.6], [140.8, 35.7], [141.5, 38.0], [141.8, 40.5], [145.5, 43.0], [150.0, 45.0], [170.0, 45.0], [170.0, 0.0],
        [150.0, -2.0], [140.0, -2.0], [131.0, -0.5], [127.5, 2.5], [126.6, 7.0], [125.5, 11.0], [124.3, 12.5], [121.9, 18.5],
        [120.8, 21.9],
    ], ["JPN", "CHN", "TWN", "KOR", "PRK", "PHL", "PLW", "FSM", "MHL", "PNG", "IDN"]),
    zone("SEA-sea-of-japan", "Sea of Japan", [
        [127.5, 34.5], [129.0, 35.2], [129.4, 36.0], [128.4, 38.6], [127.5, 39.8], [129.8, 41.0], [131.0, 42.8], [135.5, 43.8],
        [140.2, 48.5], [142.0, 46.0], [141.9, 45.5], [140.2, 43.2], [140.0, 41.5], [139.8, 40.0], [138.5, 37.8], [136.5, 36.8],
        [133.0, 35.5], [131.0, 34.3], [129.8, 33.3],
    ], ["JPN", "KOR", "PRK", "RUS"]),
];
const NATION_ZONE = /^[A-Z]{3}$/;
const BY_ID = new Map(MARITIME_ZONES.map((entry) => [entry.id, entry]));
export function isMaritimeZoneId(id) {
    return id.startsWith(MARITIME_ZONE_PREFIX);
}
export function maritimeZone(id) {
    return BY_ID.get(id);
}
/** A government's own territory is a zone under its own id. */
export function nationZone(nation) {
    return nation;
}
/** The government whose territory a land zone is; undefined for a sea. */
export function nationOfZone(zone) {
    return isMaritimeZoneId(zone) ? undefined : zone;
}
/**
 * The theater strings the engine has written into saves, mapped to the sea
 * each names. These two are the whole set: the board's sized deployments are
 * the only writer. A save carrying either reads into the typed zone through
 * this table rather than being refused.
 */
export const THEATER_ZONES = {
    "Persian Gulf": "SEA-persian-gulf",
    "Red Sea and Gulf of Aden": "SEA-red-sea",
};
/** A theater as written, whether already a zone id or one of the engine's legacy strings; undefined for anything else. */
export function zoneForTheater(theater) {
    if (BY_ID.has(theater) || NATION_ZONE.test(theater))
        return theater;
    return THEATER_ZONES[theater];
}
/**
 * Where a war's forces stand: the belligerents' own zones, principals first,
 * then co-belligerents, each once. A deployment that targets a conflict rather
 * than a nation is placed among these.
 */
export function zonesForBelligerents(principals, joined = []) {
    return [...new Set([...principals, ...joined])].map((nation) => nationZone(nation));
}
