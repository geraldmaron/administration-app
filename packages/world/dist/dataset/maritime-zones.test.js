import { describe, expect, it } from "vitest";
import { MaritimeZone, ZoneId } from "../schemas/zone.js";
import { MARITIME_ZONES, THEATER_ZONES, isMaritimeZoneId, maritimeZone, nationZone, zoneForTheater, zonesForBelligerents } from "./maritime-zones.js";
describe("the seas the board places forces in", () => {
    it("parses every zone against the schema", () => {
        for (const zone of MARITIME_ZONES)
            expect(() => MaritimeZone.parse(zone), zone.id).not.toThrow();
    });
    it("keeps sea ids and nation ids apart, so a zone id says which it is", () => {
        for (const zone of MARITIME_ZONES)
            expect(isMaritimeZoneId(zone.id)).toBe(true);
        expect(isMaritimeZoneId("JPN")).toBe(false);
        expect(ZoneId.safeParse("JPN").success).toBe(true);
        expect(ZoneId.safeParse("Persian Gulf").success).toBe(false);
    });
    it("maps every theater string the engine has written to a sea on the list", () => {
        expect(zoneForTheater("Persian Gulf")).toBe("SEA-persian-gulf");
        expect(zoneForTheater("Red Sea and Gulf of Aden")).toBe("SEA-red-sea");
        for (const zone of Object.values(THEATER_ZONES))
            expect(maritimeZone(zone)).toBeDefined();
    });
    it("reads a zone id as itself and refuses a string it does not know", () => {
        expect(zoneForTheater("SEA-baltic")).toBe("SEA-baltic");
        expect(zoneForTheater("UKR")).toBe("UKR");
        expect(zoneForTheater("somewhere at sea")).toBeUndefined();
    });
    it("places a war in its belligerents' own zones, principals first, each once", () => {
        expect(zonesForBelligerents(["RUS", "UKR"], ["BLR", "RUS"])).toEqual(["RUS", "UKR", "BLR"]);
        expect(nationZone("JPN")).toBe("JPN");
    });
});
