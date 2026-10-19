// How the world narrates itself: the scene vocabulary a dispatch is written
// against, and the feed item it becomes.
//
// Split out of state-campaign.ts because it is a vocabulary rather than a
// campaign shape, and the shapes file has to stay inside the size budget as
// the Campaign grows.
export const SCENE_CLASS_VALUES = [
    "tragedy",
    "terror",
    "unrest",
    "disaster",
    "public-health",
    "migration",
    "foreign-crisis",
    "war",
    "espionage",
    "hostage",
    "technology",
    "economy",
    "scandal",
    "justice",
    "institution",
    "culture",
    "death",
    "triumph",
];
/** The register vocabulary, exported as a value for the same reason. */
export const SCENE_REGISTER_VALUES = ["intact", "strained", "damaged", "ceremonial"];
