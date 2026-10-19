import type { LonLat } from "../schemas/zone.js";
import { type Ring } from "../geo/polygon.js";
/** The rings of a government's own shape and every territory it administers; undefined where the map bakes none. */
export declare function nationOutline(nation: string): readonly Ring[] | undefined;
/** Whether a point is inside any baked shape, territories included: what open water has to avoid. */
export declare function onLand([lon, lat]: LonLat): boolean;
