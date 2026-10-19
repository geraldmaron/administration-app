// The parts of the world the World home counts governments by. The
// dataset's twenty-one regions are too fine for a tile apiece, so they fold
// into six the way the State Department's regional bureaus divide the map.
export const WORLD_REGIONS = ["americas", "europe", "mena", "africa", "asia", "oceania"];
export const WORLD_REGION_NAMES = {
    americas: "The Americas",
    europe: "Europe and Eurasia",
    mena: "Middle East and North Africa",
    africa: "Africa",
    asia: "Asia",
    oceania: "Oceania",
};
const REGION_OF = {
    "region-north-america": "americas",
    "region-central-america": "americas",
    "region-caribbean": "americas",
    "region-south-america": "americas",
    "region-western-europe": "europe",
    "region-northern-europe": "europe",
    "region-southern-europe": "europe",
    "region-central-europe": "europe",
    "region-eastern-europe": "europe",
    "region-caucasus": "europe",
    "region-middle-east": "mena",
    "region-north-africa": "mena",
    "region-west-africa": "africa",
    "region-central-africa": "africa",
    "region-east-africa": "africa",
    "region-southern-africa": "africa",
    "region-east-asia": "asia",
    "region-southeast-asia": "asia",
    "region-south-asia": "asia",
    "region-central-asia": "asia",
    "region-oceania": "oceania",
};
/** The six-way part of the world a dataset region belongs to; an unknown id says so rather than guessing. */
export function worldRegionOf(region) {
    return REGION_OF[region];
}
