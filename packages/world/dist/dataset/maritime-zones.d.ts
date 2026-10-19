import { type MaritimeZone, type ZoneId } from "../schemas/zone.js";
import type { NationId } from "../schemas/ids.js";
export declare const MARITIME_ZONES: readonly MaritimeZone[];
export declare function isMaritimeZoneId(id: string): boolean;
export declare function maritimeZone(id: string): MaritimeZone | undefined;
/** A government's own territory is a zone under its own id. */
export declare function nationZone(nation: NationId | string): ZoneId;
/** The government whose territory a land zone is; undefined for a sea. */
export declare function nationOfZone(zone: ZoneId | string): NationId | undefined;
/**
 * The theater strings the engine has written into saves, mapped to the sea
 * each names. These two are the whole set: the board's sized deployments are
 * the only writer. A save carrying either reads into the typed zone through
 * this table rather than being refused.
 */
export declare const THEATER_ZONES: Readonly<Record<string, ZoneId>>;
/** A theater as written, whether already a zone id or one of the engine's legacy strings; undefined for anything else. */
export declare function zoneForTheater(theater: string): ZoneId | undefined;
/**
 * Where a war's forces stand: the belligerents' own zones, principals first,
 * then co-belligerents, each once. A deployment that targets a conflict rather
 * than a nation is placed among these.
 */
export declare function zonesForBelligerents(principals: readonly string[], joined?: readonly string[]): readonly ZoneId[];
