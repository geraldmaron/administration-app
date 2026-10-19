import type { MapRelief } from "@admin/ui/map";

/**
 * Natural Earth's shaded relief (public domain), baked as Web Mercator detail
 * over transparent flat ground: the terrain the land is lit by. Shipped with
 * the app, so no tile host is reached.
 */
export const MAP_RELIEF: MapRelief = require("../../assets/map/relief.png") as MapRelief;
